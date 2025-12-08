import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
