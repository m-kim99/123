-- ============================================
-- DEPARTMENTS 테이블 RLS 정책 추가
-- ============================================
-- departments 테이블에 접근할 수 없으면 다른 정책들도 작동하지 않습니다.

-- 기존 정책 확인 및 삭제
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON departments;
DROP POLICY IF EXISTS "Only admins can insert departments" ON departments;
DROP POLICY IF EXISTS "Only admins can update departments" ON departments;
DROP POLICY IF EXISTS "Only admins can delete departments" ON departments;

-- 부서 조회 - 인증된 모든 사용자
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    -- 자신의 회사 부서만 조회
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- 부서 생성 - 관리자만
CREATE POLICY "Only admins can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 부서 수정 - 관리자만
CREATE POLICY "Only admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 부서 삭제 - 관리자만
CREATE POLICY "Only admins can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
