import { useEffect, useState } from 'react';
import {
  Activity,
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
import type { OperatorActivityLog } from '@/types/operator';
import {
  V1PageHeader,
  V1Chip,
  v1Card,
  V1,
} from '@/components/ui/v1-components';

type ChipVariant = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'neutral';

const actionConfig: Record<string, { label: string; icon: any; variant: ChipVariant; color: string }> = {
  suspend_user: { label: '회원 정지', icon: ShieldOff, variant: 'red', color: V1.red },
  lift_suspension: { label: '정지 해제', icon: ShieldCheck, variant: 'emerald', color: V1.emerald },
  update_report: { label: '신고 처리', icon: Flag, variant: 'amber', color: V1.amber },
  reply_inquiry: { label: '문의 답변', icon: MessageSquare, variant: 'blue', color: V1.blue },
  create_notice: { label: '공지 작성', icon: Megaphone, variant: 'violet', color: V1.violet },
  update_notice: { label: '공지 수정', icon: Megaphone, variant: 'violet', color: V1.violet },
  delete_notice: { label: '공지 삭제', icon: Megaphone, variant: 'neutral', color: V1.muted },
  default: { label: '기타', icon: Settings, variant: 'neutral', color: V1.muted },
};

export function ActivityLogs() {
  const [logs, setLogs] = useState<OperatorActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('all');
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

      if (actionFilter && actionFilter !== 'all') {
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
        <V1PageHeader
          eyebrow={`총 ${total.toLocaleString()}건 기록`}
          title="활동 로그"
          sub="운영자 활동 기록을 확인합니다."
        />

        {/* Card */}
        <div className={v1Card}>
          {/* Filter */}
          <div className="px-5 py-4 border-b border-border/50">
            <div className="flex items-center justify-between">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-48 rounded-[10px]">
                  <SelectValue placeholder="활동 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 활동</SelectItem>
                  <SelectItem value="suspend_user">회원 정지</SelectItem>
                  <SelectItem value="lift_suspension">정지 해제</SelectItem>
                  <SelectItem value="update_report">신고 처리</SelectItem>
                  <SelectItem value="reply_inquiry">문의 답변</SelectItem>
                  <SelectItem value="create_notice">공지 작성</SelectItem>
                  <SelectItem value="update_notice">공지 수정</SelectItem>
                  <SelectItem value="delete_notice">공지 삭제</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                총 {total.toLocaleString()}건
              </span>
            </div>
          </div>

          {/* Log List */}
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p>활동 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((log) => {
                const config = getActionConfig(log.action);
                const Icon = config.icon;

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${config.color}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {log.operatorName || '운영자'}
                          </span>
                          <V1Chip variant={config.variant}>{config.label}</V1Chip>
                          {log.targetType && (
                            <span className="text-xs text-muted-foreground">
                              ({log.targetType})
                            </span>
                          )}
                        </div>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {typeof log.details === 'object'
                              ? Object.entries(log.details)
                                  .filter(([_, v]) => v)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')
                              : String(log.details)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
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
