import { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ServicesView } from './components/ServicesView';
import { PassportView } from './components/PassportView';
import { NavigationTab } from './types';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('services');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 960);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

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

  const handleSelectPassport = () => {
    setActiveTab('passport');
  };

  const handleBackToServices = () => {
    setActiveTab('services');
  };

  const currentPathString = activeTab === 'passport' 
    ? 'Services / Passport' 
    : 'Services';

  return (
    <div className={`app-root ${windowWidth < 840 ? 'layout-compact' : ''} ${windowWidth < 600 ? 'layout-narrow' : ''}`}>
      <TitleBar currentPath={currentPathString} />

      <div className="workspace-container">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          serviceCount={1}
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
    </div>
  );
}

export default App;
