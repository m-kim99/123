import { registerPlugin } from '@capacitor/core';

export interface DownloadPluginDefinition {
  downloadFile(options: { url: string; filename: string }): Promise<{ success: boolean; filename: string }>;
}

export const DownloadPlugin = registerPlugin<DownloadPluginDefinition>('DownloadPlugin');
