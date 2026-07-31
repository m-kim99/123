-- ============================================================
-- Migration: 권한 상승 / 무료 구독 활성화 차단 (감사 C1·C2·H4)
-- 날짜: 2026-07-28
-- 배경: 아래 두 결함이 체이닝되면 "임의 팀원 → 스스로 admin 승격 →
--   결제 없이 유료 구독 활성화"가 성립한다.
--   C1) users UPDATE 정책이 id만 고정하고 role/company_id 변경을 막지 않음
--   C2) subscriptions "Admins can manage subscriptions"가 FOR ALL + WITH CHECK 없음
--       → 회사 admin이 anon 키로 구독을 직접 INSERT/UPDATE 가능
--   H4) users/payments 에 anon·authenticated 전체 DML GRANT (심층방어 부재)
--
-- [사용처 사전 조사 결과 — 이 마이그레이션이 깨뜨리지 않는 것]
--   · users 셀프 UPDATE: 프로필명(DashboardLayout), preferences, last_login_at → 유지
--   · 온보딩(authStore): 회사 미배정 상태에서 role/company_id 최초 설정 → 예외 허용
--   · subscriptions 쓰기: 운영자 콘솔뿐 → Operators 정책이 그대로 담당
--   · payments: 클라이언트 쓰기 경로 0건 → 읽기 전용화 안전
--   · 엣지함수는 service_role(RLS·트리거 우회 대상) 로 동작 → 영향 없음
-- ============================================================

-- ------------------------------------------------------------
-- 1) C1: 본인 행의 role / company_id 변경 차단
--    RLS 정책 대신 트리거를 쓰는 이유: OLD/NEW 를 직접 비교해야
--    "온보딩 최초 설정은 허용, 이후 변경은 차단"을 정확히 표현할 수 있다.
--    service_role(auth.uid() IS NULL)과 타인 행 수정 경로는 통과시킨다
--    (타인 행은 RLS UPDATE 정책 auth.uid()=id 가 이미 차단).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 서버(service_role) 또는 본인 셀프 수정이 아닌 경우는 검사 대상 아님
  IF auth.uid() IS NULL OR auth.uid() <> NEW.id THEN
    RETURN NEW;
  END IF;

  -- 온보딩: 아직 회사에 배정되지 않은 사용자는 최초 1회 설정 허용
  -- (company_id 를 NULL 로 되돌리는 것은 아래 검사에서 차단되므로 재진입 불가)
  IF OLD.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'FORBIDDEN_ROLE_CHANGE: 본인의 권한은 변경할 수 없습니다.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'FORBIDDEN_COMPANY_CHANGE: 소속 회사는 변경할 수 없습니다.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- ------------------------------------------------------------
-- 2) C2: 회사 admin 의 subscriptions 직접 쓰기 차단
--    조회는 기존 "Users can view own company subscription"(company_id 스코프)이
--    admin 을 포함해 이미 커버하므로, FOR ALL 정책은 제거만 하면 된다.
--    구독 활성화는 엣지함수(service_role), 운영 변경은 Operators 정책이 담당.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

-- ------------------------------------------------------------
-- 3) H4: 과도한 테이블 권한 정리 (심층방어)
--    RLS 정책이 실수로 열려도 클라이언트 롤이 쓰기를 못 하도록 GRANT 자체를 좁힌다.
-- ------------------------------------------------------------
-- anon: 로그인 전 클라이언트가 이 테이블들에 접근할 이유가 없다
REVOKE ALL ON TABLE public.users FROM anon;
REVOKE ALL ON TABLE public.payments FROM anon;
REVOKE ALL ON TABLE public.subscriptions FROM anon;

-- payments: 앱은 결제 내역 조회만 한다 (쓰기는 엣지함수 service_role)
REVOKE ALL ON TABLE public.payments FROM authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

-- users: 셀프 프로필 수정/생성은 유지, 삭제·TRUNCATE 등은 회수
REVOKE ALL ON TABLE public.users FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;

-- subscriptions: 운영자 콘솔의 조회/등록/수정 유지, 삭제·TRUNCATE 회수
REVOKE ALL ON TABLE public.subscriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.subscriptions TO authenticated;
