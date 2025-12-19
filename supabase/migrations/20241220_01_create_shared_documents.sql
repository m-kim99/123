/*
  # 공유 문서 테이블 생성 (개인 공유 방식)
  
  1. shared_documents 테이블 생성
    - 문서를 개인 간 공유하는 기능
    - 공유한 사람, 받는 사람, 권한 등 추적
  
  2. 인덱스 추가
    - 빠른 조회를 위한 인덱스
  
  3. RLS 정책 설정
    - 공유받은 사람만 조회 가능
*/

-- 1) shared_documents 테이블 생성
CREATE TABLE IF NOT EXISTS shared_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'download')),
  message text,
  shared_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2) 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_shared_documents_document_id 
  ON shared_documents(document_id);

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_by 
  ON shared_documents(shared_by_user_id);

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_to 
  ON shared_documents(shared_to_user_id);

CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_at 
  ON shared_documents(shared_at DESC);

-- 3) RLS 활성화
ALTER TABLE shared_documents ENABLE ROW LEVEL SECURITY;

-- 4) RLS 정책: 공유받은 사람은 자신이 받은 문서를 볼 수 있음
CREATE POLICY "Users can view documents shared to them"
  ON shared_documents FOR SELECT
  TO authenticated
  USING (
    shared_to_user_id = auth.uid()
    AND is_active = true
  );

-- 5) RLS 정책: 문서 소유자 또는 관리자는 공유 내역을 볼 수 있음
CREATE POLICY "Document owners can view their shares"
  ON shared_documents FOR SELECT
  TO authenticated
  USING (
    shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- 6) RLS 정책: 인증된 사용자는 자신의 문서를 공유할 수 있음
CREATE POLICY "Users can share their documents"
  ON shared_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM documents d
      JOIN departments dept ON d.department_id = dept.id
      JOIN users u ON u.department_id = dept.id
      WHERE d.id = document_id
      AND u.id = auth.uid()
    )
  );

-- 7) RLS 정책: 공유한 사람은 공유를 취소(비활성화)할 수 있음
CREATE POLICY "Users can deactivate their shares"
  ON shared_documents FOR UPDATE
  TO authenticated
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

-- 8) RLS 정책: 공유한 사람 또는 관리자는 공유를 삭제할 수 있음
CREATE POLICY "Users can delete their shares"
  ON shared_documents FOR DELETE
  TO authenticated
  USING (
    shared_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
