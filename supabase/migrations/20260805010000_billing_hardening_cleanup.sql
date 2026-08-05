-- ============================================================
-- Migration: 결제 하드닝 정리 (2026-08-05 전수 검토 후속)
-- 1) plans.max_members 프로 폴백을 실제 판매 조건과 일치 (10 → 20)
-- 2) innopay_noti_log 보존 기한(2년) 크론 — 무한 성장 방지
-- ============================================================

-- ------------------------------------------------------------
-- 1) 프로 플랜 인원 폴백 — 판매는 3~20인(클라/엣지 PLAN_PRICING)인데
--    시드가 10으로 남아 있었다. 유료 구독은 subscriptions.member_count 가
--    우선 적용되지만, member_count 가 비어 있는 예외 행이 폴백으로 이 값을
--    쓰므로 판매 조건과 맞춘다.
-- ------------------------------------------------------------
UPDATE public.plans SET max_members = 20 WHERE name = 'pro';

-- ------------------------------------------------------------
-- 2) innopay_noti_log 보존 크론
--    이노페이 결제결과 통보 로그(분쟁 근거)는 2년 보존 후 삭제한다.
--    HTTP 호출이 없는 순수 SQL 잡이라 시크릿이 필요 없다.
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-innopay-noti-log') THEN
    PERFORM cron.unschedule('cleanup-innopay-noti-log');
  END IF;
END
$do$;

SELECT cron.schedule(
  'cleanup-innopay-noti-log',
  '40 0 * * *',  -- 매일 KST 09:40
  $$
  DELETE FROM public.innopay_noti_log
  WHERE created_at < now() - interval '2 years'
  $$
);
