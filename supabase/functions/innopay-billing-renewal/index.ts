import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 구독 만료 관리 (cron 호출용, 매일 1회 권장)
//
// 이노페이 계약이 '결제창(1회성 결제)'만 포함하므로 카드 자동 재결제는 불가능.
// 대신 만료 안내 → 관리자 수동 재결제(결제창) 루프로 구독을 유지한다.
//
// 처리 규칙
//  1) active + 만료 임박(D-7 이내) → 관리자에게 재결제 안내 알림 (기간 내 1회)
//  2) active + 만료 하루 전(D-1)   → 임박 알림 (1회)
//  3) active + 기간 만료:
//     - 해지 예약(canceled_at 있음) → status='canceled' + 종료 알림
//     - 그 외                       → status='past_due' + 재결제 안내 알림
//       (past_due부터 클라이언트는 무료 플랜 제한을 적용한다)
//  4) past_due 지속 → 7일마다 재결제 리마인드 알림
//
// 재결제는 관리자가 앱(사용자 관리/구독 다이얼로그)에서 결제창으로 진행하며,
// 성공 시 innopay-payment-confirm이 past_due 구독을 재활성화한다.
// 호출: pg_cron 등 스케줄러에서 x-cron-key 헤더와 함께 POST (CRON_SECRET 검증)
// ============================================================

interface SubscriptionRow {
  id: string;
  company_id: string;
  status: string;
  current_period_end: string | null;
  canceled_at: string | null;
  plans: { name: string } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// 유료 플랜 가격 (부가세 포함) — 클라이언트/innopay-payment-confirm과 동일하게 유지할 것
const PLAN_PRICING: Record<string, { pricePerMember: number }> = {
  basic: { pricePerMember: 6600 },
  pro: { pricePerMember: 15000 },
};

/**
 * 정산 원칙(true-up): 현재 실제 인원 기준 재결제 예상 금액 안내 문구 생성
 * (플랜/인원 조회 실패 시 빈 문자열 반환 — 기본 메시지만 발송)
 */
async function renewalQuote(
  supabase: SupabaseClient,
  companyId: string,
  planName: string | null | undefined,
): Promise<string> {
  const pricing = planName ? PLAN_PRICING[planName] : undefined;
  if (!pricing) return '';
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  const members = count ?? 0;
  if (members < 1) return '';
  const total = members * pricing.pricePerMember;
  return ` 재결제 예상 금액은 현재 인원 기준 ${members}명 × ${pricing.pricePerMember.toLocaleString('ko-KR')}원 = ${total.toLocaleString('ko-KR')}원입니다.`;
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

    const now = new Date();
    const results: Array<{ subscriptionId: string; action: string }> = [];
    let notified = 0;

    // 대상: 이노페이 구독 중 active(만료 임박/만료) + past_due(리마인드)
    const { data: subs, error: queryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, company_id, status, current_period_end, canceled_at, plans(name)')
      .eq('payment_provider', 'innopay')
      .in('status', ['active', 'past_due'])
      .not('current_period_end', 'is', null);

    if (queryError) throw queryError;

    for (const sub of (subs ?? []) as SubscriptionRow[]) {
      const periodEnd = new Date(sub.current_period_end!);
      const msLeft = periodEnd.getTime() - now.getTime();

      // 4) past_due 리마인드 (7일마다)
      if (sub.status === 'past_due') {
        if (!(await alreadyNotified(supabaseAdmin, sub.company_id, 'subscription_past_due', 7))) {
          const quote = await renewalQuote(supabaseAdmin, sub.company_id, sub.plans?.name);
          notified += await notifyAdmins(
            supabaseAdmin,
            sub.company_id,
            'subscription_past_due',
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 재결제하면 즉시 복구됩니다.`,
          );
          results.push({ subscriptionId: sub.id, action: 'past_due_reminder' });
        }
        continue;
      }

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
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 재결제하면 즉시 복구됩니다.`,
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
            `💳 구독이 내일(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 만료 후에는 무료 플랜 제한이 적용되니 재결제해 주세요.`,
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
            `💳 구독이 ${daysLeft}일 후(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 이노페이 결제는 자동 갱신되지 않으니 재결제해 주세요.`,
          );
          results.push({ subscriptionId: sub.id, action: 'notified_d7' });
        }
      }
    }

    // ── 무료 체험(trialing) 만료 사전 고지: D-14 / D-7 / D-1 / 만료 — 전 구성원 대상 ──
    // 체험 구독은 가입 트리거로 생성되어 payment_provider가 없으므로 provider 필터 없이 조회.
    // 앱스토어 3.1.1: 알림 문구에 결제 위치/버튼 지시 금지 — "구독하면 계속 이용" 수준까지만.
    const { data: trials, error: trialQueryError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, company_id, status, current_period_end, canceled_at, plans(name)')
      .eq('status', 'trialing')
      .not('current_period_end', 'is', null);

    if (trialQueryError) throw trialQueryError;

    for (const sub of (trials ?? []) as SubscriptionRow[]) {
      const endDate = formatKstDate(sub.current_period_end!);
      const daysLeft = Math.ceil(
        (new Date(sub.current_period_end!).getTime() - now.getTime()) / DAY_MS,
      );
      if (daysLeft > 14) continue;

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
