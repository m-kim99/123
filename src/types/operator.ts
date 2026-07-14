// 운영자 관련 타입 정의

export interface Operator {
  id: string;
  name: string;
  email: string;
  permissions: OperatorPermissions;
  isSuper: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperatorPermissions {
  members: boolean;
  suspensions: boolean;
  reports: boolean;
  notices: boolean;
  inquiries: boolean;
  companies: boolean;
  operators: boolean;
}

export interface UserSuspension {
  id: string;
  userId: string;
  reason: string;
  internalNote: string | null;
  suspendedBy: string;
  suspendedAt: string;
  expiresAt: string | null;
  liftedAt: string | null;
  liftedBy: string | null;
  liftReason: string | null;
  // joined
  userName?: string;
  userEmail?: string;
  suspendedByName?: string;
}

export type ReportTargetType = 'document' | 'user' | 'announcement' | 'comment';
export type ReportCategory =
  | 'spam'          // 스팸/광고
  | 'inappropriate' // 부적절한 콘텐츠
  | 'adult'         // 음란물/성적 콘텐츠
  | 'harassment'    // 욕설/괴롭힘/혐오 발언
  | 'violence'      // 폭력적이거나 위험한 콘텐츠
  | 'false_info'    // 허위 정보
  | 'privacy'       // 개인정보 노출
  | 'copyright'     // 저작권/지식재산권 침해
  | 'illegal'       // 불법 정보 또는 행위
  | 'other';        // 기타
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportResolveAction = 'restore' | 'warn' | 'remove';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Report {
  id: string;
  reporterId: string | null;
  reporterEmail: string | null;
  targetType: ReportTargetType;
  targetId: string;
  targetCompanyId: string | null;
  category: ReportCategory;
  reason: string;
  evidenceUrls: string[] | null;
  status: ReportStatus;
  priority: Priority;
  reviewedBy: string | null;
  reviewedAt: string | null;
  actionTaken: string | null;
  actionDetails: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  // joined
  reporterName?: string;
  reviewedByName?: string;
  targetCompanyName?: string;
}

export type SystemNoticeType = 'info' | 'warning' | 'maintenance' | 'update';
export type NoticeTargetAudience = 'all' | 'admin' | 'team';
export type NoticeDisplayLocation = 'dashboard' | 'login' | 'both' | 'popup';

export interface SystemNotice {
  id: string;
  title: string;
  content: string;
  type: SystemNoticeType;
  isActive: boolean;
  isPinned: boolean;
  targetAudience: NoticeTargetAudience;
  displayLocation: NoticeDisplayLocation;
  createdBy: string;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  // joined
  createdByName?: string;
}

export type InquiryCategory = 'general' | 'bug' | 'feature' | 'billing' | 'account' | 'technical' | 'partnership';
export type InquiryStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface Inquiry {
  id: string;
  userId: string | null;
  companyId: string | null;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  content: string;
  category: InquiryCategory;
  status: InquiryStatus;
  priority: Priority;
  assignedTo: string | null;
  attachments: string[] | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  // joined
  companyName?: string;
  assignedToName?: string;
  replyCount?: number;
}

export interface InquiryReply {
  id: string;
  inquiryId: string;
  operatorId: string;
  content: string;
  isInternal: boolean;
  attachments: string[] | null;
  createdAt: string;
  updatedAt: string;
  // joined
  operatorName?: string;
}

export interface OperatorActivityLog {
  id: string;
  operatorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  // joined
  operatorName?: string;
}

export interface OperatorDashboardStats {
  totalUsers: number;
  totalCompanies: number;
  pendingReports: number;
  openInquiries: number;
  activeSuspensions: number;
  newUsers7d: number;
  newUsers30d: number;
  newCompanies7d: number;
  avgResponseHours: number | null; // 최근 30일 해결된 문의의 평균 응답 시간 (없으면 null)
}

// 회원 관리에서 사용할 확장된 사용자 타입
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team';
  companyId: string | null;
  companyName: string | null;
  companyCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isSuspended: boolean;
  suspensionExpiresAt: string | null;
  // 회사 구독 정보 (유효 구독 없으면 모두 null → 무료)
  planName: string | null;
  planDisplayName: string | null;
  subscriptionStatus: 'active' | 'trialing' | null;
  subscriptionEndsAt: string | null;
}
