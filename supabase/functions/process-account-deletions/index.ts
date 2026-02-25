import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const requestUrl = new URL(req.url);
    const envProjectUrl = Deno.env.get('PROJECT_URL')?.trim() ?? null;
    const supabaseUrl = envProjectUrl || `${requestUrl.protocol}//${requestUrl.host}`;

    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const envServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')?.trim() ?? null;

    const rawKey =
      envServiceRoleKey ??
      match?.[1] ??
      req.headers.get('apikey') ??
      req.headers.get('x-apikey') ??
      null;
    const supabaseServiceRoleKey =
      typeof rawKey === 'string' ? rawKey.trim().replace(/^"|"$/g, '') : null;

    if (!supabaseServiceRoleKey) {
      throw new Error('Missing Authorization bearer token (or apikey header)');
    }

    // Service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
    });

    const now = new Date();

    // 1. 유예 기간이 지난 pending 상태의 탈퇴 요청 조회
    const { data: pendingDeletions, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('id, user_id')
      .eq('status', 'pending')
      .lte('scheduled_deletion_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching pending deletions:', fetchError);
      throw new Error(`Error fetching pending deletions: ${fetchError.message}`);
    }

    if (!pendingDeletions || pendingDeletions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '처리할 탈퇴 요청이 없습니다.',
          processedCount: 0,
          failedCount: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: { userId: string; error: string }[] = [];

    // 2. 각 탈퇴 요청 처리
    for (const deletion of pendingDeletions) {
      try {
        // 사용자 정보 조회 (로깅용)
        const { data: userData } = await supabase
          .from('users')
          .select('email, name')
          .eq('id', deletion.user_id)
          .single();

        console.log(`Processing deletion for user: ${userData?.email || deletion.user_id}`);

        // auth.users에서 사용자 삭제 (Admin API 사용)
        // 이렇게 하면 public.users도 CASCADE로 삭제됨
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
          deletion.user_id
        );

        if (deleteAuthError) {
          throw new Error(`Auth delete failed: ${deleteAuthError.message}`);
        }

        // 탈퇴 요청 상태를 completed로 업데이트
        const { error: updateError } = await supabase
          .from('account_deletion_requests')
          .update({
            status: 'completed',
            completed_at: now.toISOString(),
          })
          .eq('id', deletion.id);

        if (updateError) {
          // 사용자는 삭제되었지만 요청 상태 업데이트 실패
          console.error(`Failed to update deletion request status for ${deletion.id}:`, updateError);
        }

        processedCount++;
        console.log(`Successfully deleted user: ${userData?.email || deletion.user_id}`);

      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ userId: deletion.user_id, error: errorMessage });
        console.error(`Failed to delete user ${deletion.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${processedCount}개의 계정이 삭제되었습니다.`,
        processedCount,
        failedCount,
        totalPending: pendingDeletions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-account-deletions function:', error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : (error as any)?.message
            ? String((error as any).message)
            : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
