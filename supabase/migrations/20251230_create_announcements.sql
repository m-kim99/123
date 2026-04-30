-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  allow_comments boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT announcements_title_length CHECK (char_length(title) > 0),
  CONSTRAINT announcements_content_length CHECK (char_length(content) > 0)
);

-- 공지사항 댓글 테이블
CREATE TABLE IF NOT EXISTS announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT comments_content_length CHECK (char_length(content) > 0)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_announcements_company_id ON announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id ON announcement_comments(user_id);

-- RLS 활성화
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 공지사항 조회 (같은 회사 사용자만)
CREATE POLICY "Users can view announcements from their company"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS 정책: 공지사항 작성 (관리자만)
CREATE POLICY "Admins can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND company_id = announcements.company_id
    )
    AND created_by = auth.uid()
  );

-- RLS 정책: 공지사항 수정 (관리자만, 같은 회사)
CREATE POLICY "Admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND company_id = announcements.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND company_id = announcements.company_id
    )
  );

-- RLS 정책: 공지사항 삭제 (관리자만, 같은 회사)
CREATE POLICY "Admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND company_id = announcements.company_id
    )
  );

-- RLS 정책: 댓글 조회 (같은 회사 사용자만)
CREATE POLICY "Users can view comments from their company announcements"
  ON announcement_comments FOR SELECT
  TO authenticated
  USING (
    announcement_id IN (
      SELECT id FROM announcements 
      WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS 정책: 댓글 작성 (댓글 허용된 공지사항 + 같은 회사 + 본인)
CREATE POLICY "Users can create comments on allowed announcements"
  ON announcement_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = announcement_id
      AND a.allow_comments = true
      AND a.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    AND user_id = auth.uid()
  );

-- RLS 정책: 댓글 수정 (본인 댓글만)
CREATE POLICY "Users can update their own comments"
  ON announcement_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS 정책: 댓글 삭제 (본인 댓글 또는 관리자(같은 회사))
CREATE POLICY "Users can delete their own comments or admins can delete any"
  ON announcement_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM users u
      JOIN announcements a ON a.id = announcement_comments.announcement_id
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      AND u.company_id = a.company_id
    )
  );
