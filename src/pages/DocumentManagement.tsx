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
  Share2,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Archive,
} from 'lucide-react';
import binIcon from '@/assets/icons/bin.svg';
import downloadIcon from '@/assets/icons/download.svg';
import shareIcon from '@/assets/icons/share.svg';
import previewIcon from '@/assets/icons/preview.svg';
import changeIcon from '@/assets/icons/change.svg';
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
  DialogTrigger,
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import type { Subcategory } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { extractText } from '@/lib/ocr';
import { supabase } from '@/lib/supabase';
import { r2Storage } from '@/lib/r2';
import { downloadFile } from '@/lib/appBridge';
import { toast } from '@/hooks/use-toast';
import { NFCRegistrationDialog } from '@/components/NFCRegistrationDialog';
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
import { V1ModalHeader, V1ModalBody, V1ModalFooter } from '@/components/ui/v1-components';
import i18n from '@/lib/i18n';

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
        reject(new Error(i18n.t('categoryDetail.imageDataReadError')));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error(i18n.t('categoryDetail.imageReadError')));
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
    return { status: 'expired', daysLeft: diffDays, label: i18n.t('documentMgmt.expired') };
  } else if (diffDays <= 7) {
    return { status: 'warning_7', daysLeft: diffDays, label: i18n.t('documentMgmt.expiresInDays', { days: diffDays }) };
  } else if (diffDays <= 30) {
    return { status: 'warning_30', daysLeft: diffDays, label: i18n.t('documentMgmt.expiresInDays', { days: diffDays }) };
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
  const [ocrPageProgress, setOcrPageProgress] = useState<{ page: number; totalPages: number; percent: number } | null>(null);
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
        ocrText?: string | null;
        uploader?: string;
        uploadDate?: string;
        fileSize?: string;
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
  const [uploadSuccessDialogOpen, setUploadSuccessDialogOpen] = useState(false);
  const [uploadSuccessCount, setUploadSuccessCount] = useState(0);

  // NFC 재등록 확인 다이얼로그 상태
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [nfcTargetSubcategory, setNfcTargetSubcategory] = useState<{ id: string; name: string } | null>(null);
  const [nfcDialogSource, setNfcDialogSource] = useState<'add' | 'edit'>('add');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '1month' | '3months'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'name'>('latest');
  const [categorySortOrder, setCategorySortOrder] = useState<'latest' | 'oldest' | 'alpha'>('latest');
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
    () => {
      const filtered = subcategories.filter((sub) => {
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
      });
      const arr = [...filtered];
      if (categorySortOrder === 'alpha') {
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      } else if (categorySortOrder === 'latest') {
        arr.reverse();
      }
      return arr;
    },
    [
      subcategories,
      isAdmin,
      user?.departmentId,
      categoryFilter.departmentId,
      categoryFilter.parentCategoryId,
      categorySortOrder,
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

      // 세부 스토리지 생성 완료 → NFC 등록 다이어로그 열기 (펄스 애니메이션)
      setNfcDialogSource('add');
      setNfcTargetSubcategory({ id: created.id, name: created.name });
      setNfcDialogOpen(true);
    } catch (error: any) {
      console.error('세부 스토리지 생성 실패:', error);
      toast({
        title: t('documentMgmt.subcategoryCreateFailed'),
        description: error?.message || t('documentMgmt.subcategoryCreateFailedNfc'),
        variant: 'destructive',
      });
    }
  };

  const handleNfcRegistrationSuccess = async () => {
    await fetchSubcategories();
    if (nfcDialogSource === 'add') {
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
    }
    setNfcTargetSubcategory(null);
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
        .select('file_path, title, ocr_text, uploaded_by, uploaded_at, file_size')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        throw error || new Error('문서를 찾을 수 없습니다.');
      }

      const { data: publicData } = r2Storage.getPublicUrl(data.file_path);

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

      const fileSizeRaw = (data as any).file_size;
      let fileSizeStr: string | undefined;
      if (fileSizeRaw) {
        const bytes = Number(fileSizeRaw);
        if (bytes >= 1048576) fileSizeStr = `${(bytes / 1048576).toFixed(1)}MB`;
        else if (bytes >= 1024) fileSizeStr = `${Math.round(bytes / 1024)}KB`;
        else fileSizeStr = `${bytes}B`;
      }

      setPreviewDoc({
        id: documentId,
        title: data.title,
        url: publicUrl,
        type,
        ocrText: (data as any).ocr_text ?? null,
        uploader: (data as any).uploaded_by ?? undefined,
        uploadDate: (data as any).uploaded_at ? new Date((data as any).uploaded_at).toLocaleDateString() : undefined,
        fileSize: fileSizeStr,
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

      const { data: publicData } = r2Storage.getPublicUrl(data.file_path);

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
        const { error: storageError } = await r2Storage.remove([filePath]);

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
          const { data: publicData } = r2Storage.getPublicUrl(docData.file_path);

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
    setOcrPageProgress(null);
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
          const ocrText = await extractText(file, (progress) => {
            setOcrPageProgress({
              page: progress.page ?? 0,
              totalPages: progress.totalPages ?? 0,
              percent: progress.percent,
            });
          });
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
            const ocrText = await extractText(file, (progress) => {
              setOcrPageProgress({
                page: i + 1,
                totalPages: imageFiles.length,
                percent: Math.round(((i + progress.percent / 100) / imageFiles.length) * 100),
              });
            });
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
      setOcrPageProgress(null);
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
        // 업로드 성공 팝업 표시
        setUploadSuccessCount(successCount);
        setUploadSuccessDialogOpen(true);
      }

      // 즉시 폼 초기화
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
          <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-slate-900">{t('documentMgmt.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('documentMgmt.subtitle')}</p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'categories' | 'documents' | 'upload')
          }
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 rounded-xl h-auto">
            <TabsTrigger
              value="categories"
              className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
            >
              {t('documentMgmt.subcategories')}
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
            >
              {t('documentMgmt.allDocuments')}
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
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

              <div className="flex items-center gap-2">
                <select
                  value={categorySortOrder}
                  onChange={(e) => { setCategorySortOrder(e.target.value as 'latest' | 'oldest' | 'alpha'); setCurrentPage(1); }}
                  className="h-9 rounded-[10px] border border-[#e5e7eb] bg-white text-[13px] text-slate-700 px-3 pr-8 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_8px_center] bg-no-repeat cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:bg-[#111827] dark:border-white/10 dark:text-slate-200"
                >
                  <option value="latest">{t('common.sortLatest')}</option>
                  <option value="oldest">{t('common.sortOldest')}</option>
                  <option value="alpha">{t('common.sortAlpha')}</option>
                </select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: primaryColor }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('documentMgmt.addSubcategory')}
                  </Button>
                </DialogTrigger>
                <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
                  <V1ModalHeader icon={Archive} title={t('documentMgmt.addNewSubcategory')} sub={t('documentMgmt.addNewSubcategoryDesc')} />
                  <V1ModalBody className="overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.department')}</label>
                        <select
                          className="h-[38px] px-3 rounded-lg border border-[#e5e7eb] bg-white text-[14px] w-full outline-none"
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
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.parentCategory')}</label>
                        <select
                          className="h-[38px] px-3 rounded-lg border border-[#e5e7eb] bg-white text-[14px] w-full outline-none"
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
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.subcategoryName')}</label>
                      <Input
                        className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder={t('documentMgmt.subcategoryNamePlaceholder')}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                      <Textarea
                        className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.colorLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                      <ColorLabelPicker
                        value={newCategory.colorLabel}
                        onChange={(value) =>
                          setNewCategory((prev) => ({ ...prev, colorLabel: value }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.storageLocation')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                        <Input
                          className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
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
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.managementNumber')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                        <Input
                          className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono"
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
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.defaultExpiryDate')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: t('documentMgmt.threeMonths'), getValue: () => addMonths(new Date(), 3) },
                          { label: t('documentMgmt.oneYear'), getValue: () => addYears(new Date(), 1) },
                          { label: t('documentMgmt.threeYears'), getValue: () => addYears(new Date(), 3) },
                          { label: t('documentMgmt.fiveYears'), getValue: () => addYears(new Date(), 5) },
                          { label: t('documentMgmt.sevenYears'), getValue: () => addYears(new Date(), 7) },
                          { label: t('documentMgmt.tenYears'), getValue: () => addYears(new Date(), 10) },
                        ].map((opt) => {
                          const target = opt.getValue();
                          const isActive = newCategory.expiryDate && Math.abs(new Date(newCategory.expiryDate).getTime() - target.getTime()) < 86400000;
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                                isActive
                                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                                  : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                              }`}
                              onClick={() => {
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
                              {opt.label}
                            </button>
                          );
                        })}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                                newCategory.expiryDate && ![addMonths(new Date(), 3), addYears(new Date(), 1), addYears(new Date(), 3), addYears(new Date(), 5), addYears(new Date(), 7), addYears(new Date(), 10)].some(d => Math.abs(new Date(newCategory.expiryDate!).getTime() - d.getTime()) < 86400000)
                                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                                  : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              {t('documentMgmt.selectExpiryFromCalendar', { defaultValue: '직접 선택' })}
                            </button>
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
                      </div>
                      {newCategory.expiryDate && (
                        <p className="text-[11.5px] text-slate-500 mt-0.5">
                          {format(new Date(newCategory.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      )}
                    </div>
                  </V1ModalBody>
                  <V1ModalFooter>
                    <DialogClose asChild>
                      <button type="button" className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50">
                        {t('common.cancel')}
                      </button>
                    </DialogClose>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={
                        !newCategory.name.trim() ||
                        !newCategory.departmentId ||
                        !newCategory.parentCategoryId
                      }
                      className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {t('documentMgmt.addSubcategoryOnly')}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCategoryWithNfc}
                      disabled={
                        !newCategory.name.trim() ||
                        !newCategory.departmentId ||
                        !newCategory.parentCategoryId
                      }
                      className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      {t('documentMgmt.addWithNfc')}
                    </button>
                  </V1ModalFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            <Dialog
              open={editDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseEditDialog();
                }
              }}
            >
              <DialogContent variant="v1" className="max-w-[560px] max-h-[90vh] flex flex-col overflow-hidden" hideClose>
                <V1ModalHeader icon={Archive} title={t('documentMgmt.editSubcategory')} sub={t('documentMgmt.editSubcategoryDesc')} />
                <V1ModalBody className="overflow-y-auto flex-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.subcategoryName')}</label>
                    <Input
                      className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
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
                      <p className="text-[11.5px] text-red-500 mt-0.5">
                        {editCategoryNameError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.description')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                    <Textarea
                      className="min-h-[64px] rounded-lg border-[#e5e7eb] text-[14px] resize-y"
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
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.colorLabel')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                    <ColorLabelPicker
                      value={editCategoryForm.colorLabel}
                      onChange={(value) =>
                        setEditCategoryForm((prev) => ({ ...prev, colorLabel: value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.storageLocation')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                      <Input
                        className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px]"
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.managementNumber')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                      <Input
                        className="h-[38px] rounded-lg border-[#e5e7eb] text-[14px] font-mono"
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
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-slate-900">{t('documentMgmt.defaultExpiryDate')} <span className="text-slate-400 font-normal">({t('common.optional', { defaultValue: '선택' })})</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: t('documentMgmt.threeMonths'), getValue: () => addMonths(new Date(), 3) },
                        { label: t('documentMgmt.oneYear'), getValue: () => addYears(new Date(), 1) },
                        { label: t('documentMgmt.threeYears'), getValue: () => addYears(new Date(), 3) },
                        { label: t('documentMgmt.fiveYears'), getValue: () => addYears(new Date(), 5) },
                        { label: t('documentMgmt.sevenYears'), getValue: () => addYears(new Date(), 7) },
                        { label: t('documentMgmt.tenYears'), getValue: () => addYears(new Date(), 10) },
                      ].map((opt) => {
                        const target = opt.getValue();
                        const isActive = editCategoryForm.expiryDate && Math.abs(new Date(editCategoryForm.expiryDate).getTime() - target.getTime()) < 86400000;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                              isActive
                                ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                                : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                            }`}
                            onClick={() => {
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
                            {opt.label}
                          </button>
                        );
                      })}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`px-3 py-[7px] rounded-lg text-[12.5px] font-medium border cursor-pointer transition-colors ${
                              editCategoryForm.expiryDate && ![addMonths(new Date(), 3), addYears(new Date(), 1), addYears(new Date(), 3), addYears(new Date(), 5), addYears(new Date(), 7), addYears(new Date(), 10)].some(d => Math.abs(new Date(editCategoryForm.expiryDate!).getTime() - d.getTime()) < 86400000)
                                ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                                : 'border-[#e5e7eb] bg-white text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {t('documentMgmt.selectExpiryFromCalendar', { defaultValue: '직접 선택' })}
                          </button>
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
                    </div>
                    {editCategoryForm.expiryDate && (
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        {format(new Date(editCategoryForm.expiryDate), 'yyyy년 MM월 dd일', { locale: ko })}
                      </p>
                    )}
                  </div>
                </V1ModalBody>
                <V1ModalFooter>
                  <button
                    type="button"
                    onClick={handleCloseEditDialog}
                    disabled={isSavingCategory}
                    className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingCategoryId) return;
                      const editingSub = subcategories.find((s) => s.id === editingCategoryId);
                      const subName = editingSub?.name || editCategoryForm.name || editingCategoryId;
                      setNfcDialogSource('edit');
                      setNfcTargetSubcategory({ id: editingCategoryId, name: subName });
                      setNfcDialogOpen(true);
                    }}
                    disabled={!editingCategoryId || isSavingCategory}
                    className="h-9 px-4 rounded-[10px] text-[13px] font-semibold border border-[#e5e7eb] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    {t('documentMgmt.nfcRegButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCategory}
                    disabled={isSavingCategory}
                    className="h-9 px-4 rounded-[10px] text-[13px] font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingCategory ? t('common.saving') : t('common.save')}
                  </button>
                </V1ModalFooter>
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
              <AlertDialogContent className="max-w-[460px] gap-0 p-0 rounded-[16px]">
                <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#ef444415' }}>
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <AlertDialogTitle className="text-[17px] font-semibold tracking-[-0.01em]">{t('documentMgmt.deleteSubcategoryTitle')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px] text-slate-500 mt-1">
                      {t('documentMgmt.deleteIrreversible')}
                    </AlertDialogDescription>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-[10px] text-[13px] leading-relaxed">
                    <div className="text-red-800 font-semibold mb-1">
                      {t('documentMgmt.deleteSubcategoryConfirm', { name: deletingSubcategory?.name ?? '' })}
                    </div>
                    <div className="text-red-700 text-[12px]">
                      {t('documentMgmt.deleteSubcategoryDocCount', { count: deletingCategoryDocCount })}
                    </div>
                  </div>
                </div>
                <AlertDialogFooter className="flex gap-2 justify-end px-6 py-3.5 border-t border-slate-100 bg-[#fafbfc] rounded-b-[16px]">
                  <AlertDialogCancel disabled={isDeletingCategory} className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]">
                    {t('common.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDeleteCategory}
                    className="h-9 rounded-[10px] text-[13px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 border-none"
                    disabled={isDeletingCategory}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
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
                          'hover:shadow-md transition-shadow h-full',
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
                                <CardTitle className="text-base">{subcategory.name}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
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
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-[10px] border border-[#e5e7eb] bg-white"
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
                                    doc.uploader ? `${t('documentMgmt.uploader')}: ${doc.uploader}` : null,
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
                                  title={t('documentMgmt.preview')}
                                >
                                  <img src={previewIcon} alt={t('documentMgmt.preview')} className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 파일 교체 - write 권한 (editor 이상) */}
                              {canPerformDocumentAction(doc, 'write') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenFileReplaceDialog(doc.id)}
                                  title={t('documentMgmt.fileReplace')}
                                >
                                  <img src={changeIcon} alt={t('documentMgmt.fileReplace')} className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 다운로드 - download 권한 (viewer 이상) */}
                              {canPerformDocumentAction(doc, 'download') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDownloadDocument(doc.id)}
                                  title={t('documentMgmt.download')}
                                >
                                  <img src={downloadIcon} alt={t('documentMgmt.download')} className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 공유 - share 권한 (manager만) */}
                              {canPerformDocumentAction(doc, 'share') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleOpenShareDialog(doc.id)}
                                  title={t('documentMgmt.share')}
                                >
                                  <img src={shareIcon} alt={t('documentMgmt.share')} className="w-full h-full p-1.5" />
                                </Button>
                              )}
                              {/* 삭제 - delete 권한 (manager만) */}
                              {canPerformDocumentAction(doc, 'delete') && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                                  onClick={() => handleDeleteDocumentClick(doc.id)}
                                  title={t('common.delete')}
                                >
                                  <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
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
                    className={`border-2 border-dashed rounded-[10px] p-8 text-center transition-colors cursor-pointer ${
                      isDragActive
                        ? 'border-[#2563eb] bg-[#eff6ff]'
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

                  {/* OCR 추출 진행률 표시 */}
                  {isExtractingOcr && ocrPageProgress && ocrPageProgress.totalPages > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#2563eb] font-medium flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          텍스트 추출 중...
                        </span>
                        <span className="text-slate-700 font-semibold">
                          {ocrPageProgress.page}/{ocrPageProgress.totalPages} 페이지
                        </span>
                      </div>
                      <Progress value={ocrPageProgress.percent} className="w-full" />
                      <p className="text-xs text-slate-500 text-right">{ocrPageProgress.percent}% 완료</p>
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
                        <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-slate-50 text-sm whitespace-pre-wrap">
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
          <DialogContent className="max-w-[840px] h-[90vh] flex flex-col overflow-hidden gap-0 p-0 rounded-[16px]" hideClose>
            {/* V1 M4 Compact Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#eff6ff]">
                <FileText className="h-4 w-4 text-[#2563eb]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{previewDoc?.title || t('documentMgmt.docPreview')}</div>
                <div className="text-[11.5px] text-slate-500 font-mono truncate">
                  {[previewDoc?.uploader, previewDoc?.uploadDate, previewDoc?.fileSize].filter(Boolean).join(' · ') || (previewDoc?.type === 'pdf' ? 'PDF' : 'Image')}
                </div>
              </div>
              {previewDoc && (
                <>
                  <button
                    onClick={() => handleDownloadDocument(previewDoc.id)}
                    className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t('documentMgmt.download')}
                  </button>
                  <button
                    onClick={() => {
                      setSharingDocumentId(previewDoc.id);
                      handleOpenShareDialog(previewDoc.id);
                    }}
                    className="h-8 px-2.5 rounded-lg border border-[#e5e7eb] bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {t('documentMgmt.share', { defaultValue: '공유' })}
                  </button>
                </>
              )}
              <button
                onClick={() => { setPreviewOpen(false); setImageZoom(100); setImageRotation(0); }}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* V1 M4 Two-panel layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Viewer */}
              <div className="flex-1 bg-[#f1f5f9] flex flex-col overflow-hidden relative">
                {previewDoc?.type === 'image' && (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 border-b border-slate-200 bg-white/80 backdrop-blur-sm shrink-0">
                    <button onClick={() => setImageZoom(Math.max(25, imageZoom - 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                      <ZoomOut className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <span className="text-[12px] font-medium text-slate-700 min-w-[48px] text-center font-mono">{imageZoom}%</span>
                    <button onClick={() => setImageZoom(Math.min(200, imageZoom + 25))} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50">
                      <ZoomIn className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <button onClick={() => setImageRotation((imageRotation + 90) % 360)} className="w-8 h-8 rounded-lg border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-slate-50" title={t('documentMgmt.rotate90')}>
                      <RotateCw className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                  </div>
                )}
                <div
                  className="flex-1 overflow-auto flex items-center justify-center p-8"
                  onWheel={(e) => {
                    if (previewDoc?.type === 'image' && e.ctrlKey) {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -10 : 10;
                      setImageZoom((prev) => Math.max(25, Math.min(200, prev + delta)));
                    }
                  }}
                >
                  {previewLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                      <p className="text-[13px] text-slate-500">{t('documentMgmt.loadingDoc')}</p>
                    </div>
                  ) : previewDoc?.type === 'pdf' ? (
                    <div className="w-full h-full"><PdfViewer url={previewDoc.url} /></div>
                  ) : previewDoc?.type === 'image' ? (
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
                      className="rounded shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)]"
                    />
                  ) : null}
                </div>
              </div>

              {/* Right: OCR + Meta sidebar */}
              <div className="w-[280px] border-l border-[#e5e7eb] bg-white flex flex-col overflow-hidden shrink-0 hidden md:flex">
                <div className="p-4 border-b border-slate-100 flex-1 overflow-auto">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">
                    OCR {t('documentMgmt.extractedText', { defaultValue: '추출 텍스트' })} · {previewDoc?.ocrText?.length?.toLocaleString() ?? 0}{t('documentMgmt.chars', { defaultValue: '자' })}
                  </div>
                  <div className="text-[11.5px] text-slate-500 leading-relaxed whitespace-pre-wrap">
                    {previewDoc?.ocrText || t('documentMgmt.noOcrText', { defaultValue: 'OCR 텍스트 없음' })}
                  </div>
                </div>
                <div className="p-4 border-b border-slate-100 shrink-0">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">
                    {t('documentMgmt.docInfo', { defaultValue: '문서 정보' })}
                  </div>
                  <div className="flex flex-col gap-2 text-[12px]">
                    {previewDoc?.uploader && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('documentMgmt.uploader', { defaultValue: '업로더' })}</span>
                        <span className="text-slate-900 font-medium">{previewDoc.uploader}</span>
                      </div>
                    )}
                    {previewDoc?.uploadDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('documentMgmt.uploadDate', { defaultValue: '업로드일' })}</span>
                        <span className="text-slate-900 font-medium font-mono">{previewDoc.uploadDate}</span>
                      </div>
                    )}
                    {previewDoc?.fileSize && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">{t('documentMgmt.fileSize', { defaultValue: '파일 크기' })}</span>
                        <span className="text-slate-900 font-medium font-mono">{previewDoc.fileSize}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* NFC 등록 다이어로그 — 펄스 애니메이션 (이미 등록된 태그는 내부에서 자동 해제) */}
        {nfcTargetSubcategory && (
          <NFCRegistrationDialog
            open={nfcDialogOpen}
            onOpenChange={(open) => {
              setNfcDialogOpen(open);
              if (!open) setNfcTargetSubcategory(null);
            }}
            categoryId={nfcTargetSubcategory.id}
            categoryName={nfcTargetSubcategory.name}
            onSuccess={handleNfcRegistrationSuccess}
          />
        )}

        {/* 문서 공유 다이얼로그 */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent variant="v1" className="max-w-[560px] max-h-[80vh] overflow-hidden flex flex-col">
            <V1ModalHeader icon={Share2} title={t('documentMgmt.shareDoc')} sub={t('documentMgmt.shareDocDesc')} />

            {/* V1 탭 */}
            <div className="flex px-6 border-b border-slate-100">
              {[
                { key: 'new' as const, label: t('documentMgmt.newShare') },
                { key: 'existing' as const, label: `${t('documentMgmt.shareStatus')} (${existingShares.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`py-2.5 px-3.5 text-[13px] font-medium bg-transparent border-none cursor-pointer ${
                    activeShareTab === tab.key
                      ? 'text-slate-900 font-semibold border-b-2 border-[#2563eb] -mb-px'
                      : 'text-slate-500 border-b-2 border-transparent -mb-px'
                  }`}
                  onClick={() => setActiveShareTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3.5">
              {activeShareTab === 'new' ? (
                <>
                  <div className="flex justify-between items-center text-[12px] text-slate-500">
                    <span>{companyUsers.length}{t('documentMgmt.people', { defaultValue: '명' })} — <strong className="text-slate-900">{selectedUserIds.length}</strong> {t('documentMgmt.selected', { defaultValue: '선택됨' })}</span>
                    {companyUsers.length > 0 && (
                      <button onClick={handleSelectAllUsers} className="bg-transparent border-none text-[#2563eb] text-[12px] font-medium cursor-pointer p-0">
                        {selectedUserIds.length === companyUsers.length ? t('documentMgmt.deselectAll') : t('documentMgmt.selectAll')}
                      </button>
                    )}
                  </div>

                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingUsers')}</span>
                    </div>
                  ) : companyUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[13px]">{t('documentMgmt.noUsersToShare')}</div>
                  ) : (
                    <div className="flex flex-col gap-1 border border-slate-100 rounded-[10px] p-1 max-h-[240px] overflow-auto">
                      {companyUsers.map((companyUser) => (
                        <label
                          key={companyUser.id}
                          className={`flex items-center gap-2.5 py-2 px-2.5 rounded-lg cursor-pointer ${
                            selectedUserIds.includes(companyUser.id) ? 'bg-[#eff6ff]' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleToggleUser(companyUser.id)}
                        >
                          <input type="checkbox" checked={selectedUserIds.includes(companyUser.id)} readOnly className="w-[15px] h-[15px] accent-[#2563eb] m-0" />
                          <div className="w-[30px] h-[30px] rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold text-[12px] shrink-0">
                            {companyUser.name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-slate-900 truncate">{companyUser.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{companyUser.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={sendEmailNotification} onChange={(e) => setSendEmailNotification(e.target.checked)} className="w-[15px] h-[15px] accent-[#2563eb] m-0" />
                    <span className="text-[13px] text-slate-900">{t('documentMgmt.emailNotification')}</span>
                  </label>
                </>
              ) : (
                <>
                  {isLoadingShares ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-500">{t('documentMgmt.loadingShares')}</span>
                    </div>
                  ) : existingShares.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-[13px]">{t('documentMgmt.noSharedUsers')}</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {existingShares.map((share: any) => (
                        <div key={share.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate">{share.users?.name || t('common.unknown')}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{share.users?.email || ''}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleUnshare(share.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-[12px]">
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <V1ModalFooter>
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
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.close')}
              </Button>
              {activeShareTab === 'new' && (
                <Button
                  onClick={handleSendShare}
                  disabled={isSendingShare || selectedUserIds.length === 0}
                  className="h-9 rounded-[10px] text-[13px] font-semibold "
                >
                  {isSendingShare ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      {t('documentMgmt.sharing')}
                    </>
                  ) : (
                    <><Share2 className="h-3.5 w-3.5 mr-1.5" />{t('documentMgmt.shareToCount', { count: selectedUserIds.length })}</>
                  )}
                </Button>
              )}
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* 파일 교체 다이얼로그 */}
        <Dialog open={fileReplaceDialogOpen} onOpenChange={(open) => !open && handleCloseFileReplaceDialog()}>
          <DialogContent variant="v1" className="max-w-[560px]">
            <V1ModalHeader icon={Upload} title={t('documentMgmt.fileReplace')} sub={t('documentMgmt.fileReplaceDesc')} />
            <V1ModalBody>
              {/* V1 Dropzone */}
              <div
                {...getReplaceRootProps()}
                className={`border-2 border-dashed rounded-[12px] p-7 text-center cursor-pointer transition-colors ${
                  isReplaceDragActive
                    ? 'border-[#2563eb] bg-[#eff6ff]'
                    : replaceFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-[#2563eb] bg-[#eff6ff]'
                }`}
              >
                <input {...getReplaceInputProps()} />
                {isExtractingReplaceOcr ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                    <p className="text-[13px] text-[#2563eb] font-medium">{t('documentMgmt.extractingOcr')}</p>
                  </div>
                ) : replaceFile ? (
                  <div className="flex flex-col items-center gap-2.5 w-full overflow-hidden">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-[13px] font-medium text-emerald-700 truncate w-full text-center">{replaceFile.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {replaceOcrText ? `${replaceOcrText.length.toLocaleString()}${t('documentMgmt.chars')} ${t('documentMgmt.extracted')}` : t('documentMgmt.noOcrText')}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-11 h-11 rounded-[10px] bg-white flex items-center justify-center">
                      <Upload className="h-[22px] w-[22px] text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{isReplaceDragActive ? t('documentMgmt.dropHere') : t('documentMgmt.clickOrDrag')}</p>
                      <p className="text-[12px] text-slate-500 mt-1">{t('documentMgmt.supportedFormatsShort')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* OCR 추출 텍스트 */}
              {replaceFile && !isExtractingReplaceOcr && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-medium">{t('documentMgmt.ocrExtractedText')}</Label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {replaceOcrText.length.toLocaleString()}{t('documentMgmt.chars')}
                    </span>
                  </div>
                  <Textarea
                    value={replaceOcrText}
                    onChange={(e) => setReplaceOcrText(e.target.value)}
                    readOnly={!isEditingReplaceOcr}
                    className={`min-h-[128px] max-h-48 text-[13px] font-mono rounded-lg ${
                      !isEditingReplaceOcr ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder={replaceOcrText ? undefined : t('documentMgmt.noOcrText')}
                  />
                </div>
              )}
            </V1ModalBody>
            <V1ModalFooter>
              <Button
                variant="outline"
                onClick={handleCloseFileReplaceDialog}
                disabled={isReplacingFile}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingReplaceOcr(!isEditingReplaceOcr)}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
                className="h-9 rounded-[10px] text-[13px] font-semibold border-[#e5e7eb]"
              >
                {isEditingReplaceOcr ? t('documentMgmt.editDone') : t('common.edit')}
              </Button>
              <Button
                onClick={handleReplaceFile}
                disabled={!replaceFile || isReplacingFile || isExtractingReplaceOcr}
                className="h-9 rounded-[10px] text-[13px] font-semibold "
              >
                {isReplacingFile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    {t('common.saving')}
                  </>
                ) : (
                  t('common.save')
                )}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>

        {/* 업로드 성공 팝업 */}
        <Dialog open={uploadSuccessDialogOpen} onOpenChange={setUploadSuccessDialogOpen}>
          <DialogContent variant="v1" className="max-w-sm">
            <V1ModalHeader icon={CheckCircle2} title={t('documentMgmt.uploadComplete')} sub={t('documentMgmt.uploadSuccessDesc', { count: uploadSuccessCount })} />
            <V1ModalFooter>
              <Button
                className="w-full h-9 rounded-[10px] text-[13px] font-semibold "
                onClick={() => {
                  setUploadSuccessDialogOpen(false);
                  setActiveTab('documents');
                }}
              >
                {t('documentMgmt.viewAllDocuments')}
              </Button>
            </V1ModalFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
