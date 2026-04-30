-- 세부 카테고리에 절대 만료일 추가

-- 1. subcategories 테이블에 절대 만료일 추가
ALTER TABLE subcategories
ADD COLUMN IF NOT EXISTS expiry_date timestamptz;

COMMENT ON COLUMN subcategories.expiry_date IS '세부 카테고리 만료일 (이 날짜가 되면 모든 내부 문서 만료)';

-- 2. 만료일 조회를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subcategories_expiry_date
  ON subcategories(expiry_date DESC)
  WHERE expiry_date IS NOT NULL;

-- 3. default_expiry_days는 유지 (UI에서 빠른 선택용)
-- expiry_date = 실제 만료 날짜
-- default_expiry_days = UI에서 "3개월/1년/3년" 버튼용 보조 필드
