import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const FILE_PATH = '1778054971590.pdf';

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
