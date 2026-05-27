import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { useDocumentStore } from '@/store/documentStore';
import { toast } from '@/hooks/use-toast';

interface NFCRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
}

export function NFCRegistrationDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('nfc.tagRegistration')}</DialogTitle>
          <DialogDescription>
            {t('nfcRegDialog.confirmRegister', { name: categoryName })}\n
            {t('nfcRegDialog.bringTagClose')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        <DialogFooter className="mt-4">
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
            {isRegistering ? t('nfcRegDialog.scanningTag') : t('nfcRegDialog.startRegistration')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
