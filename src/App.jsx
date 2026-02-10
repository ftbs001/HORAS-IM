import { useState } from 'react';
import ErrorBoundary from './components/common/ErrorBoundary';

// Core Layout
import DashboardLayout from './components/layout/DashboardLayout';
import StatsGrid from './components/dashboard/StatsCard';
import DataTable from './components/dashboard/DataTable';
import DashboardHome from './components/dashboard/DashboardHome';

// Components Phase 1
import CreateReport from './components/dashboard/CreateReport';
import Profile from './components/pages/Profile';
import ActivityLog from './components/pages/ActivityLog';
import ReportHistory from './components/pages/ReportHistory';
import AddReportType from './components/pages/AddReportType';
import Members from './components/pages/Members';

// Components Phase 2 (New)
import SectionData from './components/pages/SectionData';
import WorkProgramInput from './components/pages/WorkProgramInput';
import MonthlyReport from './components/pages/MonthlyReport'; // Added Import
import PolicyBriefEditor from './components/pages/PolicyBriefEditor';
import VerificationDashboard from './components/pages/VerificationDashboard';
import Archive from './components/pages/Archive';

import LoginPage from './components/pages/LoginPage';

// Notification System
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import NotificationToast from './components/common/NotificationToast';
import { getViewDisplayName } from './utils/viewNameMap';

// Program Data Context
import { ProgramProvider } from './contexts/ProgramContext';
import { ReportProvider } from './contexts/ReportContext';
import { SectionProvider } from './contexts/SectionContext';
import { PolicyBriefProvider } from './contexts/PolicyBriefContext';

import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const isLoggedIn = !!user;

  // Authentication Logic
  const handleLogout = () => {
    logout();
    setCurrentView('dashboard');
    showNotification('Logout Berhasil! Sampai jumpa 👋', 'info');
  };

  // Navigation handler with notification
  const handleNavigate = (view) => {
    const viewName = getViewDisplayName(view) || (view === 'monthly-report' ? 'Modul Laporan Bulanan' : view);

    // Check if user is already on this page
    if (currentView === view) {
      showNotification(`Anda sudah berada di ${viewName}`, 'warning');
      return; // Don't update view, just show notification
    }

    setCurrentView(view);
    showNotification(`Membuka ${viewName}`, 'info');
  };

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentView) {
      // Phase 1 Pages
      case 'create-report': return <CreateReport onCancel={() => handleNavigate('dashboard')} />;
      case 'profile': return <Profile onLogout={handleLogout} />;
      case 'activity-log': return <ActivityLog />;
      case 'report-history': return <ReportHistory />;
      case 'add-report-type': return <AddReportType />;
      case 'members': return <Members />;

      // Phase 2 Pages
      case 'section-data': return <SectionData onNavigate={handleNavigate} />;
      case 'section-inteldakim': return <SectionData initialSectionFilter="inteldakim" onNavigate={handleNavigate} />;
      case 'section-lalintalkim': return <SectionData initialSectionFilter="lalintalkim" onNavigate={handleNavigate} />;
      case 'section-tikim': return <SectionData initialSectionFilter="tikim" onNavigate={handleNavigate} />;
      case 'section-tu': return <SectionData initialSectionFilter="tata usaha" onNavigate={handleNavigate} />;

      // Work Program Module
      case 'work-program-input': return <WorkProgramInput initialMode="form" />;
      case 'work-program-list': return <WorkProgramInput initialMode="list" />;

      // Monthly Report (General & Scoped)
      case 'monthly-report': return <MonthlyReport />;
      case 'report-input-inteldakim': return <MonthlyReport sectionFilter="inteldakim" />;
      case 'report-input-lalintalkim': return <MonthlyReport sectionFilter="lalintalkim" />;
      case 'report-input-tikim': return <MonthlyReport sectionFilter="tikim" />;
      case 'report-input-tu': return <MonthlyReport sectionFilter="tata_usaha" />;

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
      <DashboardLayout onNavigate={handleNavigate} currentView={currentView} onLogout={handleLogout} user={user}>
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
