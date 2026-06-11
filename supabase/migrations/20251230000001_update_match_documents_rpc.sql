-- 기존 match_documents 함수 삭제 (시그니처가 다를 수 있어 여러 타입을 함께 정리)
DROP FUNCTION IF EXISTS match_documents(vector(768), double precision, integer);
DROP FUNCTION IF EXISTS match_documents(vector(768), real, integer);
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_documents(vector, real, integer);

-- company_id 필터링이 추가된 새 버전 생성
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  department_name text,
  category_name text,
  storage_location text,
  uploaded_at timestamptz,
  ocr_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    dept.name AS department_name,
    cat.name AS category_name,
    sub.storage_location,
    d.uploaded_at,
    d.ocr_text,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  LEFT JOIN departments dept ON d.department_id = dept.id
  LEFT JOIN categories cat ON d.parent_category_id = cat.id
  LEFT JOIN subcategories sub ON d.subcategory_id = sub.id
  WHERE
    d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter_company_id IS NULL OR dept.company_id = filter_company_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
