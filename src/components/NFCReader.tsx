import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isNFCSupported, readNFCTag, type NFCTagData } from '@/lib/nfc';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function NFCReader() {
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
      setStatusMessage('로그인이 필요합니다.');
      return;
    }

    setIsScanning(true);
    setStatus('scanning');
    setStatusMessage('태그를 가까이 대세요...');
    setErrorMessage('');
    setShowDialog(true);

    try {
      // NFC 태그 읽기
      const tagData: NFCTagData = await readNFCTag();

      console.log('NFC 태그 데이터 읽기 완료:', tagData);

      // categoryCode로 카테고리 찾기
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
          `카테고리를 찾을 수 없습니다. (코드: ${tagData.categoryCode}, 이름: ${tagData.categoryName})`
        );
      }

      // 카테고리 ID로 페이지 이동
      const isAdmin = user.role === 'admin';
      const path = isAdmin
        ? `/admin/category/${categoryId}`
        : `/team/category/${categoryId}`;

      setStatus('success');
      setStatusMessage('✅ 카테고리 찾음! 이동 중...');

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
      setStatusMessage('❌ 스캔 실패');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'NFC 태그 스캔 중 오류가 발생했습니다.'
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
              <h3 className="text-lg font-semibold">NFC 스캔</h3>
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
                <AlertTitle className="text-blue-900">NFC 스캔 중</AlertTitle>
                <AlertDescription className="text-blue-800">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* 성공 상태 */}
            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <AlertTitle className="text-green-900">스캔 성공</AlertTitle>
                <AlertDescription className="text-green-800">
                  {statusMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* 에러 상태 */}
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertTitle>스캔 실패</AlertTitle>
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
                  닫기
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

