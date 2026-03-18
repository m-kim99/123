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

  // 인증 헤더 확인
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 사용자 세션 검증 (인증된 사용자만 푸시 발송 가능)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '유효하지 않은 세션입니다' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 서버 사이드 시크릿에서 키 읽기 (클라이언트에 절대 노출되지 않음)
    const APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!APP_ID || !REST_API_KEY) {
      return new Response(JSON.stringify({ error: 'OneSignal 서버 설정이 없습니다' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { playerIds, title, message, customUrl, imageUrl } = await req.json();

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return new Response(JSON.stringify({ error: '유효한 playerIds가 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dataParam = customUrl ? { custom_url: customUrl } : {};
    const payload: Record<string, unknown> = {
      app_id: APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      data: dataParam,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      large_icon: 'icon_96',
      small_icon: 'icon_48',
    };

    if (imageUrl) {
      payload.big_picture = imageUrl;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        Authorization: `Basic ${REST_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OneSignal 오류: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('푸시 발송 오류:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '알 수 없는 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
