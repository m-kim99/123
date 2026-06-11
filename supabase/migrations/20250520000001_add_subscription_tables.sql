-- ============================================================
-- Migration: 구독(Subscription) 관련 테이블 추가
-- 날짜: 2025-05-20
-- 설명: plans, subscriptions, usage_tracking 테이블 생성
--       + 문서 업로드 제한 트리거 (무료 100개)
-- ============================================================

-- 1. plans 테이블: 요금제 정의
CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL UNIQUE,              -- 'free', 'pro', 'enterprise'
    display_name text NOT NULL,             -- '무료', 'Pro', 'Enterprise'
    price_monthly integer DEFAULT 0 NOT NULL,
    price_yearly integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'KRW' NOT NULL,

    -- 제한 (NULL = 무제한)
    max_members integer DEFAULT 10,
    max_departments integer DEFAULT 2,
    max_documents integer DEFAULT 100,
    max_storage_mb integer DEFAULT 1024,
    max_ai_queries_monthly integer DEFAULT 20,
    max_nfc_tags integer DEFAULT 0,

    -- 기능 플래그
    feature_ai_chat boolean DEFAULT false,
    feature_vector_search boolean DEFAULT false,
    feature_nfc boolean DEFAULT false,
    feature_ocr_advanced boolean DEFAULT false,
    feature_external_share boolean DEFAULT false,
    feature_statistics_advanced boolean DEFAULT false,
    feature_api_access boolean DEFAULT false,
    feature_audit_log boolean DEFAULT false,
    feature_custom_branding boolean DEFAULT false,

    -- 메타
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.plans OWNER TO postgres;

-- 2. subscriptions 테이블: 회사별 구독 정보
CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,

    status text NOT NULL DEFAULT 'active',
    billing_cycle text DEFAULT 'monthly' NOT NULL,

    -- 결제 연동
    payment_provider text,
    payment_customer_id text,
    payment_subscription_id text,

    -- 기간
    trial_ends_at timestamptz,
    current_period_start timestamptz DEFAULT now(),
    current_period_end timestamptz,
    canceled_at timestamptz,

    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT subscriptions_status_check
        CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    CONSTRAINT subscriptions_billing_cycle_check
        CHECK (billing_cycle IN ('monthly', 'yearly'))
);

ALTER TABLE public.subscriptions OWNER TO postgres;

-- 회사당 활성 구독은 1개만
CREATE UNIQUE INDEX idx_subscriptions_company_active
    ON public.subscriptions (company_id)
    WHERE status IN ('active', 'trialing');

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);

-- 3. usage_tracking 테이블: 월별 사용량 추적
CREATE TABLE public.usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start date NOT NULL,

    documents_uploaded integer DEFAULT 0 NOT NULL,
    ai_queries_used integer DEFAULT 0 NOT NULL,
    storage_used_mb numeric(10,2) DEFAULT 0.00 NOT NULL,

    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT usage_tracking_unique UNIQUE (company_id, period_start)
);

ALTER TABLE public.usage_tracking OWNER TO postgres;

CREATE INDEX idx_usage_tracking_company_period
    ON public.usage_tracking (company_id, period_start DESC);

-- ============================================================
-- 4. 기본 플랜 데이터 삽입 (free = 100개 문서 제한)
-- ============================================================
INSERT INTO public.plans (name, display_name, price_monthly, price_yearly, max_members, max_departments, max_documents, max_storage_mb, max_ai_queries_monthly, max_nfc_tags, feature_ai_chat, feature_vector_search, feature_nfc, feature_ocr_advanced, feature_external_share, feature_statistics_advanced, feature_api_access, feature_audit_log, feature_custom_branding, sort_order)
VALUES
  ('free', '무료', 0, 0, 10, 3, 100, 1024, 20, 0, true, false, false, false, false, false, false, false, false, 0),
  ('basic', '베이직', 5900, 59000, 3, 2, 200, 2048, 50, 0, false, false, false, false, false, false, false, false, false, 1),
  ('pro', 'Pro', 29900, 299000, 10, 10, 1000, 10240, 200, 20, true, true, true, true, true, true, false, false, false, 2),
  ('enterprise', 'Enterprise', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, true, true, true, true, true, true, true, true, true, 3);

-- ============================================================
-- 5. 문서 업로드 제한 트리거 (BEFORE INSERT on documents)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_document_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_documents integer;
  v_current_count integer;
BEGIN
  -- 회사의 활성 구독에서 플랜의 max_documents 조회
  SELECT p.max_documents INTO v_max_documents
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.company_id = NEW.company_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  -- 구독이 없으면 free 플랜 기본값 (100)
  IF v_max_documents IS NULL THEN
    SELECT max_documents INTO v_max_documents
    FROM public.plans
    WHERE name = 'free'
    LIMIT 1;
  END IF;

  -- max_documents가 NULL이면 무제한 (enterprise)
  IF v_max_documents IS NULL THEN
    RETURN NEW;
  END IF;

  -- 현재 활성 문서 수 (soft-deleted 제외)
  SELECT COUNT(*) INTO v_current_count
  FROM public.documents
  WHERE company_id = NEW.company_id
    AND deleted_at IS NULL;

  -- 제한 초과 시 INSERT 차단
  IF v_current_count >= v_max_documents THEN
    RAISE EXCEPTION 'PLAN_DOCUMENT_LIMIT_REACHED: 현재 플랜의 문서 한도(%개)를 초과했습니다. 플랜을 업그레이드하거나 기존 문서를 삭제해주세요.', v_max_documents;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_document_limit_before_insert
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_document_limit();

-- ============================================================
-- 6. updated_at 자동 갱신 트리거
-- ============================================================
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. RLS 정책
-- ============================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- plans: 누구나 읽기 가능 (가격표 표시용)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (is_active = true);

-- subscriptions: 같은 회사 사용자만 조회
CREATE POLICY "Users can view own company subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- subscriptions: admin만 수정 가능
CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND company_id = subscriptions.company_id
  ));

-- usage_tracking: 같은 회사 사용자만 조회
CREATE POLICY "Users can view own company usage"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- ============================================================
-- 8. GRANT 권한
-- ============================================================
GRANT ALL ON TABLE public.plans TO anon;
GRANT ALL ON TABLE public.plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;

GRANT ALL ON TABLE public.usage_tracking TO anon;
GRANT ALL ON TABLE public.usage_tracking TO authenticated;
GRANT ALL ON TABLE public.usage_tracking TO service_role;

GRANT EXECUTE ON FUNCTION public.check_document_limit() TO anon;
GRANT EXECUTE ON FUNCTION public.check_document_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_document_limit() TO service_role;
