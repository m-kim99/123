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

  useEffect(() => {
    if (!isNFCSupported() || !user || isInitializedRef.current) {
      return;
    }

    const processTag = async (uid: string, payload?: string, recordType?: string) => {
      try {
        if (getNfcMode() === 'writing') {
          console.log('NFC 쓰기 모드 중 - 자동 리다이렉트 스킵');
          return;
        }

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
                navigate(`${basePath}/parent-category/${parentCategoryId}/subcategory/${subcategoryId}`);
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
          navigate(`${basePath}/parent-category/${sub.parent_category_id}/subcategory/${sub.id}`);
          return;
        }

        toast({ title: t('nfc.unregisteredTag'), description: t('nfc.unregisteredTagDesc'), variant: 'destructive' });
      } catch (error) {
        console.error('NFC 처리 오류:', error);
        toast({ title: t('common.error'), description: t('nfc.processingError'), variant: 'destructive' });
      }
    };

    const startNFCScanning = async () => {
      console.log('NFC 자동 스캔 시작');
      try {
        isInitializedRef.current = true;

        if (Capacitor.isNativePlatform()) {
          await NfcPlugin.startScan();
          console.log('NFC 스캔 시작 (네이티브)');

          nativeListenerRef.current = await NfcPlugin.addListener(
            'nfcTagDetected',
            async (tag) => {
              await processTag(tag.uid, tag.payload, tag.recordType);
            },
          );
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
        nativeListenerRef.current?.remove();
        nativeListenerRef.current = null;
        NfcPlugin.stopScan().catch(() => {});
        console.log('NFC 네이티브 스캔 정리 완료');
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
