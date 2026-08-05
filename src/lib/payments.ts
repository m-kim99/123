import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

// App Store 심사 지침 3.1.1: iOS 앱 안에서는 IAP 외 결제 수단 UI 노출 금지 → 결제/플랜 구매 UI 전체 숨김.
// 외부 결제 유도 문구/링크도 금지(3.1.3)이므로 대체 문구에는 구매처(웹 등)를 언급하지 말 것.
export const hidePaymentUi = Capacitor.getPlatform() === 'ios';

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

// ============================================================
// 이노페이(INNOPAY) 연동
// [현행] 자동결제 웹링크(구독제): startInnopayAutopay — 이노페이 호스팅 결제창에서
//        카드 등록(빌키 발급) → 서버(innopay-autopay-return)가 1회차 결제 + 구독 활성화.
//        이후 매월 갱신은 innopay-billing-renewal 크론이 같은 빌키로 자동 청구.
// [레거시] V2 결제창(단회) 승인: confirmInnopayPayment
//        — 시작 경로(requestInnopayPayment)는 제거됨. 과거 진행 중이던 결제의
//          returnUrl(/billing/innopay/return) 복귀 처리용으로만 유지.
// ============================================================

/** 유료 플랜 가격 정책 (부가세 포함) — 서버(innopay-autopay-start)와 동일하게 유지할 것 */
export type PaidPlanName = 'basic' | 'pro';

export const PLAN_PRICING: Record<PaidPlanName, { pricePerMember: number; minMembers: number; maxMembers: number | null }> = {
  basic: { pricePerMember: 6600, minMembers: 3, maxMembers: 3 }, // 베이직: 인당 6,600원, 3인 고정 — 1인 회사도 최소 결제 단위 3인(19,800원)
  pro: { pricePerMember: 15000, minMembers: 3, maxMembers: 20 }, // 프로: 인당 15,000원, 3~20인
};

/** confirm 단계에서 사용할 결제 컨텍스트를 sessionStorage에 저장 */
const INNOPAY_CTX_KEY = 'innopay_payment_ctx';

export interface InnopayPaymentContext {
  moid: string;
  plan: PaidPlanName;
  customerKey: string;
  memberCount: number;
  amount: number;
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
// 이노페이 자동결제 웹링크 (구독제)
// 카드 등록은 이노페이 호스팅 UI(결제창)에서만 이뤄진다 — 앱/서버는 카드번호를 만지지 않는다.
// 등록(RAUT) → 이노페이 결제창 → billKey 발급 → 서버가 1회차 청구·구독 활성화(innopay-autopay-return).
// ============================================================

export interface StartInnopayAutopayParams {
  plan: PaidPlanName;
  customerKey: string;
  customerEmail?: string;
  customerName: string;
  customerPhone: string;
  memberCount: number;
}

/**
 * 이노페이 자동결제 웹링크(RAUT) 시작.
 * 성공 시 이노페이 카드등록 결제창으로 이동한다(리다이렉트, 반환 없음).
 * 실패 시에만 오류 객체를 반환한다.
 */
export async function startInnopayAutopay(
  params: StartInnopayAutopayParams,
): Promise<{ success: false; error: string; message?: string } | void> {
  const { data, error } = await supabase.functions.invoke('innopay-autopay-start', {
    body: { ...params, appOrigin: window.location.origin },
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

  const url = (data as { url?: string })?.url;
  if (!url) return { success: false, error: 'NO_URL' };

  // 이노페이 호스팅 카드등록 결제창으로 이동
  window.location.href = url;
}

// ============================================================
// 이노페이 정기결제 해지 (DB 상태만 변경 — 기간 만료 시 크론이 빌키 삭제)
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
// 이노페이 결제 취소(환불) — innopay-payment-cancel 엣지함수
// ============================================================

export interface RefundResult {
  success: boolean;
  canceledAmount?: number;
  remainAmount?: number;
  cancelNum?: string | null;
  subscriptionTerminated?: boolean;
  error?: string;
  code?: string;
  message?: string;
}

async function invokeRefund(body: Record<string, unknown>): Promise<RefundResult> {
  const { data, error } = await supabase.functions.invoke('innopay-payment-cancel', { body });

  if (error) {
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const resBody = await context.json();
        return { success: false, ...resBody };
      }
    } catch {
      // 본문 파싱 실패 시 아래 기본 오류 반환
    }
    return { success: false, error: 'REQUEST_FAILED', message: error.message };
  }

  return data as RefundResult;
}

/**
 * 셀프 청약철회 환불 (약관 제11조 ①)
 * 조건(첫 결제 + 7일 이내)은 서버에서 검증하며, 성공 시 전액 환불 + 구독 즉시 종료.
 */
export async function requestSelfRefund(paymentId: string): Promise<RefundResult> {
  return invokeRefund({ paymentId, mode: 'self' });
}

/**
 * 운영자 환불 — 전액/부분 금액·사유 지정, 구독 종료/유지 선택 (운영자 콘솔 전용)
 */
export async function requestOperatorRefund(params: {
  paymentId: string;
  cancelAmount: number;
  reason: string;
  subscriptionAction: 'terminate' | 'keep';
}): Promise<RefundResult> {
  return invokeRefund({ ...params, mode: 'operator' });
}

