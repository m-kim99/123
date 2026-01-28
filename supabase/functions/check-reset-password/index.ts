import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '이메일을 입력해주세요' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Supabase 클라이언트 생성 (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. 해당 이메일의 사용자 조회
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Failed to list users:', listError);
      throw new Error('사용자 조회 실패');
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // 2. 사용자가 없는 경우 (보안상 동일한 메시지)
    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: '가입된 이메일이 맞다면 비밀번호 재설정 링크를 발송했습니다.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. OAuth 사용자 체크
    const provider = user.app_metadata?.provider || 'email';
    
    if (provider !== 'email') {
      // OAuth 사용자인 경우
      const providerNames: Record<string, string> = {
        google: 'Google',
        kakao: 'Kakao',
        naver: 'Naver',
        apple: 'Apple'
      };

      const providerDisplayName = providerNames[provider] || provider;

      return new Response(
        JSON.stringify({ 
          success: false,
          isOAuth: true,
          provider: providerDisplayName,
          message: `${providerDisplayName} 계정으로 가입하셨습니다. ${providerDisplayName} 로그인을 이용해주세요.` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. 이메일/비밀번호 사용자 - 재설정 링크 발송
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://traystorageconnect.com'}/reset-password`,
    });

    if (resetError) {
      console.error('Failed to send reset email:', resetError);
      throw new Error('재설정 링크 발송 실패');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: '비밀번호 재설정 링크를 이메일로 발송했습니다. 이메일을 확인해주세요.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
