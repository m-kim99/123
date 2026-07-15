import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// 온보딩 초기 구조 AI 제안
// 업종 템플릿(베이스) + 회사 소개(자유 텍스트)를 받아
// 부서/대분류 구조 JSON을 생성한다.
// - 생성만 하고 DB에 쓰지 않음 (클라이언트 미리보기에서 수정 후 생성)
// - AI 챗봇 쿼터(usage_tracking)에서 차감하지 않음 (온보딩 1회성)
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DEPARTMENTS = 8; // 플랜 한도(체험=프로 10) 미만으로 유지
const MAX_CATEGORIES_PER_DEPT = 6;
const MAX_NAME_LENGTH = 50;

interface ScaffoldDept {
  name: string;
  categories: string[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** AI 출력 검증/정제: 스키마 강제, 개수·길이 클램프, 이름 중복 제거 */
function sanitize(raw: unknown): ScaffoldDept[] {
  if (!raw || typeof raw !== 'object') return [];
  const departments = (raw as { departments?: unknown }).departments;
  if (!Array.isArray(departments)) return [];

  const seen = new Set<string>();
  const result: ScaffoldDept[] = [];

  for (const item of departments) {
    if (result.length >= MAX_DEPARTMENTS) break;
    const name = String((item as { name?: unknown })?.name ?? '').trim().slice(0, MAX_NAME_LENGTH);
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const rawCats = (item as { categories?: unknown })?.categories;
    const catSeen = new Set<string>();
    const categories: string[] = [];
    if (Array.isArray(rawCats)) {
      for (const c of rawCats) {
        if (categories.length >= MAX_CATEGORIES_PER_DEPT) break;
        const cat = String(c ?? '').trim().slice(0, MAX_NAME_LENGTH);
        if (cat && !catSeen.has(cat)) {
          catSeen.add(cat);
          categories.push(cat);
        }
      }
    }
    result.push({ name, categories });
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: 'AI_NOT_CONFIGURED' }, 500);
    }

    // 사용자 인증 (익명 호출 차단)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: authData, error: authError } = token
      ? await supabase.auth.getUser(token)
      : { data: null, error: new Error('missing token') };
    if (authError || !authData?.user) {
      return jsonResponse({ error: 'UNAUTHORIZED' }, 401);
    }

    const { industry, description, locale, baseTemplate } = await req.json();

    const desc = String(description ?? '').trim().slice(0, 1000);
    if (!desc) {
      return jsonResponse({ error: 'DESCRIPTION_REQUIRED' }, 400);
    }

    const base = sanitize({ departments: baseTemplate });
    const langKey = String(locale || 'ko').slice(0, 2);

    const systemPrompt = `You design the initial folder structure for a document management system (DMS).
Structure: Department → Category (대분류). Respond with ONLY a JSON object, no prose:
{"departments":[{"name":"...","categories":["...","..."]}]}
Rules:
- At most ${MAX_DEPARTMENTS} departments, 2-${MAX_CATEGORIES_PER_DEPT} categories each.
- Names must be short (under ${MAX_NAME_LENGTH} chars), practical, no numbering.
- Write names in the same language as the company description (fallback: locale "${langKey}").
- Use the base template as a starting point; adapt, rename, add or remove to fit the company description. Keep what fits, drop what doesn't.`;

    const userPrompt = `Industry: ${String(industry ?? 'other').slice(0, 30)}
Base template: ${JSON.stringify(base)}
Company description: ${desc}`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      console.error('OpenAI API error:', await aiRes.text());
      return jsonResponse({ error: 'AI_REQUEST_FAILED' }, 502);
    }

    const aiData = await aiRes.json();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(aiData?.choices?.[0]?.message?.content ?? '');
    } catch {
      return jsonResponse({ error: 'AI_INVALID_OUTPUT' }, 502);
    }

    const departments = sanitize(parsed);
    if (departments.length === 0) {
      return jsonResponse({ error: 'AI_INVALID_OUTPUT' }, 502);
    }

    return jsonResponse({ departments });
  } catch (err) {
    console.error('onboarding-scaffold error:', err);
    return jsonResponse({ error: 'INTERNAL_ERROR' }, 500);
  }
});
