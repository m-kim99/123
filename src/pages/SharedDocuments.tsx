import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useDocumentStore } from '@/store/documentStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, X, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function SharedDocuments() {
  const { sharedDocuments, fetchSharedDocuments, unshareDocument, documents } =
    useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSharedDocuments();
  }, [fetchSharedDocuments]);

  const filteredShares = sharedDocuments.filter((share) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      share.documentName?.toLowerCase().includes(query) ||
      share.sharedByUserName?.toLowerCase().includes(query) ||
      share.departmentName?.toLowerCase().includes(query) ||
      share.categoryName?.toLowerCase().includes(query)
    );
  });

  const handleDownload = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc?.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  const handleView = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc?.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">공유받은 문서함</h1>
          <p className="text-slate-500 mt-1">
            다른 팀원이 나에게 공유한 문서 목록입니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>공유 문서 목록</CardTitle>
                <CardDescription className="mt-1">
                  총 {filteredShares.length}개의 문서가 공유되었습니다
                </CardDescription>
              </div>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="문서 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredShares.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchQuery
                    ? '검색 결과가 없습니다'
                    : '공유받은 문서가 없습니다'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>문서명</TableHead>
                    <TableHead>공유한 사람</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>공유일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShares.map((share) => (
                    <TableRow key={share.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{share.documentName}</p>
                          {share.message && (
                            <p className="text-xs text-slate-500 mt-1">
                              메모: {share.message}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{share.sharedByUserName}</TableCell>
                      <TableCell>{share.departmentName}</TableCell>
                      <TableCell>{share.categoryName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            share.permission === 'download'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {share.permission === 'download'
                            ? '다운로드'
                            : '보기'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(share.sharedAt),
                          'yyyy-MM-dd HH:mm',
                          { locale: ko }
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(share.documentId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {share.permission === 'download' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(share.documentId)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unshareDocument(share.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
