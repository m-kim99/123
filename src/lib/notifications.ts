import { supabase } from '@/lib/supabase';

export type NotificationEventType =
  | 'document_created'
  | 'document_deleted'
  | 'document_shared'
  | 'subcategory_created'
  | 'subcategory_deleted'
  | 'parent_category_created'
  | 'parent_category_deleted'
  | 'subcategory_expiring_soon'
  | 'subcategory_expiring_very_soon'
  | 'subcategory_expired';

interface CreateDocumentNotificationParams {
  type: NotificationEventType;
  documentId: string | null;
  /** 문서 제목 */
  title: string;
  companyId: string;
  /** 부서 ID (팀원 필터링용) */
  departmentId: string | null;
  /** UI에 보여줄 부서명 (예: 영업팀) */
  departmentName?: string | null;
  /** 대분류 카테고리 ID */
  parentCategoryId?: string | null;
  /** UI에 보여줄 대분류명 */
  parentCategoryName?: string | null;
  /** 세부 카테고리 ID */
  subcategoryId?: string | null;
  /** UI에 보여줄 세부 카테고리명 */
  subcategoryName?: string | null;
}

export async function createDocumentNotification({
  type,
  documentId,
  title,
  companyId,
  departmentId,
  departmentName,
  parentCategoryId,
  parentCategoryName,
  subcategoryId,
  subcategoryName,
}: CreateDocumentNotificationParams): Promise<void> {
  try {
    const pathParts: string[] = [];

    if (departmentName) {
      pathParts.push(`[${departmentName}]`);
    }

    const categoryPath = [parentCategoryName, subcategoryName]
      .filter(Boolean)
      .join(' > ');

    if (categoryPath) {
      pathParts.push(categoryPath);
    }

    const baseMessage = pathParts.length > 0 ? `${pathParts.join(' ')} - ${title}` : title;

    let prefix: string;
    switch (type) {
      case 'document_created':
        prefix = '문서 등록';
        break;
      case 'document_deleted':
        prefix = '문서 삭제';
        break;
      case 'subcategory_created':
        prefix = '세부 카테고리 생성';
        break;
      case 'subcategory_deleted':
        prefix = '세부 카테고리 삭제';
        break;
      case 'parent_category_created':
        prefix = '대분류 카테고리 생성';
        break;
      case 'parent_category_deleted':
        prefix = '대분류 카테고리 삭제';
        break;
      case 'subcategory_expiring_soon':
        prefix = '⚠️ 카테고리 만료 임박 (7일 이내)';
        break;
      case 'subcategory_expiring_very_soon':
        prefix = '⏰ 카테고리 만료 예정 (30일 이내)';
        break;
      case 'subcategory_expired':
        prefix = '🔒 카테고리 만료됨';
        break;
      case 'document_shared':
        prefix = '📤 문서 공유';
        break;
      default:
        prefix = '알림';
        break;
    }

    const message = `${prefix} ${baseMessage}`;

    const { error } = await supabase.from('notifications').insert({
      type,
      document_id: documentId,
      company_id: companyId,
      department_id: departmentId,
      parent_category_id: parentCategoryId ?? null,
      subcategory_id: subcategoryId ?? null,
      message,
    });

    if (error) {
      console.error('알림 생성 실패:', error);
    }
  } catch (err) {
    console.error('알림 생성 중 예외 발생:', err);
  }
}

/**
 * 문서 공유 알림 생성 (특정 사용자에게만)
 */
interface CreateShareNotificationParams {
  documentId: string;
  documentTitle: string;
  sharedByUserName: string;
  targetUserId: string;
  companyId: string;
}

export async function createShareNotification({
  documentId,
  documentTitle,
  sharedByUserName,
  targetUserId,
  companyId,
}: CreateShareNotificationParams): Promise<void> {
  try {
    const message = `📤 문서 공유 ${sharedByUserName}님이 "${documentTitle}" 문서를 공유했습니다.`;

    const { error } = await supabase.from('notifications').insert({
      type: 'document_shared',
      document_id: documentId,
      company_id: companyId,
      target_user_id: targetUserId,
      message,
    });

    if (error) {
      console.error('공유 알림 생성 실패:', error);
    }
  } catch (err) {
    console.error('공유 알림 생성 중 예외 발생:', err);
  }
}
