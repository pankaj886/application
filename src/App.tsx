import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServicesView } from './components/ServicesView';
import { PassportView } from './components/PassportView';
import { FreshReissueView, isAppMatchingService } from './components/FreshReissueView';
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
  const [draftCount, setDraftCount] = useState<number>(0);
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [passportServiceType, setPassportServiceType] = useState<'reissue' | 'fresh' | 'surrender' | 'pcc'>('reissue');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const updateInFlight = useRef(false);

  useEffect(() => {
    const checkSavedSession = async () => {
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('devpreview')) {
        const { DEV_USER } = await import('./devPreview');
        setUser(DEV_USER);
        setAuthChecking(false);
        return;
      }
      try {
        const secureSession = await invoke<UserProfile>('verify_secure_session', { sessionToken: null });
        if (secureSession && secureSession.email) {
          setUser(secureSession);
          localStorage.setItem('fs_user_session', JSON.stringify(secureSession));
          setAuthChecking(false);
          return;
        }
      } catch (secErr: any) {
        const errStr = String(secErr || '');
        if (errStr.toLowerCase().includes('expired') || errStr.toLowerCase().includes('inactivity')) {
          console.warn('Cryptographic session expired:', errStr);
          localStorage.removeItem('fs_user_session');
          setUser(null);
          setAuthChecking(false);
          return;
        }

        try {
          const rawSaved = localStorage.getItem('fs_user_session');
          if (rawSaved) {
            const parsed: UserProfile = JSON.parse(rawSaved);
            if (parsed && parsed.id_token) {
              const verified = await invoke<UserProfile>('verify_google_session', { idToken: parsed.id_token });
              setUser({
                ...verified,
                access_token: parsed.access_token || verified.access_token,
              });
              localStorage.setItem('fs_user_session', JSON.stringify({
                ...verified,
                access_token: parsed.access_token || verified.access_token,
              }));
              await invoke('save_secure_session', { session: verified }).catch(() => {});
              setAuthChecking(false);
              return;
            }
          }
        } catch (_) {}
        console.warn('Session verification failed, sign in required:', secErr);
        localStorage.removeItem('fs_user_session');
      }
      setUser(null);
      setAuthChecking(false);
    };

    checkSavedSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      invoke('touch_session_activity').catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const updateCounts = async () => {
      if (updateInFlight.current) return;
      updateInFlight.current = true;
      try {
        const gEmail = user?.email?.trim().toLowerCase() || '';
        if (!gEmail) {
          setDraftCount(0);
          setPreviewCount(0);
          setCompletedCount(0);
          return;
        }
        const scopedKey = `fs_active_client_email_${gEmail}`;
        const storedPortalEmail = localStorage.getItem(scopedKey)?.trim().toLowerCase();
        const activeEmail = storedPortalEmail || gEmail;
        if (!activeEmail) {
          setDraftCount(0);
          setPreviewCount(0);
          setCompletedCount(0);
          return;
        }
        const [prevs, comps, statusRes] = await Promise.all([
          automationApi.getPendingPreviews(activeEmail, gEmail).catch(() => []),
          automationApi.getCompletedApplications(activeEmail, gEmail).catch(() => []),
          automationApi.getClientStatus(activeEmail, gEmail).catch(() => ({ client_email: activeEmail, applications: [] })),
        ]);
        const compArnSet = new Set((comps || []).map((c: any) => (c.arn || '').trim().toLowerCase()).filter(Boolean));
        let dismissedSet = new Set<string>();
        try {
          const raw = JSON.parse(sessionStorage.getItem('fs_dismissed_folders') || '[]');
          dismissedSet = new Set((raw || []).map((s: string) => String(s).trim().toLowerCase()).filter((s: string) => s && !/^\d+$/.test(s)));
        } catch (_) {}

        const isGenericFolderNumber = (s?: string) => Boolean(s && /^\d+$/.test(String(s).trim()));
        const isMatch = (item: any) => isAppMatchingService(item, passportServiceType);

        const allValidPrevs = (prevs || []).filter((p: any) => {
          const fn = (p.folder_name || '').trim().toLowerCase();
          const arn = (p.arn || '').trim().toLowerCase();
          const portal = (p.portal_email || '').trim().toLowerCase();

          // Only unique ARNs mark a preview as completed
          if (arn && compArnSet.has(arn)) return false;

          // If checking folder, must NOT be a generic number, must match portal, and must have same ARN
          if (portal && fn && !isGenericFolderNumber(fn)) {
            const isExactCompleted = (comps || []).some((c: any) =>
              (c.portal_email || '').trim().toLowerCase() === portal &&
              (c.folder_name || '').trim().toLowerCase() === fn &&
              c.arn && c.arn.toLowerCase() === arn
            );
            if (isExactCompleted) return false;
          }

          // Dismissed check only on specific unique ARNs
          if (arn && dismissedSet.has(arn)) return false;
          return true;
        });
        const servicePrevs = allValidPrevs.filter(isMatch);
        const effectivePreviewCount = servicePrevs.length;

        const allDrafts = (statusRes?.applications || []).filter((a: any) => {
          const fn = (a.folder_name || '').trim().toLowerCase();
          const arn = (a.arn || '').trim().toLowerCase();
          const portal = (a.portal_email || '').trim().toLowerCase();

          // Only unique ARNs mark a draft as completed
          if (arn && compArnSet.has(arn)) return false;

          if (portal && fn && !isGenericFolderNumber(fn)) {
            const isExactCompleted = (comps || []).some((c: any) =>
              (c.portal_email || '').trim().toLowerCase() === portal &&
              (c.folder_name || '').trim().toLowerCase() === fn &&
              c.arn && c.arn.toLowerCase() === arn
            );
            if (isExactCompleted) return false;
          }

          if (arn && dismissedSet.has(arn)) return false;
          const status = (a?.status || '').toUpperCase();
          if (
            a.has_passport_preview ||
            a.is_in_preview ||
            status === 'COMPLETED' ||
            status === 'SUBMITTED' ||
            status === 'DISMISSED' ||
            status === 'PENDING_CONFIRMATION' ||
            status === 'PREVIEW_READY'
          ) {
            return false;
          }
          if (
            !a.failed_upload_slot &&
            (status === 'UPLOADED' ||
            status === 'QUEUED' ||
            status === 'EXTRACTING' ||
            status === 'EXTRACTED' ||
            status === 'FILLING_PORTAL' ||
            status === 'PROCESSING' ||
            status === 'UPLOADING')
          ) {
            return false;
          }
          return Boolean(
            status === 'NEEDS_CORRECTION' ||
            status === 'PORTAL_FORM_ERROR' ||
            status === 'MISSING_MANDATORY_DATA' ||
            a.failed_upload_slot ||
            (Array.isArray(a.missing_fields) && a.missing_fields.length > 0)
          );
        });
        const serviceDrafts = allDrafts.filter(isMatch);
        const effectiveDraftCount = serviceDrafts.length;

        const serviceComps = (comps || []).filter(isMatch);
        const effectiveCompletedCount = serviceComps.length;

        setDraftCount(effectiveDraftCount);
        setPreviewCount(effectivePreviewCount);
        setCompletedCount(effectiveCompletedCount);
      } catch (_) {
      } finally {
        updateInFlight.current = false;
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 8000);
    const handleEmailChanged = () => {
      updateCounts();
    };
    window.addEventListener('fs_active_email_changed', handleEmailChanged);
    window.addEventListener('fs_counts_updated', handleEmailChanged);
    window.addEventListener('storage', handleEmailChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('fs_active_email_changed', handleEmailChanged);
      window.removeEventListener('fs_counts_updated', handleEmailChanged);
      window.removeEventListener('storage', handleEmailChanged);
    };
  }, [user?.email, passportServiceType]);

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

      if (prevWidth >= 1024 && width < 1024) {
        setSidebarCollapsed(true);
      } else if (prevWidth < 1024 && width >= 1024) {
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
    invoke('save_secure_session', { session: newSession }).catch(() => {});
  };

  const handleLogoutRequest = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    const gEmail = user?.email?.trim().toLowerCase() || '';
    if (gEmail) {
      localStorage.removeItem(`fs_active_client_email_${gEmail}`);
      localStorage.removeItem(`fs_portal_password_${gEmail}`);
    }
    localStorage.removeItem('fs_user_session');
    localStorage.removeItem('fs_active_client_email');
    localStorage.removeItem('fs_portal_password');
    try {
      window.dispatchEvent(new Event('fs_active_email_changed'));
    } catch (_) {}
    invoke('clear_saved_session').catch(() => {});
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

  const handleSelectFreshReissue = (service?: 'fresh' | 'reissue' | 'surrender' | 'pcc') => {
    if (service) {
      setPassportServiceType(service);
    }
    setActiveTab('fresh-reissue');
    setFreshReissueSection('form');
  };

  const handleBackToPassport = () => {
    setActiveTab('passport');
  };

  const serviceLabel = passportServiceType === 'fresh' 
    ? 'Fresh Passport' 
    : passportServiceType === 'surrender' 
      ? 'Surrender Certificate' 
      : passportServiceType === 'pcc'
        ? 'Police Clearance Certificate'
        : 'Reissue Passport';
  const currentPathString = !user 
    ? 'Sign In' 
    : (activeTab === 'fresh-reissue'
        ? (freshReissueSection === 'preview'
            ? `Services / Passport / ${serviceLabel} / Preview`
            : (freshReissueSection === 'drafts'
                ? `Services / Passport / ${serviceLabel} / Drafts`
                : (freshReissueSection === 'submitted'
                    ? `Services / Passport / ${serviceLabel} / Submitted`
                    : `Services / Passport / ${serviceLabel}`)))
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
            passportServiceType={passportServiceType}
            draftCount={draftCount}
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
                  onBackToServices={handleBackToServices}
                  serviceType={passportServiceType}
                  onServiceTypeChange={setPassportServiceType}
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
