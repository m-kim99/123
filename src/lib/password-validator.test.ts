import { describe, it, expect } from 'vitest';
import { validatePasswordClient } from '@/lib/password-validator';

describe('validatePasswordClient', () => {
  it('모든 조건을 만족하면 통과', () => {
    const r = validatePasswordClient('Abcdef1!');
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('부족한 조건을 각각 알려준다', () => {
    expect(validatePasswordClient('Abc1!').errors).toContain('최소 8자 이상');
    expect(validatePasswordClient('abcdef1!').errors).toContain('대문자 필요');
    expect(validatePasswordClient('ABCDEF1!').errors).toContain('소문자 필요');
    expect(validatePasswordClient('Abcdefg!').errors).toContain('숫자 필요');
    expect(validatePasswordClient('Abcdefg1').errors).toContain('특수문자 필요');
  });

  it('흔한 비밀번호는 대소문자와 무관하게 거른다', () => {
    expect(validatePasswordClient('Password123').errors).toContain('너무 흔한 비밀번호');
    expect(validatePasswordClient('PASSWORD').errors).toContain('너무 흔한 비밀번호');
  });

  it('강도: 8자 5조건은 medium, 12자 이상 5조건이어야 strong', () => {
    expect(validatePasswordClient('Abcdef1!').strength).toBe('medium');
    expect(validatePasswordClient('Abcdefghij1!').strength).toBe('strong');
  });

  it('강도: 조건이 3개 이하면 weak', () => {
    expect(validatePasswordClient('abcdefgh').strength).toBe('weak');
  });

  it('빈 문자열은 통과하지 못한다', () => {
    const r = validatePasswordClient('');
    expect(r.isValid).toBe(false);
    expect(r.strength).toBe('weak');
  });
});
