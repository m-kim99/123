import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { SUPABASE_URL, SUPABASE_ANON_KEY, R2_ENDPOINT, r2Credentials } from './r2Config';

const FILE_PATH = '1778054971590.pdf';
const TEMP_FILE = '/tmp/migrate-temp.pdf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: r2Credentials,
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
