import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { V1Chip, v1Card } from '@/components/ui/v1-components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { requestBillingAuth } from '@/lib/payments';
import { toast } from '@/hooks/use-toast';
import { Users, Shield, Edit, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { BackButton } from '@/components/BackButton';
import { checkMemberLimit } from '@/lib/subscription';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team';
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface UserPermission {
  id?: string;
  user_id: string;
  department_id: string;
  role: 'none' | 'viewer' | 'editor' | 'manager';
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user: authUser } = useAuthStore();
  const [memberLimit, setMemberLimit] = useState<{ current: number; limit: number | null } | null>(null);

  // 플랜 업그레이드(인원 추가) 다이얼로그
  const PRICE_PER_MEMBER = 3300;
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [additionalMembers, setAdditionalMembers] = useState('1');
  const parsedMembers = Math.max(0, parseInt(additionalMembers, 10) || 0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);

  // 토스페이먼츠 정기결제용 카드 등록창 호출
  const handleSubscribe = async () => {
    if (!authUser || parsedMembers < 1 || !agreedToTerms) return;
    setIsRequestingPayment(true);
    try {
      await requestBillingAuth({
        customerKey: authUser.id,
        customerEmail: authUser.email,
        customerName: authUser.name,
        memberCount: parsedMembers,
        amount: parsedMembers * PRICE_PER_MEMBER,
      });
    } catch (error) {
      // 사용자가 결제창을 닫은 경우 등
      console.error('빌링 카드 등록 요청 실패:', error);
      toast({
        title: t('subscription.paymentRequestFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRequestingPayment(false);
    }
  };

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // 페이지네이션 계산
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return users.slice(startIndex, endIndex);
  }, [users, currentPage]);

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, users.length);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchMemberLimit();
  }, []);

  const fetchMemberLimit = async () => {
    if (!authUser?.companyId) return;
    const result = await checkMemberLimit(authUser.companyId);
    setMemberLimit({ current: result.current, limit: result.limit });
  };

  const fetchUsers = async () => {
    if (!authUser?.companyId) {
      setUsers([]);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', authUser.companyId)
      .order('name');

    if (error) {
      console.error('사용자 로드 실패:', error);
      return;
    }

    setUsers(data || []);
  };

  const fetchDepartments = async () => {
    if (!authUser?.companyId) {
      setDepartments([]);
      return;
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', authUser.companyId)
      .order('name');

    if (error) {
      console.error('부서 로드 실패:', error);
      return;
    }

    setDepartments(data || []);
  };

  const handleEditPermissions = async (user: User) => {
    setSelectedUser(user);

    const { data: existingPermissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id);

    const allPermissions: UserPermission[] = departments.map((dept) => {
      const existing = existingPermissions?.find(
        (p: UserPermission) => p.department_id === dept.id
      );

      // 기본값: 소속 부서는 viewer, 나머지는 none
      const defaultRole = dept.id === user.department_id ? 'viewer' : 'none';

      return (
        existing || {
          user_id: user.id,
          department_id: dept.id,
          role: defaultRole,
          company_id: authUser?.companyId || null,
        }
      );
    });

    setPermissions(allPermissions);
    setEditDialogOpen(true);
  };

  const handleRoleChange = (departmentId: string, newRole: string) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.department_id === departmentId
          ? { ...p, role: newRole as 'none' | 'viewer' | 'editor' | 'manager' }
          : p
      )
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setIsSaving(true);

    try {
      // 1. 기존 권한 삭제
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      // 2. none이 아닌 권한만 삽입
      const permissionsToInsert = permissions
        .filter((p) => p.role !== 'none')
        .map(({ id, created_at, updated_at, ...rest }) => rest);

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: t('userMgmt.permSaved'),
        description: t('userMgmt.permSavedDesc', { name: selectedUser.name }),
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('권한 저장 실패:', error);
      toast({
        title: t('userMgmt.permSaveFailed'),
        description: t('userMgmt.permSaveFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return '-';
    return departments.find((d) => d.id === departmentId)?.name || '-';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{t('userMgmt.title')}</h1>
            <p className="text-sm text-slate-500 mt-1.5">{t('userMgmt.subtitle')}</p>
          </div>
          {memberLimit && memberLimit.limit !== null && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">{t('subscription.members')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${
                  memberLimit.current >= memberLimit.limit ? 'text-red-600' :
                  memberLimit.current >= memberLimit.limit * 0.8 ? 'text-amber-600' : 'text-[#2563eb]'
                }`}>
                  {memberLimit.current}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-lg font-semibold text-slate-700">{memberLimit.limit}</span>
              </div>
              {memberLimit.current >= memberLimit.limit && (
                <Badge
                  variant="destructive"
                  className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setUpgradeDialogOpen(true)}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  {t('subscription.upgrade')}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedUsers.map((member) => (
            <div key={member.id} className={v1Card}>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">{member.name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{member.email}</p>
                    </div>
                  </div>
                  {member.role === 'admin' ? (
                    <V1Chip variant="amber">
                      <Shield className="h-3 w-3" />
                      {t('common.admin')}
                    </V1Chip>
                  ) : (
                    <V1Chip variant="blue">{t('common.team')}</V1Chip>
                  )}
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t('userMgmt.company')}</span>
                    <span className="font-medium text-slate-900 truncate ml-2">
                      {authUser?.companyCode
                        ? authUser.companyName
                          ? `${authUser.companyCode} (${authUser.companyName})`
                          : authUser.companyCode
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t('userMgmt.department')}</span>
                    <span className="font-medium text-slate-900">{getDepartmentName(member.department_id)}</span>
                  </div>
                </div>

                {member.role === 'team' && (
                  <Button
                    variant="outline"
                    className="w-full mt-4 rounded-[10px] h-9 text-[13px]"
                    onClick={() => handleEditPermissions(member)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('userMgmt.editPermissions')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {users.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-slate-500">
              {startItem}-{endItem} / {t('parentCatList.totalItems', { count: users.length })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                {t('common.previous')}
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('userMgmt.permDialogTitle', { name: selectedUser?.name })}</DialogTitle>
              <DialogDescription>{t('userMgmt.permDialogDesc')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {departments.map((dept) => {
                const perm = permissions.find((p) => p.department_id === dept.id);
                if (!perm) return null;

                return (
                  <Card key={dept.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        {dept.id === selectedUser?.department_id && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {t('userMgmt.ownDept')}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Label className="text-sm text-slate-600 sm:min-w-[60px]">
                          {t('userMgmt.accessRole')}
                        </Label>
                        <Select
                          value={perm.role}
                          onValueChange={(value) => handleRoleChange(dept.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600">●</span>
                                <span>{t('userMgmt.roleNone')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <span className="text-[#2563eb]">●</span>
                                <span>{t('userMgmt.roleViewer')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">●</span>
                                <span>{t('userMgmt.roleEditor')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600">●</span>
                                <span>{t('userMgmt.roleManager')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-slate-500">
                          {perm.role === 'none' && t('userMgmt.descNone')}
                          {perm.role === 'viewer' && t('userMgmt.descViewer')}
                          {perm.role === 'editor' && t('userMgmt.descEditor')}
                          {perm.role === 'manager' && t('userMgmt.descManager')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-[10px] h-9"
                onClick={() => setEditDialogOpen(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="rounded-[10px] h-9 "
              >
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 플랜 업그레이드 — 인원 추가 다이얼로그 */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {t('subscription.upgrade')}
              </DialogTitle>
              <DialogDescription>{t('subscription.addMembersDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="additional-members">{t('subscription.memberCountLabel')}</Label>
                <Input
                  id="additional-members"
                  type="number"
                  min={1}
                  value={additionalMembers}
                  onChange={(e) => setAdditionalMembers(e.target.value)}
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t('subscription.productLabel')}</span>
                  <span className="font-medium">{t('subscription.productName')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t('subscription.unitPrice')}</span>
                  <span className="font-medium">₩3,300{t('subscription.perPersonMonth')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{t('subscription.paymentMethod')}</span>
                  <span className="font-medium">{t('subscription.creditCard')}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-slate-700">{t('subscription.monthlyTotal')}</span>
                  <span className="text-xl font-bold text-[#2563eb]">
                    ₩{(parsedMembers * PRICE_PER_MEMBER).toLocaleString()}
                    <span className="text-sm font-normal text-slate-500">{t('subscription.perMonth')}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree-terms" className="text-sm text-slate-700 leading-snug cursor-pointer">
                  {t('subscription.agreeTerms')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-[10px] h-9"
                onClick={() => setUpgradeDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="rounded-[10px] h-9"
                disabled={parsedMembers < 1 || !agreedToTerms || isRequestingPayment}
                onClick={handleSubscribe}
              >
                {isRequestingPayment ? t('common.loading') : t('subscription.pay')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
