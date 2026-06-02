import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY;
const R2_SECRET_KEY = import.meta.env.VITE_R2_SECRET_KEY;
const R2_BUCKET = import.meta.env.VITE_R2_BUCKET;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export const r2Storage = {
  async upload(filePath: string, file: File | Blob): Promise<{ error: Error | null }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type || 'application/octet-stream',
      }));
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
      await r2Client.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: {
          Objects: filePaths.map(path => ({ Key: path })),
        },
      }));
      return { error: null };
    } catch (e) {
      console.error('R2 delete error:', e);
      return { error: e as Error };
    }
  },
};
