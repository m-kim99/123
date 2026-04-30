import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department_id: string | null;
}

export interface SignInResponse {
  user: AuthUser | null;
  error: string | null;
}

/**
 * 이메일과 비밀번호로 로그인
 * @param email 사용자 이메일
 * @param password 사용자 비밀번호
 * @returns 사용자 정보(role, department_id 포함) 또는 에러
 */
export async function signIn(
  email: string,
  password: string
): Promise<SignInResponse> {
  try {
    // Supabase Auth로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return {
        user: null,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        user: null,
        error: '로그인에 실패했습니다.',
      };
    }

    // users 테이블에서 사용자 정보 조회 (role, department_id 포함)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, department_id')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Failed to fetch user data:', userError);
      // users 테이블 조회 실패 시 기본 role로 폴백하지 않음 (fail-closed)
      // 관리자가 team으로 로그인되는 보안 문제 방지
      await supabase.auth.signOut();
      return {
        user: null,
        error: '사용자 정보를 불러오지 못했습니다. 다시 로그인해주세요.',
      };
    }

    // 사용자 정보 반환
    return {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        department_id: userData.department_id,
      },
      error: null,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 로그아웃
 * @returns 에러가 있으면 에러 메시지, 없으면 null
 */
export async function signOut(): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return error.message;
    }

    return null;
  } catch (error) {
    console.error('Sign out error:', error);
    return error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.';
  }
}

/**
 * 현재 로그인된 사용자 정보 반환
 * @returns 사용자 정보(role, department_id 포함) 또는 null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      return null;
    }

    // users 테이블에서 사용자 정보 조회 (role, department_id 포함)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, department_id')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('Failed to fetch user data:', userError);
      // users 테이블 조회 실패 시 기본 role로 폴백하지 않음 (fail-closed)
      return null;
    }

    // 사용자 정보 반환
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      department_id: userData.department_id,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

