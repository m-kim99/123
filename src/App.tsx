import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useDocumentStore } from './store/documentStore';
import { Toaster } from '@/components/ui/toaster';
import { trackPageView } from '@/lib/analytics';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

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
const SharedDocuments = lazy(() =>
  import('./pages/SharedDocuments').then((m) => ({ default: m.SharedDocuments })),
);
const NaverCallback = lazy(() =>
  import('./pages/NaverCallback').then((m) => ({ default: m.NaverCallback })),
);

const AdminAnnouncements = lazy(() =>
  import('./pages/AdminAnnouncements').then((m) => ({ default: m.AdminAnnouncements })),
);
const TeamAnnouncements = lazy(() =>
  import('./pages/TeamAnnouncements').then((m) => ({ default: m.TeamAnnouncements })),
);

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'team';
}) {
  const { isAuthenticated, user, needsOnboarding, setRedirectAfterLogin } = useAuthStore();
  const location = useLocation();

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAuthenticated) {
    // 현재 경로를 저장하여 로그인 후 돌아올 수 있도록 함
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/' && currentPath !== '/team' && currentPath !== '/admin') {
      setRedirectAfterLogin(currentPath);
    }
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/team'} replace />;
  }

  return <>{children}</>;
}

function RootRoute() {
  const { isAuthenticated, user, needsOnboarding, isLoading } = useAuthStore();

  // OAuth 콜백 등으로 세션 체크 중일 때 로딩 표시
  if (isLoading) {
    return <PageLoader />;
  }

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

function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, location.search]);

  return null;
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
    checkSession();
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
        <RouteAnalytics />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/nfc-redirect" element={<NfcRedirect />} />
            <Route path="/auth/naver/callback" element={<NaverCallback />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

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
              path="/admin/announcements"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAnnouncements />
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
              path="/team/shared"
              element={
                <ProtectedRoute requiredRole="team">
                  <SharedDocuments />
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
              path="/team/announcements"
              element={
                <ProtectedRoute requiredRole="team">
                  <TeamAnnouncements />
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
