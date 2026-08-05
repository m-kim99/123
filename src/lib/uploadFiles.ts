import i18n from '@/lib/i18n';

/**
 * 업로드 파일 처리 공용 유틸.
 * DocumentManagement / CategoryDetail 이 같은 구현을 각자 들고 있었다.
 */

/** 업로드 대상 파일을 PDF / 이미지로 나눈다. 둘 다 아닌 파일은 버린다. */
export function splitFilesByType(files: File[]) {
  const pdfFiles: File[] = [];
  const imageFiles: File[] = [];

  files.forEach((file) => {
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (isPdf) {
      pdfFiles.push(file);
    } else if (isImage) {
      imageFiles.push(file);
    }
  });

  return { pdfFiles, imageFiles };
}

/** 확장자를 뗀 파일명 (문서 제목 기본값으로 쓴다). */
export function getBaseNameWithoutExt(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName;
  return fileName.slice(0, lastDot);
}

/** 이미지 파일을 data URL 로 읽는다 (PDF 변환 전 단계). */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(i18n.t('categoryDetail.imageDataReadError')));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error(i18n.t('categoryDetail.imageReadError')));
    };
    reader.readAsDataURL(file);
  });
}
