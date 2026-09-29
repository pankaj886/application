/**
 * automationApi.ts - High-Speed Client for Foreigners Studio Automation Gateway
 * Connects autonomously to local server or Cloudflare tunnel.
 */

import tunnelConfig from '../tunnel_config.json';

let bundledTunnelUrl = (tunnelConfig as any)?.public_url || '';

const LOCAL_URL = 'http://127.0.0.1:8001';

export interface ApplicationItem {
  folder_name: string;
  status: 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'FILLING_PORTAL' | 'PENDING_CONFIRMATION' | 'SUBMITTING_PORTAL' | 'COMPLETED' | 'ERROR' | string;
  stage: string;
  arn?: string;
  applicant_name?: string;
  error_type?: string;
  error_message?: string;
  has_passport_preview?: boolean;
  has_declaration_preview?: boolean;
  has_receipt?: boolean;
  updated_at?: string;
}

export interface PreviewItem {
  folder_name: string;
  applicant_name: string;
  arn: string;
  status: string;
  passport_preview_url: string;
  declaration_preview_url: string;
  updated_at?: string;
}

export interface CompletedItem {
  folder_name: string;
  applicant_name: string;
  arn: string;
  status: string;
  submitted_at: string;
  receipt_url?: string;
}

class AutomationApiService {
  private activeBaseUrl: string = LOCAL_URL;
  private isConnected: boolean = false;
  private listeners: Set<(connected: boolean, url: string) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem('fs_automation_api_url');
    if (saved) {
      this.activeBaseUrl = saved;
    }
    this.checkConnection();
  }

  public subscribe(cb: (connected: boolean, url: string) => void) {
    this.listeners.add(cb);
    cb(this.isConnected, this.activeBaseUrl);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) {
      cb(this.isConnected, this.activeBaseUrl);
    }
  }

  public setBaseUrl(url: string) {
    this.activeBaseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('fs_automation_api_url', this.activeBaseUrl);
    this.checkConnection();
  }

  public getBaseUrl(): string {
    return this.activeBaseUrl;
  }

  public getConnectionType(): 'local' | 'tunnel' | 'offline' {
    if (!this.isConnected) return 'offline';
    if (this.activeBaseUrl.includes('127.0.0.1') || this.activeBaseUrl.includes('localhost')) {
      return 'local';
    }
    return 'tunnel';
  }

  public async checkConnection(): Promise<boolean> {
    // 1. Try to fetch dynamic runtime config from /tunnel_config.json (works in dev and prod without rebuild)
    try {
      const configRes = await fetch(`/tunnel_config.json?_t=${Date.now()}`);
      if (configRes.ok) {
        const dynamicConfig = await configRes.json();
        if (dynamicConfig?.public_url) {
          bundledTunnelUrl = dynamicConfig.public_url;
        }
      }
    } catch (_) {}

    const candidateUrls = [
      this.activeBaseUrl,
      LOCAL_URL,
      bundledTunnelUrl,
    ].filter(Boolean);

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${url}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          this.activeBaseUrl = url;
          this.isConnected = true;
          if (data?.tunnel?.public_url) {
            bundledTunnelUrl = data.tunnel.public_url;
          }
          this.notify();
          return true;
        }
      } catch (_) {}
    }

    this.isConnected = false;
    this.notify();
    return false;
  }

  public async uploadApplication(
    clientEmail: string,
    portalUsername: string,
    portalPassword: string,
    files: File[]
  ): Promise<{ success: boolean; folder_name: string; message: string }> {
    const formData = new FormData();
    formData.append('client_email', clientEmail);
    formData.append('portal_username', portalUsername);
    formData.append('portal_password', portalPassword);
    for (const file of files) {
      formData.append('files', file);
    }

    const res = await fetch(`${this.activeBaseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }

    return await res.json();
  }

  public async getClientStatus(clientEmail: string): Promise<ApplicationItem[]> {
    const res = await fetch(`${this.activeBaseUrl}/api/clients/${encodeURIComponent(clientEmail)}/status`);
    if (!res.ok) throw new Error('Failed to retrieve applications status');
    const data = await res.json();
    return data.applications || [];
  }

  public async getPendingPreviews(clientEmail: string): Promise<PreviewItem[]> {
    const res = await fetch(`${this.activeBaseUrl}/api/clients/${encodeURIComponent(clientEmail)}/previews`);
    if (!res.ok) throw new Error('Failed to retrieve preview applications');
    const data = await res.json();
    return data.previews || [];
  }

  public async getCompletedApplications(clientEmail: string): Promise<CompletedItem[]> {
    const res = await fetch(`${this.activeBaseUrl}/api/clients/${encodeURIComponent(clientEmail)}/completed`);
    if (!res.ok) throw new Error('Failed to retrieve completed applications');
    const data = await res.json();
    return data.completed || [];
  }

  public getPdfUrl(clientEmail: string, folderName: string, pdfName: string): string {
    return `${this.activeBaseUrl}/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/pdf/${encodeURIComponent(pdfName)}`;
  }

  public async fetchPdfBlobUrl(clientEmail: string, folderName: string, pdfName: string): Promise<string> {
    const url = this.getPdfUrl(clientEmail, folderName, pdfName);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch PDF (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  public async confirmSubmission(
    clientEmail: string,
    folderName: string,
    arn: string
  ): Promise<{ success: boolean; arn: string; applicant_name: string; submitted_at: string }> {
    const res = await fetch(`${this.activeBaseUrl}/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/confirm-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ arn }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Submission failed' }));
      throw new Error(err.detail || 'Final submission failed');
    }

    return await res.json();
  }
}

export const automationApi = new AutomationApiService();
