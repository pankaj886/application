import React from 'react';
import { 
  Briefcase, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { NavigationTab, UserProfile } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: UserProfile | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  user,
  onLogout,
}) => {
  return (
    <aside className={`sidebar-wrapper ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sidebar-top">
        {!collapsed && (
          <span className="sidebar-title">Menu</span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="sidebar-toggle-btn"
          title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="sidebar-toggle-icon" />
          ) : (
            <PanelLeftClose className="sidebar-toggle-icon" />
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          onClick={() => onTabChange('services')}
          className={`nav-tab-item ${activeTab === 'services' || activeTab === 'passport' ? 'active' : ''}`}
          title="Services"
        >
          <div className="nav-tab-icon-wrapper">
            <Briefcase className="nav-icon" />
          </div>

          {!collapsed && (
            <div className="nav-tab-body">
              <span className="nav-tab-label">Services</span>
            </div>
          )}

          {!collapsed && (
            <ChevronRight className="nav-chevron" />
          )}
        </button>
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className={`sidebar-user-card ${collapsed ? 'collapsed-card' : ''}`}>
            <div className="sidebar-user-avatar-wrapper" title={`${user.name} (${user.email})`}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="sidebar-user-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="sidebar-user-fallback">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={user.name}>{user.name}</span>
                <span className="sidebar-user-email" title={user.email}>{user.email}</span>
              </div>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="sidebar-logout-btn"
                title={`Sign out (${user.email})`}
                aria-label="Sign out"
              >
                <LogOut className="sidebar-logout-icon" />
              </button>
            )}
          </div>
        )}

        {!collapsed && (
          <span className="sidebar-version">v1.0.10</span>
        )}
      </div>
    </aside>
  );
};
