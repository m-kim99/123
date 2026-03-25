import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { trackEvent } from '@/lib/analytics';
import { requestPushId } from '@/lib/appBridge';

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

export interface PendingDeletion {
  id: string;
  userId: string;
  scheduledDate: string;
  remainingDays: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  redirectAfterLogin: string | null;
  pendingDeletion: PendingDeletion | null;
  setRedirectAfterLogin: (path: string | null) => void;
  clearPendingDeletion: () => void;
  cancelDeletion: () => Promise<{ success: boolean; error?: string }>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // 초기 로딩 true → checkSession 완료 후 false
  error: null,
  needsOnboarding: false,
  redirectAfterLogin: null,
  pendingDeletion: null,

  setRedirectAfterLogin: (path) => set({ redirectAfterLogin: path }),

  clearPendingDeletion: () => set({ pendingDeletion: null }),

  cancelDeletion: async () => {
    const { pendingDeletion } = get();
    if (!pendingDeletion) return { success: false, error: '탈퇴 요청 정보가 없습니다.' };

    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', pendingDeletion.id)
        .eq('status', 'pending');

      if (error) throw error;

      set({ pendingDeletion: null });
      return { success: true };
    } catch (error) {
      console.error('탈퇴 취소 실패:', error);
      return { success: false, error: '탈퇴 취소에 실패했습니다.' };
    }
  },

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

      trackEvent('login', {
        method: 'password',
        selected_role: role,
      });

      // 앱 환경에서 푸시키 저장
      requestPushId((pushId) => {
        supabase
          .from('users')
          .update({ push_id: pushId })
          .eq('id', userData.id)
          .then(({ error: pushError }: { error: any }) => {
            if (pushError) console.error('푸시키 저장 실패:', pushError);
          });
      });

      return { success: true };
    } catch (error) {
      console.error('로그인 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '로그인에 실패했습니다';
      set({ user: null, isAuthenticated: false, isLoading: false, error: errorMsg, needsOnboarding: false });

      trackEvent('login_failed', {
        method: 'password',
        selected_role: role,
        error_message: errorMsg,
      });

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
      // 0. Edge Function으로 비밀번호 검증
      const { data: validation, error: validationError } = await supabase.functions.invoke('validate-password', {
        body: { password },
      });

      if (validationError) {
        // 검증 서비스 오류 시 fail-closed: 회원가입 차단
        const errMsg = '비밀번호 검증 서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        set({ error: errMsg, isLoading: false });
        return { success: false, error: errMsg };
      } else if (validation && !validation.valid) {
        set({ error: validation.errors.join(', '), isLoading: false });
        return { success: false, error: validation.errors.join(', ') };
      }

      // 1. 회사 코드로 조회
      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('*')
        .eq('code', companyCode)
        .single();

      let company: any;
      let isNewCompany = false;

      // 2-1. 회사가 이미 존재하는 경우
      if (existingCompany) {
        // 회사명 일치 확인
        if (existingCompany.name !== companyName) {
          throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
        }
        // 회사명 일치 → 기존 회사 사용
        company = existingCompany;
        isNewCompany = false;
        console.log('기존 회사로 가입:', company.name);
      }
      // 2-2. 회사가 없는 경우 (PGRST116: no rows returned)
      else if (checkError && (checkError as any).code === 'PGRST116') {
        if (role !== 'admin') {
          throw new Error('새 회사 생성은 관리자만 가능합니다.');
        }

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
        isNewCompany = true;
        console.log('새 회사 생성 완료:', company.name, company.id);
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

      // 4. 최초 가입자(새 회사 + 관리자)인 경우에만 기본 부서 생성
      if (company?.id && isNewCompany && role === 'admin') {
        console.log('최초 가입자 - 기본 부서 생성 시작...');

        const { data: createdDept, error: deptError } = await supabase
          .from('departments')
          .insert({
            name: '기본 부서',
            code: `${companyCode}_DEFAULT`,
            company_id: company.id,
            description: '회사 가입 시 자동 생성된 기본 부서입니다.',
          })
          .select('id')
          .single();

        if (deptError) {
          console.error('기본 부서 생성 실패:', deptError);
        } else {
          console.log('기본 부서 생성 완료:', (createdDept as any)?.id);
        }
      }

      // 5. users 테이블에 추가 (upsert로 중복 방지)
      const finalDepartmentId = role === 'team' ? departmentId || null : null;

      const { error: insertError } = await supabase.from('users').upsert(
        {
          id: authData.user.id,
          name,
          email,
          role,
          company_id: company.id,
          department_id: finalDepartmentId,
        },
        { onConflict: 'id' }
      );

      if (insertError) throw insertError;

      set({ isLoading: false });

      trackEvent('sign_up', {
        method: 'password',
        selected_role: role,
        is_new_company: isNewCompany,
        has_department: !!finalDepartmentId,
      });

      return { success: true };
    } catch (error) {
      console.error('회원가입 실패:', error);
      const errorMsg = error instanceof Error ? error.message : '회원가입 실패';
      set({ isLoading: false, error: errorMsg });

      trackEvent('sign_up_failed', {
        method: 'password',
        selected_role: role,
        error_message: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      trackEvent('logout', {});
      await supabase.auth.signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      // 챗봇 대화 내역 등 민감 데이터를 sessionStorage에서 완전 삭제
      try {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith('troy_chat_'))
          .forEach(key => sessionStorage.removeItem(key));
      } catch { /* ignore */ }

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

        // users 테이블에 없으면 자동 생성 (신규 OAuth 사용자에 한함)
        if (error && (error as any).code === 'PGRST116') {
          // 보안: Auth 계정 생성 후 24시간 이내인 경우에만 자동 생성 허용
          // 기존 사용자의 DB 레코드가 삭제된 경우 재가입 악용 방지
          const authCreatedAt = new Date(session.user.created_at);
          const hoursSinceCreated = (Date.now() - authCreatedAt.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCreated > 24) {
            // 24시간 이상 된 Auth 계정에 users 레코드가 없는 경우 → 데이터 불일치 또는 삭제된 계정
            await supabase.auth.signOut();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: '계정 정보가 없습니다. 고객센터에 문의하거나 새로 가입해주세요.',
            });
            return;
          }

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

        // 탈퇴 신청 여부 확인
        const { data: deletionRequest } = await supabase
          .from('account_deletion_requests')
          .select('id, scheduled_deletion_at')
          .eq('user_id', userData.id)
          .eq('status', 'pending')
          .single();

        let pendingDeletionInfo: PendingDeletion | null = null;
        if (deletionRequest) {
          const scheduledDate = new Date(deletionRequest.scheduled_deletion_at);
          const now = new Date();
          const remainingDays = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          pendingDeletionInfo = {
            id: deletionRequest.id,
            userId: userData.id,
            scheduledDate: scheduledDate.toLocaleDateString('ko-KR'),
            remainingDays: Math.max(0, remainingDays),
          };
        }

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
          pendingDeletion: pendingDeletionInfo,
        });

        // 앱 환경에서 푸시키 저장 (세션 복원 시에도)
        if (!needsOnboarding) {
          requestPushId((pushId) => {
            supabase
              .from('users')
              .update({ push_id: pushId })
              .eq('id', userData.id)
              .then(({ error: pushError }: { error: any }) => {
                if (pushError) console.error('푸시키 저장 실패:', pushError);
              });
          });
        }

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
      let defaultDepartmentId: string | null = null;

      if (existingCompany) {
        if (existingCompany.name !== companyName) {
          throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
        }
        company = existingCompany;
      } else if (checkError && (checkError as any).code === 'PGRST116') {
        if (role !== 'admin') {
          throw new Error('새 회사 생성은 관리자만 가능합니다.');
        }

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

      if (company?.id && role === 'team') {
        const { data: existingDept, error: deptCheckError } = await supabase
          .from('departments')
          .select('id')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (deptCheckError) {
          console.error('부서 존재 여부 확인 실패:', deptCheckError);
        } else if (existingDept && existingDept.length > 0) {
          defaultDepartmentId = (existingDept as any)[0]?.id ?? null;
        }
      }

      const resolvedDepartmentId =
        role === 'team' ? departmentId || defaultDepartmentId || null : null;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name,
          role,
          company_id: company.id,
          department_id: role === 'team' ? resolvedDepartmentId : null,
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      if (company?.id && role === 'admin') {
        const { data: existingDept, error: deptCheckError } = await supabase
          .from('departments')
          .select('id')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (deptCheckError) {
          console.error('부서 존재 여부 확인 실패:', deptCheckError);
        } else if (!existingDept || existingDept.length === 0) {
          const { error: deptError } = await supabase
            .from('departments')
            .insert({
              name: '기본 부서',
              code: `${companyCode}_DEFAULT`,
              company_id: company.id,
              description: '회사 가입 시 자동 생성된 기본 부서입니다.',
            });

          if (deptError) {
            console.error('기본 부서 생성 실패:', deptError);
          }
        }
      }

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

      trackEvent('onboarding_complete', {
        selected_role: role,
        has_department: role === 'team' ? !!resolvedDepartmentId : false,
      });

      return { success: true };
    } catch (error) {
      console.error('온보딩 실패:', error);
      const errorMsg =
        error instanceof Error ? error.message : '온보딩에 실패했습니다';
      set({ isLoading: false, error: errorMsg });

      trackEvent('onboarding_failed', {
        selected_role: role,
        error_message: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },

  clearError: () => set({ error: null }),
}));
