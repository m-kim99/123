-- 세부 카테고리에 기본 만료일 설정 컬럼 추가
ALTER TABLE subcategories
ADD COLUMN IF NOT EXISTS default_expiry_days integer;

COMMENT ON COLUMN subcategories.default_expiry_days IS '기본 만료일 (일수). null이면 만료 없음';

-- 인덱스 추가 (만료일 있는 카테고리만 필터링할 때 유용)
CREATE INDEX IF NOT EXISTS idx_subcategories_default_expiry_days
  ON subcategories(default_expiry_days)
  WHERE default_expiry_days IS NOT NULL;
