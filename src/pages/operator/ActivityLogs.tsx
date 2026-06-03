import { useEffect, useState } from 'react';
import {
  Activity,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  ShieldCheck,
  Flag,
  MessageSquare,
  Megaphone,
  Settings,
} from 'lucide-react';
import { OperatorLayout } from '@/components/OperatorLayout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OperatorActivityLog } from '@/types/operator';

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  suspend_user: { label: '회원 정지', icon: ShieldOff, color: 'text-red-500' },
  lift_suspension: { label: '정지 해제', icon: ShieldCheck, color: 'text-green-500' },
  update_report: { label: '신고 처리', icon: Flag, color: 'text-amber-500' },
  reply_inquiry: { label: '문의 답변', icon: MessageSquare, color: 'text-blue-500' },
  create_notice: { label: '공지 작성', icon: Megaphone, color: 'text-violet-500' },
  update_notice: { label: '공지 수정', icon: Megaphone, color: 'text-violet-500' },
  delete_notice: { label: '공지 삭제', icon: Megaphone, color: 'text-slate-500' },
  default: { label: '기타', icon: Settings, color: 'text-slate-500' },
};

export function ActivityLogs() {
  const [logs, setLogs] = useState<OperatorActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 30;

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('operator_activity_logs')
        .select(`
          *,
          operator:operator_id(name)
        `, { count: 'exact' });

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      const mappedLogs: OperatorActivityLog[] = (data || []).map((l: any) => ({
        id: l.id,
        operatorId: l.operator_id,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        details: l.details,
        ipAddress: l.ip_address,
        userAgent: l.user_agent,
        createdAt: l.created_at,
        operatorName: l.operator?.name,
      }));

      setLogs(mappedLogs);
      setTotal(count || 0);
    } catch (error) {
      console.error('활동 로그 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getActionConfig = (action: string) => {
    return actionConfig[action] || actionConfig.default;
  };

  return (
    <OperatorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">활동 로그</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            운영자 활동 기록을 확인합니다. (총 {total.toLocaleString()}건)
          </p>
        </div>

        {/* Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="활동 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="suspend_user">회원 정지</SelectItem>
              <SelectItem value="lift_suspension">정지 해제</SelectItem>
              <SelectItem value="update_report">신고 처리</SelectItem>
              <SelectItem value="reply_inquiry">문의 답변</SelectItem>
              <SelectItem value="create_notice">공지 작성</SelectItem>
              <SelectItem value="update_notice">공지 수정</SelectItem>
              <SelectItem value="delete_notice">공지 삭제</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>활동 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {logs.map((log) => {
                const config = getActionConfig(log.action);
                const Icon = config.icon;

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5', config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {log.operatorName || '운영자'}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {config.label}
                          </span>
                          {log.targetType && (
                            <span className="text-sm text-slate-500">
                              ({log.targetType})
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-slate-500 mt-1 truncate">
                            {typeof log.details === 'object'
                              ? Object.entries(log.details)
                                  .filter(([_, v]) => v)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')
                              : String(log.details)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
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
      </div>
    </OperatorLayout>
  );
}
