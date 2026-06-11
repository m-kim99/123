-- ============================================================
-- Migration: 토스페이먼츠 빌링(정기결제) 연동
-- 날짜: 2026-06-11
-- 설명: subscriptions에 빌링키/인원수 컬럼 추가 + payments(결제내역) 테이블 생성
--       + 멤버 제한 트리거가 구독별 member_count를 우선 사용하도록 수정
-- ============================================================

-- 1. subscriptions 테이블에 빌링 관련 컬럼 추가
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_key text,
  ADD COLUMN IF NOT EXISTS member_count integer,
  ADD COLUMN IF NOT EXISTS monthly_amount integer,
  ADD COLUMN IF NOT EXISTS card_company text,
  ADD COLUMN IF NOT EXISTS card_number text;

COMMENT ON COLUMN public.subscriptions.billing_key IS '토스페이먼츠 빌링키 (정기결제용)';
COMMENT ON COLUMN public.subscriptions.member_count IS '구독 인원수 (plans.max_members보다 우선 적용)';
COMMENT ON COLUMN public.subscriptions.monthly_amount IS '월 결제 금액 (KRW)';

-- 2. payments 테이블: 결제 내역
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,

    order_id text NOT NULL UNIQUE,
    payment_key text,
    amount integer NOT NULL,
    currency text DEFAULT 'KRW' NOT NULL,
    status text NOT NULL,
    method text,
    card_company text,
    card_number text,
    receipt_url text,
    approved_at timestamptz,
    failure_code text,
    failure_message text,

    created_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT payments_status_check
        CHECK (status IN ('DONE', 'CANCELED', 'FAILED'))
);

ALTER TABLE public.payments OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments (subscription_id);

-- 3. RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 같은 회사 admin만 결제 내역 조회 가능
DROP POLICY IF EXISTS "Admins can view own company payments" ON public.payments;
CREATE POLICY "Admins can view own company payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND company_id = payments.company_id
  ));

-- 쓰기는 service_role(Edge Function)만 수행 (별도 정책 없음)

GRANT SELECT ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;

-- 4. 멤버 제한 트리거 수정: 구독별 member_count가 있으면 우선 사용
CREATE OR REPLACE FUNCTION public.check_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_current_count integer;
  v_max_members integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.company_id IS NULL) OR (OLD.company_id IS NOT DISTINCT FROM NEW.company_id) THEN
      RETURN NEW;
    END IF;
    v_company_id := NEW.company_id;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.users
  WHERE company_id = v_company_id
    AND id != NEW.id;

  -- 구독의 member_count(결제 인원수)가 있으면 우선, 없으면 플랜 기본값
  SELECT COALESCE(s.member_count, p.max_members) INTO v_max_members
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = v_company_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_max_members IS NULL THEN
    SELECT max_members INTO v_max_members
    FROM public.plans
    WHERE name = 'free';
  END IF;

  IF v_max_members IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION '회사 멤버 수 제한에 도달했습니다. (현재: %명 / 최대: %명) 플랜을 업그레이드해주세요.', v_current_count, v_max_members;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
