import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// PayApp 정기결제 등록 요청
// 1) 사용자 인증
// 2) PayApp rebillRegist API 호출
// 3) payurl 반환 → 클라이언트에서 리다이렉트
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_PER_MEMBER = 3300;
const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const PAYAPP_USERID = Deno.env.get('PAYAPP_USERID');
    const PAYAPP_LINKKEY = Deno.env.get('PAYAPP_LINKKEY');
    const PAYAPP_LINKVAL = Deno.env.get('PAYAPP_LINKVAL');
    const SITE_URL = Deno.env.get('SITE_URL') || 'https://your-site.com';

    if (!PAYAPP_USERID || !PAYAPP_LINKKEY || !PAYAPP_LINKVAL) {
      console.error('PayApp 환경변수가 설정되지 않았습니다.');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const { customerKey, customerEmail, customerName, customerPhone, memberCount, amount } =
      await req.json();

    if (!customerKey || !customerPhone || !memberCount || !amount) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    const parsedMembers = Number(memberCount);
    const parsedAmount = Number(amount);

    // 금액 위변조 방지
    if (
      !Number.isInteger(parsedMembers) ||
      parsedMembers < 1 ||
      parsedAmount !== parsedMembers * PRICE_PER_MEMBER
    ) {
      return jsonResponse({ error: 'INVALID_AMOUNT' }, 400);
    }

    // 사용자 인증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    if (customerKey !== user.id) {
      return jsonResponse({ error: 'CUSTOMER_KEY_MISMATCH' }, 403);
    }

    // admin + 회사 소속 확인
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.company_id) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403);
    }

    // PayApp 정기결제 등록 요청
    const formData = new URLSearchParams();
    formData.append('cmd', 'rebillRegist');
    formData.append('userid', PAYAPP_USERID);
    formData.append('linkkey', PAYAPP_LINKKEY);
    formData.append('linkval', PAYAPP_LINKVAL);
    formData.append('goodname', `베이직 플랜 (${parsedMembers}인) 월 구독`);
    formData.append('goodprice', String(parsedAmount));
    formData.append('recvphone', customerPhone.replace(/-/g, ''));
    formData.append('rebillCycleType', 'Month');
    formData.append('rebillCycleMonth', '1'); // 매월 1일 결제 (또는 가입일 기준)
    formData.append('rebillExpire', '99991231'); // 무기한 (취소 시까지)
    formData.append(
      'feedbackurl',
      `${SITE_URL}/api/payapp-webhook?customerKey=${customerKey}&members=${parsedMembers}&amount=${parsedAmount}`,
    );
    formData.append(
      'returnurl',
      `${SITE_URL}/billing/payapp/success?customerKey=${customerKey}&members=${parsedMembers}&amount=${parsedAmount}`,
    );
    formData.append(
      'closeurl',
      `${SITE_URL}/billing/fail?provider=payapp`,
    );
    if (customerEmail) formData.append('buyeremail', customerEmail);
    if (customerName) formData.append('buyername', customerName);

    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const responseText = await response.text();
    const result = Object.fromEntries(new URLSearchParams(responseText));

    if (result.state !== '1' || !result.payurl) {
      console.error('PayApp 정기결제 등록 실패:', result);
      return jsonResponse(
        {
          error: 'PAYAPP_REGIST_FAILED',
          code: result.errno,
          message: result.errorMessage || 'PayApp 등록 실패',
        },
        400,
      );
    }

    // rebill_no 저장 (추후 확인용)
    await supabaseAdmin.from('payapp_pending_rebills').upsert({
      customer_key: customerKey,
      company_id: profile.company_id,
      rebill_no: result.rebill_no,
      member_count: parsedMembers,
      amount: parsedAmount,
      created_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      payurl: decodeURIComponent(result.payurl),
      rebill_no: result.rebill_no,
    });
  } catch (error) {
    console.error('payapp-billing-request 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
