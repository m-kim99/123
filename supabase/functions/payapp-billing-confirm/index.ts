// ============================================================
// [폐기됨] PayApp 정기결제 승인 — 2026-07-29 무력화
//
// 사유(보안): 실제 결제 완료를 PayApp API 로 검증하지 않고 pending 행의 존재만
//   확인한 뒤, 클라이언트가 보낸 memberCount/amount 를 그대로 신뢰해 구독을
//   status='active' 로 만들었다. 즉 결제 없이 유료 구독을 활성화할 수 있었다.
//   service_role 로 동작하므로 테이블 RLS 하드닝으로도 막히지 않는다.
//
// 현재 결제는 이노페이 자동결제 웹링크(innopay-autopay-start/return)로 일원화돼
// 이 경로는 사용되지 않는다(payapp 구독 0건). 원본 구현은 git 히스토리 참조.
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(() =>
  new Response(
    JSON.stringify({ error: 'GONE', message: '더 이상 지원하지 않는 결제 경로입니다.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  ),
);
