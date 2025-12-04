/*
  # 즐겨찾기 및 방문 기록 테이블 생성
  
  1. user_favorites: 사용자별 즐겨찾기한 세부 카테고리
  2. user_recent_visits: 사용자별 최근 방문한 세부 카테고리
*/

-- =============================================
-- user_favorites 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, subcategory_id)
);

COMMENT ON TABLE user_favorites IS '사용자별 즐겨찾기한 세부 카테고리';

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_subcategory_id ON user_favorites(subcategory_id);
CREATE INDEX idx_user_favorites_company_id ON user_favorites(company_id);

-- =============================================
-- user_recent_visits 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS user_recent_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
  parent_category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  department_id text REFERENCES departments(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  visited_at timestamp with time zone DEFAULT now(),
  visit_count integer DEFAULT 1
);

COMMENT ON TABLE user_recent_visits IS '사용자별 세부 카테고리 방문 기록';

CREATE INDEX idx_user_recent_visits_user_id ON user_recent_visits(user_id);
CREATE INDEX idx_user_recent_visits_subcategory_id ON user_recent_visits(subcategory_id);
CREATE INDEX idx_user_recent_visits_visited_at ON user_recent_visits(visited_at DESC);
CREATE INDEX idx_user_recent_visits_company_id ON user_recent_visits(company_id);

-- =============================================
-- RLS 정책
-- =============================================
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent_visits ENABLE ROW LEVEL SECURITY;

-- user_favorites: 본인 데이터만 조회/수정
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_recent_visits: 본인 데이터만 조회/수정
CREATE POLICY "Users can view their own recent visits"
  ON user_recent_visits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recent visits"
  ON user_recent_visits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recent visits"
  ON user_recent_visits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
