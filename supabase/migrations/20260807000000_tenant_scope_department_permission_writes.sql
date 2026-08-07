-- ============================================================
-- 크로스 테넌트 쓰기 차단: departments / user_permissions
-- ============================================================
-- 배경: 두 테이블의 INSERT/UPDATE/DELETE 정책이 최초 마이그레이션
--   (20251113014729_02_create_rls_policies.sql) 이후 한 번도 교체되지 않아
--   `role='admin'` 만 검사하고 회사 스코프가 없다. SELECT 정책만 스코프돼 있다.
--   → 아무나 무료로 admin 가입 후 공개 anon 키만으로
--      · 타사 부서를 수정·삭제 (categories/subcategories/storage_events 가 CASCADE)
--      · user_permissions 에 {본인, 타사 department_id, 'manager'} 를 삽입해
--        documents/categories RLS(20260219_update_rls_for_user_permissions.sql:41-46)를 통과
--     즉 전 고객사 문서 열람·수정·삭제가 가능하다.
--
-- 검증 대상 선택 이유:
--   user_permissions.company_id 는 nullable 이고, 클라이언트가 레거시 행을
--   재저장할 때 값을 비운 채 insert 한다(UserManagement.tsx:228 `existing.company_id ?? undefined`).
--   따라서 행 자신의 company_id 가 아니라 "대상 부서 / 대상 사용자의 소속"으로 검증한다.
--   departments 는 모든 INSERT 호출부가 company_id 를 채우므로 행 자신의 값으로 검증한다.

-- ------------------------------------------------------------
-- 0) 헬퍼 (모두 SECURITY DEFINER — 정책 안에서 users/departments 를 직접
--    서브쿼리하면 해당 테이블의 RLS 가 다시 적용돼 판정이 흔들린다)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.department_company_id(p_department_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.departments WHERE id = p_department_id
$$;

CREATE OR REPLACE FUNCTION public.user_company_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = p_user_id
$$;

REVOKE ALL ON FUNCTION public.is_company_admin() FROM public;
REVOKE ALL ON FUNCTION public.department_company_id(uuid) FROM public;
REVOKE ALL ON FUNCTION public.user_company_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_company_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.department_company_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_company_id(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 1) departments: admin 검사에 자기 회사 스코프 추가
--    WITH CHECK 로 타사 부서를 자기 회사로 끌어오는 것(company_id 변경)도 차단.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can insert departments" ON public.departments;
CREATE POLICY "Only admins can insert departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_company_admin()
    AND company_id = public.auth_company_id()
  );

DROP POLICY IF EXISTS "Only admins can update departments" ON public.departments;
CREATE POLICY "Only admins can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    public.is_company_admin()
    AND company_id = public.auth_company_id()
  )
  WITH CHECK (
    public.is_company_admin()
    AND company_id = public.auth_company_id()
  );

DROP POLICY IF EXISTS "Only admins can delete departments" ON public.departments;
CREATE POLICY "Only admins can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (
    public.is_company_admin()
    AND company_id = public.auth_company_id()
  );

-- ------------------------------------------------------------
-- 2) user_permissions: 대상 부서와 대상 사용자가 모두 자기 회사 소속이어야 함
--    DELETE 는 대상 사용자만 검사한다 — UserManagement 의 저장 흐름이
--    "이 사용자의 권한 전체 삭제 후 재삽입"(UserManagement.tsx:263-276)이라
--    department_id 가 NULL 인 레거시 행도 지워져야 하기 때문.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can insert permissions" ON public.user_permissions;
CREATE POLICY "Only admins can insert permissions"
  ON public.user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_company_admin()
    AND public.department_company_id(department_id) = public.auth_company_id()
    AND public.user_company_id(user_id) = public.auth_company_id()
  );

DROP POLICY IF EXISTS "Only admins can update permissions" ON public.user_permissions;
CREATE POLICY "Only admins can update permissions"
  ON public.user_permissions FOR UPDATE
  TO authenticated
  USING (
    public.is_company_admin()
    AND public.user_company_id(user_id) = public.auth_company_id()
  )
  WITH CHECK (
    public.is_company_admin()
    AND public.department_company_id(department_id) = public.auth_company_id()
    AND public.user_company_id(user_id) = public.auth_company_id()
  );

DROP POLICY IF EXISTS "Only admins can delete permissions" ON public.user_permissions;
CREATE POLICY "Only admins can delete permissions"
  ON public.user_permissions FOR DELETE
  TO authenticated
  USING (
    public.is_company_admin()
    AND public.user_company_id(user_id) = public.auth_company_id()
  );
