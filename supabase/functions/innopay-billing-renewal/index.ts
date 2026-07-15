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
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 사용자 관리에서 재결제하면 즉시 복구됩니다.`,
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
            `⛔ 구독이 만료되어 무료 플랜 제한이 적용 중입니다.${quote} 사용자 관리에서 재결제하면 즉시 복구됩니다.`,
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
            `💳 구독이 내일(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 만료 후에는 무료 플랜 제한이 적용되니 사용자 관리에서 재결제해 주세요.`,
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
            `💳 구독이 ${daysLeft}일 후(${formatKstDate(sub.current_period_end!)}) 만료됩니다.${quote} 이노페이 결제는 자동 갱신되지 않으니 사용자 관리에서 재결제해 주세요.`,
          );
          results.push({ subscriptionId: sub.id, action: 'notified_d7' });
        }
      }
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
