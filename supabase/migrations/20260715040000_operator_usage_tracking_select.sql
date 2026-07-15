-- 운영자 콘솔 회사 관리에서 회사별 AI 사용량(이번 달) 표시를 위해
-- 운영자에게 usage_tracking 전체 SELECT 권한 부여
-- (기존 "Operators can view all subscriptions" 정책과 동일 패턴)
DROP POLICY IF EXISTS "Operators can view all usage" ON public.usage_tracking;
CREATE POLICY "Operators can view all usage"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (public.is_operator());
