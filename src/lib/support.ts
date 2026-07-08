import { supabase } from '@/lib/supabase';
import type {
  ReportTargetType,
  ReportCategory,
  InquiryCategory,
  Inquiry,
  InquiryReply,
  SystemNotice,
  NoticeDisplayLocation,
} from '@/types/operator';

// ============================================================
// 사용자 측 지원 기능 (신고 / 문의 / 시스템 공지)
// UI는 추후 연결 — 여기서는 데이터 계층만 제공
// ============================================================

// ------------------------------------------------------------
// 신고 제출
// ------------------------------------------------------------

/** 신고 사유 목록 (시중 앱 표준 참고) — UI 셀렉트에 사용 */
export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'spam', label: '스팸/광고' },
  { value: 'inappropriate', label: '부적절한 콘텐츠' },
  { value: 'adult', label: '음란물/성적 콘텐츠' },
  { value: 'harassment', label: '욕설/괴롭힘/혐오 발언' },
  { value: 'violence', label: '폭력적이거나 위험한 콘텐츠' },
  { value: 'false_info', label: '허위 정보' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'copyright', label: '저작권/지식재산권 침해' },
  { value: 'illegal', label: '불법 정보 또는 행위' },
  { value: 'other', label: '기타' },
];

export interface SubmitReportParams {
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  reason: string;
  targetCompanyId?: string | null;
  evidenceUrls?: string[];
}

/**
 * 신고 제출 — 문서/사용자/공지/댓글 신고
 * RLS: reporter_id = auth.uid() 인 insert 허용됨
 */
export async function submitReport(
  params: SubmitReportParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reporter_email: user.email ?? null,
      target_type: params.targetType,
      target_id: params.targetId,
      target_company_id: params.targetCompanyId ?? null,
      category: params.category,
      reason: params.reason,
      evidence_urls: params.evidenceUrls ?? null,
    });

    if (error) {
      // 23505: 같은 대상에 대한 중복 신고 (idx_reports_unique_active)
      if (error.code === '23505') {
        return { success: false, error: '이미 신고한 콘텐츠입니다. 검토가 진행 중입니다.' };
      }
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('신고 제출 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : '신고 제출에 실패했습니다.' };
  }
}

// ------------------------------------------------------------
// 문의 제출 / 내 문의 + 답변 조회
// ------------------------------------------------------------

export interface SubmitInquiryParams {
  subject: string;
  content: string;
  category?: InquiryCategory;
  phone?: string;
  attachments?: string[];
}

/**
 * 문의 제출 — 로그인한 사용자의 이름/이메일/회사를 자동으로 채움
 * RLS: user_id = auth.uid() 인 insert 허용됨
 */
export async function submitInquiry(
  params: SubmitInquiryParams
): Promise<{ success: boolean; error?: string; inquiryId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data: userData } = await supabase
      .from('users')
      .select('name, email, company_id')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        user_id: user.id,
        company_id: userData?.company_id ?? null,
        name: userData?.name ?? user.email?.split('@')[0] ?? 'User',
        email: userData?.email ?? user.email ?? '',
        phone: params.phone ?? null,
        subject: params.subject,
        content: params.content,
        category: params.category ?? 'general',
        attachments: params.attachments ?? null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, inquiryId: (data as any)?.id };
  } catch (error) {
    console.error('문의 제출 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : '문의 제출에 실패했습니다.' };
  }
}

/**
 * 내 문의 목록 조회 (RLS가 본인 문의만 반환)
 */
export async function fetchMyInquiries(): Promise<Inquiry[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((i: any) => ({
      id: i.id,
      userId: i.user_id,
      companyId: i.company_id,
      name: i.name,
      email: i.email,
      phone: i.phone,
      subject: i.subject,
      content: i.content,
      category: i.category,
      status: i.status,
      priority: i.priority,
      assignedTo: i.assigned_to,
      attachments: i.attachments,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      resolvedAt: i.resolved_at,
    }));
  } catch (error) {
    console.error('내 문의 목록 로드 실패:', error);
    return [];
  }
}

/**
 * 내 문의의 답변 조회 — RLS가 내부 메모(is_internal)는 제외하고 반환
 */
export async function fetchMyInquiryReplies(inquiryId: string): Promise<InquiryReply[]> {
  try {
    const { data, error } = await supabase
      .from('inquiry_replies')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .eq('is_internal', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      inquiryId: r.inquiry_id,
      operatorId: r.operator_id,
      content: r.content,
      isInternal: r.is_internal,
      attachments: r.attachments,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('문의 답변 로드 실패:', error);
    return [];
  }
}

// ------------------------------------------------------------
// 시스템 공지 조회 (사용자 측)
// ------------------------------------------------------------

/**
 * 활성 시스템 공지 조회
 * @param location 노출 위치 — 'dashboard' | 'login' | 'popup' ('both'는 dashboard/login 양쪽에 노출됨), 'all'이면 위치 무관 전체 조회 (업데이트 페이지용)
 * @param audience 사용자 역할 — null이면 'all' 대상 공지만 (예: 로그인 화면)
 */
export async function fetchSystemNotices(
  location: Exclude<NoticeDisplayLocation, 'both'> | 'all',
  audience: 'admin' | 'team' | null
): Promise<SystemNotice[]> {
  try {
    let query = supabase
      .from('system_notices')
      .select('*')
      .eq('is_active', true)
      .lte('published_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (location !== 'all') {
      const locations: string[] = location === 'popup' ? ['popup'] : [location, 'both'];
      query = query.in('display_location', locations);
    }

    if (audience) {
      query = query.in('target_audience', ['all', audience]);
    } else {
      query = query.eq('target_audience', 'all');
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type,
      isActive: n.is_active,
      isPinned: n.is_pinned,
      targetAudience: n.target_audience,
      displayLocation: n.display_location,
      createdBy: n.created_by,
      publishedAt: n.published_at,
      expiresAt: n.expires_at,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));
  } catch (error) {
    console.error('시스템 공지 로드 실패:', error);
    return [];
  }
}
