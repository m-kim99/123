import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNFCSupported, getNfcMode } from '@/lib/nfc';
import { NfcPlugin } from '@/plugins/nfc-plugin';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export function NFCAutoRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const ndefReaderRef = useRef<any>(null);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);
  const isInitializedRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isNFCSupported() || !user || isInitializedRef.current) {
      return;
    }

    const processTag = async (uid: string, payload?: string, recordType?: string) => {
      // 중복 처리 방지
      if (isProcessingRef.current) return;

      // 쓰기/등록 모드 체크 - 약간의 지연으로 race condition 방지
      await new Promise((r) => setTimeout(r, 50));
      if (getNfcMode() === 'writing') {
        console.log('NFC 쓰기 모드 중 - 자동 리다이렉트 스킵');
        return;
      }

      isProcessingRef.current = true;
      try {
        console.log('NFC 태그 감지! UID:', uid);
        const basePath = user.role === 'admin' ? '/admin' : '/team';

        if (payload && (recordType === 'url' || payload.includes('/nfc-redirect?subcategoryId='))) {
          let urlString = payload;
          try {
            const url = new URL(urlString, window.location.origin);
            const subcategoryId = url.searchParams.get('subcategoryId');
            let parentCategoryId = url.searchParams.get('parentCategoryId');

            if (subcategoryId) {
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
                toast({ title: t('nfc.tagRecognized'), description: t('nfc.navigatingToSubcategory') });
                navigate(`${basePath}/parent-category/${parentCategoryId}/subcategory/${subcategoryId}?nfc=1`);
                return;
              }
            }
          } catch (e) {
            console.error('NFC URL 파싱 오류:', e);
          }
        }

        const { data: sub, error: subError } = await supabase
          .from('subcategories')
          .select('id, parent_category_id')
          .eq('nfc_tag_id', uid)
          .single();

        if (!subError && sub) {
          toast({ title: t('nfc.tagRecognized'), description: t('nfc.navigatingToSubcategory') });
          navigate(`${basePath}/parent-category/${sub.parent_category_id}/subcategory/${sub.id}?nfc=1`);
          return;
        }

        toast({ title: t('nfc.unregisteredTag'), description: t('nfc.unregisteredTagDesc'), variant: 'destructive' });
      } catch (error) {
        console.error('NFC 처리 오류:', error);
        toast({ title: t('common.error'), description: t('nfc.processingError'), variant: 'destructive' });
      } finally {
        // 1초간 중복 처리 차단 (같은 태그 연속 감지 방지)
        setTimeout(() => { isProcessingRef.current = false; }, 1000);
      }
    };

    const startNFCScanning = async () => {
      console.log('NFC 자동 리다이렉트 리스너 등록');
      try {
        isInitializedRef.current = true;

        if (Capacitor.isNativePlatform()) {
          if (Capacitor.getPlatform() === 'ios') {
            // iOS: foreground dispatch 개념이 없음.
            // NFC 태그 인식은 iOS Background Tag Reading + Universal Links 조합으로 처리됩니다.
            // - 태그에 기록된 https://traystorageconnect.com/nfc-redirect?subcategoryId=... URL을
            //   iOS가 백그라운드에서 자동으로 읽고 앱 Universal Link로 열어줌
            // - App.entitlements에 applinks:traystorageconnect.com 이 선언되어 있어야 함
            // - 앱이 열리면 NfcRedirect.tsx 페이지가 subcategoryId로 직접 이동 처리
            console.log('NFC 자동 리다이렉트: iOS - Universal Links 방식으로 처리됩니다.');
            return;
          }

          // Android: foreground dispatch는 MainActivity lifecycle이 관리하므로 리스너만 등록
          nativeListenerRef.current = await NfcPlugin.addListener(
            'nfcTagDetected',
            async (tag) => {
              await processTag(tag.uid, tag.payload, tag.recordType);
            },
          );
          console.log('NFC 리스너 등록 완료 (Android 네이티브)');
        } else {
          // @ts-ignore - NDEFReader is not in TypeScript types
          const ndef = new (window as any).NDEFReader();
          ndefReaderRef.current = ndef;
          await ndef.scan();
          console.log('NFC 스캔 시작 (Web NFC)');

          const handleReading = async (event: any) => {
            const { serialNumber, message } = event;
            const uid = serialNumber.replace(/:/g, '').toUpperCase();

            let payload: string | undefined;
            let recordType: string | undefined;
            if (message?.records?.length > 0) {
              const record = message.records[0];
              recordType = record.recordType;
              try {
                payload = typeof record.data === 'string'
                  ? record.data
                  : new TextDecoder().decode(record.data);
              } catch (_) {}
            }
            await processTag(uid, payload, recordType);
          };

          const handleReadingError = (error: any) => {
            console.error('NFC 읽기 오류:', error);
          };

          ndef.addEventListener('reading', handleReading);
          ndef.addEventListener('readingerror', handleReadingError);
          (ndefReaderRef.current as any).handleReading = handleReading;
          (ndefReaderRef.current as any).handleReadingError = handleReadingError;
        }
      } catch (error) {
        console.error('NFC 스캔 시작 실패:', error);
        isInitializedRef.current = false;
      }
    };

    startNFCScanning();

    return () => {
      if (Capacitor.isNativePlatform()) {
        // 리스너만 제거 (stopScan 호출하지 않음 - write 동작 보호)
        nativeListenerRef.current?.remove();
        nativeListenerRef.current = null;
        console.log('NFC 네이티브 리스너 정리 완료');
      } else if (ndefReaderRef.current) {
        try {
          const ndef = ndefReaderRef.current as any;
          if (ndef.handleReading) ndef.removeEventListener('reading', ndef.handleReading);
          if (ndef.handleReadingError) ndef.removeEventListener('readingerror', ndef.handleReadingError);
          console.log('NFC Web NFC 이벤트 정리 완료');
        } catch (e) {
          console.error('NFC cleanup 오류:', e);
        }
        ndefReaderRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [user, navigate]);

  return null;
}
