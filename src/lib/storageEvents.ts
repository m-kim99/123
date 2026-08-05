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

/**
 * 이력 적재는 부가 기능 — 실패해도 본 작업을 막지 않는다.
 *
 * [중요] subcategory_id 는 FK 라 스토리지가 삭제되면 NULL 이 된다. 삭제 후에도
 * '어느 스토리지의 이력인지' 알 수 있어야 하므로 같은 값을 FK 가 아닌
 * subcategory_ref 에 복제하고, 이름 스냅샷(subcategory_name)도 함께 남긴다.
 * 이 두 값이 없으면 삭제 시점에 이력이 식별 불가능한 고아가 된다(2026-08-05 결함).
 */
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

    // 이름 스냅샷은 호출부가 빠뜨려도 여기서 채운다 — 반출입 이벤트 4종이 이름을
    // 넘기지 않아 삭제 후 이력을 찾을 수 없던 결함을 한 곳에서 막는다.
    let subcategoryName = params.subcategoryName || null;
    if (!subcategoryName && params.subcategoryId) {
      const { data: sub } = await supabase
        .from('subcategories')
        .select('name')
        .eq('id', params.subcategoryId)
        .maybeSingle();
      subcategoryName = (sub?.name as string | undefined) || null;
    }

    const { error } = await supabase.from('storage_events').insert({
      subcategory_id: params.subcategoryId || null,
      subcategory_ref: params.subcategoryId || null,
      subcategory_name: subcategoryName,
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
  /** 삭제된 세부 스토리지의 원본 id — 이 값으로 보존된 반출입 이력을 다시 조회한다 */
  subcategoryRef: string | null;
}

export async function fetchDeletionAuditLog(limit = 200): Promise<DeletionAuditEvent[]> {
  try {
    const { data, error } = await supabase
      .from('storage_events')
      .select('id, event_type, subcategory_name, subcategory_ref, document_title, actor_name, detail, created_at, departments(name)')
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
      subcategoryRef: row.subcategory_ref || null,
    }));
  } catch (err) {
    console.error('Failed to fetch deletion audit log:', err);
    return [];
  }
}

/**
 * 삭제된 세부 스토리지의 보존된 이력 조회 — 삭제 로그 항목 클릭 시 사용.
 * subcategory_id 는 삭제로 NULL 이 되므로 FK 가 아닌 subcategory_ref 로 묶는다.
 * 삭제 이벤트 자신도 같은 ref 를 갖기 때문에 함께 조회되어 전체 흐름이 보인다.
 */
export async function fetchStorageEventsByRef(
  subcategoryRef: string,
  limit = 200
): Promise<StorageEvent[]> {
  try {
    const { data, error } = await supabase
      .from('storage_events')
      .select('id, subcategory_id, subcategory_name, event_type, actor_name, detail, created_at')
      .eq('subcategory_ref', subcategoryRef)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      subcategoryId: row.subcategory_id,
      subcategoryName: row.subcategory_name || null,
      eventType: row.event_type as StorageEventType,
      actorName: row.actor_name || null,
      detail: row.detail || null,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch storage events by ref:', err);
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
