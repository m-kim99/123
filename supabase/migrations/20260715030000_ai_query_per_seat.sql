-- ============================================================
-- Migration: AI 쿼리 한도 인당제 전환 + 사용량 계량 RPC
-- 날짜: 2026-07-15
-- 설명:
--   - max_ai_queries_monthly 의미 변경: 조직 정액 → 인당 월 쿼리 수
--     (조직 한도 = 인당 × 좌석수. 좌석수 = 결제 인원수, 체험은 실제 멤버 수)
--   - pro: 200(조직 정액) → 50(인당)
--   - increment_ai_query_usage: ai-chat 엣지함수가 호출하는 원자적 카운터
-- ============================================================

COMMENT ON COLUMN public.plans.max_ai_queries_monthly IS
  '인당 월 AI 쿼리 수 (조직 한도 = 인당 × 좌석수). NULL = 무제한';

UPDATE public.plans SET max_ai_queries_monthly = 50 WHERE name = 'pro';

-- 월별 사용량 원자적 증가 (경쟁 조건 방지용 upsert)
CREATE OR REPLACE FUNCTION public.increment_ai_query_usage(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
BEGIN
  INSERT INTO public.usage_tracking (company_id, period_start, ai_queries_used)
  VALUES (p_company_id, date_trunc('month', now())::date, 1)
  ON CONFLICT (company_id, period_start)
  DO UPDATE SET ai_queries_used = usage_tracking.ai_queries_used + 1
  RETURNING ai_queries_used INTO v_used;

  RETURN v_used;
END;
$$;

-- 사용량 기록은 서버(ai-chat 엣지함수)만 수행 — 클라이언트 조작 방지
REVOKE ALL ON FUNCTION public.increment_ai_query_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_query_usage(uuid) TO service_role;
