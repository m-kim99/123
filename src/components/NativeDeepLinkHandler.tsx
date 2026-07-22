/**
 * 네이티브 딥링크 처리기
 *
 * Capacitor 앱에서 OS가 전달하는 appUrlOpen 이벤트를 수신해 다음을 처리한다.
 *  1) Supabase 소셜 로그인 콜백: com.trayst.app://login-callback?code=...
 *     → exchangeCodeForSession으로 세션 생성 후 루트로 이동.
 *  2) 네이버 OAuth 콜백(App Link): https://traystorageconnect.com/auth/naver/callback?...
 *     → 앱 내 라우터의 NaverCallback 페이지로 이동(세션/state는 WebView에 유지됨).
 *  3) NFC 태그 리다이렉트(App Link): https://traystorageconnect.com/nfc-redirect?subcategoryId=...
 *     → 앱 내 라우터의 NfcRedirect 페이지로 이동.
 *
 * 라우터 내부에 렌더링되어야 useNavigate를 사용할 수 있다.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { NATIVE_AUTH_SCHEME } from '@/lib/nativeAuth';
import { getNfcMode } from '@/lib/nfc';

const NAVER_CALLBACK_HOST = 'traystorageconnect.com';
const NAVER_CALLBACK_PATH = '/auth/naver/callback';

export function NativeDeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;

    const handleUrl = async (url: string) => {
      try {
        // 1) Supabase 소셜 로그인 콜백 (커스텀 스킴)
        if (url.startsWith(`${NATIVE_AUTH_SCHEME}://login-callback`)) {
          try { await Browser.close(); } catch { /* Custom Tab이 이미 닫힌 경우 무시 */ }

          const parsed = new URL(url);
          const code = parsed.searchParams.get('code');
          const oauthError =
            parsed.searchParams.get('error_description') || parsed.searchParams.get('error');

          if (oauthError) {
            console.error('소셜 로그인 콜백 오류:', oauthError);
            navigate('/', { replace: true });
            return;
          }

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('OAuth 코드 교환 실패:', error);
              navigate('/', { replace: true });
              return;
            }
            // 세션 반영 후 루트로 → RootRoute가 온보딩/대시보드로 분기
            await useAuthStore.getState().checkSession();
            navigate('/', { replace: true });
          }
          return;
        }

        // 2) 네이버 OAuth https 콜백 (App Link)
        const parsed = new URL(url);
        if (
          parsed.hostname === NAVER_CALLBACK_HOST &&
          parsed.pathname.startsWith(NAVER_CALLBACK_PATH)
        ) {
          try { await Browser.close(); } catch { /* 무시 */ }
          navigate(`${NAVER_CALLBACK_PATH}${parsed.search}`, { replace: true });
          return;
        }

        // 3) NFC 태그 리다이렉트 (App Link)
        if (parsed.pathname.startsWith('/nfc-redirect')) {
          // 쓰기(재등록) 중에는 iOS가 태그의 기존 URL을 백그라운드에서 독립적으로
          // 인식해 Universal Link를 띄울 수 있음(앱의 쓰기 세션과 무관하게 발생) -
          // Android(NFCAutoRedirect)와 동일하게 이동 자체를 하지 않고 조용히 무시.
          if (getNfcMode() === 'writing') {
            console.log('NFC 쓰기 모드 중 - 자동 리다이렉트 스킵');
            return;
          }
          navigate(`${parsed.pathname}${parsed.search}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error('딥링크 처리 오류:', e);
      }
    };

    const setup = async () => {
      const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        void handleUrl(url);
      });
      handle = listener;
    };
    void setup();

    return () => {
      handle?.remove();
    };
  }, [navigate]);

  return null;
}
