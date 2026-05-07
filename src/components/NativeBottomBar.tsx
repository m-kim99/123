import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  Home,
  FileText,
  Archive,
  BarChart3,
  MoreHorizontal,
  Building2,
  Users,
  Share2,
  Megaphone,
  FolderOpen,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const HIDDEN_ROUTES = ['/', '/onboarding', '/reset-password', '/auth/naver/callback'];

export function NativeBottomBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!Capacitor.isNativePlatform()) return null;
  if (
    HIDDEN_ROUTES.some((r) => location.pathname === r) ||
    location.pathname.startsWith('/nfc-redirect')
  )
    return null;

  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/team';

  const mainTabs = [
    { label: '홈', href: basePath, icon: Home, exact: true },
    { label: '문서', href: `${basePath}/documents`, icon: FileText, exact: false },
    { label: '스토리지', href: `${basePath}/subcategories`, icon: Archive, exact: false },
    { label: '통계', href: `${basePath}/statistics`, icon: BarChart3, exact: false },
  ];

  const moreTabs = [
    { label: '부서', href: `${basePath}/departments`, icon: Building2 },
    { label: '대분류', href: `${basePath}/parent-categories`, icon: FolderOpen },
    ...(isAdmin ? [{ label: '팀 관리', href: `${basePath}/users`, icon: Users }] : []),
    ...(!isAdmin ? [{ label: '공유 문서', href: `${basePath}/shared`, icon: Share2 }] : []),
    { label: '공지사항', href: `${basePath}/announcements`, icon: Megaphone },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  const handleNavigate = (href: string) => {
    navigate(href);
    setMoreOpen(false);
  };

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200 shadow-2xl px-4 pt-4 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700">더보기</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {moreTabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.href);
                return (
                  <button
                    key={tab.label}
                    onClick={() => handleNavigate(tab.href)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-gray-100 transition-colors"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        active ? 'bg-blue-600' : 'bg-blue-50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-blue-600'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-1px_0_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href, tab.exact);
            return (
              <button
                key={tab.label}
                onClick={() => handleNavigate(tab.href)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full active:bg-gray-50 transition-colors relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full" />
                )}
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
                <span
                  className={`text-[10px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full active:bg-gray-50 transition-colors relative"
          >
            {moreOpen && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-b-full" />
            )}
            <MoreHorizontal className={`w-5 h-5 ${moreOpen ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-[10px] font-medium ${moreOpen ? 'text-blue-600' : 'text-gray-400'}`}>
              더보기
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
