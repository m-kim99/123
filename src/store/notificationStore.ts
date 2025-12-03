import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export type NotificationEventType = 'document_created' | 'document_deleted';

export interface NotificationItem {
  id: string;
  type: NotificationEventType;
  message: string;
  createdAt: string;
  documentId: string | null;
  departmentId: string | null;
}

interface NotificationState {
  notifications: NotificationItem[];
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
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
        .select('id, type, message, created_at, document_id, department_id')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (user.role === 'team' && user.departmentId) {
        query = query.eq('department_id', user.departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items: NotificationItem[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type as NotificationEventType,
        message: n.message,
        createdAt: n.created_at,
        documentId: n.document_id ?? null,
        departmentId: n.department_id ?? null,
      }));

      set({ notifications: items, isLoading: false, error: null });
    } catch (err) {
      console.error('알림 로드 실패:', err);
      set({ isLoading: false, error: '알림을 불러오지 못했습니다.' });
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
