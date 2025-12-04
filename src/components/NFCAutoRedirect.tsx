import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNFCSupported } from '@/lib/nfc';
import { resolveNFCTag } from '@/lib/nfcApi';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function NFCAutoRedirect() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // NFC 지원 여부 확인
    if (!isNFCSupported() || !user) {
      return;
    }

    // 이미 스캔 중이면 중복 실행 방지
    if (isScanning) {
      return;
    }

    const startNFCScanning = async () => {
      setIsScanning(true);
      console.log('🔵 NFC 자동 스캔 시작');

      try {
        // @ts-ignore
        const ndef = new NDEFReader();
        await ndef.scan();

        // @ts-ignore
        ndef.addEventListener("reading", async ({ serialNumber }) => {
          try {
            // UID 정규화
            const uid = serialNumber.replace(/:/g, '').toUpperCase();
            console.log('📱 NFC 태그 감지! UID:', uid);

            const basePath = user.role === 'admin' ? '/admin' : '/team';

            // 1차: 세부 카테고리(subcategories)에서 UID 기반 매핑
            const { data: sub, error: subError } = await supabase
              .from('subcategories')
              .select('id, parent_category_id')
              .eq('nfc_uid', uid)
              .single();

            if (!subError && sub) {
              toast({
                title: '✅ NFC 태그 인식',
                description: '연결된 세부 카테고리로 이동합니다.',
              });

              navigate(
                `${basePath}/parent-category/${(sub as any).parent_category_id}/subcategory/${
                  (sub as any).id
                }`,
              );
              return;
            }

            // 2차: 기존 nfc_mappings 테이블을 통한 카테고리 매핑 (레거시 호환)
            const result = await resolveNFCTag(uid);

            if (result.found && result.category) {
              toast({
                title: '✅ NFC 태그 인식',
                description: `"${result.category.name}" 카테고리로 이동합니다`,
              });

              navigate(`${basePath}/category/${result.category.id}`);
            } else {
              toast({
                title: '❌ 미등록 태그',
                description: '이 NFC 태그는 등록되지 않았습니다.',
                variant: 'destructive',
              });
            }
          } catch (error) {
            console.error('NFC 처리 오류:', error);
            toast({
              title: '오류',
              description: 'NFC 태그 처리 중 오류가 발생했습니다.',
              variant: 'destructive',
            });
          }
        });

      } catch (error) {
        console.error('NFC 스캔 시작 실패:', error);
      }
    };

    startNFCScanning();

    // cleanup
    return () => {
      setIsScanning(false);
    };
  }, [user, navigate, isScanning]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}
