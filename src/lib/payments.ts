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

// ============================================================
// 이노페이(INNOPAY) V2 결제 연동 (공개 결제창 SDK + 승인 API)
// requestInnopayPayment(goPay 결제창) → confirmInnopayPayment(승인 API)
// 정기결제(자동결제) API는 이노페이 회원 전용 문서라 미적용. 현재는 1회성 결제 구조.
// ============================================================

const INNOPAY_MID = import.meta.env.VITE_INNOPAY_MID || '';
const INNOPAY_SDK_URL = 'https://pg.innopay.co.kr/tpay/js/innopay.js';

/** 유료 플랜 가격 정책 (부가세 포함) — 서버(innopay-payment-confirm)와 동일하게 유지할 것 */
export type PaidPlanName = 'basic' | 'pro';

export const PLAN_PRICING: Record<PaidPlanName, { pricePerMember: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, maxMembers: 3 }, // 베이직: 인당 6,600원, 최대 3인 (인원 추가 불가)
  pro: { pricePerMember: 15000, maxMembers: null }, // 프로: 인당 15,000원, 인원수 지정 가능
};

declare global {
  interface Window {
    innopay?: {
      goPay: (params: Record<string, unknown>) => void;
    };
  }
}

let innopaySdkPromise: Promise<void> | null = null;

/** 이노페이 결제창 SDK 로드 (1회만) */
function loadInnopaySdk(): Promise<void> {
  if (window.innopay) return Promise.resolve();
  if (innopaySdkPromise) return innopaySdkPromise;

  innopaySdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = INNOPAY_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      innopaySdkPromise = null;
      reject(new Error('이노페이 SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return innopaySdkPromise;
}

export interface InnopayPaymentParams {
  plan: PaidPlanName;
  customerKey: string;
  customerEmail?: string;
  customerName: string;
  customerPhone: string;
  memberCount: number;
  amount: number;
  goodsName: string;
}

/** confirm 단계에서 사용할 결제 컨텍스트를 sessionStorage에 저장 */
const INNOPAY_CTX_KEY = 'innopay_payment_ctx';

export interface InnopayPaymentContext {
  moid: string;
  plan: PaidPlanName;
  customerKey: string;
  memberCount: number;
  amount: number;
}

/**
 * 이노페이 결제창 호출 (goPay)
 * 카드 인증 성공 후 returnUrl로 이동하며, 해당 페이지에서 confirmInnopayPayment로 승인 처리.
 */
export async function requestInnopayPayment(params: InnopayPaymentParams): Promise<void> {
  if (!INNOPAY_MID) {
    throw new Error('VITE_INNOPAY_MID가 설정되지 않았습니다.');
  }

  await loadInnopaySdk();
  if (!window.innopay) {
    throw new Error('이노페이 SDK를 사용할 수 없습니다.');
  }

  const moid = `dms_${params.customerKey}_${Date.now()}`;

  const ctx: InnopayPaymentContext = {
    moid,
    plan: params.plan,
    customerKey: params.customerKey,
    memberCount: params.memberCount,
    amount: params.amount,
  };
  sessionStorage.setItem(INNOPAY_CTX_KEY, JSON.stringify(ctx));

  window.innopay.goPay({
    payMethod: 'CARD',
    mid: INNOPAY_MID,
    moid,
    goodsName: params.goodsName,
    amt: params.amount,
    buyerName: params.customerName,
    buyerTel: params.customerPhone.replace(/-/g, ''),
    buyerEmail: params.customerEmail || '',
    returnUrl: `${window.location.origin}/billing/innopay/return`,
  });
}

/** sessionStorage에 저장된 결제 컨텍스트 조회 */
export function getInnopayPaymentContext(): InnopayPaymentContext | null {
  const raw = sessionStorage.getItem(INNOPAY_CTX_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InnopayPaymentContext;
  } catch {
    return null;
  }
}

export function clearInnopayPaymentContext(): void {
  sessionStorage.removeItem(INNOPAY_CTX_KEY);
}

export interface InnopayConfirmParams {
  tid: string;
  paymentToken: string;
  moid: string;
  plan: PaidPlanName;
  customerKey: string;
  memberCount: number;
  amount: number;
}

/**
 * 이노페이 승인 API 호출 (returnUrl 복귀 후 호출)
 * 서버(엣지함수)에서 Merchant-Key로 승인 처리 후 구독을 활성화한다.
 */
export async function confirmInnopayPayment(
  params: InnopayConfirmParams,
): Promise<ConfirmBillingResult> {
  const { data, error } = await supabase.functions.invoke('innopay-payment-confirm', {
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

// ============================================================
// 이노페이 정기결제 관리 (해지 / 자동갱신)
// 자동갱신 결제(빌링)는 이노페이 자동결제 API 스펙 확보 후 연동.
// 해지는 DB 상태만 변경하므로 현재 적용 가능.
// ============================================================

export interface CancelSubscriptionResult {
  success: boolean;
  canceledAt?: string;
  currentPeriodEnd?: string;
  error?: string;
  message?: string;
}

/**
 * 정기결제(자동갱신) 해지 예약.
 * 현재 결제 기간(current_period_end)까지는 이용 가능하며, 이후 자동 갱신되지 않는다.
 * 결제대행사 호출 없이 구독 상태(canceled_at)만 변경한다.
 */
export async function cancelInnopaySubscription(
  subscriptionId: string,
): Promise<CancelSubscriptionResult> {
  const { data, error } = await supabase.functions.invoke('innopay-subscription-cancel', {
    body: { subscriptionId },
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

  return data as CancelSubscriptionResult;
}

// ============================================================
// PayApp 정기결제 (레거시 — 이노페이 전환 전까지 유지)
// ============================================================

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
