const GITHUB_API_GATEWAY_URL = 'https://api.github.com/repos/pankaj886/foreigners-studio-releases/contents/gateway_config.json';
const CLOUD_GATEWAY_RAW_URL = 'https://raw.githubusercontent.com/pankaj886/foreigners-studio-releases/main/gateway_config.json';
const LOCAL_FALLBACK_URL = 'http://127.0.0.1:8001';

export interface QuotaInfo {
  used: number;
  total: number;
  is_exhausted: boolean;
  is_warning?: boolean;
  portal_username?: string;
}

export interface ClientStatusResponse {
  client_email: string;
  applications: ApplicationItem[];
  quota?: QuotaInfo;
}

export interface ApplicationItem {
  folder_name: string;
  status: 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'NEEDS_CORRECTION' | 'FILLING_PORTAL' | 'PENDING_CONFIRMATION' | 'SUBMITTING_PORTAL' | 'COMPLETED' | 'ERROR' | string;
  stage: string;
  progress?: number;
  arn?: string;
  applicant_name?: string;
  portal_email?: string;
  google_email?: string;
  declaration_place?: string;
  error_type?: string;
  error_message?: string;
  failed_upload_slot?: string;
  failed_upload_file?: string;
  portal_server_error?: string;
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
  service_type?: string;
  updated_at?: string;
}

export interface CategorizedUploadFiles {
  photo?: File | null;
  signature?: File | null;
  passport?: File | null;
  identity?: File | null;
  residence?: File | null;
  supporting?: File | null;
  files?: File[];
}

export interface PreviewItem {
  folder_name: string;
  applicant_name: string;
  arn: string;
  status: string;
  stage?: string;
  progress?: number;
  service_type?: string;
  portal_email?: string;
  google_email?: string;
  declaration_place?: string;
  error_type?: string;
  error_message?: string;
  failed_upload_slot?: string;
  failed_upload_file?: string;
  portal_server_error?: string;
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
  service_type?: string;
  portal_email?: string;
  google_email?: string;
  submitted_at: string;
  receipt_url?: string;
  application_form_url?: string;
}

export interface VoiceInstructionResult {
  success: boolean;
  folder_name: string;
  transcription: string;
  summary: string;
  field_updates: Record<string, any>;
  field_clears: string[];
  photo_updated: boolean;
  signature_updated: boolean;
  passport_preview_url?: string;
  declaration_preview_url?: string;
  photo_preview_url?: string;
  signature_preview_url?: string;
  updated_at: string;
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

class AutomationApiService {
  private activeBaseUrl: string = '';
  private isResolving: Promise<string> | null = null;
  private inFlightRequests: Map<string, Promise<any>> = new Map();

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
    if (this.isResolving) {
      return this.isResolving;
    }

    this.isResolving = (async () => {
      if (await this.pingHealth(LOCAL_FALLBACK_URL, 2500)) {
        this.activeBaseUrl = LOCAL_FALLBACK_URL;
        localStorage.setItem('fs_automation_api_url', LOCAL_FALLBACK_URL);
        return LOCAL_FALLBACK_URL;
      }

      if (this.activeBaseUrl && !forceRefresh) {
        if (await this.pingHealth(this.activeBaseUrl, 2000)) {
          return this.activeBaseUrl;
        }
      }

      try {
        const localCfgRes = await fetch(`/tunnel_config.json?_t=${Date.now()}`, { cache: 'no-store' });
        if (localCfgRes.ok) {
          const localCfg = await localCfgRes.json();
          const pub = (localCfg?.public_url || '').replace(/\/+$/, '');
          if (pub && pub.startsWith('http') && (await this.pingHealth(pub, 2500))) {
            this.activeBaseUrl = pub;
            localStorage.setItem('fs_automation_api_url', pub);
            return pub;
          }
        }
      } catch (_) {}

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

      if (candidatePublicUrl && (await this.pingHealth(candidatePublicUrl, 4000))) {
        this.activeBaseUrl = candidatePublicUrl;
        localStorage.setItem('fs_automation_api_url', candidatePublicUrl);
        return candidatePublicUrl;
      }

      this.activeBaseUrl = LOCAL_FALLBACK_URL;
      localStorage.setItem('fs_automation_api_url', LOCAL_FALLBACK_URL);
      return LOCAL_FALLBACK_URL;
    })().finally(() => {
      this.isResolving = null;
    });

    return this.isResolving;
  }

  private async pingHealth(url: string, timeoutMs = 4000): Promise<boolean> {
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

  private async fetchWithAutoRetry(path: string, options: RequestInit = {}): Promise<Response> {
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
      } catch (_) {
        if (baseUrl !== LOCAL_FALLBACK_URL) {
          try {
            const localRes = await fetch(`${LOCAL_FALLBACK_URL}${cleanPath}`, options);
            if (localRes.status < 500) {
              this.activeBaseUrl = LOCAL_FALLBACK_URL;
              return localRes;
            }
          } catch (_) {}
        }
        throw new Error('Error Connecting to Server');
      }
    }
  }

  private fetchWithDeduplication<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, promise);
    return promise;
  }

  public async uploadApplication(
    clientEmail: string,
    portalUsername: string,
    portalPassword: string,
    files: File[] | CategorizedUploadFiles,
    userEmail?: string,
    declarationPlace?: string,
    serviceType?: string,
    infoData?: string
  ): Promise<{ success: boolean; folder_name: string; message: string }> {
    let baseUrl = await this.resolveGateway();

    const buildFormData = () => {
      const fd = new FormData();
      fd.append('client_email', clientEmail);
      fd.append('portal_username', portalUsername);
      fd.append('portal_password', portalPassword);
      if (userEmail) fd.append('user_email', userEmail);
      if (declarationPlace && declarationPlace.trim()) fd.append('declaration_place', declarationPlace.trim().toUpperCase());
      if (serviceType && serviceType.trim()) fd.append('service_type', serviceType.trim().toLowerCase());
      if (infoData && infoData.trim()) fd.append('info_data', infoData.trim());

      if (Array.isArray(files)) {
        for (const file of files) fd.append('files', file);
      } else if (files && typeof files === 'object') {
        if (files.photo) fd.append('photo', files.photo);
        if (files.signature) fd.append('signature', files.signature);
        if (files.passport) fd.append('passport', files.passport);
        if (files.identity) fd.append('identity', files.identity);
        if (files.residence) fd.append('residence', files.residence);
        if (files.supporting) fd.append('supporting', files.supporting);
        if (files.files && Array.isArray(files.files)) {
          for (const f of files.files) fd.append('files', f);
        }
      }
      return fd;
    };

    let url = `${baseUrl}/api/upload`;
    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', body: buildFormData() });
      if (res.status >= 500) throw new Error('Error Connecting to Server');
    } catch (_) {
      baseUrl = await this.resolveGateway(true);
      url = `${baseUrl}/api/upload`;
      try {
        res = await fetch(url, { method: 'POST', body: buildFormData() });
        if (res.status >= 500) throw new Error('Error Connecting to Server');
      } catch (_) {
        if (baseUrl !== LOCAL_FALLBACK_URL) {
          try {
            res = await fetch(`${LOCAL_FALLBACK_URL}/api/upload`, { method: 'POST', body: buildFormData() });
            if (res.status >= 500) throw new Error('Error Connecting to Server');
            this.activeBaseUrl = LOCAL_FALLBACK_URL;
          } catch (_) {
            throw new Error('Error Connecting to Server');
          }
        } else {
          throw new Error('Error Connecting to Server');
        }
      }
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Upload failed'));
    }

    return await res.json();
  }

  public async getClientStatus(clientEmail: string, userEmail?: string): Promise<ClientStatusResponse> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const key = `status:${uKey}:${clientEmail.toLowerCase()}`;
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    return this.fetchWithDeduplication(key, async () => {
      const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/status${q}`);
      if (!res.ok) throw new Error('Failed to retrieve applications status');
      const data = await res.json();
      return {
        client_email: data.client_email || clientEmail,
        applications: data.applications || [],
        quota: data.quota
      };
    });
  }

  public async getClientQuota(clientEmail: string, portalUsername?: string): Promise<QuotaInfo> {
    const target = (portalUsername || clientEmail).toLowerCase();
    const key = `quota:${target}`;
    return this.fetchWithDeduplication(key, async () => {
      const q = portalUsername ? `?portal_username=${encodeURIComponent(portalUsername)}` : '';
      const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/quota${q}`);
      if (!res.ok) throw new Error('Failed to retrieve portal quota');
      return await res.json();
    });
  }

  public async getPendingPreviews(clientEmail: string, userEmail?: string): Promise<PreviewItem[]> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const key = `previews:${uKey}:${clientEmail.toLowerCase()}`;
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    return this.fetchWithDeduplication(key, async () => {
      const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/previews${q}`);
      if (!res.ok) throw new Error('Failed to retrieve preview applications');
      const data = await res.json();
      return data.previews || [];
    });
  }

  public async getCompletedApplications(clientEmail: string, userEmail?: string): Promise<CompletedItem[]> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const key = `completed:${uKey}:${clientEmail.toLowerCase()}`;
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    return this.fetchWithDeduplication(key, async () => {
      const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/completed${q}`);
      if (!res.ok) throw new Error('Failed to retrieve completed applications');
      const data = await res.json();
      return data.completed || [];
    });
  }

  public async fetchPdfBlobUrl(urlOrPath: string): Promise<string> {
    const isAbsolute = urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
    let res: Response;
    if (isAbsolute) {
      res = await fetch(urlOrPath);
    } else {
      const cleanRel = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
      res = await this.fetchWithAutoRetry(cleanRel);
    }
    if (!res.ok) throw new Error(`Could not fetch PDF (${res.status})`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  public async confirmSubmission(
    clientEmail: string,
    folderName: string,
    arn: string,
    userEmail?: string
  ): Promise<{ success: boolean; arn: string; applicant_name: string; submitted_at: string }> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/confirm-submit${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arn, user_email: uKey || undefined }),
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
    correctedData: Record<string, any>,
    userEmail?: string
  ): Promise<{ success: boolean; message: string }> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    const res = await this.fetchWithAutoRetry(`/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/correct-data${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corrected_data: correctedData, user_email: uKey || undefined }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Failed to submit corrected details'));
    }

    return await res.json();
  }

  public async dismissApplication(
    clientEmail: string,
    folderName: string,
    userEmail?: string
  ): Promise<{ success: boolean; message: string }> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    let res: Response;
    try {
      res = await this.fetchWithAutoRetry(
        `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}${q}`,
        { method: 'DELETE' }
      );
    } catch (_) {
      res = await this.fetchWithAutoRetry(
        `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/dismiss${q}`,
        { method: 'POST' }
      );
    }

    if (!res.ok) {
      try {
        res = await this.fetchWithAutoRetry(
          `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/dismiss${q}`,
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

  public async sendVoiceInstruction(
    clientEmail: string,
    folderName: string,
    audioBlob?: Blob | null,
    textInstruction?: string,
    userEmail?: string
  ): Promise<VoiceInstructionResult> {
    const baseUrl = await this.resolveGateway();
    const fd = new FormData();
    if (audioBlob) fd.append('audio', audioBlob, 'recording.webm');
    if (textInstruction && textInstruction.trim()) fd.append('text_instruction', textInstruction.trim());
    const uKey = (userEmail || '').trim().toLowerCase();
    if (uKey) fd.append('user_email', uKey);

    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    const cleanPath = `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/voice-instruction${q}`;
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${cleanPath}`, { method: 'POST', body: fd });
      if (res.status >= 500) throw new Error('Error Connecting to Server');
    } catch (_) {
      const retryUrl = await this.resolveGateway(true);
      res = await fetch(`${retryUrl}${cleanPath}`, { method: 'POST', body: fd });
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Voice instruction processing failed'));
    }

    return await res.json();
  }

  public async editPhoto(
    clientEmail: string,
    folderName: string,
    instruction: string,
    userEmail?: string
  ): Promise<{ success: boolean; message: string; photo_preview_url: string; photo_size_kb: number }> {
    const uKey = (userEmail || '').trim().toLowerCase();
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';
    const res = await this.fetchWithAutoRetry(
      `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/edit-photo${q}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, user_email: uKey || undefined }),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Photo edit failed'));
    }

    return await res.json();
  }

  public async aiEditPhoto(
    clientEmail: string,
    folderName: string,
    instruction: string,
    userEmail?: string
  ): Promise<{ success: boolean; message: string; photo_preview_url: string; photo_size_kb: number }> {
    return this.editPhoto(clientEmail, folderName, instruction, userEmail);
  }

  public async reuploadFailedPortalFile(
    clientEmail: string,
    folderName: string,
    file: File,
    slot?: string,
    targetFilename?: string,
    arn?: string,
    autoSubmit = true,
    userEmail?: string
  ): Promise<{
    success: boolean;
    status: string;
    replaced_file: string;
    arn?: string;
    applicant_name?: string;
    submitted_at?: string;
    receipt_pdf?: string;
    application_form_pdf?: string;
  }> {
    const fd = new FormData();
    fd.append('file', file);
    if (slot) fd.append('slot', slot);
    if (targetFilename) fd.append('target_filename', targetFilename);
    if (arn) fd.append('arn', arn);
    fd.append('auto_submit', autoSubmit ? 'true' : 'false');
    const uKey = (userEmail || '').trim().toLowerCase();
    if (uKey) fd.append('user_email', uKey);
    const q = uKey ? `?user_email=${encodeURIComponent(uKey)}` : '';

    const res = await this.fetchWithAutoRetry(
      `/api/clients/${encodeURIComponent(clientEmail)}/${encodeURIComponent(folderName)}/reupload-file${q}`,
      {
        method: 'POST',
        body: fd,
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(parseErrorDetail(errJson, 'Re-upload and portal submission failed'));
    }

    return await res.json();
  }

  public async validatePhotoWithPortal(
    photo: File,
    clientEmail?: string,
    portalPassword?: string,
    userEmail?: string
  ): Promise<{
    valid: boolean;
    message: string;
    server_error?: string;
    test_arn?: string;
    face_analysis?: Record<string, any>;
    processed_photo_base64?: string;
    photo_size_kb?: number;
  }> {
    const fd = new FormData();
    fd.append('photo', photo);
    if (clientEmail && clientEmail.trim()) {
      fd.append('client_email', clientEmail.trim());
      fd.append('portal_username', clientEmail.trim());
    }
    if (portalPassword && portalPassword.trim()) {
      fd.append('portal_password', portalPassword.trim());
    }
    const uKey = (userEmail || '').trim().toLowerCase();
    if (uKey) {
      fd.append('user_email', uKey);
    }

    const res = await this.fetchWithAutoRetry('/api/validate-photo', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        valid: false,
        message: parseErrorDetail(errJson, 'This photo is not allowed by the portal. Please upload another photograph.'),
      };
    }

    return await res.json();
  }

  public async validateSignatureWithPortal(
    signature: File,
  ): Promise<{
    valid: boolean;
    message: string;
    server_error?: string;
    processed_signature_base64?: string;
    signature_size_kb?: number;
  }> {
    const fd = new FormData();
    fd.append('signature', signature);

    const res = await this.fetchWithAutoRetry('/api/validate-signature', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        valid: false,
        message: parseErrorDetail(errJson, 'Signature does not meet portal specifications.'),
      };
    }

    return await res.json();
  }

  public async validateDocumentWithPortal(
    document: File,
  ): Promise<{
    valid: boolean;
    message: string;
    server_error?: string;
    processed_doc_base64?: string;
    doc_size_kb?: number;
  }> {
    const fd = new FormData();
    fd.append('document', document);

    const res = await this.fetchWithAutoRetry('/api/validate-document', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        valid: false,
        message: parseErrorDetail(errJson, 'Document does not meet portal specifications.'),
      };
    }

    return await res.json();
  }

  public async classifyDocuments(
    files: File[],
    serviceType: string = 'reissue',
    applicantData?: Record<string, any>,
    notes?: string
  ): Promise<{
    success: boolean;
    service_type: string;
    classifications: Array<{
      filename: string;
      role: string;
      recommended_name: string;
      target_slot: 'photo' | 'sign' | 'passport' | 'identity' | 'residence' | 'info' | 'extra';
      confidence: number;
      reasoning: string;
      size_kb?: number;
      page_count?: number;
      is_pdf?: boolean;
      is_image?: boolean;
    }>;
  }> {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    fd.append('service_type', serviceType);
    if (applicantData) fd.append('applicant_data', JSON.stringify(applicantData));
    if (notes) fd.append('notes', notes);

    const res = await this.fetchWithAutoRetry('/api/classify-documents', {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      return { success: false, service_type: serviceType, classifications: [] };
    }
    return await res.json();
  }
}

export const automationApi = new AutomationApiService();

