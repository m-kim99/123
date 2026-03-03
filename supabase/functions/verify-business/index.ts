import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bizno } = await req.json();

    // 사업자 등록번호 검증 (숫자 10자리)
    const cleanBizNo = (bizno || '').replace(/\D/g, '');
    if (!cleanBizNo || cleanBizNo.length !== 10) {
      return json(
        { success: false, error: '사업자 등록번호 10자리를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 국세청 사업자등록 상태조회 API 인증키 (환경변수에서 가져옴)
    const NTS_SERVICE_KEY = Deno.env.get('NTS_SERVICE_KEY');

    if (!NTS_SERVICE_KEY) {
      console.error('국세청 API 서비스키가 설정되지 않았습니다.');
      return json(
        { success: false, error: '국세청 API 설정이 필요합니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    console.log('=== 국세청 사업자등록 상태조회 요청 ===');
    console.log('bizno:', cleanBizNo);

    // 국세청 상태조회 API 호출 (POST)
    const apiUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(NTS_SERVICE_KEY)}`;

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ b_no: [cleanBizNo] }),
    });

    console.log('=== 국세청 API 응답 ===');
    console.log('HTTP Status:', resp.status);

    const result = await resp.json();
    console.log('Response Body:', JSON.stringify(result, null, 2));

    // 오류 응답 처리
    if (!resp.ok) {
      if (resp.status === 400) {
        return json(
          { success: false, error: '잘못된 사업자 등록번호입니다.' },
          { status: 400 }
        );
      }
      if (resp.status === 413) {
        return json(
          { success: false, error: '요청이 너무 큽니다. 다시 시도해주세요.' },
          { status: 413 }
        );
      }
      return json(
        { success: false, error: result?.msg || '사업자 인증에 실패했습니다.' },
        { status: resp.status }
      );
    }

    // 응답 데이터 파싱
    const data = result?.data;
    if (!data || data.length === 0) {
      return json(
        { success: false, error: '해당 사업자 등록번호로 조회된 결과가 없습니다.' },
        { status: 404 }
      );
    }

    const bizInfo = data[0];

    // 국세청에 등록되지 않은 사업자 체크
    if (!bizInfo.b_stt_cd || bizInfo.b_stt === '국세청에 등록되지 않은 사업자등록번호입니다.') {
      return json(
        { success: false, error: '국세청에 등록되지 않은 사업자등록번호입니다.' },
        { status: 404 }
      );
    }

    // 성공 응답
    return json({
      success: true,
      item: {
        b_no: bizInfo.b_no,             // 사업자등록번호
        b_stt: bizInfo.b_stt,           // 사업자상태 (계속사업자, 휴업자, 폐업자)
        b_stt_cd: bizInfo.b_stt_cd,     // 상태코드 (01: 계속사업자, 02: 휴업자, 03: 폐업자)
        tax_type: bizInfo.tax_type,     // 과세유형 (부가가치세 일반과세자 등)
        tax_type_cd: bizInfo.tax_type_cd, // 과세유형코드
        end_dt: bizInfo.end_dt,         // 폐업일자
        utcc_yn: bizInfo.utcc_yn,       // 단위과세전환폐업여부
        invoice_apply_dt: bizInfo.invoice_apply_dt, // 세금계산서적용일자
      },
    });
  } catch (error) {
    console.error('verify-business error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, { status: 500 });
  }
});
