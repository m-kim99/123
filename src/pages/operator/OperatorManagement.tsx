import { useEffect, useState } from 'react';
import {
  MoreVertical,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Check,
  Ban,
  Info,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { useOperatorStore } from '@/store/operatorStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Operator, OperatorPermissions } from '@/types/operator';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1ModalHeader,
  V1ModalBody,
  V1ModalFooter,
  V1,
} from '@/components/ui/v1-components';

const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function getAvatarColor(id: string) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

const PERMISSION_LABELS: Record<keyof OperatorPermissions, string> = {
  members: '회원 관리',
  suspensions: '정지 관리',
  reports: '신고 처리',
  notices: '시스템 공지',
  inquiries: '문의 관리',
  companies: '회사 관리',
  operators: '운영자 관리',
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof OperatorPermissions)[];

const EMPTY_PERMISSIONS: OperatorPermissions = {
  members: false,
  suspensions: false,
  reports: false,
  notices: false,
  inquiries: false,
  companies: false,
  operators: false,
};

export function OperatorManagement() {
  const { toast } = useToast();
  const me = useOperatorStore((s) => s.operator);
  const operators = useOperatorStore((s) => s.operators);
  const fetchOperators = useOperatorStore((s) => s.fetchOperators);
  const updateOperatorPermissions = useOperatorStore((s) => s.updateOperatorPermissions);
  const setOperatorActive = useOperatorStore((s) => s.setOperatorActive);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editPermissions, setEditPermissions] = useState<OperatorPermissions>(EMPTY_PERMISSIONS);
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);

  const isSuper = !!me?.isSuper;
  const activeCount = operators.filter((o) => o.isActive).length;

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    setIsLoading(true);
    await fetchOperators();
    setIsLoading(false);
  };

  const openPermissionDialog = (op: Operator) => {
    setSelectedOperator(op);
    setEditPermissions({ ...EMPTY_PERMISSIONS, ...op.permissions });
    setPermissionDialogOpen(true);
  };

  const openActiveDialog = (op: Operator) => {
    setSelectedOperator(op);
    setActiveDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedOperator || isSubmitting) return;

    setIsSubmitting(true);
    const result = await updateOperatorPermissions(selectedOperator.id, editPermissions);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: '권한 변경 완료',
        description: `${selectedOperator.name}님의 권한이 변경되었습니다.`,
      });
      setPermissionDialogOpen(false);
    } else {
      toast({ title: '권한 변경 실패', description: result.error, variant: 'destructive' });
    }
  };

  const handleToggleActive = async () => {
    if (!selectedOperator || isSubmitting) return;

    const nextActive = !selectedOperator.isActive;
    setIsSubmitting(true);
    const result = await setOperatorActive(selectedOperator.id, nextActive);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: nextActive ? '계정 활성화 완료' : '계정 비활성화 완료',
        description: nextActive
          ? `${selectedOperator.name}님이 다시 로그인할 수 있습니다.`
          : `${selectedOperator.name}님의 운영자 콘솔 접근이 차단되었습니다.`,
      });
      setActiveDialogOpen(false);
    } else {
      toast({ title: '상태 변경 실패', description: result.error, variant: 'destructive' });
    }
  };

  const grantedLabels = (op: Operator) =>
    PERMISSION_KEYS.filter((k) => op.permissions?.[k]).map((k) => PERMISSION_LABELS[k]);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${operators.length.toLocaleString()}명 · 활성 ${activeCount.toLocaleString()}`}
          title="운영자 관리"
          sub="운영자 계정의 권한과 활성 상태를 관리합니다."
        />

        {/* 신규 추가 안내 */}
        <div className={cn(v1Card, 'p-4 flex items-start gap-3')}>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground">신규 운영자 추가는 Supabase에서 수행합니다.</p>
            <p className="mt-0.5">
              Authentication에서 사용자 생성 후, SQL Editor에서 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[12px]">operators</code> 테이블에
              해당 사용자 ID로 INSERT하면 이 목록에 나타납니다. 권한 부여와 비활성화는 이 화면에서 처리할 수 있습니다.
            </p>
          </div>
        </div>

        {!isSuper && (
          <div className={cn(v1Card, 'p-4 flex items-center gap-3')}>
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              권한 편집과 계정 상태 변경은 슈퍼 운영자만 가능합니다. 현재 읽기 전용으로 표시됩니다.
            </p>
          </div>
        )}

        {/* Table Card */}
        <div className={v1Card}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    운영자
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    최근 로그인
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    등록일
                  </th>
                  {isSuper && (
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      관리
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={isSuper ? 6 : 5} className="px-5 py-8 text-center text-muted-foreground">
                      로딩 중...
                    </td>
                  </tr>
                ) : operators.length === 0 ? (
                  <tr>
                    <td colSpan={isSuper ? 6 : 5} className="px-5 py-8 text-center text-muted-foreground">
                      등록된 운영자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => {
                    const granted = grantedLabels(op);

                    return (
                      <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                              getAvatarColor(op.id)
                            )}>
                              {op.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-foreground">{op.name}</p>
                                {op.id === me?.id && (
                                  <span className="text-[10px] text-muted-foreground">(나)</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{op.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {op.isSuper ? (
                            <V1Chip variant="amber" icon={Shield}>슈퍼 운영자 · 모든 권한</V1Chip>
                          ) : granted.length === 0 ? (
                            <span className="text-sm text-muted-foreground">권한 없음</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {granted.map((label) => (
                                <V1Chip key={label} variant="blue">{label}</V1Chip>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {op.isActive ? (
                            <V1Chip variant="emerald" icon={Check}>활성</V1Chip>
                          ) : (
                            <V1Chip variant="red" icon={Ban}>비활성</V1Chip>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {op.lastLoginAt
                            ? new Date(op.lastLoginAt).toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(op.createdAt).toLocaleDateString('ko-KR')}
                          </div>
                        </td>
                        {isSuper && (
                          <td className="px-5 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="rounded-lg">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openPermissionDialog(op)}
                                  disabled={op.isSuper}
                                >
                                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                                  권한 편집
                                </DropdownMenuItem>
                                {op.isActive ? (
                                  <DropdownMenuItem
                                    onClick={() => openActiveDialog(op)}
                                    disabled={op.id === me?.id}
                                    className="text-red-600"
                                  >
                                    <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                                    비활성화
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => openActiveDialog(op)}
                                    className="text-green-600"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                                    활성화
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 권한 편집 Dialog */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={KeyRound}
            iconColor={V1.blue}
            title="권한 편집"
            sub={`${selectedOperator?.name}(${selectedOperator?.email})님의 콘솔 접근 권한을 설정합니다.`}
          />
          <V1ModalBody>
            <div className="space-y-1">
              {PERMISSION_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div>
                    <Label htmlFor={`perm-${key}`} className="cursor-pointer">
                      {PERMISSION_LABELS[key]}
                    </Label>
                    {key === 'operators' && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        운영자 목록 열람 (편집은 슈퍼 운영자 전용)
                      </p>
                    )}
                  </div>
                  <Switch
                    id={`perm-${key}`}
                    checked={editPermissions[key]}
                    onCheckedChange={(checked) =>
                      setEditPermissions((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setPermissionDialogOpen(false)} disabled={isSubmitting} className="rounded-[10px]">
              취소
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSubmitting} className="rounded-[10px]">
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>

      {/* 활성/비활성 Dialog */}
      <Dialog open={activeDialogOpen} onOpenChange={setActiveDialogOpen}>
        <DialogContent className="p-0 gap-0">
          <V1ModalHeader
            icon={selectedOperator?.isActive ? ShieldOff : ShieldCheck}
            iconColor={selectedOperator?.isActive ? V1.red : V1.emerald}
            title={selectedOperator?.isActive ? '계정 비활성화' : '계정 활성화'}
            sub={
              selectedOperator?.isActive
                ? `${selectedOperator?.name}(${selectedOperator?.email})님의 운영자 콘솔 접근을 차단합니다.`
                : `${selectedOperator?.name}(${selectedOperator?.email})님이 다시 로그인할 수 있게 합니다.`
            }
          />
          <V1ModalBody>
            <p className="text-sm text-muted-foreground">
              {selectedOperator?.isActive
                ? '비활성화하면 즉시 운영자 로그인이 거부됩니다. 계정 기록과 활동 로그는 유지되며, 언제든 다시 활성화할 수 있습니다.'
                : '활성화하면 기존 권한 설정 그대로 운영자 콘솔에 접근할 수 있습니다.'}
            </p>
          </V1ModalBody>
          <V1ModalFooter>
            <Button variant="outline" onClick={() => setActiveDialogOpen(false)} disabled={isSubmitting} className="rounded-[10px]">
              취소
            </Button>
            <Button
              onClick={handleToggleActive}
              disabled={isSubmitting}
              variant={selectedOperator?.isActive ? 'destructive' : 'default'}
              className="rounded-[10px]"
            >
              {isSubmitting ? '처리 중...' : selectedOperator?.isActive ? '비활성화' : '활성화'}
            </Button>
          </V1ModalFooter>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
