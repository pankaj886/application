import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronRight,
  LogOut,
  Upload,
  FileText,
  Eye,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { NavigationTab, FreshReissueSection, UserProfile } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user?: UserProfile | null;
  onLogout?: () => void;
  freshReissueSection?: FreshReissueSection;
  onFreshReissueSectionChange?: (sec: FreshReissueSection) => void;
  passportServiceType?: 'reissue' | 'fresh';
  draftCount?: number;
  previewCount?: number;
  completedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  user,
  onLogout,
  freshReissueSection = 'form',
  onFreshReissueSectionChange,
  passportServiceType = 'reissue',
  draftCount = 0,
  previewCount = 0,
  completedCount = 0,
}) => {
  const [appVersion, setAppVersion] = useState<string>('1.0.86');

  useEffect(() => {
    invoke<string>('get_app_version')
      .then((ver) => {
        if (ver) setAppVersion(ver);
      })
      .catch(() => {
        getVersion()
          .then((ver) => {
            if (ver) setAppVersion(ver);
          })
          .catch(() => {});
      });
  }, []);

  const isInsideFreshReissue = activeTab === 'fresh-reissue';

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

        {isInsideFreshReissue && (
          <div className="sidebar-service-subnav">
            {!collapsed && (
              <div className="subnav-header">
                <BookOpen className="subnav-header-icon" />
                <span className="subnav-header-title">
                  {passportServiceType === 'fresh' ? 'Fresh Passport' : 'Reissue Passport'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onFreshReissueSectionChange && onFreshReissueSectionChange('form')}
              className={`subnav-item ${freshReissueSection === 'form' ? 'active' : ''}`}
              title="New Application"
            >
              <div className="subnav-icon-wrapper">
                <Upload className="subnav-icon" />
              </div>
              {!collapsed && (
                <span className="subnav-label">New Application</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onFreshReissueSectionChange && onFreshReissueSectionChange('drafts')}
              className={`subnav-item ${freshReissueSection === 'drafts' ? 'active' : ''}`}
              title="Drafts Section"
            >
              <div className="subnav-icon-wrapper">
                <FileText className="subnav-icon" />
              </div>
              {!collapsed && (
                <div className="subnav-label-group">
                  <span className="subnav-label">Drafts</span>
                  {draftCount > 0 && (
                    <span className="subnav-badge subnav-badge-amber">{draftCount}</span>
                  )}
                </div>
              )}
              {collapsed && draftCount > 0 && (
                <span className="subnav-dot-badge subnav-dot-badge-amber" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onFreshReissueSectionChange && onFreshReissueSectionChange('preview')}
              className={`subnav-item ${freshReissueSection === 'preview' ? 'active' : ''}`}
              title="Preview Section"
            >
              <div className="subnav-icon-wrapper">
                <Eye className="subnav-icon" />
              </div>
              {!collapsed && (
                <div className="subnav-label-group">
                  <span className="subnav-label">Preview</span>
                  {previewCount > 0 && (
                    <span className="subnav-badge">{previewCount}</span>
                  )}
                </div>
              )}
              {collapsed && previewCount > 0 && (
                <span className="subnav-dot-badge" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onFreshReissueSectionChange && onFreshReissueSectionChange('submitted')}
              className={`subnav-item ${freshReissueSection === 'submitted' ? 'active' : ''}`}
              title="Submitted Section"
            >
              <div className="subnav-icon-wrapper">
                <CheckCircle2 className="subnav-icon" />
              </div>
              {!collapsed && (
                <div className="subnav-label-group">
                  <span className="subnav-label">Submitted</span>
                  {completedCount > 0 && (
                    <span className="subnav-badge subnav-badge-green">{completedCount}</span>
                  )}
                </div>
              )}
              {collapsed && completedCount > 0 && (
                <span className="subnav-dot-badge subnav-dot-badge-green" />
              )}
            </button>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        {collapsed ? (
          <div className="sidebar-collapsed-footer">
            {user && (
              <>
                <div
                  className="sidebar-user-avatar-wrapper"
                  title={`${user.name} (${user.email})`}
                >
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

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="sidebar-collapsed-logout-btn"
                    title={`Sign out (${user.email})`}
                    aria-label="Sign out"
                  >
                    <LogOut className="sidebar-logout-icon" />
                  </button>
                )}
              </>
            )}
            <span className="sidebar-version-collapsed">v{appVersion}</span>
          </div>
        ) : (
          <div className="sidebar-expanded-footer">
            {user && (
              <div className="sidebar-user-card">
                <div
                  className="sidebar-user-avatar-wrapper"
                  title={`${user.name} (${user.email})`}
                >
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

                <div className="sidebar-user-info">
                  <span className="sidebar-user-name" title={user.name}>{user.name}</span>
                  <span className="sidebar-user-email" title={user.email}>{user.email}</span>
                </div>

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

            <div className="sidebar-version-row">
              <span className="sidebar-version-tag">v{appVersion}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
