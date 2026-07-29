-- ============================================================
-- Migration: storage_events에 삭제 계열 감사 이벤트 추가
-- 날짜: 2026-07-29
-- 배경: 세부 스토리지 일반삭제(deleteSubcategory)와 문서 완전삭제
--   (permanentlyDeleteDocument/emptyTrash)에도 감사 로그를 남긴다.
--   - event_type CHECK에 'deleted'(스토리지 삭제), 'document_deleted'(문서 삭제) 추가
--   - document_title 스냅샷 컬럼 추가 (문서는 삭제 후 조회가 불가능하므로)
--   - 신규 삭제 이벤트는 회사 관리자만 조회 가능하도록 SELECT 정책 강화
--     (기존 입출고 이력 조회 권한은 그대로 유지, 변경 없음)
-- ============================================================

ALTER TABLE public.storage_events
  ADD COLUMN IF NOT EXISTS document_title text;

ALTER TABLE public.storage_events
  DROP CONSTRAINT IF EXISTS storage_events_event_type_check;

ALTER TABLE public.storage_events
  ADD CONSTRAINT storage_events_event_type_check
  CHECK (
    event_type = ANY (
      ARRAY['registered', 'checked_out', 'returned', 'disposed', 'location_changed', 'deleted', 'document_deleted']
    )
  );

DROP POLICY IF EXISTS "storage_events_select" ON public.storage_events;
CREATE POLICY "storage_events_select"
  ON public.storage_events FOR SELECT
  TO authenticated
  USING (
    company_id = public.auth_company_id()
    AND (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND users.role = 'admin'
      )
      OR (
        event_type NOT IN ('deleted', 'document_deleted')
        AND (
          department_id = (SELECT department_id FROM users WHERE id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM user_permissions
            WHERE user_id = auth.uid()
              AND department_id = storage_events.department_id
              AND role IN ('viewer', 'editor', 'manager')
          )
        )
      )
    )
  );
