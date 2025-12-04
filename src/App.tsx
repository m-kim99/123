import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeamDashboard } from './pages/TeamDashboard';
import { DocumentManagement } from './pages/DocumentManagement';
import { CategoryDetail } from './pages/CategoryDetail';
import { DepartmentManagement } from './pages/DepartmentManagement';
import { DepartmentDetail } from './pages/DepartmentDetail';
import { Statistics } from './pages/Statistics';
import { useAuthStore } from './store/authStore';
import { useDocumentStore } from './store/documentStore';
import { Toaster } from '@/components/ui/toaster';
import { UserManagement } from './pages/UserManagement';
import { TeamDepartments } from './pages/TeamDepartments';
import { TeamDepartmentDetail } from './pages/TeamDepartmentDetail';
import { ParentCategoryList } from './pages/ParentCategoryList';
import { ParentCategoryDetail } from './pages/ParentCategoryDetail';
import { SubcategoryDetail } from './pages/SubcategoryDetail';
import { SubcategoryManagement } from './pages/SubcategoryManagement';
import { NfcRedirect } from './pages/NfcRedirect';

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
    </BrowserRouter>
    <Toaster />
    </>
  );
}

export default App;
