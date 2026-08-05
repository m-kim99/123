import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.632.0';
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.632.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 인증: 로그인된 사용자만 사용 가능
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: '유효하지 않은 세션입니다' }, 401);
    }

    // service_role 클라이언트 (소유권 검증용 — RLS와 무관하게 사실관계만 조회)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 호출자의 회사 확인 (테넌트 경계)
    const { data: caller } = await admin
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();
    const companyId = caller?.company_id as string | undefined;
    if (!companyId) {
      return json({ error: '회사 정보를 확인할 수 없습니다' }, 403);
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY');
    const secretAccessKey = Deno.env.get('R2_SECRET_KEY');
    const bucket = Deno.env.get('R2_BUCKET');
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return json({ error: 'R2 설정이 서버에 없습니다 (R2_ACCOUNT_ID/R2_ACCESS_KEY/R2_SECRET_KEY/R2_BUCKET)' }, 500);
    }

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const { action, key, keys, contentType } = await req.json();

    if (action === 'upload') {
      if (!key || typeof key !== 'string') {
        return json({ error: 'key가 필요합니다' }, 400);
      }
      // 업로드 키는 반드시 자기 회사 네임스페이스 안이어야 한다 (타사 객체 덮어쓰기 차단).
      const prefix = `${companyId}/`;
      if (!key.startsWith(prefix)) {
        return json({ error: '허용되지 않은 업로드 경로입니다' }, 403);
      }
      // 남은 부분은 단일 파일명만 허용 — 하위 경로/상위 이동(..) 차단.
      const objectName = key.slice(prefix.length);
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(objectName)) {
        return json({ error: '허용되지 않은 파일명입니다' }, 400);
      }
      const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType || 'application/octet-stream',
      });
      const url = await getSignedUrl(r2, cmd, { expiresIn: 300 }); // 5분 만료
      return json({ url });
    }

    if (action === 'delete') {
      const list: string[] = Array.isArray(keys) ? keys.filter((k) => typeof k === 'string' && k) : [];
      if (list.length === 0) return json({ success: true });

      // 삭제는 "자기 회사 문서로 등록된 경로"만 허용한다.
      // 경로 접두사 대신 documents 테이블을 근거로 확인하므로,
      // 접두사 규칙 이전에 업로드된 레거시 경로도 정상 삭제된다.
      // 휴지통 비우기처럼 목록이 길 수 있어 조회/삭제 모두 청크로 나눈다
      // (PostgREST 는 in() 이 URL 로 나가 길이 제한이 있고, DeleteObjects 는 1회 1000건 상한).
      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      const allowed = new Set<string>();
      for (const part of chunk(list, 100)) {
        const { data: owned, error: ownedError } = await admin
          .from('documents')
          .select('file_path')
          .eq('company_id', companyId)
          .in('file_path', part);
        if (ownedError) {
          return json({ error: '삭제 권한을 확인하지 못했습니다' }, 500);
        }
        for (const d of owned ?? []) allowed.add((d as { file_path: string }).file_path);
      }

      const target = list.filter((k) => allowed.has(k));
      const refused = list.length - target.length;
      if (refused > 0) {
        console.warn(`r2-presign delete: 소유하지 않은 키 ${refused}건 거부 (company=${companyId})`);
      }
      if (target.length === 0) {
        return json({ success: true, deleted: 0, refused });
      }

      for (const part of chunk(target, 1000)) {
        await r2.send(new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: part.map((k) => ({ Key: k })) },
        }));
      }
      return json({ success: true, deleted: target.length, refused });
    }

    return json({ error: '알 수 없는 action' }, 400);
  } catch (error) {
    console.error('r2-presign 오류:', error);
    return json({ error: error instanceof Error ? error.message : '알 수 없는 오류' }, 500);
  }
});
