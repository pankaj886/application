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

/**
 * Compare two semver strings (e.g. "1.0.7" vs "1.0.0").
 * Returns true if remote is strictly newer than current.
 */
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

  public subscribe(cb: (status: UpdateStatus, info?: UpdateInfo, progress?: number) => void) {
    this.listeners.add(cb);
    // Immediately emit current state
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

  /**
   * Fallback release check: queries latest.json or GitHub API
   */
  private async checkRemoteRelease(): Promise<UpdateInfo | null> {
    let currentVersion = '1.0.0';
    try {
      currentVersion = await getVersion();
    } catch {
      currentVersion = '1.0.7';
    }

    const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

    // 1. Try fetching latest.json directly from GitHub releases
    try {
      const res = await fetch('https://github.com/pankaj886/foreigners-studio-releases/releases/latest/download/latest.json', {
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
    } catch {
      // Ignore network errors in silent check
    }

    // 2. Try fetching latest release from GitHub API
    try {
      const apiRes = await fetch('https://api.github.com/repos/pankaj886/foreigners-studio-releases/releases/latest', {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      if (apiRes.ok) {
        const release = await apiRes.json();
        const tag = (release.tag_name || '').replace(/^v/, '');
        if (tag && isNewerVersion(tag, currentVersion)) {
          // Find matching installer asset
          if (Array.isArray(release.assets)) {
            if (isWindows) {
              const exeAsset = release.assets.find((a: any) =>
                typeof a.name === 'string' &&
                a.name.endsWith('.exe') &&
                !a.name.toLowerCase().includes('uninstall')
              );
              if (exeAsset) this.fallbackDownloadUrl = exeAsset.browser_download_url;
            } else {
              const dmgAsset = release.assets.find((a: any) =>
                typeof a.name === 'string' && a.name.endsWith('.dmg')
              );
              if (dmgAsset) this.fallbackDownloadUrl = dmgAsset.browser_download_url;
            }
          }

          return {
            version: tag,
            currentVersion,
            notes: release.name || release.body || 'New release update available.',
            date: release.published_at,
          };
        }
      }
    } catch {
      // Ignore network errors in silent check
    }

    return null;
  }

  /**
   * Check for remote updates from the release server.
   * If an update is detected, automatically downloads it in the background
   * and transitions to 'ready' status ("Restart to update").
   */
  public async checkForUpdates(silent: boolean = true): Promise<boolean> {
    try {
      this.status = 'checking';
      this.notify();

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

        // Automatically download the update in the background
        await this.downloadUpdate();
        return true;
      }

      // Fallback check via release metadata
      const remoteInfo = await this.checkRemoteRelease();
      if (remoteInfo) {
        this.updateInfo = remoteInfo;
        this.status = 'available';
        this.notify();

        // Automatically download the update in the background
        await this.downloadUpdate();
        return true;
      }

      this.status = 'idle';
      this.notify();
      return false;
    } catch (err) {
      if (!silent) {
        console.warn('[Auto-Updater] Check failed:', err);
      }
      this.status = 'idle';
      this.notify();
      return false;
    }
  }

  /**
   * Download the update chunk-by-chunk with progress updates.
   */
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

  /**
   * Relaunch the application to finalize installation of the new version.
   * Can be invoked when status is 'ready'.
   */
  public async restartAndApplyUpdate(): Promise<void> {
    this.status = 'restarting';
    this.notify();

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
   * Demo/Simulation mode for testing UI in development.
   */
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
