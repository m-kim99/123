/**
 * FCM 푸시 알림 초기화 및 토큰 관리
 * - 앱 시작 시 호출하여 푸시 권한 요청 및 토큰 저장
 * - 백그라운드 푸시 알림 수신을 위해 필요
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

let isInitialized = false;

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

    // 푸시 알림 등록
    await PushNotifications.register();

    // 토큰 수신 리스너
    PushNotifications.addListener('registration', async (token) => {
      console.log('[FCM] 토큰 발급:', token.value);
      await saveTokenToDatabase(token.value);
    });

    // 토큰 발급 실패
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[FCM] 등록 실패:', error);
    });

    // 푸시 수신 (포그라운드)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] 푸시 수신 (포그라운드):', notification);
      // 포그라운드에서는 로컬 알림으로 표시하거나 인앱 토스트 사용
    });

    // 푸시 탭 (백그라운드에서 알림 클릭)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] 푸시 클릭:', action);
      // 필요시 특정 화면으로 이동
    });

    isInitialized = true;
    console.log('[FCM] 초기화 완료');
  } catch (error) {
    console.error('[FCM] 초기화 실패:', error);
  }
}

/**
 * FCM 토큰을 users.push_id에 저장
 */
async function saveTokenToDatabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('[FCM] 로그인된 사용자 없음, 토큰 저장 스킵');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({ push_id: token })
      .eq('id', user.id);

    if (error) {
      console.error('[FCM] 토큰 저장 실패:', error);
    } else {
      console.log('[FCM] 토큰 저장 완료');
    }
  } catch (error) {
    console.error('[FCM] 토큰 저장 중 오류:', error);
  }
}

/**
 * 로그아웃 시 토큰 제거
 */
export async function clearFCMToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('users')
        .update({ push_id: null })
        .eq('id', user.id);
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
