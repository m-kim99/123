import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
 * Canvas를 ImageData로 변환
 * @param canvas Canvas 요소
 * @returns ImageData
 */
function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context를 가져올 수 없습니다.');
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
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
  let tesseractWorker: any = null;

  try {
    // 파일 타입 확인
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('PDF 파일만 처리할 수 있습니다.');
    }

    console.log('PDF 파일 로딩 시작:', file.name);

    // PDF 파일 로드하여 페이지 수 확인
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    console.log(`총 ${totalPages}페이지 발견`);

    // Tesseract.js Worker 생성 및 초기화
    console.log('Tesseract.js Worker 초기화 중...');
    onProgress?.({ page: 0, totalPages, percent: 0, status: 'Tesseract.js 초기화 중...' });

    tesseractWorker = await createWorker('kor+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const percent = Math.round(m.progress * 100);
          onProgress?.({
            page: 0,
            totalPages,
            percent,
            status: `OCR 처리 중: ${percent}%`,
          });
        }
      },
    });

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

        // PDF 페이지를 이미지로 변환
        const canvas = await convertPDFPageToImage(file, pageNum, 2.0);
        const imageData = canvasToImageData(canvas);

        console.log(`페이지 ${pageNum} OCR 처리 중...`);
        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round(((pageNum - 1) / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} OCR 처리 중...`,
        });

        // OCR 수행
        const {
          data: { text },
        } = await tesseractWorker.recognize(imageData);

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

    // Worker 종료
    if (tesseractWorker) {
      await tesseractWorker.terminate();
      tesseractWorker = null;
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

    // Worker 정리
    if (tesseractWorker) {
      try {
        await tesseractWorker.terminate();
      } catch (terminateError) {
        console.error('Worker 종료 오류:', terminateError);
      }
    }

    throw new Error(
      `PDF 텍스트 추출 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}








