import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type NotificationEventType =
  | 'document_created'
  | 'document_deleted'
  | 'document_shared'
  | 'subcategory_created'
  | 'subcategory_deleted'
  | 'parent_category_created'
  | 'parent_category_deleted'
  | 'subcategory_expiring_soon'
  | 'subcategory_expiring_very_soon'
  | 'subcategory_expired';

export interface NotificationPreferences {
  document_created: boolean;
  document_deleted: boolean;
  document_shared: boolean;
  category_changes: boolean;
  expiry_alerts: boolean;
  notify_my_department_only: boolean;
}

export interface Notification {
  id: string;
  type: NotificationEventType;
  message: string;
  documentId: string | null;
  departmentId: string | null;
  parentCategoryId: string | null;
  subcategoryId: string | null;
  companyId: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  document_created: true,
  document_deleted: true,
  document_shared: true,
  category_changes: true,
  expiry_alerts: true,
  notify_my_department_only: false,
};

interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  isLoading: boolean;
  isLoadingPreferences: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  preferences: DEFAULT_PREFERENCES,
  isLoading: false,
  isLoadingPreferences: false,
  error: null,

  fetchPreferences: async () => {
    set({ isLoadingPreferences: true });
    try {
      const { user } = useAuthStore.getState();
      if (!user?.companyId || !user?.id) {
        set({ preferences: DEFAULT_PREFERENCES, isLoadingPreferences: false });
        return;
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', user.companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 설정이 없으면 기본값 사용
          set({ preferences: DEFAULT_PREFERENCES, isLoadingPreferences: false });
          return;
        }
        throw error;
      }

      set({
        preferences: {
          document_created: data.document_created ?? true,
          document_deleted: data.document_deleted ?? true,
          document_shared: data.document_shared ?? true,
          category_changes: data.category_changes ?? true,
          expiry_alerts: data.expiry_alerts ?? true,
          notify_my_department_only: data.notify_my_department_only ?? false,
        },
        isLoadingPreferences: false,
      });
    } catch (err) {
      console.error('알림 설정 로드 실패:', err);
      set({ preferences: DEFAULT_PREFERENCES, isLoadingPreferences: false });
    }
  },

  updatePreferences: async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user?.companyId || !user?.id) return;

      const currentPrefs = get().preferences;
      const updatedPrefs = { ...currentPrefs, ...newPreferences };

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: user.id,
            company_id: user.companyId,
            ...updatedPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,company_id' }
        );

      if (error) throw error;

      set({ preferences: updatedPrefs });
    } catch (err) {
      console.error('알림 설정 저장 실패:', err);
      throw err;
    }
  },

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user?.companyId || !user?.id) {
        set({ notifications: [], isLoading: false });
        return;
      }

      // 먼저 preferences를 가져옴
      const { preferences } = get();

      // 1. 일반 알림 조회 (target_user_id가 NULL인 것들)
      let generalQuery = supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.companyId)
        .is('target_user_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      // 관리자: notify_my_department_only 설정에 따라, 팀원: 자신의 부서만
      if (user.role !== 'admin' && user.departmentId) {
        generalQuery = generalQuery.eq('department_id', user.departmentId);
      } else if (user.role === 'admin' && preferences.notify_my_department_only && user.departmentId) {
        generalQuery = generalQuery.eq('department_id', user.departmentId);
      }

      const { data: generalNotifications, error: generalError } = await generalQuery;
      if (generalError) throw generalError;

      // 2. 나에게 온 개인 알림 조회 (target_user_id가 나인 것들)
      const { data: personalNotifications, error: personalError } = await supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (personalError) throw personalError;

      // 3. 두 결과 병합 후 시간순 정렬
      const allNotifications = [...(generalNotifications || []), ...(personalNotifications || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);

      const notificationsData = allNotifications;

      // 4. 사용자별 알림 상태 조회
      const { data: statusData, error: statusError } = await supabase
        .from('user_notification_status')
        .select('notification_id, is_read, is_dismissed')
        .eq('user_id', user.id);

      if (statusError) throw statusError;

      // 상태 맵 생성
      const statusMap = new Map<string, { isRead: boolean; isDismissed: boolean }>();
      (statusData || []).forEach((s: any) => {
        statusMap.set(s.notification_id, {
          isRead: s.is_read ?? false,
          isDismissed: s.is_dismissed ?? false,
        });
      });

      // 5. 알림 목록에 사용자별 상태 병합 (dismissed된 알림 제외)
      let notifications: Notification[] = (notificationsData || [])
        .map((n: any) => {
          const status = statusMap.get(n.id);
          return {
            id: n.id,
            type: n.type as NotificationEventType,
            message: n.message,
            documentId: n.document_id,
            departmentId: n.department_id ?? null,
            parentCategoryId: n.parent_category_id ?? null,
            subcategoryId: n.subcategory_id ?? null,
            companyId: n.company_id,
            isRead: status?.isRead ?? false,
            isDismissed: status?.isDismissed ?? false,
            createdAt: n.created_at,
          };
        })
        .filter((n: Notification) => !n.isDismissed); // dismissed된 알림 제외

      // 6. preferences에 따라 클라이언트 측 필터링
      notifications = notifications.filter((n) => {
        // 문서 등록 알림
        if (!preferences.document_created && n.type === 'document_created') return false;
        // 문서 삭제 알림
        if (!preferences.document_deleted && n.type === 'document_deleted') return false;
        // 문서 공유 알림
        if (!preferences.document_shared && n.type === 'document_shared') return false;
        // 카테고리 변경 알림
        if (!preferences.category_changes && [
          'parent_category_created',
          'parent_category_deleted',
          'subcategory_created',
          'subcategory_deleted',
        ].includes(n.type)) return false;
        // 만료 알림
        if (!preferences.expiry_alerts && [
          'subcategory_expiring_soon',
          'subcategory_expiring_very_soon',
          'subcategory_expired',
        ].includes(n.type)) return false;

        return true;
      });

      set({ notifications, isLoading: false, error: null });
    } catch (err) {
      console.error('알림 로드 실패:', err);
      set({ notifications: [], isLoading: false, error: '알림을 불러오지 못했습니다.' });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user?.id) return;

      // upsert로 사용자별 상태 저장
      const { error } = await supabase
        .from('user_notification_status')
        .upsert({
          user_id: user.id,
          notification_id: id,
          is_read: true,
          is_dismissed: false,
        }, { onConflict: 'user_id,notification_id' });

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      }));
    } catch (err) {
      console.error('읽음 처리 실패:', err);
    }
  },

  dismissNotification: async (id: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user?.id) return;

      // upsert로 사용자별 dismissed 상태 저장 (알림 자체는 삭제하지 않음)
      const { error } = await supabase
        .from('user_notification_status')
        .upsert({
          user_id: user.id,
          notification_id: id,
          is_read: true,
          is_dismissed: true,
        }, { onConflict: 'user_id,notification_id' });

      if (error) throw error;

      // UI에서 해당 알림 제거
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err) {
      console.error('알림 닫기 실패:', err);
    }
  },
}));
