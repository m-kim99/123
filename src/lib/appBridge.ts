/**
 * 앱케이크 모바일 래핑 브릿지 유틸리티
 * - 앱/웹 환경 감지
 * - 파일 다운로드 (네이티브/웹 자동 분기)
 * - 푸시키(pushId) 가져오기
 */

import { Capacitor } from '@capacitor/core';
import { DownloadPlugin } from '@/plugins/download-plugin';

/**
 * 현재 앱(웹뷰) 환경인지 체크
 */
export function isRunningInApp(): boolean {
  return navigator.userAgent.toLowerCase().indexOf('mobileapp') !== -1;
}

/**
 * 앱/웹 환경에 따라 파일 다운로드
 * - Android 네이티브: DownloadManager (Downloads 폴더 저장)
 * - iOS 앱: webkit messageHandler를 통해 네이티브 다운로드
 * - 웹: Blob 방식 다운로드
 * @param downloadUrl 다운로드할 파일의 전체 URL
 * @param filename 저장될 파일명 (확장자 포함)
 */
export async function downloadFile(downloadUrl: string, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    // Android 네이티브: 시스템 DownloadManager로 Downloads 폴더에 저장
    await DownloadPlugin.downloadFile({ url: downloadUrl, filename });
  } else if (isRunningInApp() && window.webkit?.messageHandlers?.cordova_iab) {
    // iOS 앱 환경: 네이티브 다운로드
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
    // iOS 앱(WKWebView): 네이티브 마이크 권한 다이얼로그 표시
    window.webkit.messageHandlers.cordova_iab.postMessage(
      JSON.stringify({ action: 'request_microphone' })
    );
  }
  // Android 앱: window.webkit 없음 → WebView 자체 권한 다이얼로그에 의존, 별도 처리 불필요
}

/**
 * 네이티브 STT 시작
 * 앱 네이티브에서 음성 인식을 수행하고, 결과를 onResult 콜백으로 전달
 * @param onResult STT 인식 결과 텍스트를 받는 콜백
 */
export function startNativeSTT(onResult: (text: string) => void): void {
  if (!isRunningInApp() || !window.webkit?.messageHandlers?.cordova_iab) return;

  console.log('[NativeSTT] 콜백 등록 + sttstart 전송');
  // 결과 콜백 등록 (앱에서 window.onNativeSTTResult("텍스트") 호출)
  window.onNativeSTTResult = (text: string) => {
    console.log('[NativeSTT] onNativeSTTResult 호출됨, text=', text);
    if (text?.trim()) {
      onResult(text.trim());
    }
  };

  // STT 시작 요청
  window.webkit.messageHandlers.cordova_iab.postMessage(
    JSON.stringify({ action: 'sttstart' })
  );
}

/**
 * 네이티브 STT 확인 (전송)
 * 사용자가 전송 버튼을 눌렀을 때 호출 — iOS 네이티브에 텍스트 확정(commit)을 알림
 * iOS 흐름: sttstart(빨간) → 말함 → 네이티브가 입력란 채움 → sttenter(파란)
 * 앱케이크 액션: 'sttenter'
 */
export function submitNativeSTT(): void {
  if (!isRunningInApp() || !window.webkit?.messageHandlers?.cordova_iab) return;

  console.log('[NativeSTT] sttenter 전송');
  window.webkit.messageHandlers.cordova_iab.postMessage(
    JSON.stringify({ action: 'sttenter' })
  );
}

/**
 * 네이티브 STT 종료 (취소)
 * 앱 네이티브 음성 인식을 중단하고 콜백을 해제
 * 앱케이크 액션: 'sttstop'
 */
export function stopNativeSTT(): void {
  if (!isRunningInApp() || !window.webkit?.messageHandlers?.cordova_iab) return;

  console.log('[NativeSTT] sttstop 전송 + 콜백 해제');
  window.webkit.messageHandlers.cordova_iab.postMessage(
    JSON.stringify({ action: 'sttstop' })
  );
  window.onNativeSTTResult = null;
}

/**
 * 네이티브 STT 종료 (콜백 유지)
 * sttstart 재시작 직전에 이전 세션을 정리하기 위해 사용
 * 콜백은 startNativeSTT에서 새로 설정하므로 여기서 해제하지 않음
 */
export function stopNativeSTTSilent(): void {
  if (!isRunningInApp() || !window.webkit?.messageHandlers?.cordova_iab) return;

  console.log('[NativeSTT] sttstop 전송 (콜백 유지, 재시작 준비)');
  window.webkit.messageHandlers.cordova_iab.postMessage(
    JSON.stringify({ action: 'sttstop' })
  );
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
