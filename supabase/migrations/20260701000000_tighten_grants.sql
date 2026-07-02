-- ============================================================
-- 보안 하드닝: anon 롤의 과도한 테이블 권한 회수 (최소권한 원칙)
-- ============================================================
-- 배경: 20250520000001_add_subscription_tables.sql 에서
--   plans / subscriptions / usage_tracking 에 GRANT ALL TO anon 이 부여됨.
-- RLS가 켜져 있어 즉각적 무단 쓰기는 막히지만, 테이블 권한 자체가 과도하다.
-- RLS 정책 실수 시 곧바로 구멍이 되므로 심층방어 차원에서 축소한다.

-- plans: 가격표 표시용 읽기만 필요
REVOKE ALL ON TABLE public.plans FROM anon;
GRANT SELECT ON TABLE public.plans TO anon;

-- subscriptions: 비로그인(anon)은 접근 불필요 → 전부 회수
REVOKE ALL ON TABLE public.subscriptions FROM anon;

-- usage_tracking: 비로그인(anon)은 접근 불필요 → 전부 회수
REVOKE ALL ON TABLE public.usage_tracking FROM anon;

-- 참고: authenticated 권한은 그대로 유지되며, 실제 접근 제어는 RLS 정책이 담당한다.
-- (subscriptions/usage_tracking 은 "같은 회사 사용자만 조회", subscriptions 쓰기는 admin/service_role)
