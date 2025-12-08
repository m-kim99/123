import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function NfcRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'not_found' | 'error' | 'missing' | 'done'>(
    'loading'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uid = params.get('uid');
    const subcategoryId = params.get('subcategoryId');
    const categoryId = params.get('categoryId');

    if (!uid && !subcategoryId && !categoryId) {
      setStatus('missing');
      setMessage('NFC 태그 정보가 URL에 포함되어 있지 않습니다.');
      return;
    }

    const redirect = async () => {
      try {
        if (!user) {
          setStatus('error');
          setMessage('로그인이 필요합니다. 먼저 로그인 후 다시 시도해주세요.');
          navigate('/', { replace: true });
          return;
        }

        const basePath = user.role === 'admin' ? '/admin' : '/team';

        if (subcategoryId) {
          const parentCategoryId = params.get('parentCategoryId');
          if (parentCategoryId) {
            navigate(
              `${basePath}/parent-category/${parentCategoryId}/subcategory/${subcategoryId}`,
              { replace: true }
            );
          } else {
            navigate(`${basePath}/subcategories`, { replace: true });
          }
          setStatus('done');
          return;
        }

        if (uid) {
          const { data, error } = await supabase
            .from('subcategories')
            .select('id, parent_category_id, department_id')
            .eq('nfc_tag_id', uid)
            .single();

          if (error || !data) {
            setStatus('not_found');
            setMessage('등록되지 않은 NFC 태그입니다. 관리 화면에서 태그를 등록해주세요.');
            return;
          }

          navigate(
            `${basePath}/parent-category/${(data as any).parent_category_id}/subcategory/${
              (data as any).id
            }`,
            { replace: true }
          );
          setStatus('done');
          return;
        }

        if (categoryId) {
          navigate(`${basePath}/category/${categoryId}`, { replace: true });
          setStatus('done');
        }
      } catch (err) {
        console.error('NFC 리다이렉트 오류:', err);
        setStatus('error');
        setMessage('NFC 태그를 처리하는 중 오류가 발생했습니다.');
      }
    };

    redirect();
  }, [location.search, navigate, user]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>NFC 태그 연결 중</CardTitle>
            <CardDescription>
              NFC 태그 정보에 따라 알맞은 페이지로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>잠시만 기다려주세요...</span>
              </div>
            )}
            {status === 'missing' && (
              <p className="text-sm text-red-500">{message}</p>
            )}
            {status === 'not_found' && (
              <p className="text-sm text-red-500">{message}</p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-500">{message}</p>
            )}
            {(status === 'missing' || status === 'not_found' || status === 'error') && (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => navigate('/')}>홈으로 이동</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
