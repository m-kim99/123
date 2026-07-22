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
import { r2Storage } from '@/lib/r2';
import { addDays } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { createDocumentNotification, createShareNotification, deleteShareNotification } from '@/lib/notifications';
import { SharedDocument } from '@/types/document';
import { trackEvent } from '@/lib/analytics';
import { isImageFile, convertImageToPdf } from '@/lib/imageToPdf';
import { checkDocumentLimit, checkStorageLimit } from '@/lib/subscription';

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
  // 4단 구조용: 세부 스토리지 / 대분류 ID
  subcategoryId: string;
  parentCategoryId: string;
  departmentId: string;
  uploadDate: string;
  uploader: string;
  classified: boolean;
  fileUrl: string;
  ocrText?: string | null;
  deletedAt?: string | null;
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
  managementNumber?: string;
  defaultExpiryDays?: number | null;
  expiryDate?: string | null;
  colorLabel?: string | null;
  documentCount: number;
}

interface DocumentState {
  departments: Department[];
  categories: Category[];
  parentCategories: ParentCategory[];
  subcategories: Subcategory[];
  documents: Document[];
  trashedDocuments: Document[];
  sharedDocuments: SharedDocument[];
  isLoading: boolean;
  /** 동시 fetch 개수 추적 — isLoading은 이 값이 0보다 클 때 true (경쟁 조건 방지) */
  _loadingCount: number;
  error: string | null;
  storageStatus: { allowed: boolean; usedMb: number; limitMb: number | null } | null;
  refreshStorageStatus: () => Promise<void>;
  fetchDepartments: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchParentCategories: () => Promise<void>;
  fetchSubcategories: (parentCategoryId?: string) => Promise<void>;
  fetchDocuments: () => Promise<void>;
  fetchTrashedDocuments: () => Promise<void>;
  fetchSharedDocuments: () => Promise<void>;
  shareDocument: (
    documentId: string,
    sharedToUserId: string,
    permission: 'view' | 'download',
    message?: string
  ) => Promise<void>;
  unshareDocument: (shareId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'documentCount'>) => Promise<void>;
  addParentCategory: (
    category: Omit<ParentCategory, 'id' | 'subcategoryCount' | 'documentCount'>
  ) => Promise<void>;
  addSubcategory: (
    subcategory: Omit<Subcategory, 'id' | 'documentCount'>
  ) => Promise<Subcategory | null>;
  updateSubcategory: (id: string, updates: Partial<Subcategory>) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;
  registerNfcTag: (subcategoryId: string, nfcUid: string) => Promise<void>;
  findSubcategoryByNfcUid: (nfcUid: string) => Promise<Subcategory | null>;
  clearNfcFromSubcategory: (subcategoryId: string) => Promise<void>;
  clearNfcByUid: (nfcUid: string, excludeSubcategoryId?: string) => Promise<void>;
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
  restoreDocument: (id: string) => Promise<void>;
  permanentlyDeleteDocument: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  updateDocumentOcrText: (id: string, ocrText: string) => Promise<void>;
  updateDocumentFile: (id: string, file: File, ocrText?: string) => Promise<void>;
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

const sanitizeFileName = (originalName: string) => {
  const timestamp = Date.now();
  const ext = originalName.split('.').pop();
  return `${timestamp}.${ext}`;
};

/** isLoading을 카운터 기반으로 안전하게 증가/감소 */
const startLoading = (set: any) =>
  set((s: DocumentState) => {
    const count = s._loadingCount + 1;
    return { _loadingCount: count, isLoading: true };
  });

const endLoading = (set: any) =>
  set((s: DocumentState) => {
    const count = Math.max(0, s._loadingCount - 1);
    return { _loadingCount: count, isLoading: count > 0 };
  });

export const useDocumentStore = create<DocumentState>((set, get) => ({
  departments: [],
  categories: [],
  parentCategories: [],
  subcategories: [],
  documents: [],
  trashedDocuments: [],
  sharedDocuments: [],
  isLoading: false,
  _loadingCount: 0,
  error: null,
  storageStatus: null,

  refreshStorageStatus: async () => {
    const { user } = useAuthStore.getState();
    if (!user?.companyId) {
      set({ storageStatus: null });
      return;
    }
    const result = await checkStorageLimit(user.companyId, 0);
    set({
      storageStatus: { allowed: result.allowed, usedMb: result.current, limitMb: result.limit },
    });
  },

  fetchDepartments: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ departments: [] });
        return;
      }

      // 1. 부서 목록 (1 쿼리)
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ departments: [] });
        return;
      }

      const deptIds = data.map((d: SupabaseDepartment) => d.id);

      // 2. 모든 부서의 카테고리 한 번에 (N쿼리 → 1쿼리)
      const { data: allCategories } = await supabase
        .from('categories')
        .select('id, department_id')
        .in('department_id', deptIds);

      const allCategoryIds = (allCategories || []).map((c: { id: string }) => c.id);

      // 3. 전체 문서 parent_category_id 한 번에 조회 후 JS에서 집계 (N쿼리 → 1쿼리)
      const docsByCategory: Record<string, number> = {};
      if (allCategoryIds.length > 0) {
        const { data: docData } = await supabase
          .from('documents')
          .select('parent_category_id')
          .in('parent_category_id', allCategoryIds)
          .is('deleted_at', null);

        (docData || []).forEach((doc: { parent_category_id: string }) => {
          docsByCategory[doc.parent_category_id] =
            (docsByCategory[doc.parent_category_id] || 0) + 1;
        });
      }

      // 부서별 카테고리 매핑
      const catsByDept: Record<string, string[]> = {};
      (allCategories || []).forEach((cat: { id: string; department_id: string }) => {
        if (!catsByDept[cat.department_id]) catsByDept[cat.department_id] = [];
        catsByDept[cat.department_id].push(cat.id);
      });

      const departments: Department[] = data.map((dept: SupabaseDepartment) => {
        const deptCatIds = catsByDept[dept.id] || [];
        const documentCount = deptCatIds.reduce(
          (sum, catId) => sum + (docsByCategory[catId] || 0),
          0
        );
        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: (dept as any).description ?? null,
          documentCount,
        };
      });

      set({ departments });
    } catch (err) {
      console.error('Failed to fetch departments from Supabase:', err);
      toast({
        title: '부서 데이터를 불러오지 못했습니다.',
        description: '빈 상태로 표시합니다.',
        variant: 'destructive',
      });
      set({ departments: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  fetchCategories: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ categories: [] });
        return;
      }

      // 1. 부서 ID 목록 (1 쿼리)
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ categories: [] });
        return;
      }

      // 2. 카테고리 목록 (1 쿼리)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ categories: [] });
        return;
      }

      const categoryIds = data.map((cat: SupabaseCategory) => cat.id);

      // 3. 문서 parent_category_id 전체 조회 후 JS에서 집계 (N쿼리 → 1쿼리)
      const docsByCategory: Record<string, number> = {};
      const { data: docData } = await supabase
        .from('documents')
        .select('parent_category_id')
        .in('parent_category_id', categoryIds)
        .is('deleted_at', null);

      (docData || []).forEach((doc: { parent_category_id: string }) => {
        docsByCategory[doc.parent_category_id] =
          (docsByCategory[doc.parent_category_id] || 0) + 1;
      });

      const categories: Category[] = data.map((cat: SupabaseCategory) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        departmentId: cat.department_id,
        documentCount: docsByCategory[cat.id] || 0,
        nfcRegistered: !!(cat as SupabaseCategory & { nfc_tag_id?: string }).nfc_tag_id,
        storageLocation:
          (cat as SupabaseCategory & { storage_location?: string }).storage_location || undefined,
      }));

      set({ categories });
    } catch (err) {
      console.error('Failed to fetch categories from Supabase:', err);
      toast({
        title: '카테고리 데이터를 불러오지 못했습니다.',
        description: '빈 상태로 표시합니다.',
        variant: 'destructive',
      });
      set({ categories: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  // 대분류(Parent Category) 목록 조회
  fetchParentCategories: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ parentCategories: [] });
        return;
      }

      // 1. 부서 ID 목록 (1 쿼리)
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ parentCategories: [] });
        return;
      }

      // 2. 대분류 카테고리 목록 (1 쿼리)
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true });

      if (catError) throw catError;

      if (!catData || catData.length === 0) {
        set({ parentCategories: [] });
        return;
      }

      const catIds = catData.map((c: any) => c.id);

      // 3. 세부 스토리지 수 + 문서 수를 각각 1쿼리로 (2N쿼리 → 2쿼리)
      const [subData, docData] = await Promise.all([
        supabase
          .from('subcategories')
          .select('parent_category_id')
          .in('parent_category_id', catIds),
        supabase
          .from('documents')
          .select('parent_category_id')
          .in('parent_category_id', catIds)
          .is('deleted_at', null),
      ]);

      const subCountByCategory: Record<string, number> = {};
      (subData.data || []).forEach((s: { parent_category_id: string }) => {
        subCountByCategory[s.parent_category_id] =
          (subCountByCategory[s.parent_category_id] || 0) + 1;
      });

      const docCountByCategory: Record<string, number> = {};
      (docData.data || []).forEach((d: { parent_category_id: string }) => {
        docCountByCategory[d.parent_category_id] =
          (docCountByCategory[d.parent_category_id] || 0) + 1;
      });

      const parentCategories: ParentCategory[] = catData.map(
        (cat: SupabaseParentCategory & { department_id: string }) => ({
          id: cat.id,
          name: cat.name,
          description: (cat as any).description || '',
          departmentId: cat.department_id,
          subcategoryCount: subCountByCategory[cat.id] || 0,
          documentCount: docCountByCategory[cat.id] || 0,
        })
      );

      set({ parentCategories });
    } catch (err) {
      console.error('Failed to fetch parent categories from Supabase:', err);
      toast({
        title: '대분류 카테고리를 불러오지 못했습니다.',
        description: '빈 상태로 표시합니다.',
        variant: 'destructive',
      });
      set({ parentCategories: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  // 세부 스토리지(Subcategory) 목록 조회
  fetchSubcategories: async (parentCategoryId?: string) => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ subcategories: [] });
        return;
      }

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ subcategories: [] });
        return;
      }

      let query = supabase
        .from('subcategories')
        .select('*')
        .in('department_id', deptIds)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (parentCategoryId) {
        query = query.eq('parent_category_id', parentCategoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        set({ subcategories: [] });
        return;
      }

      // 세부 스토리지별 문서 수: N쿼리 → 1쿼리
      const subIds = data.map((s: any) => s.id);
      const { data: docData } = await supabase
        .from('documents')
        .select('subcategory_id')
        .in('subcategory_id', subIds)
        .is('deleted_at', null);

      const docCountBySub: Record<string, number> = {};
      (docData || []).forEach((d: { subcategory_id: string }) => {
        docCountBySub[d.subcategory_id] = (docCountBySub[d.subcategory_id] || 0) + 1;
      });

      const subcategories: Subcategory[] = data.map(
        (sub: SupabaseSubcategory & { department_id: string; parent_category_id: string }) => ({
          id: sub.id,
          name: sub.name,
          description: sub.description || '',
          parentCategoryId: sub.parent_category_id,
          departmentId: sub.department_id,
          nfcUid: sub.nfc_tag_id || null,
          nfcRegistered: sub.nfc_registered,
          storageLocation: sub.storage_location || undefined,
          managementNumber: (sub as any).management_number || undefined,
          defaultExpiryDays: (sub as any).default_expiry_days || null,
          expiryDate: (sub as any).expiry_date || null,
          colorLabel: (sub as any).color_label || null,
          documentCount: docCountBySub[sub.id] || 0,
        })
      );

      set({ subcategories });
    } catch (err) {
      console.error('Failed to fetch subcategories from Supabase:', err);
      toast({
        title: '세부 스토리지를 불러오지 못했습니다.',
        description: '빈 상태로 표시합니다.',
        variant: 'destructive',
      });
      set({ subcategories: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  fetchDocuments: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ documents: [] });
        return;
      }

      // 저장용량 상태도 함께 갱신 (업로드 가능 여부 UI 반영용)
      void get().refreshStorageStatus();

      // 현재 회사의 부서 ID 목록 조회
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ documents: [] });
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('department_id', deptIds)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // uploaded_by(UUID)를 사용자 이름으로 변환하기 위한 매핑
        const uploaderIds = [...new Set(
          (data as SupabaseDocument[])
            .map((doc) => doc.uploaded_by)
            .filter((id): id is string => !!id)
        )];

        let uploaderMap: Record<string, string> = {};
        if (uploaderIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', uploaderIds);
          if (usersData) {
            uploaderMap = Object.fromEntries(
              usersData.map((u: { id: string; name: string }) => [u.id, u.name])
            );
          }
        }

        const documents: Document[] = (data as SupabaseDocument[]).map((doc) => {
          const parentCategoryId = (doc as SupabaseDocument & { parent_category_id?: string }).parent_category_id || '';
          const subcategoryId = (doc as SupabaseDocument & { subcategory_id?: string }).subcategory_id || '';

          return {
            id: doc.id,
            name: doc.title,
            categoryId: (doc as SupabaseDocument & { category_id?: string }).category_id || undefined,
            parentCategoryId,
            subcategoryId,
            departmentId: doc.department_id,
            uploadDate: doc.uploaded_at,
            uploader: (doc.uploaded_by && uploaderMap[doc.uploaded_by]) || '',
            classified: doc.is_classified,
            fileUrl:
              r2Storage.getPublicUrl(doc.file_path).data.publicUrl || '#',
            ocrText: doc.ocr_text || null,
            deletedAt: null,
          };
        });
        set({ documents });
      } else {
        set({ documents: [] });
      }
    } catch (err) {
      console.error('Failed to fetch documents from Supabase:', err);
      toast({
        title: '문서 데이터를 불러오지 못했습니다.',
        description: '빈 상태로 표시합니다.',
        variant: 'destructive',
      });
      set({ documents: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  fetchTrashedDocuments: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.companyId) {
        set({ trashedDocuments: [] });
        return;
      }

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      if (deptError) throw deptError;

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);

      if (deptIds.length === 0) {
        set({ trashedDocuments: [] });
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .in('department_id', deptIds)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // uploaded_by(UUID)를 사용자 이름으로 변환
        const uploaderIds = [...new Set(
          (data as SupabaseDocument[])
            .map((doc) => doc.uploaded_by)
            .filter((id): id is string => !!id)
        )];

        let uploaderMap: Record<string, string> = {};
        if (uploaderIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', uploaderIds);
          if (usersData) {
            uploaderMap = Object.fromEntries(
              usersData.map((u: { id: string; name: string }) => [u.id, u.name])
            );
          }
        }

        const trashedDocuments: Document[] = (data as SupabaseDocument[]).map((doc) => {
          const parentCategoryId = (doc as SupabaseDocument & { parent_category_id?: string }).parent_category_id || '';
          const subcategoryId = (doc as SupabaseDocument & { subcategory_id?: string }).subcategory_id || '';

          return {
            id: doc.id,
            name: doc.title,
            categoryId: (doc as SupabaseDocument & { category_id?: string }).category_id || undefined,
            parentCategoryId,
            subcategoryId,
            departmentId: doc.department_id,
            uploadDate: doc.uploaded_at,
            uploader: (doc.uploaded_by && uploaderMap[doc.uploaded_by]) || '',
            classified: doc.is_classified,
            fileUrl:
              r2Storage.getPublicUrl(doc.file_path).data.publicUrl || '#',
            ocrText: doc.ocr_text || null,
            deletedAt: (doc as any).deleted_at || null,
          };
        });
        set({ trashedDocuments });
      } else {
        set({ trashedDocuments: [] });
      }
    } catch (err) {
      console.error('Failed to fetch trashed documents:', err);
      toast({
        title: '휴지통 데이터를 불러오지 못했습니다.',
        variant: 'destructive',
      });
      set({ trashedDocuments: [], error: null });
    } finally {
      endLoading(set);
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

        const { departments } = get();
        const department = departments.find(
          (d) => d.id === data.department_id,
        );

        const { user } = useAuthStore.getState();
        if (user?.companyId) {
          await createDocumentNotification({
            type: 'parent_category_created',
            documentId: null,
            title: data.name,
            companyId: user.companyId,
            departmentId: data.department_id,
            departmentName: department?.name ?? null,
            parentCategoryId: data.id,
            parentCategoryName: data.name,
            subcategoryId: null,
            subcategoryName: null,
          });
        }

      }
    } catch (err) {
      console.error('Failed to add parent category to Supabase:', err);
      // 임시 ID로 로컬에 추가하지 않음: temp ID 데이터는 후속 작업(수정·삭제·NFC 등록)이 모두 실패함
      set({ error: 'Failed to add parent category to Supabase' });
      toast({
        title: '대분류 카테고리 추가 실패',
        description: '저장에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  },

  // 세부 스토리지 추가 (subcategories 테이블에 삽입)
  addSubcategory: async (subcategory) => {
    try {
      const computedExpiryDate =
        subcategory.expiryDate ??
        (subcategory.defaultExpiryDays != null
          ? addDays(new Date(), subcategory.defaultExpiryDays).toISOString()
          : null);

      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          name: subcategory.name,
          description: subcategory.description || null,
          parent_category_id: subcategory.parentCategoryId,
          department_id: subcategory.departmentId,
          nfc_tag_id: subcategory.nfcUid || null,
          nfc_registered: subcategory.nfcRegistered,
          storage_location: subcategory.storageLocation || null,
          default_expiry_days: subcategory.defaultExpiryDays || null,
          expiry_date: computedExpiryDate,
          color_label: subcategory.colorLabel || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return null;
      }

      const created: Subcategory = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        parentCategoryId: data.parent_category_id,
        departmentId: data.department_id,
        nfcUid: data.nfc_tag_id || null,
        nfcRegistered: data.nfc_registered,
        storageLocation: data.storage_location || undefined,
        defaultExpiryDays: data.default_expiry_days || null,
        expiryDate: data.expiry_date || null,
        colorLabel: data.color_label || null,
        documentCount: 0,
      };

      set((state) => ({
        subcategories: [...state.subcategories, created],
      }));

      const { departments, parentCategories } = get();
      const department = departments.find((d) => d.id === data.department_id);
      const parentCategory = parentCategories.find(
        (p) => p.id === data.parent_category_id,
      );

      const { user } = useAuthStore.getState();
      if (user?.companyId) {
        await createDocumentNotification({
          type: 'subcategory_created',
          documentId: null,
          title: data.name,
          companyId: user.companyId,
          departmentId: data.department_id,
          departmentName: department?.name ?? null,
          parentCategoryId: data.parent_category_id,
          parentCategoryName: parentCategory?.name ?? null,
          subcategoryId: data.id,
          subcategoryName: data.name,
        });
      }


      return created;
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
        defaultExpiryDays: subcategory.defaultExpiryDays ?? null,
        expiryDate:
          subcategory.expiryDate ??
          (subcategory.defaultExpiryDays != null
            ? addDays(new Date(), subcategory.defaultExpiryDays).toISOString()
            : null),
        colorLabel: subcategory.colorLabel || null,
        documentCount: 0,
      };
      set((state) => ({
        subcategories: [...state.subcategories, newSub],
        error: 'Failed to add subcategory to Supabase, added locally only',
      }));
      toast({
        title: '세부 스토리지 추가 실패',
        description: '네트워크 오류로 인해 세부 스토리지를 로컬에만 추가했습니다.',
        variant: 'destructive',
      });

      return null;
    }
  },

  updateSubcategory: async (id, updates) => {
    try {
      const normalizedUpdates: any = { ...updates };
      if (
        normalizedUpdates.expiryDate === undefined &&
        normalizedUpdates.defaultExpiryDays != null
      ) {
        normalizedUpdates.expiryDate = addDays(
          new Date(),
          normalizedUpdates.defaultExpiryDays
        ).toISOString();
      }

      const updateData: any = {};
      if (normalizedUpdates.name !== undefined) updateData.name = normalizedUpdates.name;
      if (normalizedUpdates.description !== undefined)
        updateData.description = normalizedUpdates.description;
      if (normalizedUpdates.parentCategoryId !== undefined)
        updateData.parent_category_id = normalizedUpdates.parentCategoryId;
      if (normalizedUpdates.departmentId !== undefined)
        updateData.department_id = normalizedUpdates.departmentId;
      if (normalizedUpdates.nfcUid !== undefined)
        updateData.nfc_tag_id = normalizedUpdates.nfcUid;
      if (normalizedUpdates.nfcRegistered !== undefined)
        updateData.nfc_registered = normalizedUpdates.nfcRegistered;
      if (normalizedUpdates.storageLocation !== undefined)
        updateData.storage_location = normalizedUpdates.storageLocation;
      if (normalizedUpdates.managementNumber !== undefined)
        updateData.management_number = normalizedUpdates.managementNumber;
      if (normalizedUpdates.defaultExpiryDays !== undefined)
        updateData.default_expiry_days = normalizedUpdates.defaultExpiryDays;
      if (normalizedUpdates.expiryDate !== undefined)
        updateData.expiry_date = normalizedUpdates.expiryDate;
      if (normalizedUpdates.colorLabel !== undefined)
        updateData.color_label = normalizedUpdates.colorLabel;

      const { error } = await supabase
        .from('subcategories')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === id ? { ...sub, ...normalizedUpdates } : sub
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
        title: '세부 스토리지 수정 실패',
        description: '네트워크 오류로 인해 세부 스토리지를 서버에 반영하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  deleteSubcategory: async (id) => {
    try {
      const { subcategories, parentCategories, departments } = get();
      const targetSub = subcategories.find((sub) => sub.id === id);

      const department = targetSub
        ? departments.find((d) => d.id === targetSub.departmentId)
        : undefined;
      const parentCategory = targetSub
        ? parentCategories.find((p) => p.id === targetSub.parentCategoryId)
        : undefined;

      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.filter((sub) => sub.id !== id),
        documents: state.documents.filter((doc) => doc.subcategoryId !== id),
      }));

      const { user } = useAuthStore.getState();
      if (user?.companyId && targetSub) {
        await createDocumentNotification({
          type: 'subcategory_deleted',
          documentId: null,
          title: targetSub.name,
          companyId: user.companyId,
          departmentId: targetSub.departmentId,
          departmentName: department?.name ?? null,
          parentCategoryId: targetSub.parentCategoryId,
          parentCategoryName: parentCategory?.name ?? null,
          subcategoryId: targetSub.id,
          subcategoryName: targetSub.name,
        });
      }

    } catch (err) {
      console.error('Failed to delete subcategory from Supabase:', err);
      toast({
        title: '세부 스토리지 삭제 실패',
        description: '네트워크 오류로 인해 세부 스토리지를 서버에서 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  registerNfcTag: async (subcategoryId, nfcUid) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          nfc_tag_id: nfcUid,
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
        description: '세부 스토리지의 NFC 정보를 업데이트하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  findSubcategoryByNfcUid: async (nfcUid) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('nfc_tag_id', nfcUid)
        .maybeSingle();

      if (error) {
        console.error('Failed to find subcategory by NFC UID:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        parentCategoryId: data.parent_category_id,
        departmentId: data.department_id,
        nfcUid: data.nfc_tag_id || null,
        nfcRegistered: data.nfc_registered,
        storageLocation: data.storage_location || undefined,
        documentCount: 0,
      };
    } catch (err) {
      console.error('Failed to find subcategory by NFC UID:', err);
      return null;
    }
  },

  clearNfcFromSubcategory: async (subcategoryId) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .update({
          nfc_tag_id: null,
          nfc_registered: false,
        })
        .eq('id', subcategoryId);

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.id === subcategoryId
            ? { ...sub, nfcUid: null, nfcRegistered: false }
            : sub
        ),
      }));

    } catch (err) {
      console.error('Failed to clear NFC from subcategory:', err);

    }
  },

  // 특정 NFC UID를 가진 모든 서브카테고리에서 NFC 정보 해제
  clearNfcByUid: async (nfcUid, excludeSubcategoryId) => {
    try {
      // excludeSubcategoryId를 제외한 모든 서브카테고리에서 해당 NFC UID 정보 삭제
      let query = supabase
        .from('subcategories')
        .update({
          nfc_tag_id: null,
          nfc_registered: false,
        })
        .eq('nfc_tag_id', nfcUid);

      if (excludeSubcategoryId) {
        query = query.neq('id', excludeSubcategoryId);
      }

      const { error } = await query;

      if (error) throw error;

      set((state) => ({
        subcategories: state.subcategories.map((sub) =>
          sub.nfcUid === nfcUid && sub.id !== excludeSubcategoryId
            ? { ...sub, nfcUid: null, nfcRegistered: false }
            : sub
        ),
      }));

    } catch (err) {
      console.error('Failed to clear NFC by UID:', err);

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
      const { categories, departments } = get();
      const targetCategory = categories.find((cat) => cat.id === id);

      const department = targetCategory
        ? departments.find((d) => d.id === targetCategory.departmentId)
        : undefined;

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Supabase에서 삭제 성공 시 로컬 상태에서도 제거
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        parentCategories: state.parentCategories.filter((cat) => cat.id !== id),
        subcategories: state.subcategories.filter((sub) => sub.parentCategoryId !== id),
        documents: state.documents.filter((doc) => doc.parentCategoryId !== id),
      }));

      const { user } = useAuthStore.getState();
      if (user?.companyId && targetCategory) {
        await createDocumentNotification({
          type: 'parent_category_deleted',
          documentId: null,
          title: targetCategory.name,
          companyId: user.companyId,
          departmentId: targetCategory.departmentId,
          departmentName: department?.name ?? null,
          parentCategoryId: targetCategory.id,
          parentCategoryName: targetCategory.name,
          subcategoryId: null,
          subcategoryName: null,
        });
      }

    } catch (err) {
      console.error('Failed to delete category from Supabase:', err);
      toast({
        title: '카테고리 삭제 실패',
        description: '네트워크 오류로 인해 카테고리를 서버에서 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  uploadDocument: async (document) => {
    try {
      // ★ 구독 플랜 문서 수 제한 체크
      const { user } = useAuthStore.getState();
      if (user?.companyId) {
        const limitCheck = await checkDocumentLimit(user.companyId);
        if (!limitCheck.allowed) {
          toast({
            title: '문서 업로드 제한',
            description: `현재 플랜의 문서 한도(${limitCheck.limit}개)에 도달했습니다. 플랜을 업그레이드하거나 기존 문서를 삭제해주세요. (현재: ${limitCheck.current}개)`,
            variant: 'destructive',
          });
          throw new Error('PLAN_DOCUMENT_LIMIT_REACHED');
        }

        // ★ 구독 플랜 저장 공간 제한 체크
        const storageCheck = await checkStorageLimit(user.companyId, document.file.size);
        if (!storageCheck.allowed) {
          toast({
            title: '저장 공간 부족',
            description: `현재 플랜의 저장 공간(${storageCheck.limit}MB)을 초과합니다. 기존 문서를 삭제하거나 플랜을 업그레이드해주세요. (사용 중: ${storageCheck.current}MB)`,
            variant: 'destructive',
          });
          throw new Error('PLAN_STORAGE_LIMIT_REACHED');
        }
      }

      // 이미지 파일이면 자동으로 PDF로 변환
      if (isImageFile(document.file)) {
        const pdfFile = await convertImageToPdf(document.file);
        const baseName = (document.originalFileName || document.name).replace(/\.[^/.]+$/, '');
        document = {
          ...document,
          file: pdfFile,
          originalFileName: `${baseName}.pdf`,
        };
      }

      const originalNameForStorage = document.originalFileName || document.name;
      const filePath = sanitizeFileName(originalNameForStorage);

      const originalLower = (originalNameForStorage || '').toLowerCase();
      const fileExt = originalLower.includes('.') ? originalLower.split('.').pop() : undefined;

      const { error: storageError } = await r2Storage.upload(filePath, document.file);

      if (storageError) {
        throw storageError;
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: document.name, // name을 title로 매핑
          parent_category_id: document.parentCategoryId,
          subcategory_id: document.subcategoryId,
          department_id: document.departmentId,
          company_id: useAuthStore.getState().user?.companyId ?? null, // 플랜 제한 체크의 기준 (미기록 시 제한 무력화)
          file_path: filePath,
          file_size: document.file.size,
          ocr_text: document.ocrText || null, // OCR 텍스트
          uploaded_by: useAuthStore.getState().user?.id ?? null,
          is_classified: document.classified ?? false, // classified를 is_classified로 매핑
          uploaded_at: new Date().toISOString(), // 클라이언트 현재 시간을 ISO 형식으로 전송 (타임존 정보 포함)
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const parentCategoryIdFromDbRaw = (data as any)
          .parent_category_id as string | null;
        const subcategoryIdFromDbRaw = (data as any)
          .subcategory_id as string | null;

        const parentCategoryIdFromDb =
          parentCategoryIdFromDbRaw ?? document.parentCategoryId;
        const subcategoryIdFromDb =
          subcategoryIdFromDbRaw ?? document.subcategoryId;

        const { departments, parentCategories, subcategories } = get();

        const department = departments.find(
          (d) => d.id === data.department_id,
        );
        const parentCategory = parentCategories.find(
          (p) => p.id === parentCategoryIdFromDb,
        );
        const subcategory = subcategories.find(
          (s) => s.id === subcategoryIdFromDb,
        );

        let fileUrl = '#';

        try {
          const { data: publicUrlData } = r2Storage.getPublicUrl(data.file_path);

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
              parentCategoryId: parentCategoryIdFromDb,
              subcategoryId: subcategoryIdFromDb,
              departmentId: data.department_id,
              uploadDate: data.uploaded_at, // uploaded_at을 uploadDate로 매핑
              uploader: useAuthStore.getState().user?.name || '', // 업로드한 본인의 이름 표시
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
            departmentName: department?.name ?? null,
            parentCategoryId: parentCategoryIdFromDb,
            parentCategoryName: parentCategory?.name ?? null,
            subcategoryId: subcategoryIdFromDb,
            subcategoryName: subcategory?.name ?? null,
          });
          void get().refreshStorageStatus();
        }

        trackEvent('document_upload', {
          document_id: data.id,
          department_id: data.department_id,
          parent_category_id: parentCategoryIdFromDb,
          subcategory_id: subcategoryIdFromDb,
          file_size: document.file.size,
          file_ext: fileExt,
          has_ocr_text: !!document.ocrText,
        });
      }
    } catch (err) {
      console.error('Failed to upload document to Supabase:', err);

      // 플랜 제한으로 차단된 경우: 로컬 폴백 추가 없이 중단
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('LIMIT_REACHED')) {
        // DB 트리거에서 차단된 경우(사전 체크 통과 후)에는 여기서 안내
        if (errMsg !== 'PLAN_DOCUMENT_LIMIT_REACHED' && errMsg !== 'PLAN_STORAGE_LIMIT_REACHED') {
          toast({
            title: '문서 업로드 제한',
            description: '현재 플랜의 한도에 도달했습니다. 플랜을 업그레이드해주세요.',
            variant: 'destructive',
          });
        }
        return;
      }

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
      // Soft delete: deleted_at 설정
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // 로컬 상태에서 제거 (휴지통으로 이동)
      const deletedDoc = get().documents.find((doc) => doc.id === id);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        trashedDocuments: deletedDoc 
          ? [{ ...deletedDoc, deletedAt: new Date().toISOString() }, ...state.trashedDocuments]
          : state.trashedDocuments,
      }));

      trackEvent('document_move_to_trash', {
        document_id: id,
      });

      toast({
        title: '휴지통으로 이동',
        description: '문서가 휴지통으로 이동되었습니다.',
      });
    } catch (err) {
      console.error('Failed to move document to trash:', err);

      toast({
        title: '삭제 실패',
        description: '문서를 휴지통으로 이동하지 못했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
      
      throw err;
    }
  },

  restoreDocument: async (id) => {
    try {
      // ★ 복구도 "문서 추가"이므로 플랜 제한 체크
      const { user } = useAuthStore.getState();
      if (user?.companyId) {
        const limitCheck = await checkDocumentLimit(user.companyId);
        if (!limitCheck.allowed) {
          toast({
            title: '문서 복구 제한',
            description: `현재 플랜의 문서 한도(${limitCheck.limit}개)에 도달했습니다. 다른 문서를 삭제하거나 플랜을 업그레이드하세요.`,
            variant: 'destructive',
          });
          throw new Error('PLAN_DOCUMENT_LIMIT_REACHED');
        }
      }

      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      // 휴지통에서 문서 목록으로 복구
      const restoredDoc = get().trashedDocuments.find((doc) => doc.id === id);
      set((state) => ({
        trashedDocuments: state.trashedDocuments.filter((doc) => doc.id !== id),
        documents: restoredDoc
          ? [{ ...restoredDoc, deletedAt: null }, ...state.documents]
          : state.documents,
      }));

      trackEvent('document_restore', {
        document_id: id,
      });

      toast({
        title: '문서 복구 완료',
        description: '문서가 복구되었습니다.',
      });
    } catch (err) {
      console.error('Failed to restore document:', err);

      toast({
        title: '복구 실패',
        description: '문서를 복구하지 못했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
      
      throw err;
    }
  },

  permanentlyDeleteDocument: async (id) => {
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

      // 스토리지에서 파일 삭제
      if (filePath) {
        const { error: storageError } = await r2Storage.remove([filePath]);

        if (storageError) {
          console.error('Failed to delete file from storage:', storageError);
        }
      }

      // DB에서 영구 삭제
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        trashedDocuments: state.trashedDocuments.filter((doc) => doc.id !== id),
      }));

      trackEvent('document_permanent_delete', {
        document_id: id,
      });

      toast({
        title: '영구 삭제 완료',
        description: '문서가 영구적으로 삭제되었습니다.',
      });
    } catch (err) {
      console.error('Failed to permanently delete document:', err);

      toast({
        title: '영구 삭제 실패',
        description: '문서를 삭제하지 못했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
      
      throw err;
    }
  },

  emptyTrash: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user?.companyId) return;

      const { data: deptData } = await supabase
        .from('departments')
        .select('id')
        .eq('company_id', user.companyId);

      const deptIds = (deptData || []).map((d: { id: string }) => d.id);
      if (deptIds.length === 0) return;

      // 휴지통에 있는 모든 문서의 파일 경로 조회
      const { data: trashedDocs } = await supabase
        .from('documents')
        .select('id, file_path')
        .in('department_id', deptIds)
        .not('deleted_at', 'is', null);

      if (trashedDocs && trashedDocs.length > 0) {
        // 스토리지에서 파일들 삭제
        const filePaths = trashedDocs
          .map((doc: any) => doc.file_path)
          .filter((path: string | null) => path);
        
        if (filePaths.length > 0) {
          await r2Storage.remove(filePaths);
        }

        // DB에서 영구 삭제
        const docIds = trashedDocs.map((doc: any) => doc.id);
        await supabase
          .from('documents')
          .delete()
          .in('id', docIds);
      }

      set({ trashedDocuments: [] });

      trackEvent('trash_empty', {
        count: trashedDocs?.length || 0,
      });

      toast({
        title: '휴지통 비우기 완료',
        description: '모든 문서가 영구적으로 삭제되었습니다.',
      });
    } catch (err) {
      console.error('Failed to empty trash:', err);

      toast({
        title: '휴지통 비우기 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      });
      
      throw err;
    }
  },

  updateDocumentOcrText: async (id, ocrText) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ ocr_text: ocrText })
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, ocrText } : doc
        ),
      }));

      toast({
        title: 'OCR 텍스트 저장 완료',
        description: '편집한 OCR 텍스트가 저장되었습니다.',
      });

      trackEvent('document_ocr_update', {
        document_id: id,
        ocr_length: ocrText?.length ?? 0,
      });
    } catch (err) {
      console.error('Failed to update OCR text:', err);


      toast({
        title: 'OCR 텍스트 저장 실패',
        description: '네트워크 오류로 인해 저장하지 못했습니다.',
        variant: 'destructive',
      });
      throw err;
    }
  },

  updateDocumentFile: async (id, file, ocrText) => {
    try {
      // 이미지 파일이면 자동으로 PDF로 변환
      if (isImageFile(file)) {
        file = await convertImageToPdf(file);
      }

      // 1. 기존 문서 정보 조회
      const { data: existingDoc, error: fetchError } = await supabase
        .from('documents')
        .select('file_path, title, parent_category_id, subcategory_id, department_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingDoc) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // 2. 기존 파일 삭제
      if (existingDoc.file_path) {
        await r2Storage.remove([existingDoc.file_path]);
      }

      // 3. 새 파일 업로드
      const newFilePath = sanitizeFileName(file.name);
      const { error: storageError } = await r2Storage.upload(newFilePath, file);

      if (storageError) {
        throw storageError;
      }

      // 4. DB 업데이트
      const updateData: any = {
        file_path: newFilePath,
        file_size: file.size,
      };

      if (ocrText !== undefined) {
        updateData.ocr_text = ocrText;
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // 6. 로컬 상태 업데이트
      let fileUrl = '#';
      try {
        const { data: publicUrlData } = r2Storage.getPublicUrl(newFilePath);

        if (publicUrlData?.publicUrl) {
          fileUrl = publicUrlData.publicUrl;
        }
      } catch {
        fileUrl = '#';
      }

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                fileUrl,
                ocrText: ocrText !== undefined ? ocrText : doc.ocrText,
              }
            : doc
        ),
      }));

      toast({
        title: '파일 업데이트 완료',
        description: '문서 파일이 성공적으로 교체되었습니다.',
      });

      trackEvent('document_file_update', {
        document_id: id,
        file_size: file.size,
        has_ocr_text: !!ocrText,
      });
    } catch (err) {
      console.error('Failed to update document file:', err);
      toast({
        title: '파일 업데이트 실패',
        description: '파일 교체 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      throw err;
    }
  },

  checkPermission: async (userId, departmentId, action) => {
    try {
      // 0. 사용자 정보 조회하여 소속 부서 확인
      const { user } = useAuthStore.getState();
      const userDepartmentId = user?.departmentId || null;

      // 1. 소속 부서는 자동 manager 권한 (null === null 오탐 방지)
      if (userDepartmentId !== null && userDepartmentId === departmentId) {
        const managerPermissions = ['read', 'download', 'print', 'write', 'upload', 'delete', 'share'];
        return managerPermissions.includes(action);
      }

      // 2. 다른 부서는 DB 조회
      const { data, error } = await supabase
        .from('user_permissions')
        .select('role')
        .eq('user_id', userId)
        .eq('department_id', departmentId)
        .single();

      if (error || !data) {
        return false;
      }

      const role = data.role as 'none' | 'viewer' | 'editor' | 'manager';

      // 3. 역할별 권한 매핑
      const permissions: Record<string, string[]> = {
        none: [],
        viewer: ['read', 'download', 'print'],
        editor: ['read', 'download', 'print', 'write', 'upload'],
        manager: ['read', 'download', 'print', 'write', 'upload', 'delete', 'share'],
      };

      return permissions[role].includes(action);
    } catch (error) {
      console.error('권한 체크 오류:', error);
      return false;
    }
  },

  fetchSharedDocuments: async () => {
    startLoading(set);
    set({ error: null });
    try {
      const { user } = useAuthStore.getState();

      if (!user?.id) {
        set({ sharedDocuments: [] });
        return;
      }

      // 1. shared_documents 조회
      const { data, error } = await supabase
        .from('shared_documents')
        .select('*')
        .eq('shared_to_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const { departments, parentCategories } = get();
        
        // 2. 관련 document_id들 추출
        const documentIds = [...new Set(data.map((s: any) => s.document_id))];
        const sharedByUserIds = [...new Set(data.map((s: any) => s.shared_by_user_id))];
        
        // 3. documents 조회
        const { data: docsData } = await supabase
          .from('documents')
          .select('id, title, department_id, parent_category_id')
          .in('id', documentIds);
        
        // 4. users 조회 (공유한 사람들)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', sharedByUserIds);
        
        const docsMap = new Map((docsData || []).map((d: any) => [d.id, d]));
        const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));
        
        const sharedDocuments: SharedDocument[] = data.map((share: any) => {
          const doc = docsMap.get(share.document_id) as any;
          const sharedByUser = usersMap.get(share.shared_by_user_id) as any;
          const department = departments.find(d => d.id === doc?.department_id);
          const category = parentCategories.find(c => c.id === doc?.parent_category_id);
          
          return {
            id: share.id,
            documentId: share.document_id,
            sharedByUserId: share.shared_by_user_id,
            sharedToUserId: share.shared_to_user_id,
            permission: share.permission,
            message: share.message || undefined,
            sharedAt: share.shared_at,
            isActive: share.is_active,
            documentName: doc?.title || '알 수 없는 문서',
            sharedByUserName: sharedByUser?.name || '알 수 없음',
            departmentName: department?.name || '',
            categoryName: category?.name || '',
          };
        });
        
        set({ sharedDocuments });
      } else {
        set({ sharedDocuments: [] });
      }
    } catch (err) {
      console.error('Failed to fetch shared documents:', err);
      toast({
        title: '공유 문서를 불러오지 못했습니다.',
        description: '나중에 다시 시도해 주세요.',
        variant: 'destructive',
      });
      set({ sharedDocuments: [], error: null });
    } finally {
      endLoading(set);
    }
  },

  shareDocument: async (documentId, sharedToUserId, permission, message) => {
    try {
      const { user } = useAuthStore.getState();
      
      if (!user?.id) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data: existing } = await supabase
        .from('shared_documents')
        .select('id')
        .eq('document_id', documentId)
        .eq('shared_by_user_id', user.id)
        .eq('shared_to_user_id', sharedToUserId)
        .eq('is_active', true)
        .single();

      if (existing) {
        trackEvent('document_share_duplicate', {
          document_id: documentId,
          permission,
        });
        toast({
          title: '이미 공유된 문서입니다.',
          description: '해당 사용자에게 이미 이 문서를 공유했습니다.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('shared_documents')
        .insert({
          document_id: documentId,
          shared_by_user_id: user.id,
          shared_to_user_id: sharedToUserId,
          permission,
          message,
        });

      if (error) throw error;

      // 공유받은 사람에게 알림 생성
      if (user.companyId) {
        // 문서 제목 조회
        const { data: docData } = await supabase
          .from('documents')
          .select('title')
          .eq('id', documentId)
          .single();

        await createShareNotification({
          documentId,
          documentTitle: docData?.title || '문서',
          sharedByUserName: user.name || '알 수 없음',
          targetUserId: sharedToUserId,
          companyId: user.companyId,
        });
      }

      toast({
        title: '문서가 공유되었습니다.',
        description: '상대방이 공유받은 문서함에서 확인할 수 있습니다.',
      });

      trackEvent('document_share', {
        document_id: documentId,
        permission,
        has_message: !!message,
      });
    } catch (err) {
      console.error('Failed to share document:', err);


      toast({
        title: '문서 공유 실패',
        description: '문서를 공유하지 못했습니다.',
        variant: 'destructive',
      });
    }
  },

  unshareDocument: async (shareId) => {
    try {
      // 먼저 공유 정보 조회 (알림 삭제를 위해)
      const { data: shareData } = await supabase
        .from('shared_documents')
        .select('document_id, shared_to_user_id')
        .eq('id', shareId)
        .single();

      const { error } = await supabase
        .from('shared_documents')
        .update({ is_active: false })
        .eq('id', shareId);

      if (error) throw error;

      // 해당 공유 알림 삭제
      if (shareData) {
        await deleteShareNotification({
          documentId: shareData.document_id,
          targetUserId: shareData.shared_to_user_id,
        });
      }

      set((state) => ({
        sharedDocuments: state.sharedDocuments.filter(s => s.id !== shareId),
      }));

      toast({
        title: '공유가 취소되었습니다.',
      });

      trackEvent('document_unshare', {
        share_id: shareId,
        document_id: (shareData as any)?.document_id,
      });
    } catch (err) {
      console.error('Failed to unshare document:', err);


      toast({
        title: '공유 취소 실패',
        description: '나중에 다시 시도해 주세요.',
        variant: 'destructive',
      });
    }
  },
}));
