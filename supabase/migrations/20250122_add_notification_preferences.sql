/*
  # 알림 설정 테이블 추가
  
  1. New Tables
    - `user_notification_preferences`: 사용자별 알림 설정
      - 문서 활동 알림 (등록/삭제/공유)
      - 카테고리 변경 알림
      - 만료 알림
      - 알림 범위 설정 (내 부서만)
    
    - `user_notification_muted_categories`: 뮤트된 카테고리 목록
      - 특정 대분류 카테고리의 알림을 끌 수 있음
  
  2. Security
    - RLS 활성화
    - 자신의 설정만 조회/수정 가능
*/

-- user_notification_preferences 테이블 생성
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_created boolean DEFAULT true,
  document_deleted boolean DEFAULT true,
  document_shared boolean DEFAULT true,
  category_changes boolean DEFAULT true,
  expiry_alerts boolean DEFAULT true,
  notify_my_department_only boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- user_notification_muted_categories 테이블 생성
CREATE TABLE IF NOT EXISTS user_notification_muted_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  muted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, parent_category_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
  ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_company_id 
  ON user_notification_preferences(company_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_muted_categories_user_id 
  ON user_notification_muted_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_muted_categories_parent_category_id 
  ON user_notification_muted_categories(parent_category_id);

-- RLS 활성화
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_muted_categories ENABLE ROW LEVEL SECURITY;

-- user_notification_preferences RLS 정책
CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_notification_muted_categories RLS 정책
CREATE POLICY "Users can view own muted categories"
  ON user_notification_muted_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own muted categories"
  ON user_notification_muted_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own muted categories"
  ON user_notification_muted_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 테이블 코멘트
COMMENT ON TABLE user_notification_preferences IS '사용자별 알림 설정';
COMMENT ON COLUMN user_notification_preferences.document_created IS '문서 등록 알림 활성화 여부';
COMMENT ON COLUMN user_notification_preferences.document_deleted IS '문서 삭제 알림 활성화 여부';
COMMENT ON COLUMN user_notification_preferences.document_shared IS '문서 공유 알림 활성화 여부';
COMMENT ON COLUMN user_notification_preferences.category_changes IS '카테고리 생성/삭제 알림 활성화 여부';
COMMENT ON COLUMN user_notification_preferences.expiry_alerts IS '만료 알림 활성화 여부';
COMMENT ON COLUMN user_notification_preferences.notify_my_department_only IS '내 부서 알림만 받기 (관리자용)';

COMMENT ON TABLE user_notification_muted_categories IS '사용자가 뮤트한 대분류 카테고리 목록';
COMMENT ON COLUMN user_notification_muted_categories.parent_category_id IS '뮤트된 대분류 카테고리 ID';
COMMENT ON COLUMN user_notification_muted_categories.muted_at IS '뮤트 설정 시각';
