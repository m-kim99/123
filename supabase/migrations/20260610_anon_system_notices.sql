-- 로그인 화면(비인증 상태)에서도 활성 시스템 공지를 읽을 수 있도록 anon 정책 추가
-- (display_location = 'login' | 'both' 공지 노출용)

CREATE POLICY "Anon can read active notices"
  ON system_notices FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND published_at <= now()
  );
