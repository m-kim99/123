import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
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
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { extractTextFromPDF } from '@/lib/ocr';

export function DocumentManagement() {
  const user = useAuthStore((state) => state.user);
  const { departments, categories, documents, addCategory, deleteCategory, deleteDocument, uploadDocument } =
    useDocumentStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const primaryColor = isAdmin ? '#FF8C42' : '#10B981';

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    departmentId: '',
    nfcRegistered: false,
    storageLocation: '',
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    categoryId: '',
    departmentId: '',
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const filteredCategories = isAdmin
    ? categories
    : categories.filter((c) => c.departmentId === user?.departmentId);

  const filteredDocuments = isAdmin
    ? documents
    : documents.filter((d) => d.departmentId === user?.departmentId);

  const handleAddCategory = () => {
    if (newCategory.name && newCategory.departmentId) {
      addCategory(newCategory);
      setNewCategory({
        name: '',
        description: '',
        departmentId: '',
        nfcRegistered: false,
        storageLocation: '',
      });
    }
  };


  // react-dropzone 설정
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setUploadFile(file);
        setUploadError(null);
        setUploadSuccess(false);
      } else {
        setUploadError('PDF 파일만 업로드 가능합니다.');
        setUploadFile(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setUploadError('파일 크기는 10MB를 초과할 수 없습니다.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setUploadError('PDF 파일만 업로드 가능합니다.');
      } else {
        setUploadError('파일 업로드에 실패했습니다.');
      }
    },
  });

  // 문서 업로드 및 OCR 처리
  const handleUpload = async () => {
    if (!uploadFile || !uploadData.categoryId || !user) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('파일 업로드 중...');
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // 카테고리에서 부서 정보 가져오기
      const category = categories.find((c) => c.id === uploadData.categoryId);
      if (!category) {
        throw new Error('카테고리를 찾을 수 없습니다.');
      }

      // OCR 처리
      setUploadStatus('OCR 처리 중...');
      let ocrText = '';
      
      try {
        ocrText = await extractTextFromPDF(uploadFile, (progress) => {
          // OCR 진행률을 업로드 진행률로 변환 (0-90%)
          const ocrProgress = Math.round(progress.percent * 0.9);
          setUploadProgress(ocrProgress);
          setUploadStatus(progress.status || 'OCR 처리 중...');
        });
        console.log('OCR 텍스트 추출 완료:', ocrText.length, '자');
      } catch (ocrError) {
        console.error('OCR 처리 오류:', ocrError);
        // OCR 실패해도 업로드는 계속 진행
        setUploadStatus('OCR 처리 실패, 업로드 계속 진행 중...');
      }

      // 문서 업로드
      setUploadProgress(95);
      setUploadStatus('문서 저장 중...');

      await uploadDocument({
        name: uploadFile.name,
        categoryId: uploadData.categoryId,
        departmentId: category.departmentId,
        uploader: user.name || user.email || 'Unknown',
        classified: false,
        fileUrl: uploadFile.name, // 실제 파일 경로는 추후 Supabase Storage로 업로드
        ocrText: ocrText,
      });

      setUploadProgress(100);
      setUploadStatus('완료!');
      setUploadSuccess(true);

      // 성공 후 초기화
      setTimeout(() => {
        setUploadFile(null);
        setUploadData({ categoryId: '', departmentId: '' });
        setUploadProgress(0);
        setUploadStatus('');
        setUploadSuccess(false);
        // 파일 입력 초기화
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }, 2000);
    } catch (error) {
      console.error('업로드 오류:', error);
      setUploadError(
        error instanceof Error ? error.message : '문서 업로드 중 오류가 발생했습니다.'
      );
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">문서 관리</h1>
          <p className="text-slate-500 mt-1">카테고리와 문서를 관리하세요</p>
        </div>

        <Tabs defaultValue="categories" className="space-y-4">
          <TabsList>
            <TabsTrigger value="categories">카테고리 관리</TabsTrigger>
            <TabsTrigger value="documents">전체 문서</TabsTrigger>
            <TabsTrigger value="upload">문서 업로드</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button style={{ backgroundColor: primaryColor }}>
                    <Plus className="h-4 w-4 mr-2" />
                    카테고리 추가
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 카테고리 추가</DialogTitle>
                    <DialogDescription>
                      새로운 문서 카테고리를 생성합니다
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>카테고리 이름</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, name: e.target.value })
                        }
                        placeholder="예: 계약서"
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
                        placeholder="카테고리 설명"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>부서</Label>
                      <Select
                        value={newCategory.departmentId}
                        onValueChange={(value) =>
                          setNewCategory({ ...newCategory, departmentId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="부서 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
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
                      style={{ backgroundColor: primaryColor }}
                    >
                      추가
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => {
                const dept = departments.find((d) => d.id === category.departmentId);
                return (
                  <Card
                    key={category.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/category/${category.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {category.description}
                          </CardDescription>
                        </div>
                        {category.nfcRegistered && (
                          <Badge variant="outline" className="ml-2">
                            <Smartphone className="h-3 w-3 mr-1" />
                            NFC
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">부서</span>
                          <span className="font-medium">{dept?.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">문서 수</span>
                          <span className="font-medium">
                            {category.documentCount}개
                          </span>
                        </div>
                        {category.storageLocation && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">보관 위치</span>
                            <span className="font-medium text-xs">
                              {category.storageLocation}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCategory(category.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>전체 문서 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredDocuments.map((doc) => {
                    const category = categories.find((c) => c.id === doc.categoryId);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
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
                              {doc.uploadDate} · {doc.uploader} · {category?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select
                    value={uploadData.categoryId}
                    onValueChange={(value) =>
                      setUploadData({ ...uploadData, categoryId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        {uploadFile
                          ? uploadFile.name
                          : isDragActive
                          ? '파일을 여기에 놓으세요'
                          : '클릭하여 파일 선택 또는 드래그 앤 드롭'}
                      </p>
                      <p className="text-xs text-slate-500">
                        PDF 파일만 업로드 가능 (최대 10MB)
                      </p>
                    </div>
                  </div>

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
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    업로드 가이드라인
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• PDF 파일 형식만 지원됩니다</li>
                    <li>• 파일 크기는 10MB를 초과할 수 없습니다</li>
                    <li>• 문서명은 명확하게 작성해주세요</li>
                    <li>• 기밀 문서는 별도로 표시해주세요</li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={!uploadFile || !uploadData.categoryId || isUploading}
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
      </div>
    </DashboardLayout>
  );
}
