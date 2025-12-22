-- RLS Policy로 만료된 세부 카테고리의 문서 접근 차단

-- 1. 기존 documents SELECT 정책 삭제
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Team members can view their department documents" ON documents;

-- 2. 만료 체크 포함한 새 정책 생성

-- 관리자: 모든 문서 조회 가능 (만료 체크 포함)
CREATE POLICY "Admins can view all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    AND (
      -- 세부 카테고리가 만료되지 않았거나, 만료일이 설정되지 않은 경우
      NOT EXISTS (
        SELECT 1 FROM subcategories
        WHERE subcategories.id = documents.subcategory_id
        AND subcategories.expiry_date IS NOT NULL
        AND subcategories.expiry_date < NOW()
      )
    )
  );

-- 팀원: 자기 부서 문서만 조회 가능 (만료 체크 포함)
CREATE POLICY "Team members can view their department documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    department_id = (
      SELECT department_id FROM users
      WHERE users.id = auth.uid()
    )
    AND (
      -- 세부 카테고리가 만료되지 않았거나, 만료일이 설정되지 않은 경우
      NOT EXISTS (
        SELECT 1 FROM subcategories
        WHERE subcategories.id = documents.subcategory_id
        AND subcategories.expiry_date IS NOT NULL
        AND subcategories.expiry_date < NOW()
      )
    )
  );
