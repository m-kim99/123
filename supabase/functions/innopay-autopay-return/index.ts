import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 자동결제 웹링크(RAUT) 등록 결과 수신 (returnUrl)
// 이노페이 카드등록 완료 시 이 엔드포인트로 billKey 를 form-urlencoded POST.
// 1) resultCode/billKey 확인 + moid 로 등록 컨텍스트 조회
// 2) 발급된 빌키로 1회차 결제 승인(payAutoCardBill) — 실청구 성공이 billKey 진위 검증
// 3) 성공 시 subscriptions 활성화(auto_renew=true) + payments 기록
// 4) 클라이언트 결과 페이지로 302 리다이렉트
//
// 이 함수는 이노페이(외부)가 호출하므로 JWT 미검증으로 배포(--no-verify-jwt).
// 신뢰 경계: moid(서버 생성 랜덤) + userId 일치 + 실청구 성공. 위조 billKey는 청구 실패.
// [보강 여지] 이노페이 Noti(§10, 서버-투-서버)로 이중 확인 — Noti 규격 확보 시 추가.
// ============================================================

const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';

const PLAN_GOODS_NAME: Record<string, string> = {
  basic: '베이직 플랜 월 구독',
  pro: '프로 플랜 월 구독',
};

interface AutopayResponse {
  resultCode?: string;
  resultMsg?: string;
  tid?: string;
  appCardName?: string;
  acquCardName?: string;
  cardNum?: string;
}

async function callAutopay(path: string, body: Record<string, string>): Promise<AutopayResponse> {
  const res = await fetch(`${INNOPAY_AUTOPAY_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  try {
    return (await res.json()) as AutopayResponse;
  } catch {
    return { resultCode: `HTTP_${res.status}`, resultMsg: '이노페이 응답 해석 실패' };
  }
}

function redirect(origin: string, status: string, extra: Record<string, string> = {}): Response {
  const safeOrigin = /^https?:\/\/[^/]+$/.test(origin) ? origin : '';
  const q = new URLSearchParams({ status, ...extra });
  const location = `${safeOrigin}/billing/innopay/autopay-return?${q.toString()}`;
  return new Response(null, { status: 302, headers: { Location: location } });
}

serve(async (req) => {
  const url = new URL(req.url);
  const origin = url.searchParams.get('origin') || '';

  try {
    const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
    if (!INNOPAY_MID) return redirect(origin, 'error');

    // 이노페이는 form-urlencoded 로 POST (취소/닫기 이벤트도 여기로 옴)
    const form = await req.formData();
    const resultCode = String(form.get('resultCode') ?? form.get('ResultCode') ?? '');
    const billKey = String(form.get('billKey') ?? form.get('BillKey') ?? '');
    const moid = String(form.get('moid') ?? form.get('Moid') ?? '');
    const postedUserId = String(form.get('userId') ?? form.get('UserId') ?? '');

    if (!moid) return redirect(origin, 'cancel');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 등록 컨텍스트 조회
    const { data: pending } = await supabaseAdmin
      .from('innopay_autopay_pending')
      .select('*')
      .eq('moid', moid)
      .maybeSingle();

    if (!pending || pending.status !== 'pending') {
      return redirect(origin, 'error');
    }

    const markFailed = async () =>
      supabaseAdmin.from('innopay_autopay_pending').update({ status: 'failed' }).eq('moid', moid);

    // 등록 실패/취소
    if (resultCode !== '0000' || !billKey) {
      await markFailed();
      return redirect(origin, 'fail');
    }

    // userId 일치 검증 (하이픈 제거 형태)
    if (postedUserId && postedUserId !== pending.user_id.replace(/-/g, '')) {
      await markFailed();
      return redirect(origin, 'error');
    }

    // 결제자 정보
    const { data: buyer } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', pending.user_id)
      .maybeSingle();

    const planName = pending.plan_name as string;
    const innopayUserId = String(pending.user_id).replace(/-/g, '');

    // 1회차 결제 승인 — 실청구 성공이 billKey 진위 검증 역할
    const payMoid = `dmswp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const pay = await callAutopay('payAutoCardBill', {
      mid: INNOPAY_MID,
      moid: payMoid,
      buyerName: (buyer?.name as string) || '가맹회원',
      buyerEmail: (buyer?.email as string) || '',
      goodsName: PLAN_GOODS_NAME[planName] || PLAN_GOODS_NAME.basic,
      amt: String(pending.amount),
      billKey,
      userId: innopayUserId,
    });

    if (pay.resultCode !== '0000') {
      console.error('1회차 결제 실패:', pay.resultCode, pay.resultMsg);
      // 방금 등록된 빌키 정리 (best-effort)
      try {
        await callAutopay('delAutoCardBill', { mid: INNOPAY_MID, billKey, userId: innopayUserId });
      } catch { /* 무시 */ }
      await markFailed();
      return redirect(origin, 'fail', { code: String(pay.resultCode ?? '') });
    }

    // 구독 활성화
    const { data: planRow } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', planName)
      .single();
    if (!planRow) {
      console.error(`플랜 없음: ${planName} (결제 완료 tid: ${pay.tid})`);
      return redirect(origin, 'error');
    }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const cardCompany = pay.appCardName || pay.acquCardName || null;
    const maskedCardNum = pay.cardNum || null;

    const fields = {
      plan_id: planRow.id,
      status: 'active',
      billing_cycle: 'monthly',
      payment_provider: 'innopay',
      payment_customer_id: pending.user_id,
      billing_key: billKey,
      auto_renew: true,
      renewal_attempts: 0,
      last_renewal_attempt_at: null,
      member_count: pending.member_count,
      monthly_amount: pending.amount,
      card_company: cardCompany,
      card_number: maskedCardNum,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      canceled_at: null,
    };

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('company_id', pending.company_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let subscriptionId: string;
    if (existingSub) {
      await supabaseAdmin.from('subscriptions').update(fields).eq('id', existingSub.id);
      subscriptionId = existingSub.id;
    } else {
      const { data: newSub, error: insErr } = await supabaseAdmin
        .from('subscriptions')
        .insert({ company_id: pending.company_id, ...fields })
        .select('id')
        .single();
      if (insErr || !newSub) {
        console.error(`구독 활성화 실패 (결제 완료 tid: ${pay.tid}, billKey 발급됨):`, insErr);
        return redirect(origin, 'error');
      }
      subscriptionId = newSub.id;
    }

    await supabaseAdmin.from('payments').insert({
      company_id: pending.company_id,
      subscription_id: subscriptionId,
      order_id: payMoid,
      payment_key: pay.tid || null,
      amount: pending.amount,
      status: 'DONE',
      method: 'CARD',
      card_company: cardCompany,
      card_number: maskedCardNum,
      approved_at: new Date().toISOString(),
    });

    await supabaseAdmin
      .from('innopay_autopay_pending')
      .update({ status: 'completed', bill_key: billKey })
      .eq('moid', moid);

    return redirect(origin, 'success', { plan: planName });
  } catch (error) {
    console.error('innopay-autopay-return 오류:', error);
    return redirect(origin, 'error');
  }
});
