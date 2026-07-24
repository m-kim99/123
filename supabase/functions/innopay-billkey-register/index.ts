import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 자동결제(빌키) 등록 + 1회차 결제 + 구독 활성화
// 1) regAutoCardBill (즉시등록, arsUseYn=N) — 카드정보로 빌키 발급
//    (PG가 유효성 확인용 10원 승인 후 즉시 자동취소 — 실청구 없음)
// 2) payAutoCardBill — 발급된 빌키로 1회차 결제 승인
// 3) 성공 시 subscriptions 활성화(auto_renew=true) + payments 기록
//    이후 매월 갱신은 innopay-billing-renewal 크론이 같은 빌키로 자동 청구.
//
// [주의] 카드정보(cardNum/cardExpire/cardPwd/idNum)는 이노페이 전달 외
//        어디에도 저장/로깅하지 않는다.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 유료 플랜 가격 정책 (부가세 포함) — 클라이언트 src/lib/payments.ts의 PLAN_PRICING과 동일하게 유지할 것
const PLAN_PRICING: Record<string, { pricePerMember: number; minMembers: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, minMembers: 1, maxMembers: 3 }, // 베이직: 인당 6,600원, 최대 3인 (인원 추가 불가)
  pro: { pricePerMember: 15000, minMembers: 3, maxMembers: null }, // 프로: 인당 15,000원, 최소 3인부터 인원수 지정
};

const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface AutopayResponse {
  resultCode?: string;
  resultMsg?: string;
  billKey?: string;
  tid?: string;
  authCode?: string;
  authDate?: string;
  appCardName?: string;
  acquCardName?: string;
  cardNum?: string;
  amt?: string;
  moid?: string;
}

/** 이노페이 자동결제 API 호출 (등록/승인/삭제 공통) — 응답 파싱 실패도 실패 코드로 정규화 */
async function callAutopay(path: string, body: Record<string, string>): Promise<AutopayResponse> {
  const res = await fetch(`${INNOPAY_AUTOPAY_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  try {
    return (await res.json()) as AutopayResponse;
  } catch {
    return { resultCode: `HTTP_${res.status}`, resultMsg: '이노페이 응답을 해석할 수 없습니다.' };
  }
}

/** 주문번호 생성 — 이노페이 moid는 영숫자(AN) 40자 이하 */
function makeMoid(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
    if (!INNOPAY_MID) {
      console.error('이노페이 환경변수(INNOPAY_MID)가 설정되지 않았습니다.');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const {
      plan,
      customerKey,
      customerEmail,
      customerName,
      customerPhone,
      memberCount,
      amount,
      goodsName,
      cardNum,
      cardExpire,
      cardPwd,
      idNum,
    } = await req.json();

    if (!customerKey || !customerName || !memberCount || !amount || !goodsName) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    // 카드정보 형식 검증 (값은 로그/응답에 절대 노출하지 않음)
    if (
      typeof cardNum !== 'string' || !/^\d{15,16}$/.test(cardNum) ||
      typeof cardExpire !== 'string' || !/^\d{2}(0[1-9]|1[0-2])$/.test(cardExpire) || // YYMM
      typeof cardPwd !== 'string' || !/^\d{2}$/.test(cardPwd) ||
      typeof idNum !== 'string' || !/^(\d{6}|\d{10})$/.test(idNum)
    ) {
      return jsonResponse({ error: 'INVALID_CARD_INFO' }, 400);
    }

    // 구버전 클라이언트 호환: plan 미전달 시 basic으로 처리
    const planName = typeof plan === 'string' && plan in PLAN_PRICING ? plan : 'basic';
    const pricing = PLAN_PRICING[planName];

    const parsedMembers = Number(memberCount);
    const parsedAmount = Number(amount);

    // 금액/인원 위변조 방지 (베이직은 최대 3인, 프로는 최소 3인)
    if (
      !Number.isInteger(parsedMembers) ||
      parsedMembers < pricing.minMembers ||
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

    // 정산 원칙(true-up): 결제 인원은 현재 회사 인원 수 이상이어야 함
    const { count: actualMemberCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);

    if ((actualMemberCount ?? 0) > parsedMembers) {
      return jsonResponse(
        {
          error: 'MEMBER_COUNT_BELOW_ACTUAL',
          message: `결제 인원(${parsedMembers}명)이 현재 팀원 수(${actualMemberCount}명)보다 적습니다.`,
        },
        400,
      );
    }

    // 기존 구독 조회 — 빌키 교체(카드 변경) 및 업데이트 대상 확인
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, billing_key, auto_renew')
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 이노페이 빌키 파라미터의 userId — 영숫자만 허용이라 UUID 하이픈 제거
    const innopayUserId = user.id.replace(/-/g, '');
    const buyerEmail = customerEmail || profile.email || '';
    const buyerHp = typeof customerPhone === 'string' ? customerPhone.replace(/\D/g, '') : '';

    // 1) 빌키 발급 (즉시등록) — 기존 빌키가 있으면 전달 시 삭제 후 재등록됨(카드 변경)
    const prevBillKey =
      existingSub?.auto_renew && typeof existingSub.billing_key === 'string'
        ? existingSub.billing_key
        : '';

    const reg = await callAutopay('regAutoCardBill', {
      mid: INNOPAY_MID,
      moid: makeMoid('dmsr'),
      buyerName: customerName,
      buyerHp,
      buyerEmail,
      userId: innopayUserId,
      cardNum,
      cardExpire,
      cardPwd,
      idNum,
      arsUseYn: 'N',
      arsConnType: '02',
      billKey: prevBillKey,
    });

    if (reg.resultCode !== '0000' || !reg.billKey) {
      console.error('이노페이 빌키 등록 실패:', reg.resultCode, reg.resultMsg);
      return jsonResponse(
        {
          error: 'INNOPAY_REG_FAILED',
          code: reg.resultCode,
          message: reg.resultMsg || '카드 등록에 실패했습니다.',
        },
        400,
      );
    }

    const billKey = reg.billKey;

    // 2) 1회차 결제 승인
    const payMoid = makeMoid('dmsp');
    const pay = await callAutopay('payAutoCardBill', {
      mid: INNOPAY_MID,
      moid: payMoid,
      buyerName: customerName,
      buyerHp,
      buyerEmail,
      goodsName: String(goodsName).slice(0, 40),
      amt: String(parsedAmount),
      billKey,
      userId: innopayUserId,
    });

    if (pay.resultCode !== '0000') {
      console.error('이노페이 1회차 결제 실패:', pay.resultCode, pay.resultMsg);
      // 결제 실패 시 방금 발급한 빌키 정리 (best-effort)
      try {
        await callAutopay('delAutoCardBill', { mid: INNOPAY_MID, billKey, userId: innopayUserId });
      } catch {
        // 삭제 실패는 무시 — 다음 등록 시 billKey 교체로 정리됨
      }
      return jsonResponse(
        {
          error: 'INNOPAY_PAY_FAILED',
          code: pay.resultCode,
          message: pay.resultMsg || '결제 승인에 실패했습니다.',
        },
        400,
      );
    }

    // 3) 구독 활성화 (이후 DB 오류 시 결제는 완료된 상태 — tid 로그로 수동 대사 가능)
    const { data: planRow } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', planName)
      .single();

    if (!planRow) {
      console.error(`${planName} 플랜을 찾을 수 없습니다. (결제 완료 tid: ${pay.tid})`);
      return jsonResponse({ error: 'PLAN_NOT_FOUND' }, 500);
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const cardCompany = pay.appCardName || pay.acquCardName || null;
    const maskedCardNum = pay.cardNum || null; // PG가 반환한 마스킹 카드번호만 저장

    const subscriptionFields = {
      plan_id: planRow.id,
      status: 'active',
      billing_cycle: 'monthly',
      payment_provider: 'innopay',
      payment_customer_id: customerKey,
      billing_key: billKey,
      auto_renew: true,
      renewal_attempts: 0,
      last_renewal_attempt_at: null,
      member_count: parsedMembers,
      monthly_amount: parsedAmount,
      card_company: cardCompany,
      card_number: maskedCardNum,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at: null,
    };

    let subscriptionId: string;
    try {
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
    } catch (dbError) {
      console.error(`구독 활성화 DB 오류 (결제 완료 tid: ${pay.tid}, billKey 발급됨):`, dbError);
      return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
    }

    // 결제 내역 기록
    await supabaseAdmin.from('payments').insert({
      company_id: profile.company_id,
      subscription_id: subscriptionId,
      order_id: payMoid,
      payment_key: pay.tid || null,
      amount: parsedAmount,
      status: 'DONE',
      method: 'CARD',
      card_company: cardCompany,
      card_number: maskedCardNum,
      approved_at: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      subscriptionId,
      orderId: payMoid,
      amount: parsedAmount,
      memberCount: parsedMembers,
      cardCompany,
      cardNumber: maskedCardNum,
      nextBillingDate: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error('innopay-billkey-register 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
