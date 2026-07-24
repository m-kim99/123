import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 이노페이 결제 취소(환불) — cancelTransaction API 연동
//
// 두 가지 모드:
//  [self]     관리자 셀프 청약철회 (약관 제11조 ①)
//             조건: 회사의 첫(유일한) 유료 결제 + 결제일로부터 7일 이내
//             → 전액 환불 + 구독 즉시 종료 + 빌키 삭제
//  [operator] 운영자 환불 — 전액/부분 금액·사유 지정,
//             구독 처리(terminate: 즉시 종료+빌키 삭제 / keep: 유지) 선택
//
// 이노페이 스펙:
//  POST https://api.innopay.co.kr/api/cancelTransaction
//  signData = SHA256(tid + mid + moid + cancelAmt + MerchantKey)
//  성공 resultCode: 2001(전체취소) / 2211(부분취소)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INNOPAY_CANCEL_URL = 'https://api.innopay.co.kr/api/cancelTransaction';
const INNOPAY_AUTOPAY_BASE = 'https://api.innopay.co.kr/api';
const SELF_REFUND_WINDOW_DAYS = 7; // 약관 제11조 ① 청약철회 기간

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface CancelResponse {
  resultCode?: string;
  resultMsg?: string;
  cancelDate?: string;
  cancelTime?: string;
  cancelNum?: string;
  remainAmt?: string;
  tid?: string;
  moid?: string;
}

/** 취소 사유 정제 — 이노페이 cancelMsg는 알파벳+한글(AH) 100자 */
function sanitizeCancelMsg(raw: unknown, fallback: string): string {
  const cleaned = typeof raw === 'string' ? raw.replace(/[^가-힣a-zA-Z\s]/g, '').trim() : '';
  return (cleaned || fallback).slice(0, 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const INNOPAY_MID = Deno.env.get('INNOPAY_MID');
    const INNOPAY_MERCHANT_KEY = Deno.env.get('INNOPAY_MERCHANT_KEY');
    if (!INNOPAY_MID || !INNOPAY_MERCHANT_KEY) {
      console.error('이노페이 환경변수(INNOPAY_MID/INNOPAY_MERCHANT_KEY)가 설정되지 않았습니다.');
      return jsonResponse({ error: 'PAYMENT_NOT_CONFIGURED' }, 500);
    }

    const { paymentId, mode, cancelAmount, reason, subscriptionAction } = await req.json();

    if (!paymentId || (mode !== 'self' && mode !== 'operator')) {
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 결제 건 조회
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select(
        'id, company_id, subscription_id, order_id, payment_key, amount, status, cancel_amount, approved_at, created_at',
      )
      .eq('id', paymentId)
      .maybeSingle();

    if (!payment) {
      return jsonResponse({ error: 'PAYMENT_NOT_FOUND' }, 404);
    }

    if (!payment.payment_key) {
      return jsonResponse({ error: 'NOT_CANCELABLE', message: '취소할 수 없는 결제 건입니다.' }, 400);
    }

    const alreadyCanceled = Number(payment.cancel_amount ?? 0);
    const remaining = Number(payment.amount) - alreadyCanceled;
    if (payment.status !== 'DONE' || remaining <= 0) {
      return jsonResponse({ error: 'ALREADY_CANCELED', message: '이미 취소된 결제입니다.' }, 400);
    }

    // ── 모드별 권한/조건 검증 ──
    let cancelAmt: number;
    let cancelMsg: string;
    let terminateSubscription: boolean;

    if (mode === 'self') {
      // 회사 관리자 본인 확인
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, role, company_id')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin' || profile.company_id !== payment.company_id) {
        return jsonResponse({ error: 'FORBIDDEN' }, 403);
      }

      // 청약철회 조건 (약관 제11조 ①): 회사의 첫(유일한) 유료 결제 + 결제 7일 이내
      const { count: doneCount } = await supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', payment.company_id)
        .eq('status', 'DONE');

      const paidAt = new Date(payment.approved_at || payment.created_at);
      const daysSince = (Date.now() - paidAt.getTime()) / (24 * 60 * 60 * 1000);

      if ((doneCount ?? 0) !== 1 || daysSince > SELF_REFUND_WINDOW_DAYS) {
        return jsonResponse(
          {
            error: 'REFUND_NOT_ELIGIBLE',
            message:
              '셀프 환불은 첫 결제 후 7일 이내에만 가능합니다. 그 외 환불은 support@traystorage.net 으로 문의해주세요.',
          },
          400,
        );
      }

      cancelAmt = remaining; // 전액 환불
      cancelMsg = '청약철회 환불';
      terminateSubscription = true;
    } else {
      // 운영자 확인
      const { data: operator } = await supabaseAdmin
        .from('operators')
        .select('id, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (!operator || !operator.is_active) {
        return jsonResponse({ error: 'FORBIDDEN' }, 403);
      }

      const parsedCancel = Number(cancelAmount ?? remaining);
      if (!Number.isInteger(parsedCancel) || parsedCancel < 1 || parsedCancel > remaining) {
        return jsonResponse(
          { error: 'INVALID_CANCEL_AMOUNT', message: `취소 가능 금액은 1~${remaining}원입니다.` },
          400,
        );
      }

      cancelAmt = parsedCancel;
      cancelMsg = sanitizeCancelMsg(reason, '운영자 환불');
      terminateSubscription = subscriptionAction === 'terminate';
    }

    // ── 낙관적 락: 이노페이 취소 전에 cancel_amount 선점 (동시 부분환불 과다환불 차단) ──
    // 내가 읽은 cancel_amount 값과 DB가 여전히 같을 때만 선점 성공 → 동시 요청 중 하나만 진행.
    const claimedTotal = alreadyCanceled + cancelAmt;
    let claimQ = supabaseAdmin
      .from('payments')
      .update({ cancel_amount: claimedTotal })
      .eq('id', payment.id)
      .eq('status', 'DONE');
    claimQ = payment.cancel_amount == null
      ? claimQ.is('cancel_amount', null)
      : claimQ.eq('cancel_amount', alreadyCanceled);
    const { data: claimRows } = await claimQ.select('id');
    if (!claimRows || claimRows.length === 0) {
      return jsonResponse(
        { error: 'CONCURRENT_CANCEL', message: '다른 취소 요청이 처리 중입니다. 잠시 후 다시 시도해 주세요.' },
        409,
      );
    }

    // ── 이노페이 취소 API 호출 ──
    // 전체취소: 최초 취소이면서 원금 전액일 때만 0, 그 외 부분취소
    const isFullCancel = alreadyCanceled === 0 && cancelAmt === Number(payment.amount);
    const cancelAmtStr = String(cancelAmt);
    const signData = await sha256Hex(
      `${payment.payment_key}${INNOPAY_MID}${payment.order_id}${cancelAmtStr}${INNOPAY_MERCHANT_KEY}`,
    );

    let cancel: CancelResponse;
    try {
      const cancelRes = await fetch(INNOPAY_CANCEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          tid: payment.payment_key,
          mid: INNOPAY_MID,
          moid: payment.order_id,
          cancelAmt: cancelAmtStr,
          cancelMsg,
          partialCancelCode: isFullCancel ? '0' : '1',
          refundAcctNum: '',
          refundBankCode: '',
          refundAcctName: '',
          signData,
        }),
      });
      try {
        cancel = (await cancelRes.json()) as CancelResponse;
      } catch {
        cancel = { resultCode: `HTTP_${cancelRes.status}`, resultMsg: '이노페이 응답을 해석할 수 없습니다.' };
      }
    } catch (netErr) {
      // 네트워크 예외 등으로 취소 요청 자체가 실패 → 선점한 cancel_amount 원복 후 종료
      console.error('이노페이 취소 요청 오류:', netErr);
      await supabaseAdmin
        .from('payments')
        .update({ cancel_amount: payment.cancel_amount ?? null })
        .eq('id', payment.id);
      return jsonResponse(
        { error: 'INNOPAY_CANCEL_FAILED', message: '결제 취소 요청 중 오류가 발생했습니다.' },
        502,
      );
    }

    // 성공: 2001(전체취소) / 2211(부분취소)
    if (cancel.resultCode !== '2001' && cancel.resultCode !== '2211') {
      console.error('이노페이 취소 실패:', cancel.resultCode, cancel.resultMsg);
      // 선점한 cancel_amount 원복 (취소 실패 → 재시도 가능하게)
      await supabaseAdmin
        .from('payments')
        .update({ cancel_amount: payment.cancel_amount ?? null })
        .eq('id', payment.id);
      return jsonResponse(
        {
          error: 'INNOPAY_CANCEL_FAILED',
          code: cancel.resultCode,
          message: cancel.resultMsg || '결제 취소에 실패했습니다.',
        },
        400,
      );
    }

    // ── DB 반영 (이후 오류는 로그로 수동 대사 — 환불 자체는 완료된 상태) ──
    const now = new Date().toISOString();
    const totalCanceled = alreadyCanceled + cancelAmt;

    const { error: payUpdateError } = await supabaseAdmin
      .from('payments')
      .update({
        status: totalCanceled >= Number(payment.amount) ? 'CANCELED' : 'DONE',
        cancel_amount: totalCanceled,
        cancel_reason: cancelMsg,
        cancel_num: cancel.cancelNum || null,
        canceled_at: now,
      })
      .eq('id', payment.id);
    if (payUpdateError) {
      console.error(`환불 DB 반영 실패 (취소는 완료, cancelNum: ${cancel.cancelNum}):`, payUpdateError);
    }

    // 구독 종료 처리 (청약철회 / 운영자 terminate)
    let subscriptionTerminated = false;
    if (terminateSubscription && payment.subscription_id) {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, billing_key, auto_renew, payment_customer_id, status')
        .eq('id', payment.subscription_id)
        .maybeSingle();

      if (sub && sub.status !== 'canceled') {
        if (sub.auto_renew && sub.billing_key && sub.payment_customer_id) {
          try {
            await fetch(`${INNOPAY_AUTOPAY_BASE}/delAutoCardBill`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                mid: INNOPAY_MID,
                billKey: sub.billing_key,
                userId: sub.payment_customer_id.replace(/-/g, ''),
              }),
            });
          } catch {
            // 빌키 삭제 실패는 무시 — status='canceled'로 자동 청구는 차단됨
          }
        }
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: now, auto_renew: false })
          .eq('id', sub.id);
        if (subError) {
          console.error('환불 후 구독 종료 실패:', subError);
        } else {
          subscriptionTerminated = true;
        }
      }
    }

    // 회사 관리자 알림
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', payment.company_id)
      .eq('role', 'admin');
    if (admins && admins.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          type: 'payment_refunded',
          company_id: payment.company_id,
          target_user_id: a.id,
          message: `💸 결제 환불이 완료되었습니다. (₩${cancelAmt.toLocaleString('ko-KR')})${
            subscriptionTerminated ? ' 구독이 종료되었습니다.' : ''
          }`,
          created_at: now,
        })),
      );
    }

    return jsonResponse({
      success: true,
      canceledAmount: cancelAmt,
      remainAmount: Number(payment.amount) - totalCanceled,
      cancelNum: cancel.cancelNum || null,
      subscriptionTerminated,
    });
  } catch (error) {
    console.error('innopay-payment-cancel 오류:', error);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
