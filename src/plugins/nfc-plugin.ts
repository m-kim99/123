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
  writeData(options: { data: string }): Promise<void>;
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
