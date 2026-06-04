import { useEffect, useState } from 'react';
import {
  MessageSquare,
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
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Inquiry, InquiryStatus, InquiryCategory, Priority } from '@/types/operator';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1ModalHeader,
  V1ModalBody,
  V1,
} from '@/components/ui/v1-components';

type ChipVariant = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'neutral';

const statusConfig: Record<InquiryStatus, { label: string; icon: any; variant: ChipVariant }> = {
  open: { label: '접수', icon: AlertCircle, variant: 'blue' },
  in_progress: { label: '처리중', icon: Clock, variant: 'amber' },
  waiting: { label: '대기', icon: Clock, variant: 'neutral' },
  resolved: { label: '해결', icon: CheckCircle, variant: 'emerald' },
  closed: { label: '종료', icon: CheckCircle, variant: 'neutral' },
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

const priorityConfig: Record<Priority, { label: string; variant: ChipVariant }> = {
  low: { label: '낮음', variant: 'neutral' },
  normal: { label: '보통', variant: 'blue' },
  high: { label: '높음', variant: 'amber' },
  urgent: { label: '긴급', variant: 'red' },
};

export function InquiryManagement() {
  const { toast } = useToast();
  const inquiries = useOperatorStore((s) => s.inquiries);
  const inquiriesTotal = useOperatorStore((s) => s.inquiriesTotal);
  const fetchInquiries = useOperatorStore((s) => s.fetchInquiries);
  const currentInquiryReplies = useOperatorStore((s) => s.currentInquiryReplies);
  const fetchInquiryReplies = useOperatorStore((s) => s.fetchInquiryReplies);
  const updateInquiry = useOperatorStore((s) => s.updateInquiry);
  const createInquiryReply = useOperatorStore((s) => s.createInquiryReply);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

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
        <V1PageHeader
          eyebrow={`총 ${inquiriesTotal.toLocaleString()}건 문의`}
          title="문의 관리"
          sub="고객 문의를 확인하고 답변합니다."
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
                    <SelectItem value="open">접수</SelectItem>
                    <SelectItem value="in_progress">처리중</SelectItem>
                    <SelectItem value="waiting">대기</SelectItem>
                    <SelectItem value="resolved">해결</SelectItem>
                    <SelectItem value="closed">종료</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-36 rounded-[10px]">
                    <SelectValue placeholder="분류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 분류</SelectItem>
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
              <span className="text-sm text-muted-foreground">
                총 {inquiriesTotal.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">문의자</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">분류</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">제목</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">우선순위</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">상태</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">접수일</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">로딩 중...</td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      문의가 없습니다.
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inquiry) => {
                    const status = statusConfig[inquiry.status];
                    const StatusIcon = status.icon;
                    const priority = priorityConfig[inquiry.priority];

                    return (
                      <tr
                        key={inquiry.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => openDetailDialog(inquiry)}
                      >
                        <td className="px-5 py-3">
                          <div>
                            <p className="font-medium text-foreground text-sm">{inquiry.name}</p>
                            <p className="text-xs text-muted-foreground">{inquiry.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground">
                          {categoryLabels[inquiry.category]}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-foreground truncate max-w-xs">
                            {inquiry.subject}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <V1Chip variant={priority.variant}>{priority.label}</V1Chip>
                        </td>
                        <td className="px-5 py-3">
                          <V1Chip variant={status.variant} icon={StatusIcon}>{status.label}</V1Chip>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="rounded-lg">
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
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * limit + 1} - {Math.min(page * limit, inquiriesTotal)} / {inquiriesTotal}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <V1ModalHeader
            icon={MessageSquare}
            iconColor={V1.blue}
            title="문의 상세"
            sub={selectedInquiry ? `${categoryLabels[selectedInquiry.category]} · ${new Date(selectedInquiry.createdAt).toLocaleString('ko-KR')}` : ''}
          />

          {selectedInquiry && (
            <V1ModalBody className="flex-1 overflow-y-auto">
              {/* Inquiry Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedInquiry.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedInquiry.email}</span>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedInquiry.phone}</span>
                  </div>
                )}
                {selectedInquiry.companyName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedInquiry.companyName}</span>
                  </div>
                )}
              </div>

              {/* Subject & Content */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {selectedInquiry.subject}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedInquiry.content}
                </p>
                {selectedInquiry.attachments && selectedInquiry.attachments.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Paperclip className="w-4 h-4" />
                    첨부파일 {selectedInquiry.attachments.length}개
                  </div>
                )}
              </div>

              {/* Replies */}
              <div className="border-t border-border/50 pt-4">
                <h4 className="font-medium text-foreground mb-3">
                  답변 ({currentInquiryReplies.length})
                </h4>
                {currentInquiryReplies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">아직 답변이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {currentInquiryReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          'p-3 rounded-xl border',
                          reply.isInternal
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {reply.isInternal && <Lock className="w-3 h-3 text-amber-600" />}
                          <span className="text-sm font-medium text-foreground">
                            {reply.operatorName || '운영자'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reply.createdAt).toLocaleString('ko-KR')}
                          </span>
                          {reply.isInternal && (
                            <V1Chip variant="amber">내부 메모</V1Chip>
                          )}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              {selectedInquiry.status !== 'closed' && (
                <div className="border-t border-border/50 pt-4">
                  <div className="space-y-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      rows={3}
                      className="rounded-[10px]"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isInternalReply}
                          onCheckedChange={setIsInternalReply}
                        />
                        <Label className="text-sm text-muted-foreground">
                          내부 메모 (사용자에게 표시되지 않음)
                        </Label>
                      </div>
                      <Button onClick={handleSendReply} disabled={isSending} className="rounded-[10px]">
                        <Send className="w-4 h-4 mr-2" />
                        {isSending ? '전송 중...' : '전송'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </V1ModalBody>
          )}

          <DialogFooter className="px-6 py-3.5 border-t border-border/50 bg-muted">
            {selectedInquiry && selectedInquiry.status !== 'closed' && (
              <Select
                value={selectedInquiry.status}
                onValueChange={(v) => handleStatusChange(selectedInquiry, v as InquiryStatus)}
              >
                <SelectTrigger className="w-32 rounded-[10px]">
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
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="rounded-[10px]">닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
