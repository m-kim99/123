import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex flex-col items-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('onboarding.title')}</CardTitle>
            <CardDescription>
              {t('onboarding.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[90vh] overflow-y-auto">
            <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger
                  value="admin"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  {t('common.admin')}
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  {t('common.team')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>{t('signup.companyCode')}</Label>
              <Input
                placeholder={t('signup.companyCodePlaceholder')}
                value={companyCode}
                onChange={(e) => {
                  setCompanyCode(e.target.value);
                  setCompanyCodeVerified(false);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('signup.companyName')}</Label>
              <Input
                placeholder={t('signup.companyNamePlaceholder')}
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setCompanyCodeVerified(false);
                }}
              />
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                className={`w-full ${
                  companyCodeVerified ? 'bg-green-600 hover:bg-green-600' : ''
                }`}
                onClick={handleVerifyCompany}
                disabled={!companyCode.trim() || !companyName.trim()}
                variant={companyCodeVerified ? 'default' : 'outline'}
              >
                {companyCodeVerified ? t('signup.verifiedReVerify') : t('signup.verifyButton')}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>{t('signup.name')}</Label>
              <Input
                placeholder={t('signup.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {role === 'team' && (
              <div className="space-y-2">
                <Label>{t('signup.department')}</Label>
                <Select
                  value={departmentId}
                  onValueChange={(value) => setDepartmentId(value)}
                  disabled={!companyCodeVerified || isLoadingDepartments}
                >
                  <SelectTrigger>
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
              className="w-full mt-4"
              onClick={handleComplete}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? t('common.saving') : t('onboarding.complete')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
