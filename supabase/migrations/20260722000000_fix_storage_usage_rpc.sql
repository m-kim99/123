-- 저장 공간 사용량 조회를 RPC 함수로 대체
--  - 기존 클라이언트 코드(subscription.ts)가 PostgREST 임베디드 집계 문법
--    (`select=file_size.sum()`)을 썼는데, 이 프로젝트의 PostgREST 설정에서
--    집계 함수가 꺼져있어 PGRST123(Use of aggregate functions is not allowed)
--    에러가 나고 있었다.
--  - documents SELECT RLS는 부서 단위로 스코프돼 있어(관리자 전체, 팀원은
--    자기 부서만), 일반 정책을 그대로 쓰면 회사 전체 합계가 아니라 호출한
--    유저가 볼 수 있는 부서 문서만 합산돼 실제보다 적게 나온다.
--    SECURITY DEFINER로 RLS를 우회해 회사 전체 합계를 정확히 구한다.

CREATE OR REPLACE FUNCTION public.get_company_storage_usage(p_company_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(file_size), 0)::bigint
  FROM public.documents
  WHERE company_id = p_company_id
    AND deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_storage_usage(uuid) TO authenticated;
