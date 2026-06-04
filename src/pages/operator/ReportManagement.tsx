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
import type { Report, ReportStatus, Priority } from '@/types/operator';
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

const statusConfig: Record<ReportStatus, { label: string; icon: any; variant: ChipVariant }> = {
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

const categoryLabels: Record<string, string> = {
  spam: '스팸',
  inappropriate: '부적절한 콘텐츠',
  copyright: '저작권 침해',
  privacy: '개인정보 침해',
  illegal: '불법 콘텐츠',
  other: '기타',
};

const targetTypeLabels: Record<string, { label: string; icon: any }> = {
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

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'resolve' | 'dismiss'>('resolve');
  const [actionNote, setActionNote] = useState('');

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

  const openActionDialog = (report: Report, type: 'resolve' | 'dismiss') => {
    setSelectedReport(report);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedReport) return;

    const result = await updateReport(selectedReport.id, {
      status: actionType === 'resolve' ? 'resolved' : 'dismissed',
      actionTaken: actionNote || (actionType === 'resolve' ? '처리 완료' : '기각'),
    });

    if (result.success) {
      toast({
        title: actionType === 'resolve' ? '처리 완료' : '기각 완료',
        description: '신고가 처리되었습니다.',
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
                          <div className="flex items-center gap-2">
                            <TargetIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">
                              {targetType?.label || report.targetType}
                            </span>
                          </div>
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
                                    onClick={() => openActionDialog(report, 'resolve')}
                                    className="text-green-600"
                                  >
                                    처리 완료
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openActionDialog(report, 'dismiss')}
                                    className="text-slate-600"
                                  >
                                    기각
                                  </DropdownMenuItem>
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
                  <p className="font-medium text-foreground">{targetTypeLabels[selectedReport.targetType]?.label}</p>
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

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={actionType === 'resolve' ? CheckCircle : XCircle}
            iconColor={actionType === 'resolve' ? V1.emerald : V1.muted}
            title={actionType === 'resolve' ? '신고 처리' : '신고 기각'}
            sub={actionType === 'resolve' ? '이 신고를 처리 완료로 표시합니다.' : '이 신고를 기각합니다.'}
          />
          <V1ModalBody>
            <div className="space-y-2">
              <Label>{actionType === 'resolve' ? '처리 내용' : '기각 사유'}</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'resolve' ? '처리 내용을 입력하세요...' : '기각 사유를 입력하세요...'}
                rows={3}
                className="rounded-[10px]"
              />
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="rounded-[10px]">취소</Button>
            <Button
              onClick={handleAction}
              variant={actionType === 'resolve' ? 'default' : 'secondary'}
              className="rounded-[10px]"
            >
              {actionType === 'resolve' ? '처리 완료' : '기각'}
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
