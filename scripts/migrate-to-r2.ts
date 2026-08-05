/**
 * Supabase Storage → Cloudflare R2 마이그레이션 스크립트
 *
 * 실행: npx tsx scripts/migrate-to-r2.ts
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { SUPABASE_URL, SUPABASE_ANON_KEY, R2_BUCKET, R2_ENDPOINT, r2Credentials } from './r2Config';

const SUPABASE_BUCKET = '123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: r2Credentials,
});

async function checkExistsInR2(key: string): Promise<boolean> {
  try {
    await r2Client.send(new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

async function migrateFile(filePath: string): Promise<boolean> {
  try {
    // R2에 이미 있는지 확인
    const exists = await checkExistsInR2(filePath);
    if (exists) {
      console.log(`⏭️  건너뜀 (이미 존재): ${filePath}`);
      return true;
    }

    // Supabase에서 다운로드
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(filePath);

    if (error || !data) {
      console.error(`❌ 다운로드 실패: ${filePath}`, error);
      return false;
    }

    // R2에 업로드
    const arrayBuffer = await data.arrayBuffer();
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      Body: new Uint8Array(arrayBuffer),
      ContentType: data.type || 'application/octet-stream',
    }));

    console.log(`✅ 마이그레이션 완료: ${filePath}`);
    return true;
  } catch (err) {
    console.error(`❌ 마이그레이션 실패: ${filePath}`, err);
    return false;
  }
}

async function getAllStorageFiles(): Promise<string[]> {
  const allFiles: string[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data: files, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list('', { limit, offset });

    if (error) {
      console.error('Storage 목록 조회 실패:', error);
      break;
    }

    if (!files || files.length === 0) break;

    for (const file of files) {
      if (file.name) {
        allFiles.push(file.name);
      }
    }

    if (files.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

async function main() {
  console.log('🚀 Supabase Storage → R2 마이그레이션 시작\n');

  // Storage에서 모든 파일 목록 가져오기
  const files = await getAllStorageFiles();

  if (files.length === 0) {
    console.log('마이그레이션할 파일이 없습니다.');
    return;
  }

  console.log(`📁 총 ${files.length}개 파일 발견\n`);

  let success = 0;
  let failed = 0;

  for (const filePath of files) {
    const result = await migrateFile(filePath);
    if (result) {
      // 건너뛴 경우도 success로 카운트됨, 구분 필요시 수정
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n📊 마이그레이션 결과:');
  console.log(`   ✅ 성공: ${success}`);
  console.log(`   ❌ 실패: ${failed}`);
}

main().catch(console.error);
