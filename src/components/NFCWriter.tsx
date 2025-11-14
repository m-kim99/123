import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { isNFCSupported, writeNFCTag } from '@/lib/nfc';
import { useDocumentStore, type Category } from '@/store/documentStore';
import { supabase } from '@/lib/supabase';

interface NFCWriterProps {
  category: Category;
  categoryCode?: string; // 카테고리 코드 (선택적)
}

export function NFCWriter({ category, categoryCode }: NFCWriterProps) {
  const { updateCategory } = useDocumentStore();
  const [isWriting, setIsWriting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'writing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // NFC 지원 여부 확인
  const nfcSupported = isNFCSupported();

  // 카테고리 코드 가져오기 (Supabase에서 직접 가져오기)
  const [code, setCode] = useState<string>(categoryCode || '');

  // 카테고리 코드가 없으면 Supabase에서 가져오기
  useEffect(() => {
    // categoryCode prop이 있으면 사용, 없으면 Supabase에서 가져오기
    if (categoryCode) {
      setCode(categoryCode);
      return;
    }

    if (category.id) {
      const fetchCategoryCode = async () => {
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('code')
            .eq('id', category.id)
            .single();

          if (!error && data?.code) {
            setCode(data.code);
          } else {
            // 코드가 없으면 카테고리 ID를 코드로 사용
            setCode(category.id);
          }
        } catch (err) {
          console.error('카테고리 코드 가져오기 오류:', err);
          // 에러 발생 시 카테고리 ID를 코드로 사용
          setCode(category.id);
        }
      };
      fetchCategoryCode();
    } else {
      // 카테고리 ID도 없으면 빈 문자열
      setCode('');
    }
  }, [category.id, categoryCode]);

  const handleWriteNFC = async () => {
    if (!nfcSupported) {
      setStatus('error');
      setErrorMessage('NFC는 Android Chrome에서만 지원됩니다.');
      return;
    }

    setIsWriting(true);
    setStatus('writing');
    setStatusMessage('태그를 가까이 대세요...');
    setErrorMessage('');

    try {
      // NFC 태그에 데이터 쓰기
      const nfcData = {
        categoryCode: code || category.id,
        categoryName: category.name,
        storageLocation: category.storageLocation || '',
        documentCount: category.documentCount,
      };

      await writeNFCTag(nfcData);

      // 쓰기 성공 시 카테고리의 nfc_tag_id 업데이트
      try {
        // nfcRegistered를 true로 설정하여 nfc_tag_id 업데이트
        await updateCategory(category.id, {
          nfcRegistered: true,
        });

        setStatus('success');
        setStatusMessage('✅ 등록 완료!');
      } catch (updateError) {
        console.error('카테고리 업데이트 오류:', updateError);
        // NFC 쓰기는 성공했지만 업데이트 실패
        setStatus('success');
        setStatusMessage('✅ NFC 태그 쓰기 완료 (카테고리 업데이트 실패)');
      }
    } catch (error) {
      console.error('NFC 태그 쓰기 오류:', error);
      setStatus('error');
      setStatusMessage('❌ 실패');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'NFC 태그 쓰기 중 오류가 발생했습니다.'
      );
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          NFC 태그 등록
        </CardTitle>
        <CardDescription>
          카테고리 정보를 NFC 태그에 등록합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 카테고리 정보 표시 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">카테고리 코드</span>
            <span className="text-sm text-slate-900">{code || category.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">카테고리 이름</span>
            <span className="text-sm text-slate-900">{category.name}</span>
          </div>
          {category.storageLocation && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">보관 위치</span>
              <span className="text-sm text-slate-900">{category.storageLocation}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">문서 개수</span>
            <span className="text-sm text-slate-900">{category.documentCount}개</span>
          </div>
        </div>

        {/* NFC 미지원 경고 */}
        {!nfcSupported && (
          <Alert variant="default" className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">NFC 미지원</AlertTitle>
            <AlertDescription className="text-yellow-800">
              ⚠️ NFC는 Android Chrome에서만 지원됩니다
            </AlertDescription>
          </Alert>
        )}

        {/* 상태 메시지 */}
        {status === 'writing' && (
          <Alert className="border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertTitle className="text-blue-900">NFC 태그 쓰기 중</AlertTitle>
            <AlertDescription className="text-blue-800">
              {statusMessage}
            </AlertDescription>
          </Alert>
        )}

        {status === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">등록 완료</AlertTitle>
            <AlertDescription className="text-green-800">
              {statusMessage}
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>등록 실패</AlertTitle>
            <AlertDescription>
              {statusMessage}
              {errorMessage && (
                <div className="mt-2 text-sm">{errorMessage}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* NFC 태그 쓰기 버튼 */}
        <Button
          onClick={handleWriteNFC}
          disabled={isWriting || !nfcSupported || category.nfcRegistered}
          className="w-full"
          variant={category.nfcRegistered ? 'outline' : 'default'}
        >
          {isWriting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              태그 쓰기 중...
            </>
          ) : category.nfcRegistered ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              이미 등록됨
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 mr-2" />
              NFC 태그 쓰기
            </>
          )}
        </Button>

        {category.nfcRegistered && (
          <p className="text-xs text-slate-500 text-center">
            이 카테고리는 이미 NFC 태그가 등록되어 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

