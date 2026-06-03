import { useEffect, useState } from 'react';
import {
  Flag,
  Filter,
  MoreVertical,
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Report, ReportStatus, Priority } from '@/types/operator';

const statusConfig: Record<ReportStatus, { label: string; icon: any; color: string }> = {
  pending: { label: '대기', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  reviewing: { label: '검토중', icon: Eye, color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '처리완료', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  dismissed: { label: '기각', icon: XCircle, color: 'bg-slate-100 text-slate-700' },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: '낮음', color: 'bg-slate-100 text-slate-600' },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-600' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: '긴급', color: 'bg-red-100 text-red-600' },
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
  const { reports, reportsTotal, fetchReports, updateReport } = useOperatorStore();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  // 상세 보기 다이얼로그
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // 처리 다이얼로그
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">신고 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            사용자 신고를 검토하고 처리합니다. (총 {reportsTotal.toLocaleString()}건)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기</SelectItem>
                <SelectItem value="reviewing">검토중</SelectItem>
                <SelectItem value="resolved">처리완료</SelectItem>
                <SelectItem value="dismissed">기각</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="normal">보통</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Report List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">분류</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">사유</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">우선순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">신고일</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">로딩 중...</td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">신고가 없습니다.</td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const targetType = targetTypeLabels[report.targetType];
                    const TargetIcon = targetType?.icon || Flag;
                    const status = statusConfig[report.status];
                    const StatusIcon = status.icon;
                    const priority = priorityConfig[report.priority];

                    return (
                      <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TargetIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {targetType?.label || report.targetType}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {categoryLabels[report.category] || report.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {report.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', priority.color)}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
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
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {(page - 1) * limit + 1} - {Math.min(page * limit, reportsTotal)} / {reportsTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>신고 상세</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">신고 유형</p>
                  <p className="font-medium">{targetTypeLabels[selectedReport.targetType]?.label}</p>
                </div>
                <div>
                  <p className="text-slate-500">분류</p>
                  <p className="font-medium">{categoryLabels[selectedReport.category]}</p>
                </div>
                <div>
                  <p className="text-slate-500">우선순위</p>
                  <span className={cn('px-2 py-1 text-xs font-medium rounded-full', priorityConfig[selectedReport.priority].color)}>
                    {priorityConfig[selectedReport.priority].label}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500">상태</p>
                  <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusConfig[selectedReport.status].color)}>
                    {statusConfig[selectedReport.status].label}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-slate-500 text-sm mb-1">신고 사유</p>
                <p className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg text-sm">
                  {selectedReport.reason}
                </p>
              </div>
              {selectedReport.actionTaken && (
                <div>
                  <p className="text-slate-500 text-sm mb-1">처리 내용</p>
                  <p className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700 dark:text-green-300">
                    {selectedReport.actionTaken}
                  </p>
                </div>
              )}
              <div className="text-xs text-slate-400">
                신고일: {new Date(selectedReport.createdAt).toLocaleString('ko-KR')}
                {selectedReport.reviewedAt && (
                  <> · 처리일: {new Date(selectedReport.reviewedAt).toLocaleString('ko-KR')}</>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'resolve' ? '신고 처리' : '신고 기각'}</DialogTitle>
            <DialogDescription>
              {actionType === 'resolve'
                ? '이 신고를 처리 완료로 표시합니다.'
                : '이 신고를 기각합니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{actionType === 'resolve' ? '처리 내용' : '기각 사유'}</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'resolve' ? '처리 내용을 입력하세요...' : '기각 사유를 입력하세요...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>취소</Button>
            <Button
              onClick={handleAction}
              variant={actionType === 'resolve' ? 'default' : 'secondary'}
            >
              {actionType === 'resolve' ? '처리 완료' : '기각'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
