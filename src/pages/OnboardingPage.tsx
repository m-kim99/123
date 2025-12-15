import { useEffect, useState } from 'react';
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
        title: '회사 정보 입력',
        description: '회사 코드와 회사명을 모두 입력해주세요.',
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
              title: '인증 완료',
              description: `${departments.length}개 부서를 불러왔습니다.`,
            });
          } else {
            setAvailableDepartments([]);
            toast({
              title: '인증 완료',
              description: '해당 회사에 부서가 없습니다.',
            });
          }
        } else {
          setAvailableDepartments([]);
          toast({
            title: '인증 완료',
            description: '새로운 회사입니다.',
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
        title: '인증 완료',
        description: '회사 정보가 인증되었습니다.',
      });
    }
  };

  const handleComplete = async () => {
    if (!name.trim() || !companyCode.trim() || !companyName.trim()) {
      toast({
        title: '입력 오류',
        description: '모든 필드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!companyCodeVerified) {
      toast({
        title: '회사 정보 인증',
        description: '먼저 회사 정보를 인증해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (role === 'team' && !departmentId) {
      toast({
        title: '부서 선택',
        description: '부서를 선택해주세요.',
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
        title: '온보딩 완료',
        description: '회사 정보가 저장되었습니다.',
      });
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/team');
      }
    } else {
      toast({
        title: '온보딩 실패',
        description: result.error || '다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="flex flex-col items-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>회사 정보 입력</CardTitle>
            <CardDescription>
              서비스 이용을 위해 회사 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[90vh] overflow-y-auto">
            <Tabs value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger
                  value="admin"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  관리자
                </TabsTrigger>
                <TabsTrigger
                  value="team"
                  className="bg-white text-black data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  팀원
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>회사 코드</Label>
              <Input
                placeholder="예: COMPANY001"
                value={companyCode}
                onChange={(e) => {
                  setCompanyCode(e.target.value);
                  setCompanyCodeVerified(false);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>회사명</Label>
              <Input
                placeholder="예: 삼성전자"
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
                {companyCodeVerified ? '✓ 인증됨 (다시 인증)' : '인증하기'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>이름</Label>
              <Input
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {role === 'team' && (
              <div className="space-y-2">
                <Label>부서</Label>
                <Select
                  value={departmentId}
                  onValueChange={(value) => setDepartmentId(value)}
                  disabled={!companyCodeVerified || isLoadingDepartments}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !companyCodeVerified
                          ? '먼저 회사 정보를 인증해주세요'
                          : isLoadingDepartments
                          ? '부서를 불러오는 중...'
                          : availableDepartments.length === 0
                          ? '사용 가능한 부서가 없습니다'
                          : '부서 선택'
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
              {isSubmitting || isLoading ? '저장 중...' : '완료'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
