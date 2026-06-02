import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

const FILE_PATH = '1778054971590.pdf';
const TEMP_FILE = '/tmp/migrate-temp.pdf';

const supabase = createClient(
  'https://kqurgsqmrmtpglrbzpoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdXJnc3Ftcm10cGdscmJ6cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzgwMDgsImV4cCI6MjA4ODYxNDAwOH0.sfcu2_uER_BltY3aPlBxVrAvXOqDwXeruTvWghDlpgs'
);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://63ed20c8f590ebedc35d9d726404f3a0.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'f70c70782e8dad739dd67966d8eee617',
    secretAccessKey: 'b235af651385d5d83e42a18818202fc11336f95305cdb50f0afffc87c6307611',
  },
});

async function uploadWithRetry(key: string, body: Uint8Array, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: 'traystorage',
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
      }));
      return;
    } catch (err) {
      console.log(`시도 ${i + 1} 실패, 재시도...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('업로드 실패 (재시도 초과)');
}

async function migrate() {
  console.log(`다운로드 중: ${FILE_PATH}`);

  const { data, error } = await supabase.storage
    .from('123')
    .download(FILE_PATH);

  if (error || !data) {
    console.error('다운로드 실패:', error);
    return;
  }

  console.log(`다운로드 완료. 크기: ${data.size} bytes`);

  // 파일로 저장
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileSync(TEMP_FILE, buffer);
  console.log('임시 파일 저장 완료');

  // 파일에서 다시 읽기
  const fileData = readFileSync(TEMP_FILE);
  console.log('R2 업로드 중 (3회 재시도)...');

  await uploadWithRetry(FILE_PATH, new Uint8Array(fileData));

  // 임시 파일 삭제
  unlinkSync(TEMP_FILE);
  console.log('✅ 완료!');
}

migrate().catch(console.error);
