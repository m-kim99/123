import { supabase } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/pushNotifications';

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
  /** 세부 스토리지 ID */
  subcategoryId?: string | null;
  /** UI에 보여줄 세부 스토리지명 */
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
        prefix = '세부 스토리지 생성';
        break;
      case 'subcategory_deleted':
        prefix = '세부 스토리지 삭제';
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
      return;
    }

    // 푸시 알림 발송 (백그라운드에서 비동기 처리)
    alert(`[DEBUG-1] 푸시 발송 시작: companyId=${companyId}`);
    sendPushToCompanyUsers({
      companyId,
      departmentId,
      title: prefix,
      message: baseMessage,
    }).catch((err) => alert(`[DEBUG-ERR] 푸시 발송 실패: ${err}`));
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
      return;
    }

    // 대상 사용자에게 푸시 알림 발송
    sendPushToUser({
      userId: targetUserId,
      title: '📤 문서 공유',
      message: `${sharedByUserName}님이 "${documentTitle}" 문서를 공유했습니다.`,
    }).catch((err) => console.error('푸시 발송 실패:', err));
  } catch (err) {
    console.error('공유 알림 생성 중 예외 발생:', err);
  }
}

/**
 * 문서 공유 취소 시 해당 알림 삭제
 */
interface DeleteShareNotificationParams {
  documentId: string;
  targetUserId: string;
}

// ============================================================
// 푸시 알림 발송 헬퍼 함수
// ============================================================

interface SendPushToCompanyUsersParams {
  companyId: string;
  departmentId: string | null;
  title: string;
  message: string;
}

/**
 * 회사/부서 사용자들에게 푸시 알림 발송
 * - departmentId가 있으면 해당 부서 사용자만
 * - 없으면 회사 전체 사용자
 */
async function sendPushToCompanyUsers({
  companyId,
  departmentId,
  title,
  message,
}: SendPushToCompanyUsersParams): Promise<void> {
  try {
    alert(`[DEBUG-2] 사용자 조회 시작: company=${companyId}, dept=${departmentId}`);
    // 푸시 대상 사용자 조회
    let query = supabase
      .from('users')
      .select('push_id')
      .eq('company_id', companyId)
      .not('push_id', 'is', null);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data: users, error } = await query;
    alert(`[DEBUG-3] 조회결과: ${users?.length}명, 에러=${error?.message || '없음'}`);

    if (error || !users || users.length === 0) {
      alert('[DEBUG-4] 대상 없음, 종료');
      return;
    }

    const pushIds = users
      .map((u) => u.push_id)
      .filter((pid): pid is string => !!pid);

    alert(`[DEBUG-5] 발송 대상 토큰 수: ${pushIds.length}`);

    if (pushIds.length > 0) {
      await sendPushNotification({
        playerIds: pushIds,
        title,
        message,
      });
      alert('[DEBUG-6] 발송 완료!');
    }
  } catch (err) {
    alert(`[DEBUG-ERR] 회사 푸시 발송 오류: ${err}`);
  }
}

interface SendPushToUserParams {
  userId: string;
  title: string;
  message: string;
}

/**
 * 특정 사용자에게 푸시 알림 발송
 */
async function sendPushToUser({
  userId,
  title,
  message,
}: SendPushToUserParams): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('push_id')
      .eq('id', userId)
      .single();

    if (error || !user?.push_id) {
      return;
    }

    await sendPushNotification({
      playerIds: [user.push_id],
      title,
      message,
    });
  } catch (err) {
    console.error('개인 푸시 발송 오류:', err);
  }
}

export async function deleteShareNotification({
  documentId,
  targetUserId,
}: DeleteShareNotificationParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('type', 'document_shared')
      .eq('document_id', documentId)
      .eq('target_user_id', targetUserId);

    if (error) {
      console.error('공유 알림 삭제 실패:', error);
    }
  } catch (err) {
    console.error('공유 알림 삭제 중 예외 발생:', err);
  }
}
