-- 관리자가 팀원을 즉시 추방(회사 소속 해제)할 수 있는 함수.
-- 배경: 퇴사한 직원이 스스로 회원 탈퇴(account_deletion_requests)를 하지 않는 경우,
--       관리자가 즉시 접근 권한을 차단할 수단이 없었다.
-- 설계: auth.users(인증 계정)는 삭제하지 않고, public.users의 company_id/department_id만
--       해제한다. 이렇게 하면 documents/storage_events 등 다른 테이블이 참조하는 user_id는
--       그대로 유효하게 남아 참조 무결성이 깨지지 않으면서도, 회사 데이터에 대한 접근은
--       즉시 전부 차단된다(팀원 목록/부서 필터가 company_id 기준이므로).
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_company_id uuid;
  v_admin_role text;
  v_target_company_id uuid;
  v_target_role text;
BEGIN
  SELECT company_id, role INTO v_admin_company_id, v_admin_role
  FROM public.users
  WHERE id = auth.uid();

  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION '관리자만 팀원을 추방할 수 있습니다.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION '본인은 추방할 수 없습니다.';
  END IF;

  SELECT company_id, role INTO v_target_company_id, v_target_role
  FROM public.users
  WHERE id = target_user_id;

  IF v_target_company_id IS NULL OR v_target_company_id IS DISTINCT FROM v_admin_company_id THEN
    RAISE EXCEPTION '같은 회사 소속 팀원만 추방할 수 있습니다.';
  END IF;

  IF v_target_role = 'admin' THEN
    RAISE EXCEPTION '다른 관리자는 추방할 수 없습니다.';
  END IF;

  DELETE FROM public.user_permissions WHERE user_id = target_user_id;

  UPDATE public.users
  SET company_id = NULL, department_id = NULL
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_remove_team_member(uuid) IS
  '관리자가 팀원을 회사에서 즉시 제거(추방)한다. auth 계정은 유지하되 company/department 소속을 해제해 접근을 차단한다. 퇴사 후 본인 탈퇴를 하지 않는 경우 대비.';
