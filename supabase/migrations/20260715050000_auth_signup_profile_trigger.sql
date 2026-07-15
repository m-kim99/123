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
BEGIN
  v_name := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''), NEW.email, 'User');
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
    ELSE 'team'
  END;

  IF NULLIF(NEW.raw_user_meta_data->>'company_id', '') IS NOT NULL THEN
    SELECT c.id
    INTO v_company_id
    FROM public.companies c
    WHERE c.id = (NEW.raw_user_meta_data->>'company_id')::uuid
      AND (
        NULLIF(NEW.raw_user_meta_data->>'company_code', '') IS NULL
        OR c.code = NEW.raw_user_meta_data->>'company_code'
      );

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Invalid signup company';
    END IF;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
