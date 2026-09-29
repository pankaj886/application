/**
 * automationApi.ts - Autonomous High-Speed Gateway Client
 * Seamlessly and silently discovers the active Cloudflare tunnel or local automation server in the background.
 * Requires 0 user configuration or manual URL management.
 */

const CLOUD_GATEWAY_URL = 'https://raw.githubusercontent.com/pankaj886/foreigners-studio-releases/main/gateway_config.json';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:8001';

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
  private activeBaseUrl: string = '';
  private isResolving: Promise<string> | null = null;

  constructor() {
    const cached = localStorage.getItem('fs_automation_api_url');
    if (cached) {
      this.activeBaseUrl = cached;
    }
    // Eagerly resolve gateway in background
    this.resolveGateway().catch(() => {});
  }

  public getBaseUrl(): string {
    return this.activeBaseUrl || LOCAL_FALLBACK_URL;
  }

  /**
   * Autonomously discovers and verifies the live Cloudflare Tunnel or local server.
   * Completely transparent to the user.
   */
  public async resolveGateway(forceRefresh = false): Promise<string> {
    if (this.isResolving) {
      return this.isResolving;
    }

    this.isResolving = (async () => {
      // 1. If we have an active URL and not forcing refresh, check if it's healthy
      if (this.activeBaseUrl && !forceRefresh) {
        if (await this.pingHealth(this.activeBaseUrl)) {
          return this.activeBaseUrl;
        }
      }

      // 2. Fetch live Cloud Gateway endpoint from public release registry
      try {
        const cloudRes = await fetch(`${CLOUD_GATEWAY_URL}?_t=${Date.now()}`, { cache: 'no-store' });
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          const publicUrl = (cloudData?.public_url || '').replace(/\/+$/, '');
          if (publicUrl && await this.pingHealth(publicUrl)) {
            this.activeBaseUrl = publicUrl;
            localStorage.setItem('fs_automation_api_url', publicUrl);
            return publicUrl;
          }
        }
      } catch (_) {}

      // 3. Check bundled or local runtime config
      try {
        const localCfgRes = await fetch(`/tunnel_config.json?_t=${Date.now()}`, { cache: 'no-store' });
        if (localCfgRes.ok) {
          const localCfg = await localCfgRes.json();
          const publicUrl = (localCfg?.public_url || '').replace(/\/+$/, '');
          if (publicUrl && await this.pingHealth(publicUrl)) {
            this.activeBaseUrl = publicUrl;
            localStorage.setItem('fs_automation_api_url', publicUrl);
            return publicUrl;
          }
        }
      } catch (_) {}

      // 4. Fallback to localhost if running on developer workstation
      if (await this.pingHealth(LOCAL_FALLBACK_URL)) {
        this.activeBaseUrl = LOCAL_FALLBACK_URL;
        localStorage.setItem('fs_automation_api_url', LOCAL_FALLBACK_URL);
        return LOCAL_FALLBACK_URL;
      }

      return this.activeBaseUrl || LOCAL_FALLBACK_URL;
    })().finally(() => {
      this.isResolving = null;
    });

    return this.isResolving;
  }

  private async pingHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${url}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Executes fetch with automatic gateway resolution and single auto-retry.
   */
  private async fetchWithAutoRetry(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let baseUrl = await this.resolveGateway();
    let url = `${baseUrl}${path}`;

    try {
      const res = await fetch(url, options);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('Gateway unavailable');
      }
      return res;
    } catch (err) {
      // Re-resolve active gateway and retry once
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}${path}`;
      return await fetch(url, options);
    }
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

    const res = await this.fetchWithAutoRetry('/api/upload', {
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
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/status`);
    if (!res.ok) throw new Error('Failed to retrieve applications status');
    const data = await res.json();
    return data.applications || [];
  }

  public async getPendingPreviews(clientEmail: string): Promise<PreviewItem[]> {
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/previews`);
    if (!res.ok) throw new Error('Failed to retrieve preview applications');
    const data = await res.json();
    return data.previews || [];
  }

  public async getCompletedApplications(clientEmail: string): Promise<CompletedItem[]> {
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/completed`);
    if (!res.ok) throw new Error('Failed to retrieve completed applications');
    const data = await res.json();
    return data.completed || [];
  }

  public async fetchPdfBlobUrl(relativeUrl: string): Promise<string> {
    const cleanRel = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    const res = await this.fetchWithAutoRetry(cleanRel);
    if (!res.ok) throw new Error(`Could not fetch PDF (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  public async confirmSubmission(
    clientEmail: string,
    folderName: string,
    arn: string
  ): Promise<{ success: boolean; arn: string; applicant_name: string; submitted_at: string }> {
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/confirm-submit`, {
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
