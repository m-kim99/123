// ============================================================
// [폐기됨] 토스페이먼츠 정기결제 갱신 크론 — 2026-07-29 무력화
//
// 어떤 크론에도 등록돼 있지 않고(등록된 잡은 innopay-billing-renewal,
// check-expiring-subcategories 뿐), 토스 연동 자체가 레거시다.
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
