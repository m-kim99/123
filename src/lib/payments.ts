import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { supabase } from '@/lib/supabase';

// ============================================================
// 결제 연동 (토스페이먼츠 + PayApp 병행)
// 토스: requestBillingAuth → confirmBilling
// PayApp: requestPayAppBilling → confirmPayAppBilling
// ============================================================

export type PaymentProvider = 'tosspayments' | 'payapp';

// 실 클라이언트 키 발급 전까지는 토스 공식 문서용 테스트 키 사용 (테스트 결제창으로도 카드사 심사 가능)
const TOSS_CLIENT_KEY =
  import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm';

export interface BillingAuthParams {
  customerKey: string; // 사용자 고유 식별자 (user.id)
  customerEmail?: string;
  customerName?: string;
  /** 결제 상품 정보 — successUrl 쿼리로 전달해 승인 단계에서 사용 */
  memberCount: number;
  amount: number;
}

/**
 * 정기결제용 카드 등록창 호출
 * 성공 시 /billing/success?authKey=...&customerKey=... 로 리다이렉트됨
 */
export async function requestBillingAuth(params: BillingAuthParams): Promise<void> {
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey: params.customerKey });

  const query = `members=${params.memberCount}&amount=${params.amount}`;

  await payment.requestBillingAuth({
    method: 'CARD',
    successUrl: `${window.location.origin}/billing/success?${query}`,
    failUrl: `${window.location.origin}/billing/fail`,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
  });
}

export interface ConfirmBillingParams {
  authKey: string;
  customerKey: string;
  memberCount: number;
  amount: number;
}

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

/**
 * 빌링키 발급 + 첫 결제 승인 (Edge Function 호출)
 * 카드 등록 성공 후 /billing/success 페이지에서 호출
 */
export async function confirmBilling(params: ConfirmBillingParams): Promise<ConfirmBillingResult> {
  const { data, error } = await supabase.functions.invoke('toss-billing-confirm', {
    body: params,
  });

  if (error) {
    // Edge Function이 4xx/5xx를 반환한 경우 응답 본문에서 상세 메시지 추출
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
