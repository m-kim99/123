import { useEffect, useState } from 'react';
import {
  Megaphone,
  Plus,
  MoreVertical,
  Pin,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
  Wrench,
  Sparkles,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { useOperatorStore } from '@/store/operatorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { SystemNotice, SystemNoticeType, NoticeTargetAudience, NoticeDisplayLocation } from '@/types/operator';
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

const typeConfig: Record<SystemNoticeType, { label: string; icon: any; variant: ChipVariant; color: string }> = {
  info: { label: '안내', icon: Info, variant: 'blue', color: V1.blue },
  warning: { label: '주의', icon: AlertTriangle, variant: 'amber', color: V1.amber },
  maintenance: { label: '점검', icon: Wrench, variant: 'amber', color: V1.amber },
  update: { label: '업데이트', icon: Sparkles, variant: 'violet', color: V1.violet },
};

const audienceLabels: Record<NoticeTargetAudience, string> = {
  all: '전체',
  admin: '관리자만',
  team: '팀원만',
};

const locationLabels: Record<NoticeDisplayLocation, string> = {
  dashboard: '대시보드',
  login: '로그인 페이지',
  both: '대시보드 + 로그인',
  popup: '팝업',
};

export function SystemNotices() {
  const { toast } = useToast();
  const notices = useOperatorStore((s) => s.notices);
  const fetchNotices = useOperatorStore((s) => s.fetchNotices);
  const createNotice = useOperatorStore((s) => s.createNotice);
  const updateNotice = useOperatorStore((s) => s.updateNotice);
  const deleteNotice = useOperatorStore((s) => s.deleteNotice);

  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<SystemNotice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as SystemNoticeType,
    targetAudience: 'all' as NoticeTargetAudience,
    displayLocation: 'dashboard' as NoticeDisplayLocation,
    isPinned: false,
    isActive: true,
    expiresAt: '',
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNotice, setDeletingNotice] = useState<SystemNotice | null>(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    setIsLoading(true);
    await fetchNotices();
    setIsLoading(false);
  };

  const openCreateDialog = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      targetAudience: 'all',
      displayLocation: 'dashboard',
      isPinned: false,
      isActive: true,
      expiresAt: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (notice: SystemNotice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      targetAudience: notice.targetAudience,
      displayLocation: notice.displayLocation,
      isPinned: notice.isPinned,
      isActive: notice.isActive,
      expiresAt: notice.expiresAt ? notice.expiresAt.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      targetAudience: formData.targetAudience,
      displayLocation: formData.displayLocation,
      isPinned: formData.isPinned,
      isActive: formData.isActive,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    };

    let result;
    if (editingNotice) {
      result = await updateNotice(editingNotice.id, data);
    } else {
      result = await createNotice(data);
    }

    if (result.success) {
      toast({
        title: editingNotice ? '수정 완료' : '작성 완료',
        description: editingNotice ? '공지가 수정되었습니다.' : '새 공지가 등록되었습니다.',
      });
      setDialogOpen(false);
    } else {
      toast({
        title: '저장 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (notice: SystemNotice) => {
    const result = await updateNotice(notice.id, { isActive: !notice.isActive });
    if (result.success) {
      toast({ title: notice.isActive ? '비활성화됨' : '활성화됨' });
    }
  };

  const handleTogglePinned = async (notice: SystemNotice) => {
    const result = await updateNotice(notice.id, { isPinned: !notice.isPinned });
    if (result.success) {
      toast({ title: notice.isPinned ? '고정 해제됨' : '상단 고정됨' });
    }
  };

  const handleDelete = async () => {
    if (!deletingNotice) return;

    const result = await deleteNotice(deletingNotice.id);
    if (result.success) {
      toast({ title: '삭제 완료', description: '공지가 삭제되었습니다.' });
      setDeleteDialogOpen(false);
      setDeletingNotice(null);
    } else {
      toast({ title: '삭제 실패', description: result.error, variant: 'destructive' });
    }
  };

  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeCount = notices.filter((n) => n.isActive).length;

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${notices.length}개 · 게시중 ${activeCount}개`}
          title="시스템 공지"
          sub="전체 사용자에게 표시되는 시스템 공지를 관리합니다."
          right={
            <button
              onClick={openCreateDialog}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              새 공지
            </button>
          }
        />

        {/* Notice List */}
        <div className={v1Card}>
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                로딩 중...
              </div>
            ) : sortedNotices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>등록된 공지가 없습니다.</p>
              </div>
            ) : (
              sortedNotices.map((notice) => {
                const type = typeConfig[notice.type];
                const TypeIcon = type.icon;

                return (
                  <div
                    key={notice.id}
                    className={cn(
                      'p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                      !notice.isActive && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: `${type.color}15` }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: type.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {notice.isPinned && (
                            <Pin className="w-4 h-4 text-amber-500" />
                          )}
                          <h3 className="font-semibold text-foreground">
                            {notice.title}
                          </h3>
                          <V1Chip variant={type.variant}>{type.label}</V1Chip>
                          {!notice.isActive && (
                            <V1Chip variant="neutral">비활성</V1Chip>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notice.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span>{audienceLabels[notice.targetAudience]}</span>
                          <span>·</span>
                          <span>{locationLabels[notice.displayLocation]}</span>
                          <span>·</span>
                          <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
                          {notice.expiresAt && (
                            <>
                              <span>·</span>
                              <span>만료: {new Date(notice.expiresAt).toLocaleDateString('ko-KR')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(notice)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePinned(notice)}>
                            <Pin className="w-4 h-4 mr-2" />
                            {notice.isPinned ? '고정 해제' : '상단 고정'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(notice)}>
                            {notice.isActive ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                비활성화
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                활성화
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => { setDeletingNotice(notice); setDeleteDialogOpen(true); }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-0 gap-0">
          <V1ModalHeader
            icon={Megaphone}
            iconColor={V1.violet}
            title={editingNotice ? '공지 수정' : '새 공지 작성'}
            sub={editingNotice ? '공지 내용을 수정합니다.' : '새로운 시스템 공지를 작성합니다.'}
          />
          <V1ModalBody>
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="공지 제목"
                className="rounded-[10px]"
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="공지 내용을 입력하세요..."
                rows={4}
                className="rounded-[10px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as SystemNoticeType })}
                >
                  <SelectTrigger className="rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">안내</SelectItem>
                    <SelectItem value="warning">주의</SelectItem>
                    <SelectItem value="maintenance">점검</SelectItem>
                    <SelectItem value="update">업데이트</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>대상</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(v) => setFormData({ ...formData, targetAudience: v as NoticeTargetAudience })}
                >
                  <SelectTrigger className="rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="admin">관리자만</SelectItem>
                    <SelectItem value="team">팀원만</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>표시 위치</Label>
                <Select
                  value={formData.displayLocation}
                  onValueChange={(v) => setFormData({ ...formData, displayLocation: v as NoticeDisplayLocation })}
                >
                  <SelectTrigger className="rounded-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">대시보드</SelectItem>
                    <SelectItem value="login">로그인 페이지</SelectItem>
                    <SelectItem value="both">대시보드 + 로그인</SelectItem>
                    <SelectItem value="popup">팝업</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>만료일 (선택)</Label>
                <Input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="rounded-[10px]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isPinned}
                  onCheckedChange={(v) => setFormData({ ...formData, isPinned: v })}
                />
                <Label className="text-sm">상단 고정</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label className="text-sm">활성화</Label>
              </div>
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-[10px]">취소</Button>
            <Button onClick={handleSubmit} className="rounded-[10px]">{editingNotice ? '수정' : '등록'}</Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingNotice?.title}" 공지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-[10px]">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperatorLayout>
  );
}
