-- ============================================
-- DB 구조 확인 쿼리
-- ============================================
-- 이 쿼리들을 Supabase SQL Editor에서 실행하면
-- 현재 DB 구조를 확인할 수 있습니다.

-- 1. 모든 테이블 목록 및 행 수
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_schema = schemaname AND table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. user_permissions 테이블 구조 및 데이터
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_permissions'
ORDER BY ordinal_position;

-- 3. user_permissions 샘플 데이터 (10개)
SELECT 
  up.id,
  u.name as user_name,
  u.email,
  d.name as department_name,
  up.role,
  up.created_at
FROM user_permissions up
LEFT JOIN users u ON u.id = up.user_id
LEFT JOIN departments d ON d.id = up.department_id
ORDER BY up.created_at DESC
LIMIT 10;

-- 4. 부서별 권한 통계
SELECT 
  d.name as department_name,
  up.role,
  COUNT(*) as user_count
FROM user_permissions up
JOIN departments d ON d.id = up.department_id
GROUP BY d.name, up.role
ORDER BY d.name, up.role;

-- 5. 사용자별 권한 요약
SELECT 
  u.name,
  u.email,
  u.role as system_role,
  d_own.name as own_department,
  COUNT(up.id) as additional_permissions,
  STRING_AGG(
    d_perm.name || ' (' || up.role || ')', 
    ', ' 
    ORDER BY d_perm.name
  ) as permissions
FROM users u
LEFT JOIN departments d_own ON d_own.id = u.department_id
LEFT JOIN user_permissions up ON up.user_id = u.id AND up.role != 'none'
LEFT JOIN departments d_perm ON d_perm.id = up.department_id
GROUP BY u.id, u.name, u.email, u.role, d_own.name
ORDER BY u.name;

-- 6. 전체 테이블 간 관계도 (Foreign Keys)
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY from_table, from_column;

-- 7. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. 인덱스 확인
SELECT
  t.tablename,
  i.indexname,
  a.attname as column_name,
  ix.indisunique as is_unique,
  ix.indisprimary as is_primary
FROM pg_indexes i
JOIN pg_class c ON c.relname = i.indexname
JOIN pg_index ix ON ix.indexrelid = c.oid
JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
JOIN pg_tables t ON t.tablename = i.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename, i.indexname, a.attnum;

-- 9. 권한 관련 핵심 테이블 구조 한눈에 보기
SELECT 
  'companies' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'companies'
UNION ALL
SELECT 
  'departments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'departments'
UNION ALL
SELECT 
  'users' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
UNION ALL
SELECT 
  'user_permissions' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_permissions'
ORDER BY table_name, column_name;

-- 10. 특정 사용자의 접근 가능한 부서 및 권한 확인 (예시 - user_id를 실제 값으로 교체)
-- SELECT 
--   u.name as user_name,
--   u.email,
--   d.name as department_name,
--   CASE 
--     WHEN d.id = u.department_id THEN 'manager (소속 부서)'
--     ELSE COALESCE(up.role, 'none')
--   END as permission_level
-- FROM users u
-- CROSS JOIN departments d
-- LEFT JOIN user_permissions up ON up.user_id = u.id AND up.department_id = d.id
-- WHERE u.id = 'YOUR_USER_ID_HERE'  -- 실제 user_id로 교체
-- ORDER BY department_name;
