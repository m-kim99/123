import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNFCSupported } from '@/lib/nfc';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function NFCAutoRedirect() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const ndefReaderRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // NFC 지원 여부 및 사용자 확인
    if (!isNFCSupported() || !user || isInitializedRef.current) {
      return;
    }

    const startNFCScanning = async () => {
      console.log('🔵 NFC 자동 스캔 시작');

      try {
        // @ts-ignore - NDEFReader
        const ndef = new NDEFReader();
        ndefReaderRef.current = ndef;
        isInitializedRef.current = true;

        // NFC 스캔 시작
        await ndef.scan();
        console.log('✅ NFC 스캔 활성화 완료');

        // 이벤트 핸들러 정의
        const handleReading = async (event: any) => {
          try {
            const { serialNumber, message } = event;
            const uid = serialNumber.replace(/:/g, '').toUpperCase();
            console.log('📱 NFC 태그 감지! UID:', uid);

            const basePath = user.role === 'admin' ? '/admin' : '/team';

            // 0차: 태그 안에 저장된 URL을 우선 활용 (새로운 URL 기반 플로우)
            if (message && Array.isArray(message.records) && message.records.length > 0) {
              for (const record of message.records) {
                try {
                  if (record.recordType !== 'url') continue;

                  let urlString = '';

                  if (typeof record.data === 'string') {
                    urlString = record.data;
                  } else if (record.data) {
                    try {
                      const decoder = new TextDecoder();
                      urlString = decoder.decode(record.data);
                    } catch (e) {
                      console.error('NFC URL 디코딩 오류:', e);
                    }
                  }

                  if (!urlString) {
                    continue;
                  }

                  console.log('NFC 태그 내 URL 레코드:', urlString);

                  let url: URL;
                  try {
                    // 절대/상대 URL 모두 처리
                    url = new URL(urlString, window.location.origin);
                  } catch (e) {
                    console.error('NFC URL 파싱 오류:', e);
                    continue;
                  }

                  const params = url.searchParams;
                  const subcategoryId = params.get('subcategoryId');
                  let parentCategoryId = params.get('parentCategoryId');

                  if (subcategoryId) {
                    // parentCategoryId가 URL에 없으면 Supabase에서 조회
                    if (!parentCategoryId) {
                      const { data, error } = await supabase
                        .from('subcategories')
                        .select('parent_category_id')
                        .eq('id', subcategoryId)
                        .single();

                      if (!error && data) {
                        parentCategoryId = (data as any).parent_category_id;
                      }
                    }

                    if (parentCategoryId) {
                      toast({
                        title: '✅ NFC 태그 인식',
                        description: '연결된 세부 카테고리로 이동합니다.',
                      });

                      navigate(
                        `${basePath}/parent-category/${parentCategoryId}/subcategory/${subcategoryId}`,
                      );
                      return;
                    }
                  }
                } catch (recordError) {
                  console.error('NFC URL 레코드 처리 오류:', recordError);
                }
              }
            }

            // 1차: 세부 카테고리(subcategories)에서 UID 기반 매핑
            const { data: sub, error: subError } = await supabase
              .from('subcategories')
              .select('id, parent_category_id')
              .eq('nfc_tag_id', uid)
              .single();

            if (!subError && sub) {
              toast({
                title: '✅ NFC 태그 인식',
                description: '연결된 세부 카테고리로 이동합니다.',
              });

              navigate(
                `${basePath}/parent-category/${sub.parent_category_id}/subcategory/${sub.id}` 
              );
              return;
            }

            // 등록되지 않은 태그
            toast({
              title: '❌ 미등록 태그',
              description: '이 NFC 태그는 등록되지 않았습니다.',
              variant: 'destructive',
            });
          } catch (error) {
            console.error('NFC 처리 오류:', error);
            toast({
              title: '오류',
              description: 'NFC 태그 처리 중 오류가 발생했습니다.',
              variant: 'destructive',
            });
          }
        };

        const handleReadingError = (error: any) => {
          console.error('NFC 읽기 오류:', error);
        };

        // 이벤트 리스너 등록
        ndef.addEventListener('reading', handleReading);
        ndef.addEventListener('readingerror', handleReadingError);

        // cleanup 함수를 위해 핸들러 저장
        (ndefReaderRef.current as any).handleReading = handleReading;
        (ndefReaderRef.current as any).handleReadingError = handleReadingError;

      } catch (error) {
        console.error('❌ NFC 스캔 시작 실패:', error);
        isInitializedRef.current = false;
      }
    };

    startNFCScanning();

    // Cleanup: 이벤트 리스너 제거
    return () => {
      if (ndefReaderRef.current) {
        try {
          const ndef = ndefReaderRef.current as any;
          if (ndef.handleReading) {
            ndef.removeEventListener('reading', ndef.handleReading);
          }
          if (ndef.handleReadingError) {
            ndef.removeEventListener('readingerror', ndef.handleReadingError);
          }
          console.log('🧹 NFC 이벤트 리스너 정리 완료');
        } catch (error) {
          console.error('NFC cleanup 오류:', error);
        }
        ndefReaderRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [user, navigate]); // isScanning 제거 - 무한 루프 방지

  // UI를 렌더링하지 않음
  return null;
}
