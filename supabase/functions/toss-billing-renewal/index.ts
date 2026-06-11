import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 토스페이먼츠 정기결제 갱신 (cron 호출용)
// current_period_end가 지난 active 구독을 빌링키로 자동 결제
// 호출: pg_cron 또는 외부 스케줄러에서 x-cron-key 헤더와 함께 POST
// ============================================================

const TOSS_API_BASE = 'https://api.tosspayments.com';

serve(async (req) => {
  try {
    // cron 비밀키 검증
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('x-cron-key') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
    }

    const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY');
    if (!TOSS_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'PAYMENT_NOT_CONFIGURED' }), { status: 500 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 갱신 대상: active + 빌링키 보유 + 기간 만료
    const { data: dueSubscriptions, error: queryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, company_id, billing_key, payment_customer_id, member_count, monthly_amount, card_company, card_number')
      .eq('status', 'active')
      .eq('payment_provider', 'tosspayments')
      .not('billing_key', 'is', null)
      .lte('current_period_end', new Date().toISOString());

    if (queryError) throw queryError;

    const basicAuth = `Basic ${btoa(`${TOSS_SECRET_KEY}:`)}`;
    const results: Array<{ subscriptionId: string; status: string }> = [];

    for (const sub of dueSubscriptions ?? []) {
      const orderId = `renew_${crypto.randomUUID().replace(/-/g, '').slice(0, 22)}`;
      const orderName = `베이직 플랜 (${sub.member_count}인) 월 구독 갱신`;

      try {
        const chargeRes = await fetch(`${TOSS_API_BASE}/v1/billing/${sub.billing_key}`, {
          method: 'POST',
          headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerKey: sub.payment_customer_id,
            amount: sub.monthly_amount,
            orderId,
            orderName,
          }),
        });

        const chargeData = await chargeRes.json();

        if (chargeRes.ok) {
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
            payment_key: chargeData.paymentKey ?? null,
            amount: sub.monthly_amount,
            status: 'DONE',
            method: chargeData.method ?? 'CARD',
            card_company: sub.card_company,
            card_number: sub.card_number,
            receipt_url: chargeData.receipt?.url ?? null,
            approved_at: chargeData.approvedAt ?? new Date().toISOString(),
          });

          results.push({ subscriptionId: sub.id, status: 'renewed' });
        } else {
          // 결제 실패 → past_due 전환 + 실패 기록
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
            failure_code: chargeData.code ?? null,
            failure_message: chargeData.message ?? null,
          });

          results.push({ subscriptionId: sub.id, status: 'failed' });
        }
      } catch (chargeError) {
        console.error(`구독 ${sub.id} 갱신 결제 오류:`, chargeError);
        results.push({ subscriptionId: sub.id, status: 'error' });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('toss-billing-renewal 오류:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), { status: 500 });
  }
});
