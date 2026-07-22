import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * FCM HTTP v1 API용 액세스 토큰 생성 (Android)
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

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

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

async function sendViaFcm(
  token: string,
  title: string,
  message: string,
  customUrl: string | undefined,
  accessToken: string,
  projectId: string
): Promise<void> {
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
}

/**
 * APNs 인증 JWT 생성 (ES256) - Function 인스턴스가 warm한 동안 캐시해 재사용.
 * APNs 토큰은 최대 1시간 유효하므로 50분마다 새로 발급.
 */
let cachedApnsJwt: { token: string; iat: number } | null = null;

async function getApnsJwt(teamId: string, keyId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && now - cachedApnsJwt.iat < 50 * 60) {
    return cachedApnsJwt.token;
  }

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: now };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // WebCrypto ECDSA 서명은 JWT(ES256)가 요구하는 IEEE P1363(raw r||s) 포맷을 그대로 반환한다.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${signatureB64}`;
  cachedApnsJwt = { token: jwt, iat: now };
  return jwt;
}

async function sendViaApns(
  deviceToken: string,
  title: string,
  message: string,
  customUrl: string | undefined,
  jwt: string,
  topic: string
): Promise<void> {
  const payload = {
    aps: {
      alert: { title, body: message },
      sound: 'default',
      badge: 1,
    },
    custom_url: customUrl,
  };

  const res = await fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`APNs 오류 (${deviceToken.slice(0, 12)}...): ${res.status} ${errText}`);
  }
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

    // 보안: 클라이언트가 FCM 토큰을 직접 넘기지 않는다.
    // 대신 발송 대상(회사/부서 또는 유저 ID)만 받고, service_role로 서버에서 토큰을 조회한다.
    // 이렇게 하면 임의 토큰으로의 스팸/피싱 푸시를 막고, 발신자 권한(같은 회사)도 검증할 수 있다.
    const { target, title, message, customUrl } = await req.json();
    console.log('[PUSH] 요청 데이터:', { target, title, message });

    if (!target || typeof target !== 'object') {
      return new Response(JSON.stringify({ error: 'target(발송 대상)이 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // service_role 클라이언트 (대상/토큰 해석용)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 발신자의 회사 확인 (권한 경계)
    const { data: caller } = await admin
      .from('users')
      .select('id, company_id')
      .eq('id', user.id)
      .single();
    if (!caller?.company_id) {
      return new Response(JSON.stringify({ error: '발신자 회사 정보를 확인할 수 없습니다' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 발송 대상 유저 ID 해석
    let recipientIds: string[] = [];
    if (Array.isArray(target.userIds)) {
      // 특정 유저 대상: 반드시 같은 회사 유저로 제한
      const { data: users } = await admin
        .from('users')
        .select('id')
        .eq('company_id', caller.company_id)
        .in('id', target.userIds);
      recipientIds = (users ?? []).map((u: { id: string }) => u.id);
    } else if (target.companyId) {
      // 회사/부서 대상: 발신자 회사와 일치해야 함
      if (target.companyId !== caller.company_id) {
        return new Response(JSON.stringify({ error: '다른 회사로 푸시를 보낼 수 없습니다' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: users } = await admin
        .from('users')
        .select('id, role, department_id')
        .eq('company_id', target.companyId);
      const deptId = target.departmentId ?? null;
      recipientIds = (users ?? [])
        .filter((u: { role: string; department_id: string | null }) => {
          if (u.role === 'admin') return true; // 관리자: 부서 무관 전체 수신
          if (!deptId) return true; // 부서 미지정 알림: 전체 수신
          return u.department_id === deptId; // 팀원: 같은 부서만
        })
        .map((u: { id: string }) => u.id);
    } else {
      return new Response(JSON.stringify({ error: 'target에 userIds 또는 companyId가 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 대상 유저들의 기기 토큰 수집 (다중 기기) - platform으로 FCM(Android)/APNs(iOS) 분기
    const { data: tokenRows } = await admin
      .from('user_device_tokens')
      .select('token, platform')
      .in('user_id', recipientIds);

    const androidTokens = (tokenRows ?? [])
      .filter((r: { platform: string | null }) => r.platform !== 'ios')
      .map((r: { token: string }) => r.token)
      .filter(Boolean);
    const iosTokens = (tokenRows ?? [])
      .filter((r: { platform: string | null }) => r.platform === 'ios')
      .map((r: { token: string }) => r.token)
      .filter(Boolean);

    if (androidTokens.length === 0 && iosTokens.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendResults: PromiseSettledResult<void>[] = [];

    // Android: FCM
    if (androidTokens.length > 0) {
      const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
      const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
      if (!serviceAccountJson || !projectId) {
        console.error('[PUSH] FCM 설정 없음(FIREBASE_SERVICE_ACCOUNT/FIREBASE_PROJECT_ID) - Android 발송 스킵');
      } else {
        const serviceAccount = JSON.parse(serviceAccountJson);
        const accessToken = await getAccessToken(serviceAccount);
        const results = await Promise.allSettled(
          androidTokens.map((token: string) =>
            sendViaFcm(token, title, message, customUrl, accessToken, projectId)
          )
        );
        sendResults.push(...results);
      }
    }

    // iOS: APNs 직접 발송 (FCM을 거치지 않음 - APNs 원본 토큰이라 FCM에 넣으면 항상 실패함)
    if (iosTokens.length > 0) {
      const apnsKey = Deno.env.get('APNS_AUTH_KEY');
      const apnsKeyId = Deno.env.get('APNS_KEY_ID');
      const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
      const apnsTopic = Deno.env.get('APNS_TOPIC');
      if (!apnsKey || !apnsKeyId || !apnsTeamId || !apnsTopic) {
        console.error('[PUSH] APNs 설정 없음(APNS_AUTH_KEY/APNS_KEY_ID/APNS_TEAM_ID/APNS_TOPIC) - iOS 발송 스킵');
      } else {
        const jwt = await getApnsJwt(apnsTeamId, apnsKeyId, apnsKey);
        const results = await Promise.allSettled(
          iosTokens.map((token: string) => sendViaApns(token, title, message, customUrl, jwt, apnsTopic))
        );
        sendResults.push(...results);
      }
    }

    const successCount = sendResults.filter((r) => r.status === 'fulfilled').length;
    const failCount = sendResults.filter((r) => r.status === 'rejected').length;
    const errors = sendResults
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
