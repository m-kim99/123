import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/AuthShell';
import { OnboardingScaffold } from '@/components/OnboardingScaffold';
import { useAuthStore } from '@/store/authStore';

/**
 * 초기 문서 구조 설정 위저드 전용 페이지
 * - 일반(이메일) 가입 관리자가 첫 로그인 시 회사가 비어 있으면 여기로 안내됨
 * - 소셜 온보딩(OnboardingPage)과 동일한 OnboardingScaffold를 재사용
 */
export function OnboardingStructurePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // 관리자 + 회사 보유가 아니면 진입 불가
  if (!user?.companyId || user.role !== 'admin') {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <AuthShell
      heroHeadline={t('onboarding.heroHeadline')}
      heroDescription={t('onboarding.description')}
    >
      <OnboardingScaffold companyId={user.companyId} onDone={() => navigate('/admin')} />
    </AuthShell>
  );
}
