-- ============================================================
-- Migration: categories(대분류).company_id 백필 + 자동 채움 트리거
-- 날짜: 2026-07-28
-- 배경: subcategories(20260728010000)와 동일한 누락 문제. 52건 중 21건이 NULL.
--   categories 는 INSERT 경로가 여러 곳(addParentCategory, 온보딩 스캐폴드,
--   scaffoldTemplates)이라 클라이언트 수정만으로는 재발을 막을 수 없어
--   트리거가 근본 방어선이다.
--   departments.company_id 는 전건 존재(NULL 0)하고, 사전 조회에서
--   백필 불가(고아) 0건 · 부서 회사와 불일치 0건을 확인했다.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 자동 채움 트리거 — documents/subcategories 와 동일 패턴
--    'a_' 접두사: 알파벳 순으로 다른 BEFORE 트리거보다 먼저 실행되게 함
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fill_category_company_id()
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

DROP TRIGGER IF EXISTS a_fill_category_company_id ON public.categories;
CREATE TRIGGER a_fill_category_company_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_category_company_id();

GRANT EXECUTE ON FUNCTION public.fill_category_company_id() TO anon;
GRANT EXECUTE ON FUNCTION public.fill_category_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fill_category_company_id() TO service_role;

-- ------------------------------------------------------------
-- 2) 기존 NULL 백필 (부서를 통해 전건 해석 가능)
-- ------------------------------------------------------------
UPDATE public.categories c
SET company_id = d.company_id
FROM public.departments d
WHERE d.id = c.department_id
  AND c.company_id IS NULL
  AND d.company_id IS NOT NULL;
