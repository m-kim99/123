import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * OCR 추출 텍스트에서 개인정보를 정규식 기반으로 마스킹
 * 대상: 주민등록번호, 운전면허번호, 여권번호, 카드번호, 휴대전화, 일반전화, 이메일
 */
function maskPersonalInfo(text: string): string {
  let masked = text;

  // 1. 주민등록번호 (YYMMDD-GXXXXXX, G=1~4)
  masked = masked.replace(
    /(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))\s*[-–]\s*([1-4]\d{6})/g,
    '$1-*******',
  );

  // 2. 운전면허번호 (지역코드2자리-6자리-2자리)
  masked = masked.replace(
    /(\d{2})-(\d{6})-(\d{2})/g,
    '$1-******-$3',
  );

  // 3. 여권번호 (알파벳 1~2자 + 숫자 7~8자)
  masked = masked.replace(
    /\b([A-Z]{1,2})(\d{7,8})\b/g,
    (_: string, prefix: string, nums: string) => {
      return prefix + nums[0] + '*'.repeat(nums.length - 2) + nums[nums.length - 1];
    },
  );

  // 4. 신용카드번호 (16자리, 4-4-4-4)
  masked = masked.replace(
    /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/g,
    '$1-****-****-$4',
  );

  // 5. 휴대전화번호 (010-XXXX-XXXX 등)
  masked = masked.replace(
    /(01[016789])[-.]?\s?(\d{3,4})[-.]?\s?(\d{4})/g,
    '$1-****-$3',
  );

  // 6. 일반전화번호 (02-XXXX-XXXX, 031-XXX-XXXX 등)
  masked = masked.replace(
    /(0[2-6]\d?)[-.]\s?(\d{3,4})[-.]\s?(\d{4})/g,
    '$1-****-$3',
  );

  // 7. 이메일 주소
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
 * 텍스트에 개인정보 패턴이 포함되어 있는지 여부 판단 (바운딩박스 수집용)
 */
function containsPersonalInfo(text: string): boolean {
  const patterns = [
    /(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))\s*[-–]\s*([1-4]\d{6})/,  // 주민등록번호
    /(\d{2})-(\d{6})-(\d{2})/,  // 운전면허번호
    /\b([A-Z]{1,2})(\d{7,8})\b/,  // 여권번호
    /\b(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})\b/,  // 카드번호
    /(01[016789])[-.]?\s?(\d{3,4})[-.]?\s?(\d{4})/,  // 휴대전화
    /(0[2-6]\d?)[-.]\s?(\d{3,4})[-.]\s?(\d{4})/,  // 일반전화
    /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,  // 이메일
  ];
  return patterns.some((re) => re.test(text));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: '지원하지 않는 HTTP 메서드입니다. POST만 지원됩니다.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const NHN_OCR_APP_KEY = Deno.env.get('NHN_OCR_APP_KEY');
    const NHN_OCR_SECRET_KEY = Deno.env.get('NHN_OCR_SECRET_KEY');

    if (!NHN_OCR_APP_KEY || !NHN_OCR_SECRET_KEY) {
      throw new Error('NHN Cloud OCR 환경 변수가 설정되지 않았습니다.');
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body.imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: '유효하지 않은 요청입니다. imageBase64 필드는 필수입니다.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const imageBase64Input = body.imageBase64 as string;
    const mimeType = typeof body.mimeType === 'string' ? (body.mimeType as string) : undefined;
    const debugMode = body.debug === true;

    let base64Data = imageBase64Input;
    let format = 'jpg';

    // data URL("data:image/png;base64,...") 형식과 순수 base64 문자열 모두 지원
    const dataUrlMatch = imageBase64Input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (dataUrlMatch) {
      const [, mime, data] = dataUrlMatch;
      base64Data = data;
      format = mime.split('/')[1] || 'jpg';
    } else if (mimeType) {
      format = mimeType.split('/')[1] || 'jpg';
    }

    // base64 → Uint8Array 변환 (multipart/form-data 전송용)
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const resolvedMime = mimeType || 'image/jpeg';
    const ext = format === 'jpeg' ? 'jpg' : format;
    const blob = new Blob([bytes], { type: resolvedMime });
    const formData = new FormData();
    formData.append('image', blob, `image.${ext}`);

    const apiUrl = `https://ocr.api.nhncloudservice.com/v1.0/appkeys/${NHN_OCR_APP_KEY}/general`;

    const ocrResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': NHN_OCR_SECRET_KEY,
      },
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('NHN Cloud OCR API error:', ocrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `NHN Cloud OCR API 호출 실패: ${ocrResponse.status} - ${errorText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const ocrJson = await ocrResponse.json();

    if (!ocrJson?.header?.isSuccessful) {
      console.error('NHN Cloud OCR API 응답 오류:', JSON.stringify(ocrJson?.header));
      return new Response(
        JSON.stringify({ error: `NHN Cloud OCR 처리 실패: ${ocrJson?.header?.resultMessage ?? '알 수 없는 오류'}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const textPieces: string[] = [];
    // PII 바운딩박스 수집: 개인정보가 포함된 텍스트 영역의 좌표
    const piiRegions: Array<{ x: number; y: number; w: number; h: number }> = [];

    // NHN General OCR 좌표 형식 {x1,y1,x2,y2,x3,y3,x4,y4} → {x,y,w,h} 변환
    const boxToRegion = (box: any): { x: number; y: number; w: number; h: number } | null => {
      if (!box || typeof box !== 'object') return null;
      const xs = [box.x1, box.x2, box.x3, box.x4].filter((n: any) => typeof n === 'number');
      const ys = [box.y1, box.y2, box.y3, box.y4].filter((n: any) => typeof n === 'number');
      if (xs.length < 4 || ys.length < 4) return null;
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    };

    // boundingPoly.vertices 형식 fallback 변환
    const verticesToRegion = (vertices: any): { x: number; y: number; w: number; h: number } | null => {
      if (!Array.isArray(vertices) || vertices.length < 4) return null;
      const xs = vertices.map((v: { x: number }) => v.x);
      const ys = vertices.map((v: { y: number }) => v.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    };

    const inferLines = Array.isArray(ocrJson?.result?.listOfInferTexts)
      ? ocrJson.result.listOfInferTexts
      : [];
    // ★ NHN General OCR은 좌표를 listOfInferTexts와 병렬 배열인 listOfBoundingBoxes로 반환
    //   (inferTexts에는 value/conf만 있고 boundingPoly는 존재하지 않음)
    const boundingBoxes = Array.isArray(ocrJson?.result?.listOfBoundingBoxes)
      ? ocrJson.result.listOfBoundingBoxes
      : [];

    for (let lineIdx = 0; lineIdx < inferLines.length; lineIdx++) {
      const line = inferLines[lineIdx];
      if (!Array.isArray(line?.inferTexts)) continue;

      const validFields = line.inferTexts.filter(
        (t: { value?: string }) => typeof t?.value === 'string' && t.value.trim()
      );

      // 라인 전체 텍스트를 합쳐서 PII 검사 (개별 필드는 단어가 쪼개져 패턴 매칭 실패)
      const lineText = validFields
        .map((t: { value: string }) => t.value.trim())
        .join(' ');

      if (lineText) {
        textPieces.push(lineText);
      }

      if (!lineText || !containsPersonalInfo(lineText)) continue;

      let collected = 0;

      // 1순위: listOfBoundingBoxes[lineIdx].boundingBoxes (NHN General OCR 실제 구조, 라이브 응답으로 검증됨)
      const lineBoxEntry = boundingBoxes[lineIdx];
      const lineBoxes = Array.isArray(lineBoxEntry?.boundingBoxes)
        ? lineBoxEntry.boundingBoxes
        : Array.isArray(lineBoxEntry)
          ? lineBoxEntry
          : [];
      for (const box of lineBoxes) {
        const region = boxToRegion(box);
        if (region) {
          piiRegions.push(region);
          collected++;
        }
      }

      // 2순위: boundingPoly 형식 fallback (다른 OCR 응답 호환)
      if (collected === 0) {
        const lineRegion = verticesToRegion(line?.boundingPoly?.vertices);
        if (lineRegion) {
          piiRegions.push(lineRegion);
          collected++;
        } else {
          for (const field of validFields) {
            const fieldRegion = verticesToRegion(field?.boundingPoly?.vertices);
            if (fieldRegion) {
              piiRegions.push(fieldRegion);
              collected++;
            }
          }
        }
      }

      if (collected > 0) {
        console.log(`🔒 PII 감지 라인: "${lineText}" → ${collected}개 영역 수집`);
      } else {
        // 좌표 수집 실패 시 디버깅용 구조 로그
        console.warn(
          `⚠️ PII 감지됐으나 좌표 없음 (lineIdx=${lineIdx}):`,
          JSON.stringify({
            lineKeys: Object.keys(line || {}),
            boxSample: boundingBoxes[lineIdx] ?? null,
            totalBoxes: boundingBoxes.length,
          }).slice(0, 500),
        );
      }
    }

    const fullText = textPieces.join('\n').trim();

    // 개인정보 마스킹 적용
    const maskedText = maskPersonalInfo(fullText);

    const responsePayload: Record<string, unknown> = { text: maskedText, piiRegions };
    if (debugMode) {
      responsePayload.rawResult = ocrJson?.result ?? null;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('naver-ocr function error:', error);
    const message =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return new Response(
      JSON.stringify({ error: `OCR 처리 중 오류가 발생했습니다: ${message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

