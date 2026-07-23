import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { trackEvent } from '@/lib/analytics';
import { checkMemberLimit, checkSubscriptionAccess, type SubscriptionAccess } from '@/lib/subscription';
import { requestPushId } from '@/lib/appBridge';
import { saveDeviceToken } from '@/lib/deviceTokens';

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
  subscriptionBlocked: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: SubscriptionAccess['status'] | null;
  refreshSubscriptionAccess: () => Promise<void>;
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

// 정지 상태 확인 (check_user_suspension RPC는 SECURITY DEFINER라 RLS 무관하게 조회 가능)
// RPC가 DB에 없으면(404) 세션 동안 재호출하지 않음
let suspensionRpcUnavailable = false;

async function getActiveSuspension(userId: string): Promise<{ reason: string; expiresAt: string | null } | null> {
  if (suspensionRpcUnavailable) return null;

  const { data, error } = await supabase.rpc('check_user_suspension', { check_user_id: userId });
  if (error) {
    const code = (error as any)?.code;
    const message = (error as any)?.message ?? '';
    // PGRST202: 함수 없음 → DB에 마이그레이션(20260603) 미적용 상태
    if (code === 'PGRST202' || message.includes('Could not find the function')) {
      suspensionRpcUnavailable = true;
      console.warn('check_user_suspension RPC가 DB에 없어 정지 상태 확인을 건너뜁니다. (마이그레이션 20260603 적용 필요)');
    } else {
      console.error('정지 상태 확인 실패:', error);
    }
    return null; // 확인 실패 시 차단하지 않음 (fail-open)
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.is_suspended) {
    return { reason: row.reason ?? '', expiresAt: row.expires_at ?? null };
  }
  return null;
}

function suspensionMessage(suspension: { reason: string; expiresAt: string | null }): string {
  const until = suspension.expiresAt
    ? `${new Date(suspension.expiresAt).toLocaleDateString('ko-KR')}까지 `
    : '영구 ';
  const reason = suspension.reason ? ` (사유: ${suspension.reason})` : '';
  return `이 계정은 ${until}이용이 정지되었습니다.${reason}`;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // 초기 로딩 true → checkSession 완료 후 false
  error: null,
  needsOnboarding: false,
  redirectAfterLogin: null,
  pendingDeletion: null,
  subscriptionBlocked: false,
  trialEndsAt: null,
  subscriptionStatus: null,

  // 결제 완료 후 등 구독 상태 재확인 (SubscriptionGate 해제용)
  refreshSubscriptionAccess: async () => {
    const { user } = get();
    if (!user?.companyId) return;
    const access = await checkSubscriptionAccess(user.companyId);
    set({
      subscriptionBlocked: !access.allowed,
      trialEndsAt: access.currentPeriodEnd,
      subscriptionStatus: access.status,
    });
  },

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

      // 계정 정지 확인 — 정지 상태면 로그인 차단
      const suspension = await getActiveSuspension(userData.id);
      if (suspension) {
        await supabase.auth.signOut();
        throw new Error(suspensionMessage(suspension));
      }

      const company = (userData as any).companies;

      // 구독(무료체험 포함) 유효성 확인 — 만료 시 결제 게이트 표시
      let subscriptionBlocked = false;
      let trialEndsAt: string | null = null;
      let subscriptionStatus: SubscriptionAccess['status'] | null = null;
      if (userData.company_id) {
        const access = await checkSubscriptionAccess(userData.company_id);
        subscriptionBlocked = !access.allowed;
        trialEndsAt = access.currentPeriodEnd;
        subscriptionStatus = access.status;
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
        isAuthenticated: true,
        isLoading: false,
        error: null,
        needsOnboarding: false,
        subscriptionBlocked,
        trialEndsAt,
        subscriptionStatus,
      });

      trackEvent('login', {
        method: 'password',
        selected_role: role,
      });

      // 마지막 로그인 시간 기록 (실패해도 로그인 흐름엔 영향 없음)
      supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userData.id)
        .then(({ error: llError }: { error: any }) => {
          if (llError) console.error('마지막 로그인 기록 실패:', llError);
        });

      // 앱 환경에서 푸시키 저장 (다중 기기)
      requestPushId((pushId) => {
        saveDeviceToken(pushId).catch((e) => console.error('푸시키 저장 실패:', e));
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

      // 0-1. 이메일 중복 검증
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        const errMsg = '이미 가입된 이메일입니다. 로그인을 시도해주세요.';
        set({ error: errMsg, isLoading: false });
        return { success: false, error: errMsg };
      }

      // 1. 회사 코드로 조회 (팀원은 회사 코드 없이 가입 가능)
      let company: any = null;
      let isNewCompany = false;

      if (companyCode) {
        const { data: existingCompany, error: checkError } = await supabase
          .from('companies')
          .select('*')
          .eq('code', companyCode)
          .maybeSingle();

        // 2-1. 회사가 이미 존재하는 경우
        if (existingCompany) {
          // 관리자인 경우 회사명 일치 확인 필수
          if (role === 'admin' && existingCompany.name !== companyName) {
            throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
          }

          // 멤버 수 제한 체크
          const memberCheck = await checkMemberLimit(existingCompany.id);
          if (!memberCheck.allowed) {
            throw new Error(`이 회사의 멤버 수 제한에 도달했습니다. (현재: ${memberCheck.current}명 / 최대: ${memberCheck.limit}명) 관리자에게 플랜 업그레이드를 요청하세요.`);
          }

          // 팀원은 회사명 없이 코드만으로 기존 회사에 가입 가능
          company = existingCompany;
          isNewCompany = false;
          console.log('기존 회사로 가입:', company.name);
        }
        // 2-2. 회사가 없는 경우: 생성은 auth 트리거에서 수행 (가입 실패 시 고아 회사 방지)
        else if (!existingCompany && !checkError) {
          if (role !== 'admin') {
            throw new Error('존재하지 않는 회사 코드입니다. 관리자에게 올바른 회사 코드를 확인하세요.');
          }

          if (!companyName?.trim()) {
            throw new Error('새 회사를 만들려면 회사명이 필요합니다.');
          }

          isNewCompany = true;
        }
        // 2-3. 기타 에러
        else if (checkError) {
          throw checkError;
        } else {
          throw new Error('회사 정보 확인 중 알 수 없는 오류가 발생했습니다.');
        }
      }

      // 3. 회원가입 (Supabase Auth)
      //    프로필·새 회사·기본 부서 생성은 모두 auth 트리거(handle_new_user)가 원자적으로 처리
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            company_id: company?.id || null,
            company_code: companyCode || null,
            company_name: isNewCompany ? companyName.trim() : null,
            department_id: departmentId || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('계정 생성에 실패했습니다');

      set({ isLoading: false });

      trackEvent('sign_up', {
        method: 'password',
        selected_role: role,
        is_new_company: isNewCompany,
        has_department: role === 'team' && !!departmentId,
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
    // 이미 로그아웃 상태면 무한 재귀 방지
    if (!get().user && !get().isAuthenticated) return;

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
        subscriptionBlocked: false,
        trialEndsAt: null,
        subscriptionStatus: null,
      });
    }
  },

  checkSession: async () => {
    // 이미 로그인된 사용자가 있으면 "조용한 재검증"으로 처리한다.
    // 앱(WebView)에서 파일 선택기 등으로 포커스가 복귀하면 Supabase가
    // 인증 이벤트를 재발행 → checkSession 재실행 시 isLoading=true 로
    // 전환되면서 ProtectedRoute가 현재 페이지(업로드 다이얼로그/선택 파일 포함)를
    // 통째로 언마운트한다. 그 결과 업로드가 중단되고 홈으로 튕기는 문제가 발생한다.
    // 따라서 이미 인증된 상태에서는 로딩 상태로 전환하지 않고 백그라운드에서만 갱신한다.
    const isSilentRevalidate = get().isAuthenticated && !!get().user;

    if (!isSilentRevalidate) {
      set({ isLoading: true });
    }

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
          // 세션 분리: 운영자 전용 계정(operators 테이블에만 존재)은
          // users 자동 생성/강제 로그아웃 대상에서 제외하고 사용자 상태만 해제
          const { data: operatorRecord } = await supabase
            .from('operators')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (operatorRecord) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              needsOnboarding: false,
            });
            return;
          }

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

        // 계정 정지 확인 — 정지 상태면 세션 종료
        const suspension = await getActiveSuspension(userData.id);
        if (suspension) {
          await supabase.auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            needsOnboarding: false,
            error: suspensionMessage(suspension),
          });
          return;
        }

        const company = (userData as any).companies;
        const needsOnboarding = !userData.company_id;

        // 구독(무료체험 포함) 유효성 확인 — 만료 시 결제 게이트 표시
        let subscriptionBlocked = false;
        let trialEndsAt: string | null = null;
        let subscriptionStatus: SubscriptionAccess['status'] | null = null;
        if (userData.company_id) {
          const access = await checkSubscriptionAccess(userData.company_id);
          subscriptionBlocked = !access.allowed;
          trialEndsAt = access.currentPeriodEnd;
          subscriptionStatus = access.status;
        }

        // 탈퇴 신청 여부 확인
        const { data: deletionRequest } = await supabase
          .from('account_deletion_requests')
          .select('id, scheduled_deletion_at')
          .eq('user_id', userData.id)
          .eq('status', 'pending')
          .maybeSingle();

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
          subscriptionBlocked,
          trialEndsAt,
          subscriptionStatus,
        });

        // 앱 환경에서 푸시키 저장 (세션 복원 시에도)
        if (!needsOnboarding) {
          requestPushId((pushId) => {
            saveDeviceToken(pushId).catch((e) => console.error('푸시키 저장 실패:', e));
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
      // 조용한 재검증 중 일시적 오류(예: 파일 선택기 복귀 직후 네트워크 재연결 타이밍)는
      // 기존 세션을 그대로 유지한다. 실제 로그아웃은 onAuthStateChange('SIGNED_OUT')에서 처리되므로
      // 여기서 인증 상태를 덮어쓰면 다른 페이지로 튕기는 부작용만 발생한다.
      if (isSilentRevalidate) {
        return;
      }
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
        .maybeSingle();

      let company: any;
      let defaultDepartmentId: string | null = null;

      if (existingCompany) {
        if (existingCompany.name !== companyName) {
          throw new Error('회사 코드는 존재하지만 회사명이 일치하지 않습니다.');
        }

        // 멤버 수 제한 체크
        const memberCheck = await checkMemberLimit(existingCompany.id);
        if (!memberCheck.allowed) {
          throw new Error(`이 회사의 멤버 수 제한에 도달했습니다. (현재: ${memberCheck.current}명 / 최대: ${memberCheck.limit}명) 관리자에게 플랜 업그레이드를 요청하세요.`);
        }

        company = existingCompany;
      } else if (!existingCompany && !checkError) {
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
              code: 'DEFAULT',
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
