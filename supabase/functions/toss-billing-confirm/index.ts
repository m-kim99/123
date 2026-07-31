// ============================================================
// [폐기됨] 토스페이먼츠 빌링 승인 — 2026-07-29 무력화
//
// 토스 연동은 클라이언트에서 이미 주석 처리된 레거시 경로이고, 현재 결제는
// 이노페이 자동결제 웹링크(innopay-autopay-start/return)로 일원화돼 있다.
// 쓰지 않는 결제 엔드포인트를 공개해 둘 이유가 없어 차단한다.
// 원본 구현은 git 히스토리 참조.
// ============================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(() =>
  new Response(
    JSON.stringify({ error: 'GONE', message: '더 이상 지원하지 않는 결제 경로입니다.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  ),
);
