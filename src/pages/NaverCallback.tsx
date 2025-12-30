import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

export function NaverCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkSession } = useAuthStore();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        console.error('Naver OAuth error:', error, errorDescription);
        setStatus('error');
        setErrorMessage(errorDescription || '네이버 로그인이 취소되었습니다.');
        toast({
          title: '네이버 로그인 실패',
          description: errorDescription || '다시 시도해주세요.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('인가 코드가 없습니다.');
        toast({
          title: '네이버 로그인 실패',
          description: '인가 코드가 없습니다.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      // State 검증 (CSRF 방지)
      const savedState = sessionStorage.getItem('naver_oauth_state');
      if (savedState && savedState !== state) {
        setStatus('error');
        setErrorMessage('잘못된 state 값입니다.');
        toast({
          title: '네이버 로그인 실패',
          description: '보안 검증에 실패했습니다.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      try {
        console.log('🟢 네이버 콜백 처리 시작');

        // Edge Function 호출하여 네이버 OAuth 처리
        const { data, error: fnError } = await supabase.functions.invoke('naver-oauth-callback', {
          body: { code, state },
        });

        if (fnError) {
          throw new Error(fnError.message || '네이버 로그인 처리 실패');
        }

        if (!data || !data.success) {
          throw new Error(data?.error || '네이버 로그인 처리 실패');
        }

        console.log('🟢 Edge Function 응답:', { userId: data.userId, email: data.email });

        // 매직 링크로 세션 설정
        if (data.redirectUrl) {
          const url = new URL(data.redirectUrl);
          const token = url.searchParams.get('token');
          const type = url.searchParams.get('type');

          if (token && type) {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: type as 'magiclink' | 'email',
            });

            if (verifyError) {
              console.error('OTP verification failed:', verifyError);
            }
          }
        }

        // State 정리
        sessionStorage.removeItem('naver_oauth_state');

        // 세션 확인 및 상태 업데이트 (기존 checkSession 로직 활용)
        // checkSession이 needsOnboarding 여부를 자동으로 판단함
        await checkSession();

        toast({
          title: '네이버 로그인 성공',
          description: '환영합니다!',
        });

        // 루트로 이동 → RootRoute에서 온보딩/대시보드 자동 분기
        navigate('/', { replace: true });
      } catch (err) {
        console.error('❌ Naver callback error:', err);
        setStatus('error');
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setErrorMessage(message);
        toast({
          title: '네이버 로그인 실패',
          description: message,
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        {status === 'processing' ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600">네이버 로그인 처리 중...</p>
          </>
        ) : (
          <>
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-lg text-red-600">{errorMessage}</p>
            <p className="text-sm text-slate-500 mt-2">잠시 후 로그인 페이지로 이동합니다...</p>
          </>
        )}
      </div>
    </div>
  );
}
