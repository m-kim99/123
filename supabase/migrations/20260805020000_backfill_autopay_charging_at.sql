-- 20260805000000 이 charging_at 컬럼을 추가했지만 기존 행을 백필하지 않았다.
-- 그 시점에 이미 status='charging' 이던 행은 charging_at 이 NULL 이라
-- innopay-noti 의 가드(`status === 'charging' && charging_at`)를 통과하지 못하고
-- 3분 유예를 건너뛴다 → 리턴 핸들러와 Noti 가 같은 결제를 동시에 반영해
-- 결제 1건에 구독 기간이 이중 연장되는, 바로 그 레이스가 남아 있다.
--
-- created_at(=자동결제 시작 시각)이 아니라 now()로 채운다:
-- created_at 은 이미 3분을 넘겼을 것이므로 유예가 곧바로 만료돼 이중 반영을 허용한다.
-- now()로 채우면 유예가 새로 시작돼 이중 연장을 막고, 3분 뒤 정상 재전송분은 백필된다.
UPDATE public.innopay_autopay_pending
SET charging_at = now()
WHERE status = 'charging'
  AND charging_at IS NULL;
