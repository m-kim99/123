import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 토스페이먼츠 빌링키 발급 + 첫 결제 승인
// 1) authKey → 빌링키 발급 (/v1/billing/authorizations/issue)
// 2) 빌링키로 첫 결제 승인 (/v1/billing/{billingKey})
// 3) subscriptions 활성화 + payments 기록
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRICE_PER_MEMBER = 3300;
const TOSS_API_BASE = 'https://api.tosspayments.com';

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
    const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY');
    if (!TOSS_SECRET_KEY) {
      console.error('TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const { authKey, customerKey, memberCount, amount } = await req.json();

    if (!authKey || !customerKey || !memberCount || !amount) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    const parsedMembers = Number(memberCount);
    const parsedAmount = Number(amount);

    // 금액 위변조 방지: 서버에서 재계산
    if (
      !Number.isInteger(parsedMembers) ||
      parsedMembers < 1 ||
      parsedAmount !== parsedMembers * PRICE_PER_MEMBER
    ) {
      return jsonResponse({ error: 'INVALID_AMOUNT' }, 400);
    }

    // 사용자 인증 (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    // customerKey는 결제 요청자 본인이어야 함
    if (customerKey !== user.id) {
      return jsonResponse({ error: 'CUSTOMER_KEY_MISMATCH' }, 403);
    }

    // service_role 클라이언트 (DB 쓰기)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // admin + 회사 소속 확인
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.company_id) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403);
    }

    const basicAuth = `Basic ${btoa(`${TOSS_SECRET_KEY}:`)}`;

    // 1. 빌링키 발급
    const issueRes = await fetch(`${TOSS_API_BASE}/v1/billing/authorizations/issue`, {
      method: 'POST',
      headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, customerKey }),
    });

    const issueData = await issueRes.json();
    if (!issueRes.ok) {
      console.error('빌링키 발급 실패:', issueData);
      return jsonResponse(
        { error: 'BILLING_KEY_ISSUE_FAILED', code: issueData.code, message: issueData.message },
        400,
      );
    }

    const billingKey: string = issueData.billingKey;
    const cardCompany: string | null = issueData.card?.issuerCode ?? issueData.cardCompany ?? null;
    const cardNumber: string | null = issueData.card?.number ?? issueData.cardNumber ?? null;

    // 2. 첫 결제 승인
    const orderId = `sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const orderName = `베이직 플랜 (${parsedMembers}인) 월 구독`;

    const chargeRes = await fetch(`${TOSS_API_BASE}/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey,
        amount: parsedAmount,
        orderId,
        orderName,
        customerEmail: profile.email ?? undefined,
      }),
    });

    const chargeData = await chargeRes.json();
    if (!chargeRes.ok) {
      console.error('첫 결제 승인 실패:', chargeData);
      return jsonResponse(
        { error: 'PAYMENT_FAILED', code: chargeData.code, message: chargeData.message },
        400,
      );
    }

    // 3. 구독 활성화
    const { data: basicPlan } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', 'basic')
      .single();

    if (!basicPlan) {
      console.error('basic 플랜을 찾을 수 없습니다.');
      return jsonResponse({ error: 'PLAN_NOT_FOUND' }, 500);
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscriptionFields = {
      plan_id: basicPlan.id,
      status: 'active',
      billing_cycle: 'monthly',
      payment_provider: 'tosspayments',
      payment_customer_id: customerKey,
      billing_key: billingKey,
      member_count: parsedMembers,
      monthly_amount: parsedAmount,
      card_company: cardCompany,
      card_number: cardNumber,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at: null,
    };

    // 기존 활성/체험 구독이 있으면 업데이트, 없으면 생성
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    let subscriptionId: string;
    if (existingSub) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionFields)
        .eq('id', existingSub.id);
      if (updateError) throw updateError;
      subscriptionId = existingSub.id;
    } else {
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({ company_id: profile.company_id, ...subscriptionFields })
        .select('id')
        .single();
      if (insertError || !newSub) throw insertError;
      subscriptionId = newSub.id;
    }

    // 4. 결제 내역 기록
    await supabaseAdmin.from('payments').insert({
      company_id: profile.company_id,
      subscription_id: subscriptionId,
      order_id: orderId,
      payment_key: chargeData.paymentKey ?? null,
      amount: parsedAmount,
      status: 'DONE',
      method: chargeData.method ?? 'CARD',
      card_company: cardCompany,
      card_number: cardNumber,
      receipt_url: chargeData.receipt?.url ?? null,
      approved_at: chargeData.approvedAt ?? new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      subscriptionId,
      orderId,
      amount: parsedAmount,
      memberCount: parsedMembers,
      cardCompany,
      cardNumber,
      nextBillingDate: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('toss-billing-confirm 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
