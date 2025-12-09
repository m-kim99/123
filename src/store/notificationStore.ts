import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type NotificationEventType =
  | 'document_created'
  | 'document_deleted'
  | 'subcategory_created'
  | 'subcategory_deleted'
  | 'parent_category_created'
  | 'parent_category_deleted';

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
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user?.companyId) {
        set({ notifications: [], isLoading: false });
        return;
      }

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      // 관리자: 전체 부서, 팀원: 자신의 부서만
      if (user.role !== 'admin' && user.departmentId) {
        query = query.eq('department_id', user.departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const notifications: Notification[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type as NotificationEventType,
        message: n.message,
        documentId: n.document_id,
        departmentId: n.department_id ?? null,
        parentCategoryId: n.parent_category_id ?? null,
        subcategoryId: n.subcategory_id ?? null,
        companyId: n.company_id,
        isRead: n.is_read ?? false,
        createdAt: n.created_at,
      }));

      set({ notifications, isLoading: false, error: null });
    } catch (err) {
      console.error('알림 로드 실패:', err);
      set({ notifications: [], isLoading: false, error: '알림을 불러오지 못했습니다.' });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

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
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch (err) {
      console.error('알림 삭제 실패:', err);
    }
  },
}));
