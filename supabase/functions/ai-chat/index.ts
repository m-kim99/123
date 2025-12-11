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

        // 1-1. 임베딩 생성 및 벡터 검색 (departments, categories, subcategories 전체 조회 제거 - match_documents RPC가 이미 조인된 데이터 반환)
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
                subcategoryName: d.subcategory_name ?? '',
                storageLocation: d.storage_location ?? null,
                uploadDate: d.uploaded_at ?? '',
              }));
            }
          }
        }

        // 1-2. 컨텍스트 구성 (간소화 - 벡터 검색 결과만 사용)
        const docList =
          matchedDocs.length > 0
            ? matchedDocs
                .map((d: any) => {
                  const ocrPreview = (d.ocr_text ?? '').toString().length > 150
                    ? (d.ocr_text ?? '').toString().slice(0, 150) + '...'
                    : (d.ocr_text ?? '').toString();
                  
                  return `- 제목: ${d.title ?? '제목 없음'}
  부서: ${d.department_name ?? '미지정'}
  대분류: ${d.category_name ?? '미지정'}
  보관위치: ${d.storage_location ?? '미지정'}
  내용: ${ocrPreview}`;
                })
                .join('\n\n')
            : '관련 문서를 찾지 못했습니다.';

        systemPrompt = `당신은 문서 관리 시스템의 AI 어시스턴트입니다.

사용자 질문: "${message}"

아래는 질문과 관련된 문서 정보입니다:

${docList}

위 정보를 바탕으로 사용자의 질문에 정확하고 친절하게 답변해주세요. 
문서의 위치 정보를 포함하여 안내해주세요.`;
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
