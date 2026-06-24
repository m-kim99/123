import { supabase } from './supabase';
import { getDeviceTokensForUsers } from './deviceTokens';

/**
 * OneSignal 개별 푸시 발송
 * REST API KEY는 서버 사이드(Edge Function)에서만 사용됩니다.
 * 프론트엔드에서 직접 OneSignal API를 호출하지 않습니다.
 */
interface SendPushParams {
  playerIds: string[];
  title: string;
  message: string;
  customUrl?: string;
  imageUrl?: string;
}

export async function sendPushNotification({
  playerIds,
  title,
  message,
  customUrl,
  imageUrl,
}: SendPushParams): Promise<void> {
  console.log('[PUSH-CLIENT] supabase.functions.invoke 호출 시작:', { tokenCount: playerIds.length, title });
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { playerIds, title, message, customUrl, imageUrl },
    });
    console.log('[PUSH-CLIENT] invoke 응답:', { data, error: error?.message });

    if (error) {
      console.error('[PUSH-CLIENT] 푸시 발송 오류:', error);
      throw new Error(`푸시 발송 실패: ${error.message}`);
    }
  } catch (err) {
    console.error('[PUSH-CLIENT] invoke 예외:', err);
    throw err;
  }
}

/**
 * 특정 사용자에게 푸시 발송 (user_device_tokens에서 기기 토큰 조회 후 발송)
 * @param userIds users 테이블의 id 배열
 * @param title 푸시 알림 제목
 * @param message 푸시 알림 내용
 * @param customUrl 푸시 클릭 시 이동할 URL (선택)
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  message: string,
  customUrl?: string
): Promise<void> {
  const pushIds = await getDeviceTokensForUsers(userIds);

  if (pushIds.length > 0) {
    await sendPushNotification({
      playerIds: pushIds,
      title,
      message,
      customUrl,
    });
  }
}
