import { registerPlugin } from '@capacitor/core';

export interface NotificationPluginDefinition {
  show(options: { title: string; body: string }): Promise<{ success: boolean; id: number }>;
  requestPermission(): Promise<{ granted: boolean }>;
}

export const NotificationPlugin = registerPlugin<NotificationPluginDefinition>('NotificationPlugin');
