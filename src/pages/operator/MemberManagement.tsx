import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ShieldOff,
  ShieldCheck,
  MoreVertical,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Shield,
  Check,
  Ban,
  Download,
  UserCog,
  Crown,
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
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ManagedUser } from '@/types/operator';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1ModalHeader,
  V1ModalBody,
  V1ModalFooter,
  V1OutlineButton,
  V1,
} from '@/components/ui/v1-components';

const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function getAvatarColor(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

// 회사 구독 표시: 플랜 칩(무료/체험/유료/만료) + 종료일
function SubscriptionCell({ user }: { user: ManagedUser }) {
  if (!user.subscriptionStatus) {
    return <V1Chip variant="neutral">무료</V1Chip>;
  }

  const planLabel = user.planDisplayName || user.planName || '-';
  const endsAt = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt) : null;
  const isExpired = endsAt ? endsAt.getTime() < Date.now() : false;

  return (
    <div className="flex flex-col items-start gap-1">
      {isExpired ? (
        <V1Chip variant="red">{planLabel} · 만료</V1Chip>
      ) : user.subscriptionStatus === 'trialing' ? (
        <V1Chip variant="amber">{planLabel} · 체험</V1Chip>
      ) : (
        <V1Chip variant="blue" icon={Crown}>{planLabel}</V1Chip>
      )}
      {endsAt && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          ~ {endsAt.toLocaleDateString('ko-KR')}
        </span>
      )}
    </div>
  );
}

export function MemberManagement() {
  const { toast } = useToast();
  const operator = useOperatorStore((s) => s.operator);
  const users = useOperatorStore((s) => s.users);
  const usersTotal = useOperatorStore((s) => s.usersTotal);
  const fetchUsers = useOperatorStore((s) => s.fetchUsers);
  const suspendUser = useOperatorStore((s) => s.suspendUser);
  const fetchSuspensions = useOperatorStore((s) => s.fetchSuspensions);
  const suspensions = useOperatorStore((s) => s.suspensions);
  const liftSuspension = useOperatorStore((s) => s.liftSuspension);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState<string>('7d');
  const [suspendInternalNote, setSuspendInternalNote] = useState('');

  const [liftDialogOpen, setLiftDialogOpen] = useState(false);
  const [liftReason, setLiftReason] = useState('');

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const suspendedCount = users.filter((u) => u.isSuspended).length;
  const activeCount = usersTotal - suspendedCount;

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    await fetchUsers({
      search: search || undefined,
      role: roleFilter && roleFilter !== 'all' ? roleFilter : undefined,
      page,
      limit,
    });
    setIsLoading(false);
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleSuspend = async () => {
    if (!selectedUser || !suspendReason) {
      toast({
        title: '입력 오류',
        description: '정지 사유를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    let expiresAt: string | undefined;
    if (suspendDuration !== 'permanent') {
      const days = parseInt(suspendDuration.replace('d', ''));
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    const result = await suspendUser(
      selectedUser.id,
      suspendReason,
      expiresAt,
      suspendInternalNote || undefined
    );

    if (result.success) {
      toast({
        title: '정지 완료',
        description: `${selectedUser.name}님이 정지되었습니다.`,
      });
      setSuspendDialogOpen(false);
      resetSuspendForm();
      loadUsers();
    } else {
      toast({
        title: '정지 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleLift = async () => {
    if (!selectedUser) return;

    const activeSuspension = suspensions.find(
      (s) => s.userId === selectedUser.id && !s.liftedAt
    );

    if (!activeSuspension) {
      toast({
        title: '오류',
        description: '활성 정지를 찾을 수 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const result = await liftSuspension(activeSuspension.id, liftReason || '운영자 판단');

    if (result.success) {
      toast({
        title: '정지 해제 완료',
        description: `${selectedUser.name}님의 정지가 해제되었습니다.`,
      });
      setLiftDialogOpen(false);
      setLiftReason('');
      loadUsers();
    } else {
      toast({
        title: '정지 해제 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const openSuspendDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const openLiftDialog = async (user: ManagedUser) => {
    setSelectedUser(user);
    await fetchSuspensions(user.id);
    setLiftDialogOpen(true);
  };

  const openHistoryDialog = async (user: ManagedUser) => {
    setSelectedUser(user);
    await fetchSuspensions(user.id);
    setHistoryDialogOpen(true);
  };

  const resetSuspendForm = () => {
    setSelectedUser(null);
    setSuspendReason('');
    setSuspendDuration('7d');
    setSuspendInternalNote('');
  };

  const totalPages = Math.ceil(usersTotal / limit);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${usersTotal.toLocaleString()}명 · 활성 ${activeCount.toLocaleString()} · 정지 ${suspendedCount}`}
          title="회원"
          sub="가입 회원의 권한·상태를 확인하고 필요 시 조치합니다."
          right={
            <div className="flex items-center gap-2">
              <V1OutlineButton icon={Download}>CSV 내보내기</V1OutlineButton>
              {(operator?.isSuper || operator?.permissions?.operators) && (
                <Link
                  to="/operator/operators"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold rounded-[10px] bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  <UserCog className="w-4 h-4" />
                  운영자 관리
                </Link>
              )}
            </div>
          }
        />

        {/* Table Card */}
        <div className={v1Card}>
          {/* Filters inside card header */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 rounded-[10px]"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-36 rounded-[10px]">
                    <SelectValue placeholder="역할" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 역할</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                    <SelectItem value="team">팀원</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} className="rounded-[10px]">검색</Button>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                총 {usersTotal.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    회사
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    구독
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      로딩 중...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                            getAvatarColor(user.id)
                          )}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 max-w-[180px]">
                        {user.companyName ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-foreground truncate" title={user.companyName}>
                              {user.companyName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <SubscriptionCell user={user} />
                      </td>
                      <td className="px-5 py-3">
                        {user.role === 'admin' ? (
                          <V1Chip variant="blue" icon={Shield}>관리자</V1Chip>
                        ) : (
                          <V1Chip variant="neutral">팀원</V1Chip>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {user.isSuspended ? (
                          <V1Chip variant="red" icon={Ban}>정지됨</V1Chip>
                        ) : (
                          <V1Chip variant="emerald" icon={Check}>정상</V1Chip>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openHistoryDialog(user)}>
                              정지 이력 보기
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isSuspended ? (
                              <DropdownMenuItem
                                onClick={() => openLiftDialog(user)}
                                className="text-green-600"
                              >
                                정지 해제
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => openSuspendDialog(user)}
                                className="text-red-600"
                              >
                                회원 정지
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * limit + 1} - {Math.min(page * limit, usersTotal)} / {usersTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={ShieldOff}
            iconColor={V1.red}
            title="회원 정지"
            sub={`${selectedUser?.name}(${selectedUser?.email})님을 정지합니다.`}
          />
          <V1ModalBody>
            <div className="space-y-2">
              <Label>정지 기간</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1일</SelectItem>
                  <SelectItem value="3d">3일</SelectItem>
                  <SelectItem value="7d">7일</SelectItem>
                  <SelectItem value="14d">14일</SelectItem>
                  <SelectItem value="30d">30일</SelectItem>
                  <SelectItem value="permanent">영구 정지</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>정지 사유 (사용자에게 표시)</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="정지 사유를 입력하세요..."
                rows={3}
                className="rounded-[10px]"
              />
            </div>
            <div className="space-y-2">
              <Label>내부 메모 (운영자만 볼 수 있음)</Label>
              <Textarea
                value={suspendInternalNote}
                onChange={(e) => setSuspendInternalNote(e.target.value)}
                placeholder="내부 참고용 메모..."
                rows={2}
                className="rounded-[10px]"
              />
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="rounded-[10px]">
              취소
            </Button>
            <Button variant="destructive" onClick={handleSuspend} className="rounded-[10px]">
              정지하기
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Suspension Dialog */}
      <Dialog open={liftDialogOpen} onOpenChange={setLiftDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={ShieldCheck}
            iconColor={V1.emerald}
            title="정지 해제"
            sub={`${selectedUser?.name}(${selectedUser?.email})님의 정지를 해제합니다.`}
          />
          <V1ModalBody>
            <div className="space-y-2">
              <Label>해제 사유</Label>
              <Textarea
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                placeholder="해제 사유를 입력하세요 (선택사항)..."
                rows={3}
                className="rounded-[10px]"
              />
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setLiftDialogOpen(false)} className="rounded-[10px]">
              취소
            </Button>
            <Button onClick={handleLift} className="rounded-[10px]">정지 해제</Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* Suspension History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <V1ModalHeader
            icon={Shield}
            iconColor={V1.blue}
            title="정지 이력"
            sub={`${selectedUser?.name}(${selectedUser?.email})님의 정지 이력입니다.`}
          />
          <V1ModalBody className="max-h-96 overflow-y-auto">
            {suspensions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">정지 이력이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {suspensions.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'p-3 rounded-xl border',
                      s.liftedAt
                        ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{s.reason}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          정지일: {new Date(s.suspendedAt).toLocaleDateString('ko-KR')}
                          {s.expiresAt && (
                            <> · 만료일: {new Date(s.expiresAt).toLocaleDateString('ko-KR')}</>
                          )}
                          {!s.expiresAt && ' · 영구 정지'}
                        </p>
                        {s.liftedAt && (
                          <p className="text-sm text-green-600 mt-1">
                            해제일: {new Date(s.liftedAt).toLocaleDateString('ko-KR')}
                            {s.liftReason && ` (${s.liftReason})`}
                          </p>
                        )}
                      </div>
                      {s.liftedAt ? (
                        <V1Chip variant="neutral">해제됨</V1Chip>
                      ) : (
                        <V1Chip variant="red">활성</V1Chip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)} className="rounded-[10px]">
              닫기
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
