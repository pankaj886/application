import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, Copy, X, RotateCw } from 'lucide-react';
import { updateService, UpdateStatus, UpdateInfo } from '../services/updateService';

interface TitleBarProps {
  currentPath: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ currentPath }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);

  const checkMaximized = async () => {
    try {
      const state = await invoke<boolean>('app_is_maximized');
      setIsMaximized(state);
    } catch {
    }
  };

  useEffect(() => {
    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  // Subscribe to background auto-updater and perform startup check
  useEffect(() => {
    const unsubscribe = updateService.subscribe((status, info, progress) => {
      setUpdateStatus(status);
      if (info) setUpdateInfo(info);
      if (progress !== undefined) setDownloadProgress(progress);
    });

    // Check remote release server on startup
    const timer = setTimeout(() => {
      updateService.checkForUpdates(true);
    }, 3000);

    // Periodic check every 1 minute (rapid update detection)
    const interval = setInterval(() => {
      updateService.checkForUpdates(true);
    }, 1 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_minimize');
    } catch {
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_toggle_maximize');
      await checkMaximized();
    } catch {
      setIsMaximized(prev => !prev);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_close');
    } catch {
    }
  };

  const handleRestartToUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateService.restartAndApplyUpdate();
    } catch (err) {
      console.error('Failed to restart for update:', err);
    }
  };

  // Render the Update action pill (Restart to update / Downloading / Restarting)
  const renderUpdateAction = () => {
    if (updateStatus === 'ready') {
      return (
        <button
          type="button"
          onClick={handleRestartToUpdate}
          className="titlebar-update-btn"
          title={`Update version ${updateInfo?.version || 'new'} downloaded. Click to restart and install.`}
          aria-label="Restart application to install update"
        >
          <RotateCw className="update-btn-icon" />
          <span className="update-btn-label">Restart to update</span>
        </button>
      );
    }

    if (updateStatus === 'downloading') {
      return (
        <div className="titlebar-update-downloading" title="Downloading update package over secure connection...">
          <RotateCw className="update-btn-icon animate-spin" />
          <span className="update-btn-label">
            Downloading update{downloadProgress > 0 ? ` ${downloadProgress}%` : ''}
          </span>
        </div>
      );
    }

    if (updateStatus === 'restarting') {
      return (
        <div className="titlebar-update-restarting" title="Applying update and relaunching...">
          <RotateCw className="update-btn-icon animate-spin" />
          <span className="update-btn-label">Restarting...</span>
        </div>
      );
    }

    return null;
  };

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={handleToggleMaximize}
      className={`titlebar-container ${isMac ? 'titlebar-mac' : ''}`}
    >
      <div className={`titlebar-brand ${isMac ? 'ml-18' : ''}`} data-tauri-drag-region>
        <div className="brand-crest">
          <img src="/fs_logo.svg" alt="Foreigners Studio Logo" className="brand-logo-img" />
        </div>
        <div className="brand-meta" data-tauri-drag-region>
          <span className="brand-name">Foreigners Studio</span>
        </div>
      </div>

      <div className="titlebar-center" data-tauri-drag-region>
        <span className="titlebar-path">{currentPath}</span>
      </div>

      {isMac && (
        <div className="titlebar-controls-mac" data-tauri-drag-region="false">
          {renderUpdateAction()}
        </div>
      )}

      {!isMac && (
        <div className="titlebar-controls" data-tauri-drag-region="false">
          {/* Top UI corner: Action button placed immediately before Minimize button */}
          {renderUpdateAction()}

          <button
            type="button"
            onClick={handleMinimize}
            className="control-btn minimize-btn"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus className="control-icon" />
          </button>

          <button
            type="button"
            onClick={handleToggleMaximize}
            className="control-btn maximize-btn"
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="control-icon rotate-180" />
            ) : (
              <Square className="control-icon" />
            )}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="control-btn close-btn"
            title="Close"
            aria-label="Close"
          >
            <X className="control-icon" />
          </button>
        </div>
      )}
    </header>
  );
};
