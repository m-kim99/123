import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Filter,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Mail,
  Phone,
  Paperclip,
  Lock,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Inquiry, InquiryStatus, InquiryCategory, Priority } from '@/types/operator';

const statusConfig: Record<InquiryStatus, { label: string; icon: any; color: string }> = {
  open: { label: '접수', icon: AlertCircle, color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '처리중', icon: Clock, color: 'bg-amber-100 text-amber-700' },
  waiting: { label: '대기', icon: Clock, color: 'bg-slate-100 text-slate-700' },
  resolved: { label: '해결', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  closed: { label: '종료', icon: CheckCircle, color: 'bg-slate-100 text-slate-600' },
};

const categoryLabels: Record<InquiryCategory, string> = {
  general: '일반 문의',
  bug: '버그 신고',
  feature: '기능 요청',
  billing: '결제/요금',
  account: '계정 문제',
  technical: '기술 지원',
  partnership: '제휴 문의',
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: '낮음', color: 'bg-slate-100 text-slate-600' },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-600' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: '긴급', color: 'bg-red-100 text-red-600' },
};

export function InquiryManagement() {
  const { toast } = useToast();
  const {
    inquiries,
    inquiriesTotal,
    fetchInquiries,
    currentInquiryReplies,
    fetchInquiryReplies,
    updateInquiry,
    createInquiryReply,
  } = useOperatorStore();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  // 상세/답변 다이얼로그
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadInquiries();
  }, [page, statusFilter, categoryFilter]);

  const loadInquiries = async () => {
    setIsLoading(true);
    await fetchInquiries({
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      category: categoryFilter && categoryFilter !== 'all' ? categoryFilter : undefined,
      page,
      limit,
    });
    setIsLoading(false);
  };

  const openDetailDialog = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setDetailDialogOpen(true);
    await fetchInquiryReplies(inquiry.id);
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyContent.trim()) {
      toast({
        title: '입력 오류',
        description: '답변 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    const result = await createInquiryReply(selectedInquiry.id, replyContent, isInternalReply);
    setIsSending(false);

    if (result.success) {
      toast({
        title: isInternalReply ? '내부 메모 추가됨' : '답변 전송됨',
      });
      setReplyContent('');
      setIsInternalReply(false);
      loadInquiries();
    } else {
      toast({
        title: '전송 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (inquiry: Inquiry, status: InquiryStatus) => {
    const result = await updateInquiry(inquiry.id, { status });
    if (result.success) {
      toast({ title: '상태 변경됨' });
      loadInquiries();
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry({ ...selectedInquiry, status });
      }
    }
  };

  const totalPages = Math.ceil(inquiriesTotal / limit);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">문의 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            고객 문의를 확인하고 답변합니다. (총 {inquiriesTotal.toLocaleString()}건)
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
                <SelectItem value="open">접수</SelectItem>
                <SelectItem value="in_progress">처리중</SelectItem>
                <SelectItem value="waiting">대기</SelectItem>
                <SelectItem value="resolved">해결</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <MessageSquare className="w-4 h-4 mr-2" />
                <SelectValue placeholder="분류 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="general">일반 문의</SelectItem>
                <SelectItem value="bug">버그 신고</SelectItem>
                <SelectItem value="feature">기능 요청</SelectItem>
                <SelectItem value="billing">결제/요금</SelectItem>
                <SelectItem value="account">계정 문제</SelectItem>
                <SelectItem value="technical">기술 지원</SelectItem>
                <SelectItem value="partnership">제휴 문의</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Inquiry List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">문의자</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">분류</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">우선순위</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">접수일</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">로딩 중...</td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">문의가 없습니다.</td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => {
                    const status = statusConfig[inquiry.status];
                    const StatusIcon = status.icon;
                    const priority = priorityConfig[inquiry.priority];

                    return (
                      <tr
                        key={inquiry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => openDetailDialog(inquiry)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">
                              {inquiry.name}
                            </p>
                            <p className="text-xs text-slate-500">{inquiry.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {categoryLabels[inquiry.category]}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {inquiry.subject}
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
                          {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(inquiry)}>
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry, 'in_progress')}>
                                처리중으로 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry, 'resolved')}>
                                해결됨으로 변경
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(inquiry, 'closed')}>
                                종료
                              </DropdownMenuItem>
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
                {(page - 1) * limit + 1} - {Math.min(page * limit, inquiriesTotal)} / {inquiriesTotal}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>문의 상세</DialogTitle>
            <DialogDescription>
              {selectedInquiry && categoryLabels[selectedInquiry.category]} · {selectedInquiry && new Date(selectedInquiry.createdAt).toLocaleString('ko-KR')}
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Inquiry Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{selectedInquiry.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedInquiry.email}</span>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedInquiry.phone}</span>
                  </div>
                )}
                {selectedInquiry.companyName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{selectedInquiry.companyName}</span>
                  </div>
                )}
              </div>

              {/* Subject & Content */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  {selectedInquiry.subject}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedInquiry.content}
                </p>
                {selectedInquiry.attachments && selectedInquiry.attachments.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Paperclip className="w-4 h-4" />
                    첨부파일 {selectedInquiry.attachments.length}개
                  </div>
                )}
              </div>

              {/* Replies */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-3">
                  답변 ({currentInquiryReplies.length})
                </h4>
                {currentInquiryReplies.length === 0 ? (
                  <p className="text-sm text-slate-500">아직 답변이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {currentInquiryReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          'p-3 rounded-lg',
                          reply.isInternal
                            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {reply.isInternal && <Lock className="w-3 h-3 text-amber-600" />}
                          <span className="text-sm font-medium">
                            {reply.operatorName || '운영자'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(reply.createdAt).toLocaleString('ko-KR')}
                          </span>
                          {reply.isInternal && (
                            <span className="text-xs text-amber-600">(내부 메모)</span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              {selectedInquiry.status !== 'closed' && (
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isInternalReply}
                          onCheckedChange={setIsInternalReply}
                        />
                        <Label className="text-sm">
                          내부 메모 (사용자에게 표시되지 않음)
                        </Label>
                      </div>
                      <Button onClick={handleSendReply} disabled={isSending}>
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? '전송 중...' : '전송'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            {selectedInquiry && selectedInquiry.status !== 'closed' && (
              <Select
                value={selectedInquiry.status}
                onValueChange={(v) => handleStatusChange(selectedInquiry, v as InquiryStatus)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">접수</SelectItem>
                  <SelectItem value="in_progress">처리중</SelectItem>
                  <SelectItem value="waiting">대기</SelectItem>
                  <SelectItem value="resolved">해결</SelectItem>
                  <SelectItem value="closed">종료</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
