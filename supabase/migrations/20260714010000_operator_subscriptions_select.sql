-- 운영자 페이지 회원 목록에서 회사 구독(플랜/종료일) 표시를 위해
-- 운영자에게 subscriptions 전체 SELECT 권한 부여
DROP POLICY IF EXISTS "Operators can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Operators can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_operator());
