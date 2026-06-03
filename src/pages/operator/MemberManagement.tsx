import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ShieldOff,
  ShieldCheck,
  MoreVertical,
  User,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ManagedUser } from '@/types/operator';

export function MemberManagement() {
  const { toast } = useToast();
  const users = useOperatorStore((s) => s.users);
  const usersTotal = useOperatorStore((s) => s.usersTotal);
  const fetchUsers = useOperatorStore((s) => s.fetchUsers);
  const suspendUser = useOperatorStore((s) => s.suspendUser);
  const fetchSuspensions = useOperatorStore((s) => s.fetchSuspensions);
  const suspensions = useOperatorStore((s) => s.suspensions);
  const liftSuspension = useOperatorStore((s) => s.liftSuspension);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  // 정지 다이얼로그
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState<string>('7d');
  const [suspendInternalNote, setSuspendInternalNote] = useState('');

  // 정지 해제 다이얼로그
  const [liftDialogOpen, setLiftDialogOpen] = useState(false);
  const [liftReason, setLiftReason] = useState('');

  // 정지 이력 다이얼로그
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

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

    // 현재 활성 정지 찾기
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">회원 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            전체 회원을 조회하고 관리합니다. (총 {usersTotal.toLocaleString()}명)
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="역할 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="team">팀원</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    회사
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      로딩 중...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.companyName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-700 dark:text-slate-300">
                              {user.companyName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                          )}
                        >
                          {user.role === 'admin' ? '관리자' : '팀원'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                            <ShieldOff className="w-3 h-3" />
                            정지됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <ShieldCheck className="w-3 h-3" />
                            정상
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
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
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {(page - 1) * limit + 1} - {Math.min(page * limit, usersTotal)} / {usersTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원 정지</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}({selectedUser?.email})님을 정지합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>정지 기간</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
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
              />
            </div>
            <div className="space-y-2">
              <Label>내부 메모 (운영자만 볼 수 있음)</Label>
              <Textarea
                value={suspendInternalNote}
                onChange={(e) => setSuspendInternalNote(e.target.value)}
                placeholder="내부 참고용 메모..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleSuspend}>
              정지하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lift Suspension Dialog */}
      <Dialog open={liftDialogOpen} onOpenChange={setLiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정지 해제</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}({selectedUser?.email})님의 정지를 해제합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>해제 사유</Label>
              <Textarea
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                placeholder="해제 사유를 입력하세요 (선택사항)..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiftDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleLift}>정지 해제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspension History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>정지 이력</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}({selectedUser?.email})님의 정지 이력입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-96 overflow-y-auto">
            {suspensions.length === 0 ? (
              <p className="text-center text-slate-500 py-8">정지 이력이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {suspensions.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      s.liftedAt
                        ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {s.reason}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
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
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          s.liftedAt
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {s.liftedAt ? '해제됨' : '활성'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
