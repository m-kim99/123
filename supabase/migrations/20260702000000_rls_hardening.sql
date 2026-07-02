-- ============================================================
-- 보안 하드닝 2: 개방형 RLS/GRANT 정리 (크로스 테넌트 노출 차단)
-- ============================================================
-- 배경: 라이브 DB 점검 결과 아래 문제 발견.
--   - phone_verifications(OTP 해시)/payapp_pending_rebills(결제)에 anon/authenticated 전체 GRANT
--     → 공개 anon 키만으로 읽기/쓰기 가능. 실제로는 edge function이 service_role로만 접근.
--   - notifications 에 anon GRANT + INSERT WITH CHECK(true) → 로그아웃 접근 및 크로스회사 삽입 가능.
--   - user_device_tokens SELECT USING(true) → 로그인한 아무나 전 유저 FCM 토큰 조회.
--   - users SELECT "Enable read access for authenticated users" USING(true)
--     → 로그인한 아무나 전 회사 유저(이메일/role/push_id) 조회.

-- ------------------------------------------------------------
-- 0) 헬퍼: 현재 사용자의 company_id
--    users 정책에서 users를 직접 서브쿼리하면 RLS 무한재귀가 나므로
--    SECURITY DEFINER 함수로 RLS를 우회해 조회한다.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.auth_company_id() FROM public;
GRANT EXECUTE ON FUNCTION public.auth_company_id() TO authenticated;

-- ------------------------------------------------------------
-- 1) 서버 전용 민감 테이블: 클라이언트 롤(anon/authenticated) 접근 차단
--    (edge function 은 service_role 로 접근하므로 RLS/GRANT 무관하게 계속 동작)
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.phone_verifications FROM anon, authenticated;
REVOKE ALL ON TABLE public.payapp_pending_rebills FROM anon, authenticated;

-- 오해 소지가 있는 개방형 정책을 service_role 전용으로 재정의(선택적 명확화)
DROP POLICY IF EXISTS "Service role full access" ON public.phone_verifications;
CREATE POLICY "phone_verifications_service_only" ON public.phone_verifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage payapp_pending_rebills" ON public.payapp_pending_rebills;
CREATE POLICY "payapp_pending_rebills_service_only" ON public.payapp_pending_rebills
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 2) notifications: 로그아웃(anon) 접근 회수 + 삽입을 같은 회사로 제한
--    authenticated 는 유지(클라이언트가 insert/select/delete 사용).
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.notifications FROM anon;

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "notifications_insert_same_company" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

-- ------------------------------------------------------------
-- 3) user_device_tokens: 전체공개 SELECT → 본인 토큰만
--    (푸시 대상 토큰 조회는 send-push-notification 이 service_role 로 수행)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "device_tokens_select" ON public.user_device_tokens;
CREATE POLICY "device_tokens_select_own" ON public.user_device_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4) users: 전체공개 SELECT → 본인 / 같은 회사 / 운영자만
--    멤버 목록·업로더 표시 등 같은 회사 조회 기능은 유지되고,
--    다른 회사 유저 노출만 차단된다. 운영자(is_operator)는 크로스회사 유지.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
CREATE POLICY "users_select_self_or_company" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR company_id = public.auth_company_id()
    OR public.is_operator()
  );
