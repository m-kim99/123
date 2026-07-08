-- ============================================================
-- documents PK 복구 + shared_documents 외래키 복구
-- ============================================================
-- 배경: shared_documents 생성 마이그레이션(20241220_01_create_shared_documents.sql)에는
--   document_id/shared_by_user_id/shared_to_user_id 3개 FK가 정의되어 있었으나,
--   실제 운영 DB에는 전혀 적용되지 않아 PRIMARY KEY/CHECK 제약만 존재하는 상태였다.
--   (documents 테이블에 department_id/parent_category_id FK가 누락되어
--    검색이 항상 0건이었던 20260708010000과 동일한 유형의 문제)
--
-- 추가 발견: documents 테이블에 PRIMARY KEY 자체가 없었다(FK 3개만 존재).
--   이 때문에 REFERENCES documents(id) FK 생성이 42830 오류로 실패하는 상태였고,
--   shared_documents FK가 처음부터 생성되지 못한 근본 원인으로 추정된다.
--   documents.id: 총 75건, NULL 0건, 중복 0건 확인 후 PK 추가.
--
-- 영향: 클라이언트(src/lib/chatbot.ts getSharedDocuments)가
--   `documents!inner(...)` 임베드로 조회하는데, FK가 없어 PostgREST가
--   관계를 찾지 못해 "PGRST200 Could not find a relationship between
--   'shared_documents' and 'documents'" 오류를 반환 → "내가 공유한 문서" /
--   "나에게 공유된 문서" 조회가 항상 실패.
--
-- 적용 전 고아 데이터 확인 결과:
--   - document_id: 고아 0건 → 즉시 FK 추가
--   - shared_by_user_id: 고아 0건 → 즉시 FK 추가
--   - shared_to_user_id: 고아 6건(총 13건 중, 탈퇴 등으로 CASCADE 안 걸리고 남은 행)
--     → 이번 마이그레이션에서는 제외. 별도로 정리 후 추가 필요.
--
-- ※ 2026-07-08 db query로 운영 DB에 직접 적용 완료.
--   재실행에도 안전하도록 idempotent 가드 포함(추적 테이블 동기화용 재실행 대비).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_pkey' AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.shared_documents
  DROP CONSTRAINT IF EXISTS shared_documents_document_id_fkey;
ALTER TABLE public.shared_documents
  ADD CONSTRAINT shared_documents_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

ALTER TABLE public.shared_documents
  DROP CONSTRAINT IF EXISTS shared_documents_shared_by_user_id_fkey;
ALTER TABLE public.shared_documents
  ADD CONSTRAINT shared_documents_shared_by_user_id_fkey
  FOREIGN KEY (shared_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
