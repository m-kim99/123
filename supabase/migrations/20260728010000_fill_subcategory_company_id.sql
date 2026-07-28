-- ============================================================
-- Migration: subcategories.company_id 백필 + 자동 채움 트리거
-- 날짜: 2026-07-28
-- 배경: addSubcategory 가 INSERT 시 company_id 를 넣지 않아 32건 중 21건이 NULL.
--   영향 (1) 폐기 예정 알림이 notifications.company_id NOT NULL 제약으로 생성 실패
--        (2) 입출고 플랜 트리거가 부서를 조인해 회사를 우회 해석해야 함
--        (3) company_id 기반 RLS/인덱스 효과 반감
--   documents 의 a_fill_document_company_id (20260715010000) 와 동일 패턴으로 해결한다.
--   departments.company_id 는 전건 채워져 있어(NULL 0) 부서 기준 해석이 안전하다.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 자동 채움 트리거 — company_id 미지정 INSERT 를 부서 기준으로 보정
--    트리거명 'a_' 접두사: 알파벳 순으로 다른 BEFORE 트리거보다 먼저 실행되게 함
--    (다른 트리거/정책이 company_id 를 읽기 때문 — documents 와 동일한 이유)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_subcategory_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.department_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.departments
    WHERE id = NEW.department_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_fill_subcategory_company_id ON public.subcategories;
CREATE TRIGGER a_fill_subcategory_company_id
  BEFORE INSERT ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_subcategory_company_id();

GRANT EXECUTE ON FUNCTION public.fill_subcategory_company_id() TO anon;
GRANT EXECUTE ON FUNCTION public.fill_subcategory_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fill_subcategory_company_id() TO service_role;

-- ------------------------------------------------------------
-- 2) 기존 NULL 백필 (부서를 통해 전건 해석 가능 — 사전 조회로 고아 0건 확인)
--    UPDATE 트리거(trg_prevent_undispose / trg_enforce_storage_lifecycle_plan)는
--    storage_status 전이만 검사하므로 이 백필에 영향받지 않는다.
-- ------------------------------------------------------------
UPDATE public.subcategories s
SET company_id = d.company_id
FROM public.departments d
WHERE d.id = s.department_id
  AND s.company_id IS NULL
  AND d.company_id IS NOT NULL;
