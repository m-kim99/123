import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 유효한 Supabase 설정인지 확인
const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'your_supabase_url_here' &&
  !!supabaseAnonKey;

// Supabase 클라이언트 초기화
// 환경변수 미설정 시 null as any 대신 Proxy를 사용해 즉시 명확한 에러를 던짐
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        throw new Error(
          `[Supabase 미설정] .${String(prop)} 호출 불가. ` +
          'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY 환경변수를 설정하세요.'
        );
      },
    }));

// TypeScript 타입 정의
export interface Department {
  id: string;
  code: string;
  name: string;
  company_id?: string | null;
  description?: string | null;
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
  /**
   * 기존 카테고리 참조 (마이그레이션 이후에는 parent_category_id/subcategory_id를 사용)
   */
  category_id?: string;
  /** 상위 대분류 카테고리 ID */
  parent_category_id: string;
  /** 세부 스토리지 ID */
  subcategory_id: string;
  department_id: string;
  title: string;
  file_path: string;
  file_size: number | null;
  ocr_text: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  is_classified: boolean;
}

// 대분류 카테고리 (기존 categories 테이블을 의미)
export type ParentCategory = {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  created_at: string;
};

// 세부 스토리지 (신규 subcategories 테이블)
export type Subcategory = {
  id: string;
  name: string;
  description: string | null;
  parent_category_id: string;
  department_id: string;
  nfc_tag_id: string | null;
  nfc_registered: boolean;
  storage_location: string | null;
  company_id: string | null;
  created_at: string;
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department_id: string | null;
  created_at: string;
}
