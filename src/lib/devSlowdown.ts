/**
 * DEV-ONLY: Artificial performance degradation for optimization testing.
 *
 * Toggle the ENABLED flag to turn slowdowns on/off.
 * Remove this file entirely once optimization work is complete.
 */

// ──────────────────── MASTER SWITCH ────────────────────
export const DEV_SLOWDOWN = {
  ENABLED: true,

  // Lazy-import artificial delay (ms)
  LAZY_DELAY_MS: 800,

  // Extra blocking work on every React re-render (iterations)
  RENDER_BURN_ITERATIONS: 600_000,

  // Artificial delay added to fetch/XHR responses (ms)
  FETCH_DELAY_MS: 500,
};

// ──────────────────── Slow lazy() wrapper ────────────────────
/**
 * Drop-in replacement for React.lazy() that adds an artificial import delay.
 * Usage: `const Page = slowLazy(() => import('./pages/Page'));`
 */
export function slowLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  const { lazy } = require('react');
  if (!DEV_SLOWDOWN.ENABLED) return lazy(factory);

  return lazy(() =>
    Promise.all([
      factory(),
      new Promise((r) => setTimeout(r, DEV_SLOWDOWN.LAZY_DELAY_MS)),
    ]).then(([mod]) => mod),
  );
}

// ──────────────────── Expensive render hook ────────────────────
/**
 * Call at the top of any component to simulate an expensive render.
 * Does synchronous CPU work so React Profiler picks it up.
 */
export function useSlowRender() {
  if (!DEV_SLOWDOWN.ENABLED) return;
  let x = 0;
  for (let i = 0; i < DEV_SLOWDOWN.RENDER_BURN_ITERATIONS; i++) {
    x += Math.sqrt(i);
  }
  // prevent dead-code elimination
  if (x < 0) console.log(x);
}

// ──────────────────── Slow fetch interceptor ────────────────────
let _interceptorInstalled = false;

/**
 * Monkey-patches globalThis.fetch to add an artificial delay.
 * Call once at app startup (e.g. in main.tsx).
 * Safe to call multiple times — only installs once.
 */
export function installFetchSlowdown() {
  if (!DEV_SLOWDOWN.ENABLED || _interceptorInstalled) return;
  _interceptorInstalled = true;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    await new Promise((r) => setTimeout(r, DEV_SLOWDOWN.FETCH_DELAY_MS));
    return originalFetch(...args);
  };

  console.warn(
    `[devSlowdown] 🐢 Performance degradation active — lazy +${DEV_SLOWDOWN.LAZY_DELAY_MS}ms, fetch +${DEV_SLOWDOWN.FETCH_DELAY_MS}ms, render burn ${DEV_SLOWDOWN.RENDER_BURN_ITERATIONS} iters`,
  );
}
