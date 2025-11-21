import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Smartphone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';

export function CategoryDetail() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { categories, documents, departments } = useDocumentStore();
  const primaryColor = '#2563eb';

  const category = categories.find((c) => c.id === categoryId);
  const categoryDocuments = documents.filter((d) => d.categoryId === categoryId);
  const department = departments.find((d) => d.id === category?.departmentId);

  if (!category) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-500">카테고리를 찾을 수 없습니다</p>
          <Button
            className="mt-4"
            onClick={() => navigate(-1)}
            style={{ backgroundColor: primaryColor }}
          >
            돌아가기
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
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
                {category.name}
              </h1>
              <p className="text-slate-500 mt-1">{category.description}</p>
            </div>
            {category.nfcRegistered && (
              <Badge className="text-sm" style={{ backgroundColor: primaryColor }}>
                <Smartphone className="h-4 w-4 mr-1" />
                NFC 등록됨
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">부서 코드</p>
              <p className="text-2xl font-bold mt-2">{department?.code}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">문서 수</p>
              <p className="text-2xl font-bold mt-2">
                {categoryDocuments.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500">NFC 상태</p>
              <p className="text-2xl font-bold mt-2">
                {category.nfcRegistered ? '활성' : '비활성'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">보관 위치</p>
                  <p className="text-sm font-bold mt-1">
                    {category.storageLocation || '미지정'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>문서 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryDocuments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                이 카테고리에 문서가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {categoryDocuments.map((doc) => (
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
                          {doc.uploadDate} · {doc.uploader}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
