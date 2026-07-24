-- ============================================================
-- Migration: 이노페이 빌키 자동결제(구독제) 전환
-- 날짜: 2026-07-24
-- 설명: subscriptions에 자동갱신 관련 컬럼 추가
--   - auto_renew: 빌키 기반 자동청구 대상 여부
--     (기존 단회 결제 구독은 false 유지 — billing_key에 빌키가 아닌 tid가 저장되어 있음)
--   - renewal_attempts / last_renewal_attempt_at: 갱신 자동결제 실패 재시도 추적
--     (innopay-billing-renewal 크론이 3회 실패 시 past_due 전환)
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewal_attempt_at timestamptz;

COMMENT ON COLUMN public.subscriptions.auto_renew IS '이노페이 빌키 자동결제 구독 여부 — true면 갱신 크론이 만료 시 자동 청구';
COMMENT ON COLUMN public.subscriptions.renewal_attempts IS '현재 갱신 주기의 자동결제 실패 횟수 (성공 시 0으로 초기화)';
COMMENT ON COLUMN public.subscriptions.last_renewal_attempt_at IS '마지막 자동결제 시도 시각';
