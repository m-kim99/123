-- ============================================================
-- 회원가입 시 새 회사 생성을 auth 트리거로 이동
-- 근본 원인: 클라이언트가 signUp() 이전에 companies를 insert하여,
--   가입 실패(예: 이메일 발송 429) 시 고아 회사가 남고 코드 재사용 불가.
-- 해결: company_name 메타데이터를 받아 트리거가 프로필·회사·기본 부서를
--   한 트랜잭션에서 생성 (가입 실패 = 아무것도 안 남음)
-- ============================================================

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

-- 과거 실패한 가입이 남긴 고아 회사 정리
-- 조건: 유저·카테고리·문서가 전혀 없는(실데이터 없는) 회사만
-- departments/subscriptions/usage_tracking 등은 FK ON DELETE CASCADE로 함께 삭제됨
DELETE FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.company_id = c.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.departments d
  JOIN public.categories cat ON cat.department_id = d.id
  WHERE d.company_id = c.id
)
AND NOT EXISTS (
  SELECT 1
  FROM public.departments d
  JOIN public.documents doc ON doc.department_id = d.id
  WHERE d.company_id = c.id
);
