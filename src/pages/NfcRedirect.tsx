import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export function NfcRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setRedirectAfterLogin } = useAuthStore();

  useEffect(() => {
    const redirectToSubcategory = async () => {
      try {
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
          console.error('NFC Redirect: 세부 카테고리 조회 실패', error);
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

        // 세부 카테고리 페이지로 리다이렉트
        navigate(`${basePath}${targetRelativePath}`, { replace: true });
      } catch (error) {
        console.error('NFC Redirect 오류:', error);
        navigate(user?.role === 'admin' ? '/admin' : '/team');
      }
    };

    redirectToSubcategory();
  }, [searchParams, navigate, user]);

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
