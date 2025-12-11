import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'team';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  companyId: string;
  companyCode: string;
  companyName: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  redirectAfterLogin: string | null;
  setRedirectAfterLogin: (path: string | null) => void;
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
    companyCode: string,
    companyName: string,
    departmentId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  completeOnboarding: (
    name: string,
    role: UserRole,
    companyCode: string,
    companyName: string,
    departmentId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsOnboarding: false,
  redirectAfterLogin: null,

  setRedirectAfterLogin: (path) => set({ redirectAfterLogin: path }),

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
        .select(
          `id, name, email, role, department_id, company_id,
           companies:companies!users_company_id_fkey (code, name)`
        )
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('사용자 정보를 찾을 수 없습니다');

      if (userData.role !== role) {
        await supabase.auth.signOut();
        throw new Error('선택한 역할과 계정 정보가 일치하지 않습니다');
      }

      const company = (userData as any).companies;

      set({
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role as UserRole,
          departmentId: userData.department_id,
          companyId: userData.company_id,
          companyCode: company?.code ?? '',
          companyName: company?.name ?? '',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        needsOnboarding: false,
      });

      return { success: true };
    } catch (error) {
      console.error('로그인 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '로그인에 실패했습니다';
      set({ user: null, isAuthenticated: false, isLoading: false, error: errorMsg, needsOnboarding: false });
      return { success: false, error: errorMsg };
    }
  },

  signup: async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    companyCode: string,
    companyName: string,
    departmentId?: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      // 1. 회사 코드로 조회
      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', companyCode)
        .single();

      let company: any;

      // 2-1. 회사가 이미 존재하는 경우
      if (existingCompany) {
        // 회사명 일치 확인
        if (existingCompany.name !== companyName) {
          throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
        }
        // 회사명 일치 → 기존 회사 사용
        company = existingCompany;
      }
      // 2-2. 회사가 없는 경우 (PGRST116: no rows returned)
      else if (checkError && (checkError as any).code === 'PGRST116') {
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            code: companyCode,
          })
          .select()
          .single();

        if (createError) throw createError;
        company = newCompany;
      }
      // 2-3. 기타 에러
      else if (checkError) {
        throw checkError;
      } else {
        throw new Error('회사 정보 확인 중 알 수 없는 오류가 발생했습니다.');
      }

      // 3. 회원가입 (Supabase Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('계정 생성에 실패했습니다');

      // 4. users 테이블에 추가
      const { error: insertError } = await supabase.from('users').insert({
        id: authData.user.id,
        name,
        email,
        role,
        company_id: company.id,
        department_id: departmentId || null,
      });

      if (insertError) throw insertError;

      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      console.error('회원가입 실패:', error);
      const errorMsg = error instanceof Error ? error.message : '회원가입 실패';
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
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        needsOnboarding: false,
        redirectAfterLogin: null,
      });
    }
  },

  checkSession: async () => {
    set({ isLoading: true });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        let { data: userData, error } = await supabase
          .from('users')
          .select(
            `id, name, email, role, department_id, company_id,
             companies!left (code, name)`
          )
          .eq('id', session.user.id)
          .single();

        // users 테이블에 없으면 자동 생성 (OAuth 사용자 등)
        if (error && (error as any).code === 'PGRST116') {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              name:
                (session.user.user_metadata as any)?.name ||
                session.user.email?.split('@')[0] ||
                'User',
              role: 'team',
              department_id: null,
              company_id: null,
            })
            .select(
              `id, name, email, role, department_id, company_id,
               companies:companies!users_company_id_fkey (code, name)`
            )
            .single();

          if (insertError) throw insertError;
          userData = newUser;
        } else if (error) {
          throw error;
        }

        if (!userData) throw new Error('사용자 정보를 찾을 수 없습니다');

        const company = (userData as any).companies;
        const needsOnboarding = !userData.company_id;

        set({
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role as UserRole,
            departmentId: userData.department_id,
            companyId: userData.company_id,
            companyCode: company?.code ?? '',
            companyName: company?.name ?? '',
          },
          isAuthenticated: !needsOnboarding,
          isLoading: false,
          needsOnboarding,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          needsOnboarding: false,
          redirectAfterLogin: null,
        });
      }
    } catch (error) {
      console.error('세션 체크 오류:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        needsOnboarding: false,
        redirectAfterLogin: null,
      });
    }
  },

  completeOnboarding: async (
    name: string,
    role: UserRole,
    companyCode: string,
    companyName: string,
    departmentId?: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error('세션 정보가 없습니다. 다시 로그인해주세요.');
      }

      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', companyCode)
        .single();

      let company: any;

      if (existingCompany) {
        if (existingCompany.name !== companyName) {
          throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
        }
        company = existingCompany;
      } else if (checkError && (checkError as any).code === 'PGRST116') {
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            code: companyCode,
          })
          .select()
          .single();

        if (createError) throw createError;
        company = newCompany;
      } else if (checkError) {
        throw checkError;
      } else {
        throw new Error('회사 정보 확인 중 알 수 없는 오류가 발생했습니다.');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name,
          role,
          company_id: company.id,
          department_id: role === 'team' ? departmentId || null : null,
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          `id, name, email, role, department_id, company_id,
           companies!left (code, name)`
        )
        .eq('id', session.user.id)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('사용자 정보를 찾을 수 없습니다');

      const companyInfo = (userData as any).companies;

      set({
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role as UserRole,
          departmentId: userData.department_id,
          companyId: userData.company_id,
          companyCode: companyInfo?.code ?? '',
          companyName: companyInfo?.name ?? '',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        needsOnboarding: false,
      });

      return { success: true };
    } catch (error) {
      console.error('온보딩 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '온보딩에 실패했습니다';
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  clearError: () => set({ error: null }),
}));
