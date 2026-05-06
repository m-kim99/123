import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface SpeechResultEvent {
  transcript: string;
  isFinal: boolean;
}

export interface SpeechErrorEvent {
  error: string;
  code: number;
}

export interface SpeechPluginDefinition {
  isSupported(): Promise<{ supported: boolean }>;
  startListening(options?: { language?: string }): Promise<void>;
  stopListening(): Promise<void>;
  addListener(event: 'speechReady', listenerFunc: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'speechResult', listenerFunc: (result: SpeechResultEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'speechError', listenerFunc: (error: SpeechErrorEvent) => void): Promise<PluginListenerHandle>;
}

export const SpeechPlugin = registerPlugin<SpeechPluginDefinition>('SpeechPlugin');
