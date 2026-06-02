import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { V1ModalHeader, V1ModalFooter } from '@/components/ui/v1-components';
import { Smartphone } from 'lucide-react';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { useDocumentStore } from '@/store/documentStore';
import { toast } from '@/hooks/use-toast';

interface NFCRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  // Mode A (full flow): 주어진 categoryId에 대해 다이어로그가 전체 등록 처리
  categoryId?: string;
  onSuccess?: () => void | Promise<void>;
  // Mode B (scan-only): UID만 읽어서 콜백으로 전달. 호출자가 후속 처리.
  // (새 세부 스토리지 생성 + NFC 등록 같은 복합 흐름용)
  onUidScanned?: (uid: string) => void | Promise<void>;
}

export function NFCRegistrationDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  onSuccess,
  onUidScanned,
}: NFCRegistrationDialogProps) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registerNfcTag, findSubcategoryByNfcUid, clearNfcByUid } = useDocumentStore();

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      setNfcMode('idle'); // 닫기 시 모드 초기화
    }
    onOpenChange(nextOpen);
  };

  const handleRegister = async () => {
    try {
      setIsRegistering(true);
      setError(null);

      const uid = await readNFCUid();

      // Mode B: scan-only — UID만 전달하고 종료
      if (onUidScanned) {
        setNfcMode('idle');
        onOpenChange(false);
        await onUidScanned(uid);
        return;
      }

      // Mode A: full flow — categoryId 필요
      if (!categoryId) {
        throw new Error('categoryId is required when onUidScanned is not provided');
      }

      // 이미 다른 서브카테고리에 등록된 UID인지 확인 후 해제
      const existing = await findSubcategoryByNfcUid(uid);
      if (existing && existing.id !== categoryId) {
        await clearNfcByUid(uid, categoryId);
      }

      // NFC 태그에 URL 쓰기
      await writeNFCUrl(categoryId, categoryName);

      // subcategories 테이블에 UID 등록
      await registerNfcTag(categoryId, uid);

      toast({
        title: t('nfc.registrationDone'),
        description: t('nfcRegDialog.tagLinked'),
      });

      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
      onOpenChange(false);
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error('NFC 태그 등록 실패:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('nfcRegDialog.registrationError'));
      }
      setNfcMode('idle'); // 에러 시 모드 초기화
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="v1" className="max-w-[420px]" hideClose>
        <V1ModalHeader icon={Smartphone} title={t('nfc.tagRegistration')} sub={t('nfcRegDialog.confirmRegister', { name: categoryName })} />

        {/* NFC Pulse Animation */}
        <div className="px-[22px] py-4 flex flex-col items-center gap-[18px]">
          <div className="relative w-[120px] h-[120px] flex items-center justify-center">
            <div className="absolute inset-3 rounded-full bg-[#2563eb]/[0.12]" style={{ animation: 'nfc-pulse 2s ease-out infinite' }} />
            <div className="absolute inset-7 rounded-full bg-[#2563eb]/[0.12]" style={{ animation: 'nfc-pulse 2s ease-out infinite 0.6s' }} />
            <div className="w-16 h-16 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(37,99,235,0.45)]">
              <Smartphone className="h-[30px] w-[30px] text-white" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t('nfc.bringTagClose', { defaultValue: '태그를 가까이 대주세요' })}</h3>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{t('nfcRegDialog.bringTagClose')}</p>
          </div>
          {/* Info box */}
          <div className="w-full bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-white/[0.08] rounded-[10px] p-3 flex flex-col gap-1.5 text-[12px]">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{t('common.categoryName', { defaultValue: '카테고리 이름' })}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{categoryName}</span>
            </div>
          </div>
        </div>

        {error && (
          <p className="px-[22px] -mt-2 text-[12px] text-red-500">{error}</p>
        )}

        <V1ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isRegistering}
          >
            {t('nfcRegDialog.later')}
          </Button>
          <Button
            type="button"
            onClick={handleRegister}
            disabled={isRegistering}
          >
            <Smartphone className="h-3.5 w-3.5 mr-1" />
            {isRegistering ? t('nfcRegDialog.scanningTag') : t('nfcRegDialog.startRegistration')}
          </Button>
        </V1ModalFooter>
      </DialogContent>
    </Dialog>
  );
}
