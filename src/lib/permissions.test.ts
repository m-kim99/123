import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS, type Action, type Role } from '@/lib/permissions';

/**
 * 역할별 권한표는 UI 노출과 서버 정책이 함께 참조하는 값이라,
 * 무심코 한 줄 추가하면 권한이 조용히 넓어진다. 경계를 고정해 둔다.
 */
describe('hasPermission', () => {
  it('none 은 어떤 것도 할 수 없다', () => {
    const all: Action[] = ['read', 'write', 'upload', 'delete', 'download', 'share', 'print'];
    for (const a of all) {
      expect(hasPermission('none', a)).toBe(false);
    }
  });

  it('viewer 는 읽기 계열만 가능하고 쓰기·삭제·공유는 불가', () => {
    expect(hasPermission('viewer', 'read')).toBe(true);
    expect(hasPermission('viewer', 'download')).toBe(true);
    expect(hasPermission('viewer', 'print')).toBe(true);

    expect(hasPermission('viewer', 'write')).toBe(false);
    expect(hasPermission('viewer', 'upload')).toBe(false);
    expect(hasPermission('viewer', 'delete')).toBe(false);
    expect(hasPermission('viewer', 'share')).toBe(false);
  });

  it('editor 는 업로드·수정까지 되지만 삭제·공유는 불가', () => {
    expect(hasPermission('editor', 'upload')).toBe(true);
    expect(hasPermission('editor', 'write')).toBe(true);

    expect(hasPermission('editor', 'delete')).toBe(false);
    expect(hasPermission('editor', 'share')).toBe(false);
  });

  it('manager 는 전부 가능', () => {
    const all: Action[] = ['read', 'write', 'upload', 'delete', 'download', 'share', 'print'];
    for (const a of all) {
      expect(hasPermission('manager', a)).toBe(true);
    }
  });

  it('상위 역할은 하위 역할의 권한을 모두 포함한다', () => {
    const ladder: Role[] = ['none', 'viewer', 'editor', 'manager'];
    for (let i = 1; i < ladder.length; i++) {
      const lower = ROLE_PERMISSIONS[ladder[i - 1]];
      const higher = ROLE_PERMISSIONS[ladder[i]];
      for (const a of lower) {
        expect(higher).toContain(a);
      }
    }
  });
});
