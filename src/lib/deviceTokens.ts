/**
 * 다중 기기 푸시 토큰 관리
 * - 사용자당 여러 기기 토큰을 user_device_tokens 테이블에 누적 저장
 * - 기존 users.push_id(단일 컬럼) 방식을 대체 (한 계정 여러 기기 동시 수신 지원)
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

/** 현재 로그인 사용자의 이 기기 토큰을 저장(upsert) */
export async function saveDeviceToken(token: string): Promise<void> {
  if (!token) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('[DEVICE-TOKEN] 로그인 사용자 없음, 저장 스킵');
    return;
  }
  const { error } = await supabase.from('user_device_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform: Capacitor.getPlatform(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
  if (error) console.error('[DEVICE-TOKEN] 저장 실패:', error.message);
  else console.log('[DEVICE-TOKEN] 저장 완료');
}

/** 특정 기기 토큰 1개 삭제 (로그아웃 시 이 기기만 — 다른 기기 토큰은 유지) */
export async function removeDeviceToken(token: string): Promise<void> {
  if (!token) return;
  const { error } = await supabase.from('user_device_tokens').delete().eq('token', token);
  if (error) console.error('[DEVICE-TOKEN] 삭제 실패:', error.message);
}

/** 주어진 사용자들의 모든 기기 토큰 수집 (발송 대상) */
export async function getDeviceTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('user_device_tokens')
    .select('token')
    .in('user_id', userIds);
  if (error) {
    console.error('[DEVICE-TOKEN] 토큰 조회 실패:', error.message);
    return [];
  }
  return (data ?? []).map((r: { token: string }) => r.token).filter(Boolean);
}
