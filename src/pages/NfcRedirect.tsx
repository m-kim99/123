import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getNfcMode } from '@/lib/nfc';
import { checkUserAccess } from '@/lib/permissions';
import { Loader2, Pencil, ArrowLeft, ShieldX } from 'lucide-react';

export function NfcRedirect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, setRedirectAfterLogin } = useAuthStore();
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [deniedReason, setDeniedReason] = useState('');

  useEffect(() => {
    const redirectToSubcategory = async () => {
      try {
        // NFC 쓰기 모드일 때는 리다이렉트하지 않음 (덮어쓰기 중 기존 URL 열림 방지)
        if (getNfcMode() === 'writing') {
          console.log('NFC Redirect: 쓰기 모드 - 리다이렉트 무시');
          setIsWritingMode(true);
          // 뒤로 가기 시도 (history가 있으면)
          if (window.history.length > 1) {
            setTimeout(() => {
              window.history.back();
            }, 1500);
          }
          return;
        }

        const subcategoryId = searchParams.get('subcategoryId');

        if (!subcategoryId) {
          // subcategoryId 없으면 홈으로 (비로그인 시 로그인 페이지로)
          console.error('NFC Redirect: subcategoryId 없음');
          navigate(user ? (user.role === 'admin' ? '/admin' : '/team') : '/');
          return;
        }

        // 로그인 안 된 상태라면, 현재 nfc-redirect URL 전체를 저장하고 로그인으로 보낸다
        if (!user) {
          const currentFullPath = `/nfc-redirect?subcategoryId=${subcategoryId}`;
          setRedirectAfterLogin(currentFullPath);
          navigate('/', { replace: true });
          return;
        }

        const basePath = user.role === 'admin' ? '/admin' : '/team';

        // DB에서 parent_category_id, company_id, department_id 조회
        const { data, error } = await supabase
          .from('subcategories')
          .select('parent_category_id, company_id, department_id')
          .eq('id', subcategoryId)
          .single();

        if (error || !data) {
          console.error('NFC Redirect: 세부 스토리지 조회 실패', error);
          navigate(basePath);
          return;
        }

        const parentCategoryId = (data as any).parent_category_id;
        const subcategoryCompanyId = (data as any).company_id;
        const subcategoryDepartmentId = (data as any).department_id;

        // 1. 회사 확인: 다른 회사의 세부 카테고리는 접근 불가
        if (subcategoryCompanyId && user.companyId !== subcategoryCompanyId) {
          console.warn('NFC Redirect: 다른 회사 세부 스토리지 접근 시도');
          setDeniedReason(t('nfcRedirect.differentCompany'));
          setIsDenied(true);
          setTimeout(() => {
            navigate(basePath, { replace: true });
          }, 3000);
          return;
        }

        // 2. 권한 확인: admin은 모든 부서 접근 가능, team은 권한 체크
        if (user.role !== 'admin' && subcategoryDepartmentId) {
          const { hasAccess, role } = await checkUserAccess(
            user.id,
            subcategoryDepartmentId,
            user.departmentId
          );

          if (!hasAccess || role === 'none') {
            console.warn('NFC Redirect: 부서 접근 권한 없음', { role });
            setDeniedReason(t('nfcRedirect.noPermission'));
            setIsDenied(true);
            setTimeout(() => {
              navigate(basePath, { replace: true });
            }, 3000);
            return;
          }
        }

        // 세부 스토리지 페이지로 리다이렉트
        navigate(`${basePath}/parent-category/${parentCategoryId}/subcategory/${subcategoryId}`, { replace: true });
      } catch (error) {
        console.error('NFC Redirect 오류:', error);
        navigate(user ? (user.role === 'admin' ? '/admin' : '/team') : '/');
      }
    };

    if (isLoading) return;
    redirectToSubcategory();
  }, [searchParams, navigate, user, isLoading]);

  // 권한 없음 UI
  if (isDenied) {
    const basePath = user?.role === 'admin' ? '/admin' : '/team';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldX className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700">{t('nfcRedirect.accessDenied')}</p>
          <p className="text-sm text-slate-500 mt-2">{deniedReason}</p>
          <p className="text-xs text-slate-400 mt-3">{t('nfcRedirect.redirecting')}</p>
          <button
            onClick={() => navigate(basePath, { replace: true })}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('nfcRedirect.goToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // NFC 쓰기 모드일 때는 다른 UI 표시
  if (isWritingMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Pencil className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700">{t('nfcRedirect.writeMode')}</p>
          <p className="text-sm text-slate-500 mt-2">{t('nfcRedirect.goingBack')}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#2563eb] mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-700">{t('nfcRedirect.tagDetected')}</p>
        <p className="text-sm text-slate-500 mt-2">{t('nfcRedirect.navigating')}</p>
      </div>
    </div>
  );
}
