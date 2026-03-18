import { supabase } from './supabase';
import { NFCMapping, NFCRegisterRequest, NFCResolveResponse } from '@/types/nfc';

export async function registerNFCTag(request: NFCRegisterRequest): Promise<void> {
  // 인증 확인: 미인증 상태에서 undefined를 registered_by에 insert하는 것 방지
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('NFC 태그 등록은 로그인이 필요합니다.');
  }

  const { error } = await supabase.from('nfc_mappings').insert({
    tag_id: request.tagId,
    category_id: request.categoryId,
    registered_by: authData.user.id,
  });

  if (error) throw error;
}

// Supabase 중첩 조인 결과 타입 정의 (categories + departments)
interface NfcMappingRow {
  category_id: string;
  categories: {
    id: string;
    name: string;
    department_id: string;
    departments: { name: string } | null;
  } | null;
}

export async function resolveNFCTag(tagId: string): Promise<NFCResolveResponse> {
  const { data, error } = await supabase
    .from('nfc_mappings')
    .select(
      `
      category_id,
      categories (
        id,
        name,
        department_id,
        departments (name)
      )
    `
    )
    .eq('tag_id', tagId)
    .single();

  if (error || !data) {
    return { found: false };
  }

  // 타입 안전하게 캐스팅 (Supabase 중첩 조인 결과)
  const row = data as unknown as NfcMappingRow;

  if (!row.categories) {
    return { found: false };
  }

  await supabase
    .from('nfc_mappings')
    .update({
      last_accessed_at: new Date().toISOString(),
      // NOTE: access_count 증가 로직은 DB 트리거나 별도 RPC로 처리하는 것이 안전합니다.
    })
    .eq('tag_id', tagId);

  return {
    found: true,
    category: {
      id: row.categories.id,
      name: row.categories.name,
      departmentId: row.categories.department_id,
      departmentName: row.categories.departments?.name,
    },
  };
}

export async function unregisterNFCTag(tagId: string): Promise<void> {
  const { error } = await supabase
    .from('nfc_mappings')
    .delete()
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * 모든 NFC 매핑 조회 (관리자용)
 * @returns NFC 매핑 목록
 */
export async function getAllNFCMappings(): Promise<NFCMapping[]> {
  const { data, error } = await supabase
    .from('nfc_mappings')
    .select(`
      id,
      tag_id,
      category_id,
      registered_by,
      registered_at,
      last_accessed_at,
      access_count
    `)
    .order('registered_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    tagId: item.tag_id,
    categoryId: item.category_id,
    registeredBy: item.registered_by,
    registeredAt: item.registered_at,
    lastAccessedAt: item.last_accessed_at,
    accessCount: item.access_count || 0,
  }));
}
