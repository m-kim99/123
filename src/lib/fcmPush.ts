/**
 * FCM 푸시 알림 초기화 및 토큰 관리
 * - 앱 시작 시 호출하여 푸시 권한 요청 및 토큰 저장
 * - 백그라운드 푸시 알림 수신을 위해 필요
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { saveDeviceToken, removeDeviceToken } from '@/lib/deviceTokens';
import { NotificationPlugin } from '@/plugins/notification-plugin';

let isInitialized = false;
let currentToken: string | null = null;

/**
 * FCM 푸시 알림 초기화
 * - 네이티브 앱에서만 실행
 * - 권한 요청 → 토큰 발급 → DB 저장
 */
export async function initFCMPush(): Promise<void> {
  console.log('[FCM] initFCMPush 호출됨');
  console.log('[FCM] isNativePlatform:', Capacitor.isNativePlatform());
  console.log('[FCM] isInitialized:', isInitialized);
  
  // 웹이나 이미 초기화된 경우 스킵
  if (!Capacitor.isNativePlatform() || isInitialized) {
    console.log('[FCM] 스킵 - 네이티브 아니거나 이미 초기화됨');
    return;
  }

  try {
    console.log('[FCM] 권한 요청 시작...');
    // 권한 요청
    const permResult = await PushNotifications.requestPermissions();
    console.log('[FCM] 권한 결과:', JSON.stringify(permResult));
    
    if (permResult.receive !== 'granted') {
      console.log('[FCM] 푸시 권한 거부됨');
      return;
    }

    // 리스너를 register() 이전에 등록한다.
    // register()가 토큰 발급(registration) 이벤트를 즉시 발화할 수 있어,
    // 리스너를 나중에 붙이면 토큰을 놓쳐 users.push_id가 저장되지 않을 수 있다.
    // 토큰 수신 리스너
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM] 토큰 발급:', token.value);
      currentToken = token.value;
      await saveDeviceToken(token.value);
    });

    // 토큰 발급 실패
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[FCM] 등록 실패:', error);
    });

    // 푸시 수신 (포그라운드) - FCM은 앱이 포그라운드일 때 시스템 알림을 자동으로 띄우지
    // 않으므로, 로컬 알림으로 직접 표시해야 한다 (백그라운드/종료 상태는 OS가 자동 표시).
    await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('[FCM] 푸시 수신 (포그라운드):', notification);
      try {
        await NotificationPlugin.show({
          title: notification.title || '알림',
          body: notification.body || '',
        });
      } catch (error) {
        console.error('[FCM] 포그라운드 로컬 알림 표시 실패:', error);
      }
    });

    // 푸시 탭 (백그라운드에서 알림 클릭)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] 푸시 클릭:', action);
      // 필요시 특정 화면으로 이동
    });

    // 푸시 알림 등록 (리스너 등록 후 호출해야 토큰 이벤트를 안전하게 수신)
    await PushNotifications.register();

    isInitialized = true;
    console.log('[FCM] 초기화 완료');
  } catch (error) {
    console.error('[FCM] 초기화 실패:', error);
  }
}

/**
 * 로그아웃 시 이 기기 토큰만 제거 (다른 기기 토큰은 유지)
 */
export async function clearFCMToken(): Promise<void> {
  try {
    if (currentToken) {
      await removeDeviceToken(currentToken);
      currentToken = null;
    }

    if (Capacitor.isNativePlatform()) {
      await PushNotifications.unregister();
    }

    isInitialized = false;
    console.log('[FCM] 토큰 제거 완료');
  } catch (error) {
    console.error('[FCM] 토큰 제거 실패:', error);
  }
}
