import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isNFCSupported, readNFCTag, type NFCTagData } from '@/lib/nfc';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function NFCReader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  // NFC 지원 여부 확인
  const nfcSupported = isNFCSupported();

  // NFC 미지원 시 버튼 숨김
  if (!nfcSupported) {
    return null;
  }

  const handleScan = async () => {
    if (!user) {
      setStatus('error');
      setStatusMessage(t('nfc.loginRequired'));
      return;
    }

    setIsScanning(true);
    setStatus('scanning');
    setStatusMessage(t('nfc.bringTagClose'));
    setErrorMessage('');
    setShowDialog(true);

    try {
      // NFC 태그 읽기
      const tagData: NFCTagData = await readNFCTag();

      console.log('NFC 태그 데이터 읽기 완료:', tagData);

      const isAdmin = user.role === 'admin';
      const basePath = isAdmin ? '/admin' : '/team';
      let path: string;

      // subcategoryId가 있는 경우 (writeNFCUrl로 기록된 세부 카테고리 태그)
      if (tagData.subcategoryId) {
        // DB에서 parent_category_id 조회
        const { data: subData, error: subError } = await supabase
          .from('subcategories')
          .select('parent_category_id')
          .eq('id', tagData.subcategoryId)
          .single();

        if (subError || !subData) {
          throw new Error(
            t('nfc.subcategoryNotFound', { id: tagData.subcategoryId })
          );
        }

        const parentCategoryId = (subData as any).parent_category_id;
        path = `${basePath}/parent-category/${parentCategoryId}/subcategory/${tagData.subcategoryId}`;

        setStatus('success');
        setStatusMessage(t('nfc.subcategoryFound'));
      } else {
        // categoryCode/categoryName으로 카테고리 찾기 (레거시 JSON 태그)
        let categoryId: string | null = null;

        // 1. categoryCode로 먼저 찾기
        if (tagData.categoryCode) {
          const { data: categoryByCode, error: codeError } = await supabase
            .from('categories')
            .select('id')
            .eq('code', tagData.categoryCode)
            .single();

          if (!codeError && categoryByCode?.id) {
            categoryId = categoryByCode.id;
          }
        }

        // 2. categoryCode로 찾지 못하면 name으로 찾기
        if (!categoryId && tagData.categoryName) {
          const { data: categoryByName, error: nameError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', tagData.categoryName)
            .single();

          if (!nameError && categoryByName?.id) {
            categoryId = categoryByName.id;
          }
        }

        // 3. 카테고리를 찾지 못한 경우
        if (!categoryId) {
          throw new Error(
            t('nfc.categoryNotFound', { code: tagData.categoryCode, name: tagData.categoryName })
          );
        }

        path = `${basePath}/category/${categoryId}`;

        setStatus('success');
        setStatusMessage(t('nfc.categoryFound'));
      }

      // 잠시 후 페이지 이동
      setTimeout(() => {
        navigate(path);
        setShowDialog(false);
        setIsScanning(false);
        setStatus('idle');
      }, 1000);
    } catch (error) {
      console.error('NFC 스캔 오류:', error);
      setStatus('error');
      setStatusMessage(t('nfc.scanFailed'));
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('nfc.scanError')
      );

      // 에러 후 3초 뒤 자동으로 대화상자 닫기
      setTimeout(() => {
        setShowDialog(false);
        setIsScanning(false);
        setStatus('idle');
      }, 3000);
    }
  };

  const handleCloseDialog = () => {
    if (!isScanning) {
      setShowDialog(false);
      setStatus('idle');
      setStatusMessage('');
      setErrorMessage('');
    }
  };

  return (
    <>
      {/* 플로팅 버튼 - 화면 왼쪽 하단 */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={handleScan}
          disabled={isScanning}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow bg-[#2563eb] hover:bg-[#1d4ed8]"
        >
          {isScanning ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Smartphone className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {/* 스캔 상태 대화상자 */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('nfc.scan')}</h3>
              {!isScanning && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseDialog}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 스캔 중 상태 */}
            {status === 'scanning' && (
              <Alert className="border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                <AlertTitle className="text-blue-900">{t('nfc.scanning')}</AlertTitle>
                <AlertDescription className="text-blue-800">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* 성공 상태 */}
            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <AlertTitle className="text-green-900">{t('nfc.scanSuccess')}</AlertTitle>
                <AlertDescription className="text-green-800">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* 에러 상태 */}
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>{t('nfc.scanFailed')}</AlertTitle>
                <AlertDescription>
                  {statusMessage}
                  {errorMessage && (
                    <div className="mt-2 text-sm">{errorMessage}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* 취소 버튼 (스캔 중일 때만 비활성화) */}
            {!isScanning && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCloseDialog} variant="outline">
                  {t('common.close')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

