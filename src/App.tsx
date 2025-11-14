import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeamDashboard } from './pages/TeamDashboard';
import { DocumentManagement } from './pages/DocumentManagement';
import { CategoryDetail } from './pages/CategoryDetail';
import { DepartmentManagement } from './pages/DepartmentManagement';
import { Statistics } from './pages/Statistics';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'team';
}) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/team'} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

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
          path="/admin/documents"
          element={
            <ProtectedRoute requiredRole="admin">
              <DocumentManagement />
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
          path="/team/documents"
          element={
            <ProtectedRoute requiredRole="team">
              <DocumentManagement />
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
  );
}

export default App;
