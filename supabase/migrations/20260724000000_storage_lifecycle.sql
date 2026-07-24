-- ============================================================
-- Migration: 문서 박스 입출고(보관 라이프사이클) 도입
-- 날짜: 2026-07-24
-- 배경: 세부 스토리지(subcategories)를 물리 보관함 단위로 보고
--   보관중/반출중/폐기됨 상태와 반출·반납·폐기 이력을 관리한다.
--   - subcategories: storage_status + 반출 정보 컬럼 추가 (additive)
--   - storage_events: 입출고 감사 이력 테이블 신설 (불변 로그)
-- ============================================================

-- ------------------------------------------------------------
-- 1) subcategories: 보관 상태 컬럼 추가
--    '폐기 예정'은 저장하지 않고 expiry_date 경과 여부로 파생한다.
-- ------------------------------------------------------------
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS storage_status text NOT NULL DEFAULT 'stored',
  ADD COLUMN IF NOT EXISTS checked_out_by text,
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subcategories_storage_status_check'
      AND conrelid = 'public.subcategories'::regclass
  ) THEN
    ALTER TABLE public.subcategories
      ADD CONSTRAINT subcategories_storage_status_check
      CHECK (storage_status IN ('stored', 'checked_out', 'disposed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subcategories_storage_status
  ON public.subcategories (storage_status)
  WHERE storage_status <> 'stored';

-- ------------------------------------------------------------
-- 2) storage_events: 입출고 이력 (append-only 감사 로그)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.storage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type IN ('registered', 'checked_out', 'returned', 'disposed', 'location_changed')
  ),
  actor_id uuid,
  actor_name text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_events_subcategory
  ON public.storage_events (subcategory_id, created_at DESC);

ALTER TABLE public.storage_events ENABLE ROW LEVEL SECURITY;

-- 클라이언트 롤 권한: anon 차단, authenticated는 조회/삽입만 (불변 로그)
REVOKE ALL ON TABLE public.storage_events FROM anon;
REVOKE UPDATE, DELETE ON TABLE public.storage_events FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.storage_events TO authenticated;

-- 조회: 같은 회사 + (관리자 / 같은 부서 / user_permissions viewer 이상)
DROP POLICY IF EXISTS "storage_events_select" ON public.storage_events;
CREATE POLICY "storage_events_select"
  ON public.storage_events FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_company_id()
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
      OR department_id = (SELECT department_id FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
          AND department_id = storage_events.department_id
          AND role IN ('viewer', 'editor', 'manager')
      )
    )
  );

-- 삽입: 같은 회사 + (관리자 / 같은 부서 / user_permissions editor 이상)
DROP POLICY IF EXISTS "storage_events_insert" ON public.storage_events;
CREATE POLICY "storage_events_insert"
  ON public.storage_events FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.auth_company_id()
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
      OR department_id = (SELECT department_id FROM users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM user_permissions
        WHERE user_id = auth.uid()
          AND department_id = storage_events.department_id
          AND role IN ('editor', 'manager')
      )
    )
  );

-- UPDATE/DELETE 정책 없음: 감사 이력은 수정·삭제 불가 (service_role 제외)
