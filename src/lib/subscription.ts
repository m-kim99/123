import { supabase } from './supabase';

// ============================================================
// 구독 제한 체크 유틸리티
// ============================================================

export interface PlanLimits {
  max_members: number | null;
  max_departments: number | null;
  max_documents: number | null;
  max_storage_mb: number | null;
  max_ai_queries_monthly: number | null;
  max_nfc_tags: number | null;
  feature_ai_chat: boolean;
  feature_vector_search: boolean;
  feature_nfc: boolean;
  feature_ocr_advanced: boolean;
  feature_external_share: boolean;
  feature_statistics_advanced: boolean;
}

export interface UsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
}

// 무료 플랜 기본값 (DB에 연결되지 않았을 때 fallback)
const FREE_PLAN_DEFAULTS: PlanLimits = {
  max_members: 5,
  max_departments: 3,
  max_documents: 100,
  max_storage_mb: 1024,
  max_ai_queries_monthly: 20,
  max_nfc_tags: 0,
  feature_ai_chat: true,
  feature_vector_search: false,
  feature_nfc: false,
  feature_ocr_advanced: false,
  feature_external_share: false,
  feature_statistics_advanced: false,
};

/**
 * 회사의 현재 플랜 제한 정보를 조회
 */
export async function getCompanyPlanLimits(companyId: string): Promise<PlanLimits> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        plan:plans (
          max_members,
          max_departments,
          max_documents,
          max_storage_mb,
          max_ai_queries_monthly,
          max_nfc_tags,
          feature_ai_chat,
          feature_vector_search,
          feature_nfc,
          feature_ocr_advanced,
          feature_external_share,
          feature_statistics_advanced
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'trialing'])
      .single();

    if (subscription?.plan) {
      return subscription.plan as unknown as PlanLimits;
    }

    return FREE_PLAN_DEFAULTS;
  } catch {
    return FREE_PLAN_DEFAULTS;
  }
}

/**
 * 문서 업로드 제한 체크
 * - deleted_at IS NULL인 문서만 카운트
 * - 삭제 후 다시 올리면 카운트 줄어들어 허용됨
 */
export async function checkDocumentLimit(companyId: string): Promise<UsageCheckResult> {
  try {
    // 1. 플랜의 max_documents 조회
    const limits = await getCompanyPlanLimits(companyId);
    const maxDocuments = limits.max_documents;

    // null = 무제한
    if (maxDocuments === null) {
      return { allowed: true, current: 0, limit: null, remaining: null };
    }

    // 2. 현재 활성 문서 수 (soft-deleted 제외)
    const { count, error } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (error) {
      console.error('Document count check failed:', error);
      // 에러 시 일단 허용 (DB 트리거가 최종 방어)
      return { allowed: true, current: 0, limit: maxDocuments, remaining: maxDocuments };
    }

    const currentCount = count ?? 0;

    return {
      allowed: currentCount < maxDocuments,
      current: currentCount,
      limit: maxDocuments,
      remaining: Math.max(0, maxDocuments - currentCount),
    };
  } catch (err) {
    console.error('checkDocumentLimit error:', err);
    // 에러 시 허용 (DB 트리거가 최종 방어)
    return { allowed: true, current: 0, limit: 100, remaining: 100 };
  }
}

/**
 * AI 챗봇 월별 쿼리 제한 체크
 */
export async function checkAiQueryLimit(companyId: string): Promise<UsageCheckResult> {
  try {
    const limits = await getCompanyPlanLimits(companyId);
    const maxQueries = limits.max_ai_queries_monthly;

    if (maxQueries === null) {
      return { allowed: true, current: 0, limit: null, remaining: null };
    }

    // 현재 월의 사용량 조회
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    const periodStr = periodStart.toISOString().split('T')[0];

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('ai_queries_used')
      .eq('company_id', companyId)
      .eq('period_start', periodStr)
      .single();

    const currentUsage = usage?.ai_queries_used ?? 0;

    return {
      allowed: currentUsage < maxQueries,
      current: currentUsage,
      limit: maxQueries,
      remaining: Math.max(0, maxQueries - currentUsage),
    };
  } catch {
    return { allowed: true, current: 0, limit: 20, remaining: 20 };
  }
}

/**
 * 멤버 수 제한 체크
 */
export async function checkMemberLimit(companyId: string): Promise<UsageCheckResult> {
  try {
    const limits = await getCompanyPlanLimits(companyId);
    const maxMembers = limits.max_members;

    if (maxMembers === null) {
      return { allowed: true, current: 0, limit: null, remaining: null };
    }

    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const currentCount = count ?? 0;

    return {
      allowed: currentCount < maxMembers,
      current: currentCount,
      limit: maxMembers,
      remaining: Math.max(0, maxMembers - currentCount),
    };
  } catch {
    return { allowed: true, current: 0, limit: 5, remaining: 5 };
  }
}

/**
 * 부서 수 제한 체크
 */
export async function checkDepartmentLimit(companyId: string): Promise<UsageCheckResult> {
  try {
    const limits = await getCompanyPlanLimits(companyId);
    const maxDepartments = limits.max_departments;

    if (maxDepartments === null) {
      return { allowed: true, current: 0, limit: null, remaining: null };
    }

    const { count } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const currentCount = count ?? 0;

    return {
      allowed: currentCount < maxDepartments,
      current: currentCount,
      limit: maxDepartments,
      remaining: Math.max(0, maxDepartments - currentCount),
    };
  } catch {
    return { allowed: true, current: 0, limit: 3, remaining: 3 };
  }
}
