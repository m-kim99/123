export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

export function validatePasswordClient(password: string): PasswordValidation {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  // 길이 검사
  if (password.length < 8) {
    errors.push('최소 8자 이상');
  }

  // 대문자 검사
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자 필요');
  }

  // 소문자 검사
  if (!/[a-z]/.test(password)) {
    errors.push('소문자 필요');
  }

  // 숫자 검사
  if (!/\d/.test(password)) {
    errors.push('숫자 필요');
  }

  // 특수문자 검사
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자 필요');
  }

  // 흔한 비밀번호 검사
  const commonPasswords = ['password', '12345678', 'qwerty', 'password123', 'admin123', '123456789'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('너무 흔한 비밀번호');
  }

  // 강도 계산
  const criteria = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
  ];
  const metCriteria = criteria.filter(Boolean).length;

  if (metCriteria >= 5 && password.length >= 12) {
    strength = 'strong';
  } else if (metCriteria >= 4) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors,
  };
}
