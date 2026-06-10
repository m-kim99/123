import { supabase } from '@/lib/supabase';

export interface PiiRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrExtractResult {
  text: string;
  maskedFile: File | null;
}

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
 * Canvas에 PII 영역을 블랙박스로 마스킹
 */
function applyPiiMaskToCanvas(
  canvas: HTMLCanvasElement,
  piiRegions: PiiRegion[],
  ocrImageWidth: number,
  ocrImageHeight: number,
): void {
  if (!piiRegions || piiRegions.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // OCR 좌표 → Canvas 좌표 비율 계산
  const scaleX = canvas.width / ocrImageWidth;
  const scaleY = canvas.height / ocrImageHeight;

  ctx.fillStyle = '#000000';
  for (const region of piiRegions) {
    const padding = 4;
    const x = region.x * scaleX - padding;
    const y = region.y * scaleY - padding;
    const w = region.w * scaleX + padding * 2;
    const h = region.h * scaleY + padding * 2;
    ctx.fillRect(x, y, w, h);
  }
}

/**
 * dataURL에서 실제 이미지 크기(px)를 구함 (OCR 좌표 스케일링에 사용)
 */
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('이미지 크기를 읽을 수 없습니다.'));
    img.src = dataUrl;
  });
}

/**
 * dataURL 이미지에 PII 마스킹을 적용하고 마스킹된 dataURL 반환
 */
async function maskImageDataUrl(
  dataUrl: string,
  piiRegions: PiiRegion[],
): Promise<string> {
  if (!piiRegions || piiRegions.length === 0) return dataUrl;

  const { width, height } = await getImageDimensions(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 원본 이미지 그리기
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
  ctx.drawImage(img, 0, 0);

  // OCR는 원본 이미지 크기 기준 좌표를 반환하므로 스케일 1:1
  applyPiiMaskToCanvas(canvas, piiRegions, width, height);

  const maskedUrl = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return maskedUrl;
}

/**
 * dataURL을 File 객체로 변환
 */
function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return new File([arr], fileName, { type: mime });
}

/**
 * PDF 파일을 이미지로 변환
 * @param pdfDoc 이미 로드된 PDF 문서 객체
 * @param pageNum 페이지 번호 (1부터 시작)
 * @param scale 스케일 (기본값: 2.0)
 * @returns Canvas 요소
 */
async function convertPDFPageToImage(
  pdfDoc: any,
  pageNum: number,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  try {
    if (pageNum < 1 || pageNum > pdfDoc.numPages) {
      throw new Error(`페이지 번호가 범위를 벗어났습니다: ${pageNum}/${pdfDoc.numPages}`);
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Canvas 생성
    const canvas = document.createElement('canvas');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
    }

    // PDF 페이지를 Canvas에 렌더링 (pdfjs-dist v3.x는 canvasContext 필요)
    await page.render({
      canvasContext,
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
 * PDF 파일에서 텍스트 추출 (텍스트 레이어 우선, 없으면 OCR)
 * PII 좌표가 감지되면 마스킹된 PDF도 생성하여 반환
 * @param file PDF 파일
 * @param onProgress 진행 상황 콜백 함수 (선택사항)
 * @returns { text, maskedFile }
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: { page: number; totalPages: number; percent: number; status: string }) => void
): Promise<OcrExtractResult> {
  try {
    // 파일 타입 확인
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('PDF 파일만 처리할 수 있습니다.');
    }

    console.log('📝 PDF 파일 로딩 시작:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // PDF 파일 로드하여 페이지 수 확인
    const pdfLib = await loadPDFLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    console.log(`📚 총 ${totalPages}페이지 발견`);

    const extractedTexts: string[] = [];
    // 페이지별 PII 좌표 수집 (key: pageNum)
    const piiRegionsByPage: Map<number, PiiRegion[]> = new Map();
    let textLayerPageCount = 0;
    let ocrPageCount = 0;

    // 각 페이지 처리
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        console.log(`📄 페이지 ${pageNum}/${totalPages} 처리 시작...`);
        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round(((pageNum - 1) / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} 분석 중...`,
        });

        const page = await pdf.getPage(pageNum);
        
        // 1단계: 텍스트 레이어에서 텍스트 추출 시도 (문자 PDF)
        let textLayerText = '';
        try {
          const textContent = await page.getTextContent();
          textLayerText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
            .trim();
        } catch (textError) {
          console.warn(`⚠️ 페이지 ${pageNum}: 텍스트 레이어 추출 실패`, textError);
        }

        if (textLayerText.length > 0) {
          // 텍스트 레이어에 텍스트가 있으면 OCR 불필요 (워드 문서 PDF 등)
          console.log(`✅ 페이지 ${pageNum}: 텍스트 레이어 발견 (${textLayerText.length}자)`);
          extractedTexts.push(`\n--- 페이지 ${pageNum} ---\n${textLayerText}\n`);
          textLayerPageCount++;
          
          onProgress?.({
            page: pageNum,
            totalPages,
            percent: Math.round((pageNum / totalPages) * 100),
            status: `페이지 ${pageNum}/${totalPages} 완료 (텍스트 추출)`,
          });
          continue;
        }

        // 2단계: 텍스트 레이어가 없으면 OCR 사용 (스캔/이미지 PDF)
        console.log(`🖼️ 페이지 ${pageNum}: 텍스트 레이어 없음, OCR 실행...`);
        
        onProgress?.({
          page: pageNum,
          totalPages,
          percent: Math.round(((pageNum - 1) / totalPages) * 100),
          status: `페이지 ${pageNum}/${totalPages} 이미지 변환 중...`,
        });

        // PDF 페이지를 이미지로 변환
        const canvas = await convertPDFPageToImage(pdf, pageNum, 2.0);
        
        // 이미지 크기 확인 (네이버 OCR 제한: 5MB)
        const dataUrl = canvas.toDataURL('image/png');
        // Canvas 메모리 해제
        canvas.width = 0;
        canvas.height = 0;
        const imageSizeMB = (dataUrl.length * 3) / 4 / 1024 / 1024;

        // 이 페이지의 PII 좌표를 수집할 배열
        const pagePiiRegions: PiiRegion[] = [];
        
        if (imageSizeMB > 4.5) {
          console.warn(`⚠️ 페이지 ${pageNum}: 이미지 크기 초과 (${imageSizeMB.toFixed(2)}MB), 해상도 낮춤`);
          // 해상도를 낮춰서 다시 변환
          const smallerCanvas = await convertPDFPageToImage(pdf, pageNum, 1.5);
          const smallerDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.85);
          // Canvas 메모리 해제
          smallerCanvas.width = 0;
          smallerCanvas.height = 0;
          const smallerSizeMB = (smallerDataUrl.length * 3) / 4 / 1024 / 1024;
          console.log(`🔄 해상도 조정 후: ${smallerSizeMB.toFixed(2)}MB`);
          
          if (smallerSizeMB > 4.5) {
            throw new Error(`페이지 ${pageNum} 이미지 크기가 너무 큽니다 (${smallerSizeMB.toFixed(2)}MB). OCR 처리를 건너뜁니다.`);
          }
          
          await performOCR(smallerDataUrl, pageNum, totalPages, extractedTexts, pagePiiRegions, onProgress);
        } else {
          console.log(`📊 페이지 ${pageNum} 이미지 크기: ${imageSizeMB.toFixed(2)}MB`);
          await performOCR(dataUrl, pageNum, totalPages, extractedTexts, pagePiiRegions, onProgress);
        }

        if (pagePiiRegions.length > 0) {
          piiRegionsByPage.set(pageNum, pagePiiRegions);
        }
        
        ocrPageCount++;
      } catch (pageError) {
        console.error(`❌ 페이지 ${pageNum} 처리 오류:`, pageError);
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
    console.log(`✅ 텍스트 추출 완료: 총 ${fullText.length}자`);
    console.log(`📊 처리 통계: 텍스트 레이어 ${textLayerPageCount}페이지, OCR ${ocrPageCount}페이지`);

    onProgress?.({
      page: totalPages,
      totalPages,
      percent: 100,
      status: `완료 (텍스트 ${textLayerPageCount}p, OCR ${ocrPageCount}p)`,
    });

    // PII가 감지된 페이지가 있으면 마스킹된 PDF 생성
    let maskedFile: File | null = null;
    if (piiRegionsByPage.size > 0) {
      console.log(`🔒 PDF PII 마스킹 시작 (${piiRegionsByPage.size}페이지에 PII 감지)`);
      try {
        const { jsPDF } = await import('jspdf');
        const maskedPdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = maskedPdf.internal.pageSize.getWidth();
        const pageHeight = maskedPdf.internal.pageSize.getHeight();

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (pageNum > 1) maskedPdf.addPage();

          // 페이지를 이미지로 렌더링
          const canvas = await convertPDFPageToImage(pdf, pageNum, 2.0);
          
          // PII 영역이 있으면 블랙박스 적용
          const regions = piiRegionsByPage.get(pageNum);
          if (regions && regions.length > 0) {
            applyPiiMaskToCanvas(canvas, regions, canvas.width, canvas.height);
          }

          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          canvas.width = 0;
          canvas.height = 0;

          maskedPdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        }

        const pdfBlob = maskedPdf.output('blob');
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        maskedFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
        console.log(`🔒 PDF PII 마스킹 완료`);
      } catch (maskError) {
        console.error('PDF 마스킹 실패 (원본 파일 사용):', maskError);
      }
    }

    return { text: fullText.trim(), maskedFile };
  } catch (error) {
    console.error('❌ PDF 텍스트 추출 오류:', error);
    throw new Error(
      `PDF 텍스트 추출 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * OCR 처리 헬퍼 함수 (타임아웃 및 에러 핸들링) — piiRegions도 수집
 */
async function performOCR(
  dataUrl: string,
  pageNum: number,
  totalPages: number,
  extractedTexts: string[],
  collectedPiiRegions: PiiRegion[],
  onProgress?: (progress: { page: number; totalPages: number; percent: number; status: string }) => void
): Promise<void> {
  onProgress?.({
    page: pageNum,
    totalPages,
    percent: Math.round(((pageNum - 1) / totalPages) * 100),
    status: `페이지 ${pageNum}/${totalPages} OCR 처리 중...`,
  });

  // 타임아웃 처리 (60초)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OCR 처리 시간 초과 (60초)')), 60000);
  });

  const ocrPromise = supabase.functions.invoke('naver-ocr', {
    body: {
      imageBase64: dataUrl,
      mimeType: dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
      page: pageNum,
    },
  });

  try {
    const { data, error } = await Promise.race([ocrPromise, timeoutPromise]);

    if (error) {
      console.error(`❌ 페이지 ${pageNum} OCR 오류:`, error);
      throw new Error(error.message || 'OCR 처리 중 오류가 발생했습니다.');
    }

    const text = (data as any)?.text as string | undefined;
    const piiRegions = (data as any)?.piiRegions as PiiRegion[] | undefined;

    if (piiRegions && piiRegions.length > 0) {
      collectedPiiRegions.push(...piiRegions);
    }

    if (text && text.trim()) {
      extractedTexts.push(`\n--- 페이지 ${pageNum} ---\n${text.trim()}\n`);
      console.log(`✅ 페이지 ${pageNum} OCR 완료 (${text.length}자, PII영역: ${piiRegions?.length ?? 0}개)`);
    } else {
      console.warn(`⚠️ 페이지 ${pageNum}: OCR 결과 텍스트 없음`);
      extractedTexts.push(`\n--- 페이지 ${pageNum} ---\n(텍스트 없음)\n`);
    }

    onProgress?.({
      page: pageNum,
      totalPages,
      percent: Math.round((pageNum / totalPages) * 100),
      status: `페이지 ${pageNum}/${totalPages} 완료 (OCR)`,
    });
  } catch (ocrError) {
    console.error(`❌ 페이지 ${pageNum} OCR 실패:`, ocrError);
    throw ocrError;
  }
}

export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: { percent: number; status: string }) => void
): Promise<OcrExtractResult> {
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

    console.log('🖼️ 이미지 OCR 시작:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
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
    
    // 이미지 크기 확인
    const imageSizeMB = (dataUrl.length * 3) / 4 / 1024 / 1024;
    console.log(`📊 이미지 크기: ${imageSizeMB.toFixed(2)}MB`);
    
    if (imageSizeMB > 4.5) {
      throw new Error(`이미지 크기가 너무 큽니다 (${imageSizeMB.toFixed(2)}MB). 5MB 이하로 줄여주세요.`);
    }
    
    onProgress?.({ percent: 30, status: 'OCR 요청 중...' });

    // 타임아웃 처리 (60초)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OCR 처리 시간 초과 (60초)')), 60000);
    });

    const ocrPromise = supabase.functions.invoke('naver-ocr', {
      body: {
        imageBase64: dataUrl,
        mimeType: mimeType || 'image/jpeg',
      },
    });

    const { data, error } = await Promise.race([ocrPromise, timeoutPromise]);

    if (error) {
      console.error('❌ 네이버 OCR 오류:', error);
      throw new Error(error.message || '이미지 OCR 처리 중 오류가 발생했습니다.');
    }

    const text = (data as any)?.text as string | undefined;
    const piiRegions = (data as any)?.piiRegions as PiiRegion[] | undefined;
    const result = (text || '').trim();

    if (!result) {
      console.warn('⚠️ 이미지에서 텍스트를 찾을 수 없습니다.');
    } else {
      console.log(`✅ 이미지 OCR 완료 (${result.length}자, PII영역: ${piiRegions?.length ?? 0}개)`);
    }

    // PII 영역이 있으면 이미지에 블랙박스 마스킹 적용
    let maskedFile: File | null = null;
    if (piiRegions && piiRegions.length > 0) {
      onProgress?.({ percent: 80, status: '개인정보 마스킹 중...' });
      const maskedDataUrl = await maskImageDataUrl(dataUrl, piiRegions);
      maskedFile = dataUrlToFile(maskedDataUrl, file.name);
      console.log(`🔒 이미지 PII 마스킹 완료 (${piiRegions.length}개 영역)`);
    }

    onProgress?.({ percent: 100, status: 'OCR 처리 완료' });

    return { text: result, maskedFile };
  } catch (error) {
    console.error('❌ 이미지 텍스트 추출 오류:', error);
    throw new Error(
      `이미지 텍스트 추출 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function extractText(
  file: File,
  onProgress?: (progress: { percent: number; status: string; type: 'pdf' | 'image'; page?: number; totalPages?: number }) => void
): Promise<OcrExtractResult> {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  const isPdf = mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  const isImage =
    mimeType.startsWith('image/') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png');

  if (isPdf) {
    onProgress?.({ percent: 0, status: 'PDF 처리 중...', type: 'pdf', page: 0, totalPages: 0 });
    const result = await extractTextFromPDF(file, (progress) => {
      onProgress?.({
        percent: progress.percent,
        status: progress.status,
        type: 'pdf',
        page: progress.page,
        totalPages: progress.totalPages,
      });
    });
    return result;
  }

  if (isImage) {
    onProgress?.({ percent: 0, status: '이미지 처리 중...', type: 'image', page: 1, totalPages: 1 });
    const result = await extractTextFromImage(file, ({ percent, status }) => {
      onProgress?.({ percent, status, type: 'image', page: 1, totalPages: 1 });
    });
    onProgress?.({ percent: 100, status: '이미지 처리 완료', type: 'image', page: 1, totalPages: 1 });
    return result;
  }

  throw new Error('지원하지 않는 파일 형식입니다. PDF, JPG, PNG만 지원됩니다.');
}
