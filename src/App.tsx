import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServicesView } from './components/ServicesView';
import { PassportView } from './components/PassportView';
import { LoginView } from './components/LoginView';
import { NavigationTab, UserProfile } from './types';
import './App.css';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>('services');
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
        if (activeTab === 'passport') {
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

  const handleLogout = () => {
    localStorage.removeItem('fs_user_session');
    setUser(null);
    setActiveTab('services');
  };

  const handleSelectPassport = () => {
    setActiveTab('passport');
  };

  const handleBackToServices = () => {
    setActiveTab('services');
  };

  const currentPathString = !user 
    ? 'Sign In' 
    : (activeTab === 'passport' ? 'Services / Passport' : 'Services');

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
            onLogout={handleLogout}
          />

          <main className="content-viewport">
            <div className="content-scroll-container">
              {activeTab === 'services' && (
                <ServicesView onSelectPassport={handleSelectPassport} />
              )}

              {activeTab === 'passport' && (
                <PassportView onBack={handleBackToServices} />
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
