-- ============================================================
-- Migration: 체험 부여 원장 보존기간(2년) 적용
--
-- 개인정보처리방침에 "부여 시점부터 2년" 으로 고지했으므로 코드가 그 기간을
-- 실제로 지켜야 한다. 고지 기간과 실제 보관이 어긋나는 것이 가장 흔한 결함이다.
-- 순수 SQL 잡이라 시크릿이 필요 없다.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-trial-grant-ledger') THEN
    PERFORM cron.unschedule('cleanup-trial-grant-ledger');
  END IF;
END
$do$;

SELECT cron.schedule(
  'cleanup-trial-grant-ledger',
  '50 0 * * *',  -- 매일 KST 09:50
  $$
  DELETE FROM public.trial_grant_ledger
  WHERE granted_at < now() - interval '2 years'
  $$
);
