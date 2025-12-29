import { useDocumentStore } from '@/store/documentStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ChatSearchResult {
  id: string;
  name: string;
  categoryName: string;
  departmentName: string;
  storageLocation: string | null;
  uploadDate: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

// 키워드 기반 문서 검색 (제목 + OCR 텍스트)
export function searchDocuments(query: string): ChatSearchResult[] {
  const { documents, categories, departments } = useDocumentStore.getState();
  const { user } = useAuthStore.getState();
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return [];
  }

  if (!user?.companyId) {
    return [];
  }

  const allowedDepartmentIds = new Set(departments.map((d) => d.id));

  return documents
    .filter((doc) => {
      if (!allowedDepartmentIds.has(doc.departmentId)) {
        return false;
      }

      const titleMatch = doc.name.toLowerCase().includes(keyword);
      const ocrMatch = (doc.ocrText || '').toLowerCase().includes(keyword);
      return titleMatch || ocrMatch;
    })
    .map((doc) => {
      const category = categories.find((c) => c.id === doc.categoryId);
      const department = departments.find((d) => d.id === doc.departmentId);

      return {
        id: doc.id,
        name: doc.name,
        categoryName: category?.name ?? '',
        departmentName: department?.name ?? '',
        storageLocation: category?.storageLocation ?? null,
        uploadDate: doc.uploadDate,
      };
    });
}

// 기존 규칙 기반 응답 (Gemini 장애 시 폴백용)
function generateFallbackResponse(message: string): string {
  console.log('fallback 로직 사용');
  const text = message.trim();
  const store = useDocumentStore.getState();
  const { documents, categories, departments } = store;

  if (!text) {
    return '질문을 입력해 주세요. 예: "급여 명세 문서는 어디에 있어?", "전체 문서 수 알려줘"';
  }

  // 1. 위치 질문: "어디" 포함 시
  if (text.includes('어디')) {
    const results = searchDocuments(text);

    if (results.length === 0) {
      return '해당 키워드와 관련된 문서를 찾지 못했어요. 다른 키워드로 다시 검색해 주세요.';
    }

    const lines = results.slice(0, 5).map((doc) => {
      const location = doc.storageLocation || '위치 정보가 등록되지 않았습니다.';
      const dept = doc.departmentName || '부서 정보 없음';
      const category = doc.categoryName || '카테고리 정보 없음';
      return `- 문서: ${doc.name}\n  · 부서: ${dept}\n  · 카테고리: ${category}\n  · 보관 위치: ${location}`;
    });

    return ['검색된 문서의 보관 위치입니다:', ...lines].join('\n');
  }

  // 2. 문서 개수 질문: "문서 수" 또는 "몇 개" 포함 시
  if (text.includes('문서 수') || text.includes('몇 개')) {
    const total = documents.length;
    return `현재 시스템에 등록된 문서는 총 ${total}개입니다.`;
  }

  // 3. 부서별 통계: "부서" 포함 시
  if (text.includes('부서')) {
    if (!departments.length) {
      return '부서 정보가 없습니다.';
    }

    const lines = departments.map((dept) => {
      const count = dept.documentCount;
      return `- ${dept.name}: ${count}건`;
    });

    return ['부서별 문서 보관 현황입니다:', ...lines].join('\n');
  }

  // 4. 카테고리 정보: "카테고리" 포함 시
  if (text.includes('카테고리')) {
    if (!categories.length) {
      return '카테고리 정보가 없습니다.';
    }

    const lines = categories.map((cat) => {
      const location = cat.storageLocation || '위치 정보 없음';
      return `- ${cat.name} (${cat.documentCount}건) - 보관 위치: ${location}`;
    });

    return ['등록된 카테고리 목록입니다:', ...lines].join('\n');
  }

  // 5. 기본: 검색 결과 또는 도움말
  const results = searchDocuments(text);

  if (results.length === 0) {
    return [
      '해당 키워드와 관련된 문서를 찾지 못했어요.',
      '다음과 같이 질문해 보세요:',
      '- "급여 명세 문서는 어디에 있어?"',
      '- "전체 문서 수 알려줘"',
      '- "부서별 문서 수 알려줘"',
      '- "카테고리 목록 보여줘"',
    ].join('\n');
  }

  const lines = results.slice(0, 5).map((doc) => {
    const dept = doc.departmentName || '부서 정보 없음';
    const category = doc.categoryName || '카테고리 정보 없음';
    return `- 문서: ${doc.name} (부서: ${dept}, 카테고리: ${category})`;
  });

  return ['다음 문서를 찾았습니다:', ...lines].join('\n');
}

export interface StreamedDocsResult {
  text: string;
  docs: ChatSearchResult[];
}

// Google Gemini API를 Edge Function을 통해 사용하는 응답 생성 (필요 시 폴백)
export async function generateResponse(
  message: string,
  history: ChatHistoryItem[] = [],
  onPartialUpdate?: (partial: string, docs?: ChatSearchResult[]) => void
): Promise<StreamedDocsResult> {
  const text = message.trim();
  const emitFallback = (): StreamedDocsResult => {
    const fallback = generateFallbackResponse(text);
    if (onPartialUpdate) {
      onPartialUpdate(fallback, []);
    }
    return { text: fallback, docs: [] };
  };

  if (!text) {
    return emitFallback();
  }

  // 빠른 답변이 필요한 질문들 (즉시 fallback 처리)
  const fastReplyQuestions = [
    '카테고리 목록 보여줘',
    '전체 문서 수는?',
    '부서별 문서 수 알려줘',
  ];

  if (fastReplyQuestions.includes(text)) {
    return emitFallback();
  }

  try {
    const user = useAuthStore.getState().user;

    if (!user || !supabaseUrl || !supabaseAnonKey) {
      return emitFallback();
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        message: text,
        userId: user.id,
        history: history.map((h) => ({
          role: h.role,
          content: h.content,
        })),
      }),
    });

    if (!response.body) {
      console.error('ai-chat response has no body');
      return emitFallback();
    }

    if (!response.ok) {
      console.error('Edge Function error status:', response.status);
      return emitFallback();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const chunkText = decoder.decode(value, { stream: true });
      if (!chunkText) continue;

      // 청크를 다시 문자 배열로 나눈 뒤, 일정 길이(예: 5글자)씩 묶어서 업데이트
      const chars = Array.from(chunkText);
      const CHUNK_SIZE = 5;

      for (let i = 0; i < chars.length; i += CHUNK_SIZE) {
        const chunk = chars.slice(i, i + CHUNK_SIZE).join('');
        fullText += chunk;

        if (onPartialUpdate) {
          // ---DOCS--- 구분자 전까지만 표시
          const displayText = fullText.split('\n---DOCS---\n')[0];
          onPartialUpdate(displayText, []);
        }

        // 글자 단위보다 큰 청크 단위로 약간 더 긴 딜레이를 주어 전체 시간을 단축
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    if (!fullText) {
      console.warn('ai-chat streaming returned empty text');
      return emitFallback();
    }

    // ---DOCS--- 구분자로 텍스트와 문서 메타데이터 분리
    let responseText = fullText;
    let parsedDocs: ChatSearchResult[] = [];

    const docsSeparator = '\n---DOCS---\n';
    const separatorIndex = fullText.indexOf(docsSeparator);
    if (separatorIndex !== -1) {
      responseText = fullText.slice(0, separatorIndex);
      const docsJsonStr = fullText.slice(separatorIndex + docsSeparator.length);
      try {
        const rawDocs = JSON.parse(docsJsonStr);
        parsedDocs = rawDocs.map((d: any) => ({
          id: d.id ?? '',
          name: d.title ?? '제목 없음',
          categoryName: d.categoryName ?? '',
          departmentName: d.departmentName ?? '',
          storageLocation: d.storageLocation ?? null,
          uploadDate: d.uploadDate ?? '',
        }));
      } catch (parseErr) {
        console.error('Failed to parse docs JSON from stream:', parseErr);
      }
    }

    // 최종 콜백으로 문서 정보 전달
    if (onPartialUpdate) {
      onPartialUpdate(responseText, parsedDocs);
    }

    return { text: responseText, docs: parsedDocs };
  } catch (error) {
    console.error('AI response error:', error);
    return emitFallback();
  }
}
