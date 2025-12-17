import { useState } from 'react';
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
        title: 'NFC 태그 등록 완료',
        description: '태그와 카테고리가 성공적으로 연결되었습니다.',
      });

      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
      onOpenChange(false);
    } catch (err) {
      console.error('NFC 태그 등록 실패:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('NFC 태그 등록 중 오류가 발생했습니다.');
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
          <DialogTitle>NFC 태그 등록</DialogTitle>
          <DialogDescription>
            "{categoryName}" 카테고리를 NFC 태그에 등록하시겠어요?\n
            태그를 기기에 가까이 가져다 대면 자동으로 UID를 읽어 매핑합니다.
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
            나중에
          </Button>
          <Button
            type="button"
            onClick={handleRegister}
            disabled={isRegistering}
          >
            {isRegistering ? '태그 스캔 중...' : '태그 등록 시작'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
