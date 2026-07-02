import { supabase } from './supabase';

/**
 * 푸시 발송 대상.
 * 보안: 클라이언트는 FCM 토큰을 직접 넘기지 않는다. 대신 대상(회사/부서 또는 유저 ID)만
 * 넘기고, Edge Function(send-push-notification)이 service_role로 토큰을 조회·발송하며
 * 발신자가 같은 회사인지 검증한다.
 */
export type PushTarget =
  | { companyId: string; departmentId?: string | null }
  | { userIds: string[] };

interface SendPushParams {
  target: PushTarget;
  title: string;
  message: string;
  customUrl?: string;
  imageUrl?: string;
}

export async function sendPushNotification({
  target,
  title,
  message,
  customUrl,
  imageUrl,
}: SendPushParams): Promise<void> {
  console.log('[PUSH-CLIENT] supabase.functions.invoke 호출 시작:', { target, title });
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: { target, title, message, customUrl, imageUrl },
    });
    console.log('[PUSH-CLIENT] invoke 응답:', { data, error: error?.message });

    if (error) {
      console.error('[PUSH-CLIENT] 푸시 발송 오류:', error);
      throw new Error(`푸시 발송 실패: ${error.message}`);
    }
  } catch (err) {
    console.error('[PUSH-CLIENT] invoke 예외:', err);
    throw err;
  }
}

/**
 * 특정 사용자에게 푸시 발송 (토큰 조회/발송은 서버가 담당)
 * @param userIds users 테이블의 id 배열
 * @param title 푸시 알림 제목
 * @param message 푸시 알림 내용
 * @param customUrl 푸시 클릭 시 이동할 URL (선택)
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  message: string,
  customUrl?: string
): Promise<void> {
  if (userIds.length === 0) return;
  await sendPushNotification({
    target: { userIds },
    title,
    message,
    customUrl,
  });
}
