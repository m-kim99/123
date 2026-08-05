-- ============================================================
-- Migration: 탈퇴 기록이 스스로 삭제되던 문제 수정
--
-- 문제: account_deletion_requests.user_id 가 users(id) ON DELETE CASCADE 였다.
--   process-account-deletions 는 (1) auth 유저 삭제 → (2) status='completed' 업데이트
--   순서로 동작하는데, (1)에서 public.users 가 CASCADE 되면 이 요청 행까지 함께
--   삭제되어 (2)는 0행 업데이트로 조용히 실패했다. 결과적으로 '누가 언제 탈퇴했는지'
--   기록이 하나도 남지 않았고, 체험 소진 후 탈퇴·재가입을 관측할 근거도 사라졌다.
--
-- 조치: FK 를 제거하고 user_id 를 값으로만 보관한다(uuid 자체는 개인정보가 아니다).
--   삭제 완료 기록이 남아야 감사·부정이용 관측이 가능하다.
--   pending 행은 앱이 실재 유저에게만 만들므로 FK 없이도 정합성 문제는 없다.
-- ============================================================

-- FK 이름은 환경에 따라 다를 수 있어 카탈로그에서 찾아 제거한다
DO $do$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'account_deletion_requests'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES%users%'
  LOOP
    EXECUTE format('ALTER TABLE public.account_deletion_requests DROP CONSTRAINT %I', v_con);
  END LOOP;
END
$do$;

COMMENT ON COLUMN public.account_deletion_requests.user_id IS
  '탈퇴 대상 사용자 id. FK 없음 — 계정이 삭제된 뒤에도 탈퇴 완료 기록을 보존하기 위함.';

-- 완료 시각이 비어 있는 completed 행 보정 (과거 기록이 남아 있다면)
UPDATE public.account_deletion_requests
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;
