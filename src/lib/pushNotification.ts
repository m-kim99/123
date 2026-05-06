import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { NotificationEventType } from '@/store/notificationStore';

const CHANNEL_ID = 'app_notifications';

const NOTIF_TITLES: Record<NotificationEventType, string> = {
  document_created:              '📄 문서 등록',
  document_deleted:              '🗑️ 문서 삭제',
  document_shared:               '📤 문서 공유',
  subcategory_created:           '📁 세부 스토리지 생성',
  subcategory_deleted:           '🗑️ 세부 스토리지 삭제',
  parent_category_created:       '🗂️ 대분류 생성',
  parent_category_deleted:       '🗑️ 대분류 삭제',
  subcategory_expiring_soon:     '⏰ 만료 예정',
  subcategory_expiring_very_soon:'⚠️ 만료 임박',
  subcategory_expired:           '❌ 만료',
};

async function ensureChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: '앱 알림',
      description: '문서/카테고리/만료 알림',
      importance: 5,   // IMPORTANCE_HIGH → 화면 상단 배너
      visibility: 1,   // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
      lightColor: '#2563eb',
    });
  } catch (e) {
    console.warn('[PushNotification] createChannel 오류:', e);
  }
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await ensureChannel();
    const { display } = await LocalNotifications.requestPermissions();
    console.log('[PushNotification] 권한 요청 결과:', display);
    return display === 'granted';
  } catch (e) {
    console.error('[PushNotification] 권한 요청 오류:', e);
    return false;
  }
}

export async function showLocalNotification(
  type: NotificationEventType,
  message: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    console.log('[PushNotification] 권한 상태:', display);
    if (display === 'denied') {
      console.warn('[PushNotification] 알림 권한 거부됨 — 발송 취소');
      return;
    }

    const notifId = Math.floor(Math.random() * 2_000_000_000);
    console.log('[PushNotification] 알림 발송 시도 id:', notifId, 'type:', type);

    await LocalNotifications.schedule({
      notifications: [
        {
          title: NOTIF_TITLES[type] ?? '알림',
          body: message,
          id: notifId,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_launcher',
          autoCancel: true,
        },
      ],
    });
    console.log('[PushNotification] 알림 발송 완료');
  } catch (e) {
    console.error('[PushNotification] 로컬 알림 오류:', e);
  }
}
