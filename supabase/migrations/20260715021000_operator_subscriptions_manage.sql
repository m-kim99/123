-- ============================================================
-- 운영자 구독 수동 관리 권한 (체험/구독 기간 연장)
-- 용도: 해외 유저 등 결제 수단이 없는 회사의 이용 기간을
--       운영자 콘솔(회사 관리)에서 수동으로 연장/부여
-- ============================================================

DROP POLICY IF EXISTS "Operators can update subscriptions" ON public.subscriptions;
CREATE POLICY "Operators can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

DROP POLICY IF EXISTS "Operators can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Operators can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_operator());
