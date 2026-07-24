-- ============================================================
-- Migration: 문서 박스 폐기(disposal) 불가역화
-- 날짜: 2026-07-24
-- 배경: 보존연한 만료(expiry)는 가역적(연한 연장 시 다시 접근 가능)이지만,
--   폐기(disposed)는 실제 파기에 대응하므로 되돌릴 수 없어야 한다.
--   - subcategories: 폐기 승인자/방식/일시 감사 컬럼 추가
--   - 트리거: disposed 상태에서 다른 상태로의 전이를 원천 차단 (앱/직접 API 무관)
--   - documents RLS: 폐기된 보관함의 문서 조회 차단 (접근 파기, 실제 파일은 보존)
-- ============================================================

-- ------------------------------------------------------------
-- 1) 폐기 감사 컬럼 (승인자 / 방식 / 일시)
--    disposed_by = 폐기 승인자(권한자, 자유 입력) — 버튼 실행자(actor)와 구분됨
--    disposed_method = 폐기 방식 (예: 파쇄, 소각)
-- ------------------------------------------------------------
ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS disposed_by text,
  ADD COLUMN IF NOT EXISTS disposed_method text,
  ADD COLUMN IF NOT EXISTS disposed_at timestamptz;

-- ------------------------------------------------------------
-- 2) 불가역성: disposed → 다른 상태 UPDATE 차단
--    폐기는 복구할 수 없다. UI 게이팅과 무관하게 DB에서 보증.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_undispose()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.storage_status = 'disposed' AND NEW.storage_status IS DISTINCT FROM 'disposed' THEN
    RAISE EXCEPTION '폐기된 보관함은 복구할 수 없습니다 (storage_status: disposed -> %)', NEW.storage_status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_undispose ON public.subcategories;
CREATE TRIGGER trg_prevent_undispose
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_undispose();

-- ------------------------------------------------------------
-- 3) documents SELECT: 폐기된 보관함의 문서 접근 차단
--    현재 라이브 정책(admin / 부서 / user_permissions / 운영자 OR)을 그대로 유지하고
--    폐기 보관함 제외 조건만 AND로 추가한다. (만료 체크는 앱 레벨에서 처리하므로 미포함)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;
CREATE POLICY "Users can view documents they have access to" ON public.documents
  FOR SELECT TO authenticated
  USING (
    (
      (EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      ))
      OR department_id = (SELECT users.department_id FROM public.users WHERE users.id = auth.uid())
      OR (EXISTS (
        SELECT 1 FROM public.user_permissions
        WHERE user_permissions.user_id = auth.uid()
          AND user_permissions.department_id = documents.department_id
          AND user_permissions.role = ANY (ARRAY['viewer', 'editor', 'manager'])
      ))
      OR public.is_operator()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.subcategories
      WHERE subcategories.id = documents.subcategory_id
        AND subcategories.storage_status = 'disposed'
    )
  );
