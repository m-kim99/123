import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLAN_PRICING } from './payments';

/**
 * 요금 정책은 클라이언트와 결제 엣지 함수 3곳에 같은 리터럴로 복제돼 있다.
 * 어긋나면 innopay-payment-confirm 이 `amount !== members * pricePerMember` 로
 * 정상 결제를 거부하거나, 갱신 크론이 결제창과 다른 금액을 청구한다.
 */
const EDGE_FUNCTIONS = [
  'supabase/functions/innopay-autopay-start/index.ts',
  'supabase/functions/innopay-payment-confirm/index.ts',
  'supabase/functions/innopay-billing-renewal/index.ts',
];

/** 엣지 함수 소스에서 `basic: { ... }` / `pro: { ... }` 리터럴을 파싱 */
function parseEdgePricing(path: string, plan: 'basic' | 'pro') {
  const src = readFileSync(path, 'utf8');
  const m = src.match(
    new RegExp(`${plan}:\\s*\\{\\s*pricePerMember:\\s*(\\d+),\\s*minMembers:\\s*(\\d+),\\s*maxMembers:\\s*(\\d+|null)`),
  );
  if (!m) throw new Error(`${path} 에서 ${plan} 요금 리터럴을 찾지 못했습니다`);
  return {
    pricePerMember: Number(m[1]),
    minMembers: Number(m[2]),
    maxMembers: m[3] === 'null' ? null : Number(m[3]),
  };
}

describe('PLAN_PRICING', () => {
  it('베이직은 최소 결제 단위가 없다 (1인 6,600원)', () => {
    expect(PLAN_PRICING.basic.minMembers).toBe(1);
    expect(PLAN_PRICING.basic.maxMembers).toBe(3);
    expect(1 * PLAN_PRICING.basic.pricePerMember).toBe(6600);
    expect(3 * PLAN_PRICING.basic.pricePerMember).toBe(19800);
  });

  it('프로는 최소 3인 기준을 유지한다', () => {
    expect(PLAN_PRICING.pro.minMembers).toBe(3);
    expect(PLAN_PRICING.pro.maxMembers).toBe(20);
    expect(3 * PLAN_PRICING.pro.pricePerMember).toBe(45000);
  });

  it.each(EDGE_FUNCTIONS)('%s 의 요금 정책이 클라이언트와 일치한다', (path) => {
    expect(parseEdgePricing(path, 'basic')).toEqual(PLAN_PRICING.basic);
    expect(parseEdgePricing(path, 'pro')).toEqual(PLAN_PRICING.pro);
  });
});
