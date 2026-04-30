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
  return (raw || '').replace(/\D/g, '');
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
    const { phone, code, purpose } = await req.json();

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      return json({ success: false, error: '휴대폰 번호를 확인해주세요.' }, { status: 400 });
    }

    if (!code || String(code).length < 4) {
      return json({ success: false, error: '인증번호를 입력해주세요.' }, { status: 400 });
    }

    const resolvedPurpose = (purpose || 'admin_signup') as string;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: record, error: selectError } = await supabase
      .from('phone_verifications')
      .select('id, otp_hash, expires_at, attempts, verified_at')
      .eq('phone', normalizedPhone)
      .eq('purpose', resolvedPurpose)
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('Failed to select phone_verifications:', selectError);
      throw new Error('인증 정보를 확인할 수 없습니다');
    }

    if (!record) {
      return json({ success: false, error: '인증번호를 다시 요청해주세요.' }, { status: 404 });
    }

    if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
      return json({ success: false, error: '인증번호가 만료되었습니다. 재전송 해주세요.' }, { status: 400 });
    }

    const attempts = record.attempts ?? 0;
    if (attempts >= 5) {
      return json({ success: false, error: '시도 횟수를 초과했습니다. 재전송 해주세요.' }, { status: 429 });
    }

    const providedHash = await sha256Hex(String(code));
    const ok = providedHash === record.otp_hash;

    if (!ok) {
      await supabase
        .from('phone_verifications')
        .update({ attempts: attempts + 1 })
        .eq('id', record.id);

      return json({ success: false, error: '인증번호가 올바르지 않습니다.' }, { status: 400 });
    }

    const verifiedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ verified_at: verifiedAt })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to update phone_verifications:', updateError);
      throw new Error('인증 처리에 실패했습니다');
    }

    return json({ success: true, verified_at: verifiedAt });
  } catch (error) {
    console.error('verify-phone-otp error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, { status: 500 });
  }
});
