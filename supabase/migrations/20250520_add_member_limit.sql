-- ============================================================
-- Migration: 멤버 수 제한 (무료 플랜 10명)
-- 날짜: 2025-05-20
-- 설명: max_members를 5→10으로 변경 + 회사 합류 시 인원 제한 트리거
-- ============================================================

-- 1. 무료 플랜 max_members 업데이트 (5 → 10)
UPDATE public.plans SET max_members = 10 WHERE name = 'free';

-- 2. 멤버 제한 체크 함수
CREATE OR REPLACE FUNCTION public.check_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_current_count integer;
  v_max_members integer;
BEGIN
  -- company_id가 설정되는 경우만 체크
  -- INSERT 시: NEW.company_id가 있으면
  -- UPDATE 시: company_id가 NULL → 값으로 변경될 때
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- company_id가 변경되지 않았거나 NULL로 가는 경우 패스
    IF (NEW.company_id IS NULL) OR (OLD.company_id IS NOT DISTINCT FROM NEW.company_id) THEN
      RETURN NEW;
    END IF;
    v_company_id := NEW.company_id;
  END IF;

  -- company_id가 NULL이면 패스 (회사 미소속)
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 해당 회사의 현재 멤버 수 (본인 제외)
  SELECT COUNT(*) INTO v_current_count
  FROM public.users
  WHERE company_id = v_company_id
    AND id != NEW.id;

  -- 해당 회사의 플랜에서 max_members 조회
  SELECT p.max_members INTO v_max_members
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = v_company_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 구독이 없으면 무료 플랜 기본값 사용
  IF v_max_members IS NULL THEN
    SELECT max_members INTO v_max_members
    FROM public.plans
    WHERE name = 'free';
  END IF;

  -- NULL이면 무제한
  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  -- 제한 초과 시 에러
  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION '회사 멤버 수 제한에 도달했습니다. (현재: %명 / 최대: %명) 플랜을 업그레이드해주세요.', v_current_count, v_max_members;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.check_member_limit() OWNER TO postgres;

-- 3. 트리거 생성 (INSERT + UPDATE on users)
CREATE TRIGGER check_member_limit_before_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_member_limit();

CREATE TRIGGER check_member_limit_before_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_member_limit();

-- 4. GRANT
GRANT EXECUTE ON FUNCTION public.check_member_limit() TO anon;
GRANT EXECUTE ON FUNCTION public.check_member_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_member_limit() TO service_role;
