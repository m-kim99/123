import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FCM HTTP v1 API용 액세스 토큰 생성
 * Firebase 서비스 계정 JSON으로 JWT 서명 후 Google OAuth2 토큰 교환
 */
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64URL 인코딩
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  // RSA-SHA256 서명
  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Google OAuth2 토큰 교환
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    throw new Error(`OAuth2 토큰 교환 실패: ${await tokenRes.text()}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 인증 헤더 확인
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('[PUSH] Edge Function 호출됨');

    // 사용자 세션 검증
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '유효하지 않은 세션입니다' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Firebase 서비스 계정 JSON (환경변수에서 읽기)
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');

    if (!serviceAccountJson || !projectId) {
      return new Response(JSON.stringify({ error: 'Firebase 설정이 없습니다. FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID를 설정하세요.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    const { playerIds, title, message, customUrl } = await req.json();
    console.log('[PUSH] 요청 데이터:', { tokenCount: playerIds?.length, title, message });

    // playerIds는 실제로 FCM 토큰 배열
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return new Response(JSON.stringify({ error: '유효한 FCM 토큰이 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // FCM 액세스 토큰 발급
    const accessToken = await getAccessToken(serviceAccount);

    // 각 토큰에 대해 FCM 발송 (최대 500개 병렬)
    const results = await Promise.allSettled(
      playerIds.map(async (token: string) => {
        const fcmPayload = {
          message: {
            token,
            notification: {
              title,
              body: message,
            },
            android: {
              priority: 'high' as const,
              notification: {
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              },
            },
            apns: {
              headers: {
                'apns-priority': '10',
              },
              payload: {
                aps: {
                  alert: {
                    title,
                    body: message,
                  },
                  sound: 'default',
                  badge: 1,
                },
              },
            },
            data: customUrl ? { custom_url: customUrl } : undefined,
          },
        };

        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`FCM 오류 (${token.slice(0, 20)}...): ${errText}`);
        }

        return res.json();
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || String(r.reason));
    console.log('[PUSH] 결과:', { successCount, failCount, errors });

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('푸시 발송 오류:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '알 수 없는 오류' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
