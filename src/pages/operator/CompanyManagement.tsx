import { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  Users,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1,
} from '@/components/ui/v1-components';

interface Company {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  memberCount: number;
  documentCount: number;
  departmentCount: number;
}

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadCompanies();
  }, [page]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select('id, name, code, created_at', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const companyIds = data?.map((c: any) => c.id) || [];

      if (companyIds.length === 0) {
        setCompanies([]);
        setTotal(0);
        return;
      }

      const [userCounts, docCounts, deptCounts] = await Promise.all([
        supabase.from('users').select('company_id').in('company_id', companyIds),
        supabase.from('documents').select('company_id').in('company_id', companyIds),
        supabase.from('departments').select('company_id').in('company_id', companyIds),
      ]);

      const countByCompany = (items: any[]) =>
        items.reduce((acc, item) => {
          acc[item.company_id] = (acc[item.company_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const userMap = countByCompany(userCounts.data || []);
      const docMap = countByCompany(docCounts.data || []);
      const deptMap = countByCompany(deptCounts.data || []);

      const companiesWithStats: Company[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        createdAt: c.created_at,
        memberCount: userMap[c.id] || 0,
        documentCount: docMap[c.id] || 0,
        departmentCount: deptMap[c.id] || 0,
      }));

      setCompanies(companiesWithStats);
      setTotal(count || 0);
    } catch (error) {
      console.error('회사 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadCompanies();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <V1PageHeader
          eyebrow={`총 ${total.toLocaleString()}개 회사`}
          title="회사 관리"
          sub="등록된 회사를 조회하고 관리합니다."
        />

        {/* Table Card */}
        <div className={v1Card}>
          {/* Search in card header */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-3 flex-1 max-w-md">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="회사명 또는 코드로 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 rounded-[10px]"
                  />
                </div>
                <Button onClick={handleSearch} className="rounded-[10px]">검색</Button>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                총 {total.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Company List */}
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                로딩 중...
              </div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                        style={{ background: `${V1.emerald}15` }}
                      >
                        <Building2 className="w-5 h-5" style={{ color: V1.emerald }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {company.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          코드: {company.code}
                        </p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <V1Chip variant="blue" icon={Users}>
                            {company.memberCount}명
                          </V1Chip>
                          <V1Chip variant="neutral" icon={FileText}>
                            {company.documentCount}건
                          </V1Chip>
                          <V1Chip variant="emerald" icon={Building2}>
                            {company.departmentCount}부서
                          </V1Chip>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(company.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
}
