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

    if (Array.isArray(ocrJson?.result?.listOfInferTexts)) {
      for (const line of ocrJson.result.listOfInferTexts) {
        if (Array.isArray(line?.inferTexts)) {
          const lineText = line.inferTexts
            .filter((t: { value?: string }) => typeof t?.value === 'string' && t.value.trim())
            .map((t: { value: string }) => t.value.trim())
            .join(' ');
          if (lineText) {
            textPieces.push(lineText);
          }
        }
      }
    }

    const fullText = textPieces.join('\n').trim();

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

