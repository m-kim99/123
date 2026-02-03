import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { getNfcMode } from '@/lib/nfc';
import { Loader2, Pencil, ArrowLeft } from 'lucide-react';

export function NfcRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setRedirectAfterLogin } = useAuthStore();
  const [isWritingMode, setIsWritingMode] = useState(false);

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
          // subcategoryId 없으면 홈으로
          console.error('NFC Redirect: subcategoryId 없음');
          navigate(user?.role === 'admin' ? '/admin' : '/team');
          return;
        }

        // DB에서 parent_category_id 조회
        const { data, error } = await supabase
          .from('subcategories')
          .select('parent_category_id')
          .eq('id', subcategoryId)
          .single();

        if (error || !data) {
          console.error('NFC Redirect: 세부 스토리지 조회 실패', error);
          navigate(user?.role === 'admin' ? '/admin' : '/team');
          return;
        }

        const parentCategoryId = (data as any).parent_category_id;
        const targetRelativePath = `/parent-category/${parentCategoryId}/subcategory/${subcategoryId}`;

        // 로그인 안 된 상태라면, 로그인 후 돌아올 경로를 저장하고 루트(로그인)로 보낸다
        if (!user) {
          setRedirectAfterLogin(targetRelativePath);
          navigate('/', { replace: true });
          return;
        }

        const basePath = user.role === 'admin' ? '/admin' : '/team';

        // 세부 스토리지 페이지로 리다이렉트
        navigate(`${basePath}${targetRelativePath}`, { replace: true });
      } catch (error) {
        console.error('NFC Redirect 오류:', error);
        navigate(user?.role === 'admin' ? '/admin' : '/team');
      }
    };

    redirectToSubcategory();
  }, [searchParams, navigate, user]);

  // NFC 쓰기 모드일 때는 다른 UI 표시
  if (isWritingMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Pencil className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-700">NFC 쓰기 모드</p>
          <p className="text-sm text-slate-500 mt-2">이전 페이지로 돌아갑니다...</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-slate-700">NFC 태그 인식됨</p>
        <p className="text-sm text-slate-500 mt-2">페이지로 이동 중...</p>
      </div>
    </div>
  );
}
