import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { NotificationEventType } from '@/store/notificationStore';

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

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
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
    if (display === 'denied') return;

    // schedule 없이 즉시 발송 (SCHEDULE_EXACT_ALARM 권한 불필요)
    await LocalNotifications.schedule({
      notifications: [
        {
          title: NOTIF_TITLES[type] ?? '알림',
          body: message,
          id: Math.floor(Math.random() * 2_000_000_000),
          smallIcon: 'ic_launcher',
          channelId: 'default',
        },
      ],
    });
    console.log('[PushNotification] 알림 발송 완료:', type, message);
  } catch (e) {
    console.error('[PushNotification] 로컬 알림 오류:', e);
  }
}
