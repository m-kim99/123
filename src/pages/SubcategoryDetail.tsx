import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Smartphone, Upload } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { readNFCUid } from '@/lib/nfc';
import { formatDateTimeSimple } from '@/lib/utils';

export function SubcategoryDetail() {
  const { parentCategoryId, subcategoryId } = useParams<{
    parentCategoryId: string;
    subcategoryId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const {
    parentCategories,
    subcategories,
    documents,
    fetchSubcategories,
    fetchDocuments,
    uploadDocument,
    registerNfcTag,
  } = useDocumentStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRegisteringNfc, setIsRegisteringNfc] = useState(false);

  useEffect(() => {
    if (!parentCategoryId) return;
    fetchSubcategories(parentCategoryId);
    if (documents.length === 0) {
      fetchDocuments();
    }
  }, [parentCategoryId, fetchSubcategories, fetchDocuments, documents.length]);

  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === subcategoryId),
    [subcategories, subcategoryId]
  );

  const parentCategory = useMemo(
    () => parentCategories.find((pc) => pc.id === parentCategoryId),
    [parentCategories, parentCategoryId]
  );

  const subcategoryDocuments = useMemo(
    () =>
      subcategoryId
        ? documents.filter((d) => d.subcategoryId === subcategoryId)
        : [],
    [documents, subcategoryId]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setUploadTitle(file.name);
    } else {
      setUploadTitle('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !subcategory || !parentCategoryId) {
      return;
    }

    const title = uploadTitle.trim() || selectedFile.name;

    setIsUploading(true);
    try {
      await uploadDocument({
        name: title,
        originalFileName: selectedFile.name,
        categoryId: undefined,
        parentCategoryId,
        subcategoryId: subcategory.id,
        departmentId: subcategory.departmentId,
        uploader: user?.name || user?.email || 'Unknown',
        classified: false,
        file: selectedFile,
        ocrText: undefined,
      });

      toast({
        title: '업로드 완료',
        description: '문서가 업로드되었습니다.',
      });

      setSelectedFile(null);
      setUploadTitle('');
    } catch (error) {
      console.error('문서 업로드 실패:', error);
      toast({
        title: '업로드 실패',
        description: '문서를 업로드하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterNfc = async () => {
    if (!subcategory) {
      return;
    }

    setIsRegisteringNfc(true);
    try {
      const uid = await readNFCUid();
      await registerNfcTag(subcategory.id, uid);

      toast({
        title: 'NFC 등록 완료',
        description: '세부 카테고리에 NFC UID가 등록되었습니다.',
      });
    } catch (error) {
      console.error('NFC 등록 실패:', error);
      toast({
        title: 'NFC 등록 실패',
        description:
          error instanceof Error
            ? error.message
            : 'NFC 태그를 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsRegisteringNfc(false);
    }
  };

  if (!subcategoryId) {
    return null;
  }

  if (!subcategory) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <p className="text-slate-500">세부 카테고리를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {subcategory.name}
              </h1>
              <p className="text-slate-500 mt-1">
                {subcategory.description || '설명이 등록되어 있지 않습니다.'}
              </p>
              {parentCategory && (
                <p className="text-sm text-slate-500 mt-1">
                  상위 대분류: {parentCategory.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {subcategory.nfcRegistered && (
                <Badge className="text-sm">
                  <Smartphone className="h-4 w-4 mr-1" />
                  NFC 등록됨
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={handleRegisterNfc}
                disabled={isRegisteringNfc}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {subcategory.nfcRegistered
                  ? 'NFC 다시 등록'
                  : 'NFC UID 등록'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">
                {subcategoryDocuments.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 상태</p>
              <p className="text-2xl font-bold mt-2">
                {subcategory.nfcRegistered ? '활성' : '비활성'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">보관 위치</p>
              <p className="text-sm font-bold mt-2">
                {subcategory.storageLocation || '미지정'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>문서 목록</CardTitle>
              <CardDescription className="mt-1">
                이 세부 카테고리에 속한 문서입니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {subcategoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 세부 카테고리에 문서가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {subcategoryDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-700" />
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
                          {[formatDateTimeSimple(doc.uploadDate), doc.uploader || null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>문서 업로드</CardTitle>
            <CardDescription>
              이 세부 카테고리에 새 문서를 업로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>파일</Label>
                <Input type="file" onChange={handleFileChange} />
              </div>
              <div className="space-y-2">
                <Label>문서 제목</Label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="파일 이름이 기본값으로 사용됩니다."
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? '업로드 중...' : '업로드'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
