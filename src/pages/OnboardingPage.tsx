import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore, UserRole } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { OnboardingScaffold } from '@/components/OnboardingScaffold';

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    isLoading,
    completeOnboarding,
  } = useAuthStore();

  const [role, setRole] = useState<UserRole>('team');
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [companyCodeVerified, setCompanyCodeVerified] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 관리자 온보딩 완료 후 초기 구조 설정 위저드 (값이 있으면 표시 중)
  const [scaffoldCompanyId, setScaffoldCompanyId] = useState<string | null>(null);
  // completeOnboarding이 user.companyId를 설정하는 순간 아래 가드가 대시보드로
  // 보내버리므로, 위저드 표시 판단이 끝날 때까지 리다이렉트를 보류하는 플래그
  const pendingScaffoldRef = useRef(false);

  // 잘못 들어온 경우 보호
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // 이미 회사가 있는 경우 대시보드로 보냄 (초기 구조 위저드 표시/판단 중엔 유지)
    if (user.companyId && !scaffoldCompanyId && !pendingScaffoldRef.current) {
      navigate(user.role === 'admin' ? '/admin' : '/team');
    }
  }, [user, navigate, scaffoldCompanyId]);

  // Google 이름/이메일로 기본 이름 채우기
  useEffect(() => {
    if (user) {
      const defaultName =
        user.name || user.email?.split('@')[0] || '';
      setName(defaultName);
    }
  }, [user]);

  const handleVerifyCompany = async () => {
    if (!companyCode.trim() || !companyName.trim()) {
      toast({
        title: t('onboarding.companyInfoInput'),
        description: t('onboarding.enterCompanyCodeAndName'),
        variant: 'destructive',
      });
      return;
    }

    setCompanyCodeVerified(true);

    if (role === 'team') {
      setIsLoadingDepartments(true);
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('code', companyCode.trim())
          .single();

        if (company) {
          const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*')
            .eq('company_id', company.id)
            .order('name');

          if (!deptError && departments) {
            setAvailableDepartments(departments);
            toast({
              title: t('onboarding.verifyComplete'),
              description: t('signup.loadedDepartments', { count: departments.length }),
            });
          } else {
            setAvailableDepartments([]);
            toast({
              title: t('onboarding.verifyComplete'),
              description: t('signup.noDeptInCompany'),
            });
          }
        } else {
          setAvailableDepartments([]);
          toast({
            title: t('onboarding.verifyComplete'),
            description: t('onboarding.newCompany'),
          });
        }
      } catch (error) {
        console.error('부서 로드 실패:', error);
        setAvailableDepartments([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    } else {
      toast({
        title: t('onboarding.verifyComplete'),
        description: t('onboarding.companyVerified'),
      });
    }
  };

  const handleComplete = async () => {
    if (!name.trim() || !companyCode.trim() || !companyName.trim()) {
      toast({
        title: t('announcements.inputError'),
        description: t('onboarding.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    if (!companyCodeVerified) {
      toast({
        title: t('onboarding.companyInfoVerify'),
        description: t('onboarding.verifyFirst'),
        variant: 'destructive',
      });
      return;
    }

    if (role === 'team' && !departmentId) {
      toast({
        title: t('onboarding.selectDept'),
        description: t('onboarding.selectDeptDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    if (role === 'admin') pendingScaffoldRef.current = true;
    const result = await completeOnboarding(
      name.trim(),
      role,
      companyCode.trim(),
      companyName.trim(),
      role === 'team' ? departmentId : undefined
    );
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: t('onboarding.onboardingComplete'),
        description: t('onboarding.companySaved'),
      });
      if (role === 'admin') {
        // 대분류가 하나도 없는(사실상 빈) 회사면 초기 구조 설정 위저드 표시
        const companyId = useAuthStore.getState().user?.companyId;
        let showWizard = false;
        if (companyId) {
          try {
            const { data: deptRows } = await supabase
              .from('departments')
              .select('id')
              .eq('company_id', companyId);
            const deptIds = (deptRows || []).map((d: { id: string }) => d.id);
            let catCount = 0;
            if (deptIds.length > 0) {
              const { count } = await supabase
                .from('categories')
                .select('*', { count: 'exact', head: true })
                .in('department_id', deptIds);
              catCount = count ?? 0;
            }
            showWizard = catCount === 0;
          } catch {
            showWizard = false;
          }
        }
        if (showWizard && companyId) {
          setScaffoldCompanyId(companyId);
        } else {
          pendingScaffoldRef.current = false;
          navigate('/admin');
        }
      } else {
        navigate('/team');
      }
    } else {
      pendingScaffoldRef.current = false;
      toast({
        title: t('onboarding.onboardingFailed'),
        description: result.error || t('common.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  // 0=계정(항상 완료), 1=회사정보, 2=부서(팀원만)
  // 온보딩 도착 = 계정은 이미 있음. stepper 의미를 그것에 맞춤.
  const accountDone = true;
  const companyDone = companyCodeVerified;
  const deptDone = role === 'team' ? !!departmentId : companyCodeVerified;
  const stepStates = [accountDone, companyDone, deptDone];
  const steps = role === 'team'
    ? [t('onboarding.stepAccount'), t('onboarding.stepCompany'), t('onboarding.stepDept')]
    : [t('onboarding.stepAccount'), t('onboarding.stepCompany')];

  // 관리자 온보딩 완료 → 초기 구조 설정 위저드
  if (scaffoldCompanyId) {
    return (
      <AuthShell
        heroHeadline={t('onboarding.heroHeadline')}
        heroDescription={t('onboarding.description')}
      >
        <OnboardingScaffold companyId={scaffoldCompanyId} onDone={() => navigate('/admin')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      heroHeadline={t('onboarding.heroHeadline')}
      heroDescription={t('onboarding.description')}
    >
      {/* Progress stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-slate-900 dark:text-[#f1f5f9]">{t('onboarding.title')}</span>
          <button
            onClick={() => { useAuthStore.getState().logout(); navigate('/'); }}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-[#94a3b8] dark:hover:text-[#cbd5e1] font-medium"
          >
            {t('common.logout')}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((_, i) => {
            const done = stepStates[i];
            // 현재 진행 중인 첫 미완료 단계
            const isCurrent = !done && stepStates.slice(0, i).every(Boolean);
            return (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold flex-none ${
                  done || isCurrent ? 'bg-[#2563eb] text-white' : 'bg-[#e5e7eb] text-slate-500'
                }`}>
                  {done ? <Check className="h-[13px] w-[13px]" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${done ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s, i) => {
            const done = stepStates[i];
            const isCurrent = !done && stepStates.slice(0, i).every(Boolean);
            const active = done || isCurrent;
            return (
              <span key={s} className={`text-[11.5px] ${active ? 'text-slate-900 dark:text-[#f1f5f9] font-semibold' : 'text-slate-500 dark:text-[#94a3b8]'} ${
                i === 0 ? 'text-left' : i === steps.length - 1 ? 'text-right' : 'text-center'
              }`}>{s}</span>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* Role tabs */}
        <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-100 p-1 rounded-[10px] h-auto">
            <TabsTrigger
              value="admin"
              className="rounded-lg py-2 text-[12.5px] font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
            >
              {t('common.admin')}
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="rounded-lg py-2 text-[12.5px] font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 transition-all"
            >
              {t('common.team')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

          <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.companyCode')}</Label>
            <Input
              className="h-[42px] rounded-[10px]"
              placeholder={t('signup.companyCodePlaceholder')}
              value={companyCode}
              onChange={(e) => {
                setCompanyCode(e.target.value);
                setCompanyCodeVerified(false);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.companyName')}</Label>
            <Input
              className="h-[42px] rounded-[10px]"
              placeholder={t('signup.companyNamePlaceholder')}
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyCodeVerified(false);
              }}
            />
          </div>

          {/* Verify button / status */}
          {companyCodeVerified ? (
            <div className="p-3.5 bg-[#ecfdf5] dark:bg-[rgba(16,185,129,0.1)] border border-[#a7f3d0] dark:border-[#34d399]/30 rounded-[10px] flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#10b981] text-white flex items-center justify-center flex-none">
                <Check className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#065f46] dark:text-[#34d399]">{t('onboarding.verifyComplete')}</div>
                <div className="text-[12px] text-[#047857] dark:text-[#6ee7b7] mt-0.5">{t('onboarding.companyVerified')}</div>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-[42px] rounded-[10px]"
              onClick={handleVerifyCompany}
              disabled={!companyCode.trim() || !companyName.trim()}
            >
              {t('signup.verifyButton')}
            </Button>
          )}

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.name')}</Label>
            <Input
              className="h-[42px] rounded-[10px]"
              placeholder={t('signup.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {role === 'team' && (
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-slate-900 dark:text-[#f1f5f9]">{t('signup.department')}</Label>
              <Select
                value={departmentId}
                onValueChange={(value) => setDepartmentId(value)}
                disabled={!companyCodeVerified || isLoadingDepartments}
              >
                <SelectTrigger className="h-[42px] rounded-[10px]">
                  <SelectValue
                    placeholder={
                      !companyCodeVerified
                        ? t('signup.verifyCompanyFirst')
                        : isLoadingDepartments
                        ? t('signup.loadingDepartments')
                        : availableDepartments.length === 0
                        ? t('signup.noDepartments')
                        : t('signup.selectDepartment')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="button"
            className="w-full h-11 rounded-[11px] font-semibold mt-2 shadow-[0_1px_3px_rgba(37,99,235,0.3)]"
            onClick={handleComplete}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? t('common.saving') : (t('onboarding.complete') + ' →')}
          </Button>
        </div>
      </div>

      <p className="text-[11.5px] text-slate-400 dark:text-[#64748b] text-center mt-4">
        {t('onboarding.wrongCompanyHint')}
      </p>
    </AuthShell>
  );
}
