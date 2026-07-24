import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // cron 비밀키 검증 (innopay-billing-renewal과 동일한 x-cron-key 방식)
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (!cronSecret || req.headers.get('x-cron-key') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. 7일 이내 만료되는 세부 카테고리 조회 (폐기 처리된 것 제외)
    const { data: expiringSoon, error: expiringSoonError } = await supabase
      .from('subcategories')
      .select('id, name, expiry_date, department_id, parent_category_id, company_id')
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', sevenDaysLater.toISOString())
      .not('expiry_date', 'is', null)
      .neq('storage_status', 'disposed');

    if (expiringSoonError) {
      console.error('Error fetching expiring soon subcategories:', expiringSoonError);
      throw new Error(
        `Error fetching expiring soon subcategories: ${(expiringSoonError as any)?.message ?? 'Unknown error'}`
      );
    }

    // 2. 30일 이내 만료되는 세부 카테고리 조회 (폐기 처리된 것 제외)
    const { data: expiringLater, error: expiringLaterError } = await supabase
      .from('subcategories')
      .select('id, name, expiry_date, department_id, parent_category_id, company_id')
      .gt('expiry_date', sevenDaysLater.toISOString())
      .lte('expiry_date', thirtyDaysLater.toISOString())
      .not('expiry_date', 'is', null)
      .neq('storage_status', 'disposed');

    if (expiringLaterError) {
      console.error('Error fetching expiring later subcategories:', expiringLaterError);
      throw new Error(
        `Error fetching expiring later subcategories: ${(expiringLaterError as any)?.message ?? 'Unknown error'}`
      );
    }

    let createdCount = 0;
    let skippedCount = 0;

    // 3. 7일 이내 만료 알림 생성
    if (expiringSoon && expiringSoon.length > 0) {
      for (const subcat of expiringSoon) {
        // 중복 방지: 최근 7일 내 같은 카테고리에 대한 알림이 있는지 확인
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('subcategory_id', subcat.id)
          .eq('type', 'subcategory_expiring_soon')
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          skippedCount++;
          continue;
        }

        const daysUntilExpiry = Math.ceil(
          (new Date(subcat.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // 해당 카테고리의 문서 개수 조회
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('subcategory_id', subcat.id);

        const companyId = (subcat as any).company_id;

        const { error: insertError } = await supabase.from('notifications').insert({
          type: 'subcategory_expiring_soon',
          document_id: null,
          company_id: companyId,
          department_id: subcat.department_id,
          parent_category_id: subcat.parent_category_id,
          subcategory_id: subcat.id,
          message: `⚠️ "${subcat.name}" 보관함 폐기 예정 ${daysUntilExpiry}일 전 (문서 ${docCount || 0}개)`,
          created_at: now.toISOString(),
        });

        if (insertError) {
          console.error('Error creating notification for subcategory:', subcat.id, insertError);
        } else {
          createdCount++;
        }
      }
    }

    // 4. 30일 이내 만료 알림 생성
    if (expiringLater && expiringLater.length > 0) {
      for (const subcat of expiringLater) {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('subcategory_id', subcat.id)
          .eq('type', 'subcategory_expiring_very_soon')
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          skippedCount++;
          continue;
        }

        const daysUntilExpiry = Math.ceil(
          (new Date(subcat.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('subcategory_id', subcat.id);

        const companyId = (subcat as any).company_id;

        const { error: insertError } = await supabase.from('notifications').insert({
          type: 'subcategory_expiring_very_soon',
          document_id: null,
          company_id: companyId,
          department_id: subcat.department_id,
          parent_category_id: subcat.parent_category_id,
          subcategory_id: subcat.id,
          message: `⏰ "${subcat.name}" 보관함 폐기 예정 ${daysUntilExpiry}일 전 (문서 ${docCount || 0}개)`,
          created_at: now.toISOString(),
        });

        if (insertError) {
          console.error('Error creating notification for subcategory:', subcat.id, insertError);
        } else {
          createdCount++;
        }
      }
    }

    // 5. 만료된 카테고리 처리 (선택 사항: 자동 삭제)
    const { data: expired, error: expiredError } = await supabase
      .from('subcategories')
      .select('id, name, department_id, parent_category_id, company_id')
      .lt('expiry_date', now.toISOString())
      .not('expiry_date', 'is', null)
      .neq('storage_status', 'disposed');

    if (expiredError) {
      console.error('Error fetching expired subcategories:', expiredError);
    }

    let deletedCount = 0;
    const AUTO_DELETE_EXPIRED = false; // true로 변경 시 자동 삭제 활성화

    if (expired && expired.length > 0) {
      for (const subcat of expired) {
        // 만료 알림 생성 (중복 체크)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { data: existingExpired } = await supabase
          .from('notifications')
          .select('id')
          .eq('subcategory_id', subcat.id)
          .eq('type', 'subcategory_expired')
          .gte('created_at', sevenDaysAgo.toISOString())
          .limit(1);

        if (!existingExpired || existingExpired.length === 0) {
          const { count: docCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('subcategory_id', subcat.id);

          const companyId = (subcat as any).company_id;

          const { error: expiredInsertError } = await supabase.from('notifications').insert({
            type: 'subcategory_expired',
            document_id: null,
            company_id: companyId,
            department_id: subcat.department_id,
            parent_category_id: subcat.parent_category_id,
            subcategory_id: subcat.id,
            message: `🔒 "${subcat.name}" 보관함이 보존연한 경과로 폐기 예정입니다 (문서 ${docCount || 0}개 접근 차단)`,
            created_at: now.toISOString(),
          });

          if (expiredInsertError) {
            console.error('Error creating expired notification for subcategory:', subcat.id, expiredInsertError);
          } else {
            createdCount++;
          }
        }

        // 자동 삭제 (옵션)
        if (AUTO_DELETE_EXPIRED) {
          const { error: deleteError } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', subcat.id);

          if (!deleteError) {
            deletedCount++;
            console.log(`Deleted expired subcategory: ${subcat.name}`);
          } else {
            console.error(`Failed to delete subcategory ${subcat.id}:`, deleteError);
          }
        }
      }
    }

    const deletionSuffix = AUTO_DELETE_EXPIRED ? `, ${deletedCount}개 삭제` : '';

    return new Response(
      JSON.stringify({
        success: true,
        message: `${createdCount}개의 카테고리 만료 알림 생성${deletionSuffix}`,
        expiringSoonCount: expiringSoon?.length || 0,
        expiringLaterCount: expiringLater?.length || 0,
        expiredCount: expired?.length || 0,
        notificationsCreated: createdCount,
        notificationsSkipped: skippedCount,
        subcategoriesDeleted: deletedCount,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-expiring-subcategories function:', error);

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : (error as any)?.message
            ? String((error as any).message)
            : 'Unknown error';
    const hint = (error as any)?.hint ? String((error as any).hint) : null;

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        hint,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
