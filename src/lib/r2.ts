import { supabase } from './supabase';

// 공개 버킷 URL만 클라이언트에 노출 (비밀 아님).
// R2 액세스 키/시크릿은 절대 클라이언트에 두지 않는다 → Edge Function(r2-presign)이 서버에서 처리.
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export const r2Storage = {
  async upload(filePath: string, file: File | Blob): Promise<{ error: Error | null }> {
    try {
      // 1) 서버에서 presigned PUT URL 발급 (5분 만료)
      const contentType = (file as File).type || 'application/octet-stream';
      const { data, error } = await supabase.functions.invoke('r2-presign', {
        body: { action: 'upload', key: filePath, contentType },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('presigned URL을 받지 못했습니다');

      // 2) presigned URL로 직접 업로드 (자격증명 없이)
      const res = await fetch(data.url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!res.ok) {
        throw new Error(`R2 업로드 실패: ${res.status} ${await res.text()}`);
      }
      return { error: null };
    } catch (e) {
      console.error('R2 upload error:', e);
      return { error: e as Error };
    }
  },

  getPublicUrl(filePath: string): { data: { publicUrl: string } } {
    return {
      data: {
        publicUrl: `${R2_PUBLIC_URL}/${filePath}`,
      },
    };
  },

  async remove(filePaths: string[]): Promise<{ error: Error | null }> {
    if (filePaths.length === 0) return { error: null };

    try {
      const { error } = await supabase.functions.invoke('r2-presign', {
        body: { action: 'delete', keys: filePaths },
      });
      if (error) throw error;
      return { error: null };
    } catch (e) {
      console.error('R2 delete error:', e);
      return { error: e as Error };
    }
  },
};
