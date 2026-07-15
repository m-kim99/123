import { useEffect, useState } from 'react';
import {
  Flag,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { useOperatorStore } from '@/store/operatorStore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { REPORT_CATEGORIES } from '@/lib/support';
import { supabase } from '@/lib/supabase';
import { r2Storage } from '@/lib/r2';
import { downloadFile } from '@/lib/appBridge';
import { PdfViewer } from '@/components/PdfViewer';
import type { Report, ReportStatus, Priority, ReportResolveAction } from '@/types/operator';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1ModalHeader,
  V1ModalBody,
  V1ModalFooter,
  V1,
} from '@/components/ui/v1-components';

type ChipVariant = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'neutral';

const statusConfig: Record<ReportStatus, { label: string; icon: LucideIcon; variant: ChipVariant }> = {
  pending: { label: '대기', icon: Clock, variant: 'amber' },
  reviewing: { label: '검토중', icon: Eye, variant: 'blue' },
  resolved: { label: '처리완료', icon: CheckCircle, variant: 'emerald' },
  dismissed: { label: '기각', icon: XCircle, variant: 'neutral' },
};

const priorityConfig: Record<Priority, { label: string; variant: ChipVariant }> = {
  low: { label: '낮음', variant: 'neutral' },
  normal: { label: '보통', variant: 'blue' },
  high: { label: '높음', variant: 'amber' },
  urgent: { label: '긴급', variant: 'red' },
};

// 신고 사유 라벨 — 사용자 신고 다이얼로그(REPORT_CATEGORIES)와 단일 소스 공유
const categoryLabels: Record<string, string> = Object.fromEntries(
  REPORT_CATEGORIES.map((c) => [c.value, c.label])
);

// 3단계 처리 액션 설정 (operator_resolve_report RPC와 1:1 대응)
const resolveActionConfig: Record<
  ReportResolveAction,
  { label: string; title: string; sub: string; icon: LucideIcon; color: string; noteLabel: string; notePlaceholder: string; confirmLabel: string }
> = {
  restore: {
    label: '기각 · 콘텐츠 복원',
    title: '신고 기각',
    sub: '신고를 기각하고 숨김 처리된 콘텐츠를 복원합니다. 같은 대상의 다른 활성 신고도 함께 기각됩니다.',
    icon: RotateCcw,
    color: V1.blue,
    noteLabel: '기각 사유 (내부 기록용)',
    notePlaceholder: '기각 사유를 입력하세요...',
    confirmLabel: '기각 · 복원',
  },
  warn: {
    label: '경고 (복원 + 작성자 알림)',
    title: '경고 처리',
    sub: '콘텐츠를 복원하되 작성자에게 경고 알림을 보냅니다. 같은 대상의 활성 신고가 모두 처리완료됩니다.',
    icon: AlertTriangle,
    color: V1.amber,
    noteLabel: '경고 사유 (작성자 알림에 포함됨)',
    notePlaceholder: '작성자에게 전달할 경고 사유를 입력하세요...',
    confirmLabel: '경고 보내기',
  },
  remove: {
    label: '삭제 (콘텐츠 삭제 + 작성자 알림)',
    title: '콘텐츠 삭제',
    sub: '콘텐츠를 삭제하고 작성자에게 알림을 보냅니다. 이 작업은 되돌릴 수 없습니다.',
    icon: Trash2,
    color: V1.red,
    noteLabel: '삭제 사유 (작성자 알림에 포함됨)',
    notePlaceholder: '작성자에게 전달할 삭제 사유를 입력하세요...',
    confirmLabel: '삭제하기',
  },
};

const targetTypeLabels: Record<string, { label: string; icon: LucideIcon }> = {
  document: { label: '문서', icon: FileText },
  user: { label: '사용자', icon: User },
  announcement: { label: '공지사항', icon: MessageSquare },
  comment: { label: '댓글', icon: MessageSquare },
};

export function ReportManagement() {
  const { toast } = useToast();
  const reports = useOperatorStore((s) => s.reports);
  const reportsTotal = useOperatorStore((s) => s.reportsTotal);
  const fetchReports = useOperatorStore((s) => s.fetchReports);
  const updateReport = useOperatorStore((s) => s.updateReport);
  const resolveReport = useOperatorStore((s) => s.resolveReport);

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ReportResolveAction>('restore');
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<
    | {
        id: string;
        title: string;
        url: string;
        type: 'image' | 'pdf' | 'other';
        ocrText?: string | null;
        uploader?: string;
        uploadDate?: string;
        fileSize?: string;
      }
    | null
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);

  useEffect(() => {
    loadReports();
  }, [page, statusFilter, priorityFilter]);

  const loadReports = async () => {
    setIsLoading(true);
    await fetchReports({
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter && priorityFilter !== 'all' ? priorityFilter : undefined,
      page,
      limit,
    });
    setIsLoading(false);
  };

  const openDetailDialog = (report: Report) => {
    setSelectedReport(report);
    setDetailDialogOpen(true);
  };

  const openActionDialog = (report: Report, action: ReportResolveAction) => {
    setSelectedReport(report);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedReport || isSubmitting) return;

    setIsSubmitting(true);
    const result = await resolveReport(
      selectedReport.id,
      actionType,
      actionNote.trim() || undefined
    );
    setIsSubmitting(false);

    if (result.success) {
      const doneMsg: Record<ReportResolveAction, string> = {
        restore: '신고가 기각되고 콘텐츠가 복원되었습니다.',
        warn: '콘텐츠가 복원되고 작성자에게 경고 알림을 보냈습니다.',
        remove: '콘텐츠가 삭제되고 작성자에게 알림을 보냈습니다.',
      };
      toast({
        title: resolveActionConfig[actionType].title + ' 완료',
        description: doneMsg[actionType],
      });
      setActionDialogOpen(false);
      setActionNote('');
      loadReports();
    } else {
      toast({
        title: '처리 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (report: Report, status: ReportStatus) => {
    const result = await updateReport(report.id, { status });
    if (result.success) {
      toast({ title: '상태 변경됨' });
      loadReports();
    } else {
      toast({ title: '변경 실패', description: result.error, variant: 'destructive' });
    }
  };

  // 신고된 문서 미리보기 — DocumentManagement.tsx의 handleOpenPreviewDocument와 동일한 로직
  const handleOpenPreviewDocument = async (documentId: string) => {
    try {
      setPreviewLoading(true);
      setPreviewOpen(true);

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title, ocr_text, uploaded_by, uploaded_at, file_size')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: publicData } = r2Storage.getPublicUrl(data.file_path);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error('파일 URL을 생성할 수 없습니다.');
      }

      const lowerPath = data.file_path.toLowerCase();
      let type: 'image' | 'pdf' | 'other' = 'other';

      if (lowerPath.endsWith('.pdf')) {
        type = 'pdf';
      } else if (
        lowerPath.endsWith('.jpg') ||
        lowerPath.endsWith('.jpeg') ||
        lowerPath.endsWith('.png')
      ) {
        type = 'image';
      }

      const fileSizeRaw = data.file_size;
      let fileSizeStr: string | undefined;
      if (fileSizeRaw) {
        const bytes = Number(fileSizeRaw);
        if (bytes >= 1048576) fileSizeStr = `${(bytes / 1048576).toFixed(1)}MB`;
        else if (bytes >= 1024) fileSizeStr = `${Math.round(bytes / 1024)}KB`;
        else fileSizeStr = `${bytes}B`;
      }

      setPreviewDoc({
        id: documentId,
        title: data.title,
        url: publicUrl,
        type,
        ocrText: data.ocr_text ?? null,
        uploader: data.uploaded_by ?? undefined,
        uploadDate: data.uploaded_at ? new Date(data.uploaded_at).toLocaleDateString('ko-KR') : undefined,
        fileSize: fileSizeStr,
      });
    } catch (error) {
      console.error('문서 미리보기 로드 실패:', error);
      setPreviewOpen(false);
      toast({
        title: '미리보기 실패',
        description: '신고된 문서를 불러오지 못했습니다. 이미 삭제되었을 수 있습니다.',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPreviewDocument = async () => {
    if (!previewDoc) return;
    try {
      await downloadFile(previewDoc.url, previewDoc.title || 'document');
    } catch (error) {
      console.error('문서 다운로드 실패:', error);
      toast({
        title: '다운로드 실패',
        description: '파일을 다운로드하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(reportsTotal / limit);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${reportsTotal.toLocaleString()}건 신고`}
          title="신고 관리"
          sub="사용자 신고를 검토하고 처리합니다."
        />

        {/* Table Card */}
        <div className={v1Card}>
          {/* Filters */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36 rounded-[10px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="reviewing">검토중</SelectItem>
                    <SelectItem value="resolved">처리완료</SelectItem>
                    <SelectItem value="dismissed">기각</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36 rounded-[10px]">
                    <SelectValue placeholder="우선순위" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 우선순위</SelectItem>
                    <SelectItem value="urgent">긴급</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="normal">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                총 {reportsTotal.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">유형</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">분류</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">사유</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">우선순위</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">신고일</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">로딩 중...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      <Flag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      신고가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const targetType = targetTypeLabels[report.targetType];
                    const TargetIcon = targetType?.icon || Flag;
                    const status = statusConfig[report.status];
                    const StatusIcon = status.icon;
                    const priority = priorityConfig[report.priority];

                    return (
                      <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-5 py-3">
                          {report.targetType === 'document' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPreviewDocument(report.targetId)}
                              className="flex items-center gap-2 text-sm text-[#2563eb] hover:underline"
                              title="신고된 문서 미리보기"
                            >
                              <TargetIcon className="w-4 h-4" />
                              {targetType?.label}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <TargetIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {targetType?.label || report.targetType}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-foreground">
                            {categoryLabels[report.category] || report.category}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-foreground truncate max-w-xs">
                            {report.reason}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <V1Chip variant={priority.variant}>{priority.label}</V1Chip>
                        </td>
                        <td className="px-5 py-3">
                          <V1Chip variant={status.variant} icon={StatusIcon}>{status.label}</V1Chip>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="rounded-lg">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(report)}>
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {report.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(report, 'reviewing')}>
                                  검토 시작
                                </DropdownMenuItem>
                              )}
                              {(report.status === 'pending' || report.status === 'reviewing') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => openActionDialog(report, 'restore')}
                                    className="text-blue-600"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    기각 · 복원
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openActionDialog(report, 'warn')}
                                    className="text-amber-600"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                                    경고 (복원 + 알림)
                                  </DropdownMenuItem>
                                  {report.targetType !== 'user' && (
                                    <DropdownMenuItem
                                      onClick={() => openActionDialog(report, 'remove')}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      삭제 (콘텐츠 삭제 + 알림)
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * limit + 1} - {Math.min(page * limit, reportsTotal)} / {reportsTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <V1ModalHeader
            icon={Flag}
            iconColor={V1.red}
            title="신고 상세"
            sub={selectedReport ? `${targetTypeLabels[selectedReport.targetType]?.label} 신고` : ''}
          />
          {selectedReport && (
            <V1ModalBody>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">신고 유형</p>
                  {selectedReport.targetType === 'document' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPreviewDocument(selectedReport.targetId)}
                      className="font-medium text-[#2563eb] hover:underline inline-flex items-center gap-1"
                    >
                      {targetTypeLabels[selectedReport.targetType]?.label}
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <p className="font-medium text-foreground">{targetTypeLabels[selectedReport.targetType]?.label}</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">분류</p>
                  <p className="font-medium text-foreground">{categoryLabels[selectedReport.category]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">우선순위</p>
                  <V1Chip variant={priorityConfig[selectedReport.priority].variant}>
                    {priorityConfig[selectedReport.priority].label}
                  </V1Chip>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">상태</p>
                  <V1Chip variant={statusConfig[selectedReport.status].variant}>
                    {statusConfig[selectedReport.status].label}
                  </V1Chip>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">신고 사유</p>
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-sm text-foreground">
                  {selectedReport.reason}
                </p>
              </div>
              {selectedReport.actionTaken && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">처리 내용</p>
                  <p className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                    {selectedReport.actionTaken}
                  </p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                신고일: {new Date(selectedReport.createdAt).toLocaleString('ko-KR')}
                {selectedReport.reviewedAt && (
                  <> · 처리일: {new Date(selectedReport.reviewedAt).toLocaleString('ko-KR')}</>
                )}
              </div>
            </V1ModalBody>
          )}
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="rounded-[10px]">닫기</Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog — 3단계 처리 (복원/경고/삭제) */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={resolveActionConfig[actionType].icon}
            iconColor={resolveActionConfig[actionType].color}
            title={resolveActionConfig[actionType].title}
            sub={resolveActionConfig[actionType].sub}
          />
          <V1ModalBody>
            {selectedReport && (
              <div className="text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-muted-foreground">대상: </span>
                <span className="font-medium text-foreground">
                  {targetTypeLabels[selectedReport.targetType]?.label || selectedReport.targetType}
                </span>
                <span className="text-muted-foreground"> · 사유: </span>
                <span className="text-foreground">
                  {categoryLabels[selectedReport.category] || selectedReport.category}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>{resolveActionConfig[actionType].noteLabel}</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={resolveActionConfig[actionType].notePlaceholder}
                rows={3}
                className="rounded-[10px]"
              />
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={isSubmitting} className="rounded-[10px]">취소</Button>
            <Button
              onClick={handleAction}
              disabled={isSubmitting}
              variant={actionType === 'remove' ? 'destructive' : 'default'}
              className="rounded-[10px]"
            >
              {isSubmitting ? '처리 중...' : resolveActionConfig[actionType].confirmLabel}
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* 신고된 문서 미리보기 — DocumentManagement.tsx의 미리보기 다이얼로그와 동일한 UI/UX */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setImageZoom(100);
            setImageRotation(0);
          }
        }}
      >
        <DialogContent className="max-w-[840px] h-[90vh] flex flex-col overflow-hidden gap-0 p-0 rounded-[16px]" hideClose>
          {/* V1 M4 Compact Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#eff6ff]">
              <FileText className="h-4 w-4 text-[#2563eb]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-slate-900 truncate">{previewDoc?.title || '문서 미리보기'}</div>
              <div className="text-[11.5px] text-slate-500 font-mono truncate">
                {[previewDoc?.uploader, previewDoc?.uploadDate, previewDoc?.fileSize].filter(Boolean).join(' · ') || (previewDoc?.type === 'pdf' ? 'PDF' : 'Image')}
              </div>
            </div>
            {previewDoc && (
              <button
                onClick={handleDownloadPreviewDocument}
                className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                다운로드
              </button>
            )}
            <button
              onClick={() => { setPreviewOpen(false); setImageZoom(100); setImageRotation(0); }}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* V1 M4 Two-panel layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Viewer */}
            <div className="flex-1 bg-[#f1f5f9] flex flex-col overflow-hidden relative">
              {previewDoc?.type === 'image' && (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-sm shrink-0">
                  <button onClick={() => setImageZoom(Math.max(25, imageZoom - 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                    <ZoomOut className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                  <span className="text-[12px] font-medium text-slate-700 min-w-[48px] text-center font-mono">{imageZoom}%</span>
                  <button onClick={() => setImageZoom(Math.min(200, imageZoom + 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                    <ZoomIn className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  <button onClick={() => setImageRotation((imageRotation + 90) % 360)} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50" title="90도 회전">
                    <RotateCw className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                </div>
              )}
              <div
                className={!previewLoading && previewDoc?.type === 'pdf' ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto flex items-center justify-center p-8'}
                onWheel={(e) => {
                  if (previewDoc?.type === 'image' && e.ctrlKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -10 : 10;
                    setImageZoom((prev) => Math.max(25, Math.min(200, prev + delta)));
                  }
                }}
              >
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                    <p className="text-[13px] text-slate-500">문서를 불러오는 중...</p>
                  </div>
                ) : previewDoc?.type === 'pdf' ? (
                  <div className="w-full h-full"><PdfViewer url={previewDoc.url} /></div>
                ) : previewDoc?.type === 'image' ? (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    style={{
                      transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                      transition: 'transform 0.2s ease',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                    className="rounded shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]"
                  />
                ) : null}
              </div>
            </div>

            {/* Right: OCR + Meta sidebar */}
            <div className="w-[280px] border-l border-[#e5e7eb] bg-white flex flex-col overflow-hidden shrink-0 hidden md:flex">
              <div className="p-4 border-b border-slate-100 flex-1 overflow-auto">
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                  OCR 추출 텍스트 · {previewDoc?.ocrText?.length?.toLocaleString() ?? 0}자
                </div>
                <div className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                  {previewDoc?.ocrText || 'OCR 텍스트 없음'}
                </div>
              </div>
              <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">
                  문서 정보
                </div>
                <div className="flex flex-col gap-2 text-[12px]">
                  {previewDoc?.uploader && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">업로더</span>
                      <span className="text-slate-900 font-medium">{previewDoc.uploader}</span>
                    </div>
                  )}
                  {previewDoc?.uploadDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">업로드일</span>
                      <span className="text-slate-900 font-medium font-mono">{previewDoc.uploadDate}</span>
                    </div>
                  )}
                  {previewDoc?.fileSize && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">파일 크기</span>
                      <span className="text-slate-900 font-medium font-mono">{previewDoc.fileSize}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
