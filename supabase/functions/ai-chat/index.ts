import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 채팅 로그를 DB(chat_messages)에 저장할지 여부 플래그
// 요구 사항에 따라 기본값을 false로 두어, 더 이상 기록이 남지 않게 함
const ENABLE_CHAT_LOGGING = false;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId, history = [] } = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Supabase 환경 변수 (문서 검색 및 선택적 채팅 로그용)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 1. DB에서 전체 구조 + 문서 검색 (벡터 검색)
    let systemPrompt = '관련 정보를 찾지 못했습니다.';
    let matchedDocsForResponse: any[] = []; // 프론트엔드에 전달할 문서 메타데이터

    if (supabaseUrl && supabaseServiceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', userId)
          .single();

        if (userError || !userData?.company_id) {
          console.error('Failed to fetch user company_id:', userError);
          systemPrompt = '사용자의 회사 정보를 찾을 수 없습니다.';
        } else {
          const userCompanyId = userData.company_id;

          // 1-1. 회사 범위의 부서/대분류/세부카테고리 조회
          const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('id, name')
            .eq('company_id', userCompanyId);

          if (deptError) {
            console.error('Failed to fetch departments:', deptError);
          }

          const departmentIds = (departments ?? []).map((d: any) => d.id);

          const { data: parentCategories, error: parentCatError } =
            departmentIds.length > 0
              ? await supabase
                  .from('categories')
                  .select('id, name, department_id')
                  .in('department_id', departmentIds)
              : { data: [], error: null };

          if (parentCatError) {
            console.error('Failed to fetch categories:', parentCatError);
          }

          const parentCategoryIds = (parentCategories ?? []).map((c: any) => c.id);

          const { data: subcategories, error: subcatError } =
            parentCategoryIds.length > 0
              ? await supabase
                  .from('subcategories')
                  .select('id, name, parent_category_id, storage_location, expiry_date, nfc_uid, nfc_registered')
                  .in('parent_category_id', parentCategoryIds)
              : { data: [], error: null };

          if (subcatError) {
            console.error('Failed to fetch subcategories:', subcatError);
          }

          // 1-1-1. 만기 임박 세부카테고리 조회 (3개월 이내)
          const now = new Date();
          const threeMonthsLater = new Date(now);
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          
          const expiringSubcategories = (subcategories ?? []).filter((s: any) => {
            if (!s.expiry_date) return false;
            const expiryDate = new Date(s.expiry_date);
            return expiryDate >= now && expiryDate <= threeMonthsLater;
          }).sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

          // 1-1-2. NFC 등록 현황
          const nfcRegistered = (subcategories ?? []).filter((s: any) => s.nfc_uid || s.nfc_registered);
          const nfcUnregistered = (subcategories ?? []).filter((s: any) => !s.nfc_uid && !s.nfc_registered);

          // 1-1-3. 공유 문서 조회 (현재 사용자가 공유한 문서)
          let sharedDocuments: any[] = [];
          const { data: shares, error: shareError } = await supabase
            .from('shared_documents')
            .select(`
              id,
              document_id,
              shared_at,
              shared_to_user_id,
              documents!inner (
                id,
                title
              )
            `)
            .eq('shared_by_user_id', userId)
            .eq('is_active', true)
            .order('shared_at', { ascending: false })
            .limit(10);

          if (shareError) {
            console.error('Failed to fetch shared documents:', shareError);
          } else {
            sharedDocuments = shares ?? [];
          }

          // 1-2. 임베딩 생성 및 벡터 검색
          let matchedDocs: any[] = [];
          const embeddingRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: { parts: [{ text: message }] },
              }),
            },
          );

          if (!embeddingRes.ok) {
            const text = await embeddingRes.text();
            console.error('Embedding API error:', text);
          } else {
            const embeddingJson = await embeddingRes.json();
            const embedding = embeddingJson.embedding?.values;

            if (embedding && Array.isArray(embedding)) {
              const { data: docs, error } = await supabase.rpc('match_documents', {
                query_embedding: embedding,
                match_threshold: 0.3,
                match_count: 5,
                filter_company_id: userCompanyId,
              });

              if (error) {
                console.error('match_documents RPC error:', error);
              } else if (docs && docs.length > 0) {
                matchedDocs = docs;
                // 프론트엔드에 전달할 문서 메타데이터 저장 (필요한 필드만)
                matchedDocsForResponse = docs.map((d: any) => ({
                  id: d.id,
                  title: d.title ?? '제목 없음',
                  departmentName: d.department_name ?? '',
                  categoryName: d.category_name ?? '',
                  storageLocation: d.storage_location ?? null,
                  uploadDate: d.uploaded_at ?? '',
                }));
              }
            }
          }

          // 1-3. 컨텍스트 구성
          const deptList = departments?.map((d: any) => d.name).join(', ') || '없음';
          const catList = parentCategories?.map((c: any) => c.name).join(', ') || '없음';
          const subList =
            subcategories
              ?.map(
                (s: any) =>
                  `${s.name}(위치: ${s.storage_location || '미지정'})`,
              )
              .join(', ') || '없음';
          const docList =
            matchedDocs.length > 0
              ? matchedDocs
                  .map(
                    (d: any) =>
                      `- ${d.title ?? '제목 없음'}: ${
                        (d.ocr_text ?? '').toString().length > 200
                          ? (d.ocr_text ?? '').toString().slice(0, 200) + '...'
                          : (d.ocr_text ?? '').toString()
                      }`,
                  )
                  .join('\n')
              : '관련 문서 없음';

          // 만기 임박 목록 구성
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          const oneMonth = 30 * 24 * 60 * 60 * 1000;
          const expiryList = expiringSubcategories.length > 0
            ? expiringSubcategories.map((s: any) => {
                const expiryDate = new Date(s.expiry_date);
                const diff = expiryDate.getTime() - now.getTime();
                const parentCat = parentCategories?.find((c: any) => c.id === s.parent_category_id);
                const dept = departments?.find((d: any) => d.id === parentCat?.department_id);
                const emoji = diff <= oneWeek ? '🚨' : diff <= oneMonth ? '⚠️' : '⏰';
                return `${emoji} ${s.name}: ${expiryDate.toLocaleDateString('ko-KR')} 만료 (${dept?.name || ''} > ${parentCat?.name || ''})`;
              }).join('\n')
            : '만기 임박 없음';

          // NFC 현황 구성
          const nfcList = `등록됨: ${nfcRegistered.length}개, 미등록: ${nfcUnregistered.length}개`;

          // 공유 문서 목록 구성
          const sharedList = sharedDocuments.length > 0
            ? sharedDocuments.map((s: any) => {
                const doc = s.documents as any;
                return `- ${doc?.title || '제목 없음'} (${new Date(s.shared_at).toLocaleDateString('ko-KR')} 공유)`;
              }).join('\n')
            : '공유한 문서 없음';

          systemPrompt = `당신은 문서 관리 시스템의 AI 어시스턴트입니다. 아래 정보를 참고해서 사용자 질문에 답변하세요.
답변에 링크를 포함할 때는 "→ /admin/..." 또는 "→ /team/..." 형식으로 작성하세요.

[부서 목록]
${deptList}

[대분류 목록]
${catList}

[세부카테고리 목록 (저장 위치 포함)]
${subList}

[만기 임박 세부카테고리 (3개월 이내)]
${expiryList}

[NFC 등록 현황]
${nfcList}

[공유한 문서]
${sharedList}

[관련 문서]
${docList}`;
        }
      } catch (searchError) {
        console.error('DB 조회 중 오류:', searchError);
      }
    } else {
      console.warn(
        'DB 조회를 건너뜀: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    // 2. 이전 대화 히스토리 변환
    const historyContents = history.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    // 3. 시스템 프롬프트(검색 결과) + 히스토리 + 현재 질문을 하나의 contents로 구성
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      ...historyContents,
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const apiVersion = 'v1beta';
    const modelPath = 'models/gemini-2.5-flash';

    const streamUrl = `https://generativelanguage.googleapis.com/${apiVersion}/${modelPath}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!geminiResponse.ok || !geminiResponse.body) {
      const errorText = await geminiResponse.text();
      console.error('Gemini streaming API error body:', errorText);

      return new Response(
        JSON.stringify({
          error: 'Gemini streaming API request failed',
          geminiStatus: geminiResponse.status,
          geminiBody: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiResponse.body!.getReader();
        let buffer = '';
        let fullText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            buffer += decoder.decode(value, { stream: true });
            // SSE는 CRLF(\r\n)를 사용할 수 있으므로, 파싱을 쉽게 하기 위해 LF로 정규화
            buffer = buffer.replace(/\r\n/g, '\n');

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const eventStr = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              const lines = eventStr.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                if (!trimmed.startsWith('data:')) continue;

                const dataStr = trimmed.slice(5).trim();
                if (!dataStr || dataStr === '[DONE]') {
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const candidates = parsed.candidates ?? [];
                  for (const candidate of candidates) {
                    const parts = candidate.content?.parts ?? [];
                    for (const part of parts) {
                      const delta = typeof part.text === 'string' ? part.text : '';
                      if (delta) {
                        fullText += delta;
                        controller.enqueue(encoder.encode(delta));
                      }
                    }
                  }
                } catch (parseError) {
                  console.error('Failed to parse Gemini stream chunk:', parseError);
                }
              }

              boundary = buffer.indexOf('\n\n');
            }
          }

          console.log('Gemini stream completed, length:', fullText.length);

          // 스트림 끝에 검색된 문서 메타데이터 추가 (프론트엔드에서 파싱할 수 있도록)
          if (matchedDocsForResponse.length > 0) {
            const docsJson = JSON.stringify(matchedDocsForResponse);
            controller.enqueue(encoder.encode(`\n---DOCS---\n${docsJson}`));
          }

          if (ENABLE_CHAT_LOGGING) {
            // chat_messages 저장은 베스트 에포트: 환경변수나 DB 문제가 있어도 응답은 그대로 반환
            if (supabaseUrl && supabaseServiceRoleKey && fullText) {
              try {
                const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

                await supabase.from('chat_messages').insert([
                  { user_id: userId, role: 'user', content: message },
                  { user_id: userId, role: 'bot', content: fullText },
                ]);
              } catch (dbError) {
                console.error('Failed to log chat_messages:', dbError);
              }
            } else if (!supabaseUrl || !supabaseServiceRoleKey) {
              console.warn(
                'chat_messages logging skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set'
              );
            }
          }
        } catch (streamError) {
          console.error('Error while streaming from Gemini:', streamError);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
