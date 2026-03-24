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
import { readNFCUid, setNfcMode } from '@/lib/nfc';
import { registerNFCTag } from '@/lib/nfcApi';
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
      await registerNFCTag({
        tagId: uid,
        categoryId,
      });

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
