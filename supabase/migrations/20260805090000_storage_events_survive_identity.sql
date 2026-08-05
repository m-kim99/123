-- ============================================================
-- Migration: 삭제된 세부 스토리지의 반출입 이력을 '식별 가능한' 상태로 보존
--
-- 배경: 20260729000000 에서 폐기/삭제 시 storage_events 행이 남도록 FK 를
--   CASCADE → SET NULL 로 바꿨다. 그런데 실제로는 삭제 후 그 이력을 찾을 수
--   없었다. 원인은 두 가지:
--     1) 반출입 이벤트(registered/checked_out/returned/location_changed)에
--        subcategory_name 스냅샷을 한 번도 기록하지 않았다(앱 누락).
--        → 삭제로 subcategory_id 가 NULL 이 되는 순간 이름도 없어 완전한 고아가 된다.
--     2) 식별자 자체가 FK 라 NULL 이 되므로 '같은 스토리지의 이력'을 묶을 키가 없다.
--
-- 조치: FK 가 아닌 subcategory_ref 에 원본 id 를 복제 보관한다. 삭제돼도 값이
--   남으므로 이 키로 이력을 묶어 조회할 수 있다(account_deletion_requests.user_id
--   와 같은 패턴). 기존 행은 아직 subcategory_id 가 살아 있는 동안 백필한다.
-- ============================================================

ALTER TABLE public.storage_events
  ADD COLUMN IF NOT EXISTS subcategory_ref uuid;

COMMENT ON COLUMN public.storage_events.subcategory_ref IS
  '세부 스토리지 원본 id 복제(FK 아님) — 스토리지가 삭제돼도 남아 이력을 묶는 키가 된다.';

-- 기존 행 백필: 아직 참조가 살아 있는 행은 지금 복제해 두어야 나중에 삭제돼도 식별된다
UPDATE public.storage_events
SET subcategory_ref = subcategory_id
WHERE subcategory_ref IS NULL AND subcategory_id IS NOT NULL;

-- 이름 스냅샷도 같은 이유로 지금 채운다 (반출입 이벤트는 그동안 비어 있었다)
UPDATE public.storage_events e
SET subcategory_name = s.name
FROM public.subcategories s
WHERE e.subcategory_name IS NULL
  AND e.subcategory_id = s.id;

CREATE INDEX IF NOT EXISTS idx_storage_events_subcategory_ref
  ON public.storage_events (subcategory_ref, created_at DESC)
  WHERE subcategory_ref IS NOT NULL;
