/**
 * automationApi.ts - Autonomous High-Speed Gateway Client
 * Seamlessly and silently discovers the active Cloudflare tunnel or local automation server in the background.
 * Requires 0 user configuration or manual URL management.
 */

const GITHUB_API_GATEWAY_URL = 'https://api.github.com/repos/pankaj886/foreigners-studio-releases/contents/gateway_config.json';
const CLOUD_GATEWAY_RAW_URL = 'https://raw.githubusercontent.com/pankaj886/foreigners-studio-releases/main/gateway_config.json';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:8001';

export interface ApplicationItem {
  folder_name: string;
  status: 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'NEEDS_CORRECTION' | 'FILLING_PORTAL' | 'PENDING_CONFIRMATION' | 'SUBMITTING_PORTAL' | 'COMPLETED' | 'ERROR' | string;
  stage: string;
  arn?: string;
  applicant_name?: string;
  error_type?: string;
  error_message?: string;
  missing_fields?: string[];
  missing_details?: Array<{
    field: string;
    label: string;
    type: 'text' | 'dropdown';
    options?: string[];
    section: 'general' | 'indian_address' | 'italian_address';
    current_value?: string;
  }>;
  extracted_data?: Record<string, any>;
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
      this.activeBaseUrl = cached.replace(/\/+$/, '');
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
    if (this.isResolving && !forceRefresh) {
      return this.isResolving;
    }

    this.isResolving = (async () => {
      // 1. If we have an active URL and not forcing refresh, verify it quickly
      if (this.activeBaseUrl && !forceRefresh) {
        if (await this.pingHealth(this.activeBaseUrl, 3000)) {
          return this.activeBaseUrl;
        }
      }

      let candidatePublicUrl = '';

      // 2A. Instant Cloud Registry lookup via GitHub Contents API (bypasses raw CDN 5-min cache)
      try {
        const ghRes = await fetch(`${GITHUB_API_GATEWAY_URL}?_t=${Date.now()}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          cache: 'no-store',
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData?.content) {
            const decoded = atob(ghData.content.replace(/\s+/g, ''));
            const parsed = JSON.parse(decoded);
            const pub = (parsed?.public_url || '').replace(/\/+$/, '');
            if (pub && pub.startsWith('http')) {
              candidatePublicUrl = pub;
            }
          }
        }
      } catch (_) {}

      // 2B. Fallback Cloud Registry lookup via raw.githubusercontent.com
      if (!candidatePublicUrl) {
        try {
          const rawRes = await fetch(`${CLOUD_GATEWAY_RAW_URL}?_t=${Date.now()}`, { cache: 'no-store' });
          if (rawRes.ok) {
            const rawData = await rawRes.json();
            const pub = (rawData?.public_url || '').replace(/\/+$/, '');
            if (pub && pub.startsWith('http')) {
              candidatePublicUrl = pub;
            }
          }
        } catch (_) {}
      }

      // If discovered candidate from remote cloud registry, verify health
      if (candidatePublicUrl) {
        if (await this.pingHealth(candidatePublicUrl, 7000)) {
          this.activeBaseUrl = candidatePublicUrl;
          localStorage.setItem('fs_automation_api_url', candidatePublicUrl);
          return candidatePublicUrl;
        }
      }

      // 3. Check bundled or local runtime config
      try {
        const localCfgRes = await fetch(`/tunnel_config.json?_t=${Date.now()}`, { cache: 'no-store' });
        if (localCfgRes.ok) {
          const localCfg = await localCfgRes.json();
          const pub = (localCfg?.public_url || '').replace(/\/+$/, '');
          if (pub && pub.startsWith('http') && (await this.pingHealth(pub, 5000))) {
            this.activeBaseUrl = pub;
            localStorage.setItem('fs_automation_api_url', pub);
            return pub;
          }
        }
      } catch (_) {}

      // 4. Check localhost (developer workstation)
      if (await this.pingHealth(LOCAL_FALLBACK_URL, 1500)) {
        this.activeBaseUrl = LOCAL_FALLBACK_URL;
        localStorage.setItem('fs_automation_api_url', LOCAL_FALLBACK_URL);
        return LOCAL_FALLBACK_URL;
      }

      // If candidate was found from cloud registry but ping timed out, still use it over localhost on remote clients
      if (candidatePublicUrl) {
        this.activeBaseUrl = candidatePublicUrl;
        return candidatePublicUrl;
      }

      return this.activeBaseUrl || LOCAL_FALLBACK_URL;
    })().finally(() => {
      this.isResolving = null;
    });

    return this.isResolving;
  }

  private async pingHealth(url: string, timeoutMs = 6000): Promise<boolean> {
    try {
      const cleanUrl = url.replace(/\/+$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${cleanUrl}/api/health`, { signal: controller.signal });
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
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${baseUrl}${cleanPath}`;

    try {
      const res = await fetch(url, options);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('Error Connecting to Server');
      }
      return res;
    } catch (_) {
      // Re-resolve active gateway and retry once
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}${cleanPath}`;
      try {
        const retryRes = await fetch(url, options);
        if (retryRes.status === 502 || retryRes.status === 503 || retryRes.status === 504) {
          throw new Error('Error Connecting to Server');
        }
        return retryRes;
      } catch (retryErr: any) {
        throw new Error('Error Connecting to Server');
      }
    }
  }

  public async uploadApplication(
    clientEmail: string,
    portalUsername: string,
    portalPassword: string,
    files: File[]
  ): Promise<{ success: boolean; folder_name: string; message: string }> {
    // Ensure gateway is resolved prior to constructing payload
    let baseUrl = await this.resolveGateway();

    const buildFormData = () => {
      const fd = new FormData();
      fd.append('client_email', clientEmail);
      fd.append('portal_username', portalUsername);
      fd.append('portal_password', portalPassword);
      for (const file of files) {
        fd.append('files', file);
      }
      return fd;
    };

    let url = `${baseUrl}/api/upload`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        body: buildFormData(),
      });
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('Error Connecting to Server');
      }
    } catch (_) {
      // Retry once with refreshed gateway
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}/api/upload`;
      try {
        res = await fetch(url, {
          method: 'POST',
          body: buildFormData(),
        });
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('Error Connecting to Server');
        }
      } catch (innerErr: any) {
        throw new Error('Error Connecting to Server');
      }
    }

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

  public async submitCorrection(
    clientEmail: string,
    folderName: string,
    correctedData: Record<string, any>
  ): Promise<{ success: boolean; message: string }> {
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/correct-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ corrected_data: correctedData }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit corrected details' }));
      throw new Error(err.detail || 'Failed to submit corrected details');
    }

    return await res.json();
  }
}

export const automationApi = new AutomationApiService();
