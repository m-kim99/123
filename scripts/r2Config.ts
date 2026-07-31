/**
 * 마이그레이션 스크립트 공용 접속 설정
 *
 * [중요] 시크릿을 이 파일이나 스크립트에 하드코딩하지 말 것.
 * 값은 .env.local (없으면 .env) 에서만 읽는다 — 두 파일 모두 .gitignore 대상이다.
 */
import dotenv from 'dotenv';

// .env.local 이 우선 (dotenv 는 이미 설정된 값을 덮어쓰지 않음)
dotenv.config({ path: '.env.local' });
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 없습니다. .env.local 을 확인하세요.`);
  }
  return value;
}

export const SUPABASE_URL = required('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = required('VITE_SUPABASE_ANON_KEY');

export const R2_ACCOUNT_ID = required('VITE_R2_ACCOUNT_ID');
export const R2_ACCESS_KEY = required('VITE_R2_ACCESS_KEY');
export const R2_SECRET_KEY = required('VITE_R2_SECRET_KEY');
export const R2_BUCKET = process.env.VITE_R2_BUCKET ?? 'traystorage';
export const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export const r2Credentials = {
  accessKeyId: R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
};
