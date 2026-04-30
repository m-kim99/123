import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 핵심 함수 (OCR 문서 검색 포함)
const functionDeclarations = [
  { name: 'search_documents', description: '문서 제목 또는 OCR 텍스트 내용으로 문서를 검색합니다. 특정 내용이 포함된 문서를 찾을 때 사용합니다.', parameters: { type: 'object', properties: { keyword: { type: 'string', description: '검색할 키워드 (문서 제목 또는 OCR 텍스트 내용)' }, department_name: { type: 'string', description: '특정 부서로 필터링 (선택)' }, limit: { type: 'number', description: '결과 개수 제한' } }, required: ['keyword'] } },
  { name: 'get_department_stats', description: '특정 부서의 상세 정보를 조회합니다.', parameters: { type: 'object', properties: { department_name: { type: 'string', description: '부서명' } }, required: ['department_name'] } },
  { name: 'get_parent_category_stats', description: '특정 대분류의 상세 정보를 조회합니다.', parameters: { type: 'object', properties: { category_name: { type: 'string', description: '대분류명' } }, required: ['category_name'] } },
  { name: 'get_subcategory_stats', description: '특정 세부카테고리의 상세 정보를 조회합니다.', parameters: { type: 'object', properties: { subcategory_name: { type: 'string', description: '세부카테고리명' } }, required: ['subcategory_name'] } },
  { name: 'list_children', description: '특정 항목의 하위 목록을 조회합니다.', parameters: { type: 'object', properties: { parent_type: { type: 'string', enum: ['department', 'parent_category', 'subcategory'] }, parent_name: { type: 'string' }, limit: { type: 'number' } }, required: ['parent_type', 'parent_name'] } },
  { name: 'get_department_members', description: '특정 부서의 소속 팀원 목록을 조회합니다.', parameters: { type: 'object', properties: { department_name: { type: 'string' } }, required: ['department_name'] } },
  { name: 'get_user_info', description: '특정 사용자의 정보를 조회합니다.', parameters: { type: 'object', properties: { user_name: { type: 'string' } }, required: ['user_name'] } },
  { name: 'get_my_info', description: '현재 로그인한 사용자의 정보를 조회합니다.', parameters: { type: 'object', properties: {}, required: [] } },
  { name: 'get_expiring_subcategories', description: '만료 임박한 세부카테고리 목록을 조회합니다.', parameters: { type: 'object', properties: { days: { type: 'number' } }, required: [] } },
  { name: 'get_shared_documents', description: '내가 공유한 문서 또는 나에게 공유된 문서 목록을 조회합니다.', parameters: { type: 'object', properties: { direction: { type: 'string', enum: ['shared_by_me', 'shared_to_me'] }, limit: { type: 'number' } }, required: ['direction'] } },
  { name: 'get_total_counts', description: '전체 시스템의 항목 개수를 조회합니다.', parameters: { type: 'object', properties: {}, required: [] } },
  { name: 'list_all', description: '특정 타입의 전체 항목 목록을 조회합니다.', parameters: { type: 'object', properties: { entity_type: { type: 'string', enum: ['department', 'parent_category', 'subcategory', 'document'] }, limit: { type: 'number' } }, required: ['entity_type'] } },
  { name: 'get_ranking', description: '부서별 문서 개수 순위를 조회합니다.', parameters: { type: 'object', properties: { limit: { type: 'number' } }, required: [] } },
  { name: 'find_empty', description: '문서가 없는 빈 세부카테고리를 찾습니다.', parameters: { type: 'object', properties: { limit: { type: 'number' } }, required: [] } },
  { name: 'get_hierarchy_path', description: '특정 항목의 전체 경로를 조회합니다.', parameters: { type: 'object', properties: { entity_type: { type: 'string', enum: ['department', 'parent_category', 'subcategory', 'document'] }, name: { type: 'string' } }, required: ['entity_type', 'name'] } },
  { name: 'search_by_location', description: '보관위치(storage_location)로 세부카테고리를 검색합니다.', parameters: { type: 'object', properties: { location_keyword: { type: 'string' } }, required: ['location_keyword'] } },
  { name: 'unified_search', description: '부서, 대분류, 세부카테고리, 문서를 동시에 통합 검색합니다.', parameters: { type: 'object', properties: { keyword: { type: 'string' }, limit: { type: 'number' } }, required: ['keyword'] } },
];

async function getDeptIds(supabase: any, companyId: string): Promise<string[]> {
  const { data } = await supabase.from('departments').select('id').eq('company_id', companyId);
  return (data || []).map((d: any) => d.id);
}

function extractKeywords(message: string): string {
  const patterns = [
    /(?:어디|where).*?([가-힣a-zA-Z0-9\s]{2,})/i,
    /([가-힣a-zA-Z0-9\s]{2,}).*?(?:찾|search|find)/i,
    /"([^"]+)"/,
    /'([^']+)'/,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m && m[1]) {
      const keyword = m[1].trim();
      const stopwords = ['문서', '어디', '있어', '위치', 'document', 'where', 'located', 'find', 'search'];
      const filtered = keyword.split(/\s+/).filter(w => w.length >= 2 && !stopwords.includes(w.toLowerCase()));
      if (filtered.length > 0) return filtered.join(' ');
    }
  }
  return '';
}

async function preSearch(supabase: any, companyId: string, deptIds: string[], keyword: string) {
  console.log(`🔍 preSearch 시작: keyword="${keyword}"`);
  if (!keyword || keyword.length < 2) return null;
  
  const [deptR, catR, subR, docR] = await Promise.all([
    supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${keyword}%`).limit(5),
    supabase.from('categories').select('id, name, department_id, department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(5),
    supabase.from('subcategories').select('id, name, storage_location, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(5),
    supabase.from('documents').select('id, title, uploaded_at, subcategory_id, parent_category_id, parent_category:categories(id, name), department:departments(id, name), ocr_text').in('department_id', deptIds).not('subcategory_id', 'is', null).or(`title.ilike.%${keyword}%,ocr_text.ilike.%${keyword}%`).limit(5),
  ]);
  
  const results: any[] = [];
  for (const d of deptR.data || []) {
    results.push({ type: 'department', name: d.name, path: d.name, link: `/admin/department/${d.id}`, department: d.name });
  }
  for (const c of catR.data || []) {
    results.push({ type: 'parent_category', name: c.name, department: c.department?.name, path: `${c.department?.name} → ${c.name}`, link: `/admin/department/${c.department_id}/category/${c.id}`, parent_category: c.name });
  }
  for (const s of subR.data || []) {
    results.push({ type: 'subcategory', name: s.name, department: s.department?.name, parent_category: s.parent_category?.name, path: `${s.department?.name} → ${s.parent_category?.name} → ${s.name}`, link: `/admin/category/${s.parent_category_id}/subcategory/${s.id}`, storage_location: s.storage_location || '미지정' });
  }
  
  const docsNeedingParent = (docR.data || []).filter((d: any) => d.subcategory_id && !d.parent_category_id);
  let subParentMap = new Map<string, string>();
  if (docsNeedingParent.length > 0) {
    const missingSubIds = docsNeedingParent.map((d: any) => d.subcategory_id);
    const { data: subParentData } = await supabase.from('subcategories').select('id, parent_category_id').in('id', missingSubIds);
    for (const s of subParentData || []) {
      if (s.parent_category_id) subParentMap.set(s.id, s.parent_category_id);
    }
  }
  
  for (const d of docR.data || []) {
    let ocrSnippet = '';
    if (d.ocr_text) {
      const searchWords = keyword.split(/\s+/).filter(w => w.length >= 2);
      if (searchWords.length > 0) {
        const firstWord = searchWords[0];
        const idx = d.ocr_text.toLowerCase().indexOf(firstWord.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(d.ocr_text.length, idx + firstWord.length + 50);
          ocrSnippet = (start > 0 ? '...' : '') + d.ocr_text.substring(start, end).trim() + (end < d.ocr_text.length ? '...' : '');
        } else {
          ocrSnippet = d.ocr_text.substring(0, 100).trim() + '...';
        }
      } else {
        ocrSnippet = d.ocr_text.substring(0, 100).trim() + '...';
      }
    }
    
    const parentCatId = d.parent_category_id || subParentMap.get(d.subcategory_id) || null;
    
    results.push({ 
      type: 'document', 
      name: d.title, 
      path: d.title, 
      link: (d.subcategory_id && parentCatId) ? `/admin/category/${parentCatId}/subcategory/${d.subcategory_id}` : null, 
      storage_location: null, 
      ocr_snippet: ocrSnippet,
      uploaded_at: d.uploaded_at 
    });
  }
  
  console.log(`✅ preSearch 결과: 총 ${results.length}건 (부서:${deptR.data?.length || 0}, 대분류:${catR.data?.length || 0}, 세부:${subR.data?.length || 0}, 문서:${docR.data?.length || 0})`);
  
  return results.length > 0 ? { keyword, results } : null;
}

async function executeFunction(name: string, args: any, supabase: any, companyId: string, userId: string): Promise<string> {
  try {
    const deptIds = await getDeptIds(supabase, companyId);
    
    switch (name) {
      case 'search_documents': {
        const { keyword, department_name, limit = 10 } = args;
        let query = supabase.from('documents').select('id, title, uploaded_at, subcategory:subcategories(name, storage_location), parent_category:categories(name), department:departments(name)').in('department_id', deptIds).or(`title.ilike.%${keyword}%,ocr_text.ilike.%${keyword}%`);
        if (department_name) {
          const { data: dept } = await supabase.from('departments').select('id').eq('company_id', companyId).ilike('name', `%${department_name}%`).single();
          if (dept) query = query.eq('department_id', dept.id);
        }
        const { data } = await query.order('uploaded_at', { ascending: false }).limit(limit);
        return JSON.stringify({ documents: (data || []).map((d: any) => ({ title: d.title, department: d.department?.name, parent_category: d.parent_category?.name, subcategory: d.subcategory?.name, storage_location: d.subcategory?.storage_location, uploaded_at: d.uploaded_at })), count: data?.length || 0 });
      }
      case 'get_department_stats': {
        const { data: dept } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${args.department_name}%`).single();
        if (!dept) return JSON.stringify({ error: `'${args.department_name}' 부서를 찾을 수 없습니다.` });
        const [userCount, catCount, subCount, docCount] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('department_id', dept.id).eq('company_id', companyId),
          supabase.from('categories').select('id', { count: 'exact', head: true }).eq('department_id', dept.id),
          supabase.from('subcategories').select('id', { count: 'exact', head: true }).eq('department_id', dept.id),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('department_id', dept.id),
        ]);
        return JSON.stringify({ department_name: dept.name, user_count: userCount.count, parent_category_count: catCount.count, subcategory_count: subCount.count, document_count: docCount.count });
      }
      case 'get_parent_category_stats': {
        const { data: cat } = await supabase.from('categories').select('id, name, department:departments(name)').in('department_id', deptIds).ilike('name', `%${args.category_name}%`).single();
        if (!cat) return JSON.stringify({ error: `'${args.category_name}' 대분류를 찾을 수 없습니다.` });
        const [subCount, docCount] = await Promise.all([
          supabase.from('subcategories').select('id', { count: 'exact', head: true }).eq('parent_category_id', cat.id),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('parent_category_id', cat.id),
        ]);
        return JSON.stringify({ category_name: cat.name, department_name: cat.department?.name, subcategory_count: subCount.count, document_count: docCount.count });
      }
      case 'get_subcategory_stats': {
        const { data: sub } = await supabase.from('subcategories').select('id, name, storage_location, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).ilike('name', `%${args.subcategory_name}%`).single();
        if (!sub) return JSON.stringify({ error: `'${args.subcategory_name}' 세부카테고리를 찾을 수 없습니다.` });
        const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('subcategory_id', sub.id);
        return JSON.stringify({ subcategory_name: sub.name, parent_category_name: sub.parent_category?.name, department_name: sub.department?.name, storage_location: sub.storage_location || '미지정', document_count: count });
      }
      case 'list_children': {
        const { parent_type, parent_name, limit = 10 } = args;
        if (parent_type === 'department') {
          const { data: dept } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${parent_name}%`).single();
          if (!dept) return JSON.stringify({ error: `'${parent_name}' 부서를 찾을 수 없습니다.`, children: [], count: 0 });
          const { data } = await supabase.from('categories').select('name').eq('department_id', dept.id).limit(limit);
          return JSON.stringify({ parent: dept.name, children: (data || []).map((c: any) => c.name), count: data?.length || 0 });
        } else if (parent_type === 'parent_category') {
          const { data: cat } = await supabase.from('categories').select('id, name').in('department_id', deptIds).ilike('name', `%${parent_name}%`).single();
          if (!cat) return JSON.stringify({ error: `'${parent_name}' 대분류를 찾을 수 없습니다.`, children: [], count: 0 });
          const { data } = await supabase.from('subcategories').select('name').eq('parent_category_id', cat.id).limit(limit);
          return JSON.stringify({ parent: cat.name, children: (data || []).map((s: any) => s.name), count: data?.length || 0 });
        } else {
          const { data: sub } = await supabase.from('subcategories').select('id, name').in('department_id', deptIds).ilike('name', `%${parent_name}%`).single();
          if (!sub) return JSON.stringify({ error: `'${parent_name}' 세부카테고리를 찾을 수 없습니다.`, children: [], count: 0 });
          const { data } = await supabase.from('documents').select('title').eq('subcategory_id', sub.id).limit(limit);
          return JSON.stringify({ parent: sub.name, children: (data || []).map((d: any) => d.title), count: data?.length || 0 });
        }
      }
      case 'get_total_counts': {
        const [deptCount, catCount, subCount, docCount, userCount] = await Promise.all([
          supabase.from('departments').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('categories').select('id', { count: 'exact', head: true }).in('department_id', deptIds),
          supabase.from('subcategories').select('id', { count: 'exact', head: true }).in('department_id', deptIds),
          supabase.from('documents').select('id', { count: 'exact', head: true }).in('department_id', deptIds),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        ]);
        return JSON.stringify({ departments: deptCount.count, parent_categories: catCount.count, subcategories: subCount.count, documents: docCount.count, users: userCount.count });
      }
      case 'list_all': {
        const { entity_type, limit = 15 } = args;
        let data: any[] = [];
        if (entity_type === 'department') {
          const { data: d } = await supabase.from('departments').select('name').eq('company_id', companyId).limit(limit);
          data = d || [];
        } else if (entity_type === 'parent_category') {
          const { data: d } = await supabase.from('categories').select('name, department:departments(name)').in('department_id', deptIds).limit(limit);
          data = d || [];
        } else if (entity_type === 'subcategory') {
          const { data: d } = await supabase.from('subcategories').select('name, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).limit(limit);
          data = d || [];
        } else {
          const { data: d } = await supabase.from('documents').select('title, department:departments(name)').in('department_id', deptIds).limit(limit);
          data = d || [];
        }
        const items = data.map((item: any) => {
          if (entity_type === 'document') return `${item.title} (${item.department?.name})`;
          if (entity_type === 'parent_category') return `${item.name} (${item.department?.name})`;
          if (entity_type === 'subcategory') return `${item.name} (${item.parent_category?.name}, ${item.department?.name})`;
          return item.name;
        });
        const { count } = await supabase.from(entity_type === 'parent_category' ? 'categories' : entity_type === 'document' ? 'documents' : `${entity_type}s`).select('id', { count: 'exact', head: true })[entity_type === 'department' ? 'eq' : 'in'](entity_type === 'department' ? 'company_id' : 'department_id', entity_type === 'department' ? companyId : deptIds);
        return JSON.stringify({ items, count });
      }
      case 'get_ranking': {
        const { limit = 5 } = args;
        const { data } = await supabase.from('departments').select('id, name').eq('company_id', companyId);
        const ranking = await Promise.all((data || []).map(async (dept: any) => {
          const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('department_id', dept.id);
          return { name: dept.name, document_count: count };
        }));
        ranking.sort((a, b) => b.document_count - a.document_count);
        return JSON.stringify({ ranking: ranking.slice(0, limit) });
      }
      case 'find_empty': {
        const { limit = 10 } = args;
        const { data } = await supabase.from('subcategories').select('id, name').in('department_id', deptIds).limit(limit * 2);
        const empty = [];
        for (const sub of data || []) {
          const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('subcategory_id', sub.id);
          if (count === 0) empty.push(sub.name);
          if (empty.length >= limit) break;
        }
        return JSON.stringify({ empty_items: empty, count: empty.length });
      }
      case 'get_hierarchy_path': {
        const { entity_type, name: n } = args;
        if (entity_type === 'document') {
          const { data: doc } = await supabase.from('documents').select('title, subcategory:subcategories(name), parent_category:categories(name), department:departments(name)').in('department_id', deptIds).ilike('title', `%${n}%`).single();
          if (!doc) return JSON.stringify({ error: `'${n}' 문서를 찾을 수 없습니다.` });
          return JSON.stringify({ path: `${doc.department?.name} → ${doc.parent_category?.name} → ${doc.subcategory?.name} → ${doc.title}`, department: doc.department?.name, parent_category: doc.parent_category?.name, subcategory: doc.subcategory?.name, document: doc.title });
        } else if (entity_type === 'parent_category') {
          const { data: cat } = await supabase.from('categories').select('id, name, department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${n}%`).limit(1).single();
          if (!cat) return JSON.stringify({ error: `'${n}' 대분류를 찾을 수 없습니다.` });
          return JSON.stringify({ path: `${cat.department?.name} → ${cat.name}`, department: cat.department?.name, parent_category: cat.name, link: `/admin/department/${cat.department?.id}/category/${cat.id}` });
        } else if (entity_type === 'department') {
          const { data: dept } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${n}%`).single();
          if (!dept) return JSON.stringify({ error: `'${n}' 부서를 찾을 수 없습니다.` });
          return JSON.stringify({ path: dept.name, department: dept.name, link: `/admin/department/${dept.id}` });
        } else {
          const { data: sub } = await supabase.from('subcategories').select('name, storage_location, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).ilike('name', `%${n}%`).single();
          if (!sub) return JSON.stringify({ error: `'${n}' 세부카테고리를 찾을 수 없습니다.` });
          return JSON.stringify({ path: `${sub.department?.name} → ${sub.parent_category?.name} → ${sub.name}`, department: sub.department?.name, parent_category: sub.parent_category?.name, subcategory: sub.name, storage_location: sub.storage_location || '미지정' });
        }
      }
      case 'search_by_location': {
        const { data } = await supabase.from('subcategories').select('name, storage_location, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).ilike('storage_location', `%${args.location_keyword}%`);
        return JSON.stringify({ subcategories: (data || []).map((s: any) => ({ name: s.name, storage_location: s.storage_location, parent_category: s.parent_category?.name, department: s.department?.name })), count: data?.length || 0 });
      }
      case 'get_department_members': {
        const { data: dept } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${args.department_name}%`).single();
        if (!dept) return JSON.stringify({ error: `'${args.department_name}' 부서를 찾을 수 없습니다.`, members: [], count: 0 });
        const { data: users } = await supabase.from('users').select('name, email, role').eq('department_id', dept.id).eq('company_id', companyId);
        if (!users || users.length === 0) return JSON.stringify({ department: dept.name, members: [], count: 0, message: `${dept.name}에 등록된 팀원이 없습니다.` });
        return JSON.stringify({ department: dept.name, members: users.map((u: any) => ({ name: u.name || u.email, email: u.email, role: u.role })), count: users.length });
      }
      case 'get_user_info': {
        const { data: user } = await supabase.from('users').select('name, email, role, department:departments(name)').eq('company_id', companyId).ilike('name', `%${args.user_name}%`).single();
        if (!user) return JSON.stringify({ error: `'${args.user_name}' 사용자를 찾을 수 없습니다.` });
        return JSON.stringify({ name: user.name, email: user.email, role: user.role, department: user.department?.name || '미배정' });
      }
      case 'get_my_info': {
        const { data: user } = await supabase.from('users').select('name, email, role, department:departments(name)').eq('id', userId).single();
        return JSON.stringify({ name: user?.name || '알 수 없음', email: user?.email || '알 수 없음', role: user?.role || '알 수 없음', department: user?.department?.name || '미배정' });
      }
      case 'get_expiring_subcategories': {
        const days = args.days || 30;
        const futureDate = new Date(); futureDate.setDate(futureDate.getDate() + days);
        const { data } = await supabase.from('subcategories').select('name, expiry_date, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).not('expiry_date', 'is', null).lte('expiry_date', futureDate.toISOString()).gte('expiry_date', new Date().toISOString()).order('expiry_date', { ascending: true });
        return JSON.stringify({ subcategories: (data || []).map((s: any) => ({ name: s.name, expiry_date: s.expiry_date, parent_category: s.parent_category?.name, department: s.department?.name })), count: data?.length || 0, period: `${days}일 이내` });
      }
      case 'get_shared_documents': {
        const { direction, limit = 10 } = args;
        if (direction === 'shared_by_me') {
          const { data } = await supabase.from('shared_documents').select('shared_at, permission, document:documents(title), shared_to:users!shared_documents_shared_to_user_id_fkey(name)').eq('shared_by_user_id', userId).eq('is_active', true).order('shared_at', { ascending: false }).limit(limit);
          return JSON.stringify({ documents: (data || []).map((s: any) => ({ title: s.document?.title, shared_to: s.shared_to?.name, permission: s.permission, shared_at: s.shared_at })), count: data?.length || 0 });
        } else {
          const { data } = await supabase.from('shared_documents').select('shared_at, permission, document:documents(title), shared_by:users!shared_documents_shared_by_user_id_fkey(name)').eq('shared_to_user_id', userId).eq('is_active', true).order('shared_at', { ascending: false }).limit(limit);
          return JSON.stringify({ documents: (data || []).map((s: any) => ({ title: s.document?.title, shared_by: s.shared_by?.name, permission: s.permission, shared_at: s.shared_at })), count: data?.length || 0 });
        }
      }
      case 'unified_search': {
        const { keyword, limit: searchLimit = 10 } = args;
        console.log(`unified_search called with keyword: "${keyword}"`);
        
        const [deptResult, catResult, subResult, docResult] = await Promise.all([
          supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('categories').select('id, name, department_id, department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('subcategories').select('id, name, storage_location, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('documents').select('id, title, uploaded_at, subcategory_id, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).not('subcategory_id', 'is', null).or(`title.ilike.%${keyword}%,ocr_text.ilike.%${keyword}%`).limit(searchLimit)
        ]);
        
        const depts = deptResult.data || [];
        const cats = catResult.data || [];
        const subs = subResult.data || [];
        const docs = docResult.data || [];
        console.log(`unified_search results: depts=${depts.length}, cats=${cats.length}, subs=${subs.length}, docs=${docs.length}`);
        
        const docSubIds = [...new Set(docs.map((d: any) => d.subcategory_id).filter(Boolean))];
        const { data: docSubData } = docSubIds.length > 0 ? await supabase.from('subcategories').select('id, name, storage_location').in('id', docSubIds) : { data: [] };
        const docSubMap = new Map((docSubData || []).map((s: any) => [s.id, s]));
        
        const allResults: any[] = [];
        
        for (const d of depts) {
          allResults.push({ type: 'department', name: d.name, path: d.name, link: `/admin/department/${d.id}` });
        }
        for (const c of cats) {
          allResults.push({ type: 'parent_category', name: c.name, department: c.department?.name, path: `${c.department?.name} → ${c.name}`, link: `/admin/department/${c.department_id}/category/${c.id}` });
        }
        for (const s of subs) {
          allResults.push({ type: 'subcategory', name: s.name, department: s.department?.name, parent_category: s.parent_category?.name, path: `${s.department?.name} → ${s.parent_category?.name} → ${s.name}`, link: `/admin/category/${s.parent_category_id}/subcategory/${s.id}`, storage_location: s.storage_location || '미지정' });
        }
        for (const d of docs) {
          const docSub = docSubMap.get(d.subcategory_id);
          allResults.push({ type: 'document', name: d.title, department: d.department?.name, parent_category: d.parent_category?.name, subcategory: docSub?.name || '', path: `${d.department?.name} → ${d.parent_category?.name} → ${docSub?.name || ''} → ${d.title}`, link: d.subcategory_id ? `/admin/category/${d.parent_category_id}/subcategory/${d.subcategory_id}` : null, storage_location: docSub?.storage_location || '미지정', uploaded_at: d.uploaded_at });
        }
        
        return JSON.stringify({ results: allResults.slice(0, searchLimit), total_count: allResults.length, breakdown: { departments: depts.length, parent_categories: cats.length, subcategories: subs.length, documents: docs.length } });
      }
      default: return JSON.stringify({ error: `알 수 없는 함수: ${name}` });
    }
  } catch (error) { 
    console.error(`Function ${name} error:`, error); 
    return JSON.stringify({ error: `함수 실행 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` }); 
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { message, userId, history = [], locale = 'ko' } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error('Supabase credentials not configured');
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', userId).single();
    if (!userData?.company_id) throw new Error('User company not found');
    const userCompanyId = userData.company_id;
    
    // Phase 1: 서버 사이드 프리서치 - Gemini 호출 전 자동 검색
    const deptIds = await getDeptIds(supabase, userCompanyId);
    const keywords = extractKeywords(message);
    console.log(`🔍 키워드 추출: "${message}" → "${keywords}"`);
    
    const searchContext = keywords ? await preSearch(supabase, userCompanyId, deptIds, keywords) : null;
    console.log(`PreSearch: message="${message}", keywords="${keywords}", results=${searchContext?.results?.length || 0}, firstResult=${JSON.stringify(searchContext?.results?.[0]?.name || 'none')}`);
    
    // ==========================================
    // 🌍 LOCALE별 시스템 프롬프트 분리
    // ==========================================
    
    // 프리서치 결과 블록 (언어별)
    const searchDataBlockKo = searchContext
      ? `\n## 사전 검색 결과 (키워드: "${searchContext.keyword}")\n아래는 사용자 메시지에서 자동 검색한 결과입니다. 검색/찾기/위치 질문이면 이 데이터로 바로 답변하세요 (함수 호출 불필요).\n${JSON.stringify(searchContext.results, null, 1)}`
      : '';
    
    const searchDataBlockEn = searchContext
      ? `\n## Pre-search Results (keyword: "${searchContext.keyword}")\nBelow are results automatically retrieved from the user's message. For search/find/location queries, answer directly using this data (no function calls needed).\n${JSON.stringify(searchContext.results, null, 1)}`
      : '';
    
    // 한글 시스템 프롬프트
    const systemInstructionKo = `당신은 문서 관리 시스템(DMS)의 AI 어시스턴트 '트로이'입니다.

## 시스템 구조
4단 계층: 부서 → 대분류 → 세부카테고리(세부 스토리지) → 문서

## 필수 규칙
1. 항상 한국어로 답변하세요. 자연스럽고 친절한 한국어를 사용하세요.
2. 함수 이름이나 내부 동작을 사용자에게 절대 노출하지 마세요.
${searchDataBlockKo}

## 답변 기준 (우선순위)
1. **사전 검색 결과가 있으면**: 반드시 해당 결과를 안내하세요. 사용자가 키워드만 입력해도 검색 의도로 간주합니다. 함수 호출은 불필요합니다.
2. **통계/개수/순위/사용자 정보/NFC/만료/공유 등**: 적절한 함수를 호출하여 답변.
3. **인사/감사/일반 대화/사용법 질문**: 직접 답변.

## 답변 형식
- 문서명과 내용만 간단히 안내
- **링크(link, path, /admin/...)는 절대 텍스트로 출력하지 마세요** - 카드 UI가 자동으로 처리합니다
- OCR 본문에서 발견된 경우: 발견된 내용 스니펫만 간단히 인용
- 친절하고 간결하게`;
    
    // 영어 시스템 프롬프트
    const systemInstructionEn = `You are 'Troy', an AI assistant for a Document Management System (DMS).

## System Structure
4-tier hierarchy: Department → Parent Category → Subcategory (Detailed Storage) → Document

## Critical Rules
1. ALWAYS respond in English. Use natural, clear, and friendly English.
2. NEVER expose internal function names or implementation details to users.
${searchDataBlockEn}

## Response Priority
1. **If pre-search results exist**: Provide answers directly from these results. User keywords alone indicate search intent. No function calls needed for search/location queries.
2. **For stats/counts/rankings/user info/NFC/expiry/shared documents**: Call appropriate functions.
3. **For greetings/thanks/general conversation/usage questions**: Respond directly.

## Response Format
- Show document names and content briefly
- **NEVER output links (link, path, /admin/...) as text** - Card UI handles them automatically
- If found in OCR text: Quote relevant snippet only
- Be friendly and concise`;
    
    // locale에 따라 시스템 프롬프트 선택
    const systemInstruction = locale?.startsWith('en') ? systemInstructionEn : systemInstructionKo;
    
    // ==========================================
    // Gemini API 호출
    // ==========================================
    
    const contents = [
      ...history.map((h: any) => ({ 
        role: h.role === 'user' ? 'user' : 'model', 
        parts: [{ text: h.content }] 
      })), 
      { role: 'user', parts: [{ text: message }] }
    ];
    
    const initialResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${GEMINI_API_KEY}`, //NEVER CHANGE THE MODEL NAME.
      { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          system_instruction: { parts: [{ text: systemInstruction }] }, 
          contents, 
          tools: [{ function_declarations: functionDeclarations }], 
          tool_config: { function_calling_config: { mode: 'AUTO' } } 
        }) 
      }
    );
    
    if (!initialResponse.ok) { 
      const errorText = await initialResponse.text(); 
      console.error('Gemini API error:', errorText); 
      throw new Error('Gemini API request failed'); 
    }
    
    const initialData = await initialResponse.json();
    const candidate = initialData.candidates?.[0];
    if (!candidate) throw new Error('No response from Gemini');
    
    const functionCalls = candidate.content?.parts?.filter((p: any) => p.functionCall) || [];
    
    // 프리서치 결과로 docsMetadata 생성
    let docsMetadata: any[] = [];
    if (searchContext?.results?.length > 0) {
      docsMetadata = searchContext.results.map((r: any) => {
        let parentCategoryId = '';
        let subcategoryId = '';
        if (r.link) {
          const match = r.link.match(/\/category\/([^/]+)\/subcategory\/([^/]+)/);
          if (match) {
            parentCategoryId = match[1];
            subcategoryId = match[2];
          }
        }
        return {
          id: r.link || '', 
          title: r.name || '', 
          categoryName: r.parent_category || '', 
          departmentName: r.department || '',
          storageLocation: r.storage_location || null, 
          uploadDate: r.uploaded_at || '', 
          subcategoryId, 
          parentCategoryId,
          type: r.type || '', 
          path: r.path || '', 
          link: r.link || ''
        };
      });
    }
    
    if (functionCalls.length > 0) {
      const functionResults = [];
      for (const fc of functionCalls) { 
        const { name, args } = fc.functionCall; 
        console.log(`Executing function: ${name}`, args); 
        const result = await executeFunction(name, args || {}, supabase, userCompanyId, userId); 
        functionResults.push({ functionResponse: { name, response: { result: JSON.parse(result) } } }); 
      }
      
      const finalContents = [
        ...contents, 
        { role: 'model', parts: functionCalls.map((fc: any) => ({ functionCall: fc.functionCall })) }, 
        { role: 'user', parts: functionResults }
      ];
      
      let finalText = '';
      try {
        const finalResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, 
          { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
              system_instruction: { parts: [{ text: systemInstruction }] }, 
              contents: finalContents 
            }) 
          }
        );
        
        if (finalResponse.ok) {
          const finalData = await finalResponse.json();
          const allParts = finalData.candidates?.[0]?.content?.parts || [];
          finalText = allParts.map((p: any) => p.text).filter(Boolean).join('');
        } else { 
          console.error('Final Gemini error:', finalResponse.status); 
        }
      } catch (e) { 
        console.error('Final Gemini call failed:', e); 
      }
      
      // Gemini 실패 시 함수 결과로 직접 응답
      if (!finalText) {
        const isEn = locale?.startsWith('en');
        const lines: string[] = [];
        for (const fr of functionResults) {
          const fn = fr.functionResponse?.name;
          const res = fr.functionResponse?.response?.result;

          if (res?.results?.length > 0) {
            for (const r of res.results) {
              lines.push(`- **${r.name}**${r.path ? ` (${r.path})` : ''}${r.link ? ` → ${r.link}` : ''}`);
            }
          }
          else if (res?.documents?.length > 0) {
            lines.push(isEn ? `Found **${res.count}** document(s):` : `**${res.count}개의 문서**를 찾았습니다:`);
            for (const d of res.documents.slice(0, 5)) {
              lines.push(`- **${d.title}**\n  · ${isEn ? 'Path' : '경로'}: ${d.path || `${d.department} → ${d.parent_category} → ${d.subcategory}`}${d.link ? `\n  · ${isEn ? 'Document' : '문서'}: ${d.link}` : ''}`);
            }
            if (res.count > 5) lines.push(isEn ? `\nAnd ${res.count - 5} more document(s)` : `\n외 ${res.count - 5}개 문서`);
          }
          else if (res?.error) {
            lines.push(res.error);
          }
          else if (res && typeof res === 'object') {
            if (fn === 'get_total_counts') {
              lines.push(isEn
                ? `Current system status:\n- Departments: ${res.departments || 0}\n- Parent Categories: ${res.parent_categories || 0}\n- Subcategories: ${res.subcategories || 0}\n- Documents: ${res.documents || 0}\n- Users: ${res.users || 0}`
                : `현재 시스템 현황입니다:\n- 부서: ${res.departments || 0}개\n- 대분류: ${res.parent_categories || 0}개\n- 세부카테고리: ${res.subcategories || 0}개\n- 문서: ${res.documents || 0}개\n- 사용자: ${res.users || 0}명`);
            } else if (fn === 'list_all' && res.items) {
              lines.push(isEn ? `Total of ${res.count || res.items.length} item(s).` : `총 ${res.count || res.items.length}개의 항목이 있습니다.`);
              if (res.items.length > 0 && res.items.length <= 10) {
                lines.push(`${isEn ? 'List' : '목록'}: ${res.items.join(', ')}`);
              } else if (res.items.length > 10) {
                lines.push(isEn
                  ? `List (partial): ${res.items.slice(0, 10).join(', ')} and ${res.items.length - 10} more`
                  : `목록 (일부): ${res.items.slice(0, 10).join(', ')} 외 ${res.items.length - 10}개`);
              }
            } else if (res.count !== undefined) {
              lines.push(isEn ? `Total: ${res.count} item(s).` : `총 ${res.count}개입니다.`);
            }
          }
        }
        finalText = lines.join('\n');
      }
      
      const responseWithDocs = docsMetadata.length > 0 
        ? `${finalText}\n---DOCS---\n${JSON.stringify(docsMetadata)}` 
        : finalText;
      
      return new Response(responseWithDocs, { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } 
      });
    }
    
    // 함수 호출 없이 직접 답변
    const directText = candidate.content?.parts?.map((p: any) => p.text).filter(Boolean).join('');
    const responseWithDocs = docsMetadata.length > 0 
      ? `${directText}\n---DOCS---\n${JSON.stringify(docsMetadata)}` 
      : directText;
    
    return new Response(responseWithDocs, { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } 
    });
    
  } catch (error) { 
    console.error('Error:', error); 
    const message = error instanceof Error ? error.message : 'Unknown error'; 
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }); 
  }
});
