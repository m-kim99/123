-- ============================================================
-- Migration: 신규 회사 무료체험 2개월 → 1개월 단축
-- 날짜: 2026-07-15
-- 설명: 신규 가입 회사에만 적용. 이미 부여된 체험 기간은 그대로 유지.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id INTO v_plan_id
  FROM public.plans
  WHERE name IN ('pro', 'basic', 'free') AND is_active = true
  ORDER BY CASE name WHEN 'pro' THEN 0 WHEN 'basic' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.subscriptions
    (company_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
  SELECT
    NEW.id, v_plan_id, 'trialing', 'monthly',
    now() + interval '1 month', now(), now() + interval '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.company_id = NEW.id AND s.status IN ('active', 'trialing')
  );

  RETURN NEW;
END;
$$;
