import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// 입출고(보관 라이프사이클) 감사 이력 — storage_events 테이블
export type StorageEventType =
  | 'registered'
  | 'checked_out'
  | 'returned'
  | 'disposed'
  | 'location_changed'
  | 'deleted'
  | 'document_deleted';

export interface StorageEvent {
  id: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  eventType: StorageEventType;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

/** 이력 적재는 부가 기능 — 실패해도 본 작업을 막지 않는다. */
export async function logStorageEvent(params: {
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  documentTitle?: string | null;
  departmentId: string | null;
  eventType: StorageEventType;
  detail?: string | null;
}): Promise<void> {
  try {
    const { user } = useAuthStore.getState();
    if (!user?.companyId) return;

    const { error } = await supabase.from('storage_events').insert({
      subcategory_id: params.subcategoryId || null,
      subcategory_name: params.subcategoryName || null,
      document_title: params.documentTitle || null,
      company_id: user.companyId,
      department_id: params.departmentId,
      event_type: params.eventType,
      actor_id: user.id,
      actor_name: user.name,
      detail: params.detail || null,
    });
    if (error) throw error;
  } catch (err) {
    console.error('Failed to log storage event:', err);
  }
}

// 삭제·폐기 감사 로그 (관리자 전용 열람 — storage_events_select RLS에서 강제)
export interface DeletionAuditEvent {
  id: string;
  eventType: 'disposed' | 'deleted' | 'document_deleted';
  targetName: string | null;
  departmentName: string | null;
  actorName: string | null;
  detail: string | null;
  createdAt: string;
}

export async function fetchDeletionAuditLog(limit = 200): Promise<DeletionAuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from('storage_events')
      .select('id, event_type, subcategory_name, document_title, actor_name, detail, created_at, departments(name)')
      .in('event_type', ['disposed', 'deleted', 'document_deleted'])
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      eventType: row.event_type,
      targetName: row.document_title || row.subcategory_name || null,
      departmentName: row.departments?.name || null,
      actorName: row.actor_name || null,
      detail: row.detail || null,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch deletion audit log:', err);
    return [];
  }
}

export async function fetchStorageEvents(
  subcategoryId: string,
  limit = 20
): Promise<StorageEvent[]> {
  try {
    const { data, error } = await supabase
      .from('storage_events')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      subcategoryId: row.subcategory_id,
      subcategoryName: row.subcategory_name || null,
      eventType: row.event_type as StorageEventType,
      actorName: row.actor_name || null,
      detail: row.detail || null,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch storage events:', err);
    return [];
  }
}
