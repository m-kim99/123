-- ============================================================
-- Migration: 폐기 시 세부 스토리지 완전삭제 대응 — storage_events 보존
-- 날짜: 2026-07-29
-- 배경: 폐기(dispose) 처리를 subcategories/documents 행 완전삭제로 변경한다.
--   storage_events(입출고 감사 이력)는 계속 보존되어야 하므로 FK를
--   CASCADE에서 SET NULL로 전환하고, 삭제 후에도 어떤 스토리지였는지
--   식별 가능하도록 이름 스냅샷 컬럼을 추가한다.
-- ============================================================

ALTER TABLE public.storage_events
  ADD COLUMN IF NOT EXISTS subcategory_name text;

ALTER TABLE public.storage_events
  ALTER COLUMN subcategory_id DROP NOT NULL;

ALTER TABLE public.storage_events
  DROP CONSTRAINT IF EXISTS storage_events_subcategory_id_fkey;

ALTER TABLE public.storage_events
  ADD CONSTRAINT storage_events_subcategory_id_fkey
  FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;
