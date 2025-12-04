import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import {
  supabase,
  type Department as SupabaseDepartment,
  type Category as SupabaseCategory,
  type Document as SupabaseDocument,
  type ParentCategory as SupabaseParentCategory,
  type Subcategory as SupabaseSubcategory,
} from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { generateEmbedding } from '@/lib/embedding';
import { createDocumentNotification } from '@/lib/notifications';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  documentCount: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  documentCount: number;
  nfcRegistered: boolean;
  storageLocation?: string;
}

export interface Document {
  id: string;
  name: string;
  // 3단 구조(기존)용 카테고리 ID (가능하면 새 구조에서는 사용 지양)
  categoryId?: string;
  // 4단 구조용: 세부 카테고리 / 대분류 ID
  subcategoryId: string;
  parentCategoryId: string;
  departmentId: string;
  uploadDate: string;
  uploader: string;
  classified: boolean;
  fileUrl: string;
  ocrText?: string | null;
}

export interface ParentCategory {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  subcategoryCount: number;
  documentCount: number;
}

export interface Subcategory {
  id: string;
  name: string;
  description: string;
  parentCategoryId: string;
  departmentId: string;
  nfcUid?: string | null;
  nfcRegistered: boolean;
  storageLocation?: string;
  documentCount: number;
}

interface DocumentState {
  departments: Department[];
  categories: Category[];
  parentCategories: ParentCategory[];
  subcategories: Subcategory[];
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  fetchDepartments: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchParentCategories: () => Promise<void>;
  fetchSubcategories: (parentCategoryId?: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'documentCount'>) => Promise<void>;
  addParentCategory: (
    category: Omit<ParentCategory, 'id' | 'subcategoryCount' | 'documentCount'>
  ) => Promise<void>;
  addSubcategory: (
    subcategory: Omit<Subcategory, 'id' | 'documentCount'>
  ) => Promise<void>;
  updateSubcategory: (id: string, updates: Partial<Subcategory>) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;
  registerNfcTag: (subcategoryId: string, nfcUid: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  uploadDocument: (
    document: Omit<Document, 'id' | 'uploadDate' | 'fileUrl'> & {
      file: File;
      ocrText?: string;
      originalFileName?: string;
    }
  ) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  checkPermission: (
    userId: string,
    departmentId: string,
    action:
      | 'read'
      | 'write'
      | 'upload'
      | 'delete'
      | 'download'
      | 'share'
      | 'print'
  ) => Promise<boolean>;
}

const mockDepartments: Department[] = [
  { id: 'HR001', name: '인사팀', code: 'HR001', documentCount: 245 },
  { id: 'DEV001', name: '개발팀', code: 'DEV001', documentCount: 432 },
  { id: 'MKT001', name: '마케팅팀', code: 'MKT001', documentCount: 189 },
  { id: 'FIN001', name: '회계팀', code: 'FIN001', documentCount: 134 },
];

const mockCategories: Category[] = [
  {
    id: '1',
    name: '채용 문서',
    description: '신입 및 경력 채용 관련 문서',
    departmentId: 'HR001',
    documentCount: 56,
    nfcRegistered: true,
    storageLocation: 'A동 2층 캐비닛 3',
  },
  {
    id: '2',
    name: '급여 명세',
    description: '월별 급여 및 상여금 명세서',
    departmentId: 'HR001',
    documentCount: 189,
    nfcRegistered: true,
    storageLocation: 'A동 2층 캐비닛 1',
  },
  {
    id: '3',
    name: '기술 문서',
    description: '시스템 아키텍처 및 API 문서',
    departmentId: 'DEV001',
    documentCount: 234,
    nfcRegistered: true,
    storageLocation: 'B동 3층 보관소',
  },
  {
    id: '4',
    name: '프로젝트 계획서',
    description: '분기별 프로젝트 기획 및 실행 계획',
    departmentId: 'DEV001',
    documentCount: 198,
    nfcRegistered: false,
  },
  {
    id: '5',
    name: '캠페인 보고서',
    description: '마케팅 캠페인 성과 분석 보고서',
    departmentId: 'MKT001',
    documentCount: 89,
    nfcRegistered: true,
    storageLocation: 'C동 1층 서고',
  },
  {
    id: '6',
    name: '예산 보고서',
    description: '월별/분기별 예산 집행 현황',
    departmentId: 'FIN001',
    documentCount: 134,
    nfcRegistered: true,
    storageLocation: 'A동 지하 금고',
  },
];

const mockParentCategories: ParentCategory[] = mockCategories.map((cat) => ({
  id: cat.id,
  name: cat.name,
  description: cat.description,
  departmentId: cat.departmentId,
  subcategoryCount: 1,
  documentCount: cat.documentCount,
}));

const mockSubcategories: Subcategory[] = mockCategories.map((cat) => ({
  id: `${cat.id}-sub1`,
  name: `${cat.name} 세부`,
  description: cat.description,
  parentCategoryId: cat.id,
  departmentId: cat.departmentId,
  nfcUid: null,
  nfcRegistered: cat.nfcRegistered,
  storageLocation: cat.storageLocation,
  documentCount: cat.documentCount,
}));

const mockDocuments: Document[] = [
  {
    id: '1',
    name: '2024년 1분기 신입사원 채용공고.pdf',
    categoryId: '1',
    parentCategoryId: '1',
    subcategoryId: '1-sub1',
    departmentId: 'HR001',
    uploadDate: '2024-01-15',
    uploader: '김영희',
    classified: false,
    fileUrl: '#',
  },
  {
    id: '2',
    name: '경력직 면접 평가서_DEV001.pdf',
    categoryId: '1',
    parentCategoryId: '1',
    subcategoryId: '1-sub1',
    departmentId: 'HR001',
    uploadDate: '2024-02-20',
    uploader: '이철수',
    classified: true,
    fileUrl: '#',
  },
  {
    id: '3',
    name: '2024년 2월 급여명세서.pdf',
    categoryId: '2',
    parentCategoryId: '2',
    subcategoryId: '2-sub1',
    departmentId: 'HR001',
    uploadDate: '2024-02-28',
    uploader: '박민수',
    classified: true,
    fileUrl: '#',
  },
  {
    id: '4',
    name: 'API 설계 문서 v2.3.pdf',
    categoryId: '3',
    parentCategoryId: '3',
    subcategoryId: '3-sub1',
    departmentId: 'DEV001',
    uploadDate: '2024-03-05',
    uploader: '정개발',
    classified: false,
    fileUrl: '#',
  },
  {
    id: '5',
    name: '시스템 아키텍처 다이어그램.pdf',
    categoryId: '3',
    parentCategoryId: '3',
    subcategoryId: '3-sub1',
    departmentId: 'DEV001',
    uploadDate: '2024-03-10',
    uploader: '최기술',
    classified: false,
    fileUrl: '#',
  },
  {
    id: '6',
    name: 'Q2 프로젝트 기획안.pdf',
    categoryId: '4',
    parentCategoryId: '4',
    subcategoryId: '4-sub1',
    departmentId: 'DEV001',
    uploadDate: '2024-03-15',
    uploader: '강프로',
    classified: false,
    fileUrl: '#',
  },
  {
    id: '7',
    name: '소셜미디어 캠페인 성과보고.pdf',
    categoryId: '5',
    parentCategoryId: '5',
    subcategoryId: '5-sub1',
    departmentId: 'MKT001',
    uploadDate: '2024-03-20',
    uploader: '임마케',
    classified: false,
    fileUrl: '#',
  },
  {
    id: '8',
    name: '2024년 3월 예산집행 현황.pdf',
    categoryId: '6',
    parentCategoryId: '6',
    subcategoryId: '6-sub1',
    departmentId: 'FIN001',
    uploadDate: '2024-03-25',
    uploader: '윤회계',
    classified: true,
    fileUrl: '#',
  },
];

const sanitizeFileName = (originalName: string) => {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop();
  return `${timestamp}.${ext}`;
};

export const useDocumentStore = create<DocumentState>((set) => ({
  departments: mockDepartments,
  categories: mockCategories,
  parentCategories: mockParentCategories,
  subcategories: mockSubcategories,
  documents: mockDocuments,
  isLoading: false,
  error: null,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ departments: mockDepartments, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // 문서 개수 계산 (categories를 통해 해당 부서의 문서 개수 계산)
        const departments: Department[] = await Promise.all(
          data.map(async (dept: SupabaseDepartment) => {
            try {
              // 해당 부서의 카테고리들 가져오기
              const { data: categories } = await supabase
                .from('categories')
                .select('id')
                .eq('department_id', dept.id);

              if (!categories || categories.length === 0) {
                return {
                  id: dept.id,
                  name: dept.name,
                  code: dept.code,
                  description: (dept as any).description ?? null,
                  documentCount: 0,
                };
              }

              // 해당 대분류(카테고리)를 parent_category_id로 참조하는 문서 개수 계산
              const categoryIds = categories.map((cat: { id: string }) => cat.id);
              const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .in('parent_category_id', categoryIds);

              return {
                id: dept.id,
                name: dept.name,
                code: dept.code,
                description: (dept as any).description ?? null,
                documentCount: count || 0,
              };
            } catch {
              // 개수 계산 실패 시 0으로 설정
              return {
                id: dept.id,
                name: dept.name,
                code: dept.code,
                description: (dept as any).description ?? null,
                documentCount: 0,
              };
            }
          })
        );
        set({ departments });
      } else {
        // 데이터가 없을 경우 mock 데이터 사용
        set({ departments: mockDepartments });
      }
    } catch (err) {
      console.error('Failed to fetch departments from Supabase, using mock data:', err);
      // Supabase 연결 실패 시 mock 데이터를 fallback으로 사용
      toast({
        title: '부서 데이터를 불러오지 못했습니다.',
        description: '임시 데이터로 계속 표시합니다.',
        variant: 'destructive',
      });
      set({ departments: mockDepartments, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ categories: mockCategories, isLoading: false });
        return;
      }

      // 현재 회사의 부서 ID 목록 조회
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ categories: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // 각 카테고리의 문서 개수 계산
        const categories: Category[] = await Promise.all(
          data.map(async (cat: SupabaseCategory) => {
            try {
              const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('parent_category_id', cat.id);

              return {
                id: cat.id,
                name: cat.name,
                description: cat.description || '',
                departmentId: cat.department_id,
                documentCount: count || 0,
                nfcRegistered: !!(cat as SupabaseCategory & { nfc_tag_id?: string }).nfc_tag_id,
                storageLocation: (cat as SupabaseCategory & { storage_location?: string }).storage_location || undefined,
              };
            } catch {
              return {
                id: cat.id,
                name: cat.name,
                description: cat.description || '',
                departmentId: cat.department_id,
                documentCount: 0,
                nfcRegistered: !!(cat as SupabaseCategory & { nfc_tag_id?: string }).nfc_tag_id,
                storageLocation: (cat as SupabaseCategory & { storage_location?: string }).storage_location || undefined,
              };
            }
          })
        );
        set({ categories });
      } else {
        // 데이터가 없을 경우 mock 데이터 사용
        set({ categories: mockCategories });
      }
    } catch (err) {
      console.error('Failed to fetch categories from Supabase, using mock data:', err);
      // Supabase 연결 실패 시 mock 데이터를 fallback으로 사용
      toast({
        title: '카테고리 데이터를 불러오지 못했습니다.',
        description: '임시 데이터로 계속 표시합니다.',
        variant: 'destructive',
      });
      set({ categories: mockCategories, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  // 대분류(Parent Category) 목록 조회
  fetchParentCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ parentCategories: mockParentCategories, isLoading: false });
        return;
      }

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ parentCategories: [], isLoading: false });
        return;
      }

      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true });

      if (catError) throw catError;

      if (!catData || catData.length === 0) {
        set({ parentCategories: [], isLoading: false });
        return;
      }

      const parentCategories: ParentCategory[] = await Promise.all(
        catData.map(async (cat: SupabaseParentCategory & { department_id: string }) => {
          try {
            const { count: subCount } = await supabase
              .from('subcategories')
              .select('*', { count: 'exact', head: true })
              .eq('parent_category_id', cat.id);

            const { count: docCount } = await supabase
              .from('documents')
              .select('*', { count: 'exact', head: true })
              .eq('parent_category_id', cat.id);

            return {
              id: cat.id,
              name: cat.name,
              description: (cat as any).description || '',
              departmentId: cat.department_id,
              subcategoryCount: subCount || 0,
              documentCount: docCount || 0,
            };
          } catch {
            return {
              id: cat.id,
              name: cat.name,
              description: (cat as any).description || '',
              departmentId: cat.department_id,
              subcategoryCount: 0,
              documentCount: 0,
            };
          }
        })
      );

      set({ parentCategories });
    } catch (err) {
      console.error('Failed to fetch parent categories from Supabase, using mock data:', err);
      toast({
        title: '대분류 카테고리를 불러오지 못했습니다.',
        description: '임시 데이터로 계속 표시합니다.',
        variant: 'destructive',
      });
      set({ parentCategories: mockParentCategories, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  // 세부 카테고리(Subcategory) 목록 조회
  fetchSubcategories: async (parentCategoryId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        const filtered = parentCategoryId
          ? mockSubcategories.filter((s) => s.parentCategoryId === parentCategoryId)
          : mockSubcategories;
        set({ subcategories: filtered, isLoading: false });
        return;
      }

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ subcategories: [], isLoading: false });
        return;
      }

      let query = supabase
        .from('subcategories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true });

      if (parentCategoryId) {
        query = query.eq('parent_category_id', parentCategoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ subcategories: [], isLoading: false });
        return;
      }

      const subcategories: Subcategory[] = await Promise.all(
        data.map(
          async (
            sub: SupabaseSubcategory & { department_id: string; parent_category_id: string }
          ) => {
            try {
              const { count } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('subcategory_id', sub.id);

              return {
                id: sub.id,
                name: sub.name,
                description: sub.description || '',
                parentCategoryId: sub.parent_category_id,
                departmentId: sub.department_id,
                nfcUid: sub.nfc_uid || null,
                nfcRegistered: sub.nfc_registered,
                storageLocation: sub.storage_location || undefined,
                documentCount: count || 0,
              };
            } catch {
              return {
                id: sub.id,
                name: sub.name,
                description: sub.description || '',
                parentCategoryId: sub.parent_category_id,
                departmentId: sub.department_id,
                nfcUid: sub.nfc_uid || null,
                nfcRegistered: sub.nfc_registered,
                storageLocation: sub.storage_location || undefined,
                documentCount: 0,
              };
            }
          }
        )
      );

      set({ subcategories });
    } catch (err) {
      console.error('Failed to fetch subcategories from Supabase:', err);
      toast({
        title: '세부 카테고리를 불러오지 못했습니다.',
        description: '임시 데이터로 계속 표시합니다.',
        variant: 'destructive',
      });
      set({ subcategories: mockSubcategories, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ documents: mockDocuments, isLoading: false });
        return;
      }

      // 현재 회사의 부서 ID 목록 조회
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ documents: [], isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('department_id', deptIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const documents: Document[] = (data as SupabaseDocument[]).map((doc) => {
          const parentCategoryId = (doc as SupabaseDocument & { parent_category_id?: string }).parent_category_id || '';
          const subcategoryId = (doc as SupabaseDocument & { subcategory_id?: string }).subcategory_id || '';

          return {
            id: doc.id,
            name: doc.title, // title을 name으로 매핑
            categoryId: (doc as SupabaseDocument & { category_id?: string }).category_id || undefined,
            parentCategoryId,
            subcategoryId,
            departmentId: doc.department_id,
            uploadDate: doc.uploaded_at,
            uploader: doc.uploaded_by || '', // uploaded_by를 uploader로 매핑 (nullable)
            classified: doc.is_classified, // is_classified를 classified로 매핑
            fileUrl:
              supabase.storage.from('123').getPublicUrl(doc.file_path).data
                .publicUrl || '#',
            ocrText: doc.ocr_text || null,
          };
        });
        set({ documents });
      } else {
        // 데이터가 없을 경우 mock 데이터 사용
        set({ documents: mockDocuments });
      }
    } catch (err) {
      console.error('Failed to fetch documents from Supabase, using mock data:', err);
      // Supabase 연결 실패 시 mock 데이터를 fallback으로 사용
      toast({
        title: '문서 데이터를 불러오지 못했습니다.',
        description: '임시 데이터로 계속 표시합니다.',
        variant: 'destructive',
      });
      set({ documents: mockDocuments, error: null });
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (category) => {
    try {
      // code 생성 (이름 기반으로 자동 생성 또는 사용자 제공)
      const code = category.name.substring(0, 10).toUpperCase().replace(/\s+/g, '_');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          description: category.description || null,
          department_id: category.departmentId,
          code: code,
          nfc_tag_id: category.nfcRegistered ? `NFC_${Date.now()}` : null, // nfcRegistered가 true면 nfc_tag_id 생성
          storage_location: category.storageLocation || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: data.id,
              name: data.name,
              description: data.description || '',
              departmentId: data.department_id,
              documentCount: 0,
              nfcRegistered: !!data.nfc_tag_id,
              storageLocation: data.storage_location || undefined,
            },
          ],
        }));
      }
    } catch (err) {
      console.error('Failed to add category to Supabase:', err);
      // Supabase 실패 시 로컬 상태에만 추가 (mock 데이터처럼)
      const newCategory: Category = {
        id: `temp_${Date.now()}`,
        name: category.name,
        description: category.description,
        departmentId: category.departmentId,
        documentCount: 0,
        nfcRegistered: category.nfcRegistered,
        storageLocation: category.storageLocation,
      };
      set((state) => ({
        categories: [...state.categories, newCategory],
        error: 'Failed to add category to Supabase, added locally only',
      }));
      toast({
        title: '카테고리 추가 실패',
        description: '네트워크 오류로 인해 카테고리를 로컬에만 추가했습니다.',
        variant: 'destructive',
      });
    }
  },

  // 대분류 카테고리 추가 (categories 테이블에 삽입)
  addParentCategory: async (category) => {
    try {
      const code = category.name.substring(0, 10).toUpperCase().replace(/\s+/g, '_');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: category.name,
          description: category.description || null,
          department_id: category.departmentId,
          code,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newParent: ParentCategory = {
          id: data.id,
          name: data.name,
          description: data.description || '',
          departmentId: data.department_id,
          subcategoryCount: 0,
          documentCount: 0,
        };

        set((state) => ({
          parentCategories: [...state.parentCategories, newParent],
        }));
      }
    } catch (err) {
      console.error('Failed to add parent category to Supabase:', err);
      const newParent: ParentCategory = {
        id: `temp_${Date.now()}`,
        name: category.name,
        description: category.description,
        departmentId: category.departmentId,
        subcategoryCount: 0,
        documentCount: 0,
      };
      set((state) => ({
        parentCategories: [...state.parentCategories, newParent],
        error: 'Failed to add parent category to Supabase, added locally only',
      }));
      toast({
        title: '대분류 카테고리 추가 실패',
        description: '네트워크 오류로 인해 카테고리를 로컬에만 추가했습니다.',
        variant: 'destructive',
      });
    }
  },

  // 세부 카테고리 추가 (subcategories 테이블에 삽입)
  addSubcategory: async (subcategory) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          name: subcategory.name,
          description: subcategory.description || null,
          parent_category_id: subcategory.parentCategoryId,
          department_id: subcategory.departmentId,
          nfc_uid: subcategory.nfcUid || null,
          nfc_registered: subcategory.nfcRegistered,
          storage_location: subcategory.storageLocation || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set((state) => ({
          subcategories: [
            ...state.subcategories,
            {
              id: data.id,
              name: data.name,
              description: data.description || '',
              parentCategoryId: data.parent_category_id,
              departmentId: data.department_id,
              nfcUid: data.nfc_uid || null,
              nfcRegistered: data.nfc_registered,
              storageLocation: data.storage_location || undefined,
              documentCount: 0,
            },
          ],
        }));
      }
    } catch (err) {
      console.error('Failed to add subcategory to Supabase:', err);
      const newSub: Subcategory = {
        id: `temp_${Date.now()}`,
        name: subcategory.name,
        description: subcategory.description,
        parentCategoryId: subcategory.parentCategoryId,
        departmentId: subcategory.departmentId,
        nfcUid: subcategory.nfcUid || null,
        nfcRegistered: subcategory.nfcRegistered,
        storageLocation: subcategory.storageLocation,
        documentCount: 0,
      };
      set((state) => ({
        subcategories: [...state.subcategories, newSub],
        error: 'Failed to add subcategory to Supabase, added locally only',
      }));
      toast({
        title: '세부 카테고리 추가 실패',
        description: '네트워크 오류로 인해 세부 카테고리를 로컬에만 추가했습니다.',
        variant: 'destructive',
      });
    }
  },

  updateSubcategory: async (id, updates) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.parentCategoryId !== undefined)
        updateData.parent_category_id = updates.parentCategoryId;
      if (updates.departmentId !== undefined)
        updateData.department_id = updates.departmentId;
      if (updates.nfcUid !== undefined) updateData.nfc_uid = updates.nfcUid;
      if (updates.nfcRegistered !== undefined)
        updateData.nfc_registered = updates.nfcRegistered;
      if (updates.storageLocation !== undefined)
        updateData.storage_location = updates.storageLocation;

      const { error } = await supabase
        .from('subcategories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === id ? { ...sub, ...updates } : sub
        ),
      }));
    } catch (err) {
      console.error('Failed to update subcategory in Supabase:', err);
      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === id ? { ...sub, ...updates } : sub
        ),
        error: 'Failed to update subcategory in Supabase, updated locally only',
      }));
      toast({
        title: '세부 카테고리 수정 실패',
        description: '네트워크 오류로 인해 세부 카테고리를 서버에 반영하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  deleteSubcategory: async (id) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.filter((sub) => sub.id !== id),
        documents: state.documents.filter((doc) => doc.subcategoryId !== id),
      }));
    } catch (err) {
      console.error('Failed to delete subcategory from Supabase:', err);
      set((state) => ({
        subcategories: state.subcategories.filter((sub) => sub.id !== id),
        documents: state.documents.filter((doc) => doc.subcategoryId !== id),
        error: 'Failed to delete subcategory from Supabase, removed locally only',
      }));
      toast({
        title: '세부 카테고리 삭제 실패',
        description: '네트워크 오류로 인해 세부 카테고리를 서버에서 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  registerNfcTag: async (subcategoryId, nfcUid) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          nfc_uid: nfcUid,
          nfc_registered: true,
        })
        .eq('id', subcategoryId);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === subcategoryId
            ? { ...sub, nfcUid, nfcRegistered: true }
            : sub
        ),
      }));
    } catch (err) {
      console.error('Failed to register NFC tag for subcategory:', err);
      toast({
        title: 'NFC 태그 등록 실패',
        description: '세부 카테고리의 NFC 정보를 업데이트하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.storageLocation !== undefined) updateData.storage_location = updates.storageLocation;
      
      // nfcRegistered 업데이트 시 nfc_tag_id 처리
      if (updates.nfcRegistered !== undefined) {
        if (updates.nfcRegistered) {
          // 기존 nfc_tag_id가 없으면 새로 생성
          try {
            const { data: currentCategory } = await supabase
              .from('categories')
              .select('nfc_tag_id')
              .eq('id', id)
              .single();
            
            if (!currentCategory?.nfc_tag_id) {
              updateData.nfc_tag_id = `NFC_${Date.now()}`;
            }
          } catch {
            // 조회 실패 시 새로운 nfc_tag_id 생성
            updateData.nfc_tag_id = `NFC_${Date.now()}`;
          }
        } else {
          // nfcRegistered가 false면 nfc_tag_id를 null로 설정
          updateData.nfc_tag_id = null;
        }
      }

      const { error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      }));
    } catch (err) {
      console.error('Failed to update category in Supabase:', err);
      // Supabase 실패 시에도 로컬 상태는 업데이트 (사용자 경험 개선)
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
        error: 'Failed to update category in Supabase, updated locally only',
      }));
      toast({
        title: '카테고리 수정 실패',
        description: '네트워크 오류로 인해 카테고리를 서버에 반영하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  deleteCategory: async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Supabase에서 삭제 성공 시 로컬 상태에서도 제거
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        documents: state.documents.filter((doc) => doc.categoryId !== id),
      }));
    } catch (err) {
      console.error('Failed to delete category from Supabase:', err);
      // Supabase 실패 시에도 로컬 상태에서는 제거 (사용자 경험 개선)
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        documents: state.documents.filter((doc) => doc.categoryId !== id),
        error: 'Failed to delete category from Supabase, removed locally only',
      }));
      toast({
        title: '카테고리 삭제 실패',
        description: '네트워크 오류로 인해 카테고리를 서버에서 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  uploadDocument: async (document) => {
    try {
      const originalNameForStorage = document.originalFileName || document.name;
      const filePath = sanitizeFileName(originalNameForStorage);

      const { error: storageError } = await supabase.storage
        .from('123')
        .upload(filePath, document.file);

      if (storageError) {
        throw storageError;
      }

      let embedding: number[] | null = null;

      try {
        embedding = await generateEmbedding(
          `${document.name} ${document.ocrText || ''}`
        );
      } catch (embeddingError) {
        console.error('Failed to generate embedding for document:', embeddingError);
        toast({
          title: '임베딩 생성 실패',
          description:
            '문서 검색 품질이 저하될 수 있습니다. 그래도 업로드는 계속 진행됩니다.',
          variant: 'destructive',
        });
        embedding = null;
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: document.name, // name을 title로 매핑
          parent_category_id: document.parentCategoryId,
          subcategory_id: document.subcategoryId,
          department_id: document.departmentId,
          file_path: filePath,
          file_size: document.file.size,
          ocr_text: document.ocrText || null, // OCR 텍스트
          uploaded_by: null,
          is_classified: document.classified ?? false, // classified를 is_classified로 매핑
          embedding: embedding,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        let fileUrl = '#';

        try {
          const { data: publicUrlData } = supabase.storage
            .from('123')
            .getPublicUrl(data.file_path);

          if (publicUrlData?.publicUrl) {
            fileUrl = publicUrlData.publicUrl;
          }
        } catch {
          fileUrl = '#';
        }

        set((state) => ({
          documents: [
            {
              id: data.id,
              name: data.title, // title을 name으로 매핑
              categoryId: (data as any).category_id || undefined,
              parentCategoryId: (data as any).parent_category_id,
              subcategoryId: (data as any).subcategory_id,
              departmentId: data.department_id,
              uploadDate: data.uploaded_at, // uploaded_at을 uploadDate로 매핑
              uploader: data.uploaded_by || '', // uploaded_by를 uploader로 매핑
              classified: data.is_classified, // is_classified를 classified로 매핑
              fileUrl,
              ocrText: data.ocr_text || null,
            },
            ...state.documents,
          ],
        }));

        const { user } = useAuthStore.getState();
        if (user?.companyId) {
          await createDocumentNotification({
            type: 'document_created',
            documentId: data.id,
            title: data.title,
            companyId: user.companyId,
            departmentId: data.department_id,
          });
        }
      }
    } catch (err) {
      console.error('Failed to upload document to Supabase:', err);
      // Supabase 실패 시 로컬 상태에만 추가 (mock 데이터처럼)
      const newDocument: Document = {
        id: `temp_${Date.now()}`,
        name: document.name,
        categoryId: document.categoryId,
        parentCategoryId: document.parentCategoryId,
        subcategoryId: document.subcategoryId,
        departmentId: document.departmentId,
        uploadDate: new Date().toISOString().split('T')[0],
        uploader: document.uploader,
        classified: document.classified ?? false,
        fileUrl: '#',
        ocrText: document.ocrText || null,
      };
      set((state) => ({
        documents: [newDocument, ...state.documents],
        error: 'Failed to upload document to Supabase, added locally only',
      }));
      toast({
        title: '문서 업로드 실패',
        description: '네트워크 오류로 인해 문서를 로컬에만 추가했습니다.',
        variant: 'destructive',
      });
    }
  },

  deleteDocument: async (id) => {
    try {
      let filePath: string | null = null;

      try {
        const { data: existing } = await supabase
          .from('documents')
          .select('file_path')
          .eq('id', id)
          .single();

        filePath = existing?.file_path || null;
      } catch {
      }

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('123')
          .remove([filePath]);

        if (storageError) {
          console.error('Failed to delete file from Supabase Storage:', storageError);
        }
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Supabase에서 삭제 성공 시 로컬 상태에서도 제거
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete document from Supabase:', err);
      // Supabase 실패 시에도 로컬 상태에서는 제거 (사용자 경험 개선)
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        error: 'Failed to delete document from Supabase, removed locally only',
      }));
      toast({
        title: '문서 삭제 실패',
        description: '네트워크 오류로 인해 문서를 완전히 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  checkPermission: async (userId, departmentId, action) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('department_id', departmentId)
        .single();

      if (error || !data) {
        return false;
      }

      return (data as any)[`can_${action}`] || false;
    } catch (error) {
      console.error('권한 체크 오류:', error);
      return false;
    }
  },
}));
