// import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { supabase } from '@/lib/supabase';

// ============================================================
// 결제 연동 (PayApp 전용 — 토스페이먼츠 승인 대기 중)
// PayApp: requestPayAppBilling → confirmPayAppBilling
// ============================================================

// [토스 주석 처리] 승인 완료 후 활성화
// const TOSS_CLIENT_KEY =
//   import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

// export interface BillingAuthParams {
//   customerKey: string;
//   customerEmail?: string;
//   customerName?: string;
//   memberCount: number;
//   amount: number;
// }

// export async function requestBillingAuth(params: BillingAuthParams): Promise<void> {
//   const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
//   const payment = tossPayments.payment({ customerKey: params.customerKey });
//   const query = `members=${params.memberCount}&amount=${params.amount}`;
//   await payment.requestBillingAuth({
//     method: 'CARD',
//     successUrl: `${window.location.origin}/billing/success?${query}`,
//     failUrl: `${window.location.origin}/billing/fail`,
//     customerEmail: params.customerEmail,
//     customerName: params.customerName,
//   });
// }

// export interface ConfirmBillingParams {
//   authKey: string;
//   customerKey: string;
//   memberCount: number;
//   amount: number;
// }

export interface ConfirmBillingResult {
  success: boolean;
  subscriptionId?: string;
  orderId?: string;
  amount?: number;
  memberCount?: number;
  cardCompany?: string | null;
  cardNumber?: string | null;
  nextBillingDate?: string;
  error?: string;
  code?: string;
  message?: string;
}

// export async function confirmBilling(params: ConfirmBillingParams): Promise<ConfirmBillingResult> {
//   const { data, error } = await supabase.functions.invoke('toss-billing-confirm', {
//     body: params,
//   });
//   if (error) {
//     try {
//       const context = (error as { context?: Response }).context;
//       if (context) {
//         const body = await context.json();
//         return { success: false, ...body };
//       }
//     } catch {}
//     return { success: false, error: 'REQUEST_FAILED', message: error.message };
//   }
//   return data as ConfirmBillingResult;
// }

// ============================================================
// PayApp 정기결제 연동
// ============================================================

const PAYAPP_USERID = import.meta.env.VITE_PAYAPP_USERID || '';

export interface PayAppBillingParams {
  customerKey: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone: string;
  memberCount: number;
  amount: number;
}

/**
 * PayApp 정기결제 요청
 * REST API로 정기결제 등록 후 payurl로 리다이렉트
 */
export async function requestPayAppBilling(params: PayAppBillingParams): Promise<void> {
  if (!PAYAPP_USERID) {
    throw new Error('PAYAPP_USERID가 설정되지 않았습니다.');
  }

  const { data, error } = await supabase.functions.invoke('payapp-billing-request', {
    body: {
      customerKey: params.customerKey,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      memberCount: params.memberCount,
      amount: params.amount,
    },
  });

  if (error || !data?.payurl) {
    throw new Error(data?.message || error?.message || 'PayApp 결제 요청 실패');
  }

  // PayApp 결제 페이지로 리다이렉트
  window.location.href = data.payurl;
}

export interface PayAppConfirmParams {
  rebillNo: string;
  mul_no: string;
  customerKey: string;
  memberCount: number;
  amount: number;
}

/**
 * PayApp 결제 완료 확인 (feedbackurl 콜백 후 호출)
 */
export async function confirmPayAppBilling(params: PayAppConfirmParams): Promise<ConfirmBillingResult> {
  const { data, error } = await supabase.functions.invoke('payapp-billing-confirm', {
    body: params,
  });

  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const body = await context.json();
        return { success: false, ...body };
      }
    } catch {
      // 본문 파싱 실패 시 아래 기본 오류 반환
    }
    return { success: false, error: 'REQUEST_FAILED', message: error.message };
  }

  return data as ConfirmBillingResult;
}
