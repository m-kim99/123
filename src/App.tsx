import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useDocumentStore } from './store/documentStore';
import { supabase } from './lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Toaster } from '@/components/ui/toaster';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';

const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const TeamDashboard = lazy(() =>
  import('./pages/TeamDashboard').then((m) => ({ default: m.TeamDashboard })),
);
const DocumentManagement = lazy(() =>
  import('./pages/DocumentManagement').then((m) => ({ default: m.DocumentManagement })),
);
const CategoryDetail = lazy(() =>
  import('./pages/CategoryDetail').then((m) => ({ default: m.CategoryDetail })),
);
const DepartmentManagement = lazy(() =>
  import('./pages/DepartmentManagement').then((m) => ({ default: m.DepartmentManagement })),
);
const DepartmentDetail = lazy(() =>
  import('./pages/DepartmentDetail').then((m) => ({ default: m.DepartmentDetail })),
);
const Statistics = lazy(() =>
  import('./pages/Statistics').then((m) => ({ default: m.Statistics })),
);
const UserManagement = lazy(() =>
  import('./pages/UserManagement').then((m) => ({ default: m.UserManagement })),
);
const TeamDepartments = lazy(() =>
  import('./pages/TeamDepartments').then((m) => ({ default: m.TeamDepartments })),
);
const TeamDepartmentDetail = lazy(() =>
  import('./pages/TeamDepartmentDetail').then((m) => ({ default: m.TeamDepartmentDetail })),
);
const ParentCategoryList = lazy(() =>
  import('./pages/ParentCategoryList').then((m) => ({ default: m.ParentCategoryList })),
);
const ParentCategoryDetail = lazy(() =>
  import('./pages/ParentCategoryDetail').then((m) => ({ default: m.ParentCategoryDetail })),
);
const SubcategoryDetail = lazy(() =>
  import('./pages/SubcategoryDetail').then((m) => ({ default: m.SubcategoryDetail })),
);
const SubcategoryManagement = lazy(() =>
  import('./pages/SubcategoryManagement').then((m) => ({ default: m.SubcategoryManagement })),
);
const NfcRedirect = lazy(() =>
  import('./pages/NfcRedirect').then((m) => ({ default: m.NfcRedirect })),
);

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'team';
}) {
  const { isAuthenticated, user, needsOnboarding } = useAuthStore();

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/team'} replace />;
  }

  return <>{children}</>;
}

function RootRoute() {
  const { isAuthenticated, user, needsOnboarding } = useAuthStore();

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isAuthenticated && user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/team'}
        replace
      />
    );
  }

  return <LoginPage />;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const {
    fetchDepartments,
    fetchCategories,
    fetchParentCategories,
    fetchSubcategories,
    fetchDocuments,
  } = useDocumentStore();

  useEffect(() => {
    const { checkSession } = useAuthStore.getState();

    // OAuth 콜백 디버깅 - URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    console.log('🔍 URL search params:', Object.fromEntries(urlParams));
    console.log('🔍 URL hash params:', Object.fromEntries(hashParams));
    console.log('🔍 Full URL:', window.location.href);

    // OAuth 에러 확인
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    const errorCode = urlParams.get('error_code');
    if (error) {
      console.error('❌ OAuth 에러:', error);
      console.error('❌ OAuth 에러 설명:', errorDescription);
      console.error('❌ OAuth 에러 코드:', errorCode);
      // URL에서 에러 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname);
    }

    // PKCE flow: code 파라미터가 있으면 세션 교환 시도
    const code = urlParams.get('code');
    if (code) {
      console.log('🔑 OAuth code 발견, 세션 교환 시도...');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeError }: { data: any; error: any }) => {
        if (exchangeError) {
          console.error('❌ 세션 교환 실패:', exchangeError);
        } else {
          console.log('✅ 세션 교환 성공:', data);
          // URL에서 code 파라미터 제거
          window.history.replaceState({}, '', window.location.pathname);
          checkSession();
        }
      });
    }

    // OAuth 콜백 리스너 - 모든 인증 상태 변경 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('🔐 Auth 상태 변경:', event, session);
      
      if (event === 'INITIAL_SESSION') {
        // 앱 시작 시 또는 OAuth 콜백 후 세션 확인
        await checkSession();
      } else if (event === 'SIGNED_IN' && session) {
        await checkSession();
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          needsOnboarding: false,
          redirectAfterLogin: null,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // 토큰 갱신 시에도 세션 유지
        await checkSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      try {
        await Promise.all([
          fetchDepartments(),
          fetchCategories(),
          fetchParentCategories(),
          fetchSubcategories(),
          fetchDocuments(),
        ]);
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error);
      }
    })();
  }, [
    isAuthenticated,
    fetchDepartments,
    fetchCategories,
    fetchParentCategories,
    fetchSubcategories,
    fetchDocuments,
  ]);

  return (
    <>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/nfc-redirect" element={<NfcRedirect />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <ProtectedRoute requiredRole="admin">
                  <DepartmentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/departments/:departmentId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <DepartmentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/documents"
              element={
                <ProtectedRoute requiredRole="admin">
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parent-categories"
              element={
                <ProtectedRoute requiredRole="admin">
                  <ParentCategoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parent-category/:parentCategoryId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <ParentCategoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parent-category/:parentCategoryId/subcategory/:subcategoryId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SubcategoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subcategories"
              element={
                <ProtectedRoute requiredRole="admin">
                  <SubcategoryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requiredRole="admin">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/statistics"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Statistics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/category/:categoryId"
              element={
                <ProtectedRoute requiredRole="admin">
                  <CategoryDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/team"
              element={
                <ProtectedRoute requiredRole="team">
                  <TeamDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/department/:departmentId"
              element={
                <ProtectedRoute requiredRole="team">
                  <TeamDepartmentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/departments"
              element={
                <ProtectedRoute requiredRole="team">
                  <TeamDepartments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/documents"
              element={
                <ProtectedRoute requiredRole="team">
                  <DocumentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/parent-categories"
              element={
                <ProtectedRoute requiredRole="team">
                  <ParentCategoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/parent-category/:parentCategoryId"
              element={
                <ProtectedRoute requiredRole="team">
                  <ParentCategoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/parent-category/:parentCategoryId/subcategory/:subcategoryId"
              element={
                <ProtectedRoute requiredRole="team">
                  <SubcategoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/subcategories"
              element={
                <ProtectedRoute requiredRole="team">
                  <SubcategoryManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/statistics"
              element={
                <ProtectedRoute requiredRole="team">
                  <Statistics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team/category/:categoryId"
              element={
                <ProtectedRoute requiredRole="team">
                  <CategoryDetail />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
