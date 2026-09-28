import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';

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

class UpdateService {
  private activeUpdate: Update | null = null;
  private status: UpdateStatus = 'idle';
  private listeners: Set<(status: UpdateStatus, info?: UpdateInfo, progress?: number) => void> = new Set();
  private updateInfo: UpdateInfo | null = null;
  private progressPercent: number = 0;

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
   * Check for remote updates from the release server.
   * If an update is detected, automatically downloads it in the background
   * and transitions to 'ready' status ("Restart to update").
   */
  public async checkForUpdates(silent: boolean = true): Promise<boolean> {
    try {
      this.status = 'checking';
      this.notify();

      const update = await check();

      if (!update) {
        this.status = 'idle';
        this.notify();
        return false;
      }

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
    } catch (err) {
      if (!silent) {
        console.warn('[Auto-Updater] Check failed or running in non-release mode:', err);
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
    if (!this.activeUpdate) return;

    try {
      this.status = 'downloading';
      this.progressPercent = 0;
      this.notify();

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

    try {
      // First attempt relaunch via plugin-process
      await relaunch();
    } catch (err) {
      console.warn('[Auto-Updater] plugin-process relaunch fallback to native command:', err);
      try {
        // Fallback to custom Rust app_restart command
        await invoke('app_restart');
      } catch (nativeErr) {
        console.error('[Auto-Updater] Fatal: failed to trigger restart:', nativeErr);
        // Force window reload as last resort
        window.location.reload();
      }
    }
  }

  /**
   * Demo/Simulation mode for testing UI in development.
   */
  public simulateUpdateReady(mockVersion: string = '1.0.1'): void {
    this.updateInfo = {
      version: mockVersion,
      currentVersion: '1.0.0',
      notes: 'Consular speed optimizations and security patch.',
      date: new Date().toISOString(),
    };
    this.status = 'ready';
    this.notify();
  }
}

export const updateService = new UpdateService();
