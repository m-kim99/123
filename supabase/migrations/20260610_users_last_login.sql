-- 운영자 회원 관리에서 마지막 로그인 표시용
-- (auth.users.last_sign_in_at은 클라이언트에서 조회 불가하므로 users 테이블에 직접 기록)

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
