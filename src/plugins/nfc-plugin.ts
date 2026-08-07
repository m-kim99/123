import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NfcTagDetectedEvent {
  uid: string;
  payload?: string;
  recordType?: 'url' | 'text' | 'mime' | 'other';
}

export interface NfcScanCancelledEvent {
  reason: string;
}

export interface NfcPluginDefinition {
  isEnabled(): Promise<{ enabled: boolean }>;
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  /** 쓰기 세션이 물고 있는 태그의 UID를 함께 반환한다 (UID만 얻으려고 별도 읽기 세션을 열 필요 없음). */
  writeUrl(options: { url: string }): Promise<{ uid: string }>;
  writeData(options: { data: string }): Promise<{ uid: string }>;
  /**
   * 대기 중인 쓰기를 취소한다. 다이얼로그를 닫거나 타임아웃이 났을 때 반드시 호출할 것.
   * 안드로이드는 이걸 안 부르면 쓰기가 걸린 채로 남아, 이후 사용자가 아무 태그나 대는
   * 순간 그 태그가 조용히 덮어써진다.
   */
  cancelWrite(): Promise<void>;
  addListener(
    event: 'nfcTagDetected',
    listenerFunc: (tag: NfcTagDetectedEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'nfcScanCancelled',
    listenerFunc: (event: NfcScanCancelledEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const NfcPlugin = registerPlugin<NfcPluginDefinition>('NfcPlugin');
