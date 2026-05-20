import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ChevronLeft, ChevronRight, Home, RotateCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const HIDDEN_ROUTES = ['/', '/onboarding', '/reset-password', '/auth/naver/callback'];

export function NativeBottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  if (!Capacitor.isNativePlatform()) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith('/nfc-redirect'))) return null;

  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();
  const handleHome = () => {
    if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'team') navigate('/team');
    else navigate('/');
  };
  const handleRefresh = () => window.location.reload();

  const btnBase =
    'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl active:bg-gray-100 transition-colors select-none';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-14 px-1">
        <button onClick={handleBack} className={btnBase} aria-label="뒤로가기">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
          <span className="text-[10px] text-gray-400 font-medium">뒤로</span>
        </button>

        <button onClick={handleForward} className={btnBase} aria-label="앞으로가기">
          <ChevronRight className="w-5 h-5 text-gray-500" />
          <span className="text-[10px] text-gray-400 font-medium">앞으로</span>
        </button>

        <button onClick={handleHome} className={btnBase} aria-label="홈">
          <Home className="w-5 h-5 text-blue-500" />
          <span className="text-[10px] text-blue-400 font-medium">홈</span>
        </button>

        <button onClick={handleRefresh} className={btnBase} aria-label="새로고침">
          <RotateCw className="w-5 h-5 text-gray-500" />
          <span className="text-[10px] text-gray-400 font-medium">새로고침</span>
        </button>
      </div>
    </div>
  );
}
