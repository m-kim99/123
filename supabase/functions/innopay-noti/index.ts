import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 결제결과 통보(Noti) 수신 — 스펙 §10 (필수)
// 이노페이가 결제완료(status=25)/취소(status=85)를 form POST 로 통보.
// 처리 성공 시 정확히 "0000" 반환(다른 출력 금지) — 아니면 이노페이가 1분 간격 10회 재전송.
//
// 역할:
//  1) durable 로그 적재(분쟁 근거)
//  2) status=25: charge_moid 로 첫 결제를 상관지어 구독 활성화 백필(returnUrl 유실 대비)
//  3) status=85: 외부(상점관리) 취소를 payments 에 반영
// 이노페이(외부)가 호출 → --no-verify-jwt 배포. 게이트: shopCode/pgMid == INNOPAY_MID.
// ============================================================

const PLAN_GOODS_NAME: Record<string, string> = {
  basic: '베이직 플랜 월 구독',
  pro: '프로 플랜 월 구독',
};

const OK = () => new Response('0000', { status: 200, headers: { 'Content-Type': 'text/plain' } });
const RETRY = () => new Response('9999', { status: 200, headers: { 'Content-Type': 'text/plain' } });

serve(async (req) => {
  const INNOPAY_MID = Deno.env.get('INNOPAY_MID');

  // form-urlencoded 파싱
  let f: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) f[k] = typeof v === 'string' ? v : '';
  } catch {
    // 파싱 실패 — 재전송 받아도 동일하므로 0000 로 종료(재전송 폭주 방지), 로그만 남김
    console.error('innopay-noti: form 파싱 실패');
    return OK();
  }

  const shopCode = f.shopCode || '';
  const pgMid = f.pgMid || '';
  const status = f.status || '';
  const payMethod = f.payMethod || '';
  const moid = f.moid || '';
  const pgTid = f.pgTid || '';
  const billKey = f.billKey || '';
  const approvalAmt = f.approvalAmt || f.goodsAmt || '';

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // durable 로그 (best-effort — 실패해도 처리 계속)
  try {
    await supabaseAdmin.from('innopay_noti_log').insert({
      shop_code: shopCode || null,
      pg_tid: pgTid || null,
      moid: moid || null,
      status: status || null,
      pay_method: payMethod || null,
      bill_key: billKey || null,
      amount: approvalAmt ? Number(approvalAmt) : null,
      raw: f,
    });
  } catch (e) {
    console.error('innopay-noti: 로그 적재 실패', e);
  }

  // MID 게이트 — 우리 상점 통보가 아니면 무시(재전송 유발 않도록 0000)
  if (INNOPAY_MID && shopCode !== INNOPAY_MID && pgMid !== INNOPAY_MID) {
    console.warn('innopay-noti: MID 불일치, 무시', { shopCode, pgMid });
    return OK();
  }

  try {
    if (status === '25') {
      // ── 결제완료: 첫 결제(charge_moid) 백필 ──
      const { data: pending } = await supabaseAdmin
        .from('innopay_autopay_pending')
        .select('*')
        .eq('charge_moid', moid)
        .maybeSingle();

      // 우리 첫 결제가 아니거나(=갱신 등) 이미 완료면 로그만 남기고 종료
      if (!pending || pending.status === 'completed' || !billKey) {
        return OK();
      }

      // 멱등성: 이미 payments 에 기록됐으면 no-op
      const { data: existingPay } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('order_id', moid)
        .maybeSingle();
      if (existingPay) {
        await supabaseAdmin
          .from('innopay_autopay_pending')
          .update({ status: 'completed', bill_key: billKey })
          .eq('moid', pending.moid);
        return OK();
      }

      // 구독 활성화 백필
      const planName = pending.plan_name as string;
      const { data: planRow } = await supabaseAdmin
        .from('plans')
        .select('id')
        .eq('name', planName)
        .single();
      if (!planRow) {
        console.error('innopay-noti: 플랜 없음', planName);
        return RETRY();
      }

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const cardCompany = f.cardIssueName || f.cardAcquireName || null;
      const maskedCardNum = f.cardNo || null;

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
          console.error('innopay-noti: 구독 활성화 실패', insErr);
          return RETRY();
        }
        subscriptionId = newSub.id;
      }

      await supabaseAdmin.from('payments').insert({
        company_id: pending.company_id,
        subscription_id: subscriptionId,
        order_id: moid,
        payment_key: pgTid || null,
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
        .eq('moid', pending.moid);

      console.log('innopay-noti: 첫 결제 백필 완료', { moid, subscriptionId });
      return OK();
    }

    if (status === '85') {
      // ── 취소 통보: payments 반영(외부 상점관리 취소 동기화) ──
      const cancelTid = f.cancelPgTid || pgTid;
      if (cancelTid) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'CANCELED' })
          .eq('payment_key', cancelTid);
      }
      console.log('innopay-noti: 취소 통보 반영', { cancelTid, moid });
      return OK();
    }

    // 그 외 상태 — 로그만 남기고 정상 응답
    return OK();
  } catch (e) {
    console.error('innopay-noti: 처리 오류(재전송 유도)', e);
    return RETRY();
  }
});
