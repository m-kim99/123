// import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// App Store 심사 지침 3.1.1: iOS 앱 안에서는 IAP 외 결제 수단 UI 노출 금지 → 결제/플랜 구매 UI 전체 숨김.
// 외부 결제 유도 문구/링크도 금지(3.1.3)이므로 대체 문구에는 구매처(웹 등)를 언급하지 말 것.
export const hidePaymentUi = Capacitor.getPlatform() === 'ios';

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
// 이노페이(INNOPAY) V2 결제 연동 (결제창 SDK + 승인 API)
// requestInnopayPayment(goPay 결제창) → confirmInnopayPayment(승인 API)
// 계약 범위가 결제창(1회성)뿐이라 자동갱신 없음 — 월 단위 수동 재결제 구조.
// 만료 안내/전환은 innopay-billing-renewal 크론이 담당.
// ============================================================

// MID는 결제창에 노출되는 공개 값 (비밀키는 엣지함수에만 보관)
// 환경변수 미설정 시 이노페이 테스트 MID 사용
const INNOPAY_MID = import.meta.env.VITE_INNOPAY_MID || 'testpay01m';
const INNOPAY_SDK_URL = 'https://pg.innopay.co.kr/tpay/js/v1/innopay.js';

/** 유료 플랜 가격 정책 (부가세 포함) — 서버(innopay-payment-confirm)와 동일하게 유지할 것 */
export type PaidPlanName = 'basic' | 'pro';

export const PLAN_PRICING: Record<PaidPlanName, { pricePerMember: number; minMembers: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, minMembers: 1, maxMembers: 3 }, // 베이직: 인당 6,600원, 최대 3인 (인원 추가 불가)
  pro: { pricePerMember: 15000, minMembers: 3, maxMembers: 20 }, // 프로: 인당 15,000원, 3~20인
};

// [중요] 이노페이 SDK(innopay.js)는 클래식 스크립트에서 `const innopay = {...}` 로
// 선언된다. 클래식 스크립트 top-level의 const/let 은 '전역 렉시컬 바인딩'이라
// window 속성으로 노출되지 않는다(window.innopay === undefined). 따라서 반드시
// window.innopay 가 아닌 전역 식별자 `innopay` 로 접근해야 한다. (공식 예제도 동일)
interface InnopaySdk {
  goPay: (params: Record<string, unknown>) => void;
  closeHandler?: (moid: string) => void;
}
declare const innopay: InnopaySdk | undefined;

let innopaySdkPromise: Promise<void> | null = null;

/** 전역 렉시컬 바인딩 innopay 가 사용 가능한지 안전하게 확인 (미로드 시 typeof 로 ReferenceError 방지) */
function isInnopaySdkReady(): boolean {
  return typeof innopay !== 'undefined' && !!innopay && typeof innopay.goPay === 'function';
}

/** 이노페이 결제창 SDK 로드 (1회만) */
function loadInnopaySdk(): Promise<void> {
  if (isInnopaySdkReady()) return Promise.resolve();
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
 * [중요] Radix Dialog(모달)는 열려 있는 동안 document.body에 pointer-events:none을 건다.
 * 이노페이 결제창은 React 트리 밖 body 직속 레이어로 붙기 때문에 이 상태에서는
 * 결제창의 체크박스/버튼이 전부 클릭 불가가 된다. 호출측은 결제창을 열기 전에
 * 다이얼로그를 닫아야 하며, 닫힘 exit 애니메이션(~200ms) 동안에도 잠금이 유지되므로
 * 여기서 해제될 때까지 잠시 대기한다. (최대 maxWaitMs 후에는 그냥 진행)
 */
async function waitForBodyPointerEvents(maxWaitMs = 1500): Promise<void> {
  const startedAt = Date.now();
  while (document.body.style.pointerEvents === 'none' && Date.now() - startedAt < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
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
  if (!isInnopaySdkReady()) {
    throw new Error('이노페이 SDK를 사용할 수 없습니다.');
  }

  // 모달 다이얼로그가 걸어둔 body pointer-events 잠금이 풀린 뒤 결제창을 연다
  await waitForBodyPointerEvents();

  // 이노페이 제한: moid 40자 이하 (UUID 풀 + ms 타임스탬프는 54자라 초과됨)
  // 형식: dms_{userId앞8자}_{타임스탬프 base36}_{난수4자} = 26자
  const moid = `dms_${params.customerKey.replace(/-/g, '').slice(0, 8)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const ctx: InnopayPaymentContext = {
    moid,
    plan: params.plan,
    customerKey: params.customerKey,
    memberCount: params.memberCount,
    amount: params.amount,
  };
  sessionStorage.setItem(INNOPAY_CTX_KEY, JSON.stringify(ctx));

  innopay!.goPay({
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
