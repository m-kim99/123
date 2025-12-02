import { supabase } from './supabase';
import { NFCMapping, NFCRegisterRequest, NFCResolveResponse } from '@/types/nfc';

export async function registerNFCTag(request: NFCRegisterRequest): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase.from('nfc_mappings').insert({
    tag_id: request.tagId,
    category_id: request.categoryId,
    registered_by: user.user?.id,
  });

  if (error) throw error;
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
      // @ts-ignore
      id: data.categories.id,
      // @ts-ignore
      name: data.categories.name,
      // @ts-ignore
      departmentId: data.categories.department_id,
      // @ts-ignore
      departmentName: data.categories.departments?.name,
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
