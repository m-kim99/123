import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Users, Shield, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';

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
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user: authUser } = useAuthStore();

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

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
        title: '권한 저장 완료',
        description: `${selectedUser.name}의 권한이 업데이트되었습니다.`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('권한 저장 실패:', error);
      toast({
        title: '권한 저장 실패',
        description: '권한을 저장하는 중 오류가 발생했습니다.',
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">팀원 관리</h1>
          <p className="text-slate-500 mt-1">팀원별 부서 접근 권한을 관리합니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {member.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{member.email}</CardDescription>
                  </div>
                  {member.role === 'admin' && (
                    <Badge variant="outline" className="bg-orange-50">
                      <Shield className="h-3 w-3 mr-1" />
                      관리자
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">소속 회사</span>
                    <span className="font-medium">
                      {authUser?.companyCode
                        ? authUser.companyName
                          ? `${authUser.companyCode} (${authUser.companyName})`
                          : authUser.companyCode
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">소속 부서</span>
                    <span className="font-medium">{getDepartmentName(member.department_id)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">역할</span>
                    <span className="font-medium">{member.role === 'admin' ? '관리자' : '팀원'}</span>
                  </div>
                </div>

                {member.role === 'team' && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleEditPermissions(member)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    권한 편집
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedUser?.name} 권한 설정</DialogTitle>
              <DialogDescription>각 부서별 접근 권한을 설정합니다</DialogDescription>
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
                            소속 부서
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Label className="text-sm text-slate-600 min-w-[60px]">
                          접근 권한
                        </Label>
                        <Select
                          value={perm.role}
                          onValueChange={(value) => handleRoleChange(dept.id, value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <span className="text-red-600">●</span>
                                <span>접근 불가</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600">●</span>
                                <span>뷰어</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="editor">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600">●</span>
                                <span>편집자</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="manager">
                              <div className="flex items-center gap-2">
                                <span className="text-orange-600">●</span>
                                <span>관리자</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-slate-500">
                          {perm.role === 'none' && '• 접근 불가'}
                          {perm.role === 'viewer' && '• 읽기, 다운로드, 출력'}
                          {perm.role === 'editor' && '• 뷰어 + 업로드, 수정'}
                          {perm.role === 'manager' && '• 편집자 + 삭제, 공유, NFC'}
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
                onClick={() => setEditDialogOpen(false)}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
