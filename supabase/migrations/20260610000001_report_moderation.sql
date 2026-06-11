-- ============================================================
-- 신고 처리 시스템 (3단계)
-- 1단계: 신고 접수 — 중복 신고 방지 + 타 유저 3회 누적 시 게시물 자동 숨김
-- 2단계: 운영자 검토 큐 — reports 테이블 (기존)
-- 3단계: 결과 처리 — operator_resolve_report RPC (복원/경고/삭제 + 작성자 알림)
-- ============================================================

-- ------------------------------------------------------------
-- 1. reports 테이블 누락 컬럼 보강 (라이브 DB는 구버전 구조)
-- ------------------------------------------------------------
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_email text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_urls text[];
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS action_details jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 신고 사유 (시중 앱 표준 참고: 스팸/음란물/괴롭힘/폭력/허위정보/저작권/개인정보/불법/기타)
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE reports ADD CONSTRAINT reports_category_check CHECK (category IN (
  'spam',          -- 스팸/광고
  'inappropriate', -- 부적절한 콘텐츠
  'adult',         -- 음란물/성적 콘텐츠
  'harassment',    -- 욕설/괴롭힘/혐오 발언
  'violence',      -- 폭력적이거나 위험한 콘텐츠
  'false_info',    -- 허위 정보
  'privacy',       -- 개인정보 노출
  'copyright',     -- 저작권/지식재산권 침해
  'illegal',       -- 불법 정보 또는 행위
  'other'          -- 기타
));

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_priority_check;
ALTER TABLE reports ADD CONSTRAINT reports_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- 같은 유저가 같은 대상을 중복 신고하지 못하도록 (처리 완료된 신고는 재신고 허용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_active
  ON reports (reporter_id, target_type, target_id)
  WHERE status IN ('pending', 'reviewing');

-- ------------------------------------------------------------
-- 2. 게시물(공지/댓글) 숨김 컬럼
-- ------------------------------------------------------------
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE announcement_comments ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE announcement_comments ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- ------------------------------------------------------------
-- 3. [1단계] 자동 숨김 트리거 — 작성자 본인 제외, 서로 다른 유저 3명 이상 신고 시
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_hide_reported_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_count integer;
BEGIN
  IF NEW.target_type NOT IN ('announcement', 'comment') THEN
    RETURN NEW;
  END IF;

  -- 대상 게시물의 작성자 조회 (자기 신고는 누적 카운트에서 제외)
  IF NEW.target_type = 'announcement' THEN
    SELECT created_by INTO v_author_id FROM announcements WHERE id = NEW.target_id;
  ELSE
    SELECT user_id INTO v_author_id FROM announcement_comments WHERE id = NEW.target_id;
  END IF;

  IF v_author_id IS NULL THEN
    RETURN NEW; -- 대상이 이미 삭제됨
  END IF;

  SELECT COUNT(DISTINCT reporter_id) INTO v_count
  FROM reports
  WHERE target_type = NEW.target_type
    AND target_id = NEW.target_id
    AND status IN ('pending', 'reviewing')
    AND reporter_id IS NOT NULL
    AND reporter_id <> v_author_id;

  IF v_count >= 3 THEN
    IF NEW.target_type = 'announcement' THEN
      UPDATE announcements SET is_hidden = true, hidden_at = now()
      WHERE id = NEW.target_id AND is_hidden = false;
    ELSE
      UPDATE announcement_comments SET is_hidden = true, hidden_at = now()
      WHERE id = NEW.target_id AND is_hidden = false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_hide_reported_content ON reports;
CREATE TRIGGER trigger_auto_hide_reported_content
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_hide_reported_content();

-- ------------------------------------------------------------
-- 4. [2·3단계] 운영자 신고 처리 RPC
--   restore : 신고 기각 — 게시물 복원, 같은 대상의 활성 신고 전부 dismissed
--   warn    : 경고 — 게시물 복원 + 작성자에게 경고 알림, resolved
--   remove  : 삭제 — 게시물 삭제(문서는 soft delete) + 작성자 알림, resolved
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION operator_resolve_report(
  p_report_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report reports%ROWTYPE;
  v_author_id uuid;
  v_company_id uuid;
  v_new_status text;
  v_message text;
BEGIN
  -- 운영자 권한 확인 (reports 권한 또는 슈퍼 운영자)
  IF NOT EXISTS (
    SELECT 1 FROM operators
    WHERE id = auth.uid()
      AND is_active = true
      AND (is_super = true OR COALESCE((permissions->>'reports')::boolean, false))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '신고 처리 권한이 없습니다.');
  END IF;

  IF p_action NOT IN ('restore', 'warn', 'remove') THEN
    RETURN jsonb_build_object('success', false, 'error', '유효하지 않은 조치입니다.');
  END IF;

  SELECT * INTO v_report FROM reports WHERE id = p_report_id;
  IF v_report.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '신고를 찾을 수 없습니다.');
  END IF;

  -- 대상 콘텐츠의 작성자/회사 조회
  IF v_report.target_type = 'announcement' THEN
    SELECT created_by, company_id INTO v_author_id, v_company_id
    FROM announcements WHERE id = v_report.target_id;
  ELSIF v_report.target_type = 'comment' THEN
    SELECT c.user_id, a.company_id INTO v_author_id, v_company_id
    FROM announcement_comments c
    JOIN announcements a ON a.id = c.announcement_id
    WHERE c.id = v_report.target_id;
  ELSIF v_report.target_type = 'document' THEN
    SELECT uploaded_by, company_id INTO v_author_id, v_company_id
    FROM documents WHERE id = v_report.target_id;
  ELSIF v_report.target_type = 'user' THEN
    SELECT id, company_id INTO v_author_id, v_company_id
    FROM users WHERE id = v_report.target_id;
  END IF;

  -- 조치 실행
  IF p_action = 'restore' THEN
    v_new_status := 'dismissed';
    IF v_report.target_type = 'announcement' THEN
      UPDATE announcements SET is_hidden = false, hidden_at = NULL WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      UPDATE announcement_comments SET is_hidden = false, hidden_at = NULL WHERE id = v_report.target_id;
    END IF;

  ELSIF p_action = 'warn' THEN
    v_new_status := 'resolved';
    IF v_report.target_type = 'announcement' THEN
      UPDATE announcements SET is_hidden = false, hidden_at = NULL WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      UPDATE announcement_comments SET is_hidden = false, hidden_at = NULL WHERE id = v_report.target_id;
    END IF;
    v_message := '신고 검토 결과, 회원님의 콘텐츠가 운영정책 위반 소지가 있어 경고가 부여되었습니다. 반복 시 이용이 제한될 수 있습니다.';

  ELSIF p_action = 'remove' THEN
    v_new_status := 'resolved';
    IF v_report.target_type = 'announcement' THEN
      DELETE FROM announcements WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'comment' THEN
      DELETE FROM announcement_comments WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'document' THEN
      UPDATE documents SET deleted_at = now() WHERE id = v_report.target_id AND deleted_at IS NULL;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', '사용자 신고는 이용 정지로 처리해주세요.');
    END IF;
    v_message := '신고 검토 결과, 회원님의 콘텐츠가 운영정책 위반으로 삭제되었습니다.';
  END IF;

  -- 같은 대상의 활성 신고 일괄 처리
  UPDATE reports SET
    status = v_new_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    action_taken = p_action,
    action_details = jsonb_build_object('note', p_note, 'resolved_via', p_report_id),
    updated_at = now()
  WHERE target_type = v_report.target_type
    AND target_id = v_report.target_id
    AND status IN ('pending', 'reviewing');

  -- 작성자 알림 (warn/remove)
  IF v_message IS NOT NULL AND v_author_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    INSERT INTO notifications (type, company_id, target_user_id, message)
    VALUES ('report_action', v_company_id, v_author_id,
            v_message || COALESCE(' 사유: ' || p_note, ''));
  END IF;

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION operator_resolve_report(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION auto_hide_reported_content() IS '타 유저 3명 이상 신고 누적 시 게시물(공지/댓글) 자동 숨김';
COMMENT ON FUNCTION operator_resolve_report(uuid, text, text) IS '운영자 신고 처리: restore(복원)/warn(경고)/remove(삭제) + 작성자 알림';
