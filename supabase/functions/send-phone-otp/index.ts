import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  return digits;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, purpose } = await req.json();

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return json({ success: false, error: '휴대폰 번호를 확인해주세요.' }, { status: 400 });
    }

    const resolvedPurpose = (purpose || 'admin_signup') as string;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await sha256Hex(code);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { data: inserted, error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone: normalizedPhone,
        purpose: resolvedPurpose,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        send_count: 1,
        last_sent_at: new Date().toISOString(),
        verified_at: null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert phone_verifications:', insertError);
      throw new Error('OTP 저장 실패');
    }

    // 쏘다(SSODAA) SMS API 환경변수
    const SSODAA_TOKEN_KEY = Deno.env.get('SSODAA_TOKEN_KEY');
    const SSODAA_API_KEY = Deno.env.get('SSODAA_API_KEY');
    const SSODAA_SEND_PHONE = Deno.env.get('SSODAA_SEND_PHONE');

    if (!SSODAA_TOKEN_KEY || !SSODAA_API_KEY || !SSODAA_SEND_PHONE) {
      return json(
        {
          success: false,
          error: 'SMS 설정이 필요합니다. (SSODAA_TOKEN_KEY/SSODAA_API_KEY/SSODAA_SEND_PHONE)',
        },
        { status: 500 }
      );
    }

    const msg = `[TrayStorage CONNECT] 인증번호는 ${code} 입니다. (5분 유효)`;

    // 쏘다 API 호출
    console.log('=== 쏘다 API 호출 시작 ===');
    console.log('SSODAA_API_KEY:', SSODAA_API_KEY ? '설정됨' : '없음');
    console.log('SSODAA_TOKEN_KEY:', SSODAA_TOKEN_KEY ? '설정됨' : '없음');
    console.log('SSODAA_SEND_PHONE:', SSODAA_SEND_PHONE ? '설정됨' : '없음');
    console.log('dest_phone:', normalizedPhone);
    console.log('msg_body:', msg);

    const resp = await fetch('https://apis.ssodaa.com/sms/send/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-api-key': SSODAA_API_KEY,
      },
      body: JSON.stringify({
        token_key: SSODAA_TOKEN_KEY,
        msg_type: 'sms',
        dest_phone: normalizedPhone,
        send_phone: SSODAA_SEND_PHONE,
        msg_body: msg,
      }),
    });

    console.log('=== 쏘다 API 응답 ===');
    console.log('HTTP Status:', resp.status);
    console.log('Response OK:', resp.ok);

    const smsResult = await resp.json();
    console.log('Response Body:', JSON.stringify(smsResult, null, 2));

    if (!resp.ok) {
      console.error('SSODAA HTTP error:', { status: resp.status, body: smsResult });
      return json(
        {
          success: false,
          error: smsResult?.error || '문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 502 }
      );
    }

    if (smsResult.code !== '200') {
      console.error('SSODAA send failed:', smsResult);
      return json(
        {
          success: false,
          error: smsResult.error || '문자 발송에 실패했습니다.',
          provider: { code: smsResult.code, error: smsResult.error },
        },
        { status: 502 }
      );
    }

    return json({ success: true, verification_id: inserted.id, expires_in: 300 });
  } catch (error) {
    console.error('send-phone-otp error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, { status: 500 });
  }
});
