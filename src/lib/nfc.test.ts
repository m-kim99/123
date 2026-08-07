import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * NFC 쓰기 경로 회귀 테스트.
 *
 * iOS 쓰기 실패의 원인은 "UID를 얻으려고 읽기 세션을 먼저 열고 끝낸 뒤 쓰기 세션을
 * 다시 여는" 2세션 구조였다. iOS는 그 세션 전환 구간에서 실패한다. 정상 동작하는
 * 구버전 네이티브 앱(traystorage_ios_kr)은 세션을 한 번만 연다.
 *
 * 그래서 이 파일이 고정하려는 핵심 불변식은 하나다:
 *   **네이티브 쓰기는 읽기 세션을 절대 열지 않고, UID는 쓰기 세션이 돌려준다.**
 * 실기기 없이 되돌아가는 회귀를 잡기 위한 것이므로, 태그 하드웨어 동작이 아니라
 * JS 오케스트레이션의 순서·계약만 검증한다.
 */

const isNativePlatform = vi.fn<() => boolean>();
const getPlatform = vi.fn<() => string>();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
    getPlatform: () => getPlatform(),
  },
}));

const writeUrl = vi.fn();
const startScan = vi.fn();
const stopScan = vi.fn();
const addListener = vi.fn();
const cancelWrite = vi.fn();

vi.mock('@/plugins/nfc-plugin', () => ({
  NfcPlugin: {
    writeUrl: (...args: unknown[]) => writeUrl(...args),
    startScan: (...args: unknown[]) => startScan(...args),
    stopScan: (...args: unknown[]) => stopScan(...args),
    addListener: (...args: unknown[]) => addListener(...args),
    cancelWrite: (...args: unknown[]) => cancelWrite(...args),
    isEnabled: () => Promise.resolve({ enabled: true }),
  },
}));

import { writeNFCUrl, getNfcMode, setNfcMode, cancelNFCWrite } from '@/lib/nfc';

const SUBCATEGORY_ID = '3f8b1c22-9a41-4d7e-b0f5-2c6de91a4477';
const TAG_UID = '047364B2767281';

beforeEach(() => {
  vi.clearAllMocks();

  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('window', { location: { origin: 'https://traystorageconnect.com' } });

  isNativePlatform.mockReturnValue(true);
  getPlatform.mockReturnValue('ios');
  writeUrl.mockResolvedValue({ uid: TAG_UID });
  stopScan.mockResolvedValue(undefined);
  cancelWrite.mockResolvedValue(undefined);
  setNfcMode('idle');
});

describe('writeNFCUrl - 네이티브 1세션 경로', () => {
  it('쓰기 세션이 돌려준 UID를 그대로 반환한다', async () => {
    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).resolves.toBe(TAG_UID);
  });

  it('읽기 세션을 절대 열지 않는다 (이 수정의 핵심 — 되돌아가면 iOS 쓰기가 다시 깨진다)', async () => {
    await writeNFCUrl(SUBCATEGORY_ID, '3층 서고');

    expect(startScan).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();
    expect(writeUrl).toHaveBeenCalledTimes(1);
  });

  it('태그에 기록할 URL을 정확히 구성한다', async () => {
    await writeNFCUrl(SUBCATEGORY_ID, '3층 서고');

    expect(writeUrl).toHaveBeenCalledWith({
      url: `https://traystorageconnect.com/nfc-redirect?subcategoryId=${SUBCATEGORY_ID}`,
    });
  });

  it("쓰기 시작 시 nfc_mode를 'writing'으로 올린다 (방금 쓴 태그의 유니버설 링크가 화면을 튕기지 않도록)", async () => {
    expect(getNfcMode()).toBe('idle');

    let modeDuringWrite: string | undefined;
    writeUrl.mockImplementation(async () => {
      modeDuringWrite = getNfcMode();
      return { uid: TAG_UID };
    });

    await writeNFCUrl(SUBCATEGORY_ID, '3층 서고');

    expect(modeDuringWrite).toBe('writing');
    // 'idle' 복귀는 DB 등록까지 끝낸 호출자(NFCRegistrationDialog) 책임이므로
    // 쓰기 성공 직후에는 여전히 'writing'이어야 한다.
    expect(getNfcMode()).toBe('writing');
  });

  it('안드로이드에서도 동일하게 1세션으로 동작한다', async () => {
    getPlatform.mockReturnValue('android');

    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).resolves.toBe(TAG_UID);
    expect(startScan).not.toHaveBeenCalled();
  });
});

describe('writeNFCUrl - 실패 경로', () => {
  it('네이티브가 준 실패 사유를 삼키지 않고 메시지에 유지한다', async () => {
    // 이 사유가 사라지면 4라운드 동안 겪은 "원인 모를 실패"로 되돌아간다.
    writeUrl.mockRejectedValue(new Error('NFC write failed: Stack Error (code 401)'));

    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).rejects.toThrow(
      'NFC 쓰기 실패: NFC write failed: Stack Error (code 401)'
    );
  });

  it('쓰기가 실패하면 UID를 지어내지 않고 throw한다 (DB에 잘못된 태그가 등록되면 안 됨)', async () => {
    writeUrl.mockRejectedValue(new Error('Tag is not NDEF formatted (iOS cannot format tags)'));

    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).rejects.toThrow();
  });

  it('NFC 미지원 기기에서는 쓰기를 시도조차 하지 않는다', async () => {
    isNativePlatform.mockReturnValue(false);
    vi.stubGlobal('window', { location: { origin: 'https://traystorageconnect.com' } });

    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).rejects.toThrow('NFC가 지원되지 않습니다.');
    expect(writeUrl).not.toHaveBeenCalled();
  });

  it('네이티브가 응답 없이 죽어도 영구 pending되지 않는다', async () => {
    vi.useFakeTimers();
    writeUrl.mockReturnValue(new Promise(() => {})); // 영원히 미해결

    const promise = writeNFCUrl(SUBCATEGORY_ID, '3층 서고');
    const assertion = expect(promise).rejects.toThrow('NFC 쓰기 응답 시간 초과');

    await vi.advanceTimersByTimeAsync(70_000);
    await assertion;

    vi.useRealTimers();
  });
});

describe('쓰기 해제 (cancelWrite)', () => {
  /**
   * 안드로이드는 시스템 시트가 없고 foreground dispatch가 계속 켜져 있어서,
   * 쓰기가 걸린 채로 남으면 사용자가 나중에 아무 태그나 대는 순간 그 태그가
   * 이전 대상의 URL로 덮어써진다. JS 쪽 Promise만 끊는 것으로는 부족하다.
   */
  it('타임아웃으로 JS가 포기할 때 네이티브 쓰기도 반드시 해제한다', async () => {
    vi.useFakeTimers();
    writeUrl.mockReturnValue(new Promise(() => {}));

    const promise = writeNFCUrl(SUBCATEGORY_ID, '3층 서고');
    const assertion = expect(promise).rejects.toThrow('NFC 쓰기 응답 시간 초과');

    await vi.advanceTimersByTimeAsync(70_000);
    await assertion;

    expect(cancelWrite).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('쓰기가 실패했을 때도 네이티브 쓰기를 해제한다', async () => {
    writeUrl.mockRejectedValue(new Error('NFC write failed: Tag was lost'));

    await expect(writeNFCUrl(SUBCATEGORY_ID, '3층 서고')).rejects.toThrow();
    expect(cancelWrite).toHaveBeenCalledTimes(1);
  });

  it('쓰기가 성공하면 해제를 부르지 않는다', async () => {
    await writeNFCUrl(SUBCATEGORY_ID, '3층 서고');
    expect(cancelWrite).not.toHaveBeenCalled();
  });

  it('해제가 실패해도 예외를 밖으로 던지지 않는다 (다이얼로그 닫기를 막으면 안 됨)', async () => {
    cancelWrite.mockRejectedValue(new Error('UNIMPLEMENTED'));
    await expect(cancelNFCWrite()).resolves.toBeUndefined();
  });

  it('브라우저에서는 네이티브 해제를 시도하지 않는다', async () => {
    isNativePlatform.mockReturnValue(false);
    await cancelNFCWrite();
    expect(cancelWrite).not.toHaveBeenCalled();
  });
});
