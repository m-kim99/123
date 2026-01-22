import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < POLICY.minLength) {
    errors.push(`최소 ${POLICY.minLength}자 이상이어야 합니다`);
  }

  if (POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('대문자를 포함해야 합니다');
  }

  if (POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('소문자를 포함해야 합니다');
  }

  if (POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('숫자를 포함해야 합니다');
  }

  if (POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다');
  }

  // 흔한 비밀번호 차단
  const commonPasswords = ['password', '12345678', 'qwerty', 'password123', 'admin123', '123456789'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('너무 흔한 비밀번호입니다');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    
    if (!password) {
      return new Response(
        JSON.stringify({ valid: false, errors: ['비밀번호를 입력해주세요'] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = validatePassword(password);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, errors: ['비밀번호 검증 중 오류가 발생했습니다'] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
