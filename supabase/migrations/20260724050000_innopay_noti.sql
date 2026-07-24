-- ============================================================
-- Migration: 이노페이 결제결과 통보(Noti) 수신
-- 날짜: 2026-07-24
-- 배경: 스펙 §10(필수) — 이노페이가 결제완료(status=25)/취소(status=85)를
--   가맹점 등록 URL로 서버-투-서버 POST 통보. returnUrl(브라우저) 유실 대비
--   신뢰 백업 + 외부(상점관리) 취소 동기화 + 분쟁 대비 durable 로그.
-- ============================================================

-- 1) Noti 원문 durable 로그 (스펙: "로그를 반드시 작성 — 분쟁 시 근거")
CREATE TABLE IF NOT EXISTS public.innopay_noti_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  shop_code text,
  pg_tid text,
  moid text,
  status text,          -- 25:승인 / 85:취소
  pay_method text,      -- 09:자동결제 등
  bill_key text,
  amount integer,
  raw jsonb             -- 전체 파라미터 원문
);

CREATE INDEX IF NOT EXISTS idx_innopay_noti_log_received
  ON public.innopay_noti_log (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_innopay_noti_log_moid
  ON public.innopay_noti_log (moid);

ALTER TABLE public.innopay_noti_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.innopay_noti_log FROM anon, authenticated;

-- 2) 첫 결제(payAutoCardBill) moid 보관 — Noti(status=25)를 첫 결제와 상관짓기 위함
ALTER TABLE public.innopay_autopay_pending
  ADD COLUMN IF NOT EXISTS charge_moid text;
