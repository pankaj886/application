import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServicesView } from './components/ServicesView';
import { PassportView } from './components/PassportView';
import { FreshReissueView } from './components/FreshReissueView';
import { LoginView } from './components/LoginView';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { NavigationTab, FreshReissueSection, UserProfile } from './types';
import { automationApi } from './services/automationApi';
import './App.css';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavigationTab>('services');
  const [freshReissueSection, setFreshReissueSection] = useState<FreshReissueSection>('form');
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 960);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Initialize and verify saved session on startup
  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const rawSaved = localStorage.getItem('fs_user_session');
        if (rawSaved) {
          const parsed: UserProfile = JSON.parse(rawSaved);
          if (parsed && parsed.id_token) {
            // Verify cryptographically with Google endpoint
            const verified = await invoke<UserProfile>('verify_google_session', { idToken: parsed.id_token });
            // Maintain original access token and update session
            setUser({
              ...verified,
              access_token: parsed.access_token || verified.access_token,
            });
            localStorage.setItem('fs_user_session', JSON.stringify({
              ...verified,
              access_token: parsed.access_token || verified.access_token,
            }));
            setAuthChecking(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Session verification failed, requesting new sign in:', err);
        localStorage.removeItem('fs_user_session');
      }
      setUser(null);
      setAuthChecking(false);
    };

    checkSavedSession();
  }, []);

  // Poll automation counts for badges
  useEffect(() => {
    if (!user?.email) return;

    const updateCounts = async () => {
      try {
        const activeEmail = localStorage.getItem('fs_active_client_email') || user.email;
        const [prevs, comps] = await Promise.all([
          automationApi.getPendingPreviews(activeEmail).catch(() => []),
          automationApi.getCompletedApplications(activeEmail).catch(() => []),
        ]);
        setPreviewCount(prevs.length);
        setCompletedCount(comps.length);
      } catch (_) {}
    };

    updateCounts();
    const interval = setInterval(updateCounts, 4000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowWidth(width);

      const wRatio = width / 1200;
      const hRatio = height / 760;
      const rawScale = (wRatio * 0.70) + (hRatio * 0.30);
      const scaleFactor = Math.min(Math.max(rawScale, 0.72), 1.60);

      document.documentElement.style.setProperty('--app-scale', scaleFactor.toFixed(3));
      document.documentElement.style.setProperty('--window-w', `${width}px`);
      document.documentElement.style.setProperty('--window-h', `${height}px`);

      if (prevWidth >= 960 && width < 960) {
        setSidebarCollapsed(true);
      } else if (prevWidth < 960 && width >= 960) {
        setSidebarCollapsed(false);
      }
      prevWidth = width;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (activeTab === 'fresh-reissue') {
          setActiveTab('passport');
        } else if (activeTab === 'passport') {
          setActiveTab('services');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const handleLoginSuccess = (newSession: UserProfile) => {
    localStorage.setItem('fs_user_session', JSON.stringify(newSession));
    setUser(newSession);
  };

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('fs_user_session');
    setUser(null);
    setActiveTab('services');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleSelectPassport = () => {
    setActiveTab('passport');
  };

  const handleBackToServices = () => {
    setActiveTab('services');
  };

  const handleSelectFreshReissue = () => {
    setActiveTab('fresh-reissue');
    setFreshReissueSection('form');
  };

  const handleBackToPassport = () => {
    setActiveTab('passport');
  };

  const currentPathString = !user 
    ? 'Sign In' 
    : (activeTab === 'fresh-reissue'
        ? (freshReissueSection === 'preview'
            ? 'Services / Passport / Fresh & Reissue / Preview'
            : (freshReissueSection === 'submitted'
                ? 'Services / Passport / Fresh & Reissue / Submitted'
                : 'Services / Passport / Fresh & Reissue'))
        : (activeTab === 'passport' ? 'Services / Passport' : 'Services'));

  return (
    <div className={`app-root ${!user ? 'auth-mode' : ''} ${windowWidth < 840 ? 'layout-compact' : ''} ${windowWidth < 600 ? 'layout-narrow' : ''}`}>
      <TitleBar currentPath={currentPathString} />

      {authChecking ? (
        <div className="auth-splash-loading">
          <div className="auth-splash-crest">
            <img src="/fs_logo.svg" alt="Foreigners Studio" className="auth-splash-logo animate-pulse" />
          </div>
          <p className="auth-splash-text">Verifying secure session...</p>
        </div>
      ) : !user ? (
        <main className="content-viewport auth-viewport">
          <LoginView onLoginSuccess={handleLoginSuccess} />
        </main>
      ) : (
        <div className="workspace-container">
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            user={user}
            onLogout={handleLogoutRequest}
            freshReissueSection={freshReissueSection}
            onFreshReissueSectionChange={(sec) => setFreshReissueSection(sec)}
            previewCount={previewCount}
            completedCount={completedCount}
          />

          <main className="content-viewport">
            <div className="content-scroll-container">
              {activeTab === 'services' && (
                <ServicesView onSelectPassport={handleSelectPassport} />
              )}

              {activeTab === 'passport' && (
                <PassportView 
                  onBack={handleBackToServices} 
                  onSelectFreshReissue={handleSelectFreshReissue}
                />
              )}

              {activeTab === 'fresh-reissue' && (
                <FreshReissueView
                  user={user}
                  currentSection={freshReissueSection}
                  onSectionChange={(sec) => setFreshReissueSection(sec)}
                  onBackToPassport={handleBackToPassport}
                />
              )}
            </div>
          </main>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </div>
  );
}

export default App;
