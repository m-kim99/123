import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'team';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
    role: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    departmentId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string, role: UserRole) => {
    set({ isLoading: true, error: null });

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('사용자 정보를 찾을 수 없습니다');

      const authUser: SupabaseUser = authData.user;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, department_id')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('사용자 정보를 찾을 수 없습니다');

      if (userData.role !== role) {
        await supabase.auth.signOut();
        throw new Error('선택한 역할과 계정 정보가 일치하지 않습니다');
      }

      set({
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role as UserRole,
          departmentId: userData.department_id,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      console.error('로그인 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '로그인에 실패했습니다';
      set({ user: null, isAuthenticated: false, isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  signup: async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    departmentId?: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('계정 생성에 실패했습니다');

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name,
          email,
          role,
          department_id: departmentId || null,
        });

      if (insertError) throw insertError;

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('회원가입 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '회원가입에 실패했습니다';
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  checkSession: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, department_id')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('세션 사용자 정보 조회 실패:', userError);
        set({ user: null, isAuthenticated: false });
        return;
      }

      if (userData) {
        set({
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role as UserRole,
            departmentId: userData.department_id,
          },
          isAuthenticated: true,
        });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('세션 확인 실패:', error);
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
