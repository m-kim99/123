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

const OK = () => new Response('0000', { status: 200, headers: { 'Content-Type': 'text/plain' } });
const RETRY = () => new Response('9999', { status: 200, headers: { 'Content-Type': 'text/plain' } });

/** +1개월 — JS setMonth 오버플로(1/31→3/3) 대신 말일로 클램프 (SQL interval '1 month' 와 동일 의미) */
function addOneMonthClamped(d: Date): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, lastDay));
  return r;
}

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

  // durable 로그 (best-effort — 실패해도 처리 계속).
  // billKey 는 청구에 쓰이는 민감값이라 로그에는 남기지 않는다(마스킹) —
  // 분쟁 대사는 tid/moid/금액으로 충분하고, 실제 빌키는 subscriptions 에만 보관.
  const rawSafe: Record<string, string> = { ...f };
  if (rawSafe.billKey) rawSafe.billKey = '(redacted)';
  if (rawSafe.BillKey) rawSafe.BillKey = '(redacted)';
  try {
    await supabaseAdmin.from('innopay_noti_log').insert({
      shop_code: shopCode || null,
      pg_tid: pgTid || null,
      moid: moid || null,
      status: status || null,
      pay_method: payMethod || null,
      bill_key: billKey ? '(redacted)' : null,
      amount: approvalAmt ? Number(approvalAmt) : null,
      raw: rawSafe,
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

      // 우리 첫 결제가 아니거나(=갱신 등) 이미 완료면 로그만 남기고 종료.
      // 'failed'(등록 실패/청구 실패로 종결)도 제외 — 뒤늦은 통보로 미결제 건이
      // active 로 되살아나는 것을 막는다.
      if (!pending || pending.status === 'completed' || pending.status === 'failed' || !billKey) {
        return OK();
      }

      // 금액 일치 확인 — 통보가 우리 대기건과 같은 금액이어야 한다.
      // (금액 필드가 없는 통보는 기존 동작대로 통과시키고, '있는데 다른' 경우만 차단)
      if (approvalAmt) {
        const notified = Number(String(approvalAmt).replace(/[^0-9]/g, ''));
        if (Number.isFinite(notified) && notified !== Number(pending.amount)) {
          console.error('innopay-noti: 금액 불일치 — 백필 중단', {
            moid,
            notified,
            expected: pending.amount,
          });
          return OK();
        }
      }

      // 리턴 핸들러가 방금 클레임한 건이면 백필하지 않는다 — 둘 다 살아있는 상태에서
      // 동시 반영되면 결제 1건에 구독 기간이 이중 연장된다. 유예 중에는 9999로
      // 재전송(1분 간격 10회)을 유도하고, 리턴이 죽어 3분이 지난 재전송분만 백필한다.
      if (pending.status === 'charging' && pending.charging_at) {
        const claimedAgoMs = Date.now() - new Date(pending.charging_at as string).getTime();
        if (claimedAgoMs < 3 * 60 * 1000) return RETRY();
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

      // 기존 구독(체험 포함) — 잔여 기간을 이어붙이기 위해 만료일까지 함께 조회
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, current_period_end')
        .eq('company_id', pending.company_id)
        .in('status', ['active', 'trialing', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 잔여 기간이 남아 있으면 그 만료일부터 유료 기간 시작 (innopay-autopay-return 과 동일 규칙)
      const now = new Date();
      const existingEnd = existingSub?.current_period_end
        ? new Date(existingSub.current_period_end as string)
        : null;
      const periodStart = existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
      const periodEnd = addOneMonthClamped(periodStart);
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

      const { error: payInsErr } = await supabaseAdmin.from('payments').insert({
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
      if (payInsErr) {
        console.error('innopay-noti: payments 기록 실패 (수동 대사 필요)', { moid, pgTid }, payInsErr);
      }

      await supabaseAdmin
        .from('innopay_autopay_pending')
        .update({ status: 'completed', bill_key: billKey })
        .eq('moid', pending.moid);

      console.log('innopay-noti: 첫 결제 백필 완료', { moid, subscriptionId });
      return OK();
    }

    if (status === '85') {
      // ── 취소 통보: payments 반영(외부 상점관리 취소 동기화) ──
      // 이 엔드포인트는 공개(--no-verify-jwt)이고 이노페이 통보에 서명이 없으므로,
      // 거래번호(tid)와 주문번호(moid)가 '동시에' 일치하는 우리 결제건만 반영한다.
      // (둘 중 하나만 아는 위조 요청으로 임의 결제를 취소 처리하지 못하게 함)
      // payments.payment_key 에는 이노페이 `tid`(가맹점 거래번호)가 저장된다.
      // 취소 통보에는 tid 외에 pgTid/cancelPgTid(PG 내부 번호)도 함께 오는데,
      // 이 둘은 payment_key 와 형식이 달라 매칭되지 않는다 — tid 를 우선으로 두고
      // 나머지는 보조 후보로만 쓴다. (tid 로만 매칭하던 것이 아니라 pgTid 로만
      // 매칭해서 실제 취소 통보가 통째로 무시된 사례가 있었다.)
      const tidCandidates = [f.tid, f.cancelPgTid, pgTid].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );
      if (tidCandidates.length === 0 || !moid) {
        console.warn('innopay-noti: 취소 통보에 tid/moid 누락 — 무시', { tidCandidates, moid });
        return OK();
      }

      // moid + tid 후보 중 하나가 동시에 일치해야만 반영 (위조 요청 차단 조건 유지)
      const { data: pay } = await supabaseAdmin
        .from('payments')
        .select('id, amount, cancel_amount, status, cancel_num')
        .in('payment_key', tidCandidates)
        .eq('order_id', moid)
        .maybeSingle();

      if (!pay) {
        console.warn('innopay-noti: 일치하는 결제 없음 — 무시', { tidCandidates, moid });
        return OK();
      }
      if (pay.status === 'CANCELED') return OK(); // 멱등 (전액 취소 후 재전송)

      // 부분 취소는 status 가 'DONE' 으로 남으므로 위 가드로는 재전송을 못 거른다.
      // 이노페이 취소번호(cancelNum)로 "이 취소 건"의 멱등성을 따로 확인한다 —
      // 없으면 재전송마다 cancel_amount 가 누적돼 부분취소가 전액취소로 부풀어 오른다.
      const cancelNum = f.cancelNum || '';
      if (cancelNum && pay.cancel_num === cancelNum) {
        console.log('innopay-noti: 이미 반영된 취소번호 — 무시', { cancelNum, moid });
        return OK();
      }

      const paidAmount = Number(pay.amount);
      const reported = Number(f.cancelApprovalAmt || f.cancelAmt || approvalAmt);
      const thisCancel = Number.isFinite(reported) && reported > 0 ? reported : paidAmount;
      const totalCanceled = Math.min(paidAmount, Number(pay.cancel_amount ?? 0) + thisCancel);

      await supabaseAdmin
        .from('payments')
        .update({
          status: totalCanceled >= paidAmount ? 'CANCELED' : 'DONE',
          cancel_amount: totalCanceled,
          cancel_reason: f.cancelMsg || '이노페이 취소 통보',
          cancel_num: cancelNum || null,
          canceled_at: new Date().toISOString(),
        })
        .eq('id', pay.id);

      console.log('innopay-noti: 취소 통보 반영', { tidCandidates, cancelNum, moid, totalCanceled });
      return OK();
    }

    // 그 외 상태 — 로그만 남기고 정상 응답
    return OK();
  } catch (e) {
    console.error('innopay-noti: 처리 오류(재전송 유도)', e);
    return RETRY();
  }
});
