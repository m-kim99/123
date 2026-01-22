import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: NotificationSettingsDialogProps) {
  const user = useAuthStore((state) => state.user);
  const { preferences, isLoadingPreferences, fetchPreferences, updatePreferences, fetchNotifications } =
    useNotificationStore();

  useEffect(() => {
    if (open) {
      fetchPreferences();
    }
  }, [open, fetchPreferences]);

  const handleToggle = async (key: keyof typeof preferences, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
      await fetchNotifications();
      toast({
        title: '알림 설정이 저장되었습니다',
      });
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '알림 설정을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>알림 설정</DialogTitle>
          <DialogDescription>
            받고 싶은 알림 유형을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreferences ? (
          <div className="py-8 text-center text-slate-500">불러오는 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 섹션 1: 문서 활동 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">문서 활동</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_created" className="text-sm text-slate-700">
                    문서 등록 알림
                  </Label>
                  <Switch
                    id="document_created"
                    checked={preferences.document_created}
                    onCheckedChange={(checked) => handleToggle('document_created', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_deleted" className="text-sm text-slate-700">
                    문서 삭제 알림
                  </Label>
                  <Switch
                    id="document_deleted"
                    checked={preferences.document_deleted}
                    onCheckedChange={(checked) => handleToggle('document_deleted', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_shared" className="text-sm text-slate-700">
                    문서 공유 알림
                  </Label>
                  <Switch
                    id="document_shared"
                    checked={preferences.document_shared}
                    onCheckedChange={(checked) => handleToggle('document_shared', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 섹션 2: 카테고리 변경 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">카테고리 변경</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="category_changes" className="text-sm text-slate-700">
                      카테고리 생성/삭제 알림
                    </Label>
                    <p className="text-xs text-slate-500">
                      대분류 및 세부 카테고리의 추가/삭제 시 알림
                    </p>
                  </div>
                  <Switch
                    id="category_changes"
                    checked={preferences.category_changes}
                    onCheckedChange={(checked) => handleToggle('category_changes', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 섹션 3: 만료 관리 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">만료 관리</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiry_alerts" className="text-sm text-slate-700">
                      만료 알림
                    </Label>
                    <p className="text-xs text-slate-500">
                      세부 카테고리 만료 예정 및 만료 알림 (7일/30일 전)
                    </p>
                  </div>
                  <Switch
                    id="expiry_alerts"
                    checked={preferences.expiry_alerts}
                    onCheckedChange={(checked) => handleToggle('expiry_alerts', checked)}
                  />
                </div>
              </div>
            </div>

            {/* 섹션 4: 알림 범위 (관리자만) */}
            {isAdmin && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900">알림 범위</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="notify_my_department_only"
                          className="text-sm text-slate-700"
                        >
                          내 부서 알림만 받기
                        </Label>
                        <p className="text-xs text-slate-500">
                          활성화 시 내가 소속된 부서의 알림만 표시
                        </p>
                      </div>
                      <Switch
                        id="notify_my_department_only"
                        checked={preferences.notify_my_department_only}
                        onCheckedChange={(checked) =>
                          handleToggle('notify_my_department_only', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
