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
];

async function getDeptIds(supabase: any, companyId: string) {
  const { data } = await supabase.from('departments').select('id').eq('company_id', companyId);
  return data?.map((d: any) => d.id) || [];
}

const skipPatterns = new Set([
  'hi', 'hello', 'hey', 'ok', 'yes', 'no', 'thanks', 'thank', 'bye',
  '안녕', '안녕하세요', '안녕하십니까', '하이', '헬로', '반가워', '반갑습니다',
  '감사', '감사합니다', '고마워', '고맙습니다', '수고', '수고하세요',
  '네', '응', '아니', '아니요', '아니오', '좋아', '알겠어', '알겠습니다',
  '됐어', '그래', '오케이', 'ㅎㅇ', 'ㅎㅎ', 'ㅋㅋ', 'ㅋ', 'ㅎ', 'ㄱㅅ',
  '뭐해', '뭐하니', '잘자', '굿', '바이', '또봐',
]);

function extractKeywords(message: string): string {
  const trimmed = message.trim().toLowerCase().replace(/[?!.,;~]+$/g, '');
  if (skipPatterns.has(trimmed)) return '';
  let text = message.trim();
  text = text.replace(/(어딨어|어딨니|어딨나|어디야|어디에\s*있\S*|찾아줘|찾아봐|보여줘|알려줘|검색해줘|검색해|해줘|있나요|있어요|있나|있어|인가요|인가)/g, '');
  const stops = new Set(['어디', '관련', '문서', '위치', '경로', '검색', '에', '에서', '좀', '있어', '있나', '뭐야', '몇', '개', '수', '수는', '해', '은', '는', '이', '가', '을', '를', '의', '요', '줘', '뭐', '거', '건', '것', '좀', '나', '내']);
  const particleRegex = /(?:에서|으로|이랑|에게|한테|부터|까지|처럼|만큼|보다|라고|이라|라는|라서|니까|는데|지만|거든|든지|이든|대로|마다|밖에|조차|마저|이나|나|는|은|이|가|을|를|의|로|도|만|와|과|랑|요|야|죠|지)+[?!.,;~]*$/;
  return text.split(/\s+/)
    .map(w => w.replace(/[?!.,;~]+$/g, '').replace(particleRegex, ''))
    .filter(w => w.length > 0 && !stops.has(w))
    .join(' ').trim();
}

async function preSearch(supabase: any, companyId: string, _deptIds: string[], keyword: string): Promise<any> {
  if (!keyword || keyword.length < 1) return null;
  try {
    const words = keyword.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) { const w = keyword.trim(); if (w.length > 0) words.push(w); else return null; }
    const nameOr = words.map(w => `name.ilike.*${w}*`).join(',');
    const docOr = words.flatMap(w => [`title.ilike.*${w}*`, `ocr_text.ilike.*${w}*`]).join(',');
    console.log(`preSearch: words=${JSON.stringify(words)}, docOr=${docOr}`);
    const [deptR, catR, subR, docR] = await Promise.all([
      supabase.from('departments').select('id, name').eq('company_id', companyId).or(nameOr).limit(5),
      supabase.from('categories').select('id, name, department_id, department:departments(id, name)').eq('company_id', companyId).or(nameOr).limit(5),
      supabase.from('subcategories').select('id, name, storage_location, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').eq('company_id', companyId).or(nameOr).limit(5),
      supabase.from('documents').select('id, title, ocr_text, uploaded_at, subcategory_id, parent_category_id, subcategory:subcategories(id, name, storage_location), parent_category:categories(id, name), department:departments(id, name)').eq('company_id', companyId).or(docOr).limit(5)
    ]);
    if (deptR.error) console.error('preSearch dept error:', deptR.error);
    if (catR.error) console.error('preSearch cat error:', catR.error);
    if (subR.error) console.error('preSearch sub error:', subR.error);
    if (docR.error) console.error('preSearch doc error:', docR.error);
    const results: any[] = [];
    for (const d of deptR.data || []) results.push({ type: '부서', name: d.name, path: d.name, link: `/admin/department/${d.id}` });
    for (const c of catR.data || []) results.push({ type: '대분류', name: c.name, path: `${c.department?.name} → ${c.name}`, link: `/admin/department/${c.department_id}/category/${c.id}` });
    for (const s of subR.data || []) results.push({ type: '세부카테고리', name: s.name, path: `${s.department?.name} → ${s.parent_category?.name} → ${s.name}`, link: `/admin/category/${s.parent_category_id}/subcategory/${s.id}`, storage_location: s.storage_location });
    for (const d of docR.data || []) results.push({ type: '문서', name: d.title, path: `${d.department?.name} → ${d.parent_category?.name} → ${d.subcategory?.name} → ${d.title}`, link: d.subcategory_id ? `/admin/category/${d.parent_category_id}/subcategory/${d.subcategory_id}` : null, storage_location: d.subcategory?.storage_location, ocr_snippet: d.ocr_text?.substring(0, 150), uploaded_at: d.uploaded_at });
    return results.length > 0 ? { keyword, results } : null;
  } catch (e) { console.error('preSearch error:', e); return null; }
}

async function executeFunction(name: string, args: any, supabase: any, companyId: string, userId: string): Promise<string> {
  const deptIds = await getDeptIds(supabase, companyId);
  try {
    switch (name) {
      case 'get_department_stats': {
        const { data: dept } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${args.department_name}%`).single();
        if (!dept) return JSON.stringify({ error: `'${args.department_name}' 부서를 찾을 수 없습니다.` });
        const [users, cats, subs, docs] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact' }).eq('department_id', dept.id),
          supabase.from('categories').select('id', { count: 'exact' }).eq('department_id', dept.id),
          supabase.from('subcategories').select('id', { count: 'exact' }).eq('department_id', dept.id),
          supabase.from('documents').select('id', { count: 'exact' }).eq('department_id', dept.id)
        ]);
        return JSON.stringify({ department_name: dept.name, user_count: users.count || 0, parent_category_count: cats.count || 0, subcategory_count: subs.count || 0, document_count: docs.count || 0 });
      }
      case 'get_parent_category_stats': {
        const { data: cat } = await supabase.from('categories').select('id, name, department_id').in('department_id', deptIds).ilike('name', `%${args.category_name}%`).single();
        if (!cat) return JSON.stringify({ error: `'${args.category_name}' 대분류를 찾을 수 없습니다.` });
        const { data: dept } = await supabase.from('departments').select('name').eq('id', cat.department_id).single();
        const [subs, docs] = await Promise.all([
          supabase.from('subcategories').select('id', { count: 'exact' }).eq('parent_category_id', cat.id),
          supabase.from('documents').select('id', { count: 'exact' }).eq('parent_category_id', cat.id)
        ]);
        return JSON.stringify({ category_name: cat.name, department_name: dept?.name || '알 수 없음', subcategory_count: subs.count || 0, document_count: docs.count || 0 });
      }
      case 'get_subcategory_stats': {
        const { data: sub } = await supabase.from('subcategories').select('id, name, parent_category_id, department_id, storage_location, nfc_tag_id, nfc_registered, expiry_date').in('department_id', deptIds).ilike('name', `%${args.subcategory_name}%`).single();
        if (!sub) return JSON.stringify({ error: `'${args.subcategory_name}' 세부카테고리를 찾을 수 없습니다.` });
        const [cat, dept, docs] = await Promise.all([
          supabase.from('categories').select('name').eq('id', sub.parent_category_id).single(),
          supabase.from('departments').select('name').eq('id', sub.department_id).single(),
          supabase.from('documents').select('id', { count: 'exact' }).eq('subcategory_id', sub.id)
        ]);
        return JSON.stringify({ subcategory_name: sub.name, parent_category_name: cat.data?.name || '알 수 없음', department_name: dept.data?.name || '알 수 없음', storage_location: sub.storage_location || '미지정', nfc_registered: sub.nfc_registered || false, expiry_date: sub.expiry_date, document_count: docs.count || 0 });
      }
      case 'check_exists': {
        const { entity_type, name: n } = args;
        let exists = false, foundItem: any = null;
        if (entity_type === 'department') { const { data } = await supabase.from('departments').select('name').eq('company_id', companyId).ilike('name', `%${n}%`).single(); exists = !!data; foundItem = data; }
        else if (entity_type === 'parent_category') { const { data } = await supabase.from('categories').select('name').in('department_id', deptIds).ilike('name', `%${n}%`).single(); exists = !!data; foundItem = data; }
        else if (entity_type === 'subcategory') { const { data } = await supabase.from('subcategories').select('name').in('department_id', deptIds).ilike('name', `%${n}%`).single(); exists = !!data; foundItem = data; }
        else { const { data } = await supabase.from('documents').select('title').in('department_id', deptIds).ilike('title', `%${n}%`).single(); exists = !!data; foundItem = data; }
        return JSON.stringify({ exists, name: foundItem?.name || foundItem?.title || n });
      }
      case 'search_documents': {
        const { keyword, department_name, limit = 10 } = args;
        let query = supabase.from('documents').select('id, title, ocr_text, uploaded_at, uploaded_by, subcategory_id, parent_category_id, uploader:users!documents_uploaded_by_fkey(name), subcategory:subcategories(id, name, storage_location), parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).or(`title.ilike.%${keyword}%,ocr_text.ilike.%${keyword}%`).limit(limit);
        if (department_name) { const { data: dept } = await supabase.from('departments').select('id').eq('company_id', companyId).ilike('name', `%${department_name}%`).single(); if (dept) query = query.eq('department_id', dept.id); }
        const { data } = await query;
        return JSON.stringify({ 
          documents: (data || []).map((d: any) => ({ 
            id: d.id, 
            title: d.title, 
            ocr_snippet: d.ocr_text ? d.ocr_text.substring(0, 200) : null, 
            subcategory: d.subcategory?.name, 
            subcategory_id: d.subcategory_id || d.subcategory?.id, 
            parent_category: d.parent_category?.name, 
            parent_category_id: d.parent_category_id || d.parent_category?.id, 
            department: d.department?.name, 
            department_id: d.department?.id, 
            storage_location: d.subcategory?.storage_location, 
            uploaded_at: d.uploaded_at, 
            uploader: d.uploader?.name || '알 수 없음',
            // 문서 링크 추가
            link: d.subcategory_id ? `/admin/category/${d.parent_category_id}/subcategory/${d.subcategory_id}` : null,
            path: `${d.department?.name || ''} → ${d.parent_category?.name || ''} → ${d.subcategory?.name || ''}`
          })), 
          count: data?.length || 0 
        });
      }
      case 'search_by_keyword': {
        const { keyword, entity_type } = args;
        let results: any[] = [];
        if (entity_type === 'department') {
          const { data } = await supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${keyword}%`);
          results = (data || []).map((d: any) => ({ name: d.name, path: d.name, link: `/admin/department/${d.id}` }));
        } else if (entity_type === 'parent_category') {
          const { data } = await supabase.from('categories').select('id, name, department_id, department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`);
          results = (data || []).map((c: any) => ({ name: c.name, department: c.department?.name, path: `${c.department?.name} → ${c.name}`, link: `/admin/department/${c.department_id}/category/${c.id}` }));
        } else {
          const { data } = await supabase.from('subcategories').select('id, name, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`);
          results = (data || []).map((s: any) => ({ name: s.name, department: s.department?.name, parent_category: s.parent_category?.name, path: `${s.department?.name} → ${s.parent_category?.name} → ${s.name}`, link: `/admin/category/${s.parent_category_id}/subcategory/${s.id}` }));
        }
        return JSON.stringify({ results, count: results.length });
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
          const { data: sub } = await supabase.from('subcategories').select('name, parent_category:categories(name), department:departments(name)').in('department_id', deptIds).ilike('name', `%${n}%`).single();
          if (!sub) return JSON.stringify({ error: `'${n}' 세부카테고리를 찾을 수 없습니다.` });
          return JSON.stringify({ path: `${sub.department?.name} → ${sub.parent_category?.name} → ${sub.name}`, department: sub.department?.name, parent_category: sub.parent_category?.name, subcategory: sub.name });
        }
      }
      case 'get_parent_info': {
        const { entity_type, name: n } = args;
        if (entity_type === 'document') { const { data } = await supabase.from('documents').select('title, subcategory:subcategories(name)').in('department_id', deptIds).ilike('title', `%${n}%`).single(); return JSON.stringify({ item: n, parent: data?.subcategory?.name || '알 수 없음', parent_type: 'subcategory' }); }
        else if (entity_type === 'subcategory') { const { data } = await supabase.from('subcategories').select('name, parent_category:categories(name)').in('department_id', deptIds).ilike('name', `%${n}%`).single(); return JSON.stringify({ item: n, parent: data?.parent_category?.name || '알 수 없음', parent_type: 'parent_category' }); }
        else { const { data } = await supabase.from('categories').select('name, department:departments(name)').in('department_id', deptIds).ilike('name', `%${n}%`).single(); return JSON.stringify({ item: n, parent: data?.department?.name || '알 수 없음', parent_type: 'department' }); }
      }
      case 'get_navigation_link': {
        const { entity_type, name: n } = args;
        if (entity_type === 'department') { const { data } = await supabase.from('departments').select('id').eq('company_id', companyId).ilike('name', `%${n}%`).single(); return JSON.stringify({ link: data ? `/admin/department/${data.id}` : null, name: n }); }
        else if (entity_type === 'parent_category') { const { data } = await supabase.from('categories').select('id, department_id').in('department_id', deptIds).ilike('name', `%${n}%`).single(); return JSON.stringify({ link: data ? `/admin/department/${data.department_id}/category/${data.id}` : null, name: n }); }
        else if (entity_type === 'subcategory') { const { data } = await supabase.from('subcategories').select('id, parent_category_id').in('department_id', deptIds).ilike('name', `%${n}%`).single(); return JSON.stringify({ link: data ? `/admin/category/${data.parent_category_id}/subcategory/${data.id}` : null, name: n }); }
        return JSON.stringify({ error: '지원하지 않는 유형입니다.' });
      }
      case 'list_children': {
        const { parent_type, parent_name, limit = 50 } = args;
        let children: any[] = [];
        if (parent_type === 'department') { const { data: dept } = await supabase.from('departments').select('id').eq('company_id', companyId).ilike('name', `%${parent_name}%`).single(); if (dept) { const { data } = await supabase.from('categories').select('name').eq('department_id', dept.id).limit(limit); children = (data || []).map((c: any) => c.name); } }
        else if (parent_type === 'parent_category') { const { data: cat } = await supabase.from('categories').select('id').in('department_id', deptIds).ilike('name', `%${parent_name}%`).single(); if (cat) { const { data } = await supabase.from('subcategories').select('name').eq('parent_category_id', cat.id).limit(limit); children = (data || []).map((s: any) => s.name); } }
        else { const { data: sub } = await supabase.from('subcategories').select('id').in('department_id', deptIds).ilike('name', `%${parent_name}%`).single(); if (sub) { const { data } = await supabase.from('documents').select('title').eq('subcategory_id', sub.id).limit(limit); children = (data || []).map((d: any) => d.title); } }
        return JSON.stringify({ parent: parent_name, children, count: children.length });
      }
      case 'get_storage_location': {
        const { entity_type, name: n } = args;
        if (entity_type === 'parent_category') {
          const { data: cat } = await supabase.from('categories').select('id, name, department:departments(name)').in('department_id', deptIds).ilike('name', `%${n}%`).limit(1).single();
          if (!cat) return JSON.stringify({ error: `'${n}' 대분류를 찾을 수 없습니다.` });
          const { data: subs } = await supabase.from('subcategories').select('name, storage_location').eq('parent_category_id', cat.id);
          const locations = (subs || []).map((s: any) => ({ name: s.name, storage_location: s.storage_location || '미지정' }));
          return JSON.stringify({ name: cat.name, department: cat.department?.name, type: 'parent_category', subcategory_locations: locations });
        }
        else if (entity_type === 'subcategory') { const { data } = await supabase.from('subcategories').select('name, storage_location').in('department_id', deptIds).ilike('name', `%${n}%`).single(); return JSON.stringify({ name: data?.name, storage_location: data?.storage_location || '미지정' }); }
        else { const { data } = await supabase.from('documents').select('title, subcategory:subcategories(storage_location)').in('department_id', deptIds).ilike('title', `%${n}%`).single(); return JSON.stringify({ name: data?.title, storage_location: data?.subcategory?.storage_location || '미지정' }); }
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

        // 4개 검색을 병렬 실행 (타임아웃 방지)
        const [deptResult, catResult, subResult, docResult] = await Promise.all([
          supabase.from('departments').select('id, name').eq('company_id', companyId).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('categories').select('id, name, department_id, department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('subcategories').select('id, name, storage_location, parent_category_id, parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).ilike('name', `%${keyword}%`).limit(searchLimit),
          supabase.from('documents').select('id, title, uploaded_at, subcategory_id, parent_category_id, subcategory:subcategories(id, name, storage_location), parent_category:categories(id, name), department:departments(id, name)').in('department_id', deptIds).or(`title.ilike.%${keyword}%,ocr_text.ilike.%${keyword}%`).limit(searchLimit)
        ]);

        const depts = deptResult.data || [];
        const cats = catResult.data || [];
        const subs = subResult.data || [];
        const docs = docResult.data || [];
        console.log(`unified_search results: depts=${depts.length}, cats=${cats.length}, subs=${subs.length}, docs=${docs.length}`);

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
          allResults.push({ type: 'document', name: d.title, department: d.department?.name, parent_category: d.parent_category?.name, subcategory: d.subcategory?.name, path: `${d.department?.name} → ${d.parent_category?.name} → ${d.subcategory?.name} → ${d.title}`, link: d.subcategory_id ? `/admin/category/${d.parent_category_id}/subcategory/${d.subcategory_id}` : null, storage_location: d.subcategory?.storage_location || '미지정', uploaded_at: d.uploaded_at });
        }

        return JSON.stringify({ results: allResults.slice(0, searchLimit), total_count: allResults.length, breakdown: { departments: depts.length, parent_categories: cats.length, subcategories: subs.length, documents: docs.length } });
      }
      default: return JSON.stringify({ error: `알 수 없는 함수: ${name}` });
    }
  } catch (error) { console.error(`Function ${name} error:`, error); return JSON.stringify({ error: `함수 실행 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` }); }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { message, userId, history = [] } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error('Supabase credentials not configured');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', userId).single();
    if (!userData?.company_id) throw new Error('User company not found');
    const userCompanyId = userData.company_id;

    // ★ Phase 1: 서버 사이드 프리서치 - Gemini 호출 전 자동 검색
    const deptIds = await getDeptIds(supabase, userCompanyId);
    const keywords = extractKeywords(message);
    const searchContext = keywords ? await preSearch(supabase, userCompanyId, deptIds, keywords) : null;
    console.log(`PreSearch: message="${message}", keywords="${keywords}", results=${searchContext?.results?.length || 0}, firstResult=${JSON.stringify(searchContext?.results?.[0]?.name || 'none')}`);

    // 프리서치 결과를 시스템 프롬프트에 포함 (간소화된 프롬프트)
    const searchDataBlock = searchContext
      ? `\n## 사전 검색 결과 (키워드: "${searchContext.keyword}")\n아래는 사용자 메시지에서 자동 검색한 결과입니다. 검색/찾기/위치 질문이면 이 데이터로 바로 답변하세요 (함수 호출 불필요).\n${JSON.stringify(searchContext.results, null, 1)}`
      : '';

    const systemInstruction = `당신은 문서 관리 시스템(DMS)의 AI 어시스턴트 '트로이'입니다.

## 시스템 구조
4단 계층: 부서 → 대분류 → 세부카테고리(세부 스토리지) → 문서

## 필수 규칙
1. 반드시 한국어로만 답변하세요.
2. 함수 이름이나 내부 동작을 사용자에게 절대 노출하지 마세요.
${searchDataBlock}

## 답변 기준 (우선순위)
1. **사전 검색 결과가 있으면**: 반드시 해당 결과를 안내하세요. 사용자가 키워드만 입력해도 검색 의도로 간주합니다. 경로(path)와 이동 링크(link)를 함께 알려주세요. 함수 호출은 불필요합니다.
2. **통계/개수/순위/사용자 정보/NFC/만료/공유 등**: 적절한 함수를 호출하여 답변.
3. **인사/감사/일반 대화/사용법 질문**: 직접 답변.

## 답변 형식
- 경로: "부서 → 대분류 → 세부카테고리" 형식으로 자연스럽게 안내
- 링크: "→ /admin/..." 형식
- 문서가 OCR 본문에서 발견된 경우: OCR에서 발견된 내용 스니펫을 인용하고 해당 문서의 경로와 링크를 안내
- 친절하고 간결하게`;

    const contents = [...history.map((h: any) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })), { role: 'user', parts: [{ text: message }] }];
    const initialResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction }] }, contents, tools: [{ function_declarations: functionDeclarations }], tool_config: { function_calling_config: { mode: 'AUTO' } } }) });
    if (!initialResponse.ok) { const errorText = await initialResponse.text(); console.error('Gemini API error:', errorText); throw new Error('Gemini API request failed'); }
    const initialData = await initialResponse.json();
    const candidate = initialData.candidates?.[0];
    if (!candidate) throw new Error('No response from Gemini');
    const functionCalls = candidate.content?.parts?.filter((p: any) => p.functionCall) || [];

    // 프리서치 결과로 docsMetadata 생성 (Gemini가 함수를 호출하든 안 하든)
    let docsMetadata: any[] = [];
    if (searchContext?.results?.length > 0) {
      docsMetadata = searchContext.results.map((r: any) => ({
        id: r.link || '', title: r.name || '', categoryName: r.parent_category || '', departmentName: r.department || '',
        storageLocation: r.storage_location || null, uploadDate: r.uploaded_at || '', subcategoryId: '', parentCategoryId: '',
        type: r.type || '', path: r.path || '', link: r.link || ''
      }));
    }

    if (functionCalls.length > 0) {
      const functionResults = [];
      for (const fc of functionCalls) { const { name, args } = fc.functionCall; console.log(`Executing function: ${name}`, args); const result = await executeFunction(name, args || {}, supabase, userCompanyId, userId); functionResults.push({ functionResponse: { name, response: { result: JSON.parse(result) } } }); }
      const finalContents = [...contents, { role: 'model', parts: functionCalls.map((fc: any) => ({ functionCall: fc.functionCall })) }, { role: 'user', parts: functionResults }];
      let finalText = '';
      try {
        const finalResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction }] }, contents: finalContents }) });
        if (finalResponse.ok) {
          const finalData = await finalResponse.json();
          const allParts = finalData.candidates?.[0]?.content?.parts || [];
          finalText = allParts.map((p: any) => p.text).filter(Boolean).join('');
        } else { console.error('Final Gemini error:', finalResponse.status); }
      } catch (e) { console.error('Final Gemini call failed:', e); }
      // Gemini 실패 시 함수 결과로 직접 응답 (자연어 변환)
      if (!finalText) {
        const lines: string[] = [];
        for (const fr of functionResults) {
          const fn = fr.functionResponse?.name;
          const res = fr.functionResponse?.response?.result;
          if (res?.results?.length > 0) { for (const r of res.results) { lines.push(`- **${r.name}**${r.path ? ` (${r.path})` : ''}${r.link ? ` → ${r.link}` : ''}`); } }
          else if (res?.documents?.length > 0) { 
            lines.push(`**${res.count}개의 문서**를 찾았습니다:`);
            for (const d of res.documents.slice(0, 5)) { 
              lines.push(`- **${d.title}**\n  · 경로: ${d.path || `${d.department} → ${d.parent_category} → ${d.subcategory}`}${d.link ? `\n  · 문서: ${d.link}` : ''}`); 
            }
            if (res.count > 5) lines.push(`\n외 ${res.count - 5}개 문서`);
          }
          else if (res?.error) { lines.push(res.error); }
          else if (res && typeof res === 'object') {
            // JSON을 자연어로 변환
            if (fn === 'get_total_counts') {
              lines.push(`현재 시스템 현황입니다:\n- 부서: ${res.departments || 0}개\n- 대분류: ${res.parent_categories || 0}개\n- 세부카테고리: ${res.subcategories || 0}개\n- 문서: ${res.documents || 0}개\n- 사용자: ${res.users || 0}명`);
            } else if (fn === 'list_all' && res.items) {
              const entityName = res.items.length > 0 ? '항목' : '항목';
              lines.push(`총 ${res.count || res.items.length}개의 ${entityName}이 있습니다.`);
              if (res.items.length > 0 && res.items.length <= 10) {
                lines.push(`목록: ${res.items.join(', ')}`);
              } else if (res.items.length > 10) {
                lines.push(`목록 (일부): ${res.items.slice(0, 10).join(', ')} 외 ${res.items.length - 10}개`);
              }
            } else if (res.count !== undefined) {
              lines.push(`총 ${res.count}개입니다.`);
            } else if (res.ranking) {
              lines.push(`순위:`);
              for (const r of res.ranking.slice(0, 5)) { lines.push(`- ${r.name}: ${r.document_count}개 문서`); }
            } else if (res.department_name) {
              lines.push(`**${res.department_name}** 부서 정보:\n- 팀원: ${res.user_count || 0}명\n- 대분류: ${res.parent_category_count || 0}개\n- 세부카테고리: ${res.subcategory_count || 0}개\n- 문서: ${res.document_count || 0}개`);
            } else if (res.category_name) {
              lines.push(`**${res.category_name}** 대분류 정보:\n- 소속 부서: ${res.department_name || '알 수 없음'}\n- 세부카테고리: ${res.subcategory_count || 0}개\n- 문서: ${res.document_count || 0}개`);
            } else if (res.subcategory_name) {
              lines.push(`**${res.subcategory_name}** 세부카테고리 정보:\n- 대분류: ${res.parent_category_name || '알 수 없음'}\n- 부서: ${res.department_name || '알 수 없음'}\n- 보관위치: ${res.storage_location || '미지정'}\n- 문서: ${res.document_count || 0}개`);
            } else if (res.empty_items) {
              lines.push(`비어있는 항목 ${res.count}개: ${res.empty_items.slice(0, 5).join(', ')}${res.count > 5 ? ` 외 ${res.count - 5}개` : ''}`);
            } else if (res.children) {
              lines.push(`**${res.parent}**의 하위 항목 ${res.count}개${res.count > 0 ? ': ' + res.children.slice(0, 5).join(', ') : ''}${res.count > 5 ? ` 외 ${res.count - 5}개` : ''}`);
            } else if (res.members) {
              lines.push(`**${res.department}** 부서 팀원 ${res.count}명${res.count > 0 ? ':\n' + res.members.slice(0, 5).map((m: any) => `- ${m.name} (${m.role})`).join('\n') : ''}${res.count > 5 ? `\n외 ${res.count - 5}명` : ''}`);
            } else if (res.users) {
              lines.push(`사용자 ${res.count}명${res.count > 0 ? ':\n' + res.users.slice(0, 5).map((u: any) => `- ${u.name} (${u.department || '미배정'})`).join('\n') : ''}${res.count > 5 ? `\n외 ${res.count - 5}명` : ''}`);
            } else if (res.registered_count !== undefined) {
              lines.push(`NFC 등록 현황:\n- 등록됨: ${res.registered_count}개\n- 미등록: ${res.unregistered_count}개\n- 전체: ${res.total}개`);
            } else {
              // 알 수 없는 형식은 간단히 요약
              const keys = Object.keys(res).filter(k => res[k] !== null && res[k] !== undefined);
              if (keys.length > 0) {
                lines.push(`조회 결과: ${keys.map(k => `${k}: ${typeof res[k] === 'object' ? JSON.stringify(res[k]).substring(0, 50) : res[k]}`).join(', ')}`);
              }
            }
          }
        }
        finalText = lines.length > 0 ? lines.join('\n') : '결과를 정리하는 중 오류가 발생했습니다. 다시 시도해 주세요.';
      }
      // 함수 결과에서도 docsMetadata 보강
      for (const fr of functionResults) {
        const fn = fr.functionResponse?.name; const res = fr.functionResponse?.response?.result;
        if (fn === 'search_documents' && res?.documents?.length > 0) {
          docsMetadata = res.documents.map((d: any) => ({ id: d.id || '', title: d.title || '', categoryName: d.parent_category || '', departmentName: d.department || '', storageLocation: d.storage_location || null, uploadDate: d.uploaded_at || '', subcategoryId: d.subcategory_id || '', parentCategoryId: d.parent_category_id || '' }));
        }
      }
      const responseWithDocs = docsMetadata.length > 0 ? `${finalText}\n---DOCS---\n${JSON.stringify(docsMetadata)}` : finalText;
      return new Response(responseWithDocs, { headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
    } else {
      // Gemini가 함수 호출 없이 직접 응답 (프리서치 데이터 활용)
      const nfParts = candidate.content?.parts || [];
      const responseText = nfParts.map((p: any) => p.text).filter(Boolean).join('') || '응답을 생성할 수 없습니다.';
      const responseWithDocs = docsMetadata.length > 0 ? `${responseText}\n---DOCS---\n${JSON.stringify(docsMetadata)}` : responseText;
      return new Response(responseWithDocs, { headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  } catch (error) { console.error('Error:', error); const message = error instanceof Error ? error.message : 'Unknown error'; return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
