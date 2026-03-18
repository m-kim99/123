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
  const { documents, categories, departments, subcategories } = useDocumentStore.getState();
  const { user } = useAuthStore.getState();

  if (!user?.companyId) {
    return [];
  }

  const allowedDepartmentIds = new Set(departments.map((d) => d.id));
  const validSubcategoryIds = new Set(subcategories.map((s) => s.id));

  return documents
    .filter((doc) => {
      if (!allowedDepartmentIds.has(doc.departmentId)) {
        return false;
      }

      // 삭제된(백업) 문서 제외: 세부 스토리지가 존재하지 않는 문서
      if (!doc.subcategoryId || !validSubcategoryIds.has(doc.subcategoryId)) {
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
  const { documents, categories, departments, subcategories } = useDocumentStore.getState();
  const { user } = useAuthStore.getState();
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return [];
  }

  if (!user?.companyId) {
    return [];
  }

  const allowedDepartmentIds = new Set(departments.map((d) => d.id));
  const validSubcategoryIds = new Set(subcategories.map((s) => s.id));

  return documents
    .filter((doc) => {
      if (!allowedDepartmentIds.has(doc.departmentId)) {
        return false;
      }

      // 삭제된(백업) 문서 제외: 세부 스토리지가 존재하지 않는 문서
      if (!doc.subcategoryId || !validSubcategoryIds.has(doc.subcategoryId)) {
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

// JSON 응답 정리 함수 (raw JSON이 노출되는 것을 방지하고 자연어로 변환)
function cleanJsonResponse(text: string): string {
  // JSON 객체나 배열 패턴 감지 (중괄호나 대괄호로 시작)
  const jsonPattern = /^[\s]*[{[\]]/;
  if (jsonPattern.test(text.trim())) {
    try {
      const parsed = JSON.parse(text.trim());
      // JSON 파싱 성공 시 자연어로 변환
      if (typeof parsed === 'object' && parsed !== null) {
        // items 배열이 있는 경우 (list_all 결과)
        if (parsed.items && Array.isArray(parsed.items)) {
          const count = parsed.count || parsed.items.length;
          if (parsed.items.length === 0) {
            return '조회된 항목이 없습니다.';
          }
          const itemList = parsed.items.length <= 10 
            ? parsed.items.join(', ')
            : `${parsed.items.slice(0, 10).join(', ')} 외 ${parsed.items.length - 10}개`;
          return `총 ${count}개의 항목이 있습니다.\n목록: ${itemList}`;
        }
        // 통계 정보 (get_total_counts 결과)
        if (parsed.departments !== undefined || parsed.parent_categories !== undefined) {
          const lines = ['현재 시스템 현황입니다:'];
          if (parsed.departments !== undefined) lines.push(`- 부서: ${parsed.departments}개`);
          if (parsed.parent_categories !== undefined) lines.push(`- 대분류: ${parsed.parent_categories}개`);
          if (parsed.subcategories !== undefined) lines.push(`- 세부카테고리: ${parsed.subcategories}개`);
          if (parsed.documents !== undefined) lines.push(`- 문서: ${parsed.documents}개`);
          if (parsed.users !== undefined) lines.push(`- 사용자: ${parsed.users}명`);
          return lines.join('\n');
        }
        // count만 있는 경우
        if (parsed.count !== undefined && Object.keys(parsed).length <= 2) {
          return `총 ${parsed.count}개입니다.`;
        }
        // 에러 메시지
        if (parsed.error) {
          return parsed.error;
        }
        // 기타 알 수 없는 JSON은 키-값 요약
        const keys = Object.keys(parsed).filter(k => parsed[k] !== null && parsed[k] !== undefined);
        if (keys.length > 0 && keys.length <= 5) {
          return `조회 결과:\n${keys.map(k => `- ${k}: ${typeof parsed[k] === 'object' ? '(데이터)' : parsed[k]}`).join('\n')}`;
        }
        return '조회 결과를 처리했습니다.';
      }
    } catch {
      // JSON 파싱 실패는 무시
    }
  }
  
  // 텍스트 중간에 JSON 블록이 있는 경우 제거
  const cleanedText = text
    .replace(/\{[^}]*"departments"[^}]*\}/g, '')
    .replace(/\{[^}]*"parent_categories"[^}]*\}/g, '')
    .replace(/\{[^}]*"subcategories"[^}]*\}/g, '')
    .replace(/\{[^}]*"documents"[^}]*\}/g, '')
    .replace(/\{[^}]*"items"\s*:\s*\[[^\]]*\][^}]*\}/g, '')
    .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 제거
    .trim();
  
  return cleanedText || text;
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

// 만기 임박 키워드 감지
function isExpiryIntent(text: string): boolean {
  const expiryKeywords = ['만기', '만료', '임박', '다음주 만료', '이번달 만료', '만료 예정', '만기 임박'];
  return expiryKeywords.some(keyword => text.includes(keyword));
}

// 공유 문서 키워드 감지
function isSharedDocumentIntent(text: string): boolean {
  const sharedKeywords = ['공유', '공유한 문서', '공유된', '공유 목록', '공유문서'];
  return sharedKeywords.some(keyword => text.includes(keyword));
}

// NFC 키워드 감지
function isNfcIntent(text: string): boolean {
  const nfcKeywords = ['NFC', 'nfc', 'Nfc', 'NFC 등록', 'NFC 안 된', '태그 등록', 'NFC 현황'];
  return nfcKeywords.some(keyword => text.includes(keyword));
}

// 만기 임박 세부카테고리 조회
async function getExpiringSubcategories(): Promise<{ text: string; docs: ChatSearchResult[] }> {
  const { user } = useAuthStore.getState();
  if (!user?.companyId) {
    return { text: '사용자 정보를 찾을 수 없습니다.', docs: [] };
  }

  try {
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    // 부서 목록 조회
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('company_id', user.companyId);

    if (deptError || !departments?.length) {
      return { text: '부서 정보를 조회할 수 없습니다.', docs: [] };
    }

    const departmentIds = departments.map((d: { id: string; name: string }) => d.id);

    // 대분류 조회
    const { data: parentCategories, error: catError } = await supabase
      .from('categories')
      .select('id, name, department_id')
      .in('department_id', departmentIds);

    if (catError || !parentCategories?.length) {
      return { text: '카테고리 정보를 조회할 수 없습니다.', docs: [] };
    }

    const parentCategoryIds = parentCategories.map((c: { id: string; name: string; department_id: string }) => c.id);

    // 만기 임박 세부카테고리 조회
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('id, name, expiry_date, parent_category_id')
      .in('parent_category_id', parentCategoryIds)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', threeMonthsLater.toISOString())
      .order('expiry_date', { ascending: true });

    if (subError) {
      console.error('만기 조회 오류:', subError);
      return { text: '만기 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
    }

    if (!subcategories?.length) {
      return { text: '3개월 이내 만기 임박한 세부 스토리지가 없습니다. ✅', docs: [] };
    }

    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const urgent: { sub: any; parentCat: any; dept: any }[] = [];
    const warning: { sub: any; parentCat: any; dept: any }[] = [];
    const notice: { sub: any; parentCat: any; dept: any }[] = [];

    for (const sub of subcategories) {
      const expiryDate = new Date(sub.expiry_date);
      const diff = expiryDate.getTime() - now.getTime();
      const parentCat = parentCategories.find((c: { id: string; name: string; department_id: string }) => c.id === sub.parent_category_id);
      const dept = departments.find((d: { id: string; name: string }) => d.id === parentCat?.department_id);

      if (diff <= oneWeek) {
        urgent.push({ sub, parentCat, dept });
      } else if (diff <= oneMonth) {
        warning.push({ sub, parentCat, dept });
      } else {
        notice.push({ sub, parentCat, dept });
      }
    }

    // 텍스트 생성 (링크 없이)
    const lines: string[] = ['만기 임박한 세부 스토리지를 찾았습니다:'];

    if (urgent.length > 0) {
      lines.push('\n🚨 [1주일 이내]');
      for (const { sub, parentCat, dept } of urgent) {
        const dateStr = new Date(sub.expiry_date).toLocaleDateString('ko-KR');
        lines.push(`${sub.name}: ${dateStr} 만료 (${dept?.name || ''} > ${parentCat?.name || ''})`);
      }
    }
    if (warning.length > 0) {
      lines.push('\n⚠️ [1개월 이내]');
      for (const { sub, parentCat, dept } of warning) {
        const dateStr = new Date(sub.expiry_date).toLocaleDateString('ko-KR');
        lines.push(`${sub.name}: ${dateStr} 만료 (${dept?.name || ''} > ${parentCat?.name || ''})`);
      }
    }
    if (notice.length > 0) {
      lines.push('\n⏰ [3개월 이내]');
      for (const { sub, parentCat, dept } of notice) {
        const dateStr = new Date(sub.expiry_date).toLocaleDateString('ko-KR');
        lines.push(`${sub.name}: ${dateStr} 만료 (${dept?.name || ''} > ${parentCat?.name || ''})`);
      }
    }

    lines.push(`\n(총 ${subcategories.length}건)`);
    lines.push('\n아래 카드를 클릭하면 해당 카테고리로 이동합니다.');

    // 카드용 데이터 생성
    const docs: ChatSearchResult[] = [...urgent, ...warning, ...notice].map(({ sub, parentCat, dept }) => ({
      id: sub.id,
      name: sub.name,
      categoryName: parentCat?.name || '',
      departmentName: dept?.name || '',
      storageLocation: null,
      uploadDate: sub.expiry_date,
      subcategoryId: sub.id,
      parentCategoryId: sub.parent_category_id,
    }));

    return { text: lines.join('\n'), docs };
  } catch (error) {
    console.error('만기 조회 오류:', error);
    return { text: '만기 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
  }
}

// 공유 문서 조회
async function getSharedDocuments(): Promise<{ text: string; docs: ChatSearchResult[] }> {
  const { user } = useAuthStore.getState();
  if (!user?.id) {
    return { text: '사용자 정보를 찾을 수 없습니다.', docs: [] };
  }

  try {
    const { data: shares, error } = await supabase
      .from('shared_documents')
      .select(`
        id,
        document_id,
        shared_at,
        shared_to_user_id,
        documents!inner (
          id,
          title,
          department_id,
          parent_category_id,
          subcategory_id
        )
      `)
      .eq('shared_by_user_id', user.id)
      .eq('is_active', true)
      .order('shared_at', { ascending: false });

    if (error) {
      console.error('공유 문서 조회 오류:', error);
      return { text: '공유 문서 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
    }

    if (!shares?.length) {
      return { text: '공유한 문서가 없습니다.', docs: [] };
    }

    // 수신자 정보 조회
    const recipientIds = [...new Set(shares.map((s: { shared_to_user_id: string }) => s.shared_to_user_id))];
    const { data: recipients } = await supabase
      .from('users')
      .select('id, name')
      .in('id', recipientIds);

    const recipientMap = new Map(recipients?.map((r: { id: string; name: string }) => [r.id, r.name]) || []);

    const lines: string[] = [`총 ${shares.length}개의 문서를 공유했습니다:`];

    for (const share of shares.slice(0, 10)) {
      const doc = share.documents as any;
      const recipientName = recipientMap.get(share.shared_to_user_id) || '알 수 없음';
      const sharedDate = new Date(share.shared_at).toLocaleDateString('ko-KR');
      lines.push(`\n🔗 ${doc.title} → ${recipientName}님에게 공유 (${sharedDate})`);
    }

    lines.push('\n아래 카드를 클릭하면 해당 문서로 이동합니다.');

    // 카드용 데이터 생성
    const docs: ChatSearchResult[] = shares.slice(0, 10).map((share: any) => {
      const doc = share.documents as any;
      const recipientName = recipientMap.get(share.shared_to_user_id) || '알 수 없음';
      return {
        id: doc.id,
        name: doc.title,
        categoryName: `${recipientName}님에게 공유`,
        departmentName: '',
        storageLocation: null,
        uploadDate: share.shared_at,
        subcategoryId: doc.subcategory_id || '',
        parentCategoryId: doc.parent_category_id || '',
      };
    });

    return { text: lines.join('\n'), docs };
  } catch (error) {
    console.error('공유 문서 조회 오류:', error);
    return { text: '공유 문서 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
  }
}

// NFC 등록 현황 조회
async function getNfcStatus(): Promise<{ text: string; docs: ChatSearchResult[] }> {
  const { user } = useAuthStore.getState();
  if (!user?.companyId) {
    return { text: '사용자 정보를 찾을 수 없습니다.', docs: [] };
  }

  try {
    // 부서 목록 조회
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('company_id', user.companyId);

    if (deptError || !departments?.length) {
      return { text: '부서 정보를 조회할 수 없습니다.', docs: [] };
    }

    const departmentIds2 = departments.map((d: { id: string; name: string }) => d.id);

    // 대분류 조회
    const { data: parentCategories, error: catError } = await supabase
      .from('categories')
      .select('id, name, department_id')
      .in('department_id', departmentIds2);

    if (catError || !parentCategories?.length) {
      return { text: '카테고리 정보를 조회할 수 없습니다.', docs: [] };
    }

    const parentCategoryIds2 = parentCategories.map((c: { id: string; name: string; department_id: string }) => c.id);

    // 세부카테고리 조회
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('id, name, nfc_tag_id, nfc_registered, parent_category_id')
      .in('parent_category_id', parentCategoryIds2);

    if (subError) {
      console.error('NFC 조회 오류:', subError);
      return { text: 'NFC 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
    }

    if (!subcategories?.length) {
      return { text: '세부 스토리지가 없습니다.', docs: [] };
    }

    const registered = subcategories.filter((s: { nfc_tag_id: string | null; nfc_registered: boolean }) => s.nfc_tag_id || s.nfc_registered);
    const unregistered = subcategories.filter((s: { nfc_tag_id: string | null; nfc_registered: boolean }) => !s.nfc_tag_id && !s.nfc_registered);

    const lines: string[] = ['NFC 등록 현황:'];
    lines.push(`\n✅ NFC 등록됨: ${registered.length}개`);
    lines.push(`❌ NFC 미등록: ${unregistered.length}개`);
    lines.push('\n아래 카드를 클릭하면 해당 카테고리로 이동합니다.');

    // 카드용 데이터 생성 (미등록 우선 표시)
    const allSubs = [...unregistered.slice(0, 5), ...registered.slice(0, 5)];
    const docs: ChatSearchResult[] = allSubs.map((sub: any) => {
      const parentCat = parentCategories.find((c: { id: string; name: string; department_id: string }) => c.id === sub.parent_category_id);
      const dept = departments.find((d: { id: string; name: string }) => d.id === parentCat?.department_id);
      const isRegistered = sub.nfc_tag_id || sub.nfc_registered;
      return {
        id: sub.id,
        name: `${isRegistered ? '✅' : '❌'} ${sub.name}`,
        categoryName: parentCat?.name || '',
        departmentName: dept?.name || '',
        storageLocation: isRegistered ? `NFC: ${sub.nfc_tag_id || '등록됨'}` : 'NFC 미등록',
        uploadDate: '',
        subcategoryId: sub.id,
        parentCategoryId: sub.parent_category_id,
      };
    });

    return { text: lines.join('\n'), docs };
  } catch (error) {
    console.error('NFC 조회 오류:', error);
    return { text: 'NFC 정보를 조회하는 중 오류가 발생했습니다.', docs: [] };
  }
}

// 기존 규칙 기반 응답 (Gemini 장애 시 폴백용)
function generateFallbackResponse(message: string): string {
  console.log('fallback 로직 사용');
  const text = message.trim();
  const store = useDocumentStore.getState();
  const { documents, categories, departments, parentCategories, subcategories } = store;

  if (!text) {
    return '질문을 입력해 주세요. 예: "급여 명세 문서는 어디에 있어?", "전체 문서 수 알려줘"';
  }

  // ========== 빠른 통계 응답 (로컬 데이터 기반 - 단순 includes 체크) ==========
  const t = text.toLowerCase();
  const hasCount = t.includes('수') || t.includes('몇') || t.includes('개') || t.includes('갯수');
  const hasList = t.includes('목록') || t.includes('리스트') || t.includes('보여') || t.includes('알려');
  
  // 전체 현황/통계 요청
  if (t.includes('현황') || t.includes('통계') || t.includes('상태')) {
    return [
      '현재 시스템 현황입니다:',
      `- 부서: ${departments.length}개`,
      `- 대분류: ${parentCategories.length}개`,
      `- 세부 스토리지: ${subcategories.length}개`,
      `- 문서: ${documents.length}개`,
    ].join('\n');
  }

  // 대분류 수 질문
  if (t.includes('대분류') && hasCount) {
    return `현재 시스템에 등록된 대분류는 총 ${parentCategories.length}개입니다.`;
  }

  // 문서 수 질문
  if (t.includes('문서') && hasCount) {
    return `현재 시스템에 등록된 문서는 총 ${documents.length}개입니다.`;
  }

  // 세부 스토리지 수 질문
  if ((t.includes('세부') || t.includes('스토리지')) && hasCount) {
    return `현재 시스템에 등록된 세부 스토리지는 총 ${subcategories.length}개입니다.`;
  }

  // 부서 수 질문
  if (t.includes('부서') && hasCount) {
    return `현재 시스템에 등록된 부서는 총 ${departments.length}개입니다.`;
  }

  // 카테고리 수 질문
  if (t.includes('카테고리') && hasCount) {
    return [
      '현재 시스템에 등록된 카테고리 현황:',
      `- 대분류: ${parentCategories.length}개`,
      `- 세부 스토리지: ${subcategories.length}개`,
    ].join('\n');
  }

  // NFC 등록 현황
  if (t.includes('nfc')) {
    const registered = subcategories.filter(s => s.nfcRegistered).length;
    const unregistered = subcategories.length - registered;
    return [
      'NFC 등록 현황:',
      `- 등록됨: ${registered}개`,
      `- 미등록: ${unregistered}개`,
      `- 전체: ${subcategories.length}개`,
    ].join('\n');
  }

  // 대분류 목록
  if (t.includes('대분류') && hasList) {
    if (parentCategories.length === 0) return '등록된 대분류가 없습니다.';
    const items = parentCategories.slice(0, 15).map(pc => {
      const dept = departments.find(d => d.id === pc.departmentId);
      return `- ${pc.name} (${dept?.name || '부서 정보 없음'}, 문서 ${pc.documentCount}건)`;
    });
    const header = `대분류 목록 (총 ${parentCategories.length}개${parentCategories.length > 15 ? ', 상위 15개 표시' : ''}):`;
    return [header, ...items].join('\n');
  }

  // 세부 스토리지 목록
  if ((t.includes('세부') || t.includes('스토리지')) && hasList) {
    if (subcategories.length === 0) return '등록된 세부 스토리지가 없습니다.';
    const items = subcategories.slice(0, 15).map(sc => {
      const dept = departments.find(d => d.id === sc.departmentId);
      const pc = parentCategories.find(p => p.id === sc.parentCategoryId);
      return `- ${sc.name} (${dept?.name || ''} → ${pc?.name || ''}, 문서 ${sc.documentCount}건)`;
    });
    const header = `세부 스토리지 목록 (총 ${subcategories.length}개${subcategories.length > 15 ? ', 상위 15개 표시' : ''}):`;
    return [header, ...items].join('\n');
  }

  // 부서 목록
  if (t.includes('부서') && hasList) {
    if (departments.length === 0) return '등록된 부서가 없습니다.';
    const items = departments.map(d => `- ${d.name} (문서 ${d.documentCount}건)`);
    return [`부서 목록 (총 ${departments.length}개):`, ...items].join('\n');
  }

  // ========== 기존 로직 ==========

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

  // 1. 보관 장소 질문: "보관 장소", "보관장소", "어디" 포함 시 — 4단 계층 전체 검색
  if (text.includes('보관 장소') || text.includes('보관장소') || text.includes('어디')) {
    const searchKeyword = text.replace(/보관\s?장소|어디|어딨|있어|찾아|위치|줘|요|알려|\?/g, '').trim().toLowerCase();
    const locationLines: string[] = [];

    // 대분류 검색
    const matchedParentCats = parentCategories.filter((pc) =>
      pc.name.toLowerCase().includes(searchKeyword)
    );
    if (matchedParentCats.length > 0) {
      locationLines.push('📁 **대분류**에서 찾았습니다:');
      for (const pc of matchedParentCats.slice(0, 5)) {
        const dept = departments.find((d) => d.id === pc.departmentId);
        locationLines.push(`- ${pc.name}\n  · 부서: ${dept?.name || '부서 정보 없음'}\n  · 세부 스토리지: ${pc.subcategoryCount}개\n  · 문서 수: ${pc.documentCount}건`);
      }
    }

    // 세부카테고리 검색
    const matchedSubs = subcategories.filter((sc) =>
      sc.name.toLowerCase().includes(searchKeyword)
    );
    if (matchedSubs.length > 0) {
      if (locationLines.length > 0) locationLines.push('');
      locationLines.push('📂 **세부 스토리지**에서 찾았습니다:');
      for (const sc of matchedSubs.slice(0, 5)) {
        const dept = departments.find((d) => d.id === sc.departmentId);
        const parentCat = parentCategories.find((pc) => pc.id === sc.parentCategoryId);
        const location = sc.storageLocation || '위치 미지정';
        locationLines.push(`- ${sc.name}\n  · 경로: ${dept?.name || ''} → ${parentCat?.name || ''} → ${sc.name}\n  · 보관 장소: ${location}\n  · 문서 수: ${sc.documentCount}건`);
      }
    }

    // 문서 검색
    const docResults = searchDocuments(text);
    if (docResults.length > 0) {
      if (locationLines.length > 0) locationLines.push('');
      locationLines.push('📄 **문서**에서 찾았습니다:');
      for (const doc of docResults.slice(0, 5)) {
        const location = doc.storageLocation || '위치 미지정';
        const dept = doc.departmentName || '부서 정보 없음';
        const category = doc.categoryName || '카테고리 정보 없음';
        locationLines.push(`- ${doc.name}\n  · 부서: ${dept}\n  · 카테고리: ${category}\n  · 보관 장소: ${location}`);
      }
    }

    if (locationLines.length === 0) {
      return '해당 키워드와 관련된 항목을 찾지 못했어요. 다른 키워드로 다시 검색해 주세요.';
    }

    return locationLines.join('\n');
  }

  // 2. 문서 개수 질문: "문서 수" 또는 "몇 개" 포함 시
  if (text.includes('문서 수') || text.includes('몇 개')) {
    const total = documents.length;
    return `현재 시스템에 등록된 문서는 총 ${total}개입니다.`;
  }

  // 3. 부서별 통계: "부서" 포함 시 (단, 팀원/사람 관련 질문은 제외 - Edge Function에서 처리)
  const needsUserQuery = text.includes('팀원') || text.includes('멤버') || text.includes('사람') || text.includes('직원') || text.includes('사용자') || text.includes('누구');
  if (text.includes('부서') && !needsUserQuery) {
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
      return `- ${cat.name} (${cat.documentCount}건) - 보관 장소: ${location}`;
    });

    return ['등록된 카테고리 목록입니다:', ...lines].join('\n');
  }

  // 5. 기본: 4단 계층 통합 검색 또는 도움말
  const keyword = text.toLowerCase();
  const allLines: string[] = [];

  // 대분류 검색
  const matchedPCs = parentCategories.filter((pc) => pc.name.toLowerCase().includes(keyword));
  if (matchedPCs.length > 0) {
    allLines.push('📁 **대분류**:');
    for (const pc of matchedPCs.slice(0, 3)) {
      const dept = departments.find((d) => d.id === pc.departmentId);
      allLines.push(`- ${pc.name} (부서: ${dept?.name || '알 수 없음'}, 문서: ${pc.documentCount}건)`);
    }
  }

  // 세부카테고리 검색
  const matchedSCs = subcategories.filter((sc) => sc.name.toLowerCase().includes(keyword));
  if (matchedSCs.length > 0) {
    if (allLines.length > 0) allLines.push('');
    allLines.push('📂 **세부 스토리지**:');
    for (const sc of matchedSCs.slice(0, 3)) {
      const dept = departments.find((d) => d.id === sc.departmentId);
      const parentCat = parentCategories.find((pc) => pc.id === sc.parentCategoryId);
      allLines.push(`- ${sc.name} (${dept?.name || ''} → ${parentCat?.name || ''}, 문서: ${sc.documentCount}건)`);
    }
  }

  // 문서 검색
  const results = searchDocuments(text);
  if (results.length > 0) {
    if (allLines.length > 0) allLines.push('');
    allLines.push('📄 **문서**:');
    for (const doc of results.slice(0, 5)) {
      const dept = doc.departmentName || '부서 정보 없음';
      const category = doc.categoryName || '카테고리 정보 없음';
      allLines.push(`- ${doc.name} (부서: ${dept}, 카테고리: ${category})`);
    }
  }

  if (allLines.length > 0) {
    return ['다음 항목을 찾았습니다:', ...allLines].join('\n');
  }

  return [
    '해당 키워드와 관련된 항목을 찾지 못했어요.',
    '다음과 같이 질문해 보세요:',
    '- "급여 명세 문서는 어디에 있어?"',
    '- "전체 문서 수 알려줘"',
    '- "부서별 문서 수 알려줘"',
    '- "카테고리 목록 보여줘"',
    '- "만기 임박 문서 알려줘"',
    '- "공유한 문서 목록"',
    '- "NFC 등록 현황"',
  ].join('\n');
}

// 비동기 폴백 응답 생성 (만기, 공유, NFC 조회용)
async function generateAsyncFallbackResponse(message: string): Promise<{ text: string; docs: ChatSearchResult[] } | null> {
  const text = message.trim();

  // 만기 임박 조회
  if (isExpiryIntent(text)) {
    return await getExpiringSubcategories();
  }

  // 공유 문서 조회
  if (isSharedDocumentIntent(text)) {
    return await getSharedDocuments();
  }

  // NFC 등록 현황 조회
  if (isNfcIntent(text)) {
    return await getNfcStatus();
  }

  return null;
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

  // 빠른 답변이 필요한 질문들 (즉시 fallback 처리 - 단순 includes 체크)
  const t = text.toLowerCase();
  const hasCount = t.includes('수') || t.includes('몇') || t.includes('개') || t.includes('갯수');
  const hasList = t.includes('목록') || t.includes('리스트') || t.includes('보여') || t.includes('알려');
  const hasEntity = t.includes('문서') || t.includes('부서') || t.includes('대분류') || t.includes('세부') || t.includes('스토리지') || t.includes('카테고리');
  const hasStatus = t.includes('현황') || t.includes('통계') || t.includes('상태');
  const hasNfc = t.includes('nfc');
  
  // DB 조회가 필요한 질문들 → Edge Function으로 넘김
  const needsDbQuery = 
    t.includes('팀원') || t.includes('멤버') || t.includes('사람') || t.includes('직원') || t.includes('사용자') || t.includes('누구') ||
    // OCR 텍스트 검색 (내용 검색)
    t.includes('내용') || t.includes('포함') || t.includes('들어있') || t.includes('있는 문서') || t.includes('찾아');
  
  const isFastReply = !needsDbQuery && (hasNfc || hasStatus || (hasEntity && (hasCount || hasList)));
  
  if (isFastReply) {
    console.log('[Chatbot] Fast reply 사용:', text);
    return emitFallback();
  }

  // 만기, 공유, NFC 조회는 비동기 폴백으로 처리
  const asyncFallback = await generateAsyncFallbackResponse(text);
  if (asyncFallback) {
    if (onPartialUpdate) {
      onPartialUpdate(asyncFallback.text, asyncFallback.docs);
    }
    return { text: asyncFallback.text, docs: asyncFallback.docs };
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
          const cleanedText = cleanJsonResponse(displayText);
          onPartialUpdate(cleanedText, []);
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
        parsedDocs = rawDocs
          .map((d: any) => ({
            id: d.id ?? '',
            name: d.title ?? '제목 없음',
            categoryName: d.categoryName ?? '',
            departmentName: d.departmentName ?? '',
            storageLocation: d.storageLocation ?? null,
            uploadDate: d.uploadDate ?? '',
            subcategoryId: d.subcategoryId ?? '',
            parentCategoryId: d.parentCategoryId ?? '',
          }))
          .filter((d: ChatSearchResult) => d.subcategoryId && d.parentCategoryId);
      } catch (parseErr) {
        console.error('Failed to parse docs JSON from stream:', parseErr);
      }
    }

    // JSON 응답 정리
    const cleanedResponseText = cleanJsonResponse(responseText);
    
    // 최종 콜백으로 문서 정보 전달
    if (onPartialUpdate) {
      onPartialUpdate(cleanedResponseText, parsedDocs);
    }

    return { text: cleanedResponseText, docs: parsedDocs };
  } catch (error) {
    console.error('AI response error:', error);
    return emitFallback();
  }
}
