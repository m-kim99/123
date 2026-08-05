-- ============================================================
-- Migration: 무료 체험 잔여기간 소진 후 첫 결제(예약결제) 지원
--
-- 배경: 체험 중 카드를 등록하면 즉시 1회차가 청구되고 유료기간을 체험 만료일부터
--   이어붙였다. 실제로는 "돈이 미리 나간다"는 문제라, 체험(또는 남은 유료기간)이
--   끝나는 날 첫 결제가 나가도록 바꾼다.
--
-- 왜 별도 컬럼인가: plan_id·member_count 는 체험 중에도 쿼터에 그대로 쓰인다
--   (check_member_limit / get_company_storage_limit_mb 가 status IN ('active','trialing')
--    조건으로 조회). 등록 시점에 이 값을 유료 플랜 값으로 덮어쓰면 남은 체험 기간의
--   좌석·용량 한도가 즉시 바뀌어 버린다(프로 체험 → 베이직 3인으로 축소 등).
--   그래서 예약된 결제 정보는 scheduled_* 에 따로 담고, 첫 결제가 성공하는 순간
--   갱신 크론이 plan_id/member_count/monthly_amount 로 옮긴 뒤 비운다.
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan_name text,
  ADD COLUMN IF NOT EXISTS scheduled_member_count integer,
  ADD COLUMN IF NOT EXISTS scheduled_monthly_amount integer;

COMMENT ON COLUMN public.subscriptions.scheduled_plan_name IS
  '예약 결제로 전환될 플랜명(plans.name). 체험/잔여기간 종료 시 갱신 크론이 plan_id 로 반영하고 NULL 로 비운다.';
COMMENT ON COLUMN public.subscriptions.scheduled_member_count IS
  '예약 결제 좌석수. 체험 중 쿼터에 영향을 주지 않도록 member_count 와 분리 보관.';
COMMENT ON COLUMN public.subscriptions.scheduled_monthly_amount IS
  '예약 결제 금액(원). 첫 결제 직전 true-up 으로 실인원 기준 재계산된다.';
