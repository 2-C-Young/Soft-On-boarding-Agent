import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { MainLayout } from './components/layout/MainLayout';
import { FunctionalView } from './pages/FunctionalView';
import { DataView } from './pages/DataView';
import { InterfaceView } from './pages/InterfaceView';
import { ProcessFlowView } from './pages/ProcessFlowView';
import { QAView } from './pages/QAView';
import { QAWrite } from './pages/QAWrite';
import { QADetail } from './pages/QADetail';
import { SettingsView } from './pages/SettingsView';
import { MemberManagementView } from './pages/MemberManagementView';
import { useAuthStore } from './store/authStore';
import { userApi } from './services/userApi';
import { useEffect } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function ProtectedTeamRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user?.teamCode) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore((state) => state.user?.isAdmin);
  
  if (!isAdmin) {
    return <Navigate to="/functional" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // 앱이 로드될 때(새로고침 등), 로컬 스토리지상 인증되어 있다면 
    // 백엔드에 핑을 보내서 실제 DB와 프론트엔드의 상태(teamCode 등)를 완벽 동기화
    if (isAuthenticated) {
      userApi.syncUser().catch(() => {
        // apiFetch 인터셉터가 401을 감지하고 자동으로 로그아웃/리다이렉트 처리함
        console.warn('Silent token validation & sync failed.');
      });
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth & Onboarding Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Main App Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ProtectedTeamRoute>
                <MainLayout />
              </ProtectedTeamRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/functional" replace />} />
          <Route path="functional" element={<FunctionalView />} />
          <Route path="data" element={<DataView />} />
          <Route path="interface" element={<InterfaceView />} />
          <Route path="process-flow" element={<ProcessFlowView />} />
          <Route path="qa">
            <Route index element={<QAView />} />
            <Route path="write" element={<QAWrite />} />
            <Route path=":id" element={<QADetail />} />
          </Route>
          <Route path="settings" element={<SettingsView />} />
          <Route 
            path="members" 
            element={
              <AdminRoute>
                <MemberManagementView />
              </AdminRoute>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
