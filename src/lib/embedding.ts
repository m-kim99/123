import { supabase } from '@/lib/supabase';

// Google Embedding API 호출 함수
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 설정되어 있지 않습니다.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('임베딩 생성 요청에 실패했습니다.');
  }

  const data = await response.json();

  const values: number[] | undefined =
    data?.embedding?.values ?? data?.embeddings?.[0]?.values;

  if (!values) {
    throw new Error('임베딩 결과를 파싱할 수 없습니다.');
  }

  return values;
}

// 벡터 검색 함수
export async function searchDocumentsByEmbedding(
  query: string,
  threshold = 0.7,
  limit = 5
) {
  console.log('searchDocumentsByEmbedding 호출됨');
  console.log('쿼리:', query);

  try {
    const queryEmbedding = await generateEmbedding(query);
    console.log('쿼리 임베딩 생성 완료, 길이:', queryEmbedding.length);

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });

    console.log('Supabase RPC 결과:', data?.length, '개');
    console.log('Supabase RPC 에러:', error);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('searchDocumentsByEmbedding 에러:', error);
    throw error;
  }
}
