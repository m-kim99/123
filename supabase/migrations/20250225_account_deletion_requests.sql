-- 회원 탈퇴 요청 테이블 생성
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, status)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_scheduled ON account_deletion_requests(scheduled_deletion_at) WHERE status = 'pending';

-- RLS 정책 설정
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 탈퇴 요청만 조회 가능
CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 탈퇴 요청만 생성 가능
CREATE POLICY "Users can create own deletion requests"
  ON account_deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 pending 상태 탈퇴 요청만 취소(업데이트) 가능
CREATE POLICY "Users can cancel own pending deletion requests"
  ON account_deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_account_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_account_deletion_requests_updated_at ON account_deletion_requests;
CREATE TRIGGER trigger_update_account_deletion_requests_updated_at
  BEFORE UPDATE ON account_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_account_deletion_requests_updated_at();

COMMENT ON TABLE account_deletion_requests IS '회원 탈퇴 요청 테이블 - 2주 유예 기간 포함';
COMMENT ON COLUMN account_deletion_requests.scheduled_deletion_at IS '실제 삭제 예정 일시 (요청 후 14일)';
COMMENT ON COLUMN account_deletion_requests.status IS 'pending: 대기중, cancelled: 취소됨, completed: 완료됨';
