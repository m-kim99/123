import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title: t('notificationSettings.saved'),
      });
    } catch (error) {
      toast({
        title: t('notificationSettings.saveFailed'),
        description: t('notificationSettings.saveFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('notificationSettings.title')}</DialogTitle>
          <DialogDescription>
            {t('notificationSettings.description')}
          </DialogDescription>
        </DialogHeader>

        {isLoadingPreferences ? (
          <div className="py-8 text-center text-slate-500">{t('common.loading')}</div>
        ) : (
          <div className="space-y-6">
            {/* 섹션 1: 문서 활동 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">{t('notificationSettings.documentActivity')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_created" className="text-sm text-slate-700">
                    {t('notificationSettings.docCreated')}
                  </Label>
                  <Switch
                    id="document_created"
                    checked={preferences.document_created}
                    onCheckedChange={(checked) => handleToggle('document_created', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_deleted" className="text-sm text-slate-700">
                    {t('notificationSettings.docDeleted')}
                  </Label>
                  <Switch
                    id="document_deleted"
                    checked={preferences.document_deleted}
                    onCheckedChange={(checked) => handleToggle('document_deleted', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="document_shared" className="text-sm text-slate-700">
                    {t('notificationSettings.docShared')}
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
              <h3 className="text-sm font-semibold text-slate-900">{t('notificationSettings.categoryChanges')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="category_changes" className="text-sm text-slate-700">
                      {t('notificationSettings.categoryCreateDelete')}
                    </Label>
                    <p className="text-xs text-slate-500">
                      {t('notificationSettings.categoryCreateDeleteDesc')}
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
              <h3 className="text-sm font-semibold text-slate-900">{t('notificationSettings.expiryManagement')}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="expiry_alerts" className="text-sm text-slate-700">
                      {t('notificationSettings.expiryAlerts')}
                    </Label>
                    <p className="text-xs text-slate-500">
                      {t('notificationSettings.expiryAlertsDesc')}
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
                  <h3 className="text-sm font-semibold text-slate-900">{t('notificationSettings.notificationScope')}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="notify_my_department_only"
                          className="text-sm text-slate-700"
                        >
                          {t('notificationSettings.myDeptOnly')}
                        </Label>
                        <p className="text-xs text-slate-500">
                          {t('notificationSettings.myDeptOnlyDesc')}
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
