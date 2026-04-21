import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const CLOVA_OCR_URL = Deno.env.get('CLOVA_OCR_URL');
    const CLOVA_OCR_SECRET = Deno.env.get('CLOVA_OCR_SECRET');

    if (!CLOVA_OCR_URL || !CLOVA_OCR_SECRET) {
      throw new Error('Naver CLOVA OCR 환경 변수가 설정되지 않았습니다. (CLOVA_OCR_URL, CLOVA_OCR_SECRET)');
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

    // format 정규화 (CLOVA OCR은 jpg, jpeg, png, pdf, tiff 지원)
    if (format === 'jpeg') format = 'jpg';

    // Naver CLOVA OCR API 요청 본문
    const requestBody = {
      version: 'V2',
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      lang: 'ko',
      images: [
        {
          format,
          name: 'image',
          data: base64Data,
        },
      ],
    };

    console.log('=== Naver CLOVA OCR 요청 ===');
    console.log('format:', format);
    console.log('base64 길이:', base64Data.length);

    const ocrResponse = await fetch(CLOVA_OCR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OCR-SECRET': CLOVA_OCR_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error('Naver CLOVA OCR API error:', ocrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Naver CLOVA OCR API 호출 실패: ${ocrResponse.status} - ${errorText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const ocrJson = await ocrResponse.json();

    // 응답 검증
    const imageResult = ocrJson?.images?.[0];
    if (!imageResult || imageResult.inferResult !== 'SUCCESS') {
      const errMsg = imageResult?.message || '알 수 없는 오류';
      console.error('Naver CLOVA OCR 처리 실패:', errMsg);
      return new Response(
        JSON.stringify({ error: `Naver CLOVA OCR 처리 실패: ${errMsg}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // fields에서 텍스트 추출 (lineBreak 기준으로 줄바꿈)
    const fields = imageResult.fields || [];
    const lineParts: string[] = [];
    let currentLine = '';

    for (const field of fields) {
      const text = field.inferText ?? '';
      currentLine += text + ' ';

      if (field.lineBreak) {
        lineParts.push(currentLine.trim());
        currentLine = '';
      }
    }

    // 마지막 줄 처리
    if (currentLine.trim()) {
      lineParts.push(currentLine.trim());
    }

    const fullText = lineParts.join('\n').trim();
    console.log(`✅ CLOVA OCR 완료: ${fullText.length}자 추출`);

    return new Response(JSON.stringify({ text: fullText }), {
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

