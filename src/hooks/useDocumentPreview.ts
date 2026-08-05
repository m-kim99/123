import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { r2Storage } from '@/lib/r2';
import { downloadFile } from '@/lib/appBridge';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

export interface PreviewDoc {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'pdf' | 'other';
  ocrText?: string | null;
  uploader?: string;
  uploadDate?: string;
  fileSize?: string;
}

interface Options {
  /** 분석 이벤트에 남길 화면 구분 (예: 'category_detail') */
  context: string;
  /** 실패 토스트에 쓸 i18n 네임스페이스 (예: 'categoryDetail') */
  i18nNamespace: string;
}

function detectType(filePath: string): PreviewDoc['type'] {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) return 'image';
  return 'other';
}

function formatFileSize(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const bytes = Number(raw);
  if (!Number.isFinite(bytes)) return undefined;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

/**
 * 문서 미리보기/다운로드 공통 로직.
 *
 * CategoryDetail / SubcategoryDetail / DocumentManagement 가 70줄짜리 동일한 핸들러를
 * 각자 들고 있었다 (분석 태그와 토스트 키만 달랐다). 한 곳만 고치면 나머지가 어긋나는
 * 구조라 하나로 합친다.
 *
 * URL 은 file_path 가 아니라 documentId 로 발급받는다 — 서버가 호출자의 RLS 로
 * 권한을 판정한다 (r2Storage.getSignedUrl 참고).
 */
export function useDocumentPreview({ context, i18nNamespace }: Options) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = useCallback(
    async (documentId: string) => {
      try {
        trackEvent('document_preview_open', {
          document_id: documentId,
          preview_context: context,
        });

        setPreviewLoading(true);

        const { data, error } = await supabase
          .from('documents')
          .select('file_path, title, ocr_text, uploaded_by, uploaded_at, file_size')
          .eq('id', documentId)
          .single();

        if (error || !data) {
          throw error || new Error('문서를 찾을 수 없습니다.');
        }

        const signedUrl = await r2Storage.getSignedUrl(documentId);
        if (!signedUrl) {
          throw new Error('파일 URL을 생성할 수 없습니다.');
        }

        setPreviewDoc({
          id: documentId,
          title: data.title,
          url: signedUrl,
          type: detectType(data.file_path),
          ocrText: data.ocr_text ?? null,
          uploader: data.uploaded_by ?? undefined,
          uploadDate: data.uploaded_at
            ? new Date(data.uploaded_at).toLocaleDateString()
            : undefined,
          fileSize: formatFileSize(data.file_size),
        });
        setPreviewOpen(true);
      } catch (err) {
        console.error('문서 미리보기 로드 실패:', err);
        toast({
          title: t(`${i18nNamespace}.previewFailed`),
          description: t(`${i18nNamespace}.previewFailedDesc`),
          variant: 'destructive',
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [context, i18nNamespace, t],
  );

  const downloadDocument = useCallback(
    async (documentId: string) => {
      try {
        trackEvent('document_download', {
          document_id: documentId,
          download_context: context,
        });

        const { data, error } = await supabase
          .from('documents')
          .select('file_path, title')
          .eq('id', documentId)
          .single();

        if (error || !data) {
          throw error || new Error('문서를 찾을 수 없습니다.');
        }

        const signedUrl = await r2Storage.getSignedUrl(documentId);
        if (!signedUrl) {
          throw new Error('파일 URL을 생성할 수 없습니다.');
        }

        await downloadFile(signedUrl, data.title || 'document');
      } catch (err) {
        console.error('문서 다운로드 실패:', err);
        toast({
          title: t('documentMgmt.downloadFailed'),
          description: t('documentMgmt.downloadFailedDesc'),
          variant: 'destructive',
        });
      }
    },
    [context, t],
  );

  return {
    previewOpen,
    setPreviewOpen,
    previewDoc,
    setPreviewDoc,
    previewLoading,
    openPreview,
    downloadDocument,
  };
}
