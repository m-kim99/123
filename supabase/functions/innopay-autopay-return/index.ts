import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 자동결제 웹링크(RAUT) 등록 결과 수신 (returnUrl)
// 이노페이 카드등록 완료 시 이 엔드포인트로 billKey 를 form-urlencoded POST.
// 1) resultCode/billKey 확인 + moid 로 등록 컨텍스트 조회
// 2) 청구 시점 분기 — 남은 무료 체험/이용 기간이 있으면 즉시 청구하지 않는다:
//    [예약] 기간이 남음 → 빌키만 저장 + scheduled_*(플랜·좌석·금액) 예약.
//           기간 만료일에 innopay-billing-renewal 크론이 첫 결제 + 유료 전환.
//    [즉시] 기간이 없음(만료·past_due·구독 없음) → payAutoCardBill 1회차 승인 후
//           subscriptions 활성화(auto_renew=true) + payments 기록.
// 3) 클라이언트 결과 페이지로 302 리다이렉트 (예약이면 scheduledAt 동봉)
//
// 이 함수는 이노페이(외부)가 호출하므로 JWT 미검증으로 배포(--no-verify-jwt).
// 신뢰 경계: moid(서버 생성 랜덤) + userId 일치 + 실청구 성공. 위조 billKey는 청구 실패.
// [보강 여지] 이노페이 Noti(§10, 서버-투-서버)로 이중 확인 — Noti 규격 확보 시 추가.
// ============================================================

const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';

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

// 리다이렉트 허용 오리진 화이트리스트 — 임의 도메인으로 튕기는 오픈 리다이렉트(피싱) 차단.
// 앱(Capacitor)도 프로덕션 URL을 로드하므로 동일 오리진을 쓴다.
const DEFAULT_ORIGIN = 'https://traystorageconnect.com';
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/(www\.)?traystorageconnect\.com$/i,
  /^https:\/\/[a-z0-9-]+(--[a-z0-9-]+)?\.netlify\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function resolveAllowedOrigin(origin: string): string {
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin)) ? origin : DEFAULT_ORIGIN;
}

function redirect(origin: string, status: string, extra: Record<string, string> = {}): Response {
  const safeOrigin = resolveAllowedOrigin(origin);
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

    if (!pending) return redirect(origin, 'error');

    // 멱등: 이미 처리된 등록건은 현재 상태로 응답 (Noti/재전송/새로고침 대비)
    if (pending.status === 'completed') {
      // charge_moid 가 없으면 예약 등록이었으므로 첫 결제일을 다시 안내한다
      // (청구 완료로 오인되는 문구를 보여주지 않기 위함)
      if (!pending.charge_moid) {
        const { data: schedSub } = await supabaseAdmin
          .from('subscriptions')
          .select('current_period_end')
          .eq('company_id', pending.company_id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const schedEnd = schedSub?.current_period_end as string | null | undefined;
        if (schedEnd && new Date(schedEnd).getTime() > Date.now()) {
          return redirect(origin, 'success', {
            plan: String(pending.plan_name),
            scheduledAt: schedEnd,
          });
        }
      }
      return redirect(origin, 'success', { plan: String(pending.plan_name) });
    }
    if (pending.status === 'failed') return redirect(origin, 'fail');
    if (pending.status === 'charging') return redirect(origin, 'processing');

    const failPending = () =>
      supabaseAdmin
        .from('innopay_autopay_pending')
        .update({ status: 'failed' })
        .eq('moid', moid)
        .neq('status', 'completed');

    // 등록 실패/취소로 복귀한 경우
    if (resultCode !== '0000' || !billKey) {
      await failPending();
      return redirect(origin, 'fail');
    }

    // userId 일치 검증 (하이픈 제거 형태)
    if (postedUserId && postedUserId !== String(pending.user_id).replace(/-/g, '')) {
      await failPending();
      return redirect(origin, 'error');
    }

    const planName = pending.plan_name as string;

    // 전환될 플랜이 실제로 존재하는지 먼저 확인 — 예약 경로에서는 갱신 크론이
    // 이 이름으로 plan_id 를 찾아 전환하므로, 없는 이름을 저장하면 전환이 막힌다.
    const { data: planRow } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('name', planName)
      .single();
    if (!planRow) {
      console.error(`플랜 없음: ${planName} — 청구 전에 중단`);
      await failPending();
      return redirect(origin, 'error');
    }

    // ── 청구 시점 결정 (반드시 청구/클레임 '전'에) ──
    // 무료 체험이나 이미 결제한 기간이 남아 있으면 그 기간을 먼저 소진하고
    // 종료일에 첫 결제가 나가도록 예약한다(즉시 청구 금지 — 회사 정책).
    // 남은 기간이 없으면(만료·past_due·구독 없음) 지금 청구해야 서비스가 열린다.
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('company_id', pending.company_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const existingEnd = existingSub?.current_period_end
      ? new Date(existingSub.current_period_end as string)
      : null;
    const remainingEnd =
      existingSub && existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : null;

    // ── 원자적 클레임: pending → charging (동시 2회 POST 이중청구 차단) ──
    // charge_moid도 여기서 확정 저장 → Noti(status=25)가 이 moid로 첫 결제를 상관지어 백필.
    // charging_at 은 Noti 백필 유예(3분) 판단 기준 — 이 핸들러 생존 중 동시 백필 차단.
    // charge_moid 는 innopay-noti(공개 엔드포인트)에서 '우리가 만든 결제건'임을 확인하는
    // 사실상 유일한 근거이므로 반드시 CSPRNG로 만든다.
    // (Math.random()은 예측 가능 — 위조 Noti로 미결제 구독 활성화가 가능했다)
    // 예약 등록(remainingEnd 있음)은 지금 청구하지 않으므로 charge_moid 를 만들지 않는다
    // → 이 건과 상관지어지는 Noti(status=25)도 존재할 수 없다.
    const innopayUserId = String(pending.user_id).replace(/-/g, '');
    const payMoid = remainingEnd
      ? null
      : `dmswp${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('innopay_autopay_pending')
      .update({ status: 'charging', charge_moid: payMoid, charging_at: new Date().toISOString() })
      .eq('moid', moid)
      .eq('status', 'pending')
      .select('moid');

    // 클레임 실패(DB 오류·제약 위반)는 '다른 요청이 선점함'과 반드시 구분한다.
    // 구분하지 않아 클레임이 매번 실패하는데도 processing 으로 안내되고 1회차 청구가
    // 통째로 건너뛰어진 장애가 있었다 (2026-08-04, status='charging' 미허용).
    if (claimError) {
      console.error('클레임 UPDATE 실패 — 처리 중단:', claimError);
      await failPending();
      return redirect(origin, 'error');
    }

    if (!claimed || claimed.length === 0) {
      // 다른 요청이 이미 선점 — 중복 청구 방지, 현재 상태로 안내
      const { data: cur } = await supabaseAdmin
        .from('innopay_autopay_pending')
        .select('status, plan_name')
        .eq('moid', moid)
        .maybeSingle();
      if (cur?.status === 'completed') return redirect(origin, 'success', { plan: String(cur.plan_name) });
      return redirect(origin, 'processing');
    }

    // ── 예약 등록: 남은 무료 체험/이용 기간이 끝나는 날 첫 결제 ──
    // 지금은 카드(빌키)만 등록하고 청구하지 않는다. 갱신 크론이 기간 만료일에
    // scheduled_* 값으로 청구하고 그때 유료 플랜으로 전환한다.
    // plan_id·member_count 는 건드리지 않는다 — 체험 중 쿼터(좌석·용량)가 유료 플랜
    // 기준으로 축소되는 것을 막기 위함(DB 쿼터 함수가 trialing 구독도 참조한다).
    if (remainingEnd) {
      const { error: schedErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          billing_cycle: 'monthly',
          payment_provider: 'innopay',
          payment_customer_id: pending.user_id,
          billing_key: billKey,
          auto_renew: true,
          renewal_attempts: 0,
          last_renewal_attempt_at: null,
          canceled_at: null,
          scheduled_plan_name: planName,
          scheduled_member_count: pending.member_count,
          scheduled_monthly_amount: pending.amount,
        })
        .eq('id', existingSub!.id);

      if (schedErr) {
        // 빌키는 이노페이에 남지만 우리가 모르는 상태 — 청구는 일어나지 않는다.
        // 사용자가 다시 등록하면 새 빌키가 발급되고 이 고아 빌키는 청구되지 않는다.
        console.error('예약 결제 등록 실패 (청구 없음):', schedErr);
        await failPending();
        return redirect(origin, 'error');
      }

      await supabaseAdmin
        .from('innopay_autopay_pending')
        .update({ status: 'completed', bill_key: billKey })
        .eq('moid', moid);

      return redirect(origin, 'success', {
        plan: planName,
        scheduledAt: remainingEnd.toISOString(),
      });
    }

    // ── 즉시 청구: 남은 기간이 없어 지금 결제해야 서비스가 열리는 경우 ──

    // 결제자 정보
    const { data: buyer } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', pending.user_id)
      .maybeSingle();

    // remainingEnd 가 없을 때만 여기 도달하므로 payMoid 는 항상 존재한다
    const chargeMoid = payMoid as string;

    // 1회차 결제 승인 — 실청구 성공이 billKey 진위 검증 역할
    const pay = await callAutopay('payAutoCardBill', {
      mid: INNOPAY_MID,
      moid: chargeMoid,
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
      await supabaseAdmin.from('innopay_autopay_pending').update({ status: 'failed' }).eq('moid', moid);
      return redirect(origin, 'fail', { code: String(pay.resultCode ?? '') });
    }

    // Noti 백필이 먼저 완료했으면 이중 반영 금지 — 그대로 성공 안내
    // (백필은 charging_at + 3분 유예 뒤에만 동작하므로 정상 경로에선 도달하지 않음)
    const { data: curPending } = await supabaseAdmin
      .from('innopay_autopay_pending')
      .select('status')
      .eq('moid', moid)
      .maybeSingle();
    if (curPending?.status === 'completed') {
      return redirect(origin, 'success', { plan: planName });
    }

    // 남은 기간이 없는 경로이므로 유료 기간은 지금부터 시작한다.
    const periodStart = now;
    const periodEnd = addOneMonthClamped(periodStart);
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
      // 예약값이 남아 있었다면(재등록 등) 정리 — 지금 청구로 이미 반영됐다
      scheduled_plan_name: null,
      scheduled_member_count: null,
      scheduled_monthly_amount: null,
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
        console.error(`구독 활성화 실패 (결제 완료 tid: ${pay.tid}, billKey 발급됨):`, insErr);
        return redirect(origin, 'error');
      }
      subscriptionId = newSub.id;
    }

    const { error: payInsErr } = await supabaseAdmin.from('payments').insert({
      company_id: pending.company_id,
      subscription_id: subscriptionId,
      order_id: chargeMoid,
      payment_key: pay.tid || null,
      amount: pending.amount,
      status: 'DONE',
      method: 'CARD',
      card_company: cardCompany,
      card_number: maskedCardNum,
      approved_at: new Date().toISOString(),
    });
    if (payInsErr) {
      // 결제는 완료된 상태 — tid/moid 로그로 수동 대사 가능하게 남긴다
      console.error(`payments 기록 실패 (결제 완료 tid: ${pay.tid}, moid: ${chargeMoid}):`, payInsErr);
    }

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
