-- documents.department_id / documents.parent_category_id 외래키 추가
--
-- 배경:
--  - documents 테이블은 subcategory_id 에만 FK(documents_subcategory_id_fkey)가 걸려있고
--    department_id, parent_category_id 에는 FK가 없었다.
--  - ai-chat Edge Function(supabase/functions/ai-chat/index.ts)의 문서 검색 로직
--    (searchDocumentCandidates → preSearch / search_documents / unified_search 공용)은
--    PostgREST 임베드 문법으로 documents 조회 시
--    `parent_category:categories(id, name)`, `department:departments(id, name)` 를 함께 select 했는데,
--    FK가 없어 PostgREST가 관계를 찾지 못해 매 요청마다
--    "PGRST200 Could not find a relationship between 'documents' and 'categories'" 에러를 반환했다.
--  - 코드가 쿼리 결과의 .error 를 확인하지 않고 `.data || []` 로만 처리해 에러가 조용히 삼켜졌고,
--    그 결과 문서 검색(챗봇 "OO 문서 찾아줘" 등)이 키워드와 무관하게 항상 0건을 반환했다.
--  - 적용 전 고아 데이터(참조 무결성 위반) 0건 확인 완료 (documents 총 75건 모두 유효).

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_department_id_fkey;
ALTER TABLE documents
  ADD CONSTRAINT documents_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_parent_category_id_fkey;
ALTER TABLE documents
  ADD CONSTRAINT documents_parent_category_id_fkey
  FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL;
