import { useDocumentStore } from '@/store/documentStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface ChatSearchResult {
  id: string;
  name: string;
  categoryName: string;
  departmentName: string;
  storageLocation: string | null;
  uploadDate: string;
  subcategoryId: string;
  parentCategoryId: string;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

// 자연어 기간 표현을 날짜 범위로 파싱
export function parseDateRange(text: string): { start: Date; end: Date } | null {
  const now = new Date();
  const normalizedText = text.trim().toLowerCase();

  // 오늘
  if (normalizedText.includes('오늘')) {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  // 어제
  if (normalizedText.includes('어제')) {
    const yesterday = subDays(now, 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }

  // 그저께, 그제
  if (normalizedText.includes('그저께') || normalizedText.includes('그제')) {
    const dayBeforeYesterday = subDays(now, 2);
    return { start: startOfDay(dayBeforeYesterday), end: endOfDay(dayBeforeYesterday) };
  }

  // N일 전 (예: 3일전, 3일 전)
  const daysAgoMatch = normalizedText.match(/(\d+)\s*일\s*전/);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const targetDate = subDays(now, daysAgo);
    return { start: startOfDay(targetDate), end: endOfDay(targetDate) };
  }

  // 이번 주 (월요일부터 오늘까지)
  if (normalizedText.includes('이번 주') || normalizedText.includes('이번주') || normalizedText.includes('금주')) {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = subDays(now, mondayOffset);
    return { start: startOfDay(monday), end: endOfDay(now) };
  }

  // 저번 주, 지난 주
  if (normalizedText.includes('저번 주') || normalizedText.includes('저번주') || 
      normalizedText.includes('지난 주') || normalizedText.includes('지난주')) {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = subDays(now, mondayOffset);
    const lastMonday = subDays(thisMonday, 7);
    const lastSunday = subDays(thisMonday, 1);
    return { start: startOfDay(lastMonday), end: endOfDay(lastSunday) };
  }

  // N주 전
  const weeksAgoMatch = normalizedText.match(/(\d+)\s*주\s*전/);
  if (weeksAgoMatch) {
    const weeksAgo = parseInt(weeksAgoMatch[1], 10);
    const targetDate = subDays(now, weeksAgo * 7);
    const dayOfWeek = targetDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = subDays(targetDate, mondayOffset);
    const sunday = subDays(monday, -6);
    return { start: startOfDay(monday), end: endOfDay(sunday) };
  }

  // 이번 달
  if (normalizedText.includes('이번 달') || normalizedText.includes('이번달') || normalizedText.includes('금월')) {
    return { start: startOfMonth(now), end: endOfDay(now) };
  }

  // 저번 달, 지난 달
  if (normalizedText.includes('저번 달') || normalizedText.includes('저번달') || 
      normalizedText.includes('지난 달') || normalizedText.includes('지난달')) {
    const lastMonth = subMonths(now, 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }

  // N달 전, N개월 전
  const monthsAgoMatch = normalizedText.match(/(\d+)\s*(달|개월)\s*전/);
  if (monthsAgoMatch) {
    const monthsAgo = parseInt(monthsAgoMatch[1], 10);
    const targetMonth = subMonths(now, monthsAgo);
    return { start: startOfMonth(targetMonth), end: endOfMonth(targetMonth) };
  }

  // 올해
  if (normalizedText.includes('올해')) {
    return { start: startOfYear(now), end: endOfDay(now) };
  }

  // 작년, 지난해
  if (normalizedText.includes('작년') || normalizedText.includes('지난해') || normalizedText.includes('지난 해')) {
    const lastYear = subYears(now, 1);
    return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
  }

  // N년 전
  const yearsAgoMatch = normalizedText.match(/(\d+)\s*년\s*전/);
  if (yearsAgoMatch) {
    const yearsAgo = parseInt(yearsAgoMatch[1], 10);
    const targetYear = subYears(now, yearsAgo);
    return { start: startOfYear(targetYear), end: endOfYear(targetYear) };
  }

  // 특정 날짜: M월 D일 (예: 12월 30일, 1월 5일)
  const specificDateMatch = normalizedText.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (specificDateMatch) {
    const month = parseInt(specificDateMatch[1], 10);
    const day = parseInt(specificDateMatch[2], 10);
    let year = now.getFullYear();
    
    // 해당 날짜가 미래라면 작년으로 간주
    const targetDate = new Date(year, month - 1, day);
    if (targetDate > now) {
      year -= 1;
    }
    
    const finalDate = new Date(year, month - 1, day);
    return { start: startOfDay(finalDate), end: endOfDay(finalDate) };
  }

  return null;
}

// 기간 기반 문서 검색
export function searchDocumentsByDate(dateRange: { start: Date; end: Date }): ChatSearchResult[] {
  const { documents, categories, departments } = useDocumentStore.getState();
  const { user } = useAuthStore.getState();

  if (!user?.companyId) {
    return [];
  }

  const allowedDepartmentIds = new Set(departments.map((d) => d.id));

  return documents
    .filter((doc) => {
      if (!allowedDepartmentIds.has(doc.departmentId)) {
        return false;
      }

      const uploadDate = new Date(doc.uploadDate);
      return uploadDate >= dateRange.start && uploadDate <= dateRange.end;
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
        subcategoryId: doc.subcategoryId,
        parentCategoryId: doc.parentCategoryId,
      };
    })
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
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
        subcategoryId: doc.subcategoryId,
        parentCategoryId: doc.parentCategoryId,
      };
    });
}

// 기간 표현을 사람이 읽기 쉬운 형태로 변환
function formatDateRangeDescription(text: string): string {
  if (text.includes('오늘')) return '오늘';
  if (text.includes('어제')) return '어제';
  if (text.includes('그저께') || text.includes('그제')) return '그저께';
  
  const daysAgoMatch = text.match(/(\d+)\s*일\s*전/);
  if (daysAgoMatch) return `${daysAgoMatch[1]}일 전`;
  
  if (text.includes('이번 주') || text.includes('이번주') || text.includes('금주')) return '이번 주';
  if (text.includes('저번 주') || text.includes('저번주') || text.includes('지난 주') || text.includes('지난주')) return '지난 주';
  
  const weeksAgoMatch = text.match(/(\d+)\s*주\s*전/);
  if (weeksAgoMatch) return `${weeksAgoMatch[1]}주 전`;
  
  if (text.includes('이번 달') || text.includes('이번달') || text.includes('금월')) return '이번 달';
  if (text.includes('저번 달') || text.includes('저번달') || text.includes('지난 달') || text.includes('지난달')) return '지난 달';
  
  const monthsAgoMatch = text.match(/(\d+)\s*(달|개월)\s*전/);
  if (monthsAgoMatch) return `${monthsAgoMatch[1]}개월 전`;
  
  if (text.includes('올해')) return '올해';
  if (text.includes('작년') || text.includes('지난해') || text.includes('지난 해')) return '작년';
  
  const yearsAgoMatch = text.match(/(\d+)\s*년\s*전/);
  if (yearsAgoMatch) return `${yearsAgoMatch[1]}년 전`;
  
  // 특정 날짜: M월 D일
  const specificDateMatch = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (specificDateMatch) return `${specificDateMatch[1]}월 ${specificDateMatch[2]}일`;
  
  return '';
}

// 기간 기반 문서 검색 의도 감지
function isDateSearchIntent(text: string): boolean {
  const dateKeywords = [
    '오늘', '어제', '그저께', '그제',
    '이번 주', '이번주', '금주', '저번 주', '저번주', '지난 주', '지난주',
    '이번 달', '이번달', '금월', '저번 달', '저번달', '지난 달', '지난달',
    '올해', '작년', '지난해', '지난 해'
  ];
  
  const hasDateKeyword = dateKeywords.some(keyword => text.includes(keyword));
  const hasNDaysAgo = /\d+\s*일\s*전/.test(text);
  const hasNWeeksAgo = /\d+\s*주\s*전/.test(text);
  const hasNMonthsAgo = /\d+\s*(달|개월)\s*전/.test(text);
  const hasNYearsAgo = /\d+\s*년\s*전/.test(text);
  
  const hasSpecificDate = /\d{1,2}\s*월\s*\d{1,2}\s*일/.test(text);
  
  const hasDocumentKeyword = text.includes('문서') || text.includes('올린') || text.includes('업로드') || text.includes('등록');
  
  return (hasDateKeyword || hasNDaysAgo || hasNWeeksAgo || hasNMonthsAgo || hasNYearsAgo || hasSpecificDate) && hasDocumentKeyword;
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

  // 0. 기간 기반 문서 검색: 날짜/기간 표현 + 문서 관련 키워드 포함 시
  if (isDateSearchIntent(text)) {
    const dateRange = parseDateRange(text);
    if (dateRange) {
      const results = searchDocumentsByDate(dateRange);
      const periodDesc = formatDateRangeDescription(text);
      
      if (results.length === 0) {
        return `${periodDesc}에 업로드된 문서가 없습니다.`;
      }
      
      const lines = results.slice(0, 10).map((doc) => {
        const dept = doc.departmentName || '부서 정보 없음';
        const category = doc.categoryName || '카테고리 정보 없음';
        const uploadDate = new Date(doc.uploadDate).toLocaleDateString('ko-KR');
        return `- ${doc.name}\n  · 부서: ${dept}\n  · 카테고리: ${category}\n  · 업로드: ${uploadDate}`;
      });
      
      const totalCount = results.length;
      const displayCount = Math.min(totalCount, 10);
      const header = `${periodDesc}에 업로드된 문서 ${totalCount}건${totalCount > 10 ? ` (상위 ${displayCount}건 표시)` : ''}:`;
      
      return [header, ...lines].join('\n');
    }
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

  // 기간 기반 문서 검색은 로컬에서 빠르게 처리
  if (isDateSearchIntent(text)) {
    const dateRange = parseDateRange(text);
    if (dateRange) {
      const results = searchDocumentsByDate(dateRange);
      const periodDesc = formatDateRangeDescription(text);
      
      let responseText: string;
      if (results.length === 0) {
        responseText = `${periodDesc}에 업로드된 문서가 없습니다.`;
      } else {
        const lines = results.slice(0, 10).map((doc) => {
          const dept = doc.departmentName || '부서 정보 없음';
          const category = doc.categoryName || '카테고리 정보 없음';
          const uploadDate = new Date(doc.uploadDate).toLocaleDateString('ko-KR');
          return `- ${doc.name}\n  · 부서: ${dept}\n  · 카테고리: ${category}\n  · 업로드: ${uploadDate}`;
        });
        
        const totalCount = results.length;
        const header = `${periodDesc}에 업로드된 문서 ${totalCount}건${totalCount > 10 ? ' (상위 10건 표시)' : ''}:`;
        responseText = [header, ...lines].join('\n');
      }
      
      if (onPartialUpdate) {
        onPartialUpdate(responseText, results.slice(0, 10));
      }
      return { text: responseText, docs: results.slice(0, 10) };
    }
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
          subcategoryId: d.subcategoryId ?? '',
          parentCategoryId: d.parentCategoryId ?? '',
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
