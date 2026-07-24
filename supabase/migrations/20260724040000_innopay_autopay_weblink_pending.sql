-- ============================================================
-- Migration: 이노페이 자동결제 웹링크 등록 대기 컨텍스트
-- 날짜: 2026-07-24
-- 배경: 웹링크(RAUT) 등록 완료 시 이노페이가 returnUrl로 billKey를 POST하는데,
--   이 POST는 브라우저發이라 금액/플랜을 신뢰할 수 없다. 등록 시작 시점에
--   서버가 인증된 관리자 기준으로 계산한 컨텍스트를 moid로 보관해두고,
--   returnUrl 처리에서 moid로 조회해 실제 청구 금액을 결정한다.
--   (billKey 진위는 payAutoCardBill 실청구 성공으로 검증된다.)
-- 접근: 엣지함수(service_role)만 읽고 쓴다. 클라이언트 롤은 접근 불가.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.innopay_autopay_pending (
  moid text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_name text NOT NULL,
  member_count integer NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  bill_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_innopay_autopay_pending_company
  ON public.innopay_autopay_pending (company_id, created_at DESC);

ALTER TABLE public.innopay_autopay_pending ENABLE ROW LEVEL SECURITY;

-- 클라이언트 롤 전면 차단 (엣지함수 service_role 만 사용 — RLS 우회)
REVOKE ALL ON TABLE public.innopay_autopay_pending FROM anon, authenticated;
-- 정책을 두지 않으므로 authenticated/anon 은 RLS 로 0건 (service_role 은 정책 무관 접근)
