-- ============================================================
-- Migration: innopay_autopay_pending.status 에 'charging' 허용
-- 날짜: 2026-08-04
-- 배경(장애): 커밋 9b2ad28(이중청구 차단)에서 innopay-autopay-return 이 1회차 청구
--   직전에 pending → 'charging' 으로 원자적 클레임을 하도록 바뀌었으나, 테이블
--   CHECK 제약에는 'charging' 이 추가되지 않았다(코드만 변경, 마이그레이션 없음).
--   결과: 클레임 UPDATE 가 제약 위반으로 실패 → 엣지함수가 error 를 보지 않아
--   '다른 요청이 선점함' 분기로 빠짐 → payAutoCardBill 이 아예 호출되지 않음.
--   즉 카드 등록(빌키 발급)은 되는데 청구·구독활성화가 되지 않아 모든 첫 결제가
--   '결제 처리 중'에서 멈췄다. charge_moid 도 같은 UPDATE 라 NULL 로 남아
--   Noti(status=25) 백필 경로까지 동시에 무력화됐다.
-- ============================================================

-- 인라인 CHECK 로 생성돼 이름이 자동 부여됐으므로, status 를 참조하는 체크 제약을
-- 이름에 의존하지 않고 찾아서 제거한 뒤 재생성한다(재실행 안전).
DO $do$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.innopay_autopay_pending'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.innopay_autopay_pending DROP CONSTRAINT %I', c.conname);
  END LOOP;
END
$do$;

ALTER TABLE public.innopay_autopay_pending
  ADD CONSTRAINT innopay_autopay_pending_status_check
  CHECK (status IN ('pending', 'charging', 'completed', 'failed'));

COMMENT ON COLUMN public.innopay_autopay_pending.status IS
  'pending: 카드등록 대기 / charging: 1회차 청구 진행 중(원자적 클레임) / completed: 구독 활성화 완료 / failed: 등록·청구 실패';
