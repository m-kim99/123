-- 리턴 핸들러(innopay-autopay-return)가 pending → charging 으로 클레임한 시각.
-- innopay-noti 백필은 이 시각으로부터 3분이 지나기 전에는 실행하지 않는다:
-- 리턴 핸들러가 살아있는 동안 Noti(status=25)가 먼저 도착해 둘 다 구독을 갱신하면
-- 결제 1건에 기간이 이중 연장되는 레이스가 있었다. 유예 중에는 "9999"를 반환해
-- 이노페이 재전송(1분 간격 10회)을 유도하고, 리턴이 죽었을 때만 재전송분이 백필한다.
ALTER TABLE public.innopay_autopay_pending
  ADD COLUMN IF NOT EXISTS charging_at timestamptz;

COMMENT ON COLUMN public.innopay_autopay_pending.charging_at IS
  '리턴 핸들러가 charging 상태로 클레임한 시각 — innopay-noti 백필 유예(3분) 판단 기준';
