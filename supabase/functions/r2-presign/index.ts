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
      await r2.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: list.map((k) => ({ Key: k })) },
      }));
      return json({ success: true });
    }

    return json({ error: '알 수 없는 action' }, 400);
  } catch (error) {
    console.error('r2-presign 오류:', error);
    return json({ error: error instanceof Error ? error.message : '알 수 없는 오류' }, 500);
  }
});
