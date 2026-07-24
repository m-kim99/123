import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 자동결제 웹링크(RAUT) 등록 시작
// 1) 관리자 인증 + 금액/인원 검증
// 2) innopay_autopay_pending 에 등록 컨텍스트 저장 (moid 기준)
// 3) 이노페이 카드등록 웹링크(autoInterface, payMethod=RAUT) URL 반환
//    → 클라이언트가 이 URL로 이동하면 이노페이가 카드등록 UI(결제창)를 띄운다.
//    → 완료 시 이노페이가 returnUrl(innopay-autopay-return)로 billKey를 POST.
// [주의] 카드정보는 이노페이 호스팅 UI에서만 입력 — 우리 서버/앱은 카드번호를 만지지 않는다.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAN_PRICING: Record<string, { pricePerMember: number; minMembers: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, minMembers: 1, maxMembers: 3 },
  pro: { pricePerMember: 15000, minMembers: 3, maxMembers: null },
};

const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** 이노페이 moid — 영숫자(AN) 40자 이하 */
function makeMoid(): string {
  return `dmsw${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
    if (!INNOPAY_MID) {
      console.error('INNOPAY_MID 미설정');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const { plan, customerKey, customerEmail, customerName, customerPhone, memberCount, appOrigin } =
      await req.json();

    if (!customerKey || !customerName || !memberCount || !appOrigin) {
      return jsonResponse({ error: 'MISSING_PARAMS' }, 400);
    }

    const planName = typeof plan === 'string' && plan in PLAN_PRICING ? plan : 'basic';
    const pricing = PLAN_PRICING[planName];
    const parsedMembers = Number(memberCount);
    const amount = parsedMembers * pricing.pricePerMember;

    if (
      !Number.isInteger(parsedMembers) ||
      parsedMembers < pricing.minMembers ||
      (pricing.maxMembers !== null && parsedMembers > pricing.maxMembers)
    ) {
      return jsonResponse({ error: 'INVALID_MEMBER_COUNT' }, 400);
    }

    // 사용자 인증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    if (customerKey !== user.id) return jsonResponse({ error: 'CUSTOMER_KEY_MISMATCH' }, 403);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('id, role, company_id, email')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin' || !profile.company_id) {
      return jsonResponse({ error: 'FORBIDDEN' }, 403);
    }

    // 정산 원칙(true-up): 결제 인원은 현재 회사 인원 이상
    const { count: actualMemberCount } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', profile.company_id);
    if ((actualMemberCount ?? 0) > parsedMembers) {
      return jsonResponse(
        {
          error: 'MEMBER_COUNT_BELOW_ACTUAL',
          message: `결제 인원(${parsedMembers}명)이 현재 팀원 수(${actualMemberCount}명)보다 적습니다.`,
        },
        400,
      );
    }

    const moid = makeMoid();

    // 등록 컨텍스트 저장 (returnUrl 처리에서 moid로 조회해 실제 청구 금액 결정)
    const { error: pendingError } = await supabaseAdmin.from('innopay_autopay_pending').insert({
      moid,
      company_id: profile.company_id,
      user_id: user.id,
      plan_name: planName,
      member_count: parsedMembers,
      amount,
      status: 'pending',
    });
    if (pendingError) {
      console.error('pending insert 실패:', pendingError);
      return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
    }

    // 기존 활성 구독의 빌키 → 전달 시 이노페이가 기존 빌키 삭제 후 재등록(카드 변경)
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('billing_key, auto_renew')
      .eq('company_id', profile.company_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const prevBillKey =
      existingSub?.auto_renew && typeof existingSub.billing_key === 'string'
        ? existingSub.billing_key
        : '';

    const innopayUserId = user.id.replace(/-/g, '');
    const buyerHp = typeof customerPhone === 'string' ? customerPhone.replace(/\D/g, '') : '';
    const buyerEmail = customerEmail || profile.email || '';

    // returnUrl: 이노페이가 등록 결과(billKey)를 POST 할 우리 엣지함수. origin 은 결과 페이지 리다이렉트에 사용.
    const returnUrl =
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/innopay-autopay-return` +
      `?origin=${encodeURIComponent(appOrigin)}`;

    const params = new URLSearchParams({
      mid: INNOPAY_MID,
      payMethod: 'RAUT',
      requestType: 'Mobile', // 구매자(관리자 본인)가 직접 카드 등록
      userId: innopayUserId,
      moid,
      buyerName: customerName,
      buyerHp,
      buyerEmail,
      encoding: 'utf-8',
      returnUrl,
    });
    if (prevBillKey) params.set('billKey', prevBillKey);

    const weblinkUrl = `${INNOPAY_AUTOPAY_BASE}/autoInterface?${params.toString()}`;

    return jsonResponse({ success: true, url: weblinkUrl, moid });
  } catch (error) {
    console.error('innopay-autopay-start 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
