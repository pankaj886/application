import React from 'react';
import { 
  Briefcase, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronRight
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  serviceCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  serviceCount
}) => {
  return (
    <aside className={`sidebar-wrapper ${collapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sidebar-top">
        {!collapsed && (
          <div className="sidebar-heading">
            <span className="sidebar-title">Menu</span>
          </div>
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
              <span className="nav-tab-badge">{serviceCount}</span>
            </div>
          )}

          {!collapsed && (
            <ChevronRight className="nav-chevron" />
          )}
        </button>
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <span className="sidebar-version">v1.0</span>
        )}
      </div>
    </aside>
  );
};
