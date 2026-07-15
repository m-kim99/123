import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import {
  getScaffoldTemplate,
  INDUSTRY_KEYS,
  type IndustryKey,
  type ScaffoldDept,
} from '@/lib/scaffoldTemplates';

const MAX_DEPARTMENTS = 8;
const MAX_CATEGORIES_PER_DEPT = 6;

interface EditableDept {
  name: string;
  cats: string; // 쉼표 구분 대분류 목록 (편집 편의)
}

function toEditable(depts: ScaffoldDept[]): EditableDept[] {
  return depts.map((d) => ({ name: d.name, cats: d.categories.join(', ') }));
}

function toCode(name: string, max: number): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_').slice(0, max) || 'DEPT';
}

/**
 * 온보딩 초기 구조 설정 (하이브리드)
 * - 업종 템플릿으로 즉시 초안 → 회사 소개 입력 시 AI 맞춤 제안 → 미리보기 수정 → 일괄 생성
 * - 건너뛰기 가능. AI 실패 시 템플릿 유지 (폴백)
 */
export function OnboardingScaffold({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'ko';

  const [industry, setIndustry] = useState<IndustryKey>('office');
  const [description, setDescription] = useState('');
  const [depts, setDepts] = useState<EditableDept[]>(() => toEditable(getScaffoldTemplate('office', locale)));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectIndustry = (key: IndustryKey) => {
    setIndustry(key);
    setDepts(toEditable(getScaffoldTemplate(key, locale)));
  };

  const handleAiSuggest = async () => {
    if (!description.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('onboarding-scaffold', {
        body: {
          industry,
          description: description.trim(),
          locale,
          baseTemplate: getScaffoldTemplate(industry, locale),
        },
      });
      const suggested = (data?.departments ?? []) as ScaffoldDept[];
      if (error || suggested.length === 0) {
        toast({ title: t('onboarding.scaffoldAiFailed'), variant: 'destructive' });
      } else {
        setDepts(toEditable(suggested));
      }
    } catch {
      toast({ title: t('onboarding.scaffoldAiFailed'), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDept = (index: number, patch: Partial<EditableDept>) => {
    setDepts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const handleCreate = async () => {
    const cleaned = depts
      .map((d) => ({
        name: d.name.trim().slice(0, 50),
        categories: d.cats
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, MAX_CATEGORIES_PER_DEPT),
      }))
      .filter((d) => d.name)
      .slice(0, MAX_DEPARTMENTS);

    if (cleaned.length === 0 || isCreating) return;
    setIsCreating(true);
    try {
      for (const dept of cleaned) {
        const { data: created, error } = await supabase
          .from('departments')
          .insert({
            name: dept.name,
            code: toCode(dept.name, 10),
            company_id: companyId,
            description: null,
          })
          .select('id')
          .single();
        if (error) throw error;

        if (dept.categories.length > 0) {
          const { error: catError } = await supabase.from('categories').insert(
            dept.categories.map((c) => ({
              name: c,
              code: toCode(c, 20),
              department_id: created.id,
              company_id: companyId,
            })),
          );
          if (catError) throw catError;
        }
      }

      // 가입 시 자동 생성된 '기본 부서'가 비어 있으면 정리 (사용자 구조로 대체됐으므로)
      try {
        const { data: defaults } = await supabase
          .from('departments')
          .select('id')
          .eq('company_id', companyId)
          .eq('code', 'DEFAULT');
        for (const dd of defaults || []) {
          const [{ count: userCount }, { count: catCount }] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('department_id', dd.id),
            supabase.from('categories').select('*', { count: 'exact', head: true }).eq('department_id', dd.id),
          ]);
          if (!userCount && !catCount) {
            await supabase.from('departments').delete().eq('id', dd.id);
          }
        }
      } catch {
        // 정리 실패는 무시 (핵심 흐름 아님)
      }

      toast({ title: t('onboarding.scaffoldCreated') });
      onDone();
    } catch (err) {
      console.error('초기 구조 생성 실패:', err);
      toast({ title: t('onboarding.scaffoldCreateFailed'), variant: 'destructive' });
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#f1f5f9]">
          {t('onboarding.scaffoldTitle')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#94a3b8] mt-1">{t('onboarding.scaffoldDesc')}</p>
      </div>

      <div className="space-y-2">
        <Label>{t('onboarding.scaffoldIndustryLabel')}</Label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectIndustry(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                industry === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {t(`onboarding.industry_${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scaffold-desc">{t('onboarding.scaffoldFreeTextLabel')}</Label>
        <Textarea
          id="scaffold-desc"
          rows={2}
          placeholder={t('onboarding.scaffoldFreeTextPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!description.trim() || isGenerating}
          onClick={handleAiSuggest}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isGenerating ? t('common.loading') : t('onboarding.scaffoldAiButton')}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>{t('onboarding.scaffoldPreviewLabel')}</Label>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {depts.map((dept, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={dept.name}
                  placeholder={t('onboarding.scaffoldDeptPlaceholder')}
                  onChange={(e) => updateDept(i, { name: e.target.value })}
                  className="h-8 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setDepts((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-slate-400 hover:text-red-500 shrink-0"
                  aria-label="remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Input
                value={dept.cats}
                placeholder={t('onboarding.scaffoldCatsPlaceholder')}
                onChange={(e) => updateDept(i, { cats: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
        {depts.length < MAX_DEPARTMENTS && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDepts((prev) => [...prev, { name: '', cats: '' }])}
            className="gap-1 text-slate-500"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('onboarding.scaffoldAddDept')}
          </Button>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1" disabled={isCreating} onClick={onDone}>
          {t('onboarding.scaffoldSkip')}
        </Button>
        <Button
          type="button"
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          disabled={isCreating || depts.every((d) => !d.name.trim())}
          onClick={handleCreate}
        >
          {isCreating ? t('common.loading') : t('onboarding.scaffoldCreate')}
        </Button>
      </div>
    </div>
  );
}
