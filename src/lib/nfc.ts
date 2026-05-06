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
  // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
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
    // @ts-ignore
    const ndef = new NDEFReader();
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
    // @ts-ignore
    const ndef = new NDEFReader();
    const encoder = new TextEncoder();
    // @ts-ignore
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
 * NFC 태그에 URL 쓰기 (iOS/Android 호환)
 * 현재 구현에서는 세부 스토리지(subcategory)를 대상으로 동작하며,
 * 태그에 /nfc-redirect?subcategoryId=... 형태의 URL을 기록합니다.
 * @param subcategoryId 세부 스토리지 ID
 * @param _subcategoryName 세부 스토리지 이름 (현재는 로깅/확장용으로만 사용)
 * @returns 쓰기 성공 여부
 */
export async function writeNFCUrl(
  subcategoryId: string,
  _subcategoryName: string
): Promise<boolean> {
  setNfcMode('writing');
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않습니다.');
    }

    const uploadUrl = `${window.location.origin}/nfc-redirect?subcategoryId=${subcategoryId}`;
    console.log('NFC URL 쓰기 시작:', uploadUrl);

    if (Capacitor.isNativePlatform()) {
      await NfcPlugin.writeUrl({ url: uploadUrl });
      console.log('NFC URL 쓰기 완료 (네이티브)');
      return true;
    }

    // 브라우저: Web NFC API
    // @ts-ignore
    const ndef = new NDEFReader();
    await ndef.write({
      records: [{ recordType: 'url', data: uploadUrl }],
    });
    console.log('NFC URL 쓰기 완료 (Web NFC)');
    return true;
  } catch (error) {
    console.error('NFC URL 쓰기 오류:', error);
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다.');
      }
      throw new Error(`NFC 쓰기 실패: ${error.message}`);
    }
    throw new Error('NFC 쓰기 중 알 수 없는 오류가 발생했습니다.');
  } finally {
    setNfcMode('idle');
  }
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
    return new Promise(async (resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          listenerHandle?.remove();
          NfcPlugin.stopScan().catch(() => {});
          reject(new Error('NFC 태그 읽기 시간이 초과되었습니다.'));
        }
      }, 30000);

      const listenerHandle = await NfcPlugin.addListener('nfcTagDetected', (tag) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        listenerHandle.remove();
        NfcPlugin.stopScan().catch(() => {});

        const tagData = parseTagPayload(tag.payload, tag.recordType);
        console.log('NFC 태그 읽기 완료 (네이티브):', tagData);
        resolve(tagData);
      });

      try {
        await NfcPlugin.startScan();
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          listenerHandle.remove();
          reject(e);
        }
      }
    });
  }

  // 브라우저: Web NFC API
  console.log('NFC 태그 읽기 시작 (Web NFC)...');
  // @ts-ignore
  const ndef = new NDEFReader();
  // @ts-ignore
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
      } catch (parseError) {
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
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않습니다.');
    }

    if (Capacitor.isNativePlatform()) {
      return await new Promise(async (resolve, reject) => {
        let resolved = false;

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            listenerHandle?.remove();
            NfcPlugin.stopScan().catch(() => {});
            setNfcMode('idle');
            reject(new Error('NFC 태그 읽기 시간 초과 (30초)'));
          }
        }, 30000);

        const listenerHandle = await NfcPlugin.addListener('nfcTagDetected', (tag) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          listenerHandle.remove();
          NfcPlugin.stopScan().catch(() => {});
          console.log('NFC UID 읽음 (네이티브):', tag.uid);
          resolve(tag.uid);
        });

        try {
          await NfcPlugin.startScan();
        } catch (e) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            listenerHandle.remove();
            setNfcMode('idle');
            reject(e);
          }
        }
      });
    }

    // 브라우저: Web NFC API
    // @ts-ignore
    const ndef = new NDEFReader();
    await ndef.scan();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('NFC 태그 읽기 시간 초과 (30초)'));
      }, 30000);

      // @ts-ignore
      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        clearTimeout(timeout);
        const uid = serialNumber.replace(/:/g, '').toUpperCase();
        console.log('NFC UID 읽음 (Web NFC):', uid);
        resolve(uid);
      });

      // @ts-ignore
      ndef.addEventListener('readingerror', () => {
        clearTimeout(timeout);
        reject(new Error('NFC 태그 읽기 실패'));
      });
    });
  } catch (error) {
    console.error('NFC UID 읽기 실패:', error);
    setNfcMode('idle');
    throw new Error('NFC UID를 읽을 수 없습니다.');
  }
}
