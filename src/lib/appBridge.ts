/**
 * 앱케이크 모바일 래핑 브릿지 유틸리티
 * - 앱/웹 환경 감지
 * - 파일 다운로드 (네이티브/웹 자동 분기)
 * - 푸시키(pushId) 가져오기
 */

/**
 * 현재 앱(웹뷰) 환경인지 체크
 */
export function isRunningInApp(): boolean {
  return navigator.userAgent.toLowerCase().indexOf('mobileapp') !== -1;
}

/**
 * 앱/웹 환경에 따라 파일 다운로드
 * - 앱: webkit messageHandler를 통해 네이티브 다운로드
 * - 웹: Blob 방식 다운로드
 * @param downloadUrl 다운로드할 파일의 전체 URL
 * @param filename 저장될 파일명 (확장자 포함)
 */
export async function downloadFile(downloadUrl: string, filename: string): Promise<void> {
  if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
    // 앱 환경: 네이티브 다운로드
    const param = {
      action: 'filedownload',
      downloadurl: downloadUrl,
      filename: filename,
    };
    window.webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify(param));
  } else {
    // 웹 환경: 기존 Blob 방식
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

/**
 * 앱 메시지 핸들러 호출 대기 함수
 * 앱 초기화 시 webkit messageHandler가 준비될 때까지 대기
 */
export function waitForCallHandler(callback: () => void, attempts = 0): void {
  if (window.webkit?.messageHandlers) {
    callback();
  } else if (attempts < 100) {
    setTimeout(() => waitForCallHandler(callback, attempts + 1), 100);
  }
}

/**
 * 앱 환경에서 네이티브 마이크 권한 요청
 * getUserMedia 실패(권한 거부) 시 호출하여 OS 레벨 권한 다이얼로그 표시
 * 앱케이크 가이드: 에러 블록에서 기존 코드 대신 이 함수를 호출
 */
export function requestNativeMicrophonePermission(): void {
  if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
    window.webkit.messageHandlers.cordova_iab.postMessage(
      JSON.stringify({ action: 'request_microphone' })
    );
  }
}

/**
 * 앱에서 푸시키(pushId)를 요청하고, 콜백으로 받아 처리
 * @param onPushIdReceived 푸시키를 받았을 때 실행할 콜백
 */
export function requestPushId(onPushIdReceived: (pushId: string) => void): void {
  if (!isRunningInApp()) return;

  // 전역 콜백 함수 등록 (앱에서 호출)
  (window as any).get_pushid = (pushId: string) => {
    if (pushId) {
      onPushIdReceived(pushId);
    }
  };

  // 앱에 푸시키 요청
  waitForCallHandler(() => {
    window.webkit!.messageHandlers.cordova_iab.postMessage(
      JSON.stringify({ action: 'getpushid', callback: 'get_pushid' })
    );
  });
}
