import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 정기결제(자동갱신) 해지 예약
// - 결제대행사 호출 없이 구독 상태만 변경한다.
// - canceled_at을 기록하되 status는 active로 유지 → 현재 결제 기간까지 이용 가능.
// - innopay-billing-renewal(cron)이 만료 시점에 canceled_at이 있으면 갱신하지 않고 종료 처리.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
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

    // service_role 클라이언트
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // admin + 회사 소속 확인
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || !profile.company_id) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403);
    }

    // 본인 회사 구독인지 확인
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, company_id, status, current_period_end, canceled_at')
      .eq('id', subscriptionId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (!subscription) {
      return jsonResponse({ error: 'SUBSCRIPTION_NOT_FOUND' }, 404);
    }

    if (!['active', 'trialing', 'past_due'].includes(subscription.status)) {
      return jsonResponse({ error: 'NOT_CANCELABLE', message: '해지할 수 없는 구독 상태입니다.' }, 400);
    }

    const canceledAt = new Date().toISOString();

    // 해지 예약: status는 유지(현재 기간까지 이용), canceled_at만 기록
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ canceled_at: canceledAt })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    return jsonResponse({
      success: true,
      canceledAt,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('innopay-subscription-cancel 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
