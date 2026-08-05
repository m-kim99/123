-- ============================================================
-- Migration: 결제 대기행 정리 크론 + plans 가격 동기화 (감사 LOW)
-- 날짜: 2026-07-31 (동일 타임스탬프 충돌로 20260729010000 → 20260731010000 재명명, 2026-08-05)
-- ============================================================

-- ------------------------------------------------------------
-- 1) innopay_autopay_pending 정리 크론
--    카드 등록을 시작만 하고 이탈하면 pending 행이 남는다. 결제 결과가 확정된
--    completed 는 감사 목적으로 보존하고, 미완/실패 행만 7일 후 정리한다.
--    charging 은 이상 상태(중단된 청구)라 조사 대상이므로 지우지 않는다.
--    HTTP 호출이 없는 순수 SQL 잡이라 시크릿이 필요 없다.
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-autopay-pending') THEN
    PERFORM cron.unschedule('cleanup-autopay-pending');
  END IF;
END
$do$;

SELECT cron.schedule(
  'cleanup-autopay-pending',
  '30 0 * * *',  -- 매일 KST 09:30
  $$
  DELETE FROM public.innopay_autopay_pending
  WHERE status IN ('pending', 'failed')
    AND created_at < now() - interval '7 days'
  $$
);

-- ------------------------------------------------------------
-- 2) plans 가격을 실제 청구 정책과 일치시킴
--    현재 청구는 '인당' 요금(클라 PLAN_PRICING / 결제 엣지함수와 동일):
--      basic 6,600원/인, pro 15,000원/인
--    DB에는 옛 정액 요금(5,900 / 29,900)이 남아 실제와 달랐다.
--    지금은 UI에서 이 컬럼을 쓰지 않지만(표시는 PLAN_PRICING 사용),
--    잘못된 값이 남아 있으면 이후 화면에 그대로 노출될 위험이 있어 맞춰 둔다.
--    연 요금제는 판매하지 않으므로 0으로 정리한다.
-- ------------------------------------------------------------
UPDATE public.plans SET price_monthly = 6600,  price_yearly = 0 WHERE name = 'basic';
UPDATE public.plans SET price_monthly = 15000, price_yearly = 0 WHERE name = 'pro';

COMMENT ON COLUMN public.plans.price_monthly IS
  '월 요금(원, VAT 포함). basic/pro 는 인당 금액 — 실제 청구액 = price_monthly * 좌석수. free/enterprise 는 0(별도 협의).';
