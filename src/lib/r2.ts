import { supabase } from './supabase';

// 버킷은 비공개다. 읽기도 서버가 발급한 presigned GET URL로만 가능하다.
// R2 액세스 키/시크릿은 절대 클라이언트에 두지 않는다 → Edge Function(r2-presign)이 서버에서 처리.

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

  /**
   * 문서 읽기용 presigned GET URL (1시간 만료).
   *
   * 경로(file_path)가 아니라 documentId를 넘긴다 — 서버가 호출자의 RLS로
   * documents 행을 직접 조회해 권한을 판정하므로, 경로를 아는 것만으로는
   * 남의 파일을 받을 수 없다.
   *
   * 권한이 없거나 발급에 실패하면 null. 호출부는 사용자에게 안내해야 한다.
   */
  async getSignedUrl(documentId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('r2-presign', {
        body: { action: 'download', documentId },
      });
      if (error) throw error;
      return data?.url ?? null;
    } catch (e) {
      console.error('R2 signed URL error:', e);
      return null;
    }
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
