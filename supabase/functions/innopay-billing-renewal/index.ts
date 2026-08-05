import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 구독 갱신 관리 (cron 호출용, 매일 1회 권장)
//
// [자동결제 구독] auto_renew=true (빌키 발급 구독 — innopay-billkey-register)
//  1) active + 만료 도래 → 빌키(payAutoCardBill)로 자동 청구
//     - 성공: 기간 1개월 연장 + payments 기록 + 결제 완료 알림
//     - 실패: 재시도 카운트 증가(일 1회), 3회 실패 시 status='past_due' + 재등록 안내
//  2) active + D-7 → "7일 후 자동결제 예정" 사전 고지 (전자상거래법 정기결제 사전고지)
//  3) 해지 예약(canceled_at) + 만료 → 빌키 삭제(delAutoCardBill) + status='canceled'
//
// [레거시 단회 구독] auto_renew=false (결제창 단회 결제 — 빌키 없음)
//  기존 동작 유지: D-7/D-1 재결제 안내 → 만료 시 past_due 전환 → 7일마다 리마인드
//
// [무료 체험 + 카드 등록됨] trialing + auto_renew=true (예약 결제)
//  체험 기간을 끝까지 쓰고, 종료일에 첫 결제 → 성공 시 scheduled_* 값으로 유료 전환
//  (status='active', plan_id/member_count/monthly_amount 이관 후 예약값 비움).
//  D-7 에 "체험 종료일에 첫 결제" 사전 고지. 그 전에 해지하면 청구되지 않는다.
//
// [무료 체험 — 카드 없음] trialing — D-14/7/1/만료 고지 (알림+푸시+이메일)
//
// 호출: pg_cron 등 스케줄러에서 x-cron-key 헤더와 함께 POST (CRON_SECRET 검증)
// ============================================================

interface SubscriptionRow {
  id: string;
  company_id: string;
  status: string;
  current_period_end: string | null;
  canceled_at: string | null;
  auto_renew: boolean | null;
  renewal_attempts: number | null;
  billing_key: string | null;
  monthly_amount: number | null;
  payment_customer_id: string | null;
  plans: { name: string } | null;
  // 예약 결제(체험/잔여기간 종료 후 첫 결제)용 — status='trialing' 일 때만 의미 있다
  scheduled_plan_name: string | null;
  scheduled_member_count: number | null;
  scheduled_monthly_amount: number | null;
}

/**
 * 이번 청구에 적용할 플랜·금액.
 * 체험 중 카드만 등록한 예약 결제(status='trialing')는 scheduled_* 가 청구 기준이고,
 * 성공 시 유료 플랜으로 전환된다. 그 외(active 갱신)는 현재 값으로 청구한다.
 */
function billingTarget(sub: SubscriptionRow): {
  deferred: boolean;
  planName: string | null;
  amount: number | null;
} {
  const deferred = sub.status === 'trialing';
  return {
    deferred,
    planName: (deferred ? sub.scheduled_plan_name : sub.plans?.name) ?? null,
    amount: deferred ? sub.scheduled_monthly_amount : sub.monthly_amount,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RENEWAL_ATTEMPTS = 3; // 자동결제 실패 허용 횟수 (일 1회 시도)

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

// 유료 플랜 가격 (부가세 포함) — 클라이언트/innopay-autopay-start와 동일하게 유지할 것
// minMembers: 최소 결제 인원 — 실인원이 이보다 적어도 이 인원 기준으로 청구된다.
// maxMembers: 판매 상한 — 안내 금액 산출 시 이 인원을 넘겨 계산하지 않는다.
const PLAN_PRICING: Record<string, { pricePerMember: number; minMembers: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, minMembers: 3, maxMembers: 3 },
  pro: { pricePerMember: 15000, minMembers: 3, maxMembers: 20 },
};

const PLAN_GOODS_NAME: Record<string, string> = {
  basic: '베이직 플랜 월 구독',
  pro: '프로 플랜 월 구독',
};

const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';

interface AutopayResponse {
  resultCode?: string;
  resultMsg?: string;
  tid?: string;
  appCardName?: string;
  acquCardName?: string;
  cardNum?: string;
}

/** 이노페이 자동결제 API 호출 — 응답 파싱 실패도 실패 코드로 정규화 */
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

/**
 * 정산 원칙(true-up): 그 시점 실제 인원(company_id 기준, 추방된 팀원은 이미 제외됨) ×
 * 인당 단가로 청구액을 계산한다. 실인원이 최소 결제 인원보다 적어도 최소 인원 기준으로
 * 청구된다(베이직·프로 모두 3인) — 인원이 줄어도 최소 인원분은 항상 청구.
 * 판매 상한(프로 20인)을 넘는 인원은 상한 기준으로만 청구한다.
 */
async function computeTrueUpAmount(
  supabase: SupabaseClient,
  companyId: string,
  planName: string | null | undefined,
): Promise<{ members: number; billable: number; amount: number } | null> {
  const pricing = planName ? PLAN_PRICING[planName] : undefined;
  if (!pricing) return null;
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  const members = count ?? 0;
  if (members < 1) return null;
  let billable = Math.max(members, pricing.minMembers);
  if (pricing.maxMembers !== null) billable = Math.min(billable, pricing.maxMembers);
  return { members, billable, amount: billable * pricing.pricePerMember };
}

/**
 * 현재 실제 인원 기준 재결제 예상 금액 안내 문구 생성
 * (플랜/인원 조회 실패 시 빈 문자열 반환 — 기본 메시지만 발송)
 */
async function renewalQuote(
  supabase: SupabaseClient,
  companyId: string,
  planName: string | null | undefined,
): Promise<string> {
  const pricing = planName ? PLAN_PRICING[planName] : undefined;
  if (!pricing) return '';
  const quote = await computeTrueUpAmount(supabase, companyId, planName);
  if (!quote) return '';
  // 금액을 먼저, 산출 내역은 괄호로 — 최소 인원이 적용된 경우에만 그 사실을 덧붙인다.
  const detail =
    `${quote.billable}명 × ${pricing.pricePerMember.toLocaleString('ko-KR')}원` +
    (quote.billable > quote.members ? ` · 최소 결제 인원 ${pricing.minMembers}명` : '');
  return ` 재결제 예상 금액은 월 ${quote.amount.toLocaleString('ko-KR')}원입니다(${detail}).`;
}

/**
 * 이번 청구주기 결제 금액을 그 시점 실인원 기준으로 재계산해 subscriptions에 반영한다(true-up).
 * sub.monthly_amount를 in-place로 갱신하므로, 호출 이후의 청구·고지 문구는 새 금액을 그대로 쓴다.
 * D-7 사전고지와 실제 청구 시점 둘 다에서 호출해 고지 금액과 청구 금액이 항상 일치하도록 한다.
 */
async function trueUpSubscriptionAmount(
  supabase: SupabaseClient,
  sub: SubscriptionRow,
): Promise<void> {
  const target = billingTarget(sub);
  const quote = await computeTrueUpAmount(supabase, sub.company_id, target.planName);
  if (!quote || quote.amount === target.amount) return;

  // 예약 결제(체험 중)는 scheduled_* 만 갱신한다 — member_count 를 건드리면
  // DB 쿼터 함수가 trialing 구독도 참조하므로 남은 체험 기간의 좌석 한도가 바뀐다.
  const patch = target.deferred
    ? { scheduled_member_count: quote.billable, scheduled_monthly_amount: quote.amount }
    : { member_count: quote.billable, monthly_amount: quote.amount };

  const { error } = await supabase.from('subscriptions').update(patch).eq('id', sub.id);
  if (error) {
    console.error('true-up 금액 반영 실패:', sub.id, error);
    return;
  }
  if (target.deferred) {
    sub.scheduled_member_count = quote.billable;
    sub.scheduled_monthly_amount = quote.amount;
  } else {
    sub.monthly_amount = quote.amount;
  }
}

/** 같은 회사+타입 알림이 최근 windowDays 내에 있으면 중복으로 간주 */
async function alreadyNotified(
  supabase: SupabaseClient,
  companyId: string,
  type: string,
  windowDays: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('company_id', companyId)
    .eq('type', type)
    .gte('created_at', since)
    .limit(1);
  return !!data && data.length > 0;
}

/** 회사 관리자 전원에게 개인 알림(target_user_id) 발송 */
async function notifyAdmins(
  supabase: SupabaseClient,
  companyId: string,
  type: string,
  message: string,
): Promise<number> {
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'admin');

  if (!admins || admins.length === 0) return 0;

  const rows = admins.map((a: { id: string }) => ({
    type,
    company_id: companyId,
    target_user_id: a.id,
    message,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.error('구독 알림 생성 실패:', companyId, type, error);
    return 0;
  }
  return rows.length;
}

function formatKstDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/** 회사 전 구성원에게 역할별 문구로 개인 알림 발송 (무료 체험 만료 고지용) */
async function notifyCompanyUsers(
  supabase: SupabaseClient,
  companyId: string,
  type: string,
  adminMessage: string,
  memberMessage: string,
): Promise<number> {
  const { data: users } = await supabase
    .from('users')
    .select('id, role')
    .eq('company_id', companyId);

  if (!users || users.length === 0) return 0;

  const rows = users.map((u: { id: string; role: string }) => ({
    type,
    company_id: companyId,
    target_user_id: u.id,
    message: u.role === 'admin' ? adminMessage : memberMessage,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.error('체험 만료 알림 생성 실패:', companyId, type, error);
    return 0;
  }
  return rows.length;
}

const SITE_URL = 'https://traystorageconnect.com';

/** 체험 만료 안내 메일 본문 — 관리자에게만 웹 구독 링크 포함 (앱 외부 채널이라 앱스토어 3.1.1 무관) */
function trialEmailHtml(message: string, isAdmin: boolean): string {
  const cta = isAdmin
    ? `<div style="text-align:center;margin:28px 0;"><a href="${SITE_URL}" style="display:inline-block;padding:13px 30px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;">웹에서 구독하기</a></div>`
    : '';
  return `
<div style="max-width:600px;margin:40px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
  <div style="background:#2563eb;padding:26px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:500;">TrayStorage</h1>
  </div>
  <div style="padding:32px 28px;color:#1f2937;font-size:15px;line-height:1.7;">
    <p style="margin:0;">${message}</p>
    ${cta}
    <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">데이터는 종료 후에도 안전하게 보관되며, 구독 시 즉시 복구됩니다.</p>
  </div>
  <div style="padding:18px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#6b7280;">이 이메일은 TrayStorage에서 자동 발송되었습니다.</p>
  </div>
</div>`;
}

/** 체험 만료 안내 메일 발송 — 관리자는 항상, 팀원은 includeMembers=true일 때만 */
async function sendTrialEmails(
  supabase: SupabaseClient,
  companyId: string,
  subject: string,
  adminMessage: string,
  memberMessage: string,
  includeMembers: boolean,
): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return;

  const { data: users } = await supabase
    .from('users')
    .select('email, role')
    .eq('company_id', companyId);

  const targets = (users ?? []).filter(
    (u: { email: string | null; role: string }) =>
      !!u.email && (u.role === 'admin' || includeMembers),
  );

  await Promise.allSettled(
    targets.map((u: { email: string; role: string }) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'TrayStorage <noreply@traystorageconnect.com>',
          to: u.email,
          subject,
          html: trialEmailHtml(u.role === 'admin' ? adminMessage : memberMessage, u.role === 'admin'),
        }),
      }).then(async (res) => {
        if (!res.ok) console.error('체험 안내 메일 실패:', u.email, await res.text());
      }),
    ),
  );
}

/** 회사 전 구성원에게 FCM/APNs 푸시 (send-push-notification의 cron 인증 경로 사용) */
async function sendTrialPush(companyId: string, message: string, cronKey: string): Promise<void> {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'x-cron-key': cronKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: { companyId }, title: 'TrayStorage', message }),
    });
    if (!res.ok) console.error('체험 만료 푸시 실패:', companyId, await res.text());
  } catch (err) {
    console.error('체험 만료 푸시 오류:', companyId, err);
  }
}

/**
 * 빌키 자동결제 청구 — 등록 시 사용한 userId(가입자 UUID에서 하이픈 제거)와 일치해야 함.
 * buyer 정보(name/email)는 결제 고객(payment_customer_id) 기준, 없으면 회사 관리자 아무나.
 */
/**
 * 결정적 갱신 moid — 같은 구독·같은 청구주기(current_period_end)면 항상 동일 moid.
 * 이노페이가 동일 moid 재요청을 중복으로 거부하므로 이중청구를 PG 단에서도 차단한다.
 */
function renewalMoid(sub: SubscriptionRow): string {
  const period = String(sub.current_period_end || '').replace(/[^0-9]/g, '').slice(0, 8); // YYYYMMDD
  const sid = String(sub.id).replace(/-/g, '').slice(0, 24);
  return `dmsa${sid}${period}`;
}

async function chargeBillkey(
  supabase: SupabaseClient,
  mid: string,
  sub: SubscriptionRow,
): Promise<{ ok: boolean; tid: string | null; cardCompany: string | null; cardNum: string | null; moid: string; code?: string; msg?: string }> {
  const moid = renewalMoid(sub);
  const target = billingTarget(sub);
  const planName = target.planName || 'basic';
  const amount = target.amount;

  if (!sub.billing_key || !sub.payment_customer_id || !amount) {
    return { ok: false, tid: null, cardCompany: null, cardNum: null, moid, code: 'MISSING_BILLING_DATA', msg: '청구 정보 누락' };
  }

  let { data: buyer } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', sub.payment_customer_id)
    .maybeSingle();

  if (!buyer) {
    const { data: anyAdmin } = await supabase
      .from('users')
      .select('name, email')
      .eq('company_id', sub.company_id)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();
    buyer = anyAdmin;
  }

  const res = await callAutopay('payAutoCardBill', {
    mid,
    moid,
    buyerName: (buyer?.name as string) || '가맹회원',
    buyerEmail: (buyer?.email as string) || '',
    goodsName: PLAN_GOODS_NAME[planName] || PLAN_GOODS_NAME.basic,
    amt: String(amount),
    billKey: sub.billing_key,
    userId: sub.payment_customer_id.replace(/-/g, ''),
  });

  if (res.resultCode !== '0000') {
    return {
      ok: false,
      tid: res.tid ?? null,
      cardCompany: null,
      cardNum: null,
      moid,
      code: res.resultCode,
      msg: res.resultMsg,
    };
  }

  return {
    ok: true,
    tid: res.tid ?? null,
    cardCompany: res.appCardName || res.acquCardName || null,
    cardNum: res.cardNum ?? null,
    moid,
  };
}

/** 크론 키 비교 — 조기 반환으로 정답 길이/접두사가 새지 않도록 상수시간 비교 */
function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

serve(async (req) => {
  try {
    // cron 비밀키 검증
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!safeEqual(req.headers.get('x-cron-key'), cronSecret)) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
    }

    const INNOPAY_MID = Deno.env.get('INNOPAY_MID') || '';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const results: Array<{ subscriptionId: string; action: string }> = [];
    let notified = 0;

    // 대상: 이노페이 구독 중 active(만료 임박/만료) + past_due(리마인드)
    //       + trialing(카드 등록된 예약 결제 — 체험 종료일에 첫 결제·유료 전환)
    // 카드 미등록 체험은 payment_provider 가 없어 여기 걸리지 않고, 아래 체험 고지 루프가 담당한다.
    const { data: subs, error: queryError } = await supabaseAdmin
      .from('subscriptions')
      .select(
        'id, company_id, status, current_period_end, canceled_at, auto_renew, renewal_attempts, billing_key, monthly_amount, payment_customer_id, scheduled_plan_name, scheduled_member_count, scheduled_monthly_amount, plans(name)',
      )
      .eq('payment_provider', 'innopay')
      .in('status', ['active', 'past_due', 'trialing'])
      .not('current_period_end', 'is', null);

    if (queryError) throw queryError;

    for (const sub of (subs ?? []) as SubscriptionRow[]) {
      const periodEnd = new Date(sub.current_period_end!);
      const msLeft = periodEnd.getTime() - now.getTime();

      // 4) past_due 리마인드 (7일마다, 만료 후 35일까지만) — 자동/수동 공통
      if (sub.status === 'past_due') {
        // 영구 반복 방지: 만료가 35일 넘게 지난 구독은 더 알리지 않는다 (약 5회 발송 후 중단)
        if (now.getTime() - periodEnd.getTime() > 35 * DAY_MS) continue;
        if (!(await alreadyNotified(supabaseAdmin, sub.company_id, 'subscription_past_due', 7))) {
          const quote = await renewalQuote(supabaseAdmin, sub.company_id, sub.plans?.name);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_past_due',
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 결제 수단을 등록하면 즉시 복구됩니다.`,
          );
          results.push({ subscriptionId: sub.id, action: 'past_due_reminder' });
        }
        continue;
      }

      // ── 빌키 자동결제 구독 (auto_renew=true) ──
      if (sub.auto_renew) {
        // 만료 도래 → 해지 예약이면 종료(빌키 삭제), 아니면 자동 청구
        if (msLeft <= 0) {
          if (sub.canceled_at) {
            if (sub.billing_key && sub.payment_customer_id) {
              try {
                await callAutopay('delAutoCardBill', {
                  mid: INNOPAY_MID,
                  billKey: sub.billing_key,
                  userId: sub.payment_customer_id.replace(/-/g, ''),
                });
              } catch {
                // 빌키 삭제 실패는 무시 (청구는 status 기준으로 차단됨)
              }
            }
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'canceled' })
              .eq('id', sub.id);
            notified += await notifyAdmins(
              supabaseAdmin,
              sub.company_id,
              'subscription_canceled',
              '구독 해지가 완료되어 이용이 종료되었습니다. 언제든 다시 구독할 수 있습니다.',
            );
            results.push({ subscriptionId: sub.id, action: 'canceled' });
            continue;
          }

          // 예약 결제(체험 종료 후 첫 결제)는 전환할 플랜을 청구 '전'에 확인한다.
          // 청구 후에 플랜을 못 찾으면 돈은 나갔는데 유료 전환이 안 되는 상태가 된다.
          let convertPlanId: string | null = null;
          if (sub.status === 'trialing') {
            if (!sub.scheduled_plan_name) {
              console.error('예약 결제 정보 없음 — 첫 결제 건너뜀:', sub.id);
              continue;
            }
            const { data: schedPlan } = await supabaseAdmin
              .from('plans')
              .select('id')
              .eq('name', sub.scheduled_plan_name)
              .maybeSingle();
            if (!schedPlan) {
              console.error('예약 플랜 없음 — 첫 결제 건너뜀:', sub.id, sub.scheduled_plan_name);
              continue;
            }
            convertPlanId = schedPlan.id as string;
          }

          /** 첫 결제 성공 시 유료 플랜으로 전환하고 예약값을 비우는 패치 (갱신이면 빈 객체) */
          const conversionPatch = () =>
            convertPlanId
              ? {
                  status: 'active',
                  plan_id: convertPlanId,
                  member_count: sub.scheduled_member_count,
                  monthly_amount: sub.scheduled_monthly_amount,
                  scheduled_plan_name: null,
                  scheduled_member_count: null,
                  scheduled_monthly_amount: null,
                }
              : {};

          // 멱등 가드: 이 청구주기(결정적 moid)가 이미 결제됐으면 재청구 금지 — 기간만 자가복구.
          // (직전 회차에 청구는 성공했으나 기간갱신이 유실된 경우를 안전하게 복구)
          const rmoid = renewalMoid(sub);
          const { data: paidAlready } = await supabaseAdmin
            .from('payments')
            .select('id')
            .eq('order_id', rmoid)
            .maybeSingle();
          if (paidAlready) {
            const healEnd = addOneMonthClamped(periodEnd);
            // 예약 결제였다면 유료 전환까지 함께 복구한다 — 기간만 늘리면 체험 상태로
            // 한 달이 더 열려 결제한 플랜이 영구히 적용되지 않는다.
            await supabaseAdmin
              .from('subscriptions')
              .update({
                ...conversionPatch(),
                current_period_start: periodEnd.toISOString(),
                current_period_end: healEnd.toISOString(),
                renewal_attempts: 0,
                last_renewal_attempt_at: now.toISOString(),
              })
              .eq('id', sub.id);
            results.push({ subscriptionId: sub.id, action: 'already_charged_healed' });
            continue;
          }

          // true-up: 청구 직전 그 시점 실인원 기준으로 금액을 재계산해 반영 (추방된 팀원 등은 이미 제외됨)
          await trueUpSubscriptionAmount(supabaseAdmin, sub);

          const attempts = (sub.renewal_attempts ?? 0) + 1;
          const charge = await chargeBillkey(supabaseAdmin, INNOPAY_MID, sub);

          if (charge.ok) {
            // 기간 연장은 기존 만료일 기준 (결제 지연으로 이용 기간이 밀리지 않도록).
            // 단, 만료 후 7일 넘게 방치된 구독(크론 중단 등)은 오늘부터 시작한다 —
            // 옛 만료일 기준으로 이어붙이면 갱신 후에도 여전히 만료 상태라
            // 이용하지 못한 과거 기간을 하루 1건씩 연쇄 청구하게 되기 때문.
            const stale = now.getTime() - periodEnd.getTime() > 7 * DAY_MS;
            const newStart = stale ? now : periodEnd;
            const newEnd = addOneMonthClamped(newStart);

            // 청구된 금액 — 예약 결제(첫 결제)는 scheduled_monthly_amount 가 기준이다
            const chargedAmount = billingTarget(sub).amount;
            const converted = !!convertPlanId;

            const { error: periodErr } = await supabaseAdmin
              .from('subscriptions')
              .update({
                ...conversionPatch(),
                current_period_start: newStart.toISOString(),
                current_period_end: newEnd.toISOString(),
                renewal_attempts: 0,
                last_renewal_attempt_at: now.toISOString(),
              })
              .eq('id', sub.id);
            if (periodErr) {
              // 청구 성공했으나 기간갱신 실패 — 다음 회차 멱등 가드가 재청구 없이 자가복구함
              console.error(`[재청구 위험] 기간갱신 실패 (청구완료 tid:${charge.tid}, moid:${charge.moid}):`, periodErr);
            }

            const { error: payInsErr } = await supabaseAdmin.from('payments').insert({
              company_id: sub.company_id,
              subscription_id: sub.id,
              order_id: charge.moid,
              payment_key: charge.tid,
              amount: chargedAmount,
              status: 'DONE',
              method: 'CARD',
              card_company: charge.cardCompany,
              card_number: charge.cardNum,
              approved_at: now.toISOString(),
            });
            if (payInsErr) {
              // 이 기록은 다음 회차 멱등 가드(order_id 조회)의 근거 — 유실 시 수동 대사 필요
              console.error(`payments 기록 실패 (청구완료 tid:${charge.tid}, moid:${charge.moid}):`, payInsErr);
            }

            // 청구로 확보한 카드 정보는 화면 표시용으로 남긴다 (예약 등록 시점에는 알 수 없음)
            if (charge.cardCompany || charge.cardNum) {
              await supabaseAdmin
                .from('subscriptions')
                .update({ card_company: charge.cardCompany, card_number: charge.cardNum })
                .eq('id', sub.id);
            }

            notified += await notifyAdmins(
              supabaseAdmin,
              sub.company_id,
              converted ? 'subscription_trial_converted' : 'subscription_renewed',
              converted
                ? `✅ 무료 체험이 종료되어 첫 정기결제가 완료되었습니다. (₩${Number(chargedAmount).toLocaleString('ko-KR')} / 다음 결제일 ${formatKstDate(newEnd.toISOString())})`
                : `✅ 정기결제가 완료되었습니다. (₩${Number(chargedAmount).toLocaleString('ko-KR')} / 다음 결제일 ${formatKstDate(newEnd.toISOString())})`,
            );
            results.push({ subscriptionId: sub.id, action: converted ? 'trial_converted' : 'auto_renewed' });
          } else {
            console.error('자동결제 실패:', sub.id, charge.code, charge.msg);
            if (attempts >= MAX_RENEWAL_ATTEMPTS) {
              await supabaseAdmin
                .from('subscriptions')
                .update({
                  status: 'past_due',
                  renewal_attempts: attempts,
                  last_renewal_attempt_at: now.toISOString(),
                })
                .eq('id', sub.id);
              notified += await notifyAdmins(
                supabaseAdmin,
                sub.company_id,
                'subscription_past_due',
                `⛔ 정기결제가 ${MAX_RENEWAL_ATTEMPTS}회 실패하여 무료 플랜 제한이 적용됩니다. 카드 상태 확인 후 결제 수단을 다시 등록해 주세요.`,
              );
              results.push({ subscriptionId: sub.id, action: 'auto_renew_failed_past_due' });
            } else {
              await supabaseAdmin
                .from('subscriptions')
                .update({
                  renewal_attempts: attempts,
                  last_renewal_attempt_at: now.toISOString(),
                })
                .eq('id', sub.id);
              notified += await notifyAdmins(
                supabaseAdmin,
                sub.company_id,
                'subscription_renewal_failed',
                `⚠️ 정기결제에 실패했습니다 (${attempts}/${MAX_RENEWAL_ATTEMPTS}회). 내일 다시 시도합니다. 카드 한도/상태를 확인해 주세요.`,
              );
              results.push({ subscriptionId: sub.id, action: 'auto_renew_retry' });
            }
          }
          continue;
        }

        // 해지 예약된 구독에는 사전 고지를 보내지 않음 (만료 시 종료 예정)
        if (sub.canceled_at) continue;

        // D-7 사전 고지 (정기결제 사전 통지) — 예약 결제(체험 종료 후 첫 결제)도 동일하게 고지
        const daysLeft = Math.ceil(msLeft / DAY_MS);
        if (daysLeft <= 7 && billingTarget(sub).amount) {
          if (
            !(await alreadyNotified(supabaseAdmin, sub.company_id, 'subscription_autorenew_upcoming', 10))
          ) {
            // true-up: 고지 금액과 실제 청구 금액이 어긋나지 않도록 이 시점에도 미리 반영
            await trueUpSubscriptionAmount(supabaseAdmin, sub);
            const upcomingAmount = Number(billingTarget(sub).amount).toLocaleString('ko-KR');
            const upcomingDate = formatKstDate(sub.current_period_end!);
            notified += await notifyAdmins(
              supabaseAdmin,
              sub.company_id,
              'subscription_autorenew_upcoming',
              sub.status === 'trialing'
                ? `💳 무료 체험이 ${upcomingDate}에 종료되며, 같은 날 등록된 카드로 첫 결제 ₩${upcomingAmount}이 진행됩니다. 그 전에 해지하면 결제되지 않습니다.`
                : `💳 ${upcomingDate}에 등록된 카드로 ₩${upcomingAmount}이 자동결제될 예정입니다.`,
            );
            results.push({ subscriptionId: sub.id, action: 'autorenew_notice_d7' });
          }
        }
        continue;
      }

      // ── 레거시 단회 결제 구독 (auto_renew=false) — 기존 수동 재결제 안내 유지 ──

      // 3) 기간 만료 처리
      if (msLeft <= 0) {
        if (sub.canceled_at) {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('id', sub.id);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_canceled',
            '구독 해지가 완료되어 이용이 종료되었습니다. 언제든 다시 구독할 수 있습니다.',
          );
          results.push({ subscriptionId: sub.id, action: 'canceled' });
        } else {
          await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', sub.id);
          const quote = await renewalQuote(supabaseAdmin, sub.company_id, sub.plans?.name);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_past_due',
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 결제 수단을 등록하면 즉시 복구됩니다.`,
          );
          results.push({ subscriptionId: sub.id, action: 'expired_to_past_due' });
        }
        continue;
      }

      // 해지 예약된 구독에는 재결제 안내를 보내지 않음 (만료 시 종료 예정)
      if (sub.canceled_at) continue;

      const daysLeft = Math.ceil(msLeft / DAY_MS);

      // 2) D-1 임박 알림
      if (daysLeft <= 1) {
        if (
          !(await alreadyNotified(
            supabaseAdmin,
            sub.company_id,
            'subscription_expiring_very_soon',
            7,
          ))
        ) {
          const quote = await renewalQuote(supabaseAdmin, sub.company_id, sub.plans?.name);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_expiring_very_soon',
            `💳 구독이 내일(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 만료 후에는 무료 플랜 제한이 적용되니 결제 수단을 등록해 주세요.`,
          );
          results.push({ subscriptionId: sub.id, action: 'notified_d1' });
        }
        continue;
      }

      // 1) D-7 안내 알림
      if (daysLeft <= 7) {
        if (
          !(await alreadyNotified(supabaseAdmin, sub.company_id, 'subscription_expiring_soon', 10))
        ) {
          const quote = await renewalQuote(supabaseAdmin, sub.company_id, sub.plans?.name);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_expiring_soon',
            `💳 구독이 ${daysLeft}일 후(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 결제 수단을 등록하면 매월 자동으로 결제됩니다.`,
          );
          results.push({ subscriptionId: sub.id, action: 'notified_d7' });
        }
      }
    }

    // ── 무료 체험(trialing) 만료 사전 고지: D-14 / D-7 / D-1 / 만료 — 전 구성원 대상 ──
    // 체험 구독은 가입 트리거로 생성되어 payment_provider가 없으므로 provider 필터 없이 조회.
    // 앱스토어 3.1.1: 알림 문구에 결제 위치/버튼 지시 금지 — "구독하면 계속 이용" 수준까지만.
    // 카드가 등록된 체험(예약 결제)은 제외한다 — 종료 시 이용이 끊기지 않고 자동 전환되므로
    // "종료되면 접근 제한" 안내가 사실과 다르고, 위 루프의 첫 결제 사전고지가 대신 나간다.
    const { data: trials, error: trialQueryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, company_id, status, current_period_end, canceled_at, auto_renew, billing_key, plans(name)')
      .eq('status', 'trialing')
      .not('current_period_end', 'is', null);

    if (trialQueryError) throw trialQueryError;

    for (const sub of (trials ?? []) as unknown as SubscriptionRow[]) {
      // 해지 예약된 체험은 재결제 유도 알림을 보내지 않는다
      if (sub.canceled_at) continue;
      // 카드가 등록된 체험 = 종료일에 자동 전환 — 첫 결제 사전고지가 이미 발송된다
      if (sub.auto_renew && sub.billing_key) continue;
      const endDate = formatKstDate(sub.current_period_end!);
      const daysLeft = Math.ceil(
        (new Date(sub.current_period_end!).getTime() - now.getTime()) / DAY_MS,
      );
      if (daysLeft > 14) continue;
      // 영구 반복 방지: 만료 후 30일이 지난 체험은 더 알리지 않는다
      if (daysLeft < -30) continue;

      let type: string;
      let windowDays: number;
      let adminMsg: string;
      let memberMsg: string;
      let pushMsg: string;
      let emailSubject: string;
      let emailMembers: boolean;

      if (daysLeft <= 0) {
        type = 'subscription_trial_expired';
        windowDays = 30;
        adminMsg = '🔒 무료 체험이 종료되어 이용이 제한되었습니다. 데이터는 안전하게 보관되어 있으며, 구독하면 즉시 복구됩니다.';
        memberMsg = '🔒 무료 체험이 종료되어 이용이 제한되었습니다. 관리자가 구독하면 다시 이용할 수 있습니다.';
        pushMsg = '무료 체험이 종료되었습니다.';
        emailSubject = '[TrayStorage] 무료 체험이 종료되었습니다';
        emailMembers = false;
      } else if (daysLeft <= 1) {
        type = 'subscription_trial_d1';
        windowDays = 3;
        adminMsg = `⏰ 무료 체험이 내일(${endDate}) 종료됩니다. 종료 후에는 팀 전체 접근이 제한됩니다.`;
        memberMsg = `⏰ 회사의 무료 체험이 내일(${endDate}) 종료됩니다. 필요한 자료를 오늘 중으로 내려받아 주세요.`;
        pushMsg = '무료 체험이 내일 종료됩니다. 필요한 자료를 미리 내려받아 주세요.';
        emailSubject = '[TrayStorage] 내일 무료 체험이 종료됩니다';
        emailMembers = true;
      } else if (daysLeft <= 7) {
        type = 'subscription_trial_d7';
        windowDays = 6;
        adminMsg = `⚠️ 무료 체험 종료까지 ${daysLeft}일 남았습니다 (${endDate}). 구독하면 중단 없이 계속 이용할 수 있습니다.`;
        memberMsg = `⚠️ 회사의 무료 체험이 ${endDate}에 종료됩니다. 종료 후에는 접근이 제한되니 필요한 자료를 미리 내려받아 주세요.`;
        pushMsg = `무료 체험이 ${endDate}에 종료됩니다. 필요한 자료를 미리 확인해 주세요.`;
        emailSubject = `[TrayStorage] 무료 체험 종료 D-${daysLeft} — 자료를 정리해 주세요`;
        emailMembers = true;
      } else {
        type = 'subscription_trial_d14';
        windowDays = 7;
        adminMsg = `📅 무료 체험이 ${daysLeft}일 후(${endDate}) 종료됩니다. 구독하면 중단 없이 계속 이용할 수 있습니다.`;
        memberMsg = `📅 회사의 무료 체험이 ${endDate}에 종료됩니다. 종료 후에는 접근이 제한되니 필요한 자료를 미리 확인해 주세요.`;
        pushMsg = `무료 체험이 ${endDate}에 종료됩니다.`;
        emailSubject = `[TrayStorage] 무료 체험이 ${daysLeft}일 후 종료됩니다`;
        emailMembers = false;
      }

      if (await alreadyNotified(supabaseAdmin, sub.company_id, type, windowDays)) continue;

      notified += await notifyCompanyUsers(supabaseAdmin, sub.company_id, type, adminMsg, memberMsg);
      await sendTrialPush(sub.company_id, pushMsg, cronSecret);
      await sendTrialEmails(supabaseAdmin, sub.company_id, emailSubject, adminMsg, memberMsg, emailMembers);
      results.push({ subscriptionId: sub.id, action: type });
    }

    return new Response(
      JSON.stringify({ processed: results.length, notificationsCreated: notified, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('innopay-billing-renewal 오류:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), { status: 500 });
  }
});
