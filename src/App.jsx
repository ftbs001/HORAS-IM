import { useState } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

// Core Layout
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';

// Components Phase 1
import CreateReport from './components/dashboard/CreateReport';
import Profile from './components/pages/Profile';
import ActivityLog from './components/pages/ActivityLog';
import ReportHistory from './components/pages/ReportHistory';
import AddReportType from './components/pages/AddReportType';
import Members from './components/pages/Members';

// Components Phase 2 (Existing)
import SectionData from './components/pages/SectionData';
import WorkProgramInput from './components/pages/WorkProgramInput';
import MonthlyReport from './components/pages/MonthlyReport';
import PolicyBriefEditor from './components/pages/PolicyBriefEditor';
import VerificationDashboard from './components/pages/VerificationDashboard';
import Archive from './components/pages/Archive';

// NEW: Laporan Bulanan RBAC Pages
import UploadLaporan from './components/pages/laporanBulanan/UploadLaporan';
import MonitoringLaporan from './components/pages/laporanBulanan/MonitoringLaporan';
import GabungLaporan from './components/pages/laporanBulanan/GabungLaporan';

import LoginPage from './components/pages/LoginPage';

// Notification System
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import NotificationToast from './components/common/NotificationToast';
import { getViewDisplayName } from './utils/viewNameMap';

// Contexts
import { ProgramProvider } from './contexts/ProgramContext';
import { ReportProvider } from './contexts/ReportContext';
import { SectionProvider } from './contexts/SectionContext';
import { PolicyBriefProvider } from './contexts/PolicyBriefContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, logout, isSuperAdmin, isAdminSeksi } = useAuth();
  const { showNotification } = useNotification();
  const isLoggedIn = !!user;

  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    showNotification('Logout Berhasil! Sampai jumpa 👋', 'info');
  };

  const handleNavigate = (view) => {
    const viewName = getViewDisplayName(view) || view;
    if (currentView === view) {
      showNotification(`Anda sudah berada di halaman ini`, 'warning');
      return;
    }
    setCurrentView(view);
    showNotification(`Membuka ${viewName}`, 'info');
  };

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentView) {

      // ---- Laporan Bulanan RBAC (NEW) ----
      case 'upload-laporan':
        return (
          <ProtectedRoute allowedRoles={['admin_seksi']}>
            <UploadLaporan />
          </ProtectedRoute>
        );
      case 'monitoring-laporan':
        return (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MonitoringLaporan onNavigate={handleNavigate} />
          </ProtectedRoute>
        );
      case 'gabung-laporan':
        return (
          <ProtectedRoute allowedRoles={['super_admin']}>
            <GabungLaporan />
          </ProtectedRoute>
        );

      // ---- Phase 1 ----
      case 'create-report': return <CreateReport onCancel={() => handleNavigate('dashboard')} />;
      case 'profile': return <Profile onLogout={handleLogout} />;
      case 'activity-log': return <ActivityLog />;
      case 'report-history': return <ReportHistory />;
      case 'add-report-type': return <AddReportType />;
      case 'members': return <Members />;

      // ---- Phase 2: Data Seksi ----
      case 'section-data': return <SectionData onNavigate={handleNavigate} />;
      case 'section-inteldakim': return <SectionData initialSectionFilter="inteldakim" onNavigate={handleNavigate} />;
      case 'section-lalintalkim': return <SectionData initialSectionFilter="lalintalkim" onNavigate={handleNavigate} />;
      case 'section-tikim': return <SectionData initialSectionFilter="tikim" onNavigate={handleNavigate} />;
      case 'section-tu': return <SectionData initialSectionFilter="tata usaha" onNavigate={handleNavigate} />;

      // ---- Work Program ----
      case 'work-program-input': return <WorkProgramInput initialMode="form" />;
      case 'work-program-list': return <WorkProgramInput initialMode="list" />;

      // ---- Monthly Report (legacy) ----
      case 'monthly-report': return <MonthlyReport />;
      case 'report-input-inteldakim': return <MonthlyReport sectionFilter="inteldakim" />;
      case 'report-input-lalintalkim': return <MonthlyReport sectionFilter="lalintalkim" />;
      case 'report-input-tikim': return <MonthlyReport sectionFilter="tikim" />;
      case 'report-input-tu': return <MonthlyReport sectionFilter="tata_usaha" />;

      // ---- Lainnya ----
      case 'policy-brief': return <PolicyBriefEditor />;
      case 'write-report': return <PolicyBriefEditor />;
      case 'verification': return <VerificationDashboard onNavigate={handleNavigate} />;
      case 'archive': return <Archive />;

      case 'dashboard':
      default:
        return <DashboardHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <DashboardLayout
        onNavigate={handleNavigate}
        currentView={currentView}
        onLogout={handleLogout}
        user={user}
      >
        {renderContent()}
      </DashboardLayout>
      <NotificationToast />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <SectionProvider>
            <ProgramProvider>
              <ReportProvider>
                <PolicyBriefProvider>
                  <AppContent />
                </PolicyBriefProvider>
              </ReportProvider>
            </ProgramProvider>
          </SectionProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
