import { supabase } from '@/lib/supabase';

// Dynamic Import로 필요할 때만 로드
let pdfjsLib: any = null;

async function loadPDFLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // PDF.js worker 설정
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

/**
 * PDF 파일을 이미지로 변환
 * @param file PDF 파일
 * @param pageNum 페이지 번호 (1부터 시작)
 * @param scale 스케일 (기본값: 2.0)
 * @returns Canvas 요소
 */
async function convertPDFPageToImage(
  file: File,
  pageNum: number,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  try {
    const pdfLib = await loadPDFLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pageNum < 1 || pageNum > pdf.numPages) {
      throw new Error(`페이지 번호가 범위를 벗어났습니다: ${pageNum}/${pdf.numPages}`);
    }

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Canvas 생성
    const canvas = document.createElement('canvas');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // PDF 페이지를 Canvas에 렌더링
    await page.render({
      canvas,
      viewport,
    }).promise;

    return canvas;
  } catch (error) {
    console.error(`PDF 페이지 ${pageNum} 변환 오류:`, error);
    throw new Error(
      `PDF 페이지 ${pageNum}를 이미지로 변환하는 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}


/**
 * PDF 파일에서 텍스트 추출 (OCR 사용)
 * @param file PDF 파일
 * @param onProgress 진행 상황 콜백 함수 (선택사항)
 * @returns 추출된 텍스트
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: { page: number; totalPages: number; percent: number; status: string }) => void
): Promise<string> {
  try {
    // 파일 타입 확인
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('PDF 파일만 처리할 수 있습니다.');
    }

    console.log('PDF 파일 로딩 시작:', file.name);

    // PDF 파일 로드하여 페이지 수 확인
    const pdfLib = await loadPDFLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    console.log(`총 ${totalPages}페이지 발견`);

    const extractedTexts: string[] = [];

    // 각 페이지 처리
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`페이지 ${pageNum}/${totalPages} 처리 중...`);
        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round(((pageNum - 1) / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} 이미지 변환 중...`,
        });

        // PDF 페이지를 이미지로 변환 후 base64 Data URL 생성
        const canvas = await convertPDFPageToImage(file, pageNum, 2.0);
        const dataUrl = canvas.toDataURL('image/png');

        console.log(`페이지 ${pageNum} OCR 처리 중...`);
        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round(((pageNum - 1) / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} OCR 처리 중...`,
        });

        // Edge Function을 통해 네이버 클로바 OCR 호출
        const { data, error } = await supabase.functions.invoke('naver-ocr', {
          body: {
            imageBase64: dataUrl,
            mimeType: 'image/png',
            page: pageNum,
          },
        });

        if (error) {
          console.error('네이버 OCR Edge Function 호출 오류:', error);
          throw new Error(
            error.message || `페이지 ${pageNum} OCR 처리 중 오류가 발생했습니다.`,
          );
        }

        const text = (data as any)?.text as string | undefined;

        if (text && text.trim()) {
          extractedTexts.push(`\n--- 페이지 ${pageNum} ---\n${text.trim()}\n`);
          console.log(`페이지 ${pageNum} 텍스트 추출 완료 (${text.length}자)`);
        } else {
          console.warn(`페이지 ${pageNum}에서 텍스트를 찾을 수 없습니다.`);
          extractedTexts.push(`\n--- 페이지 ${pageNum} ---\n(텍스트 없음)\n`);
        }

        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round((pageNum / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} 완료`,
        });
      } catch (pageError) {
        console.error(`페이지 ${pageNum} 처리 오류:`, pageError);
        extractedTexts.push(
          `\n--- 페이지 ${pageNum} ---\n(처리 오류: ${
            pageError instanceof Error ? pageError.message : String(pageError)
          })\n`
        );
        // 페이지 오류가 발생해도 다음 페이지 계속 처리
      }
    }

    // 모든 페이지 텍스트 합치기
    const fullText = extractedTexts.join('\n');
    console.log(`텍스트 추출 완료: 총 ${fullText.length}자`);

    onProgress?.({
      page: totalPages,
      totalPages,
      percent: 100,
      status: '완료',
    });

    return fullText.trim();
  } catch (error) {
    console.error('PDF 텍스트 추출 오류:', error);
    throw new Error(
      `PDF 텍스트 추출 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: { percent: number; status: string }) => void
): Promise<string> {
  try {
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();
    const isSupportedImage =
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png');

    if (!isSupportedImage) {
      throw new Error('JPG, PNG 이미지 파일만 처리할 수 있습니다.');
    }

    onProgress?.({ percent: 0, status: '이미지 준비 중...' });

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('이미지 데이터를 읽을 수 없습니다.'));
        }
      };
      reader.onerror = () => {
        reject(reader.error || new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'));
      };
      reader.readAsDataURL(file);
    });
    
    onProgress?.({ percent: 30, status: 'OCR 요청 중...' });

    const { data, error } = await supabase.functions.invoke('naver-ocr', {
      body: {
        imageBase64: dataUrl,
        mimeType: mimeType || 'image/jpeg',
      },
    });

    if (error) {
      console.error('네이버 OCR Edge Function 호출 오류:', error);
      throw new Error(error.message || '이미지 OCR 처리 중 오류가 발생했습니다.');
    }

    const text = (data as any)?.text as string | undefined;
    const result = (text || '').trim();

    if (!result) {
      console.warn('이미지에서 텍스트를 찾을 수 없습니다.');
    }

    onProgress?.({ percent: 100, status: 'OCR 처리 완료' });

    return result;
  } catch (error) {
    console.error('이미지 텍스트 추출 오류:', error);
    throw new Error(
      `이미지 텍스트 추출 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function extractText(
  file: File,
  onProgress?: (progress: { percent: number; status: string; type: 'pdf' | 'image' }) => void
): Promise<string> {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage =
    mimeType.startsWith('image/') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png');

  if (isPdf) {
    onProgress?.({ percent: 0, status: 'PDF 처리 중...', type: 'pdf' });
    const text = await extractTextFromPDF(file, (progress) => {
      onProgress?.({
        percent: progress.percent,
        status: progress.status,
        type: 'pdf',
      });
    });
    return text;
  }

  if (isImage) {
    onProgress?.({ percent: 0, status: '이미지 처리 중...', type: 'image' });
    const text = await extractTextFromImage(file, ({ percent, status }) => {
      onProgress?.({ percent, status, type: 'image' });
    });
    onProgress?.({ percent: 100, status: '이미지 처리 완료', type: 'image' });
    return text;
  }

  throw new Error('지원하지 않는 파일 형식입니다. PDF, JPG, PNG만 지원됩니다.');
}
