import { supabase } from '@/lib/supabase';

// Exponential Backoff을 위한 sleep 헬퍼 함수
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Google Embedding API 호출 함수 (Edge Function 경유) - Exponential Backoff 재시도 로직 포함
export async function generateEmbedding(
  text: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
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

      // 성공 시 즉시 반환
      if (attempt > 0) {
        console.log(`✅ Embedding 생성 성공 (재시도 ${attempt}번 후)`);
      }

      return data.embedding as number[];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 마지막 시도면 바로 에러 throw
      if (attempt === maxRetries - 1) {
        console.error(`❌ Embedding 생성 최종 실패 (${maxRetries}번 시도)`, lastError);
        break;
      }

      // Exponential backoff: 1초 → 2초 → 4초
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `⚠️ Embedding 생성 실패 (시도 ${attempt + 1}/${maxRetries}), ${delay}ms 후 재시도...`,
        lastError.message
      );

      await sleep(delay);
    }
  }

  throw lastError!;
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
