const GITHUB_API_GATEWAY_URL = 'https://api.github.com/repos/pankaj886/foreigners-studio-releases/contents/gateway_config.json';
const CLOUD_GATEWAY_RAW_URL = 'https://raw.githubusercontent.com/pankaj886/foreigners-studio-releases/main/gateway_config.json';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:8001';

export interface ApplicationItem {
  folder_name: string;
  status: 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'NEEDS_CORRECTION' | 'FILLING_PORTAL' | 'PENDING_CONFIRMATION' | 'SUBMITTING_PORTAL' | 'COMPLETED' | 'ERROR' | string;
  stage: string;
  arn?: string;
  applicant_name?: string;
  portal_email?: string;
  google_email?: string;
  declaration_place?: string;
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

export interface CategorizedUploadFiles {
  photo?: File | null;
  signature?: File | null;
  passport?: File | null;
  residence?: File | null;
  supporting?: File | null;
  files?: File[];
}

export interface PreviewItem {
  folder_name: string;
  applicant_name: string;
  arn: string;
  status: string;
  portal_email?: string;
  google_email?: string;
  declaration_place?: string;
  passport_preview_url: string;
  declaration_preview_url: string;
  photo_preview_url?: string;
  signature_preview_url?: string;
  updated_at?: string;
}

export interface CompletedItem {
  folder_name: string;
  applicant_name: string;
  arn: string;
  status: string;
  portal_email?: string;
  google_email?: string;
  submitted_at: string;
  receipt_url?: string;
}

function parseErrorDetail(errData: any, fallback = 'Operation failed'): string {
  if (!errData) return fallback;
  if (typeof errData === 'string') return errData;
  if (typeof errData.detail === 'string') return errData.detail;
  if (Array.isArray(errData.detail)) {
    const msgs = errData.detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && item.msg) {
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join(' -> ') : '';
          return field ? `${field}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join(', ');
  }
  if (errData.detail && typeof errData.detail === 'object') {
    return JSON.stringify(errData.detail);
  }
  if (typeof errData.message === 'string') return errData.message;
  return fallback;
}

function isServerError(msg: any): boolean {
  if (typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('cloudflare') ||
    lower.includes('trycloudflare') ||
    lower.includes('connect') ||
    lower.includes('gateway') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('network')
  );
}

class AutomationApiService {
  private activeBaseUrl: string = '';
  private isResolving: Promise<string> | null = null;

  constructor() {
    const cached = localStorage.getItem('fs_automation_api_url');
    if (cached) {
      this.activeBaseUrl = cached.replace(/\/+$/, '');
    }
    this.resolveGateway().catch(() => {});
  }

  public getBaseUrl(): string {
    return this.activeBaseUrl || LOCAL_FALLBACK_URL;
  }

  public async resolveGateway(forceRefresh = false): Promise<string> {
    if (this.isResolving && !forceRefresh) {
      return this.isResolving;
    }

    this.isResolving = (async () => {
      if (this.activeBaseUrl && !forceRefresh) {
        if (await this.pingHealth(this.activeBaseUrl, 3000)) {
          return this.activeBaseUrl;
        }
      }

      let candidatePublicUrl = '';

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

      if (candidatePublicUrl) {
        if (await this.pingHealth(candidatePublicUrl, 7000)) {
          this.activeBaseUrl = candidatePublicUrl;
          localStorage.setItem('fs_automation_api_url', candidatePublicUrl);
          return candidatePublicUrl;
        }
      }

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

      if (await this.pingHealth(LOCAL_FALLBACK_URL, 1500)) {
        this.activeBaseUrl = LOCAL_FALLBACK_URL;
        localStorage.setItem('fs_automation_api_url', LOCAL_FALLBACK_URL);
        return LOCAL_FALLBACK_URL;
      }

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

  private async fetchWithAutoRetry(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let baseUrl = await this.resolveGateway();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${baseUrl}${cleanPath}`;

    try {
      const res = await fetch(url, options);
      if (res.status >= 500) {
        throw new Error('Error Connecting to Server');
      }
      return res;
    } catch (_) {
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}${cleanPath}`;
      try {
        const retryRes = await fetch(url, options);
        if (retryRes.status >= 500) {
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
    files: File[] | CategorizedUploadFiles,
    userEmail?: string,
    declarationPlace?: string
  ): Promise<{ success: boolean; folder_name: string; message: string }> {
    let baseUrl = await this.resolveGateway();

    const buildFormData = () => {
      const fd = new FormData();
      fd.append('client_email', clientEmail);
      fd.append('portal_username', portalUsername);
      fd.append('portal_password', portalPassword);
      if (userEmail) {
        fd.append('user_email', userEmail);
      }
      if (declarationPlace && declarationPlace.trim()) {
        fd.append('declaration_place', declarationPlace.trim().toUpperCase());
      }
      if (Array.isArray(files)) {
        for (const file of files) {
          fd.append('files', file);
        }
      } else if (files && typeof files === 'object') {
        if (files.photo) fd.append('photo', files.photo);
        if (files.signature) fd.append('signature', files.signature);
        if (files.passport) fd.append('passport', files.passport);
        if (files.residence) fd.append('residence', files.residence);
        if (files.supporting) fd.append('supporting', files.supporting);
        if (files.files && Array.isArray(files.files)) {
          for (const f of files.files) {
            fd.append('files', f);
          }
        }
        // Backward compatibility fallback for servers that require 'files' field
        if (!files.files || files.files.length === 0) {
          const allDocs = [files.photo, files.signature, files.passport, files.residence, files.supporting].filter(Boolean) as File[];
          for (const doc of allDocs) {
            fd.append('files', doc);
          }
        }
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
      if (res.status >= 500) {
        throw new Error('Error Connecting to Server');
      }
    } catch (_) {
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}/api/upload`;
      try {
        res = await fetch(url, {
          method: 'POST',
          body: buildFormData(),
        });
        if (res.status >= 500) {
          throw new Error('Error Connecting to Server');
        }
      } catch (innerErr: any) {
        throw new Error('Error Connecting to Server');
      }
    }

    if (!res.ok) {
      if (res.status >= 500) {
        throw new Error('Error Connecting to Server');
      }
      const errJson = await res.json().catch(() => null);
      const msg = parseErrorDetail(errJson, 'Upload failed');
      if (isServerError(msg)) {
        throw new Error('Error Connecting to Server');
      }
      throw new Error(msg);
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
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Final submission failed'));
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
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Failed to submit corrected details'));
    }

    return await res.json();
  }

  public async dismissApplication(
    clientEmail: string,
    folderName: string
  ): Promise<{ success: boolean; message: string }> {
    let res: Response;
    try {
      res = await this.fetchWithAutoRetry(
        `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}`,
        { method: 'DELETE' }
      );
    } catch (_) {
      res = await this.fetchWithAutoRetry(
        `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/dismiss`,
        { method: 'POST' }
      );
    }

    if (!res.ok) {
      try {
        res = await this.fetchWithAutoRetry(
          `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/dismiss`,
          { method: 'POST' }
        );
      } catch (_) {}
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Failed to dismiss application'));
    }

    return await res.json();
  }
}

export const automationApi = new AutomationApiService();
