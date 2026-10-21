// DEV-ONLY visual-audit harness. Loaded from main.tsx only when `import.meta.env.DEV` and the URL has `?devpreview`.
// It fakes the signed-in user and the automation API with fixture data, so every screen can be resized and inspected
// in a plain browser without Google login, Tauri, or real applicant data. Never bundled into production builds.
import type { UserProfile } from './types';

export const DEV_USER: UserProfile = {
  email: 'devpreview@example.com',
  name: 'Dev Preview',
  picture: '',
  id_token: 'dev',
  access_token: 'dev',
  expires_at: Date.now() + 86400000,
};

const PORTAL = 'dummy4@tempomail.id';
const now = '2026-10-19 12:37:20';

const completed = [
  { folder_name: 'SANGEETHAN STEPHEN', applicant_name: 'SANGEETHAN STEPHEN', arn: '26-2005349203', status: 'COMPLETED', service_type: 'reissue', portal_email: PORTAL, submitted_at: now, application_form_url: '/api/clients/x/a/file/f.pdf', receipt_url: '/api/clients/x/a/file/f.pdf' },
  { folder_name: 'A VERY LONG APPLICANT NAME THAT KEEPS GOING ON AND ON', applicant_name: 'MOHAMMED ABDUL RAHMAN KUTTIYIL PARAMBIL VELIYAKATH', arn: '26-2005347397', status: 'COMPLETED', service_type: 'fresh', portal_email: 'a.really.long.portal.email.address@tempomail-example.id', submitted_at: now, application_form_url: '/api/clients/x/b/file/f.pdf' },
  { folder_name: 'PCC ONE', applicant_name: 'PRADEEP KUMAR', arn: '26-2005340001', status: 'COMPLETED', service_type: 'pcc', portal_email: PORTAL, submitted_at: now },
];

const previews = [
  { folder_name: 'YUVAKSHI JANDU', applicant_name: 'YUVAKSHI JANDU', arn: '26-2005349093', status: 'PENDING_CONFIRMATION', stage: 'Previews ready for client verification', progress: 100, service_type: 'reissue', portal_email: PORTAL, declaration_place: 'ROME', passport_preview_url: '/api/clients/x/a/file/p.pdf', declaration_preview_url: '/api/clients/x/a/file/d.pdf', updated_at: now },
  { folder_name: 'RAHUL KHANNA', applicant_name: 'RAHUL KHANNA WITH A QUITE LONG SURNAME', arn: '26-2005349100', status: 'PENDING_CONFIRMATION', stage: 'Previews ready', progress: 100, service_type: 'fresh', portal_email: PORTAL, declaration_place: 'MILAN', passport_preview_url: '/api/clients/x/b/file/p.pdf', declaration_preview_url: '/api/clients/x/b/file/d.pdf', updated_at: now },
];

const applications = [
  { folder_name: 'DRAFT SIGN MISSING', applicant_name: 'DEEPAK SHARMA', status: 'NEEDS_CORRECTION', stage: 'Applicant signature is missing. Application saved as draft - please upload the signature to continue.', progress: 45, service_type: 'reissue', portal_email: PORTAL, error_type: 'MISSING_PHOTO_OR_SIGNATURE', error_message: 'Applicant signature is missing. Application saved as draft - please upload the signature to continue.', missing_fields: [], extracted_data: { 'Given NAME': 'DEEPAK', SURNAME: 'SHARMA', service_type: 'reissue' }, files: ['photo.jpg', 'passport.pdf'], updated_at: now },
  { folder_name: 'DRAFT MISSING DATA', applicant_name: 'LAKHVIR SINGH', status: 'NEEDS_CORRECTION', stage: 'Some information from your side was missing.', progress: 45, service_type: 'fresh', portal_email: PORTAL, error_type: 'MISSING_MANDATORY_DATA', missing_fields: ['Email', 'Mobile number'], extracted_data: { 'Given NAME': 'LAKHVIR', SURNAME: 'SINGH', service_type: 'fresh' }, files: ['photo.jpg', 'sign.jpg', 'birth_certificate.pdf'], updated_at: now },
  { folder_name: 'PROCESSING ONE', applicant_name: 'SURYA NATH CHAUHAN', status: 'FILLING_PORTAL', stage: 'Filling portal form', progress: 60, service_type: 'reissue', portal_email: PORTAL, files: [], updated_at: now },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export function installDevPreview() {
  localStorage.setItem('fs_user_session', JSON.stringify(DEV_USER));
  localStorage.setItem(`fs_active_client_email_${DEV_USER.email}`, PORTAL.toUpperCase());
  localStorage.setItem(`fs_portal_password_${DEV_USER.email}`, 'devpreview');

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const m = url.match(/\/api\/(.*)$/);
    if (!m) return realFetch(input, init);
    const path = m[1].split('?')[0];
    if (path === 'health') return json({ ok: true });
    if (path.endsWith('/status')) return json({ client_email: PORTAL, applications, quota: { used: 4, total: 50, is_exhausted: false, portal_username: PORTAL } });
    if (path.endsWith('/previews')) return json({ client_email: PORTAL, previews });
    if (path.endsWith('/completed')) return json({ client_email: PORTAL, completed });
    if (path.endsWith('/quota')) return json({ used: 4, total: 50, is_exhausted: false });
    if (/\/file\//.test(path)) return new Response(new Blob(['%PDF-1.1\n%dev'], { type: 'application/pdf' }));
    return json({ success: true });
  };
}
