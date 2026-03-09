import { supabase } from './supabase';

/**
 * OneSignal 개별 푸시 발송
 * 주의: 프론트엔드에서 직접 호출 시 REST_API_KEY 노출 위험
 * → 가능하면 Supabase Edge Function으로 이동 권장
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
  const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
  const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

  if (!APP_ID || !REST_API_KEY) {
    console.warn('OneSignal 설정이 없습니다. 환경변수를 확인하세요.');
    return;
  }

  const dataParam = customUrl ? { custom_url: customUrl } : {};

  const payload: Record<string, any> = {
    app_id: APP_ID,
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
    data: dataParam,
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    large_icon: 'icon_96',
    small_icon: 'icon_48',
  };

  if (imageUrl) {
    payload.big_picture = imageUrl;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${REST_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`푸시 발송 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log('푸시 발송 성공:', result);
  } catch (error) {
    console.error('푸시 발송 오류:', error);
    throw error;
  }
}

/**
 * 특정 사용자에게 푸시 발송 (DB에서 push_id 조회 후 발송)
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
  const { data: users, error } = await supabase
    .from('users')
    .select('push_id')
    .in('id', userIds)
    .not('push_id', 'is', null);

  if (error || !users || users.length === 0) {
    console.warn('푸시 발송 대상 없음:', error);
    return;
  }

  const pushIds = users
    .map((u: { push_id: string | null }) => u.push_id)
    .filter((pid: string | null): pid is string => !!pid);

  if (pushIds.length > 0) {
    await sendPushNotification({
      playerIds: pushIds,
      title,
      message,
      customUrl,
    });
  }
}
