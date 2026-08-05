import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * checkSubscriptionAccess 는 로그인 게이트의 판정 함수다.
 * fail-open(조회 실패 시 통과)과 fail-closed(플랜 전용 기능은 차단)가 섞여 있어
 * 한쪽을 고치다 다른 쪽을 깨뜨리기 쉬운 지점이라 동작을 고정해 둔다.
 */

/** supabase 쿼리 체이닝을 흉내내고 maybeSingle() 결과만 주입한다. */
const maybeSingleResult = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'limit']) {
        chain[m] = () => chain;
      }
      chain.maybeSingle = () => maybeSingleResult();
      return chain;
    },
  },
}));

const { checkSubscriptionAccess } = await import('@/lib/subscription');

const future = () => new Date(Date.now() + 86_400_000).toISOString();
const past = () => new Date(Date.now() - 86_400_000).toISOString();

beforeEach(() => {
  maybeSingleResult.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('checkSubscriptionAccess', () => {
  it('구독이 없으면 차단하고 status=none', async () => {
    maybeSingleResult.mockResolvedValue({ data: null, error: null });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(false);
    expect(r.status).toBe('none');
    expect(r.canUseStorageLifecycle).toBe(false);
  });

  it('기간이 남은 active 는 허용', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'active', current_period_end: future(), plan: { feature_storage_lifecycle: true } },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(true);
    expect(r.status).toBe('active');
    expect(r.canUseStorageLifecycle).toBe(true);
  });

  it('체험(trialing)도 기간이 남아 있으면 허용', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'trialing', current_period_end: future(), plan: { feature_storage_lifecycle: true } },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(true);
    expect(r.status).toBe('trialing');
    // 무료체험은 pro 플랜이라 입출고를 쓸 수 있어야 한다
    expect(r.canUseStorageLifecycle).toBe(true);
  });

  it('결제 실패(past_due)는 기간이 남아 있어도 차단', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'past_due', current_period_end: future(), plan: { feature_storage_lifecycle: true } },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(false);
    expect(r.status).toBe('past_due');
    // 차단 상태에서 플랜 전용 기능이 열리면 안 된다
    expect(r.canUseStorageLifecycle).toBe(false);
  });

  it('기간이 지났으면 status=expired 로 차단', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'active', current_period_end: past(), plan: { feature_storage_lifecycle: true } },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(false);
    expect(r.status).toBe('expired');
    expect(r.canUseStorageLifecycle).toBe(false);
  });

  it('만료일이 없으면(무기한) 허용', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'active', current_period_end: null, plan: { feature_storage_lifecycle: false } },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(true);
    expect(r.canUseStorageLifecycle).toBe(false);
  });

  it('조회 실패 시 fail-open 하되 degraded 로 표시하고, 플랜 전용 기능은 fail-closed', async () => {
    maybeSingleResult.mockResolvedValue({ data: null, error: new Error('network') });

    const r = await checkSubscriptionAccess('c1');

    // 네트워크 문제로 멀쩡한 고객을 잠그지 않는다
    expect(r.allowed).toBe(true);
    expect(r.degraded).toBe(true);
    // 다만 확인되지 않은 상태이므로 플랜 전용 기능은 열지 않는다
    expect(r.canUseStorageLifecycle).toBe(false);
  });

  it('플랜 정보가 없으면 입출고를 열지 않는다', async () => {
    maybeSingleResult.mockResolvedValue({
      data: { status: 'active', current_period_end: future(), plan: null },
      error: null,
    });

    const r = await checkSubscriptionAccess('c1');

    expect(r.allowed).toBe(true);
    expect(r.canUseStorageLifecycle).toBe(false);
  });
});
