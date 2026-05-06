import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NfcTagDetectedEvent {
  uid: string;
  payload?: string;
  recordType?: 'url' | 'text' | 'mime' | 'other';
}

export interface NfcPluginDefinition {
  isEnabled(): Promise<{ enabled: boolean }>;
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  writeUrl(options: { url: string }): Promise<void>;
  writeData(options: { data: string }): Promise<void>;
  addListener(
    event: 'nfcTagDetected',
    listenerFunc: (tag: NfcTagDetectedEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const NfcPlugin = registerPlugin<NfcPluginDefinition>('NfcPlugin');
