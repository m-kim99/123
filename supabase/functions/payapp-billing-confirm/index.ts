import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// PayApp 정기결제 완료 확인 (결제 성공 후 구독 활성화)
// 1) rebill_no + mul_no로 결제 완료 확인
// 2) subscriptions 활성화 + payments 기록
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { rebillNo, mul_no, customerKey, memberCount, amount } = await req.json();

    if (!rebillNo || !customerKey || !memberCount || !amount) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    const parsedMembers = Number(memberCount);
    const parsedAmount = Number(amount);

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

    // service_role 클라이언트
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

    // pending rebill 확인
    const { data: pendingRebill } = await supabaseAdmin
      .from('payapp_pending_rebills')
      .select('*')
      .eq('customer_key', customerKey)
      .eq('rebill_no', rebillNo)
      .single();

    if (!pendingRebill) {
      return jsonResponse({ error: 'REBILL_NOT_FOUND' }, 404);
    }

    // 구독 활성화
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

    const orderId = `payapp_${rebillNo}_${Date.now()}`;

    const subscriptionFields = {
      plan_id: basicPlan.id,
      status: 'active',
      billing_cycle: 'monthly',
      payment_provider: 'payapp',
      payment_customer_id: customerKey,
      billing_key: rebillNo, // PayApp의 rebill_no를 빌링키로 저장
      member_count: parsedMembers,
      monthly_amount: parsedAmount,
      card_company: null,
      card_number: null,
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

    // 결제 내역 기록
    await supabaseAdmin.from('payments').insert({
      company_id: profile.company_id,
      subscription_id: subscriptionId,
      order_id: orderId,
      payment_key: mul_no || null, // PayApp의 mul_no
      amount: parsedAmount,
      status: 'DONE',
      method: 'CARD',
      card_company: null,
      card_number: null,
      receipt_url: null,
      approved_at: new Date().toISOString(),
    });

    // pending 삭제
    await supabaseAdmin
      .from('payapp_pending_rebills')
      .delete()
      .eq('customer_key', customerKey)
      .eq('rebill_no', rebillNo);

    return jsonResponse({
      success: true,
      subscriptionId,
      orderId,
      amount: parsedAmount,
      memberCount: parsedMembers,
      cardCompany: null,
      cardNumber: null,
      nextBillingDate: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('payapp-billing-confirm 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
