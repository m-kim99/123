import { supabase } from '@/lib/supabase';

export type NotificationEventType = 'document_created' | 'document_deleted';

interface CreateDocumentNotificationParams {
  type: NotificationEventType;
  documentId: string;
  title: string;
  companyId: string;
  departmentId: string | null;
}

export async function createDocumentNotification({
  type,
  documentId,
  title,
  companyId,
  departmentId,
}: CreateDocumentNotificationParams): Promise<void> {
  const message =
    type === 'document_created' ? `문서 등록: ${title}` : `문서 삭제: ${title}`;

  const { error } = await supabase.from('notifications').insert({
    type,
    document_id: documentId,
    company_id: companyId,
    department_id: departmentId,
    message,
  });

  if (error) {
    console.error('알림 생성 실패:', error);
  }
}
