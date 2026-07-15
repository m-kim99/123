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

// 무료 플랜 기본값 (DB에 연결되지 않았을 때 fallback) — DB plans 시드(free)와 일치해야 함
const FREE_PLAN_DEFAULTS: PlanLimits = {
  max_members: 10,
  max_departments: 3,
  max_documents: 100,
  max_storage_mb: 1024,
  max_ai_queries_monthly: 20,
  max_nfc_tags: 0,
  feature_ai_chat: true,
  feature_nfc: false,
  feature_ocr_advanced: false,
  feature_external_share: false,
  feature_statistics_advanced: false,
};

// 플랜 제한 캐시 (60초 TTL) — 연속 체크 시 중복 요청 방지
const planLimitsCache = new Map<string, { limits: PlanLimits; fetchedAt: number }>();
const PLAN_CACHE_TTL_MS = 60_000;

/**
 * 회사의 현재 플랜 제한 정보를 조회
 */
export async function getCompanyPlanLimits(companyId: string): Promise<PlanLimits> {
  const cached = planLimitsCache.get(companyId);
  if (cached && Date.now() - cached.fetchedAt < PLAN_CACHE_TTL_MS) {
    return cached.limits;
  }

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
          feature_nfc,
          feature_ocr_advanced,
          feature_external_share,
          feature_statistics_advanced
        )
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    const limits = (subscription?.plan as unknown as PlanLimits) ?? FREE_PLAN_DEFAULTS;
    planLimitsCache.set(companyId, { limits, fetchedAt: Date.now() });
    return limits;
  } catch {
    return FREE_PLAN_DEFAULTS;
  }
}

export interface SubscriptionAccess {
  allowed: boolean;
  status: 'active' | 'trialing' | 'expired' | 'none';
  currentPeriodEnd: string | null;
}

/**
 * 서비스 이용 가능 여부 체크 (로그인 게이트용)
 * - 유효한 구독(active / 기간 내 trialing)이 있어야 이용 가능
 * - 체험/구독 기간(current_period_end) 경과 시 expired → 차단
 * - 조회 실패(네트워크 등) 시에는 fail-open (잠금 오탐 방지)
 */
export async function checkSubscriptionAccess(companyId: string): Promise<SubscriptionAccess> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('company_id', companyId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { allowed: false, status: 'none', currentPeriodEnd: null };
    }

    const end = data.current_period_end as string | null;
    if (end && new Date(end).getTime() < Date.now()) {
      return { allowed: false, status: 'expired', currentPeriodEnd: end };
    }

    return {
      allowed: true,
      status: data.status as 'active' | 'trialing',
      currentPeriodEnd: end,
    };
  } catch (err) {
    console.error('checkSubscriptionAccess error:', err);
    return { allowed: true, status: 'active', currentPeriodEnd: null };
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
      .maybeSingle();

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
    // 결제 인원수(subscriptions.member_count)가 플랜 기본값보다 우선 — DB 트리거(check_member_limit)와 동일 로직
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('member_count, plan:plans(max_members)')
      .eq('company_id', companyId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    const planMax =
      (sub?.plan as unknown as { max_members: number | null } | null)?.max_members ?? null;
    const maxMembers = sub
      ? (sub.member_count as number | null) ?? planMax
      : FREE_PLAN_DEFAULTS.max_members;

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
    return { allowed: true, current: 0, limit: 10, remaining: 10 };
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
