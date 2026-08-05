type Level = 'log' | 'error';
type Listener = (level: Level, args: unknown[]) => void;

/**
 * console.log/error 를 가로채 화면에 띄우기 위한 구독 창구.
 *
 * 원격 기기(실기기 iOS 등)라 Xcode/Safari 콘솔을 붙일 수 없을 때 쓴다.
 *
 * 컴포넌트가 직접 console 을 덮어쓰면, 두 개가 동시에 열렸을 때 두 번째가
 * '이미 패치된 함수'를 원본으로 기억한다. 그 상태로 해제 순서가 엇갈리면
 * 콘솔이 영구히 패치된 채 남는다. 여기서 참조 카운트로 한 번만 패치하고,
 * 구독자가 모두 사라질 때만 원복해 그 위험을 없앤다.
 */
const listeners = new Set<Listener>();
let original: { log: typeof console.log; error: typeof console.error } | null = null;

function emit(level: Level, args: unknown[]) {
  for (const fn of listeners) {
    try {
      fn(level, args);
    } catch {
      // 구독자 오류가 원래 로그 출력을 막지 않도록 삼킨다
    }
  }
}

function patch() {
  if (original) return; // 이미 패치됨 — 중첩 패치 방지
  original = { log: console.log, error: console.error };
  console.log = (...args: unknown[]) => {
    emit('log', args);
    original?.log(...args);
  };
  console.error = (...args: unknown[]) => {
    emit('error', args);
    original?.error(...args);
  };
}

function restore() {
  if (!original || listeners.size > 0) return;
  console.log = original.log;
  console.error = original.error;
  original = null;
}

/** 구독 시작. 반환된 함수를 호출하면 해제된다. */
export function subscribeConsole(listener: Listener): () => void {
  listeners.add(listener);
  patch();
  return () => {
    listeners.delete(listener);
    restore();
  };
}

/** 로그 인자를 사람이 읽을 수 있는 한 줄로 만든다. */
export function formatConsoleArg(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  // Capacitor 브릿지 에러는 Error 가 아닌 { message, code } 형태의 평범한 객체로 올 수 있음
  if (a && typeof a === 'object' && 'message' in a) {
    const code = 'code' in a ? ` (code: ${(a as { code: unknown }).code})` : '';
    return `${(a as { message: unknown }).message}${code}`;
  }
  try {
    const json = JSON.stringify(a);
    // Error 등 열거 불가능한 속성만 가진 객체는 JSON.stringify 가 "{}" 를 반환함
    return json && json !== '{}' ? json : String(a);
  } catch {
    return String(a);
  }
}
