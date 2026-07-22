-- ============================================================
-- Migration: Pro 플랜 저장용량 인당제 전환
-- 날짜: 2026-07-22
-- 설명:
--   - max_ai_queries_monthly와 동일한 패턴: pro만 "인당 X" 의미로 전환
--     (조직 한도 = 인당 × 좌석수. 좌석수 = 결제 인원수(member_count),
--      없으면(체험) 실제 멤버 수). free/basic은 기존처럼 정액 유지
--     (basic은 인원 3명 고정이라 인당 전환이 산술적으로 의미 없음).
--   - 총 사용량 집계 자체(get_company_storage_usage)는 회사 전체를
--     하나로 합산하는 방식 그대로 유지 - 개인별로 나누거나 추적하지
--     않는다. 인당 계산은 "한도"를 정하는 데만 쓰이고, 그 한도 안에서는
--     누가 얼마나 올렸는지 구분하지 않는 공유 풀이다.
--   - pro: 10240MB(정액) → 3072MB(인당). 최소 인원(3명) 기준 9216MB로
--     기존 체감과 크게 다르지 않게 설정.
--   - 트리거와 클라이언트 사전 체크가 동일한 로직을 쓰도록
--     get_company_storage_limit_mb() RPC로 한도 계산을 일원화한다.
-- ============================================================

UPDATE public.plans SET max_storage_mb = 3072 WHERE name = 'pro';

COMMENT ON COLUMN public.plans.max_storage_mb IS
  'pro: 인당 월 저장용량(MB, 조직 한도 = 인당 × 좌석수). free/basic: 조직 정액. NULL = 무제한';

-- 회사의 유효 저장용량 한도(MB) 계산 - 트리거와 클라이언트 체크가 공유
CREATE OR REPLACE FUNCTION public.get_company_storage_limit_mb(p_company_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_company_storage_limit_mb(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_storage_limit_mb(uuid) TO service_role;

-- 저장 공간 제한 트리거: 직접 plans.max_storage_mb를 읽던 것을
-- get_company_storage_limit_mb()로 대체 (인당 계산 반영)
CREATE OR REPLACE FUNCTION public.check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_mb bigint;
  v_used_bytes bigint;
BEGIN
  IF NEW.company_id IS NULL OR NEW.file_size IS NULL THEN
    RETURN NEW;
  END IF;

  v_max_mb := public.get_company_storage_limit_mb(NEW.company_id);

  IF v_max_mb IS NULL THEN
    RETURN NEW; -- 무제한
  END IF;

  SELECT COALESCE(SUM(file_size), 0) INTO v_used_bytes
  FROM public.documents
  WHERE company_id = NEW.company_id
    AND deleted_at IS NULL;

  IF v_used_bytes + NEW.file_size > v_max_mb * 1024 * 1024 THEN
    RAISE EXCEPTION 'PLAN_STORAGE_LIMIT_REACHED: 현재 플랜의 저장 공간(%MB)을 초과합니다. 기존 문서를 삭제하거나 플랜을 업그레이드해주세요.', v_max_mb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
