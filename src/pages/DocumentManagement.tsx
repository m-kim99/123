import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
            title: t('documentMgmt.nfcTagRecognized'),
            description: t('documentMgmt.subcategorySelected', { name: categoryName }),
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
          title: t('documentMgmt.nfcTagRecognized'),
          description: t('documentMgmt.parentCategorySelected', { name: categoryName }),
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
      title: t('documentMgmt.subcategoryAdded'),
      description: t('documentMgmt.subcategoryAddedDesc'),
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
          title: t('documentMgmt.subcategoryCreateFailed'),
          description: t('documentMgmt.subcategoryCreateFailedNfc'),
          variant: 'destructive',
        });
        return;
      }

      scanToast = toast({
        title: t('documentMgmt.nfcWaiting'),
        description: t('documentMgmt.nfcWaitingDesc'),
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
        title: t('documentMgmt.nfcRegFailed'),
        description:
          error?.message || t('documentMgmt.nfcRegFailedDesc'),
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
        title: t('documentMgmt.nfcRegComplete'),
        description: t('documentMgmt.nfcRegCompleteDesc'),
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
        title: t('documentMgmt.nfcRegFailed'),
        description:
          error?.message || t('documentMgmt.nfcRegErrorDesc'),
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
      setEditCategoryNameError(t('documentMgmt.enterName'));
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
        title: t('documentMgmt.editComplete'),
        description: t('documentMgmt.subcategoryEditedDesc'),
      });

      handleCloseEditDialog();
    } catch (error) {
      console.error('세부 스토리지 수정 실패:', error);
      toast({
        title: t('documentMgmt.editFailed'),
        description: t('documentMgmt.subcategoryEditFailedDesc'),
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
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.subcategoryDeletedDesc'),
      });

      handleCloseDeleteDialog();
    } catch (error) {
      console.error('세부 스토리지 삭제 실패:', error);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('documentMgmt.subcategoryDeleteFailedDesc'),
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
        title: t('documentMgmt.previewFailed'),
        description: t('documentMgmt.previewFailedDesc'),
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
        title: t('documentMgmt.downloadFailed'),
        description: t('documentMgmt.downloadFailedDesc'),
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
        title: t('documentMgmt.noPermission'),
        description: t('documentMgmt.noDeletePermission'),
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(t('documentMgmt.confirmDelete'));
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
        title: t('documentMgmt.deleteComplete'),
        description: t('documentMgmt.docDeletedDesc'),
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
        title: t('documentMgmt.deleteFailed'),
        description: t('documentMgmt.docDeleteFailedDesc'),
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
        title: t('documentMgmt.noPermission'),
        description: t('documentMgmt.noSharePermission'),
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
        title: t('documentMgmt.shareLoadFailed'),
        description: t('documentMgmt.shareLoadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingShares(false);
    }
  };

  // 공유 취소
  const handleUnshare = async (shareId: string) => {
    if (!confirm(t('documentMgmt.confirmUnshare'))) return;

    try {
      await unshareDocument(shareId);
      
      // 목록에서 제거
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId));
      
      toast({
        title: t('documentMgmt.unshareComplete'),
        description: t('documentMgmt.unshareCompleteDesc'),
      });
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: t('documentMgmt.unshareFailed'),
        description: t('documentMgmt.unshareFailedDesc'),
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
        title: t('documentMgmt.selectionError'),
        description: t('documentMgmt.selectUsersToShare'),
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
        title: t('documentMgmt.shareComplete'),
        description: t('documentMgmt.shareCompleteDesc', { count: selectedUserIds.length }) + (sendEmailNotification ? ` ${t('documentMgmt.emailAlsoSent')}` : ''),
      });

      setShareDialogOpen(false);
      setSharingDocumentId(null);
      setSelectedUserIds([]);
      setSendEmailNotification(false);
    } catch (error) {
      console.error('문서 공유 실패:', error);
      toast({
        title: t('documentMgmt.shareFailed'),
        description: t('documentMgmt.shareFailedDesc'),
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
        title: t('documentMgmt.noPermission'),
        description: t('documentMgmt.noEditPermission'),
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
        title: t('documentMgmt.fileTypeError'),
        description: t('documentMgmt.onlyPdfJpgPng'),
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
        title: t('documentMgmt.ocrComplete'),
        description: t('documentMgmt.ocrCharCount', { count: ocrText.length.toLocaleString() }),
      });
    } catch (error) {
      console.error('OCR 추출 오류:', error);
      setReplaceOcrText('');
      toast({
        title: t('documentMgmt.ocrFailed'),
        description: t('documentMgmt.ocrFailedFileUploaded'),
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
        title: t('documentMgmt.selectFile'),
        description: t('documentMgmt.selectFileFirst'),
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
        setUploadError(t('documentMgmt.onlyPdfJpgPng'));
      } else {
        setUploadError(t('documentMgmt.uploadFailedGeneric'));
      }
    },
  });

  // 문서 업로드 (OCR은 이미 추출됨)
  const handleUpload = async () => {
    if (!uploadFiles.length || !uploadSelection.subcategoryId || !user) {
      return;
    }

    if (isExtractingOcr) {
      setUploadError(t('documentMgmt.waitForOcr'));
      return;
    }

    const subcategory = subcategories.find(
      (s) => s.id === uploadSelection.subcategoryId,
    );
    if (!subcategory) {
      setUploadError(t('documentMgmt.subcategoryNotFound'));
      return;
    }

    const parentCategoryId = subcategory.parentCategoryId;
    const departmentId = subcategory.departmentId;

    // 편집된 OCR 텍스트가 있으면 그것을 사용, 아니면 추출된 텍스트 사용
    const finalOcrText = isEditingOcr ? editedOcrText : extractedOcrText;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(t('documentMgmt.preparingUpload'));
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
          status: t('documentMgmt.waitingUpload'),
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
        return t('documentMgmt.document');
      };

      // PDF 파일 병렬 업로드
      const pdfUploadPromises = pdfFiles.map(async (file) => {
        const index = uploadFiles.indexOf(file);

        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.uploading') };
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
              next[index] = { ...next[index], status: t('documentMgmt.completed'), error: null };
            }
            return next;
          });

          return { success: true, fileName: file.name };
        } catch (fileError) {
          console.error('Upload error:', file.name, fileError);

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: t('documentMgmt.failed'),
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : t('documentMgmt.uploadErrorGeneric'),
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
        setUploadStatus(t('documentMgmt.pdfUploadComplete', { count: pdfFiles.length }));
      }

      // 이미지 파일들을 하나의 문서로 묶어서 업로드
      if (imageFiles.length > 1) {
        setUploadStatus(t('documentMgmt.convertingToPdf', { count: imageFiles.length }));

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
                next[index] = { ...next[index], status: t('documentMgmt.pdfConvertDone') };
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

          setUploadStatus(t('documentMgmt.uploading'));

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
          setUploadStatus(t('documentMgmt.imageBundleComplete', { count: imageFiles.length }));
        } catch (groupError) {
          console.error('Image bundle upload error:', groupError);
          failureCount += 1;
          setUploadError(
            groupError instanceof Error
              ? groupError.message
              : t('documentMgmt.imageUploadError'),
          );
        }
      } else if (imageFiles.length === 1) {
        const file = imageFiles[0];
        const index = uploadFiles.indexOf(file);
        try {
          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], status: t('documentMgmt.uploading') };
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
              next[index] = { ...next[index], status: t('documentMgmt.completed'), error: null };
            }
            return next;
          });
        } catch (fileError) {
          console.error('Upload error:', file.name, fileError);
          failureCount += 1;

          setFileStatuses((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = {
                ...next[index],
                status: t('documentMgmt.failed'),
                error:
                  fileError instanceof Error
                    ? fileError.message
                    : t('documentMgmt.uploadErrorGeneric'),
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
            ? t('documentMgmt.allUploadsFailed')
            : t('documentMgmt.someUploadsFailed', { count: failureCount }),
        );
      }

      setUploadStatus(t('documentMgmt.uploadComplete'));

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
      console.error('Upload error:', error);
      setUploadError(
        error instanceof Error
          ? error.message
          : t('documentMgmt.uploadErrorGeneric'),
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
      setUploadStatus(t('documentMgmt.ocrCopied'));
    } catch (error) {
      console.error('Copy error:', error);
      setUploadError(t('documentMgmt.copyError'));
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
      setUploadError(t('documentMgmt.docNotFound'));
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
              label: t('documentMgmt.title'),
              isCurrentPage: true,
            },
          ]}
        />

        <BackButton className="mb-4" />

        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('documentMgmt.title')}</h1>
          <p className="text-slate-500 mt-1">{t('documentMgmt.subtitle')}</p>
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
              {t('documentMgmt.subcategories')}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              {t('documentMgmt.allDocuments')}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-slate-900"
            >
              {t('documentMgmt.uploadDocuments')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-600">{t('documentMgmt.department')}</Label>
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
                      <SelectValue placeholder={t('documentMgmt.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('documentMgmt.all')}</SelectItem>
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
                  <Label className="text-sm font-medium text-slate-600">{t('documentMgmt.parentCategory')}</Label>
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
                      <SelectValue placeholder={t('documentMgmt.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('documentMgmt.all')}</SelectItem>
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
                    {t('documentMgmt.addSubcategory')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] flex flex-col" closeClassName="text-white data-[state=open]:text-white">
                  <DialogHeader>
                    <DialogTitle>{t('documentMgmt.addNewSubcategory')}</DialogTitle>
                    <DialogDescription>
                      {t('documentMgmt.addNewSubcategoryDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 overflow-y-auto flex-1 px-4">
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.department')}</Label>
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
                        <option value="">{t('documentMgmt.selectDepartment')}</option>
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
                      <Label>{t('documentMgmt.parentCategory')}</Label>
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
                        <option value="">{t('documentMgmt.selectParentCategory')}</option>
                        {newCategoryParentOptions.map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.subcategoryName')}</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder={t('documentMgmt.subcategoryNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.description')}</Label>
                      <Textarea
                        value={newCategory.description}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            description: e.target.value,
                          })
                        }
                        placeholder={t('documentMgmt.descriptionPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.colorLabel')}</Label>
                      <ColorLabelPicker
                        value={newCategory.colorLabel}
                        onChange={(value) =>
                          setNewCategory((prev) => ({ ...prev, colorLabel: value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.storageLocation')}</Label>
                      <Input
                        value={newCategory.storageLocation}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            storageLocation: e.target.value,
                          })
                        }
                        placeholder={t('documentMgmt.storageLocationPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.managementNumber')}</Label>
                      <Input
                        value={newCategory.managementNumber}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            managementNumber: e.target.value,
                          })
                        }
                        placeholder={t('documentMgmt.managementNumberPlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.defaultExpiryDate')}</Label>
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
                          {t('documentMgmt.threeMonths')}
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
                          {t('documentMgmt.oneYear')}
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
                          {t('documentMgmt.threeYears')}
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
                          {t('documentMgmt.fiveYears')}
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
                          {t('documentMgmt.sevenYears')}
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
                          {t('documentMgmt.tenYears')}
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
                            {t('documentMgmt.reset')}
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
                              : t('documentMgmt.selectExpiryFromCalendar')}
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
                        {t('documentMgmt.noExpiryNote')}
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
                      {t('documentMgmt.addSubcategoryOnly')}
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
                      {t('documentMgmt.addWithNfc')}
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        {t('common.cancel')}
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
                  <DialogTitle>{t('documentMgmt.editSubcategory')}</DialogTitle>
                  <DialogDescription>
                    {t('documentMgmt.editSubcategoryDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto flex-1 px-4">
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.subcategoryName')}</Label>
                    <Input
                      value={editCategoryForm.name}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder={t('documentMgmt.subcategoryNamePlaceholder')}
                    />
                    {editCategoryNameError && (
                      <p className="text-xs text-red-500 mt-1">
                        {editCategoryNameError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.description')}</Label>
                    <Textarea
                      value={editCategoryForm.description}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder={t('documentMgmt.descriptionPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.colorLabel')}</Label>
                    <ColorLabelPicker
                      value={editCategoryForm.colorLabel}
                      onChange={(value) =>
                        setEditCategoryForm((prev) => ({ ...prev, colorLabel: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.storageLocation')}</Label>
                    <Input
                      value={editCategoryForm.storageLocation}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          storageLocation: e.target.value,
                        }))
                      }
                      placeholder={t('documentMgmt.storageLocationPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.managementNumber')}</Label>
                    <Input
                      value={editCategoryForm.managementNumber}
                      onChange={(e) =>
                        setEditCategoryForm((prev) => ({
                          ...prev,
                          managementNumber: e.target.value,
                        }))
                      }
                      placeholder={t('documentMgmt.managementNumberPlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.defaultExpiryDate')}</Label>
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
                        {t('documentMgmt.threeMonths')}
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
                        {t('documentMgmt.oneYear')}
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
                        {t('documentMgmt.threeYears')}
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
                        {t('documentMgmt.fiveYears')}
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
                        {t('documentMgmt.sevenYears')}
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
                        {t('documentMgmt.tenYears')}
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
                          {t('documentMgmt.reset')}
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
                            : t('documentMgmt.selectExpiryFromCalendar')}
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
                      {t('documentMgmt.noExpiryNote')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!editingCategoryId) return;
                      let scanToast: ReturnType<typeof toast> | null = null;
                      try {
                        scanToast = toast({
                          title: t('documentMgmt.nfcWaiting'),
                          description: t('documentMgmt.nfcWaitingDesc'),
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
                          title: t('documentMgmt.nfcRegFailed'),
                          description:
                            error?.message || t('documentMgmt.nfcRegErrorDesc'),
                          variant: 'destructive',
                        });
                        setNfcMode('idle'); // 에러 시 모드 초기화
                      }
                    }}
                    disabled={!editingCategoryId || isSavingCategory}
                  >
                    📱 {t('documentMgmt.nfcRegButton')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveCategory}
                    style={{ backgroundColor: primaryColor }}
                    disabled={isSavingCategory}
                  >
                    {isSavingCategory ? t('common.saving') : t('common.save')}
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
                  <AlertDialogTitle>{t('documentMgmt.deleteSubcategoryTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>
                      {t('documentMgmt.deleteSubcategoryConfirm', { name: deletingSubcategory?.name ?? '' })}
                    </p>
                    <p className="mt-1">
                      {t('documentMgmt.deleteSubcategoryDocCount', { count: deletingCategoryDocCount })}
                    </p>
                    <p className="mt-3 text-sm font-medium text-red-600">
                      {t('documentMgmt.deleteIrreversible')}
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingCategory}>
                    {t('common.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDeleteCategory}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeletingCategory}
                  >
                    {isDeletingCategory ? t('documentMgmt.deleting') : t('common.delete')}
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
                {t('documentMgmt.noSubcategories')}
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
                                title: t('documentMgmt.expiredCategory'),
                                description: t('documentMgmt.expiredCategoryDesc'),
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
                                    {expiryStatus.status === 'expired'
                                      ? t('documentMgmt.expired')
                                      : t('documentMgmt.expiresInDays', { days: expiryStatus.daysLeft })}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-col justify-between flex-1">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('documentMgmt.department')}</span>
                                <span className="font-medium">{dept?.name}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('documentMgmt.parentCategory')}</span>
                                <span className="font-medium">{parent?.name}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">{t('documentMgmt.docCount')}</span>
                                <span className="font-medium">
                                  {subcategory.documentCount}
                                </span>
                              </div>
                              {subcategory.storageLocation && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">{t('documentMgmt.storageLocationLabel')}</span>
                                  <span className="font-medium text-xs">
                                    {subcategory.storageLocation}
                                  </span>
                                </div>
                              )}
                              {subcategory.managementNumber && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">{t('documentMgmt.managementNumberLabel')}</span>
                                  <span className="font-medium text-xs">
                                    {subcategory.managementNumber}
                                  </span>
                                </div>
                              )}
                              {subcategory.expiryDate ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">{t('documentMgmt.expiryDateLabel')}</span>
                                  <span className="font-medium">
                                    {format(new Date(subcategory.expiryDate), 'yyyy.MM.dd')}
                                  </span>
                                </div>
                              ) : subcategory.defaultExpiryDays ? (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-500">{t('documentMgmt.expiryDateLabel')}</span>
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
                                {t('common.edit')}
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
                      {startItem}-{endItem} / {t('common.total')} {filteredSubcategoriesForCategoriesTab.length}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        {t('common.previous')}
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
                        {t('common.next')}
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
                <CardTitle>{t('documentMgmt.allDocumentsList')}</CardTitle>
                {rawQuery && (
                  <CardDescription className="mt-1">
                    {t('documentMgmt.searchKeyword')}: "{rawQuery}" · {filteredDocuments.length}{t('common.items')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={t('documentMgmt.searchPlaceholder')}
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
                      <SelectItem value="all">{t('documentMgmt.allPeriod')}</SelectItem>
                      <SelectItem value="7days">{t('documentMgmt.last7days')}</SelectItem>
                      <SelectItem value="1month">{t('documentMgmt.last1month')}</SelectItem>
                      <SelectItem value="3months">{t('documentMgmt.last3months')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-full md:w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">{t('documentMgmt.sortLatest')}</SelectItem>
                      <SelectItem value="oldest">{t('documentMgmt.sortOldest')}</SelectItem>
                      <SelectItem value="name">{t('documentMgmt.sortName')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-slate-500">
                    {filteredDocuments.length > 0 ? (
                      <span>
                        {docStartItem}-{docEndItem} / {t('common.total')} {filteredDocuments.length} {t('common.documents')}
                      </span>
                    ) : (
                      <span>{t('common.total')} 0 {t('common.documents')}</span>
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
                        {t('common.previous')}
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
                        {t('common.next')}
                      </Button>
                    </div>
                  )}
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    {t('documentMgmt.noResults')}
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
                                      {t('documentMgmt.confidential')}
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
                          {docStartItem}-{docEndItem} / {t('common.total')} {filteredDocuments.length}
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
                            {t('common.previous')}
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
                            {t('common.next')}
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
                <CardTitle>{t('documentMgmt.uploadDocuments')}</CardTitle>
                <CardDescription>
                  {t('documentMgmt.uploadDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('documentMgmt.department')}</Label>
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
                        <SelectValue placeholder={t('documentMgmt.selectDepartment')} />
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
                    <Label>{t('documentMgmt.parentCategory')}</Label>
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
                        <SelectValue placeholder={t('documentMgmt.selectParentCategory')} />
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
                    <Label>{t('documentMgmt.subcategories')}</Label>
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
                        <SelectValue placeholder={t('documentMgmt.selectSubcategory')} />
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
                  <Label>{t('documentMgmt.fileUpload')}</Label>
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
                            : t('documentMgmt.filesSelected', { count: uploadFiles.length })
                          : isDragActive
                          ? t('documentMgmt.dropHere')
                          : t('documentMgmt.clickOrDrag')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('documentMgmt.supportedFormats')}
                      </p>
                    </div>
                  </div>
                  {canEditTitle && uploadFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t('documentMgmt.docTitle')}</Label>
                      <Input
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder={t('documentMgmt.docTitlePlaceholder')}
                      />
                      <p className="text-xs text-slate-500">
                        {selectedImageFiles.length > 1
                          ? t('documentMgmt.imagesBundled', { count: selectedImageFiles.length })
                          : t('documentMgmt.defaultTitleNote')}
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
                      <AlertTitle className="text-green-900">{t('documentMgmt.uploadComplete')}</AlertTitle>
                      <AlertDescription className="text-green-800">
                        {t('documentMgmt.uploadCompleteDesc')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* 에러 메시지 */}
                  {uploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('documentMgmt.uploadError')}</AlertTitle>
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
                                  : file.status === t('documentMgmt.completed')
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                              }
                            >
                              {file.error ? t('documentMgmt.failed') : file.status}
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
                      <CardTitle>{t('documentMgmt.ocrExtractedText')}</CardTitle>
                      <CardDescription>
                        {(isEditingOcr ? editedOcrText : ocrTextPreview).length.toLocaleString()}{t('documentMgmt.chars')} {isEditingOcr ? t('documentMgmt.editing') : t('documentMgmt.extracted')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {(isEditingOcr ? editedOcrText : ocrTextPreview).length.toLocaleString()}{t('documentMgmt.chars')} {isEditingOcr ? t('documentMgmt.editing') : t('documentMgmt.extracted')}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyOcrText}
                          >
                            {t('documentMgmt.copy')}
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
                                {t('common.cancel')}
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
                                    {t('common.saving')}
                                  </>
                                ) : lastUploadedDocId ? (
                                  t('common.save')
                                ) : (
                                  t('documentMgmt.apply')
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
                              {t('common.edit')}
                            </Button>
                          )}
                        </div>
                      </div>
                      {isEditingOcr ? (
                        <Textarea
                          value={editedOcrText}
                          onChange={(e) => setEditedOcrText(e.target.value)}
                          className="min-h-64 text-sm font-mono"
                          placeholder={t('documentMgmt.editOcrPlaceholder')}
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
                    {t('documentMgmt.uploadGuideline')}
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {t('documentMgmt.guidelineFormats')}</li>
                    <li>• {t('documentMgmt.guidelineName')}</li>
                    <li>• {t('documentMgmt.guidelineConfidential')}</li>
                    <li>• {t('documentMgmt.guidelineMasking')}</li>
                    <li>• {t('documentMgmt.guidelineNoConfidential')}</li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isUploading || isExtractingOcr}
                  onClick={() => {
                    if (!uploadSelection.departmentId || !uploadSelection.parentCategoryId || !uploadSelection.subcategoryId) {
                      toast({
                        title: t('documentMgmt.selectLocation'),
                        description: t('documentMgmt.selectLocationDesc'),
                        variant: 'destructive',
                      });
                      return;
                    }
                    if (uploadFiles.length === 0) {
                      toast({
                        title: t('documentMgmt.selectFile'),
                        description: t('documentMgmt.selectFileToUpload'),
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
                      {t('documentMgmt.extractingOcr')}
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('documentMgmt.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('documentMgmt.upload')}
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
                <DialogTitle className="truncate pr-8">{previewDoc?.title || t('documentMgmt.docPreview')}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto min-h-0">
                {previewLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-slate-500">{t('documentMgmt.loadingDoc')}</p>
                  </div>
                ) : (
                  previewDoc && <PdfViewer url={previewDoc.url} />
                )}
              </div>

              <DialogFooter className="border-t pt-3">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-slate-500">{t('documentMgmt.pdfDoc')}</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    {t('common.close')}
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
                  title={t('documentMgmt.rotate90')}
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
                      title={t('documentMgmt.download')}
                    >
                      <img src={downloadIcon} alt={t('documentMgmt.download')} className="w-5 h-5" />
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
                      title={t('documentMgmt.print')}
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
                  <p className="text-slate-500">{t('documentMgmt.loadingImage')}</p>
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
                  <span className="text-sm text-slate-500">{t('documentMgmt.imageDoc')}</span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewOpen(false);
                      setImageZoom(100);
                      setImageRotation(0);
                    }}
                  >
                    {t('common.close')}
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
              <AlertDialogTitle>{t('documentMgmt.nfcReregister')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('documentMgmt.nfcAlreadyRegistered')}
                {existingNfcSubcategory && (
                  <span className="block mt-2 font-medium">
                    {t('documentMgmt.currentConnection')}: {existingNfcSubcategory.name}
                  </span>
                )}
                <span className="block mt-2">{t('documentMgmt.continueQuestion')}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleNfcConfirmNo}>
                {t('common.no')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleNfcConfirmYes}>
                {t('common.yes')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 문서 공유 다이얼로그 */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('documentMgmt.shareDoc')}</DialogTitle>
              <DialogDescription>
                {t('documentMgmt.shareDocDesc')}
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
                {t('documentMgmt.newShare')}
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium bg-white ${
                  activeShareTab === 'existing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveShareTab('existing')}
              >
                {t('documentMgmt.shareStatus')} ({existingShares.length})
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
                        {selectedUserIds.length === companyUsers.length ? t('documentMgmt.deselectAll') : t('documentMgmt.selectAll')}
                      </button>
                    </div>
                  )}

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingUsers')}</span>
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {t('documentMgmt.noUsersToShare')}
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
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingShares')}</span>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {t('documentMgmt.noSharedUsers')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {existingShares.map((share: any) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{share.users?.name || t('common.unknown')}</p>
                            <p className="text-sm text-slate-500 truncate">{share.users?.email || ''}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(share.shared_at).toLocaleDateString()} {t('documentMgmt.shared')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnshare(share.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {t('common.cancel')}
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
                    {t('documentMgmt.emailNotification')}
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
                {t('common.close')}
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
                      {t('documentMgmt.sharing')}
                    </>
                  ) : (
                    <>📤 {t('documentMgmt.shareToCount', { count: selectedUserIds.length })}</>
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
              <DialogTitle>{t('documentMgmt.fileReplace')}</DialogTitle>
              <DialogDescription>
                {t('documentMgmt.fileReplaceDesc')}
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
                    <p className="text-sm text-blue-600">{t('documentMgmt.extractingOcr')}</p>
                  </div>
                ) : replaceFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="text-sm font-medium text-green-700">{replaceFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {replaceOcrText ? `${replaceOcrText.length.toLocaleString()}${t('documentMgmt.chars')} ${t('documentMgmt.extracted')}` : t('documentMgmt.noOcrText')}
                    </p>
                    <p className="text-xs text-slate-400">{t('documentMgmt.clickToSelectOther')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {isReplaceDragActive ? t('documentMgmt.dropHere') : t('documentMgmt.clickOrDrag')}
                    </p>
                    <p className="text-xs text-slate-400">{t('documentMgmt.supportedFormatsShort')}</p>
                  </div>
                )}
              </div>

              {/* OCR 추출 텍스트 */}
              {replaceFile && !isExtractingReplaceOcr && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('documentMgmt.ocrExtractedText')}</Label>
                    <span className="text-xs text-slate-500">
                      {replaceOcrText.length.toLocaleString()}{t('documentMgmt.chars')}
                    </span>
                  </div>
                  <Textarea
                    value={replaceOcrText}
                    onChange={(e) => setReplaceOcrText(e.target.value)}
                    readOnly={!isEditingReplaceOcr}
                    className={`min-h-[128px] max-h-48 text-sm font-mono ${
                      !isEditingReplaceOcr ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder={replaceOcrText ? undefined : t('documentMgmt.noOcrText')}
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
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingReplaceOcr(!isEditingReplaceOcr)}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
              >
                {isEditingReplaceOcr ? t('documentMgmt.editDone') : t('common.edit')}
              </Button>
              <Button
                onClick={handleReplaceFile}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReplacingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
