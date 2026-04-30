/*
  # RLS 정책 업데이트: user_permissions 테이블 연동

  이 마이그레이션은 기존 RLS 정책을 user_permissions 테이블과 연동하여
  부서별 세밀한 권한 제어(none, viewer, editor, manager)를 가능하게 합니다.

  변경 사항:
  1. documents 테이블 정책 업데이트
  2. categories 테이블 정책 업데이트
  3. subcategories 테이블 정책 업데이트
*/

-- ============================================
-- 1. DOCUMENTS 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Team members can view their department documents" ON documents;
DROP POLICY IF EXISTS "Only admins can insert documents" ON documents;
DROP POLICY IF EXISTS "Team members can insert documents in their department" ON documents;
DROP POLICY IF EXISTS "Only admins can update documents" ON documents;
DROP POLICY IF EXISTS "Team members can update their own documents" ON documents;
DROP POLICY IF EXISTS "Only admins can delete documents" ON documents;
DROP POLICY IF EXISTS "Team members can delete their own documents" ON documents;

-- 새로운 정책: 문서 조회 (viewer 이상)
CREATE POLICY "Users can view documents they have access to"
  ON documents FOR SELECT
  TO authenticated
  USING (
    -- 관리자는 모든 문서 조회 가능
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    -- 소속 부서 문서 조회 가능 (자동 manager 권한)
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    -- user_permissions에 viewer 이상 권한이 있는 부서 문서
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role IN ('viewer', 'editor', 'manager')
    )
  );

-- 새로운 정책: 문서 업로드 (editor 이상)
CREATE POLICY "Users can insert documents with editor permission"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    -- 관리자는 모든 부서에 업로드 가능
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    -- 소속 부서에 업로드 가능 (자동 manager 권한)
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    -- user_permissions에 editor 이상 권한이 있는 부서
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
    )
  );

-- 새로운 정책: 문서 수정 (editor 이상 또는 본인이 업로드한 문서)
CREATE POLICY "Users can update documents with editor permission"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    -- 관리자는 모든 문서 수정 가능
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    -- 소속 부서 문서 수정 가능
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    -- user_permissions에 editor 이상 권한
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
    )
    OR
    -- 본인이 업로드한 문서는 항상 수정 가능
    uploaded_by = auth.uid()
  )
  WITH CHECK (
    -- UPDATE 후에도 동일한 조건 적용
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
    )
    OR
    uploaded_by = auth.uid()
  );

-- 새로운 정책: 문서 삭제 (manager만)
CREATE POLICY "Users can delete documents with manager permission"
  ON documents FOR DELETE
  TO authenticated
  USING (
    -- 관리자는 모든 문서 삭제 가능
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    -- 소속 부서 문서 삭제 가능 (자동 manager)
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    -- user_permissions에 manager 권한
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role = 'manager'
    )
  );

-- ============================================
-- 2. CATEGORIES 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all categories" ON categories;
DROP POLICY IF EXISTS "Team members can view their department categories" ON categories;
DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON categories;

-- 새로운 정책: 카테고리 조회 (viewer 이상)
CREATE POLICY "Users can view categories they have access to"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = categories.department_id
        AND role IN ('viewer', 'editor', 'manager')
    )
  );

-- 새로운 정책: 카테고리 생성 (manager만)
CREATE POLICY "Users can insert categories with manager permission"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = categories.department_id
        AND role = 'manager'
    )
  );

-- 새로운 정책: 카테고리 수정 (manager만)
CREATE POLICY "Users can update categories with manager permission"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = categories.department_id
        AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = categories.department_id
        AND role = 'manager'
    )
  );

-- 새로운 정책: 카테고리 삭제 (manager만)
CREATE POLICY "Users can delete categories with manager permission"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = categories.department_id
        AND role = 'manager'
    )
  );

-- ============================================
-- 3. SUBCATEGORIES 테이블 RLS 정책 업데이트
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all subcategories" ON subcategories;
DROP POLICY IF EXISTS "Team members can view their department subcategories" ON subcategories;
DROP POLICY IF EXISTS "Only admins can insert subcategories" ON subcategories;
DROP POLICY IF EXISTS "Only admins can update subcategories" ON subcategories;
DROP POLICY IF EXISTS "Only admins can delete subcategories" ON subcategories;

-- 새로운 정책: 세부 스토리지 조회 (viewer 이상)
CREATE POLICY "Users can view subcategories they have access to"
  ON subcategories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = subcategories.department_id
        AND role IN ('viewer', 'editor', 'manager')
    )
  );

-- 새로운 정책: 세부 스토리지 생성 (manager만)
CREATE POLICY "Users can insert subcategories with manager permission"
  ON subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = subcategories.department_id
        AND role = 'manager'
    )
  );

-- 새로운 정책: 세부 스토리지 수정 (manager만)
CREATE POLICY "Users can update subcategories with manager permission"
  ON subcategories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = subcategories.department_id
        AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = subcategories.department_id
        AND role = 'manager'
    )
  );

-- 새로운 정책: 세부 스토리지 삭제 (manager만)
CREATE POLICY "Users can delete subcategories with manager permission"
  ON subcategories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = subcategories.department_id
        AND role = 'manager'
    )
  );

-- ============================================
-- 완료 메시지
-- ============================================
-- 이 마이그레이션을 적용하면 user_permissions 테이블의 권한 설정이
-- 실제로 DB 레벨에서 적용됩니다.
