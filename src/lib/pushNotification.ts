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
    if (display !== 'granted') return;

    await LocalNotifications.schedule({
      notifications: [
        {
          title: NOTIF_TITLES[type] ?? '알림',
          body: message,
          id: Math.floor(Math.random() * 2_000_000_000),
          schedule: { at: new Date(Date.now() + 300) },
        },
      ],
    });
  } catch (e) {
    console.error('[PushNotification] 로컬 알림 오류:', e);
  }
}
