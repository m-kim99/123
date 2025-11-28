import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Users, Shield, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  can_read: boolean;
  can_write: boolean;
  can_upload: boolean;
  can_delete: boolean;
  can_download: boolean;
  can_share: boolean;
  can_print: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) {
      console.error('사용자 로드 실패:', error);
      return;
    }

    setUsers(data || []);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
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

      return (
        existing || {
          user_id: user.id,
          department_id: dept.id,
          can_read: dept.id === user.department_id,
          can_write: dept.id === user.department_id,
          can_upload: dept.id === user.department_id,
          can_delete: false,
          can_download: true,
          can_share: false,
          can_print: true,
        }
      );
    });

    setPermissions(allPermissions);
    setEditDialogOpen(true);
  };

  const handlePermissionChange = (departmentId: string, permission: string, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.department_id === departmentId ? { ...p, [permission]: value } : p))
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setIsSaving(true);

    try {
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      const permissionsToInsert = permissions
        .filter((p) => p.can_read)
        .map(({ id, ...rest }) => rest);

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
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {user.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{user.email}</CardDescription>
                  </div>
                  {user.role === 'admin' && (
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
                    <span className="text-slate-500">소속 부서</span>
                    <span className="font-medium">{getDepartmentName(user.department_id)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">역할</span>
                    <span className="font-medium">{user.role === 'admin' ? '관리자' : '팀원'}</span>
                  </div>
                </div>

                {user.role === 'team' && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleEditPermissions(user)}
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
                    <CardHeader>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      {dept.id === selectedUser?.department_id && (
                        <Badge variant="outline" className="w-fit">
                          소속 부서
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-read`}
                            checked={perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_read', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-read`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            읽기
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-write`}
                            checked={perm.can_write}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_write', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-write`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            쓰기
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-upload`}
                            checked={perm.can_upload}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_upload', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-upload`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            업로드
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-delete`}
                            checked={perm.can_delete}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_delete', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-delete`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            삭제
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-download`}
                            checked={perm.can_download}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_download', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-download`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            다운로드
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-share`}
                            checked={perm.can_share}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_share', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-share`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            공유
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${dept.id}-print`}
                            checked={perm.can_print}
                            disabled={!perm.can_read}
                            className="border-2 border-black bg-transparent shadow-none data-[state=checked]:bg-transparent data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              handlePermissionChange(dept.id, 'can_print', Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`${dept.id}-print`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            인쇄
                          </Label>
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
