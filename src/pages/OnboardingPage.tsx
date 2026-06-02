import { useEffect, useState } from 'react';
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
import { Building2, Check } from 'lucide-react';
import logo from '@/assets/logo.png';

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

  // 잘못 들어온 경우 보호
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // 이미 회사가 있는 경우 대시보드로 보냄
    if (user.companyId) {
      navigate(user.role === 'admin' ? '/admin' : '/team');
    }
  }, [user, navigate]);

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
        navigate('/admin');
      } else {
        navigate('/team');
      }
    } else {
      toast({
        title: t('onboarding.onboardingFailed'),
        description: result.error || t('common.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  // Determine step: 1=account created, 2=company info, 3=department
  const currentStep = companyCodeVerified ? (role === 'team' ? 2 : 2) : 1;
  const steps = [t('onboarding.stepAccount') || '계정 생성', t('onboarding.stepCompany') || '회사 정보', t('onboarding.stepDept') || '부서 설정'];

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0b1220] p-4 sm:p-8">
      <div className="w-full max-w-[520px]">
        {/* Progress bar */}
        <div className="mb-9">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="TrayStorage" className="h-[26px]" />
            <button
              onClick={() => { useAuthStore.getState().logout(); navigate('/'); }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-[#94a3b8] dark:hover:text-[#cbd5e1] font-medium"
            >
              {t('common.logout') || '로그아웃'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-xs font-bold flex-none ${
                  i < currentStep ? 'bg-[#2563eb] text-white' : i === currentStep ? 'bg-[#2563eb] text-white' : 'bg-[#e5e7eb] text-slate-500'
                }`}>
                  {i < currentStep ? <Check className="h-[13px] w-[13px]" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${i < currentStep ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((s, i) => (
              <span key={s} className={`text-[11.5px] ${i <= currentStep ? 'text-slate-900 font-semibold' : 'text-slate-500'} ${
                i === 0 ? 'text-left' : i === steps.length - 1 ? 'text-right' : 'text-center'
              }`}>{s}</span>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#e5e7eb] dark:border-white/[0.08] shadow-sm p-6 sm:p-8">
          {/* Icon header */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-[14px] bg-[#eff6ff] dark:bg-[rgba(59,130,246,0.16)] flex items-center justify-center">
              <Building2 className="h-7 w-7 text-[#2563eb] dark:text-[#60a5fa]" />
            </div>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-center text-slate-900 dark:text-[#f1f5f9]">
            {t('onboarding.title')}
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-[#94a3b8] text-center mt-2.5 mb-6">
            {t('onboarding.description')}
          </p>

          {/* Role tabs */}
          <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-slate-100 p-1 rounded-[10px] h-auto">
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
              <div className="p-3.5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-[10px] flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#10b981] text-white flex items-center justify-center flex-none">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#065f46]">{t('onboarding.verifyComplete') || '인증 완료'}</div>
                  <div className="text-[12px] text-[#047857] mt-0.5">{t('onboarding.companyVerified') || '회사 정보가 인증되었습니다.'}</div>
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
              className="w-full h-[42px] rounded-[10px] font-semibold mt-2 shadow-[0_1px_3px_rgba(37,99,235,0.3)]"
              onClick={handleComplete}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? t('common.saving') : (t('onboarding.complete') + ' →')}
            </Button>
          </div>
        </div>

        <p className="text-[11.5px] text-slate-400 text-center mt-4.5">
          {t('onboarding.wrongCompanyHint') || '잘못된 회사로 들어왔다면 관리자에게 문의하세요.'}
        </p>
      </div>
    </div>
  );
}
