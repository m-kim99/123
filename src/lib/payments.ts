import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

// ============================================================
// 토스페이먼츠 빌링(정기결제) 연동
// 카드 등록창(requestBillingAuth)까지 — 빌링키 발급/승인은 시크릿 키 발급 후 서버(Edge Function)에서 처리 예정
// ============================================================

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
