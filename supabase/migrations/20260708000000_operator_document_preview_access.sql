-- ============================================================
-- 신고 관리(운영자 콘솔)에서 신고된 문서를 미리보기할 수 있도록
-- documents 테이블 SELECT 정책에 운영자(is_operator) 접근 허용 추가.
-- ============================================================
-- 배경: ReportManagement.tsx에서 신고된 문서(target_type='document')를
--   미리보기하려면 documents 테이블을 조회해야 하는데, 기존 SELECT 정책은
--   "같은 회사 users 테이블에 admin/department/user_permissions로 존재하는 경우"만
--   허용하고 있어 별도 인증 주체인 운영자(operators 테이블)는 조회가 항상 0건이었음.
--   reports/users/system_notices/inquiries 등 다른 테이블에는 이미
--   is_operator() OR 절이 추가되어 있으므로 동일 패턴을 documents에도 적용한다.

DROP POLICY IF EXISTS "Users can view documents they have access to" ON public.documents;
CREATE POLICY "Users can view documents they have access to" ON public.documents
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    ))
    OR department_id = (SELECT users.department_id FROM public.users WHERE users.id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_permissions.user_id = auth.uid()
        AND user_permissions.department_id = documents.department_id
        AND user_permissions.role = ANY (ARRAY['viewer', 'editor', 'manager'])
    ))
    OR public.is_operator()
  );
