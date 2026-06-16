import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { submitReport, REPORT_CATEGORIES } from '@/lib/support';
import type { ReportTargetType, ReportCategory } from '@/types/operator';

interface ReportDialogProps {
  /** 신고 대상 종류 (개별 게시물/문서는 'document') */
  targetType: ReportTargetType;
  /** 신고 대상 ID (개별 게시물/문서의 id) */
  targetId: string;
  /** 대상이 속한 회사 ID (선택) */
  targetCompanyId?: string | null;
  /** 트리거 버튼 커스텀 클래스 */
  triggerClassName?: string;
  /** 트리거 버튼 라벨 */
  triggerLabel?: string;
}

/**
 * 개별 게시물(문서) 신고 버튼 + 다이얼로그.
 * 데이터 계층(submitReport)을 그대로 사용하며, 어디서든 재사용 가능.
 */
export function ReportDialog({
  targetType,
  targetId,
  targetCompanyId,
  triggerClassName,
  triggerLabel = '신고',
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory('');
    setReason('');
  };

  const handleSubmit = async () => {
    if (!category) {
      toast({ title: '신고 사유를 선택해 주세요.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const result = await submitReport({
      targetType,
      targetId,
      category: category as ReportCategory,
      reason: reason.trim(),
      targetCompanyId: targetCompanyId ?? null,
    });
    setSubmitting(false);

    if (result.success) {
      toast({
        title: '신고가 접수되었습니다.',
        description: '운영팀이 검토 후 조치합니다.',
      });
      setOpen(false);
      reset();
    } else {
      toast({
        title: '신고 실패',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={triggerLabel}
        className={
          triggerClassName ??
          'h-8 px-2.5 rounded-lg border border-[#e5e7eb] dark:border-white/[0.08] bg-white dark:bg-[#1e293b] text-[12px] font-medium text-slate-700 dark:text-[#cbd5e1] hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-[#334155] flex items-center gap-1.5 shrink-0'
        }
      >
        <Flag className="h-3.5 w-3.5" />
        {triggerLabel}
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" />
              게시물 신고
            </DialogTitle>
            <DialogDescription>
              부적절한 콘텐츠를 신고하면 운영팀이 검토 후 조치합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>신고 사유</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ReportCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="사유를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>상세 내용 (선택)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="신고 사유를 자세히 적어주시면 검토에 도움이 됩니다."
                className="min-h-24 resize-none"
                maxLength={1000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  접수 중...
                </>
              ) : (
                '신고하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
