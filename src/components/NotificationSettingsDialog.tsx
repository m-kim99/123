import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { V1ModalHeader, V1ModalBody, V1Chip } from '@/components/ui/v1-components';
import { FileText, FolderOpen, Clock, Users, Bell } from 'lucide-react';
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
      <DialogContent variant="v1" className="max-w-md flex flex-col max-h-[85vh]" hideClose>
        <V1ModalHeader icon={Bell} title={t('notificationSettings.title')} sub={t('notificationSettings.description')} />

        {isLoadingPreferences ? (
          <div className="py-8 text-center text-sm text-slate-400">{t('common.loading')}</div>
        ) : (
          <V1ModalBody className="flex-1 overflow-y-auto">
            <div className="space-y-5">
              {/* 섹션 1: 문서 활동 */}
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
                  <FileText className="h-3 w-3 text-[#1e40af]" />
                  {t('notificationSettings.documentActivity')}
                </p>
                <div>
                  <div className="flex items-start justify-between gap-3 py-2.5 border-t border-slate-50 dark:border-white/[0.06] first:border-t-0">
                    <Label htmlFor="document_created" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {t('notificationSettings.docCreated')}
                    </Label>
                    <Switch
                      id="document_created"
                      checked={preferences.document_created}
                      onCheckedChange={(checked) => handleToggle('document_created', checked)}
                      className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 py-2.5 border-t border-slate-50 dark:border-white/[0.06]">
                    <Label htmlFor="document_deleted" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {t('notificationSettings.docDeleted')}
                    </Label>
                    <Switch
                      id="document_deleted"
                      checked={preferences.document_deleted}
                      onCheckedChange={(checked) => handleToggle('document_deleted', checked)}
                      className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 py-2.5 border-t border-slate-50 dark:border-white/[0.06]">
                    <Label htmlFor="document_shared" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {t('notificationSettings.docShared')}
                    </Label>
                    <Switch
                      id="document_shared"
                      checked={preferences.document_shared}
                      onCheckedChange={(checked) => handleToggle('document_shared', checked)}
                      className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/[0.06] my-0.5" />

              {/* 섹션 2: 카테고리 변경 */}
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
                  <FolderOpen className="h-3 w-3 text-[#1e40af]" />
                  {t('notificationSettings.categoryChanges')}
                </p>
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <Label htmlFor="category_changes" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {t('notificationSettings.categoryCreateDelete')}
                    </Label>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {t('notificationSettings.categoryCreateDeleteDesc')}
                    </p>
                  </div>
                  <Switch
                    id="category_changes"
                    checked={preferences.category_changes}
                    onCheckedChange={(checked) => handleToggle('category_changes', checked)}
                    className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                  />
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-white/[0.06] my-0.5" />

              {/* 섹션 3: 만료 관리 */}
              <div>
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
                  <Clock className="h-3 w-3 text-[#1e40af]" />
                  {t('notificationSettings.expiryManagement')}
                </p>
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <Label htmlFor="expiry_alerts" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      {t('notificationSettings.expiryAlerts')}
                    </Label>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {t('notificationSettings.expiryAlertsDesc')}
                    </p>
                  </div>
                  <Switch
                    id="expiry_alerts"
                    checked={preferences.expiry_alerts}
                    onCheckedChange={(checked) => handleToggle('expiry_alerts', checked)}
                    className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                  />
                </div>
              </div>

              {/* 섹션 4: 알림 범위 (관리자만) */}
              {isAdmin && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-white/[0.06] my-0.5" />
                  <div>
                    <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2.5">
                      <Users className="h-3 w-3 text-[#1e40af]" />
                      {t('notificationSettings.notificationScope')}
                      <V1Chip variant="amber" className="ml-1 text-[9px] px-1.5 py-0">{t('common.admin', { defaultValue: '관리자' })}</V1Chip>
                    </p>
                    <div className="flex items-start justify-between gap-3 py-2.5">
                      <div>
                        <Label
                          htmlFor="notify_my_department_only"
                          className="text-[13px] font-medium text-slate-700 dark:text-slate-300"
                        >
                          {t('notificationSettings.myDeptOnly')}
                        </Label>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {t('notificationSettings.myDeptOnlyDesc')}
                        </p>
                      </div>
                      <Switch
                        id="notify_my_department_only"
                        checked={preferences.notify_my_department_only}
                        onCheckedChange={(checked) =>
                          handleToggle('notify_my_department_only', checked)
                        }
                        className="mt-0.5 data-[state=checked]:bg-[#1e40af]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </V1ModalBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
