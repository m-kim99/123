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

    // NICE BizAPI 인증 정보 (환경변수에서 가져옴)
    const NICE_BIZ_CLIENT_ID = Deno.env.get('NICE_BIZ_CLIENT_ID');
    const NICE_BIZ_CLIENT_SECRET = Deno.env.get('NICE_BIZ_CLIENT_SECRET');

    if (!NICE_BIZ_CLIENT_ID || !NICE_BIZ_CLIENT_SECRET) {
      console.error('NICE BizAPI credentials not configured');
      return json(
        { success: false, error: 'NICE BizAPI 설정이 필요합니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    console.log('=== NICE BizAPI 사업자 인증 요청 ===');
    console.log('bizno:', cleanBizNo);

    // NICE BizAPI 호출
    const apiUrl = `https://api.nicebizline.com/nice/sb/v1/api/biz-cert?bizno=${cleanBizNo}`;

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'client-id': NICE_BIZ_CLIENT_ID,
        'client-secret': NICE_BIZ_CLIENT_SECRET,
      },
    });

    console.log('=== NICE BizAPI 응답 ===');
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
      if (resp.status === 401) {
        console.error('NICE BizAPI authentication failed');
        return json(
          { success: false, error: 'API 인증 오류. 관리자에게 문의하세요.' },
          { status: 500 }
        );
      }
      if (resp.status === 429) {
        return json(
          { success: false, error: 'API 호출 한도 초과. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
      return json(
        { success: false, error: result?.moreInformation?.errorMessage || '사업자 인증에 실패했습니다.' },
        { status: resp.status }
      );
    }

    // 응답 데이터 파싱
    const items = result?.items;
    if (!items || items.count === '0' || !items.item || items.item.length === 0) {
      return json(
        { success: false, error: '해당 사업자 등록번호로 등록된 사업자가 없습니다.' },
        { status: 404 }
      );
    }

    const bizInfo = items.item[0];

    // 사업자 번호가 빈값이면 미등록 사업자
    if (!bizInfo.bizno) {
      return json(
        { success: false, error: '국세청에 등록되지 않은 사업자입니다.' },
        { status: 404 }
      );
    }

    // 성공 응답
    return json({
      success: true,
      item: {
        bizno: bizInfo.bizno,
        entrnm: bizInfo.entrnm, // 업체명
        repr: bizInfo.repr, // 대표자명
        tpyrstscd: bizInfo.tpyrstscd, // 휴폐업구분코드 (01: 계속사업자, 02: 휴업자, 03: 폐업자)
        tpyr_stsnm: bizInfo.tpyr_stsnm, // 휴폐업구분코드명
        obz_date: bizInfo.obz_date, // 개업일자
        txvsbzdnm: bizInfo.txvsbzdnm, // 업태명
        txvsitemnm: bizInfo.txvsitemnm, // 종목명
        pscrp_divnm: bizInfo.pscrp_divnm, // 개인법인구분명
        rdnm_koraddr: bizInfo.rdnm_koraddr, // 도로명주소
        nolt_koraddr: bizInfo.nolt_koraddr, // 지번주소
      },
    });
  } catch (error) {
    console.error('verify-business error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: message }, { status: 500 });
  }
});
