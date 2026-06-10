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

/**
 * 클라이언트측 개인정보 포함 여부 판단
 */
const PII_PATTERNS = [
  /(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))\s*[-–]\s*([1-4]\d{6})/,  // 주민등록번호
  /(\d{2})-(\d{6})-(\d{2})/,  // 운전면허번호
  /\b([A-Z]{1,2})(\d{7,8})\b/,  // 여권번호
  /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/,  // 카드번호
  /(01[016789])[-.]?\s?(\d{3,4})[-.]?\s?(\d{4})/,  // 휴대전화
  /(0[2-6]\d?)[-.](\d{3,4})[-.](\d{4})/,  // 일반전화
  /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,  // 이메일
];

function containsPersonalInfo(text: string): boolean {
  return PII_PATTERNS.some((re) => re.test(text));
}

function maskPersonalInfo(text: string): string {
  let masked = text;
  masked = masked.replace(
    /(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))\s*[-–]\s*([1-4]\d{6})/g,
    '$1-*******',
  );
  masked = masked.replace(/(\d{2})-(\d{6})-(\d{2})/g, '$1-******-$3');
  masked = masked.replace(
    /\b([A-Z]{1,2})(\d{7,8})\b/g,
    (_: string, prefix: string, nums: string) =>
      prefix + nums[0] + '*'.repeat(nums.length - 2) + nums[nums.length - 1],
  );
  masked = masked.replace(
    /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/g,
    '$1-****-****-$4',
  );
  masked = masked.replace(
    /(01[016789])[-.]?\s?(\d{3,4})[-.]?\s?(\d{4})/g,
    '$1-****-$3',
  );
  masked = masked.replace(
    /(0[2-6]\d?)[-.](\d{3,4})[-.](\d{4})/g,
    '$1-****-$3',
  );
  masked = masked.replace(
    /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    (_: string, local: string, domain: string) => {
      if (local.length <= 2) return '**@' + domain;
      return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain;
    },
  );
  return masked;
}

/**
 * PDF.js textContent items에서 PII 영역의 바운딩박스 추출 (캔버스 좌표계)
 */
function extractPiiRegionsFromTextContent(
  textItems: any[],
  viewport: any,
): PiiRegion[] {
  const regions: PiiRegion[] = [];

  // 라인별로 그룹핑 (y좌표 기준)
  const lineGroups: Map<number, any[]> = new Map();
  for (const item of textItems) {
    if (!item.str || !item.str.trim()) continue;
    // transform: [scaleX, skewX, skewY, scaleY, tx, ty]
    const ty = Math.round(item.transform[5]);
    if (!lineGroups.has(ty)) lineGroups.set(ty, []);
    lineGroups.get(ty)!.push(item);
  }

  for (const [, items] of lineGroups) {
    const lineText = items.map((it: any) => it.str).join(' ');
    if (!containsPersonalInfo(lineText)) continue;

    // 이 라인의 모든 아이템 바운딩박스 수집
    for (const item of items) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontSize = Math.abs(item.transform[0]) || 12;
      const w = item.width || fontSize * item.str.length * 0.6;
      const h = item.height || fontSize;

      // PDF 좌표(좌하단 원점) → 캔버스 좌표(좌상단 원점) 변환
      const [canvasX, canvasY] = viewport.convertToViewportPoint(tx, ty);
      // PDF의 ty는 글자 baseline이므로 위로 fontSize만큼 올림
      const [, topY] = viewport.convertToViewportPoint(tx, ty + h);

      const scaledW = w * viewport.scale;

      regions.push({
        x: canvasX,
        y: topY,
        w: scaledW,
        h: Math.abs(canvasY - topY),
      });
    }
  }

  return regions;
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
 * dataURL을 Canvas로 로드 (마스킹 PDF 생성 시 재렌더링 방지용)
 */
async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  return canvas;
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

    // 페이지별 텍스트 (병렬 처리 후 순서대로 조립)
    const pageTexts: Map<number, string> = new Map();
    // 페이지별 PII 좌표 수집 (key: pageNum)
    const piiRegionsByPage: Map<number, PiiRegion[]> = new Map();
    // 페이지별 OCR/좌표 기준 이미지 크기 (마스킹 시 좌표 스케일링용)
    const ocrDimsByPage: Map<number, { width: number; height: number }> = new Map();
    // OCR 페이지 렌더 이미지 캐시 (마스킹 PDF 생성 시 재렌더링 방지)
    const pageDataUrls: Map<number, string> = new Map();
    let textLayerPageCount = 0;
    let ocrPageCount = 0;
    let completedPages = 0;

    // 페이지 단위 처리 함수 (병렬 실행용)
    const processPage = async (pageNum: number): Promise<void> => {
      try {
        console.log(`📄 페이지 ${pageNum}/${totalPages} 처리 시작...`);

        const page = await pdf.getPage(pageNum);
        
        // 1단계: 텍스트 레이어에서 텍스트 추출 시도 (문자 PDF)
        let textLayerText = '';
        let textContent: any = null;
        try {
          textContent = await page.getTextContent();
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

          // 개인정보 마스킹 적용
          const maskedTextLayerText = maskPersonalInfo(textLayerText);
          pageTexts.set(pageNum, `\n--- 페이지 ${pageNum} ---\n${maskedTextLayerText}\n`);

          // PII가 감지되면 textContent 좌표에서 바운딩박스 추출
          if (containsPersonalInfo(textLayerText)) {
            try {
              const viewport = page.getViewport({ scale: 2.0 });
              const pagePiiRegions = extractPiiRegionsFromTextContent(textContent.items, viewport);
              if (pagePiiRegions.length > 0) {
                piiRegionsByPage.set(pageNum, pagePiiRegions);
                ocrDimsByPage.set(pageNum, { width: viewport.width, height: viewport.height });
                console.log(`🔒 페이지 ${pageNum}: 텍스트 레이어에서 PII ${pagePiiRegions.length}개 영역 감지`);
              }
            } catch (piiError) {
              console.warn(`⚠️ 페이지 ${pageNum}: PII 좌표 추출 실패`, piiError);
            }
          }

          textLayerPageCount++;
          return;
        }

        // 2단계: 텍스트 레이어가 없으면 OCR 사용 (스캔/이미지 PDF)
        console.log(`🖼️ 페이지 ${pageNum}: 텍스트 레이어 없음, OCR 실행...`);

        // PDF 페이지를 이미지로 변환 (JPEG: PNG 대비 용량 1/3 이하 → 전송/OCR 속도 개선)
        const canvas = await convertPDFPageToImage(pdf, pageNum, 2.0);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        let ocrImageDims = { width: canvas.width, height: canvas.height };
        canvas.width = 0;
        canvas.height = 0;
        let imageSizeMB = (dataUrl.length * 3) / 4 / 1024 / 1024;

        if (imageSizeMB > 4.5) {
          console.warn(`⚠️ 페이지 ${pageNum}: 이미지 크기 초과 (${imageSizeMB.toFixed(2)}MB), 해상도 낮춤`);
          const smallerCanvas = await convertPDFPageToImage(pdf, pageNum, 1.5);
          dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.85);
          ocrImageDims = { width: smallerCanvas.width, height: smallerCanvas.height };
          smallerCanvas.width = 0;
          smallerCanvas.height = 0;
          imageSizeMB = (dataUrl.length * 3) / 4 / 1024 / 1024;
          console.log(`🔄 해상도 조정 후: ${imageSizeMB.toFixed(2)}MB`);

          if (imageSizeMB > 4.5) {
            throw new Error(`페이지 ${pageNum} 이미지 크기가 너무 큽니다 (${imageSizeMB.toFixed(2)}MB). OCR 처리를 건너뜁니다.`);
          }
        } else {
          console.log(`📊 페이지 ${pageNum} 이미지 크기: ${imageSizeMB.toFixed(2)}MB`);
        }

        // 렌더 이미지 캐시 (마스킹 PDF 생성 시 재렌더링 방지)
        pageDataUrls.set(pageNum, dataUrl);

        const { text, piiRegions } = await performOCR(dataUrl, pageNum);

        if (text && text.trim()) {
          pageTexts.set(pageNum, `\n--- 페이지 ${pageNum} ---\n${text.trim()}\n`);
          console.log(`✅ 페이지 ${pageNum} OCR 완료 (${text.length}자, PII영역: ${piiRegions.length}개)`);
        } else {
          console.warn(`⚠️ 페이지 ${pageNum}: OCR 결과 텍스트 없음`);
          pageTexts.set(pageNum, `\n--- 페이지 ${pageNum} ---\n(텍스트 없음)\n`);
        }

        if (piiRegions.length > 0) {
          piiRegionsByPage.set(pageNum, piiRegions);
          ocrDimsByPage.set(pageNum, ocrImageDims);
        }

        ocrPageCount++;
      } catch (pageError) {
        console.error(`❌ 페이지 ${pageNum} 처리 오류:`, pageError);
        pageTexts.set(
          pageNum,
          `\n--- 페이지 ${pageNum} ---\n(처리 오류: ${
            pageError instanceof Error ? pageError.message : String(pageError)
          })\n`
        );
        // 페이지 오류가 발생해도 다른 페이지 계속 처리
      } finally {
        completedPages++;
        onProgress?.({
          page: completedPages,
          totalPages,
          percent: Math.round((completedPages / totalPages) * 100),
          status: `페이지 ${completedPages}/${totalPages} 처리 완료`,
        });
      }
    };

    // 병렬 처리 (동시 3페이지) — 순차 처리 대비 2~3배 단축
    const CONCURRENCY = 3;
    for (let start = 1; start <= totalPages; start += CONCURRENCY) {
      const batch: Promise<void>[] = [];
      for (let p = start; p < start + CONCURRENCY && p <= totalPages; p++) {
        batch.push(processPage(p));
      }
      await Promise.all(batch);
    }

    // 모든 페이지 텍스트를 페이지 순서대로 합치기
    const fullText = Array.from({ length: totalPages }, (_, i) => pageTexts.get(i + 1) ?? '')
      .filter(Boolean)
      .join('\n');
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
        let maskedPdf: any = null;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const regions = piiRegionsByPage.get(pageNum);
          const cachedUrl = pageDataUrls.get(pageNum);

          let imgData: string;
          let imgW: number;
          let imgH: number;

          if (regions && regions.length > 0) {
            // 마스킹 필요 — OCR 단계 캐시 이미지 재사용, 없으면(텍스트 레이어 페이지) 렌더링
            const canvas = cachedUrl
              ? await dataUrlToCanvas(cachedUrl)
              : await convertPDFPageToImage(pdf, pageNum, 2.0);
            const dims = ocrDimsByPage.get(pageNum);
            applyPiiMaskToCanvas(
              canvas,
              regions,
              dims?.width ?? canvas.width,
              dims?.height ?? canvas.height,
            );
            imgData = canvas.toDataURL('image/jpeg', 0.9);
            imgW = canvas.width;
            imgH = canvas.height;
            canvas.width = 0;
            canvas.height = 0;
          } else if (cachedUrl) {
            // PII 없는 OCR 페이지 — 재렌더링 없이 캐시 이미지 그대로 사용
            imgData = cachedUrl;
            const dims = await getImageDimensions(cachedUrl);
            imgW = dims.width;
            imgH = dims.height;
          } else {
            // PII 없는 텍스트 레이어 페이지 — 렌더링 필요
            const canvas = await convertPDFPageToImage(pdf, pageNum, 2.0);
            imgData = canvas.toDataURL('image/jpeg', 0.9);
            imgW = canvas.width;
            imgH = canvas.height;
            canvas.width = 0;
            canvas.height = 0;
          }

          // 원본 페이지 비율 유지 (scale 2.0 렌더 → pt 환산 1/2)
          const pageW = imgW / 2;
          const pageH = imgH / 2;
          const orientation = pageW > pageH ? 'l' : 'p';
          if (!maskedPdf) {
            maskedPdf = new jsPDF({ orientation, unit: 'pt', format: [pageW, pageH] });
          } else {
            maskedPdf.addPage([pageW, pageH], orientation);
          }
          maskedPdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
        }

        const pdfBlob = maskedPdf.output('blob');
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        maskedFile = new File([pdfBlob], `${baseName}.pdf`, { type: 'application/pdf' });
        console.log(`🔒 PDF PII 마스킹 완료`);
      } catch (maskError) {
        console.error('PDF 마스킹 실패 (원본 파일 사용):', maskError);
      }
    }

    // 렌더 이미지 캐시 해제
    pageDataUrls.clear();

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
 * OCR 처리 헬퍼 함수 (타임아웃 및 에러 핸들링) — 텍스트와 piiRegions 반환
 */
async function performOCR(
  dataUrl: string,
  pageNum: number,
): Promise<{ text: string | null; piiRegions: PiiRegion[] }> {
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

  const { data, error } = await Promise.race([ocrPromise, timeoutPromise]);

  if (error) {
    console.error(`❌ 페이지 ${pageNum} OCR 오류:`, error);
    throw new Error(error.message || 'OCR 처리 중 오류가 발생했습니다.');
  }

  return {
    text: ((data as any)?.text as string | undefined) ?? null,
    piiRegions: ((data as any)?.piiRegions as PiiRegion[] | undefined) ?? [],
  };
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
