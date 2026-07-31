import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SUPABASE_URL, SUPABASE_ANON_KEY, R2_ENDPOINT, r2Credentials } from './r2Config';

const FILE_PATH = '1778054971590.pdf';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: r2Credentials,
});

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
  console.log('R2 업로드 중...');

  const arrayBuffer = await data.arrayBuffer();
  await r2Client.send(new PutObjectCommand({
    Bucket: 'traystorage',
    Key: FILE_PATH,
    Body: new Uint8Array(arrayBuffer),
    ContentType: data.type || 'application/pdf',
  }));

  console.log('✅ 완료!');
}

migrate().catch(console.error);
