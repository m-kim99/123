-- 문서 휴지통 기능을 위한 deleted_at 컬럼 추가
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- deleted_at 인덱스 (삭제되지 않은 문서 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;

-- deleted_at이 NOT NULL인 문서 조회 최적화 (휴지통 조회)
CREATE INDEX IF NOT EXISTS idx_documents_trashed ON documents(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN documents.deleted_at IS '소프트 삭제 일시. NULL이면 활성 문서, 값이 있으면 휴지통에 있는 문서';
