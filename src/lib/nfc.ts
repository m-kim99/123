import { Capacitor } from '@capacitor/core';
import { NfcPlugin } from '@/plugins/nfc-plugin';

/**
 * NFC 태그 데이터 타입
 */
export interface NFCTagData {
  categoryCode: string;
  categoryName: string;
  storageLocation: string;
  documentCount: number;
  subcategoryId?: string;
}

// NFC 동작 모드: 일반(idle) / 쓰기(writing)
export type NfcMode = 'idle' | 'writing';

const NFC_MODE_KEY = 'nfc_mode';
const NFC_MODE_TIMESTAMP_KEY = 'nfc_mode_timestamp';
const NFC_MODE_TIMEOUT_MS = 60000; // 60초 후 자동으로 idle로 복귀

export function setNfcMode(mode: NfcMode) {
  try {
    if (mode === 'writing') {
      localStorage.setItem(NFC_MODE_KEY, mode);
      localStorage.setItem(NFC_MODE_TIMESTAMP_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(NFC_MODE_KEY);
      localStorage.removeItem(NFC_MODE_TIMESTAMP_KEY);
    }
  } catch (e) {
    console.warn('localStorage 접근 실패:', e);
  }
}

export function getNfcMode(): NfcMode {
  try {
    const mode = localStorage.getItem(NFC_MODE_KEY);
    const timestamp = localStorage.getItem(NFC_MODE_TIMESTAMP_KEY);
    
    if (mode === 'writing' && timestamp) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      // 타임아웃 초과 시 자동으로 idle로 복귀
      if (elapsed < NFC_MODE_TIMEOUT_MS) {
        return 'writing';
      }
      // 타임아웃 초과 - 정리
      localStorage.removeItem(NFC_MODE_KEY);
      localStorage.removeItem(NFC_MODE_TIMESTAMP_KEY);
    }
  } catch (e) {
    console.warn('localStorage 접근 실패:', e);
  }
  return 'idle';
}

/**
 * NFC 지원 여부 확인
 * - 네이티브 Android: NFC 하드웨어 존재 여부 (항상 true, 비활성화 시 각 함수에서 에러 처리)
 * - 브라우저: Web NFC API(NDEFReader) 지원 여부
 */
export function isNFCSupported(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return 'NDEFReader' in window;
}

/**
 * NFC 권한 요청
 * - 네이티브: NFC 활성화 여부 확인
 * - 브라우저: Web NFC API 지원 확인
 */
export async function requestNFCPermission(): Promise<boolean> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않습니다.');
    }
    if (Capacitor.isNativePlatform()) {
      const { enabled } = await NfcPlugin.isEnabled();
      return enabled;
    }
    // 생성 자체가 가용성 확인 — 값은 쓰지 않는다
    // @ts-expect-error Web NFC(NDEFReader)는 TypeScript 표준 타입에 없다
    new NDEFReader();
    return true;
  } catch (error) {
    console.error('NFC 권한 요청 오류:', error);
    return false;
  }
}

/**
 * NFC 태그에 데이터 쓰기 (JSON 형식)
 * @param data 카테고리 정보
 * @returns 쓰기 성공 여부
 */
export async function writeNFCTag(data: NFCTagData): Promise<boolean> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않습니다.');
    }

    const jsonData = JSON.stringify({
      categoryCode: data.categoryCode,
      categoryName: data.categoryName,
      storageLocation: data.storageLocation,
      documentCount: data.documentCount,
      timestamp: new Date().toISOString(),
    });

    console.log('NFC 태그에 데이터 쓰기 시작...', data);

    if (Capacitor.isNativePlatform()) {
      await NfcPlugin.writeData({ data: jsonData });
      console.log('NFC 태그에 데이터 쓰기 완료 (네이티브)');
      return true;
    }

    // 브라우저: Web NFC API
    // @ts-expect-error Web NFC(NDEFReader)는 TypeScript 표준 타입에 없다
    const ndef = new NDEFReader();
    const encoder = new TextEncoder();
    await ndef.write({
      records: [{
        recordType: 'mime',
        mediaType: 'application/json',
        data: encoder.encode(jsonData),
      }],
    });
    console.log('NFC 태그에 데이터 쓰기 완료 (Web NFC)');
    return true;
  } catch (error) {
    console.error('NFC 태그 쓰기 오류:', error);
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다.');
      }
      throw new Error(`NFC 태그 쓰기 실패: ${error.message}`);
    }
    throw new Error('NFC 태그 쓰기 중 알 수 없는 오류가 발생했습니다.');
  }
}
 
/**
 * 대기 중인 네이티브 쓰기를 해제한다. 등록 다이얼로그를 닫을 때 반드시 호출할 것.
 *
 * 호출하지 않으면 네이티브는 쓰기가 걸린 상태로 남는다. 안드로이드는 시스템 시트가
 * 없고 foreground dispatch가 계속 켜져 있으므로, 사용자가 나중에 아무 태그나 대는
 * 순간 그 태그가 이전 대상의 URL로 조용히 덮어써진다.
 */
export async function cancelNFCWrite(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NfcPlugin.cancelWrite();
  } catch (e) {
    console.warn('NFC 쓰기 취소 실패:', e);
  }
}

/**
 * NFC 태그에 URL 쓰기 (iOS/Android 호환)
 * 현재 구현에서는 세부 스토리지(subcategory)를 대상으로 동작하며,
 * 태그에 /nfc-redirect?subcategoryId=... 형태의 URL을 기록합니다.
 *
 * 네이티브에서는 **1세션 1탭**이다. 쓰기 세션이 이미 태그를 물고 있으므로 UID를 함께
 * 돌려받는다. 예전에는 UID를 얻으려고 readNFCUid()로 읽기 세션을 먼저 열고 끝낸 뒤
 * 쓰기 세션을 다시 여는 2세션 구조였는데, iOS는 그 세션 전환 구간에서
 * systemIsBusy(203)·teardown 경합·백그라운드 태그리딩에 노출돼 쓰기가 실패했다.
 *
 * @param subcategoryId 세부 스토리지 ID
 * @param _subcategoryName 세부 스토리지 이름 (현재는 로깅/확장용으로만 사용)
 * @returns 쓰기에 성공한 태그의 UID
 */
export async function writeNFCUrl(
  subcategoryId: string,
  _subcategoryName: string
): Promise<string> {
  if (!isNFCSupported()) {
    throw new Error('NFC가 지원되지 않습니다.');
  }

  const uploadUrl = `${window.location.origin}/nfc-redirect?subcategoryId=${subcategoryId}`;
  // 쓰기 직후 iOS 백그라운드 태그리딩이 방금 쓴 URL로 유니버설 링크를 걸어
  // 화면을 튕기지 않도록 등록 플로우 내내 'writing'을 유지한다.
  // 'idle' 복귀 책임은 호출자(proceedNfcRegistration)에 있다.
  setNfcMode('writing');
  console.log('NFC URL 쓰기 시작:', uploadUrl, '| platform:', Capacitor.getPlatform(), '| isNative:', Capacitor.isNativePlatform());

  try {
    if (Capacitor.isNativePlatform()) {
      // 네이티브 세션이 응답 없이 죽어도 Promise가 영구 pending되지 않도록 안전장치
      // (iOS 세션 자체 타임아웃 60초보다 길게 잡아 네이티브 오류 메시지가 우선하도록)
      let writeTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const { uid } = await Promise.race([
          NfcPlugin.writeUrl({ url: uploadUrl }),
          new Promise<never>((_, timeoutReject) => {
            writeTimeout = setTimeout(
              () => timeoutReject(new Error('NFC 쓰기 응답 시간 초과')),
              70000
            );
          }),
        ]);
        console.log('NFC URL 쓰기 완료 (네이티브), uid:', uid);
        return uid;
      } catch (e) {
        // 타임아웃으로 JS Promise만 끊어지면 네이티브는 여전히 쓰기가 걸린 상태다.
        // 그대로 두면 이후 사용자가 아무 태그나 대는 순간 덮어써진다(특히 안드로이드).
        await cancelNFCWrite();
        throw e;
      } finally {
        clearTimeout(writeTimeout);
      }
    }

    // 브라우저: Web NFC의 write()는 태그 UID를 주지 않으므로 스캔으로 UID를 먼저 얻는다.
    // (네이티브와 달리 여기서는 2단계가 불가피하다)
    const uid = await readNFCUid();
    // @ts-expect-error Web NFC(NDEFReader)는 TypeScript 표준 타입에 없다
    const ndef = new NDEFReader();
    await ndef.write({
      records: [{ recordType: 'url', data: uploadUrl }],
    });
    console.log('NFC URL 쓰기 완료 (Web NFC), uid:', uid);
    return uid;
  } catch (error) {
    console.error('NFC URL 쓰기 오류:', error);
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다.');
      }
      throw new Error(`NFC 쓰기 실패: ${error.message}`);
    }
    throw new Error('NFC 쓰기 중 알 수 없는 오류가 발생했습니다.');
  }
  // NOTE: setNfcMode('idle')을 여기서 호출하지 않음
  // 호출자(proceedNfcRegistration)가 DB 등록까지 완료된 후 setNfcMode('idle') 호출 책임
}

/**
 * NFC 태그 읽기 (NDEF 데이터)
 * @returns 태그 데이터
 */
export async function readNFCTag(): Promise<NFCTagData> {
  if (!isNFCSupported()) {
    throw new Error('NFC가 지원되지 않습니다.');
  }

  if (Capacitor.isNativePlatform()) {
    // executor 는 동기로 두고 비동기 준비는 안쪽 IIFE 에서 한다.
    // executor 를 async 로 두면 addListener 가 던졌을 때 그 거부가 이 Promise 로
    // 전달되지 않아, 30초 뒤 타임아웃이 "읽기 시간 초과"라는 엉뚱한 이유로 실패했다.
    return new Promise((resolve, reject) => {
      let resolved = false;

      const cleanup = (tagHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>>, cancelHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>>) => {
        tagHandle.remove();
        cancelHandle.remove();
      };

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          NfcPlugin.stopScan().catch(() => {});
          reject(new Error('NFC 태그 읽기 시간이 초과되었습니다.'));
        }
      }, 30000);

      const fail = (e: unknown) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        NfcPlugin.stopScan().catch(() => {});
        reject(e);
      };

      void (async () => {
        let tagHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>> | undefined;
        let cancelHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>> | undefined;
        try {
          tagHandle = await NfcPlugin.addListener('nfcTagDetected', (tag) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
            NfcPlugin.stopScan().catch(() => {});
            const tagData = parseTagPayload(tag.payload, tag.recordType);
            console.log('NFC 태그 읽기 완료 (네이티브):', tagData);
            resolve(tagData);
          });

          cancelHandle = await NfcPlugin.addListener('nfcScanCancelled', (event) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
            reject(new Error(event.reason === 'userCancelled'
              ? 'NFC 스캔이 취소되었습니다.'
              : `NFC 스캔 실패: ${event.reason}`));
          });

          await NfcPlugin.startScan();
        } catch (e) {
          if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
          else {
            tagHandle?.remove();
            cancelHandle?.remove();
          }
          fail(e);
        }
      })();
    });
  }

  // 브라우저: Web NFC API
  console.log('NFC 태그 읽기 시작 (Web NFC)...');
  // @ts-expect-error Web NFC(NDEFReader)는 TypeScript 표준 타입에 없다
  const ndef = new NDEFReader();
  await ndef.scan();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('NFC 태그 읽기 시간이 초과되었습니다.'));
    }, 30000);

    ndef.onreading = (event: any) => {
      clearTimeout(timeoutId);
      try {
        const records = event.message?.records || [];
        if (records.length === 0) {
          reject(new Error('NFC 태그에서 데이터를 읽을 수 없습니다.'));
          return;
        }
        const record = records[0];
        let decodedData = '';
        try {
          decodedData = new TextDecoder().decode(record.data);
        } catch (_) {}
        const tagData = parseTagPayload(decodedData, record.recordType);
        resolve(tagData);
      } catch (_parseError) {
        reject(new Error('NFC 태그 데이터를 파싱할 수 없습니다.'));
      }
    };

    ndef.onreadingerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('NFC 태그 읽기 중 오류가 발생했습니다.'));
    };
  });
}

function parseTagPayload(payload: string | undefined, recordType: string | undefined): NFCTagData {
  if (payload && (recordType === 'url' || payload.includes('/nfc-redirect?subcategoryId='))) {
    try {
      const url = new URL(payload, window.location.origin);
      const subcategoryId = url.searchParams.get('subcategoryId');
      if (subcategoryId) {
        return { categoryCode: '', categoryName: '', storageLocation: '', documentCount: 0, subcategoryId };
      }
    } catch (_) {}
  }
  if (payload) {
    try {
      const data = JSON.parse(payload);
      return {
        categoryCode: data.categoryCode || '',
        categoryName: data.categoryName || '',
        storageLocation: data.storageLocation || '',
        documentCount: data.documentCount || 0,
      };
    } catch (_) {}
  }
  return { categoryCode: '', categoryName: '', storageLocation: '', documentCount: 0 };
}

/**
 * NFC 태그의 UID만 읽기 (범용 ID 방식용)
 * @returns 태그의 고유 ID (UID)
 * 주의: 성공 시 setNfcMode('idle') 호출 책임은 호출자에게 있음
 */
export async function readNFCUid(): Promise<string> {
  setNfcMode('writing');
  console.log('NFC UID 읽기 시작 | platform:', Capacitor.getPlatform(), '| isNative:', Capacitor.isNativePlatform(), '| supported:', isNFCSupported());
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않습니다.');
    }

    if (Capacitor.isNativePlatform()) {
      console.log('NFC startScan() 호출 직전');
      // executor 는 동기로 두고 비동기 준비는 안쪽 IIFE 에서 한다 (readNFCTag 와 동일한 이유).
      return await new Promise<string>((resolve, reject) => {
        let resolved = false;

        const cleanup = (tagHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>>, cancelHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>>) => {
          tagHandle.remove();
          cancelHandle.remove();
        };

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            NfcPlugin.stopScan().catch(() => {});
            setNfcMode('idle');
            reject(new Error('NFC 태그 읽기 시간 초과 (30초)'));
          }
        }, 30000);

        void (async () => {
          let tagHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>> | undefined;
          let cancelHandle: Awaited<ReturnType<typeof NfcPlugin.addListener>> | undefined;
          try {
            tagHandle = await NfcPlugin.addListener('nfcTagDetected', (tag) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timeout);
              if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
              NfcPlugin.stopScan().catch(() => {});
              console.log('NFC UID 읽음 (네이티브):', tag.uid);
              resolve(tag.uid);
            });

            cancelHandle = await NfcPlugin.addListener('nfcScanCancelled', (event) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(timeout);
              if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
              setNfcMode('idle');
              reject(new Error(event.reason === 'userCancelled'
                ? 'NFC 스캔이 취소되었습니다.'
                : `NFC 스캔 실패: ${event.reason}`));
            });

            await NfcPlugin.startScan();
            console.log('NFC startScan() 응답 받음 (네이티브 세션 시작 요청 완료) - 이제 태그 감지 대기 중');
          } catch (e) {
            console.error('NFC 스캔 준비 실패:', e);
            if (tagHandle && cancelHandle) cleanup(tagHandle, cancelHandle);
            else {
              tagHandle?.remove();
              cancelHandle?.remove();
            }
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              NfcPlugin.stopScan().catch(() => {});
              setNfcMode('idle');
              reject(e);
            }
          }
        })();
      });
    }

    // 브라우저: Web NFC API
    // @ts-expect-error Web NFC(NDEFReader)는 TypeScript 표준 타입에 없다
    const ndef = new NDEFReader();
    await ndef.scan();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('NFC 태그 읽기 시간 초과 (30초)'));
      }, 30000);

      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        clearTimeout(timeout);
        const uid = serialNumber.replace(/:/g, '').toUpperCase();
        console.log('NFC UID 읽음 (Web NFC):', uid);
        resolve(uid);
      });

      ndef.addEventListener('readingerror', () => {
        clearTimeout(timeout);
        reject(new Error('NFC 태그 읽기 실패'));
      });
    });
  } catch (error) {
    console.error('NFC UID 읽기 실패:', error);
    setNfcMode('idle');
    // 실제 실패 사유를 유지 - 일반 메시지로 덮으면 근본 원인 진단이 불가능해짐
    throw error instanceof Error ? error : new Error('NFC UID를 읽을 수 없습니다.');
  }
}
