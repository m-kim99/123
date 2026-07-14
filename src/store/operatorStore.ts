import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
  Operator,
  OperatorPermissions,
  OperatorDashboardStats,
  ManagedUser,
  UserSuspension,
  Report,
  ReportResolveAction,
  SystemNotice,
  Inquiry,
  InquiryReply,
} from '@/types/operator';

interface OperatorState {
  // 운영자 인증
  operator: Operator | null;
  isOperator: boolean;
  isLoading: boolean;
  error: string | null;

  // 대시보드 통계
  stats: OperatorDashboardStats | null;

  // 회원 관리
  users: ManagedUser[];
  usersTotal: number;

  // 정지 관리
  suspensions: UserSuspension[];

  // 신고 관리
  reports: Report[];
  reportsTotal: number;

  // 시스템 공지
  notices: SystemNotice[];

  // 문의 관리
  inquiries: Inquiry[];
  inquiriesTotal: number;
  currentInquiryReplies: InquiryReply[];

  // 운영자 계정 관리
  operators: Operator[];

  // Actions
  checkOperatorSession: () => Promise<void>;
  operatorLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  operatorLogout: () => Promise<void>;

  fetchDashboardStats: () => Promise<void>;

  fetchUsers: (params?: {
    search?: string;
    companyId?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;

  suspendUser: (userId: string, reason: string, expiresAt?: string, internalNote?: string) => Promise<{ success: boolean; error?: string }>;
  liftSuspension: (suspensionId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  fetchSuspensions: (userId?: string) => Promise<void>;

  fetchReports: (params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  updateReport: (reportId: string, data: Partial<Report>) => Promise<{ success: boolean; error?: string }>;
  resolveReport: (reportId: string, action: ReportResolveAction, note?: string) => Promise<{ success: boolean; error?: string }>;

  fetchNotices: () => Promise<void>;
  createNotice: (notice: Partial<SystemNotice>) => Promise<{ success: boolean; error?: string }>;
  updateNotice: (noticeId: string, data: Partial<SystemNotice>) => Promise<{ success: boolean; error?: string }>;
  deleteNotice: (noticeId: string) => Promise<{ success: boolean; error?: string }>;

  fetchInquiries: (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchInquiryReplies: (inquiryId: string) => Promise<void>;
  updateInquiry: (inquiryId: string, data: Partial<Inquiry>) => Promise<{ success: boolean; error?: string }>;
  createInquiryReply: (inquiryId: string, content: string, isInternal?: boolean) => Promise<{ success: boolean; error?: string }>;

  fetchOperators: () => Promise<void>;
  updateOperatorPermissions: (operatorId: string, permissions: OperatorPermissions) => Promise<{ success: boolean; error?: string }>;
  setOperatorActive: (operatorId: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;

  clearError: () => void;
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
  operator: null,
  isOperator: false,
  isLoading: true,
  error: null,
  stats: null,
  users: [],
  usersTotal: 0,
  suspensions: [],
  reports: [],
  reportsTotal: 0,
  notices: [],
  inquiries: [],
  inquiriesTotal: 0,
  currentInquiryReplies: [],
  operators: [],

  checkOperatorSession: async () => {
    set({ isLoading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ operator: null, isOperator: false, isLoading: false });
        return;
      }

      const { data: operatorData, error } = await supabase
        .from('operators')
        .select('*')
        .eq('id', session.user.id)
        .eq('is_active', true)
        .single();

      if (error || !operatorData) {
        set({ operator: null, isOperator: false, isLoading: false });
        return;
      }

      set({
        operator: {
          id: operatorData.id,
          name: operatorData.name,
          email: operatorData.email,
          permissions: operatorData.permissions,
          isSuper: operatorData.is_super,
          isActive: operatorData.is_active,
          lastLoginAt: operatorData.last_login_at,
          createdAt: operatorData.created_at,
          updatedAt: operatorData.updated_at,
        },
        isOperator: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('운영자 세션 확인 실패:', error);
      set({ operator: null, isOperator: false, isLoading: false });
    }
  },

  operatorLogin: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    // 기존(일반 사용자) 세션 토큰 보존 — 운영자 검증 실패 시 복원용
    const { data: { session: priorSession } } = await supabase.auth.getSession();

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('인증 실패');

      // 운영자 테이블에서 확인
      const { data: operatorData, error: opError } = await supabase
        .from('operators')
        .select('*')
        .eq('id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (opError || !operatorData) {
        // 운영자가 아니면 로그인 시도 이전 세션으로 복원 (일반 사용자 세션 보호)
        if (priorSession?.refresh_token) {
          await supabase.auth.setSession({
            access_token: priorSession.access_token,
            refresh_token: priorSession.refresh_token,
          });
        } else {
          await supabase.auth.signOut();
        }
        throw new Error('운영자 권한이 없습니다.');
      }

      // 마지막 로그인 시간 업데이트
      await supabase
        .from('operators')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id);

      set({
        operator: {
          id: operatorData.id,
          name: operatorData.name,
          email: operatorData.email,
          permissions: operatorData.permissions,
          isSuper: operatorData.is_super,
          isActive: operatorData.is_active,
          lastLoginAt: new Date().toISOString(),
          createdAt: operatorData.created_at,
          updatedAt: operatorData.updated_at,
        },
        isOperator: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '로그인 실패';
      set({ operator: null, isOperator: false, isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  operatorLogout: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      set({
        operator: null,
        isOperator: false,
        stats: null,
        users: [],
        suspensions: [],
        reports: [],
        notices: [],
        inquiries: [],
        operators: [],
      });
    }
  },

  fetchDashboardStats: async () => {
    try {
      // 개별 쿼리로 통계 수집
      const [
        { count: totalUsers },
        { count: totalCompanies },
        { count: pendingReports },
        { count: openInquiries },
        { count: activeSuspensions },
        { count: newUsers7d },
        { count: newUsers30d },
        { count: newCompanies7d },
        { data: resolvedInquiries },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('inquiries').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('user_suspensions').select('*', { count: 'exact', head: true })
          .is('lifted_at', null)
          .or('expires_at.is.null,expires_at.gt.now()'),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('companies').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('inquiries').select('created_at, resolved_at')
          .not('resolved_at', 'is', null)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(500),
      ]);

      // 최근 30일 해결된 문의의 평균 응답 시간(시간 단위) 계산
      let avgResponseHours: number | null = null;
      if (resolvedInquiries && resolvedInquiries.length > 0) {
        const totalHours = resolvedInquiries.reduce((sum: number, i: any) => {
          const diff = new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime();
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgResponseHours = totalHours / resolvedInquiries.length;
      }

      set({
        stats: {
          totalUsers: totalUsers || 0,
          totalCompanies: totalCompanies || 0,
          pendingReports: pendingReports || 0,
          openInquiries: openInquiries || 0,
          activeSuspensions: activeSuspensions || 0,
          newUsers7d: newUsers7d || 0,
          newUsers30d: newUsers30d || 0,
          newCompanies7d: newCompanies7d || 0,
          avgResponseHours,
        },
      });
    } catch (error) {
      console.error('대시보드 통계 로드 실패:', error);
    }
  },

  fetchUsers: async (params = {}) => {
    const { search, companyId, role, page = 1, limit = 20 } = params;

    try {
      let query = supabase
        .from('users')
        .select(`
          id, name, email, role, company_id, department_id, created_at, last_login_at,
          companies:companies!left(name, code),
          departments:departments!left(name)
        `, { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (role) {
        query = query.eq('role', role);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      // 정지 상태 확인을 위해 user_id 목록 추출
      const userIds = data?.map((u: any) => u.id) || [];

      let suspensionMap: Record<string, { expiresAt: string | null }> = {};
      if (userIds.length > 0) {
        const { data: suspensions } = await supabase
          .from('user_suspensions')
          .select('user_id, expires_at')
          .in('user_id', userIds)
          .is('lifted_at', null)
          .or('expires_at.is.null,expires_at.gt.now()');

        suspensions?.forEach((s: any) => {
          suspensionMap[s.user_id] = { expiresAt: s.expires_at };
        });
      }

      // 회사별 구독(플랜/종료일) 조회 — 무료면 행 없음
      const companyIds = [...new Set((data || []).map((u: any) => u.company_id).filter(Boolean))];
      const subscriptionMap: Record<
        string,
        { planName: string | null; planDisplayName: string | null; status: 'active' | 'trialing'; endsAt: string | null }
      > = {};
      if (companyIds.length > 0) {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('company_id, status, current_period_end, plans(name, display_name)')
          .in('company_id', companyIds)
          .in('status', ['active', 'trialing']);

        subs?.forEach((s: any) => {
          subscriptionMap[s.company_id] = {
            planName: s.plans?.name ?? null,
            planDisplayName: s.plans?.display_name ?? null,
            status: s.status,
            endsAt: s.current_period_end ?? null,
          };
        });
      }

      const users: ManagedUser[] = (data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        companyId: u.company_id,
        companyName: u.companies?.name || null,
        companyCode: u.companies?.code || null,
        departmentId: u.department_id,
        departmentName: u.departments?.name || null,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at ?? null,
        isSuspended: !!suspensionMap[u.id],
        suspensionExpiresAt: suspensionMap[u.id]?.expiresAt || null,
        planName: u.company_id ? subscriptionMap[u.company_id]?.planName ?? null : null,
        planDisplayName: u.company_id ? subscriptionMap[u.company_id]?.planDisplayName ?? null : null,
        subscriptionStatus: u.company_id ? subscriptionMap[u.company_id]?.status ?? null : null,
        subscriptionEndsAt: u.company_id ? subscriptionMap[u.company_id]?.endsAt ?? null : null,
      }));

      set({ users, usersTotal: count || 0 });
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    }
  },

  suspendUser: async (userId, reason, expiresAt, internalNote) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };
    if (!operator.isSuper && !operator.permissions?.suspensions) {
      return { success: false, error: '정지 권한이 없습니다.' };
    }

    try {
      const { error } = await supabase.from('user_suspensions').insert({
        user_id: userId,
        reason,
        internal_note: internalNote || null,
        suspended_by: operator.id,
        expires_at: expiresAt || null,
      });

      if (error) throw error;

      // 활동 로그 기록
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'suspend_user',
        target_type: 'user',
        target_id: userId,
        details: { reason, expires_at: expiresAt },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '정지 처리 실패';
      return { success: false, error: errorMsg };
    }
  },

  liftSuspension: async (suspensionId, reason) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };
    if (!operator.isSuper && !operator.permissions?.suspensions) {
      return { success: false, error: '정지 해제 권한이 없습니다.' };
    }

    try {
      const { error } = await supabase
        .from('user_suspensions')
        .update({
          lifted_at: new Date().toISOString(),
          lifted_by: operator.id,
          lift_reason: reason,
        })
        .eq('id', suspensionId);

      if (error) throw error;

      // 활동 로그 기록
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'lift_suspension',
        target_type: 'suspension',
        target_id: suspensionId,
        details: { reason },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '정지 해제 실패';
      return { success: false, error: errorMsg };
    }
  },

  fetchSuspensions: async (userId) => {
    try {
      let query = supabase
        .from('user_suspensions')
        .select(`
          *,
          users:user_id(name, email),
          suspended_by_op:suspended_by(name)
        `)
        .order('suspended_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const suspensions: UserSuspension[] = (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        reason: s.reason,
        internalNote: s.internal_note,
        suspendedBy: s.suspended_by,
        suspendedAt: s.suspended_at,
        expiresAt: s.expires_at,
        liftedAt: s.lifted_at,
        liftedBy: s.lifted_by,
        liftReason: s.lift_reason,
        userName: s.users?.name,
        userEmail: s.users?.email,
        suspendedByName: s.suspended_by_op?.name,
      }));

      set({ suspensions });
    } catch (error) {
      console.error('정지 목록 로드 실패:', error);
    }
  },

  fetchReports: async (params = {}) => {
    const { status, priority, page = 1, limit = 20 } = params;

    try {
      let query = supabase
        .from('reports')
        .select('*', { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const reports: Report[] = (data || []).map((r: any) => ({
        id: r.id,
        reporterId: r.reporter_id,
        reporterEmail: r.reporter_email,
        targetType: r.target_type,
        targetId: r.target_id,
        targetCompanyId: r.target_company_id,
        category: r.category,
        reason: r.reason,
        evidenceUrls: r.evidence_urls,
        status: r.status,
        priority: r.priority,
        reviewedBy: r.reviewed_by,
        reviewedAt: r.reviewed_at,
        actionTaken: r.action_taken,
        actionDetails: r.action_details,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      set({ reports, reportsTotal: count || 0 });
    } catch (error) {
      console.error('신고 목록 로드 실패:', error);
    }
  },

  updateReport: async (reportId, data) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };

    try {
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.priority) updateData.priority = data.priority;
      if (data.actionTaken) updateData.action_taken = data.actionTaken;
      if (data.actionDetails) updateData.action_details = data.actionDetails;

      if (data.status === 'resolved' || data.status === 'dismissed') {
        updateData.reviewed_by = operator.id;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      // 활동 로그
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'update_report',
        target_type: 'report',
        target_id: reportId,
        details: updateData,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '신고 처리 실패';
      return { success: false, error: errorMsg };
    }
  },

  resolveReport: async (reportId, action, note) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };
    if (!operator.isSuper && !operator.permissions?.reports) {
      return { success: false, error: '신고 처리 권한이 없습니다.' };
    }

    try {
      // restore: 기각·복원 / warn: 복원+작성자 경고 알림 / remove: 콘텐츠 삭제+작성자 알림
      // 같은 대상의 활성 신고를 일괄 처리함 (SECURITY DEFINER RPC)
      const { data, error } = await supabase.rpc('operator_resolve_report', {
        p_report_id: reportId,
        p_action: action,
        p_note: note ?? null,
      });

      if (error) throw error;
      if (data && data.success === false) {
        return { success: false, error: data.error ?? '신고 처리에 실패했습니다.' };
      }

      // 활동 로그
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'resolve_report',
        target_type: 'report',
        target_id: reportId,
        details: { action, note: note ?? null },
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '신고 처리 실패';
      return { success: false, error: errorMsg };
    }
  },

  fetchNotices: async () => {
    try {
      const { data, error } = await supabase
        .from('system_notices')
        .select(`
          *,
          created_by_op:created_by(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notices: SystemNotice[] = (data || []).map((n: any) => ({
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
        createdByName: n.created_by_op?.name,
      }));

      set({ notices });
    } catch (error) {
      console.error('공지 목록 로드 실패:', error);
    }
  },

  createNotice: async (notice) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };

    try {
      const { error } = await supabase.from('system_notices').insert({
        title: notice.title,
        content: notice.content,
        type: notice.type || 'info',
        is_active: notice.isActive ?? true,
        is_pinned: notice.isPinned ?? false,
        target_audience: notice.targetAudience || 'all',
        display_location: notice.displayLocation || 'dashboard',
        created_by: operator.id,
        published_at: notice.publishedAt || new Date().toISOString(),
        expires_at: notice.expiresAt || null,
      });

      if (error) throw error;

      await get().fetchNotices();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '공지 생성 실패';
      return { success: false, error: errorMsg };
    }
  },

  updateNotice: async (noticeId, data) => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.isPinned !== undefined) updateData.is_pinned = data.isPinned;
      if (data.targetAudience !== undefined) updateData.target_audience = data.targetAudience;
      if (data.displayLocation !== undefined) updateData.display_location = data.displayLocation;
      if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;

      const { error } = await supabase
        .from('system_notices')
        .update(updateData)
        .eq('id', noticeId);

      if (error) throw error;

      await get().fetchNotices();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '공지 수정 실패';
      return { success: false, error: errorMsg };
    }
  },

  deleteNotice: async (noticeId) => {
    try {
      const { error } = await supabase
        .from('system_notices')
        .delete()
        .eq('id', noticeId);

      if (error) throw error;

      await get().fetchNotices();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '공지 삭제 실패';
      return { success: false, error: errorMsg };
    }
  },

  fetchInquiries: async (params = {}) => {
    const { status, category, page = 1, limit = 20 } = params;

    try {
      let query = supabase
        .from('inquiries')
        .select(`
          *,
          companies:company_id(name),
          assigned_op:assigned_to(name)
        `, { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }
      if (category) {
        query = query.eq('category', category);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const inquiries: Inquiry[] = (data || []).map((i: any) => ({
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
        companyName: i.companies?.name,
        assignedToName: i.assigned_op?.name,
      }));

      set({ inquiries, inquiriesTotal: count || 0 });
    } catch (error) {
      console.error('문의 목록 로드 실패:', error);
    }
  },

  fetchInquiryReplies: async (inquiryId) => {
    try {
      const { data, error } = await supabase
        .from('inquiry_replies')
        .select(`
          *,
          operator:operator_id(name)
        `)
        .eq('inquiry_id', inquiryId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const replies: InquiryReply[] = (data || []).map((r: any) => ({
        id: r.id,
        inquiryId: r.inquiry_id,
        operatorId: r.operator_id,
        content: r.content,
        isInternal: r.is_internal,
        attachments: r.attachments,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        operatorName: r.operator?.name,
      }));

      set({ currentInquiryReplies: replies });
    } catch (error) {
      console.error('문의 답변 로드 실패:', error);
    }
  },

  updateInquiry: async (inquiryId, data) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };

    try {
      const updateData: any = {};
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;

      if (data.status === 'resolved' || data.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('inquiries')
        .update(updateData)
        .eq('id', inquiryId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '문의 수정 실패';
      return { success: false, error: errorMsg };
    }
  },

  createInquiryReply: async (inquiryId, content, isInternal = false) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };

    try {
      const { error } = await supabase.from('inquiry_replies').insert({
        inquiry_id: inquiryId,
        operator_id: operator.id,
        content,
        is_internal: isInternal,
      });

      if (error) throw error;

      // 문의 상태를 in_progress로 변경 (open인 경우)
      await supabase
        .from('inquiries')
        .update({ status: 'in_progress' })
        .eq('id', inquiryId)
        .eq('status', 'open');

      await get().fetchInquiryReplies(inquiryId);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '답변 등록 실패';
      return { success: false, error: errorMsg };
    }
  },

  fetchOperators: async () => {
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const operators: Operator[] = (data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        permissions: o.permissions ?? {},
        isSuper: o.is_super,
        isActive: o.is_active,
        lastLoginAt: o.last_login_at,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      }));

      set({ operators });
    } catch (error) {
      console.error('운영자 목록 로드 실패:', error);
    }
  },

  updateOperatorPermissions: async (operatorId, permissions) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };
    // DB RLS("Super operators can manage operators")와 동일한 기준
    if (!operator.isSuper) {
      return { success: false, error: '슈퍼 운영자만 권한을 변경할 수 있습니다.' };
    }

    try {
      const { error } = await supabase
        .from('operators')
        .update({ permissions, updated_at: new Date().toISOString() })
        .eq('id', operatorId);

      if (error) throw error;

      // 활동 로그 기록
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'update_operator',
        target_type: 'operator',
        target_id: operatorId,
        details: { permissions },
      });

      await get().fetchOperators();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '권한 변경 실패';
      return { success: false, error: errorMsg };
    }
  },

  setOperatorActive: async (operatorId, isActive) => {
    const { operator } = get();
    if (!operator) return { success: false, error: '운영자 권한이 필요합니다.' };
    if (!operator.isSuper) {
      return { success: false, error: '슈퍼 운영자만 계정 상태를 변경할 수 있습니다.' };
    }
    // 잠금 방지: 본인 계정은 비활성화 불가
    if (operatorId === operator.id && !isActive) {
      return { success: false, error: '본인 계정은 비활성화할 수 없습니다.' };
    }

    try {
      const { error } = await supabase
        .from('operators')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', operatorId);

      if (error) throw error;

      // 활동 로그 기록
      await supabase.from('operator_activity_logs').insert({
        operator_id: operator.id,
        action: 'update_operator',
        target_type: 'operator',
        target_id: operatorId,
        details: { is_active: isActive },
      });

      await get().fetchOperators();
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '상태 변경 실패';
      return { success: false, error: errorMsg };
    }
  },

  clearError: () => set({ error: null }),
}));
