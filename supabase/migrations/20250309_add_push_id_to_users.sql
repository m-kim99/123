-- users 테이블에 푸시 ID 컬럼 추가 (앱케이크 OneSignal 연동)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS push_id varchar(64);

COMMENT ON COLUMN users.push_id IS 'OneSignal 푸시 알림용 Player ID (앱 재설치 시 갱신됨)';

-- 인덱스 추가 (푸시 발송 시 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_users_push_id
  ON users(push_id)
  WHERE push_id IS NOT NULL;
