import { supabase } from '@/lib/supabase';

// Google Embedding API 호출 함수 (Edge Function 경유)
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-embedding', {
      body: { text },
    });

    if (error) {
      throw new Error(`Embedding generation failed: ${error.message}`);
    }

    if (!data?.embedding) {
      throw new Error('No embedding returned from server');
    }

    return data.embedding as number[];
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
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
