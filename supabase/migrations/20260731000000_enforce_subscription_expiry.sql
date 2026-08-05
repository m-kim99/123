-- ============================================================
-- Migration: 구독/체험 만료를 데이터 계층에서도 강제
-- 날짜: 2026-07-29
-- 배경: 쿼터·플랜 해석 DB 함수들이 status IN ('active','trialing') 만 보고
--   current_period_end(만료일)를 보지 않았다. 그래서 체험 기간이 지났는데
--   status 가 trialing 으로 남아 있으면 DB 는 계속 유료 한도를 부여했다.
--   (만료 판정이 클라이언트 checkSubscriptionAccess 에만 존재)
--   company_has_storage_lifecycle 은 이미 만료 조건을 포함하므로 나머지를 맞춘다.
--
-- 방식: 각 함수의 기존 정의를 그대로 가져와 구독 조회 조건에
--   "AND (s.current_period_end IS NULL OR s.current_period_end > now())" 한 줄만 추가.
--   만료 시 free 플랜 폴백은 각 함수의 기존 로직을 그대로 따른다.
--
-- 영향: 적용 시점 기준 만료-활성 구독 0건 → 즉시 동작 변화 없음.
-- ============================================================

-- ── get_company_storage_limit_mb ──
CREATE OR REPLACE FUNCTION public.get_company_storage_limit_mb(p_company_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_name text;
  v_base_mb integer;
  v_seats integer;
BEGIN
  SELECT p.name, p.max_storage_mb, s.member_count
    INTO v_plan_name, v_base_mb, v_seats
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = p_company_id
    AND s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  LIMIT 1;

  IF v_plan_name IS NULL THEN
    SELECT name, max_storage_mb INTO v_plan_name, v_base_mb
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  IF v_base_mb IS NULL THEN
    RETURN NULL; -- 무제한 (enterprise)
  END IF;

  IF v_plan_name = 'pro' THEN
    IF v_seats IS NULL THEN
      SELECT COUNT(*) INTO v_seats FROM public.users WHERE company_id = p_company_id;
    END IF;
    RETURN v_base_mb::bigint * GREATEST(1, v_seats);
  END IF;

  RETURN v_base_mb::bigint;
END;
$function$
;

-- ── check_member_limit ──
CREATE OR REPLACE FUNCTION public.check_member_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
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
$function$
;

-- ── check_department_limit ──
CREATE OR REPLACE FUNCTION public.check_department_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
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
$function$
;

-- ── check_document_limit ──
CREATE OR REPLACE FUNCTION public.check_document_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_max_documents integer;
  v_current_count integer;
BEGIN
  -- 회사의 활성 구독에서 플랜의 max_documents 조회
  SELECT p.max_documents INTO v_max_documents
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = NEW.company_id
    AND s.status IN ('active', 'trialing')
    AND (s.current_period_end IS NULL OR s.current_period_end > now())
  LIMIT 1;

  -- 구독이 없으면 free 플랜 기본값 (100)
  IF v_max_documents IS NULL THEN
    SELECT max_documents INTO v_max_documents
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  -- max_documents가 NULL이면 무제한 (enterprise)
  IF v_max_documents IS NULL THEN
    RETURN NEW;
  END IF;

  -- 현재 활성 문서 수 (soft-deleted 제외)
  SELECT COUNT(*) INTO v_current_count
  FROM public.documents
  WHERE company_id = NEW.company_id
    AND deleted_at IS NULL;

  -- 제한 초과 시 INSERT 차단
  IF v_current_count >= v_max_documents THEN
    RAISE EXCEPTION 'PLAN_DOCUMENT_LIMIT_REACHED: 현재 플랜의 문서 한도(%개)를 초과했습니다. 플랜을 업그레이드하거나 기존 문서를 삭제해주세요.', v_max_documents;
  END IF;

  RETURN NEW;
END;
$function$
;
