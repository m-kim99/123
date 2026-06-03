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

      // 각 회사별 통계 수집
      const companiesWithStats: Company[] = await Promise.all(
        (data || []).map(async (c: any) => {
          const [
            { count: memberCount },
            { count: documentCount },
            { count: departmentCount },
          ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', c.id),
            supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', c.id),
            supabase.from('departments').select('*', { count: 'exact', head: true }).eq('company_id', c.id),
          ]);

          return {
            id: c.id,
            name: c.name,
            code: c.code,
            createdAt: c.created_at,
            memberCount: memberCount || 0,
            documentCount: documentCount || 0,
            departmentCount: departmentCount || 0,
          };
        })
      );

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">회사 관리</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            등록된 회사를 조회합니다. (총 {total.toLocaleString()}개)
          </p>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="회사명 또는 코드로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>

        {/* Company List */}
        <div className="grid gap-4">
          {isLoading ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500">
              로딩 중...
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            companies.map((company) => (
              <div
                key={company.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {company.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        코드: {company.code}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span>{company.memberCount}명</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{company.documentCount}건</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{company.departmentCount}부서</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
