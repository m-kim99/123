import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이(INNOPAY) V2 결제 승인 + 구독 활성화
// 1) 결제창(goPay) 인증 성공 후 tid/paymentToken 수신
// 2) 이노페이 승인 API 호출 (Merchant-Key 서버 보관)
// 3) 승인 성공 시 subscriptions 활성화 + payments 기록
//
// 참고: 이노페이 정기결제(자동결제) API는 회원 전용 문서라 미적용.
//       현재는 1회성 결제(월 단위 수동 갱신) 구조이며, billing_key는 tid로 보관.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 유료 플랜 가격 정책 (부가세 포함) — 클라이언트 src/lib/payments.ts의 PLAN_PRICING과 동일하게 유지할 것
const PLAN_PRICING: Record<string, { pricePerMember: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, maxMembers: 3 }, // 베이직: 인당 6,600원, 최대 3인 (인원 추가 불가)
  pro: { pricePerMember: 15000, maxMembers: null }, // 프로: 인당 15,000원, 인원수 지정 가능
};
const INNOPAY_API_URL = 'https://api.innopay.co.kr/v1/transactions/pay';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface InnopayApproveResponse {
  success: boolean;
  data?: {
    mid: string;
    tid: string;
    moid: string;
    amt: number;
    status: number;
    authNum?: string;
    approvedAt?: string;
    receiptUrl?: string;
    card?: {
      acquCardName?: string;
      cardNum?: string;
      fnName?: string;
    };
  };
  resultCode?: string;
  resultMsg?: string;
  message?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
    const INNOPAY_MERCHANT_KEY = Deno.env.get('INNOPAY_MERCHANT_KEY');

    if (!INNOPAY_MID || !INNOPAY_MERCHANT_KEY) {
      console.error('이노페이 환경변수(INNOPAY_MID/INNOPAY_MERCHANT_KEY)가 설정되지 않았습니다.');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const { tid, paymentToken, moid, plan, customerKey, memberCount, amount } = await req.json();

    if (!tid || !paymentToken || !moid || !customerKey || !memberCount || !amount) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    // 구버전 클라이언트 호환: plan 미전달 시 basic으로 처리
    const planName = typeof plan === 'string' && plan in PLAN_PRICING ? plan : 'basic';
    const pricing = PLAN_PRICING[planName];

    const parsedMembers = Number(memberCount);
    const parsedAmount = Number(amount);

    // 금액/인원 위변조 방지 (베이직은 최대 3인)
    if (
      !Number.isInteger(parsedMembers) ||
      parsedMembers < 1 ||
      (pricing.maxMembers !== null && parsedMembers > pricing.maxMembers) ||
      parsedAmount !== parsedMembers * pricing.pricePerMember
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

    // 이노페이 승인 API 호출
    const approveRes = await fetch(INNOPAY_API_URL, {
      method: 'POST',
      headers: {
        'Payment-Token': paymentToken,
        'Merchant-Key': INNOPAY_MERCHANT_KEY,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        tid,
        mid: INNOPAY_MID,
        moid,
        amt: parsedAmount,
        taxFreeAmt: 0,
      }),
    });

    const approve = (await approveRes.json()) as InnopayApproveResponse;

    if (!approve.success || !approve.data) {
      console.error('이노페이 승인 실패:', approve);
      return jsonResponse(
        {
          error: 'INNOPAY_APPROVE_FAILED',
          code: approve.resultCode,
          message: approve.resultMsg || approve.message || '이노페이 승인 실패',
        },
        400,
      );
    }

    const approved = approve.data;

    // 승인 금액 재검증
    if (Number(approved.amt) !== parsedAmount) {
      console.error('승인 금액 불일치:', approved.amt, parsedAmount);
      return jsonResponse({ error: 'AMOUNT_MISMATCH' }, 400);
    }

    // 구독 활성화
    const { data: planRow } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', planName)
      .single();

    if (!planRow) {
      console.error(`${planName} 플랜을 찾을 수 없습니다.`);
      return jsonResponse({ error: 'PLAN_NOT_FOUND' }, 500);
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const orderId = approved.moid || moid;
    const cardCompany = approved.card?.fnName || approved.card?.acquCardName || null;
    const cardNumber = approved.card?.cardNum || null;

    const subscriptionFields = {
      plan_id: planRow.id,
      status: 'active',
      billing_cycle: 'monthly',
      payment_provider: 'innopay',
      payment_customer_id: customerKey,
      billing_key: approved.tid, // 1회성 결제: tid를 빌링 식별자로 보관
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

    // 결제 내역 기록
    await supabaseAdmin.from('payments').insert({
      company_id: profile.company_id,
      subscription_id: subscriptionId,
      order_id: orderId,
      payment_key: approved.tid,
      amount: parsedAmount,
      status: 'DONE',
      method: 'CARD',
      card_company: cardCompany,
      card_number: cardNumber,
      receipt_url: approved.receiptUrl || null,
      approved_at: approved.approvedAt
        ? new Date(approved.approvedAt).toISOString()
        : new Date().toISOString(),
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
    console.error('innopay-payment-confirm 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
