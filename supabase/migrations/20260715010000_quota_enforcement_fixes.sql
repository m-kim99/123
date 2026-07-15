-- ============================================================
-- Migration: 사용량 제한 강제 보강
-- 날짜: 2026-07-15
-- 설명:
--   1) documents.company_id 미기록 수정 — 백필 + 자동 채움 트리거
--      (클라이언트 insert가 company_id를 보내지 않아 문서 수 제한
--       트리거·클라 체크·문서 수 표시가 전부 무력화되어 있었음)
--   2) check_member_limit: 체험(trialing) 구독 인정
--   3) 부서 수 제한 트리거 신설
--   4) 저장 공간 제한 트리거 신설
-- ============================================================

-- ------------------------------------------------------------
-- 1. documents.company_id 백필 + 자동 채움 트리거
-- ------------------------------------------------------------

-- 1-1. 백필: department_id 경유
UPDATE public.documents d
SET company_id = dept.company_id
FROM public.departments dept
WHERE d.company_id IS NULL
  AND d.department_id = dept.id
  AND dept.company_id IS NOT NULL;

-- 1-2. 백필: subcategory → department 경유 (department_id가 NULL인 문서)
UPDATE public.documents d
SET company_id = dept.company_id
FROM public.subcategories sc
JOIN public.departments dept ON dept.id = sc.department_id
WHERE d.company_id IS NULL
  AND d.subcategory_id = sc.id
  AND dept.company_id IS NOT NULL;

-- 1-3. 신규 insert 시 자동 채움 (클라이언트가 누락해도 방어)
CREATE OR REPLACE FUNCTION public.fill_document_company_id()
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

  IF NEW.company_id IS NULL AND NEW.subcategory_id IS NOT NULL THEN
    SELECT dept.company_id INTO NEW.company_id
    FROM public.subcategories sc
    JOIN public.departments dept ON dept.id = sc.department_id
    WHERE sc.id = NEW.subcategory_id;
  END IF;

  RETURN NEW;
END;
$$;

-- [중요] BEFORE 트리거는 이름 알파벳 순으로 실행됨.
-- 'a_' 접두사로 check_document_limit_before_insert('c')보다 먼저 실행되어
-- 제한 체크가 채워진 company_id를 보도록 보장한다.
DROP TRIGGER IF EXISTS a_fill_document_company_id ON public.documents;
CREATE TRIGGER a_fill_document_company_id
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_document_company_id();

-- ------------------------------------------------------------
-- 2. check_member_limit: trialing 구독 인정
--    (기존: active만 조회 → 체험 회사가 무료 기본값으로 폴백되던 문제)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_current_count integer;
  v_max_members integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.company_id IS NULL) OR (OLD.company_id IS NOT DISTINCT FROM NEW.company_id) THEN
      RETURN NEW;
    END IF;
    v_company_id := NEW.company_id;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.users
  WHERE company_id = v_company_id
    AND id != NEW.id;

  -- 구독의 member_count(결제 인원수)가 있으면 우선, 없으면 플랜 기본값
  SELECT COALESCE(s.member_count, p.max_members) INTO v_max_members
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = v_company_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_max_members IS NULL THEN
    SELECT max_members INTO v_max_members
    FROM public.plans
    WHERE name = 'free';
  END IF;

  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION '회사 멤버 수 제한에 도달했습니다. (현재: %명 / 최대: %명) 플랜을 업그레이드해주세요.', v_current_count, v_max_members;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 3. 부서 수 제한 트리거 (check_document_limit와 동일 패턴)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_department_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_departments integer;
  v_current_count integer;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.max_departments INTO v_max_departments
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = NEW.company_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_max_departments IS NULL THEN
    SELECT max_departments INTO v_max_departments
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  IF v_max_departments IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.departments
  WHERE company_id = NEW.company_id;

  IF v_current_count >= v_max_departments THEN
    RAISE EXCEPTION 'PLAN_DEPARTMENT_LIMIT_REACHED: 현재 플랜의 부서 한도(%개)를 초과했습니다. 플랜을 업그레이드해주세요.', v_max_departments;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_department_limit_before_insert ON public.departments;
CREATE TRIGGER check_department_limit_before_insert
  BEFORE INSERT ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_department_limit();

-- ------------------------------------------------------------
-- 4. 저장 공간 제한 트리거
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_mb integer;
  v_used_bytes bigint;
BEGIN
  IF NEW.company_id IS NULL OR NEW.file_size IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.max_storage_mb INTO v_max_mb
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = NEW.company_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  IF v_max_mb IS NULL THEN
    SELECT max_storage_mb INTO v_max_mb
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  IF v_max_mb IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(file_size), 0) INTO v_used_bytes
  FROM public.documents
  WHERE company_id = NEW.company_id
    AND deleted_at IS NULL;

  IF v_used_bytes + NEW.file_size > v_max_mb::bigint * 1024 * 1024 THEN
    RAISE EXCEPTION 'PLAN_STORAGE_LIMIT_REACHED: 현재 플랜의 저장 공간(%MB)을 초과합니다. 기존 문서를 삭제하거나 플랜을 업그레이드해주세요.', v_max_mb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_storage_limit_before_insert ON public.documents;
CREATE TRIGGER check_storage_limit_before_insert
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_storage_limit();

-- ------------------------------------------------------------
-- 5. GRANT (기존 제한 함수와 동일 패턴)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.fill_document_company_id() TO anon;
GRANT EXECUTE ON FUNCTION public.fill_document_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fill_document_company_id() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_department_limit() TO anon;
GRANT EXECUTE ON FUNCTION public.check_department_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_department_limit() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_storage_limit() TO anon;
GRANT EXECUTE ON FUNCTION public.check_storage_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_storage_limit() TO service_role;
