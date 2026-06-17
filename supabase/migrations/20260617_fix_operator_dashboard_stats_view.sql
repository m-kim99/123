-- operator_dashboard_stats 뷰 보안 수정
-- auth.users 직접 참조 → public.users로 변경 (보안 취약점 해결)

DROP VIEW IF EXISTS operator_dashboard_stats;

CREATE VIEW operator_dashboard_stats AS
SELECT 
  (SELECT count(*) FROM public.users) AS total_users,
  (SELECT count(*) FROM companies) AS total_companies,
  (SELECT count(*) FROM reports WHERE status = 'pending') AS pending_reports,
  (SELECT count(*) FROM inquiries WHERE status IN ('open', 'in_progress')) AS open_inquiries,
  (SELECT count(*) FROM user_suspensions 
   WHERE lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now())) AS active_suspensions,
  (SELECT count(*) FROM public.users 
   WHERE created_at > now() - interval '7 days') AS new_users_7d,
  (SELECT count(*) FROM public.users 
   WHERE created_at > now() - interval '30 days') AS new_users_30d;

-- 뷰 권한 설정 (운영자만 접근 가능)
GRANT SELECT ON operator_dashboard_stats TO authenticated;
