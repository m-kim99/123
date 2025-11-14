import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 유효한 Supabase 설정인지 확인
const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  !!supabaseAnonKey;

// Supabase 클라이언트 초기화 (환경변수가 없거나 placeholder면 null로 동작)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any);

// TypeScript 타입 정의
export interface Department {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  department_id: string;
  code: string;
  name: string;
  description: string | null;
  storage_location: string | null;
  nfc_tag_id: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  category_id: string;
  title: string;
  file_path: string;
  file_size: number | null;
  ocr_text: string | null;
  uploaded_by: string;
  uploaded_at: string;
  is_classified: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department_id: string | null;
  created_at: string;
}
