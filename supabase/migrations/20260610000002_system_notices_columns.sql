-- 라이브 DB의 system_notices에는 is_pinned / display_location / published_at 컬럼이 없음
-- (20260603 마이그레이션의 전체 정의가 적용되지 않은 상태)
-- 운영자 공지 작성(SystemNotices)과 사용자 측 조회(lib/support.ts)가 이 컬럼들을 사용하므로 추가

ALTER TABLE system_notices
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

ALTER TABLE system_notices
  ADD COLUMN IF NOT EXISTS display_location text DEFAULT 'dashboard'
    CHECK (display_location IN ('dashboard', 'login', 'both', 'popup'));

ALTER TABLE system_notices
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

-- 비로그인(anon) 조회는 기존 "Anyone can read active notices" 정책(역할 제한 없음)으로 이미 허용됨
