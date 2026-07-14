-- ============================================================
-- 전 회원(회사) 2개월 무료체험 부여 + 신규 회사 자동 체험 부여
-- 정책: 유효한 구독(active / 기간 내 trialing)이 없는 회사는
--       로그인 후 결제 게이트(SubscriptionGate)에 의해 이용 차단.
-- ============================================================

-- 1) 기존 회사: active/trialing 구독이 없는 모든 회사에 2개월 체험 부여
--    체험 플랜은 pro > basic > free 순으로 존재하는 첫 플랜 사용
WITH trial_plan AS (
  SELECT id FROM public.plans
  WHERE name IN ('pro', 'basic', 'free') AND is_active = true
  ORDER BY CASE name WHEN 'pro' THEN 0 WHEN 'basic' THEN 1 ELSE 2 END
  LIMIT 1
)
INSERT INTO public.subscriptions
  (company_id, plan_id, status, billing_cycle, trial_ends_at, current_period_start, current_period_end)
SELECT
  c.id, tp.id, 'trialing', 'monthly',
  now() + interval '2 months', now(), now() + interval '2 months'
FROM public.companies c
CROSS JOIN trial_plan tp
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.company_id = c.id AND s.status IN ('active', 'trialing')
);

-- 2) 신규 회사 생성 시 자동으로 2개월 체험 부여
--    (가입 시점에는 users 행이 아직 없어 RLS로 클라이언트 insert가 불가 → SECURITY DEFINER 트리거)
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
    now() + interval '2 months', now(), now() + interval '2 months'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.company_id = NEW.id AND s.status IN ('active', 'trialing')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_grant_trial ON public.companies;
CREATE TRIGGER companies_grant_trial
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.grant_trial_subscription();
