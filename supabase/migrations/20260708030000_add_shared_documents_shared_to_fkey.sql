-- ============================================================
-- shared_documents.shared_to_user_id 외래키 복구 (나머지 1건)
-- ============================================================
-- 배경: 20260708020000에서 shared_to_user_id FK는 탈퇴한 유저를 참조하는
--   고아 데이터 6건 때문에 제외했었다. 전부 동일 유저(이미 삭제된 계정)를
--   가리키고 있었고, 원래 정의(ON DELETE CASCADE)대로라면 그 유저 삭제 시
--   함께 삭제됐어야 할 행이므로 삭제 후 FK를 추가한다.
--
-- ※ 2026-07-08 db query로 운영 DB에 직접 적용 완료(고아 6건 삭제 후 FK 추가).

DELETE FROM public.shared_documents
WHERE shared_to_user_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.shared_documents
  DROP CONSTRAINT IF EXISTS shared_documents_shared_to_user_id_fkey;
ALTER TABLE public.shared_documents
  ADD CONSTRAINT shared_documents_shared_to_user_id_fkey
  FOREIGN KEY (shared_to_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
