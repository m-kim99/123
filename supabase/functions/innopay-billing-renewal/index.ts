import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 정기결제 갱신 (cron 호출용)
// current_period_end가 지난 active 구독을 처리한다.
// 호출: pg_cron 또는 외부 스케줄러에서 x-cron-key 헤더와 함께 POST
//
// 처리 규칙
//  - canceled_at 있음        → status='canceled' 로 종료 (갱신하지 않음)
//  - canceled_at 없음 + 빌링키 → 이노페이 자동결제 API로 재결제 후 기간 연장
//
// [중요] 이노페이 '신용카드 자동결제 API'는 회원 전용(로그인) 문서라 정확한
//        엔드포인트/파라미터 스펙 미확보. 아래 chargeWithBillingKey()는 스펙 확보
//        전까지 비활성(미설정 시 past_due 처리)이며, 환경변수 INNOPAY_BILLING_API_URL이
//        설정되면 동작하도록 구조만 마련해 둔다. 실연동 시 요청 본문/헤더를 실제
//        스펙에 맞게 수정해야 한다. (레퍼런스: toss-billing-renewal)
// ============================================================

interface ChargeResult {
  ok: boolean;
  configured: boolean;
  paymentKey?: string | null;
  receiptUrl?: string | null;
  approvedAt?: string | null;
  code?: string | null;
  message?: string | null;
}

interface DueSubscription {
  id: string;
  company_id: string;
  billing_key: string | null;
  payment_customer_id: string | null;
  member_count: number | null;
  monthly_amount: number | null;
  card_company: string | null;
  card_number: string | null;
  canceled_at: string | null;
}

/**
 * 빌링키로 이노페이 자동결제(재결제) 요청.
 * 스펙 미확보 상태이므로 INNOPAY_BILLING_API_URL 미설정 시 configured=false 반환.
 */
async function chargeWithBillingKey(
  sub: DueSubscription,
  orderId: string,
  orderName: string,
): Promise<ChargeResult> {
  const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
  const INNOPAY_MERCHANT_KEY = Deno.env.get('INNOPAY_MERCHANT_KEY');
  const INNOPAY_BILLING_API_URL = Deno.env.get('INNOPAY_BILLING_API_URL');

  // 자동결제 API 스펙/엔드포인트 미설정 → 자동 재결제 보류
  if (!INNOPAY_BILLING_API_URL || !INNOPAY_MID || !INNOPAY_MERCHANT_KEY) {
    return {
      ok: false,
      configured: false,
      message: '이노페이 자동결제 API 미연동 (INNOPAY_BILLING_API_URL 등 미설정)',
    };
  }

  try {
    // TODO(이노페이 자동결제 API 스펙 확보 후 수정): 요청 본문/헤더를 실제 스펙에 맞춤.
    const res = await fetch(INNOPAY_BILLING_API_URL, {
      method: 'POST',
      headers: {
        'Merchant-Key': INNOPAY_MERCHANT_KEY,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        mid: INNOPAY_MID,
        billingKey: sub.billing_key,
        moid: orderId,
        goodsName: orderName,
        amt: sub.monthly_amount,
        buyerId: sub.payment_customer_id,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success) {
      const d = data.data ?? data;
      return {
        ok: true,
        configured: true,
        paymentKey: d.tid ?? null,
        receiptUrl: d.receiptUrl ?? null,
        approvedAt: d.approvedAt ?? null,
      };
    }

    return {
      ok: false,
      configured: true,
      code: data?.resultCode ?? null,
      message: data?.resultMsg ?? data?.message ?? '이노페이 자동결제 실패',
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      message: err instanceof Error ? err.message : '자동결제 호출 오류',
    };
  }
}

serve(async (req) => {
  try {
    // cron 비밀키 검증
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('x-cron-key') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 갱신 대상: 이노페이 active 구독 + 기간 만료
    const { data: dueSubscriptions, error: queryError } = await supabaseAdmin
      .from('subscriptions')
      .select(
        'id, company_id, billing_key, payment_customer_id, member_count, monthly_amount, card_company, card_number, canceled_at',
      )
      .eq('status', 'active')
      .eq('payment_provider', 'innopay')
      .lte('current_period_end', new Date().toISOString());

    if (queryError) throw queryError;

    const results: Array<{ subscriptionId: string; status: string }> = [];

    for (const sub of (dueSubscriptions ?? []) as DueSubscription[]) {
      // 1) 해지 예약된 구독 → 기간 만료 시 종료
      if (sub.canceled_at) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('id', sub.id);
        results.push({ subscriptionId: sub.id, status: 'canceled' });
        continue;
      }

      // 2) 빌링키 없는 구독 → 자동 갱신 불가 (수동 재결제 필요)
      if (!sub.billing_key) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id);
        results.push({ subscriptionId: sub.id, status: 'no_billing_key' });
        continue;
      }

      // 3) 자동결제 재결제
      const orderId = `innopay_renew_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
      const orderName = `베이직 플랜 (${sub.member_count ?? 0}인) 월 구독 갱신`;
      const charge = await chargeWithBillingKey(sub, orderId, orderName);

      if (charge.ok) {
        const periodStart = new Date();
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabaseAdmin
          .from('subscriptions')
          .update({
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('id', sub.id);

        await supabaseAdmin.from('payments').insert({
          company_id: sub.company_id,
          subscription_id: sub.id,
          order_id: orderId,
          payment_key: charge.paymentKey ?? null,
          amount: sub.monthly_amount,
          status: 'DONE',
          method: 'CARD',
          card_company: sub.card_company,
          card_number: sub.card_number,
          receipt_url: charge.receiptUrl ?? null,
          approved_at: charge.approvedAt ?? new Date().toISOString(),
        });

        results.push({ subscriptionId: sub.id, status: 'renewed' });
      } else {
        // 결제 실패(또는 미연동) → past_due 전환 + 실패 기록
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id);

        await supabaseAdmin.from('payments').insert({
          company_id: sub.company_id,
          subscription_id: sub.id,
          order_id: orderId,
          amount: sub.monthly_amount,
          status: 'FAILED',
          failure_code: charge.code ?? null,
          failure_message: charge.message ?? null,
        });

        results.push({
          subscriptionId: sub.id,
          status: charge.configured ? 'failed' : 'not_configured',
        });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('innopay-billing-renewal 오류:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), { status: 500 });
  }
});
