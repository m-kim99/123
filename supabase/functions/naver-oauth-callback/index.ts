import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code) {
      throw new Error('Authorization code is required');
    }

    // 환경변수에서 네이버 Client ID/Secret 가져오기
    const NAVER_CLIENT_ID = Deno.env.get('NAVER_CLIENT_ID');
    const NAVER_CLIENT_SECRET = Deno.env.get('NAVER_CLIENT_SECRET');
    const NAVER_CALLBACK_URL = Deno.env.get('NAVER_CALLBACK_URL');

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET || !NAVER_CALLBACK_URL) {
      throw new Error('Naver OAuth credentials not configured');
    }

    // 1. 인가 코드로 액세스 토큰 교환
    const tokenResponse = await fetch(
      'https://nid.naver.com/oauth2.0/token?' +
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: NAVER_CLIENT_ID,
          client_secret: NAVER_CLIENT_SECRET,
          code: code,
          state: state || '',
        }),
      {
        method: 'GET',
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Naver token exchange failed:', errorText);
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Naver');
    }

    // 2. 액세스 토큰으로 사용자 정보 조회
    const userInfoResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Naver user info fetch failed:', errorText);
      throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
    }

    const userInfoData = await userInfoResponse.json();

    if (userInfoData.resultcode !== '00') {
      throw new Error(`Naver API error: ${userInfoData.message}`);
    }

    const naverUser = userInfoData.response;
    const naverEmail = naverUser.email;
    const naverName = naverUser.name || naverUser.nickname;
    const naverId = naverUser.id;

    if (!naverEmail) {
      throw new Error('Email not provided by Naver');
    }

    // 3. Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 4. auth.users에서 기존 사용자 확인 (이메일 기준)
    const { data: existingAuthUsers, error: authListError } = await supabase.auth.admin.listUsers();
    
    let existingAuthUser = null;
    if (!authListError && existingAuthUsers?.users) {
      existingAuthUser = existingAuthUsers.users.find((u: any) => u.email === naverEmail);
    }

    let userId: string;

    if (existingAuthUser) {
      // 기존 사용자 - auth.users에 이미 존재
      userId = existingAuthUser.id;
      console.log('Existing auth user found:', userId);

      // user_metadata에 naver 정보 업데이트
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingAuthUser.user_metadata,
          provider: 'naver',
          naver_id: naverId,
          name: naverName || existingAuthUser.user_metadata?.name,
        },
      });
    } else {
      // 새 사용자 생성 - auth.users에 사용자 생성
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: naverEmail,
        email_confirm: true,
        user_metadata: {
          name: naverName,
          provider: 'naver',
          naver_id: naverId,
        },
      });

      if (authError || !authUser.user) {
        console.error('Failed to create auth user:', authError);
        throw new Error(`Failed to create user: ${authError?.message}`);
      }

      userId = authUser.user.id;
      console.log('New auth user created:', userId);
    }

    // 5. public.users 테이블 확인 및 업데이트/생성
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!publicUser) {
      // public.users에 없으면 생성
      const { error: userInsertError } = await supabase.from('users').insert({
        id: userId,
        email: naverEmail,
        name: naverName,
        role: 'team', // 기본 역할
      });

      if (userInsertError) {
        console.error('Failed to insert user into public.users:', userInsertError);
        // 트리거가 이미 생성했을 수 있으므로 무시
      }
    }

    // 6. 매직 링크 생성하여 세션 토큰 반환
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: naverEmail,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate magic link:', linkError);
      throw new Error('Failed to create session link');
    }

    // 매직 링크에서 토큰 추출
    const magicLinkUrl = new URL(linkData.properties.action_link);
    const token = magicLinkUrl.searchParams.get('token');
    const type = magicLinkUrl.searchParams.get('type');

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: naverEmail,
        name: naverName,
        token,
        type,
        redirectUrl: linkData.properties.action_link,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Naver OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
