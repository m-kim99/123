import { useDocumentStore } from '@/store/documentStore';
import { searchDocumentsByEmbedding } from '@/lib/embedding';

const GEMINI_MODEL = 'gemini-2.5-flash';

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
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return [];
  }

  return documents
    .filter((doc) => {
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

// Google Gemini API를 사용한 응답 생성 (필요 시 폴백)
export async function generateResponse(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  console.log('generateResponse 호출됨:', message);
  console.log('Gemini API 키:', import.meta.env.VITE_GEMINI_API_KEY?.substring(0, 10));

  const text = message.trim();
  if (!text) {
    return generateFallbackResponse(text);
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  // API 키가 없으면 기존 규칙 기반 로직 사용
  if (!apiKey) {
    return generateFallbackResponse(text);
  }

  // 빠른 답변이 필요한 질문들 (즉시 fallback 처리)
  const fastReplyQuestions = [
    '카테고리 목록 보여줘',
    '전체 문서 수는?',
    '부서별 문서 수 알려줘',
  ];

  if (fastReplyQuestions.includes(text)) {
    return generateFallbackResponse(text);
  }

  let vectorResults: any[] = [];
  try {
    console.log('=== 벡터 검색 시작 ===');
    console.log('질문:', text);

    const embeddingResults = await searchDocumentsByEmbedding(text, 0.3, 5);
    console.log('벡터 검색 원본 결과:', embeddingResults);

    vectorResults = Array.isArray(embeddingResults) ? embeddingResults : [];
    console.log('벡터 검색 결과 개수:', vectorResults.length);

    if (vectorResults.length > 0) {
      console.log(
        '벡터 검색 문서 제목들:',
        vectorResults.map((r) => r.title)
      );
    }
  } catch (error) {
    console.error('벡터 검색 오류:', error);
    vectorResults = [];
  }

  const keywordResults = searchDocuments(text).slice(0, 10);
  console.log('키워드 검색 결과 개수:', keywordResults.length);

  const contextDocuments: any[] =
    vectorResults.length > 0 ? vectorResults : keywordResults;
  console.log('최종 사용된 컨텍스트:', contextDocuments.length, '개 문서');
  console.log(
    '컨텍스트 소스:',
    vectorResults.length > 0 ? '벡터 검색' : '키워드 검색'
  );

  const context = contextDocuments
    .map((r: any) => {
      const title = (r.title ?? r.name ?? '').toString();
      const ocrText = (r.ocr_text ?? '').toString();
      const snippet = ocrText.slice(0, 500);
      return `문서: ${title}\n내용: ${snippet}`;
    })
    .join('\n\n');

  const contextPayload = {
    query: text,
    documents: contextDocuments,
  };

  const historyContents = history
    .slice(-10)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: item.content,
        },
      ],
    }));

  const systemPrompt =
    '당신의 이름은 트로이(Troy)입니다. TrayStorage 문서 관리 시스템의 AI 어시스턴트로서 다음과 같이 행동하세요:\n\n' +
    '- 친절하고 전문적인 톤으로 답변\n' +
    '- 한국어로 자연스럽게 대화\n' +
    '- 문서 위치, 카테고리, 부서 정보를 정확하게 안내\n' +
    '- 사용자가 문서를 쉽게 찾을 수 있도록 단계별로 설명\n' +
    '- 이모지를 적절히 사용하여 친근감 있게\n' +
    '- 간결하면서도 충분한 정보 제공\n' +
    '- 매번 자기소개하지 말고, 질문에 바로 답변하세요\n\n' +
    '아래 JSON으로 제공되는 문서 목록을 참고하여 사용자의 질문에 답변하세요. ' +
    '검색된 문서가 없으면 일반 대화로 자연스럽게 답변하세요. 문서와 관련 없는 질문도 친근하게 대답해주세요. ' +
    '답변만 간결하게 텍스트로 작성하세요.';

  const userContent = [
    `문서 컨텍스트 JSON: ${JSON.stringify(contextPayload)}`,
    `문서 컨텍스트 요약:\n${context || '관련 문서를 찾지 못했습니다.'}`,
    `사용자 질문: ${text}`,
  ].join('\n\n');

  try {
    console.log('Gemini API 호출 시작');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=` +
        encodeURIComponent(apiKey),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: '너는 트로이야. 항상 자신을 트로이라고 소개해.',
                },
              ],
            },
            {
              role: 'model',
              parts: [
                {
                  text: '알겠습니다. 저는 트로이입니다.',
                },
              ],
            },
            ...historyContents,
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\n${userContent}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.9,
            topK: 40,
          },
        }),
      }
    );

    console.log('Gemini API 응답:', response);

    if (!response.ok) {
      console.error('Gemini API 에러:', {
        status: response.status,
        body: await response.text(),
      });
      return generateFallbackResponse(text);
    }

    const data: any = await response.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text ?? '')
        .join('') ?? '';

    if (!rawText) {
      return generateFallbackResponse(text);
    }

    // Gemini 응답에서 마크다운 코드 블록만 제거하고 그대로 반환
    try {
      const cleanedText = rawText.replace(/```json\n?|```\n?/g, '').trim();
      return cleanedText;
    } catch (err) {
      console.error('Gemini API 에러:', err);
      // 최종적으로는 원본 텍스트를 그대로 노출
      return rawText;
    }
  } catch (error) {
    console.error('Gemini API 에러:', error);
    return generateFallbackResponse(text);
  }
}
