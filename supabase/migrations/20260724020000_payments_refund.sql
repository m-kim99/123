-- ============================================================
-- Migration: 결제 환불(취소) 지원
-- 날짜: 2026-07-24
-- 설명:
--   1) payments에 취소 추적 컬럼 추가 (이노페이 cancelTransaction 연동)
--      - 전액 취소 시 status='CANCELED', 부분 취소 시 status 유지 + cancel_amount 누적
--   2) 운영자(operator)가 환불 처리를 위해 결제 내역을 조회할 수 있도록 RLS 추가
-- ============================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_num text;

COMMENT ON COLUMN public.payments.canceled_at IS '마지막 취소(환불) 처리 시각';
COMMENT ON COLUMN public.payments.cancel_amount IS '누적 취소 금액 (부분취소 포함, 전액 취소 시 amount와 동일)';
COMMENT ON COLUMN public.payments.cancel_reason IS '취소 사유';
COMMENT ON COLUMN public.payments.cancel_num IS '이노페이 취소번호 (cancelNum)';

-- 운영자 결제 내역 조회 (환불 처리용) — 쓰기는 여전히 service_role(엣지함수) 전용
DROP POLICY IF EXISTS "Operators can view payments" ON public.payments;
CREATE POLICY "Operators can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_operator());
