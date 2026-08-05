-- ============================================================
-- Migration: 무료 체험 부여 이력 원장 (기록 전용 — 차단하지 않음)
--
-- 목적: 체험을 소진하고 탈퇴한 뒤 재가입해 다시 체험받는 사용을 '관측'한다.
--   지금은 실고객이 거의 없어 가입 마찰을 늘리는 차단은 켜지 않는다.
--   대신 흔적만 남겨, 나중에 실제로 어뷰징이 있는지 데이터로 판단하고
--   그때 소급 적용할 수 있게 한다. (기록하지 않은 과거는 되살릴 수 없다)
--
-- 개인정보: 식별자는 평문으로 저장하지 않고 pepper 를 섞은 HMAC-SHA256 만 남긴다.
--   단순 SHA256 은 휴대폰번호(10^8 조합) 를 전수 대조로 역추적할 수 있어 pepper 필수.
--   pepper 는 클라이언트 롤이 읽을 수 없는 테이블에 두고 SECURITY DEFINER 함수만 읽는다.
--   개인정보처리방침에 '부정이용 방지 목적 해시 보관' 을 고지한 뒤 운영할 것.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) pepper 보관 (service_role 전용)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.app_secrets TO service_role;
-- 정책 없음 = 클라이언트 롤은 RLS 로도 차단 (service_role 은 RLS 우회)

-- pepper 생성 (이미 있으면 유지 — 재실행 시 해시가 달라지면 과거 기록과 대조 불가)
INSERT INTO public.app_secrets (key, value)
VALUES ('identifier_pepper', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 2) 식별자 해시 함수
--    pepper 를 함수 본문에 넣지 않는다 — pg_proc.prosrc 는 일반 롤도 읽을 수 있다.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_identifier(p_value text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pepper text;
  v_norm text;
BEGIN
  v_norm := lower(btrim(coalesce(p_value, '')));
  IF v_norm = '' THEN
    RETURN NULL;
  END IF;

  SELECT s.value INTO v_pepper
  FROM public.app_secrets s
  WHERE s.key = 'identifier_pepper';

  IF v_pepper IS NULL THEN
    RETURN NULL; -- pepper 없이 평문성 해시를 남기지 않는다
  END IF;

  RETURN encode(extensions.hmac(v_norm, v_pepper, 'sha256'), 'hex');
END;
$$;

-- [중요] 함수는 생성 시 PUBLIC 에 EXECUTE 가 자동 부여된다 — 롤 단위 REVOKE 로는
-- 막히지 않으므로 PUBLIC 부터 회수해야 한다. 이 함수는 pepper 를 쥔 해시 오라클이라
-- 일반 사용자가 호출할 수 있으면 임의 번호의 해시를 미리 만들어 둘 수 있다.
REVOKE ALL ON FUNCTION public.hash_identifier(text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3) 체험 부여 원장
--    company_id 에 FK 를 걸지 않는다 — 회사/계정이 삭제돼도 기록은 남아야 한다.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_grant_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,                 -- 참고용(FK 없음)
  company_code text,
  phone_hash text,                 -- 가입 시 OTP 인증된 관리자 휴대폰
  email_hash text,
  email_domain text,               -- 도메인은 개인 식별자가 아니라 그대로 보관 (B2B 관측용)
  phone_verified boolean NOT NULL DEFAULT false,
  prior_phone_grants integer NOT NULL DEFAULT 0,  -- 기록 시점에 같은 번호로 부여된 이력 수
  prior_email_grants integer NOT NULL DEFAULT 0,
  granted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_ledger_phone_hash
  ON public.trial_grant_ledger (phone_hash) WHERE phone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trial_ledger_email_hash
  ON public.trial_grant_ledger (email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trial_ledger_granted_at
  ON public.trial_grant_ledger (granted_at DESC);

ALTER TABLE public.trial_grant_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.trial_grant_ledger FROM anon, authenticated;
GRANT ALL ON TABLE public.trial_grant_ledger TO service_role;
GRANT SELECT ON TABLE public.trial_grant_ledger TO authenticated;

-- 운영자만 조회 (해시뿐이라 개인정보는 없지만 접근은 최소화)
DROP POLICY IF EXISTS "trial_ledger_operator_select" ON public.trial_grant_ledger;
CREATE POLICY "trial_ledger_operator_select" ON public.trial_grant_ledger
  FOR SELECT TO authenticated
  USING (public.is_operator());

COMMENT ON TABLE public.trial_grant_ledger IS
  '무료 체험 부여 이력(해시). 계정·회사 삭제 후에도 남는다. 기록 전용 — 체험 부여를 차단하지 않는다.';

-- ------------------------------------------------------------
-- 4) 가입 트리거에 원장 기록 추가
--    체험은 companies INSERT 트리거(grant_trial_subscription)가 부여하고,
--    가입 메타데이터(휴대폰)는 여기에만 있으므로 새 회사 생성 직후 기록한다.
--    [중요] 기록 실패가 가입을 막지 않도록 예외를 삼킨다.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_department_id uuid;
  v_role text;
  v_name text;
  v_company_code text;
  v_company_name text;
  v_phone text;
  v_phone_verified boolean := false;
  v_phone_hash text;
  v_email_hash text;
BEGIN
  v_name := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''), NEW.email, 'User');
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
    ELSE 'team'
  END;
  v_company_code := NULLIF(btrim(NEW.raw_user_meta_data->>'company_code'), '');
  v_company_name := NULLIF(btrim(NEW.raw_user_meta_data->>'company_name'), '');

  IF NULLIF(NEW.raw_user_meta_data->>'company_id', '') IS NOT NULL THEN
    -- 기존 회사 가입: id + code 일치 검증
    SELECT c.id
    INTO v_company_id
    FROM public.companies c
    WHERE c.id = (NEW.raw_user_meta_data->>'company_id')::uuid
      AND (v_company_code IS NULL OR c.code = v_company_code);

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Invalid signup company';
    END IF;
  ELSIF v_role = 'admin' AND v_company_code IS NOT NULL AND v_company_name IS NOT NULL THEN
    -- 새 회사 생성 (관리자 가입): 동시 가입 경쟁 대비 재조회
    SELECT c.id INTO v_company_id
    FROM public.companies c
    WHERE c.code = v_company_code
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      RAISE EXCEPTION 'Company code already in use';
    END IF;

    INSERT INTO public.companies (name, code)
    VALUES (v_company_name, v_company_code)
    RETURNING id INTO v_company_id;

    -- ── 체험 부여 이력 기록 (관측 전용, 실패해도 가입은 계속) ──
    BEGIN
      v_phone := regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone', ''), '\D', '', 'g');

      IF v_phone <> '' THEN
        -- 클라이언트가 보낸 번호를 그대로 믿지 않고, 실제 인증 기록이 있는지 확인한다
        SELECT EXISTS (
          SELECT 1 FROM public.phone_verifications pv
          WHERE pv.phone = v_phone
            AND pv.verified_at IS NOT NULL
            AND pv.verified_at > now() - interval '1 day'
        ) INTO v_phone_verified;

        v_phone_hash := public.hash_identifier(v_phone);

        -- 인증 기록을 이 이메일로 소비 표시 (phone ↔ email 감사 연결)
        IF v_phone_verified THEN
          UPDATE public.phone_verifications pv
          SET consumed_at = now(), consumed_for_email = NEW.email
          WHERE pv.id = (
            SELECT pv2.id FROM public.phone_verifications pv2
            WHERE pv2.phone = v_phone AND pv2.verified_at IS NOT NULL
            ORDER BY pv2.verified_at DESC
            LIMIT 1
          );
        END IF;
      END IF;

      v_email_hash := public.hash_identifier(NEW.email);

      INSERT INTO public.trial_grant_ledger (
        company_id, company_code, phone_hash, email_hash, email_domain,
        phone_verified, prior_phone_grants, prior_email_grants
      )
      VALUES (
        v_company_id,
        v_company_code,
        v_phone_hash,
        v_email_hash,
        NULLIF(lower(split_part(coalesce(NEW.email, ''), '@', 2)), ''),
        v_phone_verified,
        COALESCE((SELECT count(*) FROM public.trial_grant_ledger l
                  WHERE v_phone_hash IS NOT NULL AND l.phone_hash = v_phone_hash), 0),
        COALESCE((SELECT count(*) FROM public.trial_grant_ledger l
                  WHERE v_email_hash IS NOT NULL AND l.email_hash = v_email_hash), 0)
      );
    EXCEPTION WHEN OTHERS THEN
      -- 원장 기록은 부가 기능 — 어떤 이유로든 가입을 실패시키지 않는다
      RAISE WARNING 'trial_grant_ledger 기록 실패: %', SQLERRM;
    END;
  END IF;

  IF v_role = 'admin' AND v_company_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.company_id = v_company_id
      AND u.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'An administrator already exists for this company';
  END IF;

  IF NULLIF(NEW.raw_user_meta_data->>'department_id', '') IS NOT NULL THEN
    SELECT d.id
    INTO v_department_id
    FROM public.departments d
    WHERE d.id = (NEW.raw_user_meta_data->>'department_id')::uuid
      AND d.company_id = v_company_id;
  ELSIF v_role = 'team' AND v_company_id IS NOT NULL THEN
    SELECT d.id
    INTO v_department_id
    FROM public.departments d
    WHERE d.company_id = v_company_id
    ORDER BY d.created_at ASC
    LIMIT 1;
  END IF;

  INSERT INTO public.users (id, email, name, role, department_id, company_id)
  VALUES (NEW.id, NEW.email, v_name, v_role, v_department_id, v_company_id)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      department_id = EXCLUDED.department_id,
      company_id = EXCLUDED.company_id;

  IF v_role = 'admin' AND v_company_id IS NOT NULL THEN
    INSERT INTO public.departments (name, code, company_id, description)
    VALUES (
      '기본 부서',
      'DEFAULT',
      v_company_id,
      '회사 가입 시 자동 생성된 기본 부서입니다.'
    )
    ON CONFLICT (company_id, code) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
