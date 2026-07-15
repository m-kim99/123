import { supabase } from '@/lib/supabase';

// ============================================================
// 온보딩 초기 구조 템플릿 (업종별 부서 + 대분류)
// AI 제안(onboarding-scaffold 엣지함수)의 베이스로도 사용됨.
// 부서 수는 플랜 한도(체험=프로 10개)보다 작게 유지할 것.
// ============================================================

export interface ScaffoldDept {
  name: string;
  categories: string[];
}

export type IndustryKey = 'manufacturing' | 'construction' | 'medical' | 'trade' | 'office' | 'other';

export const INDUSTRY_KEYS: IndustryKey[] = ['manufacturing', 'construction', 'medical', 'trade', 'office', 'other'];

const TEMPLATES: Record<IndustryKey, { ko: ScaffoldDept[]; en: ScaffoldDept[] }> = {
  manufacturing: {
    ko: [
      { name: '생산관리', categories: ['작업지시서', '생산일지', '설비점검'] },
      { name: '품질관리', categories: ['검사성적서', '인증서', '부적합보고'] },
      { name: '자재구매', categories: ['발주서', '거래명세서'] },
      { name: '영업', categories: ['계약서', '견적서'] },
      { name: '경영지원', categories: ['인사', '회계'] },
    ],
    en: [
      { name: 'Production', categories: ['Work Orders', 'Production Logs', 'Equipment Checks'] },
      { name: 'Quality', categories: ['Inspection Reports', 'Certificates'] },
      { name: 'Procurement', categories: ['Purchase Orders', 'Invoices'] },
      { name: 'Sales', categories: ['Contracts', 'Quotations'] },
      { name: 'Administration', categories: ['HR', 'Accounting'] },
    ],
  },
  construction: {
    ko: [
      { name: '현장관리', categories: ['작업일보', '현장사진', '자재반입'] },
      { name: '공무', categories: ['계약서', '설계도서', '기성청구'] },
      { name: '안전관리', categories: ['안전교육', '위험성평가', '사고보고'] },
      { name: '경영지원', categories: ['인사', '회계'] },
    ],
    en: [
      { name: 'Site Management', categories: ['Daily Reports', 'Site Photos', 'Materials'] },
      { name: 'Contracts & Engineering', categories: ['Contracts', 'Drawings', 'Progress Billing'] },
      { name: 'Safety', categories: ['Safety Training', 'Risk Assessments', 'Incident Reports'] },
      { name: 'Administration', categories: ['HR', 'Accounting'] },
    ],
  },
  medical: {
    ko: [
      { name: '원무', categories: ['접수서류', '보험청구'] },
      { name: '진료지원', categories: ['검사기록', '동의서'] },
      { name: '행정', categories: ['인사', '회계'] },
      { name: '시설관리', categories: ['장비점검', '소독일지'] },
    ],
    en: [
      { name: 'Patient Affairs', categories: ['Registration', 'Insurance Claims'] },
      { name: 'Clinical Support', categories: ['Test Records', 'Consent Forms'] },
      { name: 'Administration', categories: ['HR', 'Accounting'] },
      { name: 'Facilities', categories: ['Equipment Checks', 'Sanitation Logs'] },
    ],
  },
  trade: {
    ko: [
      { name: '영업', categories: ['계약서', '견적서'] },
      { name: '구매', categories: ['발주서', '수입서류'] },
      { name: '물류', categories: ['입출고', '재고관리'] },
      { name: '경영지원', categories: ['인사', '회계'] },
    ],
    en: [
      { name: 'Sales', categories: ['Contracts', 'Quotations'] },
      { name: 'Purchasing', categories: ['Purchase Orders', 'Import Documents'] },
      { name: 'Logistics', categories: ['Inbound/Outbound', 'Inventory'] },
      { name: 'Administration', categories: ['HR', 'Accounting'] },
    ],
  },
  office: {
    ko: [
      { name: '경영지원', categories: ['인사', '총무'] },
      { name: '재무회계', categories: ['전표', '세금계산서'] },
      { name: '영업', categories: ['계약서', '제안서'] },
      { name: '법무', categories: ['계약검토', '인허가'] },
    ],
    en: [
      { name: 'Administration', categories: ['HR', 'General Affairs'] },
      { name: 'Finance', categories: ['Vouchers', 'Tax Invoices'] },
      { name: 'Sales', categories: ['Contracts', 'Proposals'] },
      { name: 'Legal', categories: ['Contract Review', 'Licenses'] },
    ],
  },
  other: {
    ko: [
      { name: '총무', categories: ['공문', '비품관리'] },
      { name: '인사', categories: ['근로계약', '증명서'] },
      { name: '회계', categories: ['전표', '영수증'] },
    ],
    en: [
      { name: 'General Affairs', categories: ['Official Documents', 'Supplies'] },
      { name: 'HR', categories: ['Employment Contracts', 'Certificates'] },
      { name: 'Accounting', categories: ['Vouchers', 'Receipts'] },
    ],
  },
};

/** 업종·언어별 템플릿 (수정해도 원본이 오염되지 않도록 깊은 복사) */
export function getScaffoldTemplate(industry: IndustryKey, locale: string): ScaffoldDept[] {
  const lang = locale.slice(0, 2) === 'ko' ? 'ko' : 'en';
  return TEMPLATES[industry][lang].map((d) => ({ name: d.name, categories: [...d.categories] }));
}

/** 대분류가 하나도 없는(사실상 빈) 회사인지 — 초기 구조 위저드 표시 판단용 */
export async function companyNeedsScaffold(companyId: string): Promise<boolean> {
  try {
    const { data: deptRows } = await supabase
      .from('departments')
      .select('id')
      .eq('company_id', companyId);
    const deptIds = (deptRows || []).map((d: { id: string }) => d.id);
    if (deptIds.length === 0) return true;
    const { count } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .in('department_id', deptIds);
    return (count ?? 0) === 0;
  } catch {
    return false;
  }
}
