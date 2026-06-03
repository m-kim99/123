-- =============================================
-- 운영자(Operator) 시스템 마이그레이션
-- 플랫폼 전체 관리를 위한 운영자 기능
-- =============================================

-- 1. 운영자 테이블
-- 플랫폼 운영자 정보 (회사 관리자와 별개)
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  permissions jsonb DEFAULT '{
    "members": true,
    "suspensions": true,
    "reports": true,
    "notices": true,
    "inquiries": true,
    "companies": false,
    "operators": false
  }'::jsonb,
  is_super boolean DEFAULT false,  -- 슈퍼 운영자 (다른 운영자 관리 가능)
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. 회원 정지 테이블
CREATE TABLE IF NOT EXISTS user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  internal_note text,  -- 내부 메모 (운영자만 볼 수 있음)
  suspended_by uuid NOT NULL REFERENCES operators(id),
  suspended_at timestamptz DEFAULT now(),
  expires_at timestamptz,  -- NULL이면 영구 정지
  lifted_at timestamptz,
  lifted_by uuid REFERENCES operators(id),
  lift_reason text,

  CONSTRAINT valid_suspension_period CHECK (expires_at IS NULL OR expires_at > suspended_at)
);

-- 3. 신고/부적절 콘텐츠 테이블
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email text,  -- 익명 신고 또는 탈퇴한 사용자용
  target_type text NOT NULL CHECK (target_type IN ('document', 'user', 'announcement', 'comment')),
  target_id uuid NOT NULL,
  target_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN (
    'spam', 'inappropriate', 'copyright', 'privacy', 'illegal', 'other'
  )),
  reason text NOT NULL,
  evidence_urls text[],  -- 증거 스크린샷 등
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reviewed_by uuid REFERENCES operators(id),
  reviewed_at timestamptz,
  action_taken text,
  action_details jsonb,  -- 조치 상세 (삭제, 경고, 정지 등)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. 시스템 공지 테이블 (전체 사용자 대상)
CREATE TABLE IF NOT EXISTS system_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'maintenance', 'update')),
  is_active boolean DEFAULT true,
  is_pinned boolean DEFAULT false,  -- 상단 고정
  target_audience text DEFAULT 'all' CHECK (target_audience IN ('all', 'admin', 'team')),
  display_location text DEFAULT 'dashboard' CHECK (display_location IN ('dashboard', 'login', 'both', 'popup')),
  created_by uuid NOT NULL REFERENCES operators(id),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_notice_period CHECK (expires_at IS NULL OR expires_at > published_at),
  CONSTRAINT notice_title_length CHECK (char_length(title) > 0),
  CONSTRAINT notice_content_length CHECK (char_length(content) > 0)
);

-- 5. 문의 테이블
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN (
    'general', 'bug', 'feature', 'billing', 'account', 'technical', 'partnership'
  )),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES operators(id),
  attachments text[],  -- 첨부파일 URLs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,

  CONSTRAINT inquiry_subject_length CHECK (char_length(subject) > 0),
  CONSTRAINT inquiry_content_length CHECK (char_length(content) > 0)
);

-- 6. 문의 답변 테이블
CREATE TABLE IF NOT EXISTS inquiry_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL REFERENCES operators(id),
  content text NOT NULL,
  is_internal boolean DEFAULT false,  -- true면 내부 메모 (사용자에게 안 보임)
  attachments text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT reply_content_length CHECK (char_length(content) > 0)
);

-- 7. 운영자 활동 로그
CREATE TABLE IF NOT EXISTS operator_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),
  action text NOT NULL,  -- 'suspend_user', 'lift_suspension', 'resolve_report', 'reply_inquiry', etc.
  target_type text,
  target_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 인덱스 생성
-- =============================================

-- operators
CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);
CREATE INDEX IF NOT EXISTS idx_operators_is_active ON operators(is_active) WHERE is_active = true;

-- user_suspensions
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(user_id, expires_at)
  WHERE lifted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_suspensions_suspended_by ON user_suspensions(suspended_by);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_priority_status ON reports(priority, status) WHERE status = 'pending';

-- system_notices
CREATE INDEX IF NOT EXISTS idx_system_notices_active ON system_notices(is_active, published_at DESC)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_notices_target ON system_notices(target_audience, is_active);

-- inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_priority_status ON inquiries(priority DESC, status)
  WHERE status IN ('open', 'in_progress');

-- inquiry_replies
CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id ON inquiry_replies(inquiry_id);

-- operator_activity_logs
CREATE INDEX IF NOT EXISTS idx_operator_logs_operator_id ON operator_activity_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_created_at ON operator_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_logs_action ON operator_activity_logs(action);

-- =============================================
-- RLS 활성화
-- =============================================

ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_activity_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS 정책
-- =============================================

-- Helper function: 현재 사용자가 운영자인지 확인
CREATE OR REPLACE FUNCTION is_operator()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: 현재 사용자가 슈퍼 운영자인지 확인
CREATE OR REPLACE FUNCTION is_super_operator()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operators
    WHERE id = auth.uid() AND is_active = true AND is_super = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- operators 테이블 정책
CREATE POLICY "Operators can view all operators"
  ON operators FOR SELECT
  TO authenticated
  USING (is_operator());

CREATE POLICY "Super operators can manage operators"
  ON operators FOR ALL
  TO authenticated
  USING (is_super_operator())
  WITH CHECK (is_super_operator());

-- user_suspensions 테이블 정책
CREATE POLICY "Operators can view all suspensions"
  ON user_suspensions FOR SELECT
  TO authenticated
  USING (is_operator());

CREATE POLICY "Operators can create suspensions"
  ON user_suspensions FOR INSERT
  TO authenticated
  WITH CHECK (is_operator() AND suspended_by = auth.uid());

CREATE POLICY "Operators can update suspensions"
  ON user_suspensions FOR UPDATE
  TO authenticated
  USING (is_operator());

-- reports 테이블 정책
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

CREATE POLICY "Operators can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (is_operator() OR reporter_id = auth.uid());

CREATE POLICY "Operators can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (is_operator());

-- system_notices 테이블 정책
CREATE POLICY "Anyone can read active notices"
  ON system_notices FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND published_at <= now()
  );

CREATE POLICY "Operators can manage all notices"
  ON system_notices FOR ALL
  TO authenticated
  USING (is_operator())
  WITH CHECK (is_operator());

-- inquiries 테이블 정책
CREATE POLICY "Users can create inquiries"
  ON inquiries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view their own inquiries"
  ON inquiries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_operator());

CREATE POLICY "Operators can update inquiries"
  ON inquiries FOR UPDATE
  TO authenticated
  USING (is_operator());

-- inquiry_replies 테이블 정책
CREATE POLICY "Users can view replies to their inquiries"
  ON inquiry_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_replies.inquiry_id
      AND (inquiries.user_id = auth.uid() OR is_operator())
    )
    AND (NOT is_internal OR is_operator())  -- 내부 메모는 운영자만
  );

CREATE POLICY "Operators can create replies"
  ON inquiry_replies FOR INSERT
  TO authenticated
  WITH CHECK (is_operator() AND operator_id = auth.uid());

CREATE POLICY "Operators can update their replies"
  ON inquiry_replies FOR UPDATE
  TO authenticated
  USING (is_operator() AND operator_id = auth.uid());

-- operator_activity_logs 테이블 정책
CREATE POLICY "Operators can view logs"
  ON operator_activity_logs FOR SELECT
  TO authenticated
  USING (is_operator());

CREATE POLICY "System can insert logs"
  ON operator_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_operator());

-- =============================================
-- Trigger: updated_at 자동 업데이트
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_notices_updated_at
  BEFORE UPDATE ON system_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiry_replies_updated_at
  BEFORE UPDATE ON inquiry_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Helper function: 사용자 정지 상태 확인
-- (로그인 시 호출하여 정지 여부 체크)
-- =============================================

CREATE OR REPLACE FUNCTION check_user_suspension(check_user_id uuid)
RETURNS TABLE (
  is_suspended boolean,
  suspension_id uuid,
  reason text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true as is_suspended,
    us.id as suspension_id,
    us.reason,
    us.expires_at
  FROM user_suspensions us
  WHERE us.user_id = check_user_id
    AND us.lifted_at IS NULL
    AND (us.expires_at IS NULL OR us.expires_at > now())
  ORDER BY us.suspended_at DESC
  LIMIT 1;

  -- 정지 상태가 아니면 빈 결과 반환
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 운영자 통계 뷰 (대시보드용)
-- =============================================

CREATE OR REPLACE VIEW operator_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM companies) as total_companies,
  (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
  (SELECT COUNT(*) FROM inquiries WHERE status IN ('open', 'in_progress')) as open_inquiries,
  (SELECT COUNT(*) FROM user_suspensions WHERE lifted_at IS NULL AND (expires_at IS NULL OR expires_at > now())) as active_suspensions,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days') as new_users_7d,
  (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '30 days') as new_users_30d;

-- =============================================
-- 코멘트 (문서화)
-- =============================================

COMMENT ON TABLE operators IS '플랫폼 운영자 테이블 - 전체 시스템 관리자';
COMMENT ON TABLE user_suspensions IS '회원 정지 이력 테이블';
COMMENT ON TABLE reports IS '사용자 신고/부적절 콘텐츠 신고 테이블';
COMMENT ON TABLE system_notices IS '시스템 전체 공지사항 테이블';
COMMENT ON TABLE inquiries IS '고객 문의 테이블';
COMMENT ON TABLE inquiry_replies IS '문의 답변 테이블';
COMMENT ON TABLE operator_activity_logs IS '운영자 활동 로그 테이블';

COMMENT ON FUNCTION is_operator() IS '현재 인증된 사용자가 활성 운영자인지 확인';
COMMENT ON FUNCTION is_super_operator() IS '현재 인증된 사용자가 슈퍼 운영자인지 확인';
COMMENT ON FUNCTION check_user_suspension(uuid) IS '특정 사용자의 현재 정지 상태 확인';
