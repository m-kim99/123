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
import binIcon from '@/assets/bin.svg';
import downloadIcon from '@/assets/download.svg';
import shareIcon from '@/assets/share.svg';
import previewIcon from '@/assets/preview.svg';
import changeIcon from '@/assets/change.svg';
import { format, addDays, addMonths, addYears } from 'date-fns';
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
  DialogClose,
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
import { downloadFile } from '@/lib/appBridge';
import { toast } from '@/hooks/use-toast';
import { readNFCUid, writeNFCUrl, setNfcMode } from '@/lib/nfc';
import { createDocumentNotification } from '@/lib/notifications';
import { DocumentBreadcrumb } from '@/components/DocumentBreadcrumb';
import { PdfViewer } from '@/components/PdfViewer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateTimeSimple } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { BackButton } from '@/components/BackButton';
import { ColorLabelPicker, ColorLabelBadge } from '@/components/ColorLabelPicker';
import { hasPermission, type Role, type Action } from '@/lib/permissions';

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

function getExpiryStatus(expiryDate: string | null): {
  status: 'normal' | 'warning_30' | 'warning_7' | 'expired';
  daysLeft: number | null;
  label: string | null;
} {
  if (!expiryDate) {
    return { status: 'normal', daysLeft: null, label: null };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'expired', daysLeft: diffDays, label: '만료됨 🔒' };
  } else if (diffDays <= 7) {
    return { status: 'warning_7', daysLeft: diffDays, label: `만료 ${diffDays}일 전` };
  } else if (diffDays <= 30) {
    return { status: 'warning_30', daysLeft: diffDays, label: `만료 ${diffDays}일 전` };
  } else {
    return { status: 'normal', daysLeft: diffDays, label: null };
  }
}

export function DocumentManagement() {
  const user = useAuthStore((state) => state.user);
  
  // Selector 최적화: 상태값은 개별 selector로
  const departments = useDocumentStore((state) => state.departments);
  const parentCategories = useDocumentStore((state) => state.parentCategories);
  const subcategories = useDocumentStore((state) => state.subcategories);
  const documents = useDocumentStore((state) => state.documents);
  
  // 세부 스토리지 로딩 상태 (페이지 진입 시 전체 데이터 재조회 중)
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
  // 팀원용: 권한 있는 부서 ID 목록
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>([]);
  // 부서별 권한 매핑 (departmentId -> Role)
  const [departmentPermissions, setDepartmentPermissions] = useState<Map<string, Role>>(new Map());
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
    updateDocumentOcrText,
    shareDocument,
    unshareDocument,
    updateDocumentFile,
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
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({
    name: '',
    description: '',
    storageLocation: '',
    managementNumber: '',
    defaultExpiryDays: null as number | null,
    expiryDate: null as string | null,
    colorLabel: null as string | null,
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
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [editedOcrText, setEditedOcrText] = useState('');
  const [isSavingOcr, setIsSavingOcr] = useState(false);
  const [lastUploadedDocId, setLastUploadedDocId] = useState<string | null>(null);
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [extractedOcrText, setExtractedOcrText] = useState('');
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

  // 공유 다이얼로그 상태
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<'new' | 'existing'>('new');
  const [existingShares, setExistingShares] = useState<any[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [imageZoom, setImageZoom] = useState(100); // 확대/축소 %
  const [imageRotation, setImageRotation] = useState(0); // 회전 각도

  // 파일 교체 다이얼로그 상태
  const [fileReplaceDialogOpen, setFileReplaceDialogOpen] = useState(false);
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const [replaceOcrText, setReplaceOcrText] = useState('');
  const [isExtractingReplaceOcr, setIsExtractingReplaceOcr] = useState(false);
  const [isEditingReplaceOcr, setIsEditingReplaceOcr] = useState(false);

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
    const validSubcategoryIds = new Set(subcategories.map((s) => s.id));

    const companyFilteredDocuments = documents.filter((d) =>
      allowedDepartmentIds.has(d.departmentId) &&
      !!d.subcategoryId &&
      validSubcategoryIds.has(d.subcategoryId)
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

  // 페이지 진입 시 전체 세부 스토리지 재조회 (상세 페이지에서 필터링된 상태 복구)
  useEffect(() => {
    setIsLoadingSubcategories(true);
    // Zustand actions는 안정적이므로 getState()로 직접 호출
    useDocumentStore.getState().fetchSubcategories().finally(() => {
      setIsLoadingSubcategories(false);
    });
  }, []);

  // 팀원용: 권한 있는 부서 목록 조회 + 권한 레벨 매핑
  useEffect(() => {
    const fetchAccessibleDepartments = async () => {
      if (isAdmin || !user?.id) {
        // 관리자는 모든 부서에 manager 권한
        setAccessibleDepartmentIds(departments.map((d) => d.id));
        const adminPerms = new Map<string, Role>();
        departments.forEach(d => adminPerms.set(d.id, 'manager'));
        setDepartmentPermissions(adminPerms);
        return;
      }

      const permissions = new Map<string, Role>();
      const deptIds = new Set<string>();

      // 1. 소속 부서는 자동 manager 권한
      const ownDeptId = user.departmentId;
      if (ownDeptId) {
        deptIds.add(ownDeptId);
        permissions.set(ownDeptId, 'manager');
      }

      // 2. 추가 권한 부여된 부서 조회 (role이 none이 아닌 경우)
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('department_id, role')
        .eq('user_id', user.id)
        .neq('role', 'none');

      permissionData?.forEach((p: any) => {
        deptIds.add(p.department_id);
        // 소속 부서가 아닌 경우에만 권한 설정 (소속 부서는 이미 manager)
        if (p.department_id !== ownDeptId) {
          permissions.set(p.department_id, p.role as Role);
        }
      });

      setAccessibleDepartmentIds(Array.from(deptIds));
      setDepartmentPermissions(permissions);
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

  // 권한 체크 함수
  const canPerformAction = (departmentId: string, action: Action): boolean => {
    // 관리자는 모든 권한
    if (isAdmin) return true;
    
    const role = departmentPermissions.get(departmentId);
    if (!role) return false;
    
    return hasPermission(role, action);
  };

  // 문서별 권한 체크
  const canPerformDocumentAction = (doc: { departmentId: string }, action: Action): boolean => {
    return canPerformAction(doc.departmentId, action);
  };
 
  useEffect(() => {
    // URL 파라미터에서 카테고리/세부 스토리지 정보 읽기 (레거시 및 호환용)
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
            description: `"${categoryName}" 세부 스토리지가 선택되었습니다`,
          });
        }

        setActiveTab('upload');
        window.history.replaceState({}, '', location.pathname);
        return;
      }
    }

    if (categoryId && categoryName) {
      // 레거시: 카테고리 ID만 전달된 경우, 해당 대분류 및 첫 세부 스토리지를 선택
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
      defaultExpiryDays: newCategory.defaultExpiryDays,
      expiryDate: newCategory.expiryDate,
      colorLabel: newCategory.colorLabel,
    }).then(() => {
      fetchSubcategories();
    });

    setNewCategory({
      name: '',
      description: '',
      departmentId: '',
      parentCategoryId: '',
      storageLocation: '',
      managementNumber: '',
      defaultExpiryDays: null,
      expiryDate: null,
      colorLabel: null,
    });
    toast({
      title: '세부 스토리지 등록 완료',
      description: '세부 스토리지가 성공적으로 추가되었습니다.',
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

    let scanToast: ReturnType<typeof toast> | null = null;
    try {
      const created = await addSubcategory({
        name: newCategory.name.trim(),
        description: newCategory.description,
        departmentId: newCategory.departmentId,
        parentCategoryId: newCategory.parentCategoryId,
        storageLocation: newCategory.storageLocation,
        nfcRegistered: false,
        nfcUid: null,
        defaultExpiryDays: newCategory.defaultExpiryDays,
        expiryDate: newCategory.expiryDate,
        colorLabel: newCategory.colorLabel,
      });

      if (!created) {
        toast({
          title: '세부 스토리지 생성 실패',
          description: '세부 스토리지를 생성하지 못해 NFC를 등록할 수 없습니다.',
          variant: 'destructive',
        });
        return;
      }

      scanToast = toast({
        title: 'NFC 태그 인식 대기',
        description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
        duration: 1000000,
      });
      const uid = await readNFCUid();
      scanToast.dismiss();

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
        managementNumber: '',
        defaultExpiryDays: null,
        expiryDate: null,
        colorLabel: null,
      });
    } catch (error: any) {
      scanToast?.dismiss();
      console.error('세부 스토리지 생성 및 NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error?.message || '세부 스토리지 생성 또는 NFC 등록 중 오류가 발생했습니다.',
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
          throw new Error('세부 스토리지를 찾을 수 없습니다.');
        }
      }

      // 기존에 이 UID를 쓰던 모든 세부 스토리지에서 NFC 정보 해제
      await clearNfcByUid(uid, subcategoryId);

      // NFC 태그에 세부 스토리지용 URL을 쓴다
      const subName = targetSub?.name || subcategoryId;
      await writeNFCUrl(subcategoryId, subName);

      // 세부 스토리지 테이블에 UID 및 등록 여부 반영
      await registerNfcTag(subcategoryId, uid);

      toast({
        title: 'NFC 등록 완료',
        description: 'NFC에 세부 스토리지가 등록되었습니다.',
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
      managementNumber: '',
      defaultExpiryDays: null,
      expiryDate: null,
      colorLabel: null,
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
      managementNumber: subcategory.managementNumber || '',
      defaultExpiryDays: subcategory.defaultExpiryDays || null,
      expiryDate: subcategory.expiryDate || null,
      colorLabel: subcategory.colorLabel || null,
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
        managementNumber: editCategoryForm.managementNumber,
        defaultExpiryDays: editCategoryForm.defaultExpiryDays,
        expiryDate: editCategoryForm.expiryDate,
        colorLabel: editCategoryForm.colorLabel,
      });

      toast({
        title: '수정 완료',
        description: '세부 스토리지가 성공적으로 수정되었습니다.',
      });

      handleCloseEditDialog();
    } catch (error) {
      console.error('세부 스토리지 수정 실패:', error);
      toast({
        title: '수정 실패',
        description: '세부 스토리지를 수정하는 중 오류가 발생했습니다.',
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
        description: '세부 스토리지가 삭제되었습니다.',
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '세부 스토리지를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setIsDeletingCategory(false);
    }
  };

  const handleOpenPreviewDocument = async (documentId: string) => {
    try {
      trackEvent('document_preview_open', {
        document_id: documentId,
        preview_context: 'document_management',
      });

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
      trackEvent('document_download', {
        document_id: documentId,
        download_context: 'document_management',
      });

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

      if (!publicData?.publicUrl) {
        throw new Error('파일 URL을 생성할 수 없습니다.');
      }

      await downloadFile(publicData.publicUrl, data.title || 'document');
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
    const targetDoc = documents.find((d) => d.id === documentId);
    if (!targetDoc) return;

    // 권한 체크
    if (!canPerformDocumentAction(targetDoc, 'delete')) {
      toast({
        title: '권한 없음',
        description: '이 문서를 삭제할 권한이 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm('정말 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      trackEvent('document_delete', {
        document_id: documentId,
        delete_context: 'document_management',
      });

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

  // 공유 다이얼로그 열기
  const handleOpenShareDialog = async (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc) return;

    // 권한 체크 - share 권한 필요 (manager만)
    if (!canPerformDocumentAction(doc, 'share')) {
      toast({
        title: '권한 없음',
        description: '이 문서를 공유할 권한이 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    trackEvent('share_dialog_open', {
      document_id: documentId,
      share_context: 'document_management',
    });

    setSharingDocumentId(documentId);
    setSelectedUserIds([]);
    setActiveShareTab('new');
    setShareDialogOpen(true);
    setIsLoadingUsers(true);
    setIsLoadingShares(true);

    try {
      if (!user?.companyId) {
        throw new Error('회사 정보가 없습니다.');
      }

      // 1. 공유 가능한 사용자 목록
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('company_id', user.companyId)
        .neq('id', user.id)
        .order('name');

      if (usersError) throw usersError;
      setCompanyUsers(usersData || []);

      // 2. 현재 공유 현황 (FK JOIN 대신 별도 쿼리)
      const { data: sharesData, error: sharesError } = await supabase
        .from('shared_documents')
        .select('id, shared_to_user_id, shared_at, permission')
        .eq('document_id', documentId)
        .eq('shared_by_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });

      if (sharesError) throw sharesError;

      // 3. 공유받은 사용자 정보 조회
      if (sharesData && sharesData.length > 0) {
        const sharedToUserIds = [...new Set(sharesData.map((s: any) => s.shared_to_user_id))];
        const { data: sharedUsersData } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', sharedToUserIds);

        const usersMap = new Map((sharedUsersData || []).map((u: any) => [u.id, u]));

        const sharesWithUsers = sharesData.map((share: any) => ({
          ...share,
          users: usersMap.get(share.shared_to_user_id) || null,
        }));

        setExistingShares(sharesWithUsers);
      } else {
        setExistingShares([]);
      }

    } catch (error) {
      console.error('공유 정보 로드 실패:', error);
      toast({
        title: '공유 정보 로드 실패',
        description: '공유 정보를 불러오지 못했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingShares(false);
    }
  };

  // 공유 취소
  const handleUnshare = async (shareId: string) => {
    if (!confirm('공유를 취소하시겠습니까?')) return;

    try {
      await unshareDocument(shareId);
      
      // 목록에서 제거
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId));
      
      toast({
        title: '공유 취소 완료',
        description: '문서 공유가 취소되었습니다.',
      });
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: '공유 취소 실패',
        description: '공유 취소 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 사용자 선택 토글
  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 전체 선택/해제
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === companyUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(companyUsers.map((u) => u.id));
    }
  };

  // 공유 이메일 전송
  const handleSendShare = async () => {
    if (!sharingDocumentId || selectedUserIds.length === 0) {
      toast({
        title: '선택 오류',
        description: '공유할 사용자를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    trackEvent('document_share_send', {
      document_id: sharingDocumentId,
      recipient_count: selectedUserIds.length,
      send_email_notification: sendEmailNotification,
      share_context: 'document_management',
    });

    setIsSendingShare(true);

    try {
      const doc = documents.find((d) => d.id === sharingDocumentId);
      if (!doc) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // 1. DB에 공유 정보 저장 (필수)
      for (const userId of selectedUserIds) {
        await shareDocument(sharingDocumentId, userId, 'download', undefined);
      }

      // 2. 이메일 전송 (선택사항)
      if (sendEmailNotification) {
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('file_path, title')
          .eq('id', sharingDocumentId)
          .single();

        if (!docError && docData) {
          const { data: publicData } = supabase.storage
            .from('123')
            .getPublicUrl(docData.file_path);

          const documentUrl = publicData?.publicUrl || '';
          const selectedUsers = companyUsers.filter((u) => selectedUserIds.includes(u.id));
          const recipientEmails = selectedUsers.map((u) => u.email);

          // 이메일 전송 시도 (실패해도 공유는 성공으로 처리)
          try {
            await supabase.functions.invoke('send-share-email', {
              body: {
                recipientEmails,
                documentTitle: doc.name,
                documentUrl,
                senderName: user?.name || '알 수 없음',
                senderEmail: user?.email || '',
              },
            });
          } catch (emailError) {
            console.warn('이메일 전송 실패 (공유는 완료됨):', emailError);
          }
        }
      }

      toast({
        title: '공유 완료',
        description: `${selectedUserIds.length}명에게 문서가 공유되었습니다.${sendEmailNotification ? ' 이메일도 전송되었습니다.' : ''}`,
      });

      setShareDialogOpen(false);
      setSharingDocumentId(null);
      setSelectedUserIds([]);
      setSendEmailNotification(false);
    } catch (error) {
      console.error('문서 공유 실패:', error);
      toast({
        title: '공유 실패',
        description: '문서를 공유하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingShare(false);
    }
  };

  // 파일 교체 다이얼로그 열기
  const handleOpenFileReplaceDialog = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (!doc) return;

    // 권한 체크 - write 권한 필요 (editor 이상)
    if (!canPerformDocumentAction(doc, 'write')) {
      toast({
        title: '권한 없음',
        description: '이 문서를 수정할 권한이 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    setReplacingDocumentId(documentId);
    setFileReplaceDialogOpen(true);
  };

  // 파일 교체 다이얼로그 닫기
  const handleCloseFileReplaceDialog = () => {
    setFileReplaceDialogOpen(false);
    setReplacingDocumentId(null);
    setReplaceFile(null);
    setReplaceOcrText('');
    setIsExtractingReplaceOcr(false);
    setIsEditingReplaceOcr(false);
  };

  // 파일 교체용 파일 선택 핸들러
  const handleReplaceFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (!isPdf && !isImage) {
      toast({
        title: '파일 형식 오류',
        description: 'PDF, JPG, PNG 파일만 업로드 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    setReplaceFile(file);
    setIsExtractingReplaceOcr(true);

    try {
      const ocrText = await extractText(file);
      setReplaceOcrText(ocrText);
      toast({
        title: 'OCR 추출 완료',
        description: `${ocrText.length.toLocaleString()}자가 추출되었습니다.`,
      });
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setReplaceOcrText('');
      toast({
        title: 'OCR 추출 실패',
        description: '텍스트 추출에 실패했습니다. 파일은 업로드됩니다.',
        variant: 'destructive',
      });
    } finally {
      setIsExtractingReplaceOcr(false);
    }
  }, []);

  const {
    getRootProps: getReplaceRootProps,
    getInputProps: getReplaceInputProps,
    isDragActive: isReplaceDragActive,
  } = useDropzone({
    onDrop: handleReplaceFileDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  // 파일 교체 실행
  const handleReplaceFile = async () => {
    if (!replacingDocumentId || !replaceFile) {
      toast({
        title: '파일을 선택해주세요',
        description: '교체할 파일을 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsReplacingFile(true);

    try {
      await updateDocumentFile(replacingDocumentId, replaceFile, replaceOcrText);
      await fetchDocuments();
      handleCloseFileReplaceDialog();
    } catch (error) {
      console.error('파일 교체 실패:', error);
    } finally {
      setIsReplacingFile(false);
    }
  };

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
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
    setExtractedOcrText('');
    setIsEditingOcr(false);
    setEditedOcrText('');

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
        status: 'OCR 대기 중',
        error: null,
      })),
    );

    // OCR 추출 시작
    setIsExtractingOcr(true);
    setUploadStatus('OCR 텍스트 추출 중...');

    try {
      let allOcrText = '';

      // PDF 파일 OCR 추출
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const index = validFiles.indexOf(file);

        setFileStatuses((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = { ...next[index], status: 'OCR 추출 중...' };
          }
          return next;
        });

        try {
          const ocrText = await extractText(file);
          if (pdfFiles.length === 1 && imageFiles.length === 0) {
            allOcrText = ocrText;
          } else if (ocrText && ocrText.trim()) {
            allOcrText += `--- ${file.name} ---\n${ocrText.trim()}\n\n`;
          }

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 완료' };
            }
            return next;
          });
        } catch (ocrError) {
          console.error('OCR 처리 오류:', file.name, ocrError);
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 실패', error: 'OCR 추출 실패' };
            }
            return next;
          });
        }
      }

      // 이미지 파일 OCR 추출
      if (imageFiles.length > 0) {
        const ocrParts: { index: number; text: string }[] = [];

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const index = validFiles.indexOf(file);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: 'OCR 추출 중...' };
            }
            return next;
          });

          try {
            const ocrText = await extractText(file);
            if (ocrText && ocrText.trim()) {
              ocrParts.push({
                index: i,
                text: imageFiles.length > 1
                  ? `--- 페이지 ${i + 1} ---\n${ocrText.trim()}\n`
                  : ocrText.trim(),
              });
            }

            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 완료' };
              }
              return next;
            });
          } catch (ocrError) {
            console.error('OCR 처리 오류:', file.name, ocrError);
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'OCR 실패', error: 'OCR 추출 실패' };
              }
              return next;
            });
          }
        }

        // 이미지 OCR 결과 결합
        const imageOcrText = ocrParts
          .sort((a, b) => a.index - b.index)
          .map((result) => result.text)
          .join('\n');

        if (pdfFiles.length === 0) {
          allOcrText = imageOcrText;
        } else if (imageOcrText) {
          allOcrText += `\n--- 이미지 문서 ---\n${imageOcrText}`;
        }
      }

      setExtractedOcrText(allOcrText);
      setOcrTextPreview(allOcrText);
      setUploadStatus('OCR 추출 완료. 업로드 버튼을 눌러 업로드하세요.');
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setUploadError('OCR 추출 중 오류가 발생했습니다.');
      setUploadStatus('');
    } finally {
      setIsExtractingOcr(false);
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

  // 문서 업로드 (OCR은 이미 추출됨)
  const handleUpload = async () => {
    if (!uploadFiles.length || !uploadSelection.subcategoryId || !user) {
      return;
    }

    if (isExtractingOcr) {
      setUploadError('OCR 추출이 완료될 때까지 기다려주세요.');
      return;
    }

    const subcategory = subcategories.find(
      (s) => s.id === uploadSelection.subcategoryId,
    );
    if (!subcategory) {
      setUploadError('세부 스토리지를 찾을 수 없습니다.');
      return;
    }

    const parentCategoryId = subcategory.parentCategoryId;
    const departmentId = subcategory.departmentId;

    // 편집된 OCR 텍스트가 있으면 그것을 사용, 아니면 추출된 텍스트 사용
    const finalOcrText = isEditingOcr ? editedOcrText : extractedOcrText;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('업로드 준비 중...');
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const { pdfFiles, imageFiles } = splitFilesByType(uploadFiles);
      const totalFiles = uploadFiles.length;
      let completedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      setFileStatuses(
        uploadFiles.map((file) => ({
          name: file.name,
          status: '업로드 대기 중',
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

      // PDF 파일 병렬 업로드
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: '업로드 중...' };
            }
            return next;
          });

          const baseName = getBaseNameWithoutExt(file.name);
          const title =
            pdfFiles.length === 1 && imageFiles.length === 0
              ? getSingleDocTitle()
              : baseName;

          // 단일 PDF인 경우 전체 OCR 텍스트 사용
          const ocrTextForFile = (pdfFiles.length === 1 && imageFiles.length === 0) 
            ? finalOcrText 
            : '';

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
            ocrText: ocrTextForFile,
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

      if (pdfFiles.length > 0) {
        setUploadStatus(`PDF 파일 ${pdfFiles.length}개 업로드 완료`);
      }

      // 이미지 파일들을 하나의 문서로 묶어서 업로드
      if (imageFiles.length > 1) {
        setUploadStatus(`${imageFiles.length}개 이미지를 PDF로 변환 중...`);

        try {
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

            // 파일 상태 업데이트
            const index = uploadFiles.indexOf(file);
            setFileStatuses((prev) => {
              const next = [...prev];
              if (next[index]) {
                next[index] = { ...next[index], status: 'PDF 변환 완료' };
              }
              return next;
            });
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
            ocrText: finalOcrText,
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
              next[index] = { ...next[index], status: '업로드 중...' };
            }
            return next;
          });

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
            ocrText: finalOcrText,
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
      
      // 업로드 성공 시 최신 문서 ID 저장 (OCR 편집용)
      if (successCount > 0) {
        const latestDocs = useDocumentStore.getState().documents;
        if (latestDocs.length > 0) {
          setLastUploadedDocId(latestDocs[0].id);
        }
      }

      setTimeout(() => {
        setUploadFiles([]);
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
      await navigator.clipboard.writeText(isEditingOcr ? editedOcrText : ocrTextPreview);
      setUploadStatus('OCR 텍스트가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('텍스트 복사 오류:', error);
      setUploadError('텍스트 복사 중 오류가 발생했습니다.');
    }
  };

  const handleEditOcrText = () => {
    setEditedOcrText(ocrTextPreview);
    setIsEditingOcr(true);
  };

  const handleCancelEditOcr = () => {
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const handleApplyOcrEdit = () => {
    // 업로드 전 편집 적용 - extractedOcrText와 ocrTextPreview 업데이트
    setExtractedOcrText(editedOcrText);
    setOcrTextPreview(editedOcrText);
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const handleSaveOcrText = async () => {
    if (!lastUploadedDocId) {
      setUploadError('저장할 문서를 찾을 수 없습니다.');
      return;
    }
    
    setIsSavingOcr(true);
    try {
      await updateDocumentOcrText(lastUploadedDocId, editedOcrText);
      setExtractedOcrText(editedOcrText);
      setOcrTextPreview(editedOcrText);
      setIsEditingOcr(false);
      setEditedOcrText('');
    } catch (error) {
      console.error('OCR 텍스트 저장 오류:', error);
    } finally {
      setIsSavingOcr(false);
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

        <BackButton className="mb-4" />

        <div>
          <h1 className="text-3xl font-bold text-slate-900">문서 관리</h1>
          <p className="text-slate-500 mt-1">세부 스토리지와 문서를 관리하세요</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'categories' | 'documents' | 'upload')
          }
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6 gap-1">
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              세부 스토리지
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
                    세부 스토리지 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] flex flex-col" closeClassName="text-white data-[state=open]:text-white">
                  <DialogHeader>
                    <DialogTitle>새 세부 스토리지 추가</DialogTitle>
                    <DialogDescription>
                      부서와 대분류를 선택하여 세부 스토리지를 생성합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 overflow-y-auto flex-1 px-2">
                    <div className="space-y-2">
                      <Label>부서</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        value={newCategory.departmentId}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            departmentId: e.target.value,
                            parentCategoryId: '',
                          })
                        }
                      >
                        <option value="">부서를 선택하세요</option>
                        {departments
                          .filter((dept) => accessibleDepartmentIds.includes(dept.id))
                          .map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>대분류</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        value={newCategory.parentCategoryId}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            parentCategoryId: e.target.value,
                          })
                        }
                        disabled={newCategoryParentOptions.length === 0}
                      >
                        <option value="">대분류를 선택하세요</option>
                        {newCategoryParentOptions.map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>세부 스토리지 이름</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder="예: 채용 서류 보관함"
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
                        placeholder="세부 스토리지 설명"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>컬러라벨(선택)</Label>
                      <ColorLabelPicker
                        value={newCategory.colorLabel}
                        onChange={(value) =>
                          setNewCategory((prev) => ({ ...prev, colorLabel: value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>보관장소(선택)</Label>
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
                    <div className="space-y-2">
                      <Label>관리번호(선택)</Label>
                      <Input
                        value={newCategory.managementNumber}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            managementNumber: e.target.value,
                          })
                        }
                        placeholder="예: MGT-2024-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>기본 보관 만료일 (선택)</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addMonths(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addMonths(new Date(), 3);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          3개월
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addYears(new Date(), 1).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addYears(new Date(), 1);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          1년
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addYears(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addYears(new Date(), 3);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          3년
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addYears(new Date(), 5).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addYears(new Date(), 5);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          5년
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addYears(new Date(), 7).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addYears(new Date(), 7);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          7년
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - addYears(new Date(), 10).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                          onClick={() => {
                            const target = addYears(new Date(), 10);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const targetDay = new Date(target);
                            targetDay.setHours(0, 0, 0, 0);
                            const diffTime = targetDay.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setNewCategory((prev) => ({
                              ...prev,
                              defaultExpiryDays: diffDays,
                              expiryDate: target.toISOString(),
                            }));
                          }}
                        >
                          10년
                        </Button>
                        {newCategory.defaultExpiryDays && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setNewCategory((prev) => ({
                                ...prev,
                                defaultExpiryDays: null,
                                expiryDate: null,
                              }))
                            }
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
                              !newCategory.expiryDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newCategory.expiryDate
                              ? format(new Date(newCategory.expiryDate), 'PPP', { locale: ko })
                              : '달력에서 보관 만료일 선택'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2040}
                            selected={newCategory.expiryDate ? new Date(newCategory.expiryDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selected = new Date(date);
                                selected.setHours(0, 0, 0, 0);
                                const diffTime = selected.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                setNewCategory((prev) => ({
                                  ...prev,
                                  defaultExpiryDays: diffDays,
                                  expiryDate: date.toISOString(),
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
                        {newCategory.expiryDate && ` (${format(new Date(newCategory.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })})`}
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="flex-col sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleAddCategory}
                      variant="outline"
                      disabled={
                        !newCategory.name.trim() ||
                        !newCategory.departmentId ||
                        !newCategory.parentCategoryId
                      }
                    >
                      세부 스토리지만 추가
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddCategoryWithNfc}
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
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        취소
                      </Button>
                    </DialogClose>
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
              <DialogContent closeClassName="text-white data-[state=open]:text-white" className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>세부 스토리지 수정</DialogTitle>
                  <DialogDescription>
                    선택한 세부 스토리지 정보를 수정합니다
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 px-2">
                  <div className="space-y-2">
                    <Label>세부 스토리지 이름</Label>
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
                    <Label>컬러라벨(선택)</Label>
                    <ColorLabelPicker
                      value={editCategoryForm.colorLabel}
                      onChange={(value) =>
                        setEditCategoryForm((prev) => ({ ...prev, colorLabel: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>보관장소(선택)</Label>
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
                    <Label>관리번호(선택)</Label>
                    <Input
                      value={editCategoryForm.managementNumber}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          managementNumber: e.target.value,
                        }))
                      }
                      placeholder="예: MGT-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>기본 보관 만료일 (선택)</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addMonths(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addMonths(new Date(), 3);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        3개월
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addYears(new Date(), 1).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addYears(new Date(), 1);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        1년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addYears(new Date(), 3).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addYears(new Date(), 3);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        3년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addYears(new Date(), 5).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addYears(new Date(), 5);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        5년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addYears(new Date(), 7).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addYears(new Date(), 7);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        7년
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - addYears(new Date(), 10).getTime()) < 86400000 ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : ''}
                        onClick={() => {
                          const target = addYears(new Date(), 10);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const targetDay = new Date(target);
                          targetDay.setHours(0, 0, 0, 0);
                          const diffTime = targetDay.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          setEditCategoryForm((prev) => ({
                            ...prev,
                            defaultExpiryDays: diffDays,
                            expiryDate: target.toISOString(),
                          }));
                        }}
                      >
                        10년
                      </Button>
                      {editCategoryForm.defaultExpiryDays && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditCategoryForm((prev) => ({
                              ...prev,
                              defaultExpiryDays: null,
                              expiryDate: null,
                            }))
                          }
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
                            !editCategoryForm.expiryDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editCategoryForm.expiryDate
                            ? format(new Date(editCategoryForm.expiryDate), 'PPP', { locale: ko })
                            : '달력에서 보관 만료일 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={2040}
                          selected={editCategoryForm.expiryDate ? new Date(editCategoryForm.expiryDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const diffTime = date.getTime() - today.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              setEditCategoryForm((prev) => ({
                                ...prev,
                                defaultExpiryDays: diffDays,
                                expiryDate: date.toISOString(),
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
                      {editCategoryForm.expiryDate && ` (${format(new Date(editCategoryForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })})`}
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
                      let scanToast: ReturnType<typeof toast> | null = null;
                      try {
                        scanToast = toast({
                          title: 'NFC 태그 인식 대기',
                          description: 'NFC 태그를 기기에 가까이 가져다 대세요.',
                          duration: 1000000,
                        });
                        const uid = await readNFCUid();
                        scanToast.dismiss();

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
                        scanToast?.dismiss();
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
                  <AlertDialogTitle>세부 스토리지 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>
                      "{deletingSubcategory?.name ?? ''}"을(를) 정말 삭제하시겠습니까?
                    </p>
                    <p className="mt-1">
                      이 세부 스토리지에 속한 문서 {deletingCategoryDocCount}개도 함께 삭제됩니다.
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
                조건에 해당하는 세부 스토리지가 없습니다.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedSubcategories.map((subcategory) => {
                    const dept = departments.find((d) => d.id === subcategory.departmentId);
                    const parent = parentCategories.find(
                      (pc) => pc.id === subcategory.parentCategoryId,
                    );

                    const expiryStatus = getExpiryStatus(subcategory.expiryDate || null);
                    const isExpired = expiryStatus.status === 'expired';

                    return (
                      <Card
                        key={subcategory.id}
                        className={cn(
                          'hover:shadow-lg transition-shadow h-full',
                          expiryStatus.status === 'expired' && 'opacity-50 bg-gray-100 border-gray-300',
                          expiryStatus.status === 'warning_7' && 'border-orange-300 bg-orange-50',
                          expiryStatus.status === 'warning_30' && 'border-yellow-300 bg-yellow-50'
                        )}
                      >
                        <div
                          className="flex flex-col h-full"
                          onClick={() => {
                            if (isExpired) {
                              toast({
                                title: '만료된 카테고리',
                                description: '이 카테고리는 만료되어 상세 페이지로 이동할 수 없습니다.',
                                variant: 'destructive',
                              });
                              return;
                            }
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
                              <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-2">
                                  {subcategory.nfcRegistered && (
                                    <Badge variant="outline">
                                      <Smartphone className="h-3 w-3 mr-1" />
                                      NFC
                                    </Badge>
                                  )}
                                  <ColorLabelBadge colorLabel={subcategory.colorLabel} />
                                </div>
                                {expiryStatus.label && (
                                  <Badge
                                    variant={
                                      expiryStatus.status === 'expired'
                                        ? 'destructive'
                                        : expiryStatus.status === 'warning_7'
                                          ? 'default'
                                          : 'secondary'
                                    }
                                    className={cn(
                                      expiryStatus.status === 'warning_7' && 'bg-orange-500 text-white',
                                      expiryStatus.status === 'warning_30' && 'bg-yellow-500 text-white'
                                    )}
                                  >
                                    {expiryStatus.label}
                                  </Badge>
                                )}
                              </div>
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
                                  <span className="text-slate-500">보관 장소</span>
                                  <span className="font-medium text-xs">
                                    {subcategory.storageLocation}
                                  </span>
                                </div>
                              )}
                              {subcategory.managementNumber && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">관리번호</span>
                                  <span className="font-medium text-xs">
                                    {subcategory.managementNumber}
                                  </span>
                                </div>
                              )}
                              {subcategory.expiryDate ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">보관 만료일</span>
                                  <span className="font-medium">
                                    {format(new Date(subcategory.expiryDate), 'yyyy.MM.dd')}
                                  </span>
                                </div>
                              ) : subcategory.defaultExpiryDays ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">보관 만료일</span>
                                  <span className="font-medium">
                                    {format(addDays(new Date(), subcategory.defaultExpiryDays), 'yyyy.MM.dd')}
                                  </span>
                                </div>
                              ) : null}
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
                            <div className="flex items-center gap-3 min-w-0 flex-1 w-full">
                              <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${primaryColor}20` }}
                              >
                                <FileText
                                  className="h-5 w-5"
                                  style={{ color: primaryColor }}
                                />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <p className="font-medium truncate flex-1 min-w-0 max-w-full">{doc.name}</p>
                                  {doc.classified && (
                                    <Badge variant="destructive" className="text-xs">
                                      기밀
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 truncate max-w-full">
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
                            <div className="flex gap-2 mt-3 sm:mt-0 self-end sm:self-auto flex-wrap">
                              {/* 미리보기 - read 권한 (viewer 이상) */}
                              {canPerformDocumentAction(doc, 'read') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenPreviewDocument(doc.id)}
                                  title="미리보기"
                                >
                                  <img src={previewIcon} alt="미리보기" className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 파일 교체 - write 권한 (editor 이상) */}
                              {canPerformDocumentAction(doc, 'write') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenFileReplaceDialog(doc.id)}
                                  title="파일 교체"
                                >
                                  <img src={changeIcon} alt="파일 교체" className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 다운로드 - download 권한 (viewer 이상) */}
                              {canPerformDocumentAction(doc, 'download') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDownloadDocument(doc.id)}
                                  title="다운로드"
                                >
                                  <img src={downloadIcon} alt="다운로드" className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 공유 - share 권한 (manager만) */}
                              {canPerformDocumentAction(doc, 'share') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenShareDialog(doc.id)}
                                  title="공유"
                                >
                                  <img src={shareIcon} alt="공유" className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 삭제 - delete 권한 (manager만) */}
                              {canPerformDocumentAction(doc, 'delete') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                                  onClick={() => handleDeleteDocumentClick(doc.id)}
                                  title="삭제"
                                >
                                  <img src={binIcon} alt="삭제" className="w-full h-full p-1.5" />
                                </Button>
                              )}
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
                    <Label>세부 스토리지</Label>
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
                        <SelectValue placeholder="세부 스토리지 선택" />
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
                        {(isEditingOcr ? editedOcrText : ocrTextPreview).length.toLocaleString()}자 {isEditingOcr ? '(편집 중)' : '추출됨'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {(isEditingOcr ? editedOcrText : ocrTextPreview).length.toLocaleString()}자 {isEditingOcr ? '(편집 중)' : '추출됨'}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyOcrText}
                          >
                            복사
                          </Button>
                          {isEditingOcr ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditOcr}
                                disabled={isSavingOcr}
                              >
                                취소
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={lastUploadedDocId ? handleSaveOcrText : handleApplyOcrEdit}
                                disabled={isSavingOcr}
                                style={{ backgroundColor: primaryColor }}
                              >
                                {isSavingOcr ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    저장 중...
                                  </>
                                ) : lastUploadedDocId ? (
                                  '저장'
                                ) : (
                                  '적용'
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleEditOcrText}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              편집
                            </Button>
                          )}
                        </div>
                      </div>
                      {isEditingOcr ? (
                        <Textarea
                          value={editedOcrText}
                          onChange={(e) => setEditedOcrText(e.target.value)}
                          className="min-h-64 text-sm font-mono"
                          placeholder="OCR 텍스트를 편집하세요..."
                        />
                      ) : (
                        <div className="border rounded-md p-3 max-h-64 overflow-y-auto bg-slate-50 text-sm whitespace-pre-wrap">
                          {ocrTextPreview}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    업로드 가이드라인
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• PDF, JPG, PNG 파일 형식을 지원합니다</li>
                    <li>• 문서명은 명확하게 작성해주세요</li>
                    <li>• 기밀 문서는 별도로 표시해주세요</li>
                    <li>• 민감한 정보가 담긴 서류는 마스킹 처리를 해주세요</li>
                    <li>• 기밀 문서는 원칙적으로 업로드 금지하며, 민감한 부분이 제외된 일부 내용만 업로드 해주세요</li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isUploading || isExtractingOcr}
                  onClick={() => {
                    if (!uploadSelection.departmentId || !uploadSelection.parentCategoryId || !uploadSelection.subcategoryId) {
                      toast({
                        title: '저장 위치를 선택해주세요',
                        description: '문서를 저장할 부서, 대분류, 세부 스토리지를 먼저 선택해주세요.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    if (uploadFiles.length === 0) {
                      toast({
                        title: '파일을 선택해주세요',
                        description: '업로드할 파일을 먼저 선택해주세요.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    handleUpload();
                  }}
                >
                  {isExtractingOcr ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      OCR 추출 중...
                    </>
                  ) : isUploading ? (
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
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || '문서 미리보기'}</DialogTitle>
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
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col overflow-hidden" closeClassName="bg-blue-600 hover:bg-blue-700 text-white rounded p-1.5">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{previewDoc?.title || '이미지 미리보기'}</DialogTitle>
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
                      <img src={downloadIcon} alt="다운로드" className="w-5 h-5" />
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

        {/* 문서 공유 다이얼로그 */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>문서 공유</DialogTitle>
              <DialogDescription>
                공유할 사용자를 선택하거나 기존 공유를 관리하세요.
              </DialogDescription>
            </DialogHeader>

            {/* 탭 버튼 */}
            <div className="flex border-b bg-white">
              <button
                className={`flex-1 py-2 text-sm font-medium bg-white ${
                  activeShareTab === 'new'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveShareTab('new')}
              >
                새로운 공유
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium bg-white ${
                  activeShareTab === 'existing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveShareTab('existing')}
              >
                공유 현황 ({existingShares.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {activeShareTab === 'new' ? (
                <>
                  {/* 전체 선택 */}
                  {companyUsers.length > 0 && (
                    <div className="pb-2 mb-2 border-b">
                      <button
                        onClick={handleSelectAllUsers}
                        className="text-sm text-slate-600 hover:text-slate-800 bg-white px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50"
                      >
                        {selectedUserIds.length === companyUsers.length ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                  )}

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">사용자 목록 로딩 중...</span>
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      공유할 수 있는 사용자가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {companyUsers.map((companyUser) => (
                        <div
                          key={companyUser.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            selectedUserIds.includes(companyUser.id)
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                          )}
                          onClick={() => handleToggleUser(companyUser.id)}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                            selectedUserIds.includes(companyUser.id)
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-300"
                          )}>
                            {selectedUserIds.includes(companyUser.id) && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{companyUser.name}</p>
                            <p className="text-sm text-slate-500 truncate">{companyUser.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 공유 현황 탭 */}
                  {isLoadingShares ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">공유 현황 로딩 중...</span>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      아직 공유한 사용자가 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {existingShares.map((share: any) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{share.users?.name || '알 수 없음'}</p>
                            <p className="text-sm text-slate-500 truncate">{share.users?.email || ''}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(share.shared_at).toLocaleDateString('ko-KR')} 공유
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnshare(share.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            취소
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              {/* 이메일 알림 체크박스 - 우측 하단 */}
              {activeShareTab === 'new' && (
                <div className="flex items-center space-x-2 mr-auto">
                  <input
                    type="checkbox"
                    id="emailNotification"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="emailNotification" className="text-sm">
                    이메일 알림 전송
                  </label>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setShareDialogOpen(false);
                  setSharingDocumentId(null);
                  setSelectedUserIds([]);
                  setSendEmailNotification(false);
                  setActiveShareTab('new');
                }}
                disabled={isSendingShare}
              >
                닫기
              </Button>
              {activeShareTab === 'new' && (
                <Button
                  onClick={handleSendShare}
                  disabled={isSendingShare || selectedUserIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSendingShare ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      공유 중...
                    </>
                  ) : (
                    <>📤 {selectedUserIds.length}명에게 공유</>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 파일 교체 다이얼로그 */}
        <Dialog open={fileReplaceDialogOpen} onOpenChange={(open) => !open && handleCloseFileReplaceDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>파일 교체</DialogTitle>
              <DialogDescription>
                기존 문서의 파일을 새 파일로 교체합니다. AI OCR이 자동으로 적용됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 파일 업로드 영역 */}
              <div
                {...getReplaceRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isReplaceDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : replaceFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input {...getReplaceInputProps()} />
                {isExtractingReplaceOcr ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-blue-600">OCR 텍스트 추출 중...</p>
                  </div>
                ) : replaceFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="text-sm font-medium text-green-700">{replaceFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {replaceOcrText ? `${replaceOcrText.length.toLocaleString()}자 추출됨` : 'OCR 텍스트 없음'}
                    </p>
                    <p className="text-xs text-slate-400">다른 파일을 선택하려면 클릭하세요</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {isReplaceDragActive ? '파일을 놓으세요' : '클릭하여 파일 선택 또는 드래그 앤 드롭'}
                    </p>
                    <p className="text-xs text-slate-400">PDF, JPG, PNG 파일 업로드 가능</p>
                  </div>
                )}
              </div>

              {/* OCR 추출 텍스트 */}
              {replaceFile && !isExtractingReplaceOcr && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>OCR 추출 텍스트</Label>
                    <span className="text-xs text-slate-500">
                      {replaceOcrText.length.toLocaleString()}자
                    </span>
                  </div>
                  <Textarea
                    value={replaceOcrText}
                    onChange={(e) => setReplaceOcrText(e.target.value)}
                    readOnly={!isEditingReplaceOcr}
                    className={`min-h-[128px] max-h-48 text-sm font-mono ${
                      !isEditingReplaceOcr ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder={replaceOcrText ? undefined : 'OCR 텍스트 없음'}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCloseFileReplaceDialog}
                disabled={isReplacingFile}
              >
                취소
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingReplaceOcr(!isEditingReplaceOcr)}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
              >
                {isEditingReplaceOcr ? '편집 완료' : '편집'}
              </Button>
              <Button
                onClick={handleReplaceFile}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReplacingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
