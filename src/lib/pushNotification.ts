import { Capacitor } from '@capacitor/core';
import { NotificationPlugin } from '@/plugins/notification-plugin';
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
  return Capacitor.isNativePlatform();
}

export async function showLocalNotification(
  type: NotificationEventType,
  message: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const title = NOTIF_TITLES[type] ?? '알림';
    await NotificationPlugin.show({ title, body: message });
  } catch (e) {
    console.error('[PushNotification] 오류:', e);
  }
}
