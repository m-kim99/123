import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Upload,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  CalendarIcon,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import type { Subcategory } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { extractText } from '@/lib/ocr';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeSimple } from '@/lib/utils';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { createDocumentNotification } from '@/lib/notifications';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { PdfViewer } from '@/components/PdfViewer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function splitFilesByType(files: File[]) {
  const pdfFiles: File[] = [];
  const imageFiles: File[] = [];

  files.forEach((file) => {
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (isPdf) {
      pdfFiles.push(file);
    } else if (isImage) {
      imageFiles.push(file);
    }
  });

  return { pdfFiles, imageFiles };
}

function getBaseNameWithoutExt(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName;
  return fileName.slice(0, lastDot);
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지 데이터를 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'));
    };
    reader.readAsDataURL(file);
  });
}

export function DocumentManagement() {
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const documents = useDocumentStore((state) => state.documents);
  
  // 세부 카테고리 로딩 상태 (페이지 진입 시 전체 데이터 재조회 중)
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
  // 팀원용: 권한 있는 부서 ID 목록
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);
  // 함수는 한 번에 가져오기 (참조 안정적)
  const {
    addSubcategory,
    fetchSubcategories,
    uploadDocument,
    fetchDocuments,
    updateSubcategory,
    deleteSubcategory,
    registerNfcTag,
    findSubcategoryByNfcUid,
    clearNfcByUid,
  } = useDocumentStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const primaryColor = '#2563eb';

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    departmentId: '',
    parentCategoryId: '',
    storageLocation: '',
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    defaultExpiryDays: null as number | null,
  });
  const [editCategoryNameError, setEditCategoryNameError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSelection, setUploadSelection] = useState({
    departmentId: '',
    parentCategoryId: '',
    subcategoryId: '',
  });
  const [documentTitle, setDocumentTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [ocrTextPreview, setOcrTextPreview] = useState('');
  const [fileStatuses, setFileStatuses] = useState<
    { name: string; status: string; error?: string | null }[]
  >([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<
    | {
        id: string;
        title: string;
        url: string;
        type: 'image' | 'pdf' | 'other';
      }
    | null
  >(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageZoom, setImageZoom] = useState(100); // 확대/축소 %
  const [imageRotation, setImageRotation] = useState(0); // 회전 각도

  const [activeTab, setActiveTab] = useState<'categories' | 'documents' | 'upload'>('categories');
  const [searchQuery, setSearchQuery] = useState('');

  // NFC 재등록 확인 다이얼로그 상태
  const [nfcConfirmDialogOpen, setNfcConfirmDialogOpen] = useState(false);
  const [pendingNfcUid, setPendingNfcUid] = useState<string | null>(null);
  const [pendingNfcSubcategoryId, setPendingNfcSubcategoryId] = useState<string | null>(null);
  const [existingNfcSubcategory, setExistingNfcSubcategory] = useState<{ id: string; name: string } | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '1month' | '3months'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'name'>('latest');
  const [categoryFilter, setCategoryFilter] = useState({
    departmentId: 'all',
    parentCategoryId: 'all',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const [documentsPage, setDocumentsPage] = useState(1);
  const DOCUMENTS_PER_PAGE = 20;

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawQuery = (searchParams.get('q') || '').trim();
  const searchKeyword = rawQuery.toLowerCase();

  const filteredParentCategoriesForFilter = useMemo(
    () =>
      parentCategories.filter((pc) => {
        if (!isAdmin && user?.departmentId && pc.departmentId !== user.departmentId) {
          return false;
        }
        if (categoryFilter.departmentId !== 'all' && pc.departmentId !== categoryFilter.departmentId) {
          return false;
        }
        return true;
      }),
    [parentCategories, isAdmin, user?.departmentId, categoryFilter.departmentId],
  );

  const filteredSubcategoriesForCategoriesTab = useMemo(
    () =>
      subcategories.filter((sub) => {
        if (!isAdmin && user?.departmentId && sub.departmentId !== user.departmentId) {
          return false;
        }
        if (categoryFilter.departmentId !== 'all' && sub.departmentId !== categoryFilter.departmentId) {
          return false;
        }
        if (categoryFilter.parentCategoryId !== 'all' && sub.parentCategoryId !== categoryFilter.parentCategoryId) {
          return false;
        }
        return true;
      }),
    [
      subcategories,
      isAdmin,
      user?.departmentId,
      categoryFilter.departmentId,
      categoryFilter.parentCategoryId,
    ],
  );

  const paginatedSubcategories = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredSubcategoriesForCategoriesTab.slice(startIndex, endIndex);
  }, [filteredSubcategoriesForCategoriesTab, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubcategoriesForCategoriesTab.length / ITEMS_PER_PAGE),
  );
  const startItem =
    filteredSubcategoriesForCategoriesTab.length === 0
      ? 0
      : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(
    currentPage * ITEMS_PER_PAGE,
    filteredSubcategoriesForCategoriesTab.length,
  );

  const filteredDocuments = useMemo(() => {
    const allowedDepartmentIds = new Set(departments.map((d) => d.id));

    const companyFilteredDocuments = documents.filter((d) =>
      allowedDepartmentIds.has(d.departmentId)
    );

    let result = isAdmin
      ? companyFilteredDocuments
      : companyFilteredDocuments.filter((d) => d.departmentId === user?.departmentId);

    if (searchKeyword) {
      const keyword = searchKeyword;
      result = result.filter((doc) => {
        const titleMatch = doc.name.toLowerCase().includes(keyword);
        const parentCategory = parentCategories.find(
          (pc) => pc.id === doc.parentCategoryId
        );
        const subcategory = subcategories.find(
          (s) => s.id === doc.subcategoryId
        );
        const department = departments.find((d) => d.id === doc.departmentId);
        const parentCategoryName = (parentCategory?.name || '').toLowerCase();
        const subcategoryName = (subcategory?.name || '').toLowerCase();
        const departmentName = (department?.name || '').toLowerCase();
        const ocrMatch = (doc.ocrText || '').toLowerCase().includes(keyword);

        return (
          titleMatch ||
          parentCategoryName.includes(keyword) ||
          subcategoryName.includes(keyword) ||
          departmentName.includes(keyword) ||
          ocrMatch
        );
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((doc) => {
        const name = doc.name || '';
        const uploader = doc.uploader || '';
        const parentCategory = parentCategories.find(
          (pc) => pc.id === doc.parentCategoryId
        );
        const subcategory = subcategories.find(
          (s) => s.id === doc.subcategoryId
        );
        const department = departments.find((d) => d.id === doc.departmentId);
        const parentCategoryName = (parentCategory?.name || '').toLowerCase();
        const subcategoryName = (subcategory?.name || '').toLowerCase();
        const departmentName = (department?.name || '').toLowerCase();

        return (
          name.toLowerCase().includes(query) ||
          uploader.toLowerCase().includes(query) ||
          parentCategoryName.includes(query) ||
          subcategoryName.includes(query) ||
          departmentName.includes(query)
        );
      });
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === '7days') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === '1month') {
        filterDate.setMonth(now.getMonth() - 1);
      } else if (dateFilter === '3months') {
        filterDate.setMonth(now.getMonth() - 3);
      }

      result = result.filter((doc) => {
        const docDate = new Date(doc.uploadDate);
        if (Number.isNaN(docDate.getTime())) {
          return false;
        }
        return docDate >= filterDate;
      });
    }

    const sorted = [...result];

    sorted.sort((a, b) => {
      if (sortBy === 'latest') {
        return (
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        );
      }
      if (sortBy === 'oldest') {
        return (
          new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
        );
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return sorted;
  }, [
    parentCategories,
    subcategories,
    dateFilter,
    departments,
    documents,
    isAdmin,
    searchKeyword,
    searchQuery,
    sortBy,
    user?.departmentId,
  ]);

  const paginatedDocuments = useMemo(() => {
    const startIndex = (documentsPage - 1) * DOCUMENTS_PER_PAGE;
    const endIndex = startIndex + DOCUMENTS_PER_PAGE;
    return filteredDocuments.slice(startIndex, endIndex);
  }, [filteredDocuments, documentsPage]);

  const totalDocPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE));
  const docStartItem =
    filteredDocuments.length === 0
      ? 0
      : (documentsPage - 1) * DOCUMENTS_PER_PAGE + 1;
  const docEndItem = Math.min(
    documentsPage * DOCUMENTS_PER_PAGE,
    filteredDocuments.length,
  );

  const uploadDepartments = useMemo(
    () => departments.filter((d) => accessibleDepartmentIds.includes(d.id)),
    [departments, accessibleDepartmentIds]
  );

  const uploadParentCategories = useMemo(
    () =>
      parentCategories.filter((pc) =>
        uploadSelection.departmentId
          ? pc.departmentId === uploadSelection.departmentId
          : true
      ),
    [parentCategories, uploadSelection.departmentId]
  );

  const uploadSubcategories = useMemo(
    () =>
      subcategories.filter((sub) => {
        if (
          uploadSelection.departmentId &&
          sub.departmentId !== uploadSelection.departmentId
        ) {
          return false;
        }
        if (
          uploadSelection.parentCategoryId &&
          sub.parentCategoryId !== uploadSelection.parentCategoryId
        ) {
          return false;
        }
        return true;
      }),
    [subcategories, uploadSelection.departmentId, uploadSelection.parentCategoryId]
  );

  const { pdfFiles: selectedPdfFiles, imageFiles: selectedImageFiles } =
    splitFilesByType(uploadFiles);
  const canEditTitle =
    selectedPdfFiles.length + (selectedImageFiles.length > 0 ? 1 : 0) === 1;

  const deletingSubcategory = deletingCategoryId
    ? subcategories.find((s) => s.id === deletingCategoryId)
    : null;
  const deletingCategoryDocCount = deletingSubcategory?.documentCount ?? 0;

  // 페이지 진입 시 전체 세부 카테고리 재조회 (상세 페이지에서 필터링된 상태 복구)
  useEffect(() => {
    setIsLoadingSubcategories(true);
    // Zustand actions는 안정적이므로 getState()로 직접 호출
    useDocumentStore.getState().fetchSubcategories().finally(() => {
      setIsLoadingSubcategories(false);
    });
  }, []);

  // 팀원용: 권한 있는 부서 목록 조회
  useEffect(() => {
    const fetchAccessibleDepartments = async () => {
      if (isAdmin || !user?.id) {
        // 관리자는 모든 부서 접근 가능
        setAccessibleDepartmentIds(departments.map((d) => d.id));
        return;
      }

      // 1. 소속 부서는 자동 접근 가능
      const ownDeptId = user.departmentId;

      // 2. 추가 권한 부여된 부서 조회 (role이 none이 아닌 경우)
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('department_id')
        .eq('user_id', user.id)
        .neq('role', 'none');

      const permDeptIds = permissionData?.map((p: any) => p.department_id) || [];
      const allIds = new Set<string>([
        ...(ownDeptId ? [ownDeptId] : []),
        ...permDeptIds,
      ]);

      setAccessibleDepartmentIds(Array.from(allIds));
    };

    fetchAccessibleDepartments();
  }, [isAdmin, user?.id, user?.departmentId, departments]);

  useEffect(() => {
    if (searchKeyword) {
      setActiveTab('documents');
    }
  }, [searchKeyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter.departmentId, categoryFilter.parentCategoryId]);

  useEffect(() => {
    setDocumentsPage(1);
  }, [searchQuery, dateFilter, sortBy]);
 
  useEffect(() => {
    // URL 파라미터에서 카테고리/세부 카테고리 정보 읽기 (레거시 및 호환용)
    const params = new URLSearchParams(location.search);
    const categoryId = params.get('category');
    const categoryName = params.get('name');
    const subcategoryId = params.get('subcategory');

    if (subcategoryId) {
      const sub = subcategories.find((s) => s.id === subcategoryId);
      if (sub) {
        setUploadSelection({
          departmentId: sub.departmentId,
          parentCategoryId: sub.parentCategoryId,
          subcategoryId: sub.id,
        });

        if (categoryName) {
          toast({
            title: '✅ NFC 태그 인식',
            description: `"${categoryName}" 세부 카테고리가 선택되었습니다`,
          });
        }

        setActiveTab('upload');
        window.history.replaceState({}, '', location.pathname);
        return;
      }
    }

    if (categoryId && categoryName) {
      // 레거시: 카테고리 ID만 전달된 경우, 해당 대분류 및 첫 세부 카테고리를 선택
      const parent = parentCategories.find((pc) => pc.id === categoryId);
      const sub = subcategories.find((s) => s.parentCategoryId === categoryId);

      if (parent) {
        setUploadSelection({
          departmentId: parent.departmentId,
          parentCategoryId: parent.id,
          subcategoryId: sub?.id || '',
        });

        toast({
          title: '✅ NFC 태그 인식',
          description: `"${categoryName}" 대분류가 선택되었습니다`,
        });

        setActiveTab('upload');
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [location.search, parentCategories, subcategories]);

  const newCategoryParentOptions = useMemo(
    () =>
      newCategory.departmentId
        ? parentCategories.filter((pc) => pc.departmentId === newCategory.departmentId)
        : [],
    [parentCategories, newCategory.departmentId],
  );

  const handleAddCategory = () => {
    if (
      !newCategory.name.trim() ||
      !newCategory.departmentId ||
      !newCategory.parentCategoryId
    ) {
      return;
    }

    addSubcategory({
      name: newCategory.name.trim(),
      description: newCategory.description,
      departmentId: newCategory.departmentId,
      parentCategoryId: newCategory.parentCategoryId,
      storageLocation: newCategory.storageLocation,
      nfcRegistered: false,
      nfcUid: null,
    }).then(() => {
      fetchSubcategories();
    });

    setNewCategory({
      name: '',
      description: '',
      departmentId: '',
      parentCategoryId: '',
      storageLocation: '',
    });
  };

  const handleAddCategoryWithNfc = async () => {
    if (
      !newCategory.name.trim() ||
      !newCategory.departmentId ||
      !newCategory.parentCategoryId
    ) {
      return;
    }

    try {
      const created = await addSubcategory({
        name: newCategory.name.trim(),
        description: newCategory.description,
        departmentId: newCategory.departmentId,
        parentCategoryId: newCategory.parentCategoryId,
        storageLocation: newCategory.storageLocation,
        nfcRegistered: false,
        nfcUid: null,
      });

      if (!created) {
        toast({
          title: '세부 카테고리 생성 실패',
          description: '세부 카테고리를 생성하지 못해 NFC를 등록할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      const uid = await readNFCUid();

      // 이 UID가 이미 등록된 태그인지 확인
      const existingSub = await findSubcategoryByNfcUid(uid);

      if (existingSub) {
        // 이미 등록된 태그 → 확인 다이얼로그 띄우기
        setPendingNfcUid(uid);
        setPendingNfcSubcategoryId(created.id);
        setExistingNfcSubcategory({ id: existingSub.id, name: existingSub.name });
        setNfcConfirmDialogOpen(true);
        return;
      }

      // 등록된 적 없는 태그 → 바로 등록 진행
      await proceedNfcRegistration(uid, created.id);

      setNewCategory({
        name: '',
        description: '',
        departmentId: '',
        parentCategoryId: '',
        storageLocation: '',
      });
    } catch (error: any) {
      console.error('세부 카테고리 생성 및 NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || '세부 카테고리 생성 또는 NFC 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
    }
  };

  const proceedNfcRegistration = async (uid: string, subcategoryId: string) => {
    try {
      const targetSub = subcategories.find((s) => s.id === subcategoryId);
      if (!targetSub) {
        // 새로 생성된 경우 DB에서 조회
        const { data } = await supabase
          .from('subcategories')
          .select('id, name')
          .eq('id', subcategoryId)
          .single();
        if (!data) {
          throw new Error('세부 카테고리를 찾을 수 없습니다.');
        }
      }

      // 기존에 이 UID를 쓰던 모든 세부 카테고리에서 NFC 정보 해제
      await clearNfcByUid(uid, subcategoryId);

      // NFC 태그에 세부 카테고리용 URL을 쓴다
      const subName = targetSub?.name || subcategoryId;
      await writeNFCUrl(subcategoryId, subName);

      // 세부 카테고리 테이블에 UID 및 등록 여부 반영
      await registerNfcTag(subcategoryId, uid);

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 카테고리가 등록되었습니다.',
      });

      await fetchSubcategories();

      // 상태 초기화
      setPendingNfcUid(null);
      setPendingNfcSubcategoryId(null);
      setExistingNfcSubcategory(null);
      setNfcConfirmDialogOpen(false);
      setNfcMode('idle'); // NFC 등록 완료 후 모드 초기화
    } catch (error: any) {
      console.error('NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || 'NFC 태그를 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setNfcMode('idle'); // 에러 시 모드 초기화
    }
  };

  const handleNfcConfirmYes = async () => {
    if (!pendingNfcUid || !pendingNfcSubcategoryId) return;
    await proceedNfcRegistration(pendingNfcUid, pendingNfcSubcategoryId);
    setNewCategory({
      name: '',
      description: '',
      departmentId: '',
      parentCategoryId: '',
      storageLocation: '',
    });
  };

  const handleNfcConfirmNo = () => {
    setPendingNfcUid(null);
    setPendingNfcSubcategoryId(null);
    setExistingNfcSubcategory(null);
    setNfcConfirmDialogOpen(false);
    setNfcMode('idle'); // 취소 시 모드 초기화
  };

  const handleOpenEditDialog = (subcategory: Subcategory) => {
    setEditingCategoryId(subcategory.id);
    setEditCategoryForm({
      name: subcategory.name || '',
      description: subcategory.description || '',
      storageLocation: subcategory.storageLocation || '',
      defaultExpiryDays: subcategory.defaultExpiryDays || null,
    });
    setEditCategoryNameError('');
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingCategoryId(null);
    setEditCategoryNameError('');
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId) {
      return;
    }

    const trimmedName = editCategoryForm.name.trim();
    if (!trimmedName) {
      setEditCategoryNameError('이름을 입력하세요');
      return;
    }

    setIsSavingCategory(true);
    setEditCategoryNameError('');

    try {
      await updateSubcategory(editingCategoryId, {
        name: trimmedName,
        description: editCategoryForm.description,
        storageLocation: editCategoryForm.storageLocation,
        defaultExpiryDays: editCategoryForm.defaultExpiryDays,
      });

      toast({
        title: '수정 완료',
        description: '세부 카테고리가 성공적으로 수정되었습니다.',
      });

      handleCloseEditDialog();
    } catch (error) {
      console.error('세부 카테고리 수정 실패:', error);
      toast({
        title: '수정 실패',
        description: '세부 카테고리를 수정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleOpenDeleteDialog = (subcategory: Subcategory) => {
    setDeletingCategoryId(subcategory.id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingCategoryId(null);
    setIsDeletingCategory(false);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategoryId) {
      return;
    }

    setIsDeletingCategory(true);

    try {
      await deleteSubcategory(deletingCategoryId);

      toast({
        title: '삭제 완료',
        description: '세부 카테고리가 삭제되었습니다.',
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('세부 카테고리 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '세부 카테고리를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setIsDeletingCategory(false);
    }
  };

  const handleOpenPreviewDocument = async (documentId: string) => {
    try {
      setPreviewLoading(true);

      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: publicData } = supabase.storage
        .from('123')
        .getPublicUrl(data.file_path);

      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        throw new Error('파일 URL을 생성할 수 없습니다.');
      }

      const lowerPath = data.file_path.toLowerCase();
      let type: 'image' | 'pdf' | 'other' = 'other';

      if (lowerPath.endsWith('.pdf')) {
        type = 'pdf';
      } else if (
        lowerPath.endsWith('.jpg') ||
        lowerPath.endsWith('.jpeg') ||
        lowerPath.endsWith('.png')
      ) {
        type = 'image';
      }

      setPreviewDoc({
        id: documentId,
        title: data.title,
        url: publicUrl,
        type,
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error('문서 미리보기 로드 실패:', error);
      toast({
        title: '문서를 불러오지 못했습니다.',
        description: '문서 미리보기를 여는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('file_path, title')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('123')
        .download(data.file_path);

      if (downloadError || !fileData) {
        throw downloadError || new Error('파일을 다운로드할 수 없습니다.');
      }

      const blob = fileData as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.title || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('문서 다운로드 실패:', error);
      toast({
        title: '다운로드 실패',
        description: '문서를 다운로드하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDocumentClick = async (documentId: string) => {
    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;

    const targetDoc = documents.find((d) => d.id === documentId);

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (error) {
        throw error;
      }

      const filePath = data?.file_path as string | undefined;

      if (!filePath) {
        console.error('파일 경로가 없습니다');
      } else {
        const { error: storageError } = await supabase.storage
          .from('123')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage 삭제 실패:', storageError);
        }
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      await fetchDocuments();

      toast({
        title: '삭제 완료',
        description: '문서가 삭제되었습니다.',
      });

      if (user?.companyId && targetDoc) {
        const department = departments.find(
          (d) => d.id === targetDoc.departmentId,
        );
        const parentCategoryForDoc = parentCategories.find(
          (pc) => pc.id === targetDoc.parentCategoryId,
        );
        const subcategoryForDoc = subcategories.find(
          (s) => s.id === targetDoc.subcategoryId,
        );

        await createDocumentNotification({
          type: 'document_deleted',
          documentId,
          title: targetDoc.name,
          companyId: user.companyId,
          departmentId: targetDoc.departmentId,
          departmentName: department?.name ?? null,
          parentCategoryId: targetDoc.parentCategoryId,
          parentCategoryName: parentCategoryForDoc?.name ?? null,
          subcategoryId: targetDoc.subcategoryId,
          subcategoryName: subcategoryForDoc?.name ?? null,
        });
      }
    } catch (error) {
      console.error('문서 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '문서를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleFileDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) {
      return;
    }

    const validFiles = acceptedFiles.filter((file) => {
      const lowerName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png');

      return isPdf || isImage;
    });

    if (validFiles.length === 0) {
      setUploadError('PDF, JPG, PNG 파일만 업로드 가능합니다.');
      setUploadFiles([]);
      setFileStatuses([]);
      return;
    }

    setUploadFiles(validFiles);
    setUploadError(null);
    setUploadSuccess(false);
    setOcrTextPreview('');

    const { pdfFiles, imageFiles } = splitFilesByType(validFiles);

    // 문서 제목 기본값 설정 (단일 문서인 경우에만 사용)
    if (imageFiles.length > 0 && pdfFiles.length === 0) {
      setDocumentTitle(getBaseNameWithoutExt(imageFiles[0].name));
    } else if (pdfFiles.length === 1 && imageFiles.length === 0) {
      setDocumentTitle(getBaseNameWithoutExt(pdfFiles[0].name));
    } else {
      setDocumentTitle('');
    }

    setFileStatuses(
      validFiles.map((file) => ({
        name: file.name,
        status: '대기 중',
        error: null,
      })),
    );

    if (imageFiles.length > 0 && pdfFiles.length === 0 && imageFiles.length > 1) {
      setUploadStatus(`${imageFiles.length}개 이미지를 하나의 문서로 업로드합니다.`);
    } else if (imageFiles.length > 0 && pdfFiles.length > 0) {
      setUploadStatus(`PDF ${pdfFiles.length}개와 이미지 묶음 1개가 업로드됩니다.`);
    } else {
      setUploadStatus(`${validFiles.length}개 파일 선택됨`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection?.errors[0]?.code === 'file-invalid-type') {
        setUploadError('PDF, JPG, PNG 파일만 업로드 가능합니다.');
      } else {
        setUploadError('파일 업로드에 실패했습니다.');
      }
    },
  });

  // 문서 업로드 및 OCR 처리 (PDF 개별 업로드 + 이미지 묶음 업로드)
  const handleUpload = async () => {
    if (!uploadFiles.length || !uploadSelection.subcategoryId || !user) {
      return;
    }

    const subcategory = subcategories.find(
      (s) => s.id === uploadSelection.subcategoryId,
    );
    if (!subcategory) {
      setUploadError('세부 카테고리를 찾을 수 없습니다.');
      return;
    }

    const parentCategoryId = subcategory.parentCategoryId;
    const departmentId = subcategory.departmentId;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('파일 처리 준비 중...');
    setUploadError(null);
    setUploadSuccess(false);
    setOcrTextPreview('');

    try {
      const { pdfFiles, imageFiles } = splitFilesByType(uploadFiles);
      const totalFiles = uploadFiles.length;
      let completedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      setFileStatuses(
        uploadFiles.map((file) => ({
          name: file.name,
          status: '대기 중',
          error: null,
        })),
      );

      const getSingleDocTitle = () => {
        const trimmed = documentTitle.trim();
        if (trimmed) return trimmed;
        if (imageFiles.length > 0) {
          return getBaseNameWithoutExt(imageFiles[0].name);
        }
        if (pdfFiles.length === 1) {
          return getBaseNameWithoutExt(pdfFiles[0].name);
        }
        return '문서';
      };

      // PDF 파일 병렬 처리 (Promise.allSettled 사용)
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '처리 중...' };
            }
            return next;
          });

          let ocrText = '';

          try {
            ocrText = await extractText(file);
            if (!imageFiles.length && pdfFiles.length === 1) {
              setOcrTextPreview(ocrText);
            }
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
          }

          const baseName = getBaseNameWithoutExt(file.name);
          const title =
            pdfFiles.length === 1 && imageFiles.length === 0
              ? getSingleDocTitle()
              : baseName;

          await uploadDocument({
            name: title,
            originalFileName: file.name,
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file,
            ocrText,
          });

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '완료', error: null };
            }
            return next;
          });

          return { success: true, fileName: file.name };
        } catch (fileError) {
          console.error('업로드 오류:', file.name, fileError);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: '실패',
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : '문서 업로드 중 오류가 발생했습니다.',
              };
            }
            return next;
          });

          return { success: false, fileName: file.name, error: fileError };
        }
      });

      // 모든 PDF 파일 동시 업로드
      const pdfResults = await Promise.allSettled(pdfUploadPromises);

      // 결과 집계
      pdfResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount += 1;
        } else {
          failureCount += 1;
        }
        completedCount += 1;
        setUploadProgress(Math.round((completedCount / totalFiles) * 100));
      });

      setUploadStatus(`PDF 파일 ${pdfFiles.length}개 업로드 완료`);

      // 이미지 파일들을 하나의 문서로 묶어서 처리 (OCR 병렬 처리)
      if (imageFiles.length > 1) {
        setUploadStatus(`${imageFiles.length}개 이미지 OCR 병렬 처리 중...`);

        // 병렬 OCR 처리 (Promise.all 사용)
        const ocrPromises = imageFiles.map(async (file, i) => {
          const index = uploadFiles.indexOf(file);

          try {
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 처리 중...' };
              }
              return next;
            });

            let ocrText = '';
            try {
              ocrText = await extractText(file);
            } catch (ocrError) {
              console.error('OCR 처리 오류:', file.name, ocrError);
            }

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 완료' };
              }
              return next;
            });

            // 인덱스와 함께 반환하여 순서 보장
            return {
              index: i,
              text: ocrText && ocrText.trim()
                ? `--- 페이지 ${i + 1} ---\n${ocrText.trim()}\n`
                : '',
            };
          } catch (fileError) {
            console.error('이미지 OCR 오류:', file.name, fileError);
            failureCount += 1;

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = {
                  ...next[index],
                  status: '실패',
                  error: fileError instanceof Error
                    ? fileError.message
                    : 'OCR 처리 실패',
                };
              }
              return next;
            });

            return { index: i, text: '' };
          } finally {
            completedCount += 1;
            setUploadProgress(Math.round((completedCount / totalFiles) * 100));
          }
        });

        // 모든 OCR 작업 완료 대기
        const ocrResults = await Promise.all(ocrPromises);

        // 원래 순서대로 정렬하여 텍스트 결합
        const ocrParts = ocrResults
          .sort((a, b) => a.index - b.index)
          .map(result => result.text)
          .filter(text => text.length > 0);

        const allOcrText = ocrParts.join('\n');
        if (allOcrText) {
          setOcrTextPreview(allOcrText);
        }

        try {
          setUploadStatus('PDF 생성 중...');

          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imgData = await readFileAsDataURL(file);

            if (i > 0) {
              pdf.addPage();
            }

            const lowerName = file.name.toLowerCase();
            const isPng =
              file.type === 'image/png' ||
              lowerName.endsWith('.png');

            pdf.addImage(
              imgData,
              isPng ? 'PNG' : 'JPEG',
              0,
              0,
              pageWidth,
              pageHeight,
            );
          }

          const pdfBlob = pdf.output('blob');

          const firstImage = imageFiles[0];
          const imageTitle =
            pdfFiles.length === 0 && imageFiles.length > 0
              ? getSingleDocTitle()
              : getBaseNameWithoutExt(firstImage.name);

          const pdfFileNameBase = imageTitle || getBaseNameWithoutExt(firstImage.name);
          const pdfFileName = `${pdfFileNameBase || 'document'}.pdf`;
          const pdfFile = new File([pdfBlob], pdfFileName, {
            type: 'application/pdf',
          });

          setUploadStatus('업로드 중...');

          await uploadDocument({
            name: imageTitle,
            originalFileName: pdfFileName,
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file: pdfFile,
            ocrText: allOcrText,
          });

          successCount += 1;
          setUploadStatus(`완료: ${imageFiles.length}장을 하나의 문서로 업로드했습니다!`);
        } catch (groupError) {
          console.error('이미지 묶음 업로드 오류:', groupError);
          failureCount += 1;
          setUploadError(
            groupError instanceof Error
              ? groupError.message
              : '이미지 문서 업로드 중 오류가 발생했습니다.',
          );
        }
      } else if (imageFiles.length === 1) {
        const file = imageFiles[0];
        const index = uploadFiles.indexOf(file);
        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '처리 중...' };
            }
            return next;
          });

          setUploadStatus('이미지 1/1 OCR 처리 중...');

          let ocrText = '';
          try {
            ocrText = await extractText(file);
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
          }

          if (ocrText && ocrText.trim()) {
            setOcrTextPreview(ocrText.trim());
          }

          const imageTitle =
            pdfFiles.length === 0
              ? getSingleDocTitle()
              : getBaseNameWithoutExt(file.name);

          await uploadDocument({
            name: imageTitle,
            originalFileName: file.name,
            categoryId: parentCategoryId,
            parentCategoryId,
            subcategoryId: subcategory.id,
            departmentId,
            uploader: user.name || user.email || 'Unknown',
            classified: false,
            file,
            ocrText,
          });

          successCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '완료', error: null };
            }
            return next;
          });
        } catch (fileError) {
          console.error('업로드 오류:', file.name, fileError);
          failureCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: '실패',
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : '문서 업로드 중 오류가 발생했습니다.',
              };
            }
            return next;
          });
        }
      }

      if (successCount > 0) {
        setUploadSuccess(true);
      }

      if (failureCount > 0) {
        setUploadError(
          failureCount === totalFiles
            ? '모든 파일 업로드에 실패했습니다.'
            : `${failureCount}개 파일 업로드에 실패했습니다.`,
        );
      }

      setUploadStatus('업로드 완료');

      await fetchDocuments();

      setTimeout(() => {
        setUploadFiles([]);
        setUploadSelection({
          departmentId: '',
          parentCategoryId: '',
          subcategoryId: '',
        });
        setDocumentTitle('');
        setUploadProgress(0);
        setUploadStatus('');
        setUploadSuccess(false);
        setFileStatuses([]);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
        if (fileInput) {
          fileInput.value = '';
        }
      }, 2000);
    } catch (error) {
      console.error('업로드 오류:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : '문서 업로드 중 오류가 발생했습니다.',
      );
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyOcrText = async () => {
    if (!ocrTextPreview) return;
    try {
      await navigator.clipboard.writeText(ocrTextPreview);
      setUploadStatus('OCR 텍스트가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('텍스트 복사 오류:', error);
      setUploadError('텍스트 복사 중 오류가 발생했습니다.');
    }
  };
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <DocumentBreadcrumb
          items={[
            {
              label: '문서 관리',
              isCurrentPage: true,
            },
          ]}
        />

        <div>
          <h1 className="text-3xl font-bold text-slate-900">문서 관리</h1>
          <p className="text-slate-500 mt-1">카테고리와 문서를 관리하세요</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'categories' | 'documents' | 'upload')
          }
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              세부 카테고리 관리
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              전체 문서
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              문서 업로드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-600">부서</Label>
                  <Select
                    value={categoryFilter.departmentId}
                    onValueChange={(value) =>
                      setCategoryFilter({
                        departmentId: value,
                        parentCategoryId: 'all',
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {departments
                        .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-600">대분류</Label>
                  <Select
                    value={categoryFilter.parentCategoryId}
                    onValueChange={(value) =>
                      setCategoryFilter((prev) => ({
                        ...prev,
                        parentCategoryId: value,
                      }))
                    }
                    disabled={filteredParentCategoriesForFilter.length === 0}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {filteredParentCategoriesForFilter.map((pc) => (
                        <SelectItem key={pc.id} value={pc.id}>
                          {pc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: primaryColor }}>
                    <Plus className="h-4 w-4 mr-2" />
                    세부 카테고리 추가
                  </Button>
                </DialogTrigger>
                <DialogContent closeClassName="text-white data-[state=open]:text-white">
                  <DialogHeader>
                    <DialogTitle>새 세부 카테고리 추가</DialogTitle>
                    <DialogDescription>
                      새로운 문서 세부 카테고리를 생성합니다
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>세부 카테고리 이름</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder="예: 근로계약서(2024년)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>설명</Label>
                      <Textarea
                        value={newCategory.description}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            description: e.target.value,
                          })
                        }
                        placeholder="세부 카테고리 설명"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>부서</Label>
                      <Select
                        value={newCategory.departmentId}
                        onValueChange={(value) =>
                          setNewCategory({
                            ...newCategory,
                            departmentId: value,
                            parentCategoryId: '',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="부서 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments
                            .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                            .map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name} ({dept.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>대분류</Label>
                      <Select
                        value={newCategory.parentCategoryId}
                        onValueChange={(value) =>
                          setNewCategory({
                            ...newCategory,
                            parentCategoryId: value,
                          })
                        }
                        disabled={newCategoryParentOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="대분류 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {newCategoryParentOptions.map((pc) => (
                            <SelectItem key={pc.id} value={pc.id}>
                              {pc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>보관 위치</Label>
                      <Input
                        value={newCategory.storageLocation}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            storageLocation: e.target.value,
                          })
                        }
                        placeholder="예: A동 2층 캐비닛 3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddCategory}
                      variant="outline"
                      disabled={
                        !newCategory.name.trim() ||
                        !newCategory.departmentId ||
                        !newCategory.parentCategoryId
                      }
                    >
                      세부 카테고리만 추가
                    </Button>
                    <Button
                      onClick={handleAddCategoryWithNfc}
                      style={{ backgroundColor: primaryColor }}
                      disabled={
                        !newCategory.name.trim() ||
                        !newCategory.departmentId ||
                        !newCategory.parentCategoryId
                      }
                      className="flex items-center gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      NFC 등록하며 추가
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Dialog
              open={editDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseEditDialog();
                }
              }}
            >
              <DialogContent closeClassName="text-white data-[state=open]:text-white">
                <DialogHeader>
                  <DialogTitle>카테고리 수정</DialogTitle>
                  <DialogDescription>
                    선택한 카테고리 정보를 수정합니다
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>카테고리 이름</Label>
                    <Input
                      value={editCategoryForm.name}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="예: 계약서"
                    />
                    {editCategoryNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {editCategoryNameError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={editCategoryForm.description}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="카테고리 설명"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>보관 위치</Label>
                    <Input
                      value={editCategoryForm.storageLocation}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          storageLocation: e.target.value,
                        }))
                      }
                      placeholder="예: A동 2층 캐비닛 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>기본 보관 만료일 (선택)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: 90 }))}
                      >
                        3개월
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: 365 }))}
                      >
                        1년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: 1095 }))}
                      >
                        3년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: 1825 }))}
                      >
                        5년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: 2555 }))}
                      >
                        7년
                      </Button>
                      {editCategoryForm.defaultExpiryDays && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditCategoryForm((prev) => ({ ...prev, defaultExpiryDays: null }))}
                          className="bg-white text-slate-600 hover:bg-slate-100"
                        >
                          초기화
                        </Button>
                      )}
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !editCategoryForm.defaultExpiryDays && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editCategoryForm.defaultExpiryDays
                            ? format(addDays(new Date(), editCategoryForm.defaultExpiryDays), 'PPP', { locale: ko })
                            : '달력에서 보관 만료일 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2040}
                          selected={editCategoryForm.defaultExpiryDays ? addDays(new Date(), editCategoryForm.defaultExpiryDays) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const diffTime = date.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              setEditCategoryForm((prev) => ({
                                ...prev,
                                defaultExpiryDays: diffDays,
                              }));
                            }
                          }}
                          initialFocus
                          className="bg-white"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-slate-500">
                      보관 만료일을 설정하지 않으면 이 카테고리의 문서는 만료되지 않습니다.
                      {editCategoryForm.defaultExpiryDays && ` (약 ${Math.round(editCategoryForm.defaultExpiryDays / 365)}년, ${editCategoryForm.defaultExpiryDays}일)`}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseEditDialog}
                    disabled={isSavingCategory}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!editingCategoryId) return;
                      try {
                        const uid = await readNFCUid();

                        // 이 UID가 이미 등록된 태그인지 확인
                        const existingSub = await findSubcategoryByNfcUid(uid);

                        if (existingSub) {
                          // 이미 등록된 태그 → 확인 다이얼로그 띄우기
                          setPendingNfcUid(uid);
                          setPendingNfcSubcategoryId(editingCategoryId);
                          setExistingNfcSubcategory({ id: existingSub.id, name: existingSub.name });
                          setNfcConfirmDialogOpen(true);
                          return;
                        }

                        // 등록된 적 없는 태그 → 바로 등록 진행
                        await proceedNfcRegistration(uid, editingCategoryId);
                      } catch (error: any) {
                        toast({
                          title: '오류',
                          description:
                            error?.message || 'NFC 태그 등록 중 오류가 발생했습니다.',
                          variant: 'destructive',
                        });
                        setNfcMode('idle'); // 에러 시 모드 초기화
                      }
                    }}
                    disabled={!editingCategoryId || isSavingCategory}
                  >
                    📱 NFC 태그 등록
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveCategory}
                    style={{ backgroundColor: primaryColor }}
                    disabled={isSavingCategory}
                  >
                    {isSavingCategory ? '저장 중...' : '저장'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseDeleteDialog();
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>
                      "{deletingSubcategory?.name ?? ''}"을(를) 정말 삭제하시겠습니까?
                    </p>
                    <p className="mt-1">
                      이 카테고리에 속한 문서 {deletingCategoryDocCount}개도 함께 삭제됩니다.
                    </p>
                    <p className="mt-3 text-sm font-medium text-red-600">
                      삭제 후에는 되돌릴 수 없습니다. 신중하게 진행하세요.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingCategory}>
                    취소
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDeleteCategory}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeletingCategory}
                  >
                    {isDeletingCategory ? '삭제 중...' : '삭제'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {isLoadingSubcategories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-4 bg-slate-200 rounded" />
                        <div className="h-4 bg-slate-200 rounded" />
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : paginatedSubcategories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                조건에 해당하는 세부 카테고리가 없습니다.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedSubcategories.map((subcategory) => {
                    const dept = departments.find((d) => d.id === subcategory.departmentId);
                    const parent = parentCategories.find(
                      (pc) => pc.id === subcategory.parentCategoryId,
                    );
                    return (
                      <Card
                        key={subcategory.id}
                        className="hover:shadow-lg transition-shadow h-full"
                      >
                        <div
                          className="flex flex-col h-full"
                          onClick={() => {
                            const isAdminPath = window.location.pathname.startsWith('/admin');
                            const basePath = isAdminPath ? '/admin' : '/team';
                            navigate(
                              `${basePath}/parent-category/${subcategory.parentCategoryId}/subcategory/${subcategory.id}`,
                            );
                          }}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{subcategory.name}</CardTitle>
                                <CardDescription className="mt-1">
                                  {subcategory.description}
                                </CardDescription>
                              </div>
                              {subcategory.nfcRegistered && (
                                <Badge variant="outline" className="ml-2">
                                  <Smartphone className="h-3 w-3 mr-1" />
                                  NFC
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-col justify-between flex-1">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">부서</span>
                                <span className="font-medium">{dept?.name}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">대분류</span>
                                <span className="font-medium">{parent?.name}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">문서 수</span>
                                <span className="font-medium">
                                  {subcategory.documentCount}개
                                </span>
                              </div>
                              {subcategory.storageLocation && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">보관 위치</span>
                                  <span className="font-medium text-xs">
                                    {subcategory.storageLocation}
                                  </span>
                                </div>
                              )}
                              {subcategory.defaultExpiryDays && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">보관 만료일</span>
                                  <span className="font-medium">
                                    {format(addDays(new Date(), subcategory.defaultExpiryDays), 'yyyy.MM.dd')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div
                              className="flex gap-2 mt-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleOpenEditDialog(subcategory)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                수정
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(subcategory)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {filteredSubcategoriesForCategoriesTab.length > 0 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-slate-500">
                      {startItem}-{endItem} / 총 {filteredSubcategoriesForCategoriesTab.length}개
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        이전
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>전체 문서 목록</CardTitle>
                {rawQuery && (
                  <CardDescription className="mt-1">
                    검색어: "{rawQuery}" · {filteredDocuments.length}건
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="파일명, 업로더, 카테고리, 부서로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 기간</SelectItem>
                      <SelectItem value="7days">최근 1주일</SelectItem>
                      <SelectItem value="1month">최근 1개월</SelectItem>
                      <SelectItem value="3months">최근 3개월</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-full md:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">최신순</SelectItem>
                      <SelectItem value="oldest">오래된순</SelectItem>
                      <SelectItem value="name">이름순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-500">
                    {filteredDocuments.length > 0 ? (
                      <span>
                        {docStartItem}-{docEndItem} / 총 {filteredDocuments.length}개 문서
                      </span>
                    ) : (
                      <span>총 0개 문서</span>
                    )}
                  </div>

                  {totalDocPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDocumentsPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={documentsPage === 1}
                      >
                        이전
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalDocPages) }, (_, i) => {
                          let pageNum;
                          if (totalDocPages <= 5) {
                            pageNum = i + 1;
                          } else if (documentsPage <= 3) {
                            pageNum = i + 1;
                          } else if (documentsPage >= totalDocPages - 2) {
                            pageNum = totalDocPages - 4 + i;
                          } else {
                            pageNum = documentsPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                documentsPage === pageNum ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => setDocumentsPage(pageNum)}
                              className="w-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDocumentsPage((prev) =>
                            Math.min(totalDocPages, prev + 1),
                          )
                        }
                        disabled={documentsPage === totalDocPages}
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    검색 결과가 없습니다
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedDocuments.map((doc) => {
                        const parentCategory = parentCategories.find(
                          (pc) => pc.id === doc.parentCategoryId,
                        );
                        const subcategory = subcategories.find(
                          (s) => s.id === doc.subcategoryId,
                        );
                        const department = departments.find(
                          (d) => d.id === doc.departmentId,
                        );

                        return (
                          <div
                            key={doc.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-lg border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${primaryColor}20` }}
                              >
                                <FileText
                                  className="h-5 w-5"
                                  style={{ color: primaryColor }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">{doc.name}</p>
                                  {doc.classified && (
                                    <Badge variant="destructive" className="text-xs">
                                      기밀
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500">
                                  {[
                                    formatDateTimeSimple(doc.uploadDate),
                                    doc.uploader || null,
                                    parentCategory?.name || null,
                                    subcategory?.name || null,
                                    department?.name || null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 sm:mt-0 self-end sm:self-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPreviewDocument(doc.id)}
                              >
                                문서 보기
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDownloadDocument(doc.id)}
                              >
                                ⬇️
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                                onClick={() => handleDeleteDocumentClick(doc.id)}
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalDocPages > 1 && filteredDocuments.length > 0 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <div className="text-sm text-slate-500">
                          {docStartItem}-{docEndItem} / 총 {filteredDocuments.length}개
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDocumentsPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={documentsPage === 1}
                          >
                            이전
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: Math.min(5, totalDocPages) },
                              (_, i) => {
                                let pageNum;
                                if (totalDocPages <= 5) {
                                  pageNum = i + 1;
                                } else if (documentsPage <= 3) {
                                  pageNum = i + 1;
                                } else if (documentsPage >= totalDocPages - 2) {
                                  pageNum = totalDocPages - 4 + i;
                                } else {
                                  pageNum = documentsPage - 2 + i;
                                }

                                return (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      documentsPage === pageNum
                                        ? 'default'
                                        : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setDocumentsPage(pageNum)}
                                    className="w-10"
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              },
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setDocumentsPage((prev) =>
                                Math.min(totalDocPages, prev + 1),
                              )
                            }
                            disabled={documentsPage === totalDocPages}
                          >
                            다음
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>문서 업로드</CardTitle>
                <CardDescription>
                  새로운 문서를 시스템에 업로드합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>부서</Label>
                    <Select
                      value={uploadSelection.departmentId}
                      onValueChange={(value) =>
                        setUploadSelection({
                          departmentId: value,
                          parentCategoryId: '',
                          subcategoryId: '',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="부서 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadDepartments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>대분류</Label>
                    <Select
                      value={uploadSelection.parentCategoryId}
                      onValueChange={(value) =>
                        setUploadSelection((prev) => ({
                          ...prev,
                          parentCategoryId: value,
                          subcategoryId: '',
                        }))
                      }
                      disabled={
                        !uploadSelection.departmentId ||
                        uploadParentCategories.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="대분류 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadParentCategories.map((pc) => (
                          <SelectItem key={pc.id} value={pc.id}>
                            {pc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>세부 카테고리</Label>
                    <Select
                      value={uploadSelection.subcategoryId}
                      onValueChange={(value) =>
                        setUploadSelection((prev) => ({
                          ...prev,
                          subcategoryId: value,
                        }))
                      }
                      disabled={
                        !uploadSelection.parentCategoryId ||
                        uploadSubcategories.length === 0
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="세부 카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {uploadSubcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>파일 업로드</Label>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-300 hover:border-slate-400'
                    } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <input {...getInputProps()} id="file-upload" />
                    <div className="flex flex-col items-center">
                      {isUploading ? (
                        <Loader2 className="h-12 w-12 text-slate-400 mb-4 animate-spin" />
                      ) : uploadSuccess ? (
                        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                      ) : (
                        <Upload className="h-12 w-12 text-slate-400 mb-4" />
                      )}
                      <p className="text-sm font-medium mb-1">
                        {uploadFiles.length
                          ? uploadFiles.length === 1
                            ? uploadFiles[0].name
                            : `${uploadFiles.length}개 파일 선택됨`
                          : isDragActive
                          ? '파일을 여기에 놓으세요'
                          : '클릭하여 파일 선택 또는 드래그 앤 드롭'}
                      </p>
                      <p className="text-xs text-slate-500">
                        PDF, JPG, PNG 파일 업로드 가능 (여러 파일 선택 가능)
                      </p>
                    </div>
                  </div>
                  {canEditTitle && uploadFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>문서 제목</Label>
                      <Input
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="문서 제목을 입력하세요"
                      />
                      <p className="text-xs text-slate-500">
                        {selectedImageFiles.length > 1
                          ? `${selectedImageFiles.length}개 이미지를 하나의 문서로 묶어 업로드합니다.`
                          : '원본 파일명을 기본 제목으로 사용합니다. 필요하면 수정하세요.'}
                      </p>
                    </div>
                  )}

                  {/* 업로드 진행률 표시 */}
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{uploadStatus}</span>
                        <span className="text-slate-500">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  )}

                  {/* 성공 메시지 */}
                  {uploadSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-900">업로드 완료</AlertTitle>
                      <AlertDescription className="text-green-800">
                        문서가 성공적으로 업로드되었습니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 에러 메시지 */}
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>업로드 오류</AlertTitle>
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}
                  {fileStatuses.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs text-left">
                      {fileStatuses.map(
                        (
                          file: { name: string; status: string; error?: string | null }
                        ) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="truncate max-w-[60%]">{file.name}</span>
                            <span
                              className={
                                file.error
                                  ? 'text-red-500'
                                  : file.status === '완료'
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                              }
                            >
                              {file.error ? '실패' : file.status}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {ocrTextPreview && (
                  <Card>
                    <CardHeader>
                      <CardTitle>OCR 추출 텍스트</CardTitle>
                      <CardDescription>
                        {ocrTextPreview.length.toLocaleString()}자 추출됨
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {ocrTextPreview.length.toLocaleString()}자 추출됨
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyOcrText}
                        >
                          복사
                        </Button>
                      </div>
                      <div className="border rounded-md p-3 max-h-64 overflow-y-auto bg-slate-50 text-sm whitespace-pre-wrap">
                        {ocrTextPreview}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    업로드 가이드라인
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• PDF, JPG, PNG 파일 형식을 지원합니다</li>
                    <li>• 너무 큰 파일은 Supabase Storage 정책에 따라 업로드가 실패할 수 있습니다</li>
                    <li>• 문서명은 명확하게 작성해주세요</li>
                    <li>• 기밀 문서는 별도로 표시해주세요</li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={
                    uploadFiles.length === 0 ||
                    !uploadSelection.subcategoryId ||
                    isUploading
                  }
                  onClick={handleUpload}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      업로드
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open);
            if (!open) {
              setImageZoom(100);
              setImageRotation(0);
            }
          }}
        >
          {/* PDF 미리보기: 기존 브라우저 뷰어 유지 */}
          {previewDoc?.type === 'pdf' && (
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{previewDoc?.title || '문서 미리보기'}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto min-h-0">
                {previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-slate-500">문서를 불러오는 중입니다...</p>
                  </div>
                ) : (
                  previewDoc && <PdfViewer url={previewDoc.url} />
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">PDF 문서</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}

          {/* 이미지 미리보기: 전문 뷰어 레이아웃 */}
          {previewDoc?.type === 'image' && (
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>{previewDoc?.title || '이미지 미리보기'}</DialogTitle>
              </DialogHeader>

              {/* 상단 툴바 */}
              <div className="flex items-center justify-center gap-2 p-2 border-b bg-slate-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                >
                  ➖
                </Button>

                <span className="text-sm font-medium min-w-[60px] text-center">
                  {imageZoom}%
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.min(200, imageZoom + 25))}
                >
                  ➕
                </Button>

                <div className="w-px h-6 bg-slate-300 mx-2" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageRotation((imageRotation + 90) % 360)}
                  title="90도 회전"
                >
                  🔄
                </Button>

                {previewDoc && (
                  <>
                    <div className="w-px h-6 bg-slate-300 mx-2" />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(previewDoc.id)}
                      title="다운로드"
                    >
                      ⬇️
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const printWindow = window.open(previewDoc.url);
                        if (printWindow) {
                          setTimeout(() => {
                            printWindow.print();
                          }, 500);
                        }
                      }}
                      title="인쇄"
                    >
                      🖨️
                    </Button>
                  </>
                )}
              </div>

              {/* 메인 이미지 영역 (스크롤 가능) */}
              <div
                className="image-viewer flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8"
                onWheel={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -10 : 10;
                    setImageZoom((prev) =>
                      Math.max(25, Math.min(200, prev + delta)),
                    );
                  }
                }}
              >
                {previewLoading ? (
                  <p className="text-slate-500">이미지를 불러오는 중입니다...</p>
                ) : (
                  previewDoc && (
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.title}
                      style={{
                        transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                        transition: 'transform 0.2s ease',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      className="shadow-lg"
                    />
                  )
                )}
              </div>

              {/* 하단 푸터 */}
              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">이미지 문서</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>

        {/* NFC 재등록 확인 다이얼로그 */}
        <AlertDialog open={nfcConfirmDialogOpen} onOpenChange={setNfcConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>NFC 태그 재등록</AlertDialogTitle>
              <AlertDialogDescription>
                이미 URL이 등록된 태그입니다.
                {existingNfcSubcategory && (
                  <span className="block mt-2 font-medium">
                    현재 연결: {existingNfcSubcategory.name}
                  </span>
                )}
                <span className="block mt-2">계속 하시겠습니까?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleNfcConfirmNo}>
                아니오
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNfcConfirmYes}>
                예
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
