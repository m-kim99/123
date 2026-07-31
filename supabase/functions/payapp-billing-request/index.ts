// ============================================================
// [폐기됨] PayApp 정기결제 등록 요청 — 2026-07-29 무력화
//
// payapp-billing-confirm 의 무료 구독 활성화 취약점을 성립시키는 선행 단계
// (pending 행 생성)라 함께 차단한다. 현재 결제는 이노페이 자동결제 웹링크
// (innopay-autopay-start/return)로 일원화돼 이 경로는 사용되지 않는다.
// 원본 구현은 git 히스토리 참조.
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(() =>
  new Response(
    JSON.stringify({ error: 'GONE', message: '더 이상 지원하지 않는 결제 경로입니다.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  ),
);
