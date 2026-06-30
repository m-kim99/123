import { useEffect, Suspense, useState } from 'react';
import { slowLazy as lazy } from './lib/devSlowdown';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { NativeBottomBar } from '@/components/NativeBottomBar';
import { NativeDeepLinkHandler } from '@/components/NativeDeepLinkHandler';
import { useAuthStore } from './store/authStore';
import { useDocumentStore } from './store/documentStore';
import { useOperatorStore } from './store/operatorStore';
import type { OperatorPermissions } from './types/operator';
import { supabase } from '@/lib/supabase';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { trackPageView } from '@/lib/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountDeletionPage } from './pages/AccountDeletionPage';
import { SignupPage } from './pages/SignupPage';
import { BillingSuccessPage, BillingFailPage, PayAppBillingSuccessPage, InnopayReturnPage } from './pages/BillingResultPage';

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
const Trash = lazy(() =>
  import('./pages/Trash').then((m) => ({ default: m.Trash })),
);
const QnAPage = lazy(() =>
  import('./pages/QnAPage').then((m) => ({ default: m.QnAPage })),
);

// Operator pages
const OperatorLogin = lazy(() =>
  import('./pages/operator/OperatorLogin').then((m) => ({ default: m.OperatorLogin })),
);
const OperatorDashboard = lazy(() =>
  import('./pages/operator/OperatorDashboard').then((m) => ({ default: m.OperatorDashboard })),
);
const MemberManagement = lazy(() =>
  import('./pages/operator/MemberManagement').then((m) => ({ default: m.MemberManagement })),
);
const ReportManagement = lazy(() =>
  import('./pages/operator/ReportManagement').then((m) => ({ default: m.ReportManagement })),
);
const SystemNotices = lazy(() =>
  import('./pages/operator/SystemNotices').then((m) => ({ default: m.SystemNotices })),
);
const InquiryManagement = lazy(() =>
  import('./pages/operator/InquiryManagement').then((m) => ({ default: m.InquiryManagement })),
);
const CompanyManagement = lazy(() =>
  import('./pages/operator/CompanyManagement').then((m) => ({ default: m.CompanyManagement })),
);
const ActivityLogs = lazy(() =>
  import('./pages/operator/ActivityLogs').then((m) => ({ default: m.ActivityLogs })),
);

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'team';
}) {
  const { isAuthenticated, isLoading, user, needsOnboarding, setRedirectAfterLogin } = useAuthStore();
  const location = useLocation();

  // 세션 확인 중에는 로딩 표시 (새로고침 시 즉시 리다이렉트 방지)
  if (isLoading) {
    return <PageLoader />;
  }

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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
    </div>
  );
}

function OperatorProtectedRoute({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: keyof OperatorPermissions;
}) {
  const { isOperator, isLoading, operator } = useOperatorStore();
  const location = useLocation();

  // 세션 확인 중
  if (isLoading) {
    return <PageLoader />;
  }

  // 운영자가 아니면 운영자 로그인 페이지로
  if (!isOperator) {
    return <Navigate to="/operator/login" state={{ from: location }} replace />;
  }

  // 권한 검사 — 슈퍼 운영자는 모든 권한 보유
  if (permission && operator && !operator.isSuper && !operator.permissions?.[permission]) {
    return <Navigate to="/operator" replace />;
  }

  return <>{children}</>;
}

function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, location.search]);

  return null;
}

function DeletionWarningDialog() {
  const { t } = useTranslation();
  const { pendingDeletion, cancelDeletion, clearPendingDeletion, logout } = useAuthStore();
  const {
    fetchDepartments,
    fetchCategories,
    fetchParentCategories,
    fetchSubcategories,
    fetchDocuments,
  } = useDocumentStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setIsCancelling(true);
    const result = await cancelDeletion();
    setIsCancelling(false);

    if (result.success) {
      toast({
        title: t('deletion.cancelComplete'),
        description: t('deletion.cancelCompleteDesc'),
      });
      // 데이터 새로고침
      await Promise.all([
        fetchDepartments(),
        fetchCategories(),
        fetchParentCategories(),
        fetchSubcategories(),
        fetchDocuments(),
      ]);
    } else {
      toast({
        title: t('deletion.cancelFailed'),
        description: result.error || t('common.tryAgain'),
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    clearPendingDeletion();
    await logout();
  };

  if (!pendingDeletion) return null;

  return (
    <Dialog open={!!pendingDeletion} onOpenChange={(open) => !open && handleLogout()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">{t('deletion.warningTitle')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium mb-2">
              {t('deletion.accountPending')}
            </p>
            <div className="text-sm text-amber-700 space-y-1">
              <p>• {t('deletion.scheduledDate')}: <strong>{pendingDeletion.scheduledDate}</strong></p>
              <p>• {t('deletion.remainingDays')}: <strong>{pendingDeletion.remainingDays}{t('common.days')}</strong></p>
            </div>
          </div>
          
          <p className="text-sm text-slate-600">
            {t('deletion.cancelInfo')}
            <br />
            {t('deletion.noCancelInfo')}
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isCancelling}
              className="flex-1"
            >
              {t('common.logout')}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCancelling ? t('common.processing') : t('deletion.cancelDeletion')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
    const { checkOperatorSession } = useOperatorStore.getState();

    // 세션 분리: 운영자 콘솔(/operator)에서는 운영자 세션만, 그 외에는 사용자 세션만 체크
    const isOperatorPath = () => window.location.pathname.startsWith('/operator');

    if (isOperatorPath()) {
      checkOperatorSession();
    } else {
      checkSession();
    }

    // 세션 상태 변경 감지 (토큰 갱신, 로그아웃 등)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        if (isOperatorPath()) {
          useOperatorStore.getState().operatorLogout();
        } else {
          useAuthStore.getState().logout();
        }
      } else if (event === 'SIGNED_IN') {
        // TOKEN_REFRESHED는 JWT만 갱신될 뿐 사용자 정보는 바뀌지 않으므로
        // 전체 세션 재검증을 생략한다. 앱(WebView)에서 파일 선택기 등으로
        // 포커스가 복귀할 때 토큰 갱신 이벤트가 발행되어 불필요한 재검증 →
        // 화면 깜빡임/업로드 중단/홈 튕김이 발생하던 문제를 방지한다.
        if (isOperatorPath()) {
          useOperatorStore.getState().checkOperatorSession();
        } else {
          useAuthStore.getState().checkSession();
        }
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
        <RouteAnalytics />
        <NativeDeepLinkHandler />
        <div className={Capacitor.isNativePlatform() ? 'pb-14' : ''}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/nfc-redirect" element={<NfcRedirect />} />
            <Route path="/auth/naver/callback" element={<NaverCallback />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/account/delete" element={<AccountDeletionPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/billing/fail" element={<BillingFailPage />} />
            <Route path="/billing/payapp/success" element={<PayAppBillingSuccessPage />} />
            <Route path="/billing/innopay/return" element={<InnopayReturnPage />} />

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
              path="/admin/trash"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Trash />
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
              path="/admin/qna"
              element={
                <ProtectedRoute requiredRole="admin">
                  <QnAPage />
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
              path="/team/trash"
              element={
                <ProtectedRoute requiredRole="team">
                  <Trash />
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
            <Route
              path="/team/qna"
              element={
                <ProtectedRoute requiredRole="team">
                  <QnAPage />
                </ProtectedRoute>
              }
            />

            {/* Operator routes */}
            <Route path="/operator/login" element={<OperatorLogin />} />
            <Route
              path="/operator"
              element={
                <OperatorProtectedRoute>
                  <OperatorDashboard />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/members"
              element={
                <OperatorProtectedRoute permission="members">
                  <MemberManagement />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/reports"
              element={
                <OperatorProtectedRoute permission="reports">
                  <ReportManagement />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/notices"
              element={
                <OperatorProtectedRoute permission="notices">
                  <SystemNotices />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/inquiries"
              element={
                <OperatorProtectedRoute permission="inquiries">
                  <InquiryManagement />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/companies"
              element={
                <OperatorProtectedRoute permission="companies">
                  <CompanyManagement />
                </OperatorProtectedRoute>
              }
            />
            <Route
              path="/operator/logs"
              element={
                <OperatorProtectedRoute>
                  <ActivityLogs />
                </OperatorProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </div>
        <DeletionWarningDialog />
        <NativeBottomBar />
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
