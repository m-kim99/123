/**
 * 역할 기반 권한 체크 유틸리티
 */

import { supabase } from '@/lib/supabase';

export type Role = 'none' | 'viewer' | 'editor' | 'manager';
export type Action = 'read' | 'write' | 'upload' | 'delete' | 'download' | 'share' | 'print';

/**
 * 역할별 권한 매핑
 */
export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  none: [],
  viewer: ['read', 'download', 'print'],
  editor: ['read', 'download', 'print', 'write', 'upload'],
  manager: ['read', 'download', 'print', 'write', 'upload', 'delete', 'share'],
};

/**
 * 역할이 특정 액션을 수행할 수 있는지 확인
 */
export function hasPermission(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

/**
 * 역할 레이블 (UI 표시용)
 */
export const ROLE_LABELS: Record<Role, string> = {
  none: '접근 불가',
  viewer: '뷰어',
  editor: '편집자',
  manager: '관리자',
};

/**
 * 역할 설명 (UI 표시용)
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  none: '접근 불가',
  viewer: '읽기, 다운로드, 출력',
  editor: '뷰어 + 업로드, 수정',
  manager: '편집자 + 삭제, 공유, NFC',
};

/**
 * 사용자의 부서 접근 권한 체크
 * 소속 부서는 자동으로 manager 권한 부여
 */
export async function checkUserAccess(
  userId: string,
  departmentId: string,
  userDepartmentId: string | null
): Promise<{ hasAccess: boolean; role: Role }> {
  // 소속 부서는 자동 manager
  if (userDepartmentId === departmentId) {
    return { hasAccess: true, role: 'manager' };
  }

  // 다른 부서는 DB 조회
  const { data, error } = await supabase
    .from('user_permissions')
    .select('role')
    .eq('user_id', userId)
    .eq('department_id', departmentId)
    .single();

  if (error || !data || data.role === 'none') {
    return { hasAccess: false, role: 'none' };
  }

  return { hasAccess: true, role: data.role as Role };
}

/**
 * 사용자가 특정 액션을 수행할 수 있는지 체크
 * 소속 부서는 자동으로 manager 권한 부여
 */
export async function checkUserAction(
  userId: string,
  departmentId: string,
  userDepartmentId: string | null,
  action: Action
): Promise<boolean> {
  const { role } = await checkUserAccess(userId, departmentId, userDepartmentId);
  return hasPermission(role, action);
}
