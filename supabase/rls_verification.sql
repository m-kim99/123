-- ============================================================
-- RLS 운영 상태 검증 스크립트 (진단 전용, Supabase SQL Editor에서 실행)
-- ============================================================
-- 목적: 운영 DB에 RLS가 실제 적용됐는지, 개방형 정책이 남아있는지 확인한다.
-- 이 파일은 마이그레이션이 아니라 "읽기 전용 점검" 용도이다.

-- ------------------------------------------------------------
-- (a) RLS가 비활성인 public 테이블 탐지 → 결과가 나오면 위험
-- ------------------------------------------------------------
SELECT c.relname AS table_without_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
ORDER BY c.relname;

-- ------------------------------------------------------------
-- (b) 개방형 정책(USING true / WITH CHECK true / "Anyone can...") 탐지
--     → documents/categories/subcategories/users 등에서 나오면 제거 대상
-- ------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual = 'true'
    OR with_check = 'true'
    OR policyname ILIKE 'anyone%'
    OR policyname ILIKE '%(dev)%'
  )
ORDER BY tablename, policyname;

-- ------------------------------------------------------------
-- (c) 민감 테이블에 anon 롤이 가진 권한 확인
--     → SELECT 외(INSERT/UPDATE/DELETE)가 나오면 과도 → 회수 대상
-- ------------------------------------------------------------
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
  AND table_name IN (
    'documents', 'categories', 'subcategories', 'users',
    'subscriptions', 'usage_tracking', 'payments', 'user_permissions'
  )
ORDER BY table_name, privilege_type;

-- ------------------------------------------------------------
-- (d) users 테이블 정책 목록 (전체 공개 USING(true) 잔존 여부 확인)
-- ------------------------------------------------------------
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- ------------------------------------------------------------
-- 조치 가이드
--   (a) 결과 테이블 → ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;
--   (b) 개방형 정책 → DROP POLICY "<name>" ON public.<t>; (apply_rls_policies.sql 재적용)
--   (c) anon 과도 권한 → 20260701000000_tighten_grants.sql 참고
--   (d) users 정책 → auth.uid() 기반 정책만 남기고 USING(true) 제거
-- ============================================================
