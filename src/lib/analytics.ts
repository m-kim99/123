import { useAuthStore } from '@/store/authStore';

type AnalyticsParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const safePush = (payload: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  const w = window as Window;
  if (!w.dataLayer) w.dataLayer = [];
  w.dataLayer.push(payload);
};

const baseContext = (): AnalyticsParams => {
  try {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) return { is_authenticated: false };

    return {
      is_authenticated: true,
      user_role: user.role,
      company_id: user.companyId,
      department_id: user.departmentId,
    };
  } catch {
    return {};
  }
};

export const trackEvent = (event: string, params: AnalyticsParams = {}) => {
  safePush({
    event,
    ts: Date.now(),
    ...baseContext(),
    ...params,
  });
};

export const trackPageView = (pagePath: string, pageTitle?: string) => {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
};
