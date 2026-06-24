/**
 * 네이티브(Capacitor) 소셜 로그인 헬퍼
 *
 * 구글/카카오/애플은 보안정책상 임베디드 WebView 내 OAuth가 차단되므로
 * (Google "disallowed_useragent" 등), 네이티브 앱에서는 다음 패턴을 사용한다.
 *   1) signInWithOAuth({ skipBrowserRedirect: true })로 인증 URL만 받는다.
 *   2) 시스템 브라우저(Custom Tab)에서 인증 URL을 연다.
 *   3) 인증 후 커스텀 스킴 딥링크(com.trayst.app://login-callback?code=...)로 복귀한다.
 *   4) NativeDeepLinkHandler가 appUrlOpen을 받아 exchangeCodeForSession으로 세션을 만든다.
 *
 * PKCE 플로우를 사용하므로 supabase 클라이언트의 auth.flowType이 'pkce'여야 한다.
 */

import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';

/** Android applicationId / iOS bundleId 및 매니페스트 딥링크 스킴과 일치해야 함 */
export const NATIVE_AUTH_SCHEME = 'com.trayst.app';
export const NATIVE_AUTH_CALLBACK = `${NATIVE_AUTH_SCHEME}://login-callback`;

export type NativeSocialProvider = 'google' | 'kakao' | 'apple';

/**
 * 네이티브 소셜 로그인 시작
 * @returns 에러가 있으면 { error } 반환, 성공 시 빈 객체
 */
export async function nativeSocialLogin(
  provider: NativeSocialProvider,
): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_AUTH_CALLBACK,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data?.url) return { error: 'OAuth 인증 URL을 가져오지 못했습니다.' };

  // 시스템 브라우저(Custom Tab)에서 인증 페이지 열기
  await Browser.open({ url: data.url });
  return {};
}
