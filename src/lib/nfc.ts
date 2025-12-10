/**
 * NFC 태그 데이터 타입
 */
export interface NFCTagData {
  categoryCode: string;
  categoryName: string;
  storageLocation: string;
  documentCount: number;
}

/**
 * Web NFC API 지원 여부 확인
 * @returns NFC 지원 여부
 */
export function isNFCSupported(): boolean {
  // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
  return 'NDEFReader' in window;
}

/**
 * NFC 권한 요청
 * @returns 권한 허용 여부
 */
export async function requestNFCPermission(): Promise<boolean> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않는 브라우저입니다.');
    }

    // Web NFC API는 권한 요청이 필요 없지만, 실제 사용 시 권한을 확인할 수 있음
    // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
    const ndef = new NDEFReader();
    
    // NFC 읽기 시도로 권한 확인 (실제 태그가 없어도 에러 없이 진행되어야 함)
    // 권한이 없으면 에러가 발생할 수 있음
    return true;
  } catch (error) {
    console.error('NFC 권한 요청 오류:', error);
    return false;
  }
}

/**
 * NFC 태그에 데이터 쓰기
 * @param data 카테고리 정보 (categoryCode, categoryName, storageLocation, documentCount)
 * @returns 쓰기 성공 여부
 */
export async function writeNFCTag(data: NFCTagData): Promise<boolean> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않는 브라우저입니다.');
    }

    // NFC 권한 확인
    const hasPermission = await requestNFCPermission();
    if (!hasPermission) {
      throw new Error('NFC 권한이 없습니다.');
    }

    // 데이터를 JSON 문자열로 변환
    const jsonData = JSON.stringify({
      categoryCode: data.categoryCode,
      categoryName: data.categoryName,
      storageLocation: data.storageLocation,
      documentCount: data.documentCount,
      timestamp: new Date().toISOString(),
    });

    // NDEF 메시지 생성
    // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
    const ndef = new NDEFReader();

    // NDEF 레코드 생성 (텍스트 레코드)
    const encoder = new TextEncoder();
    const payload = encoder.encode(jsonData);

    // @ts-ignore - NDEFRecord는 TypeScript 타입 정의가 없을 수 있음
    const record = {
      recordType: 'mime',
      mediaType: 'application/json',
      data: payload,
    };

    console.log('NFC 태그에 데이터 쓰기 시작...', data);

    // NFC 태그에 쓰기 (사용자가 태그를 기기에 가져다 대야 함)
    // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
    await ndef.write({
      records: [record],
    });

    console.log('NFC 태그에 데이터 쓰기 완료');
    return true;
  } catch (error) {
    console.error('NFC 태그 쓰기 오류:', error);
    
    if (error instanceof Error) {
      // 권한 오류
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다. 브라우저 설정에서 NFC 권한을 허용해주세요.');
      }
      // 태그 없음
      if (error.message.includes('No NFC') || error.message.includes('태그')) {
        throw new Error('NFC 태그를 감지할 수 없습니다. 태그를 기기에 가져다 대주세요.');
      }
      // 기타 오류
      throw new Error(`NFC 태그 쓰기 실패: ${error.message}`);
    }
    
    throw new Error('NFC 태그 쓰기 중 알 수 없는 오류가 발생했습니다.');
  }
}
 
/**
 * NFC 태그에 URL 쓰기 (iOS/Android 호환)
 * 현재 구현에서는 세부 카테고리(subcategory)를 대상으로 동작하며,
 * 태그에 /nfc-redirect?subcategoryId=... 형태의 URL을 기록합니다.
 * @param subcategoryId 세부 카테고리 ID
 * @param _subcategoryName 세부 카테고리 이름 (현재는 로깅/확장용으로만 사용)
 * @returns 쓰기 성공 여부
 */
export async function writeNFCUrl(
  subcategoryId: string,
  _subcategoryName: string
): Promise<boolean> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않는 브라우저입니다.');
    }

    // URL 생성: 세부 카테고리로 연결되는 리다이렉트 엔드포인트
    const uploadUrl = `${window.location.origin}/nfc-redirect?subcategoryId=${subcategoryId}`;

    console.log('NFC URL 쓰기 시작:', uploadUrl);

    // @ts-ignore - NDEFReader
    const ndef = new NDEFReader();

    // URL 레코드 생성
    await ndef.write({
      records: [
        {
          recordType: 'url',
          data: uploadUrl,
        },
      ],
    });

    console.log('NFC URL 쓰기 완료');
    return true;
  } catch (error) {
    console.error('NFC URL 쓰기 오류:', error);

    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다.');
      }
      if (error.message.includes('No NFC') || error.message.includes('태그')) {
        throw new Error('NFC 태그를 감지할 수 없습니다.');
      }
      throw new Error(`NFC 쓰기 실패: ${error.message}`);
    }

    throw new Error('NFC 쓰기 중 알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * NFC 태그 읽기
 * @returns 태그 데이터
 */
export async function readNFCTag(): Promise<NFCTagData> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않는 브라우저입니다.');
    }

    // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
    const ndef = new NDEFReader();

    console.log('NFC 태그 읽기 시작... 태그를 기기에 가져다 대주세요.');

    // scan() 메서드를 호출하여 NFC 스캔 시작
    // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
    await ndef.scan();

    // 이벤트 리스너를 통해 태그 데이터 수신
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      // 태그 읽기 성공 이벤트 핸들러
      // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
      ndef.onreading = (event: any) => {
        try {
          console.log('NFC 태그 감지:', event);

          // 타임아웃 취소
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          const { message } = event;
          const { records } = message;

          if (!records || records.length === 0) {
            reject(new Error('NFC 태그에서 데이터를 읽을 수 없습니다.'));
            return;
          }

          // 첫 번째 레코드 읽기
          const record = records[0];

          if (!record.data) {
            reject(new Error('NFC 태그에 데이터가 없습니다.'));
            return;
          }

          // 데이터 디코딩
          let jsonData: string;

          try {
            const decoder = new TextDecoder();
            jsonData = decoder.decode(record.data);
          } catch (decodeError) {
            reject(new Error('NFC 태그 데이터를 디코딩할 수 없습니다.'));
            return;
          }

          // JSON 파싱
          let data: any;
          try {
            data = JSON.parse(jsonData);
          } catch (parseError) {
            // JSON이 아닐 경우 텍스트로 처리
            reject(new Error('NFC 태그에 유효한 JSON 데이터가 없습니다.'));
            return;
          }

          // NFCTagData 형식으로 변환
          const tagData: NFCTagData = {
            categoryCode: data.categoryCode || '',
            categoryName: data.categoryName || '',
            storageLocation: data.storageLocation || '',
            documentCount: data.documentCount || 0,
          };

          console.log('NFC 태그 데이터 읽기 완료:', tagData);
          resolve(tagData);
        } catch (parseError) {
          console.error('NFC 태그 데이터 파싱 오류:', parseError);
          reject(new Error('NFC 태그 데이터를 파싱할 수 없습니다.'));
        }
      };

      // 태그 읽기 오류 이벤트 핸들러
      // @ts-ignore - NDEFReader는 TypeScript 타입 정의가 없을 수 있음
      ndef.onreadingerror = (error: any) => {
        console.error('NFC 태그 읽기 오류:', error);
        
        // 타임아웃 취소
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        reject(new Error('NFC 태그 읽기 중 오류가 발생했습니다.'));
      };

      // 타임아웃 설정 (30초)
      timeoutId = setTimeout(() => {
        reject(new Error('NFC 태그 읽기 시간이 초과되었습니다. 태그를 기기에 가져다 대주세요.'));
      }, 30000);
    });
  } catch (error) {
    console.error('NFC 태그 읽기 오류:', error);
    
    if (error instanceof Error) {
      // 권한 오류
      if (error.message.includes('permission') || error.message.includes('권한')) {
        throw new Error('NFC 권한이 필요합니다. 브라우저 설정에서 NFC 권한을 허용해주세요.');
      }
      // 태그 없음
      if (error.message.includes('No NFC') || error.message.includes('태그')) {
        throw new Error('NFC 태그를 감지할 수 없습니다. 태그를 기기에 가져다 대주세요.');
      }
      // 기타 오류
      throw new Error(`NFC 태그 읽기 실패: ${error.message}`);
    }
    
    throw new Error('NFC 태그 읽기 중 알 수 없는 오류가 발생했습니다.');
  }
}

/**
 * NFC 태그의 UID만 읽기 (범용 ID 방식용)
 * @returns 태그의 고유 ID (UID)
 */
export async function readNFCUid(): Promise<string> {
  try {
    if (!isNFCSupported()) {
      throw new Error('NFC가 지원되지 않는 브라우저입니다.');
    }

    // @ts-ignore
    const ndef = new NDEFReader();
    await ndef.scan();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('NFC 태그 읽기 시간 초과 (30초)'));
      }, 30000);

      // @ts-ignore
      ndef.addEventListener("reading", ({ serialNumber }) => {
        clearTimeout(timeout);
        // serialNumber 예: "04:e3:2a:5b:8c:91:80"
        const uid = serialNumber.replace(/:/g, '').toUpperCase();
        console.log('NFC UID 읽음:', uid);
        resolve(uid);
      });

      // @ts-ignore
      ndef.addEventListener("readingerror", (error) => {
        clearTimeout(timeout);
        console.error('NFC 읽기 오류:', error);
        reject(new Error('NFC 태그 읽기 실패'));
      });
    });
  } catch (error) {
    console.error('NFC UID 읽기 실패:', error);
    throw new Error('NFC UID를 읽을 수 없습니다.');
  }
}
