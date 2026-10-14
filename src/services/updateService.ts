import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'restarting' | 'error';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  notes?: string;
  date?: string;
}

export interface UpdateProgressCallback {
  (downloaded: number, total: number, percent: number): void;
}

function isNewerVersion(remote: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const [rMaj = 0, rMin = 0, rPat = 0] = parse(remote);
  const [cMaj = 0, cMin = 0, cPat = 0] = parse(current);
  if (rMaj !== cMaj) return rMaj > cMaj;
  if (rMin !== cMin) return rMin > cMin;
  return rPat > cPat;
}

class UpdateService {
  private activeUpdate: Update | null = null;
  private status: UpdateStatus = 'idle';
  private listeners: Set<(status: UpdateStatus, info?: UpdateInfo, progress?: number) => void> = new Set();
  private updateInfo: UpdateInfo | null = null;
  private progressPercent: number = 0;
  private fallbackDownloadUrl: string | null = null;
  private installerPath: string | null = null;
  private lastCheckTimestamp: number = 0;
  private isCheckingBusy: boolean = false;

  public subscribe(cb: (status: UpdateStatus, info?: UpdateInfo, progress?: number) => void) {
    this.listeners.add(cb);
    cb(this.status, this.updateInfo ?? undefined, this.progressPercent);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.status, this.updateInfo ?? undefined, this.progressPercent);
    }
  }

  public getStatus(): UpdateStatus {
    return this.status;
  }

  public getUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  public getProgress(): number {
    return this.progressPercent;
  }

  private async checkRemoteRelease(): Promise<UpdateInfo | null> {
    let currentVersion = '1.0.90';
    try {
      currentVersion = await invoke<string>('get_app_version');
    } catch {
      try {
        currentVersion = await getVersion();
      } catch {
        currentVersion = '1.0.90';
      }
    }

    const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

    // 1. Native Rust command via curl (zero browser sandbox, zero CORS restrictions, zero rate-limit)
    try {
      const nativeJson = await invoke<string>('check_remote_update');
      if (nativeJson) {
        const data = JSON.parse(nativeJson);
        if (data.version && isNewerVersion(data.version, currentVersion)) {
          if (isWindows && data.platforms?.['windows-x86_64']?.url) {
            this.fallbackDownloadUrl = data.platforms['windows-x86_64'].url;
          } else if (!isWindows && data.platforms?.['darwin-universal']?.url) {
            this.fallbackDownloadUrl = data.platforms['darwin-universal'].url;
          }

          return {
            version: data.version,
            currentVersion,
            notes: data.notes || 'New release update available.',
            date: data.pub_date,
          };
        }
      }
    } catch (nativeErr) {
      // Continue to next checks
    }

    // 2. Direct GitHub release download latest.json (Direct redirect, no CDN cache)
    try {
      const res = await fetch(`https://github.com/pankaj886/foreigners-studio-releases/releases/latest/download/latest.json?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.version && isNewerVersion(data.version, currentVersion)) {
          if (isWindows && data.platforms?.['windows-x86_64']?.url) {
            this.fallbackDownloadUrl = data.platforms['windows-x86_64'].url;
          } else if (!isWindows && data.platforms?.['darwin-universal']?.url) {
            this.fallbackDownloadUrl = data.platforms['darwin-universal'].url;
          }

          return {
            version: data.version,
            currentVersion,
            notes: data.notes || 'New release update available.',
            date: data.pub_date,
          };
        }
      }
    } catch {}

    // 3. Raw githubusercontent fallback
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/pankaj886/foreigners-studio-releases/main/latest.json?_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (rawRes.ok) {
        const data = await rawRes.json();
        if (data.version && isNewerVersion(data.version, currentVersion)) {
          if (isWindows && data.platforms?.['windows-x86_64']?.url) {
            this.fallbackDownloadUrl = data.platforms['windows-x86_64'].url;
          } else if (!isWindows && data.platforms?.['darwin-universal']?.url) {
            this.fallbackDownloadUrl = data.platforms['darwin-universal'].url;
          }

          return {
            version: data.version,
            currentVersion,
            notes: data.notes || 'New release update available.',
            date: data.pub_date,
          };
        }
      }
    } catch {}

    return null;
  }

  public async checkForUpdates(silent: boolean = true): Promise<boolean> {
    if (this.status === 'downloading' || this.status === 'restarting' || this.status === 'ready') {
      return false;
    }
    if (this.isCheckingBusy) {
      return false;
    }

    this.isCheckingBusy = true;
    this.lastCheckTimestamp = Date.now();

    try {
      this.status = 'checking';
      this.notify();

      // 1. Primary check: Native high-speed check via Rust curl backend
      const remoteInfo = await this.checkRemoteRelease();
      if (remoteInfo) {
        this.updateInfo = remoteInfo;
        this.status = 'available';
        this.notify();

        await this.downloadUpdate();
        this.isCheckingBusy = false;
        return true;
      }

      // 2. Tauri plugin-updater check fallback
      let update: Update | null = null;
      try {
        update = await check();
      } catch (checkErr) {
        if (!silent) {
          console.warn('[Auto-Updater] Tauri updater check note:', checkErr);
        }
      }

      if (update) {
        this.activeUpdate = update;
        this.updateInfo = {
          version: update.version,
          currentVersion: update.currentVersion,
          notes: update.body || undefined,
          date: update.date || undefined,
        };

        this.status = 'available';
        this.notify();

        await this.downloadUpdate();
        this.isCheckingBusy = false;
        return true;
      }

      this.status = 'idle';
      this.notify();
      this.isCheckingBusy = false;
      return false;
    } catch (err) {
      if (!silent) {
        console.warn('[Auto-Updater] Check failed:', err);
      }
      this.status = 'idle';
      this.notify();
      this.isCheckingBusy = false;
      return false;
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      this.status = 'downloading';
      this.progressPercent = 0;
      this.notify();

      if (this.activeUpdate) {
        let downloadedBytes = 0;
        let totalBytes = 0;

        await this.activeUpdate.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              totalBytes = event.data.contentLength || 0;
              this.progressPercent = 0;
              this.notify();
              break;
            case 'Progress':
              downloadedBytes += event.data.chunkLength;
              if (totalBytes > 0) {
                this.progressPercent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              }
              this.notify();
              break;
            case 'Finished':
              this.progressPercent = 100;
              this.status = 'ready';
              this.notify();
              break;
          }
        });

        this.status = 'ready';
        this.notify();
        return;
      }

      if (this.fallbackDownloadUrl) {
        this.progressPercent = 30;
        this.notify();

        const savedPath = await invoke<string>('download_installer', { url: this.fallbackDownloadUrl });
        this.installerPath = savedPath;
        this.progressPercent = 100;
        this.status = 'ready';
        this.notify();
        return;
      }

      this.status = 'ready';
      this.notify();
    } catch (err) {
      console.error('[Auto-Updater] Download failed:', err);
      this.status = 'error';
      this.notify();
    }
  }

  public async restartAndApplyUpdate(): Promise<void> {
    this.status = 'restarting';
    this.notify();

    if (!this.installerPath && this.fallbackDownloadUrl) {
      try {
        this.installerPath = await invoke<string>('download_installer', { url: this.fallbackDownloadUrl });
      } catch (err) {
        console.warn('[Auto-Updater] Installer late-fetch warning:', err);
      }
    }

    if (this.installerPath) {
      try {
        await invoke('apply_update_and_restart', { installerPath: this.installerPath });
        return;
      } catch (err) {
        console.warn('[Auto-Updater] apply_update_and_restart error:', err);
      }
    }

    if (this.activeUpdate) {
      try {
        await relaunch();
        return;
      } catch (err) {
        console.warn('[Auto-Updater] plugin-process relaunch fallback to native command:', err);
        try {
          await invoke('app_restart');
          return;
        } catch (nativeErr) {
          console.error('[Auto-Updater] Fatal: failed to trigger restart:', nativeErr);
        }
      }
    }

    try {
      await relaunch();
    } catch {
      try {
        await invoke('app_restart');
      } catch {
        window.location.reload();
      }
    }
  }

  /**
   * Initializes dynamic, event-driven update detection.
   * - Fires immediately on application boot (0 artificial delay).
   * - Dynamically triggers on window focus, visibility change, network online, and custom events.
   * - Continuously monitors adaptively in the background without fixed 1-minute blind polling.
   */
  public initDynamicWatcher(): () => void {
    // 1. Immediate trigger on application startup (zero delay)
    this.checkForUpdates(true).catch(() => {});

    const debouncedCheck = () => {
      // Prevent redundant checks if checked within the last 10 seconds
      if (Date.now() - this.lastCheckTimestamp > 10000 && this.status !== 'ready' && this.status !== 'downloading') {
        this.checkForUpdates(true).catch(() => {});
      }
    };

    // 2. Event-driven triggers
    const onFocus = () => debouncedCheck();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedCheck();
      }
    };
    const onOnline = () => debouncedCheck();
    const onCustomTrigger = () => {
      this.checkForUpdates(false).catch(() => {});
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('fs:trigger-update-check', onCustomTrigger);

    // 3. Adaptive background watcher (monitors for new releases every 30s dynamically)
    const monitorInterval = setInterval(() => {
      if (this.status !== 'ready' && this.status !== 'downloading' && this.status !== 'restarting') {
        this.checkForUpdates(true).catch(() => {});
      }
    }, 30000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('fs:trigger-update-check', onCustomTrigger);
      clearInterval(monitorInterval);
    };
  }

  public simulateUpdateReady(mockVersion: string = '1.0.8'): void {
    this.updateInfo = {
      version: mockVersion,
      currentVersion: '1.0.7',
      notes: 'Consular speed optimizations and security patch.',
      date: new Date().toISOString(),
    };
    this.status = 'ready';
    this.notify();
  }
}

export const updateService = new UpdateService();
