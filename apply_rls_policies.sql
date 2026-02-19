-- ============================================
-- 권한 기반 RLS 정책 적용 쿼리
-- ============================================
-- 이 쿼리를 Supabase SQL Editor에서 순서대로 실행하세요.

-- ============================================
-- STEP 1: 기존 개방형 정책 삭제
-- ============================================

DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
DROP POLICY IF EXISTS "Anyone can insert documents" ON documents;
DROP POLICY IF EXISTS "Anyone can update documents" ON documents;
DROP POLICY IF EXISTS "Anyone can delete documents" ON documents;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Allow all inserts on subcategories (dev)" ON subcategories;

-- ============================================
-- STEP 2: DOCUMENTS 테이블 RLS 정책
-- ============================================

-- 문서 조회 (viewer 이상)
CREATE POLICY "Users can view documents they have access to"
  ON documents FOR SELECT
  TO authenticated
  USING (
    -- 관리자는 모든 문서
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    -- 소속 부서 문서
    department_id = (SELECT department_id FROM users WHERE id = auth.uid())
    OR
    -- user_permissions에 viewer 이상 권한
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
        AND department_id = documents.department_id
        AND role IN ('viewer', 'editor', 'manager')
    )
  );

-- 문서 업로드 (editor 이상)
CREATE POLICY "Users can insert documents with editor permission"
  ON documents FOR INSERT
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
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
    )
  );

-- 문서 수정 (editor 이상)
CREATE POLICY "Users can update documents with editor permission"
  ON documents FOR UPDATE
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
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
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
        AND department_id = documents.department_id
        AND role IN ('editor', 'manager')
    )
  );

-- 문서 삭제 (manager만)
CREATE POLICY "Users can delete documents with manager permission"
  ON documents FOR DELETE
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
        AND department_id = documents.department_id
        AND role = 'manager'
    )
  );

-- ============================================
-- STEP 3: CATEGORIES 테이블 RLS 정책
-- ============================================

-- 카테고리 조회 (viewer 이상)
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

-- 카테고리 생성 (manager만)
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

-- 카테고리 수정 (manager만)
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

-- 카테고리 삭제 (manager만)
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
-- STEP 4: SUBCATEGORIES 테이블 RLS 정책
-- ============================================

-- 세부 스토리지 조회 (viewer 이상)
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

-- 세부 스토리지 생성 (manager만)
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

-- 세부 스토리지 수정 (manager만)
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

-- 세부 스토리지 삭제 (manager만)
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
-- 완료!
-- ============================================
-- 이제 user_permissions 테이블의 권한 설정이 실제로 작동합니다.
