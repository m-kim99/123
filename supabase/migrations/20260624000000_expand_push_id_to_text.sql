-- push_id 컬럼을 varchar(64) → text 로 확장
--
-- 배경:
--  - 기존 varchar(64)는 앱케이크 OneSignal Player ID(36자)용으로 만들어졌다.
--  - FCM 전환 후 등록 토큰은 보통 150~256자라서, users.push_id UPDATE 시
--    "value too long for type character varying(64)" 오류로 저장이 실패했다.
--  - 그 결과 push_id가 null로 남아 푸시 발송 대상이 0건이 되고,
--    send-push-notification 엣지 함수가 호출조차 되지 않아(로그가 빈 채로)
--    iOS/Android 양쪽 모두 푸시가 오지 않았다.

ALTER TABLE users
  ALTER COLUMN push_id TYPE text;

COMMENT ON COLUMN users.push_id IS 'FCM 등록 토큰(또는 레거시 OneSignal Player ID). 앱 재설치/토큰 갱신 시 변경됨';

-- 기존 부분 인덱스(idx_users_push_id WHERE push_id IS NOT NULL)는 text 컬럼에서도 그대로 유효하다.
