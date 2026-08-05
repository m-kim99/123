-- 운영자 콘솔의 회원 정지/해제가 실제로는 실패하고 있었다.
-- operatorStore.suspendUser 는 internal_note 를, liftSuspension 은 lift_reason 을 쓰는데
-- user_suspensions 에 두 컬럼이 없어 PostgREST 가 PGRST204 로 거부한다.
-- (MemberManagement 화면에서 호출되는 실사용 경로다)
--
-- 컬럼을 없애는 대신 추가한다 — 정지 사유의 내부 메모와 해제 사유는
-- 운영 기록으로 남겨야 하는 값이고, 호출부가 이미 값을 만들어 보내고 있다.
ALTER TABLE public.user_suspensions
  ADD COLUMN IF NOT EXISTS internal_note text,
  ADD COLUMN IF NOT EXISTS lift_reason text;

COMMENT ON COLUMN public.user_suspensions.internal_note IS
  '정지 시 운영자만 보는 내부 메모 (사용자에게 노출하지 않음)';
COMMENT ON COLUMN public.user_suspensions.lift_reason IS
  '정지 해제 사유';
