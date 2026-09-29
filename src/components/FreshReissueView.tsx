import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Trash2, 
  Send, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Download, 
  Clock, 
  ShieldCheck,
  FileCheck,
  Globe,
  Settings2,
  X
} from 'lucide-react';
import { 
  automationApi, 
  ApplicationItem, 
  PreviewItem, 
  CompletedItem 
} from '../services/automationApi';
import { FreshReissueSection, UserProfile } from '../types';
import { PdfViewerModal } from './PdfViewerModal';

interface FreshReissueViewProps {
  user: UserProfile;
  currentSection: FreshReissueSection;
  onSectionChange: (sec: FreshReissueSection) => void;
  onBackToPassport: () => void;
}

export const FreshReissueView: React.FC<FreshReissueViewProps> = ({
  user,
  currentSection,
  onSectionChange,
  onBackToPassport,
}) => {
  // Client Identity & Form State
  const initialEmail = localStorage.getItem('fs_active_client_email') || user.email || '';
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [activeClientEmail, setActiveClientEmail] = useState(initialEmail || 'client@foreignersstudio.com');
  const [portalPassword, setPortalPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Connection & Tunnel State
  const [connType, setConnType] = useState<'local' | 'tunnel' | 'offline'>(automationApi.getConnectionType());
  const [activeBaseUrl, setActiveBaseUrl] = useState<string>(automationApi.getBaseUrl());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');

  // Status & Polling
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Preview selection state: { [folder_name]: { passportChecked: boolean, declarationChecked: boolean } }
  const [previewSelections, setPreviewSelections] = useState<{
    [key: string]: { passport: boolean; declaration: boolean };
  }>({});
  const [submittingArn, setSubmittingArn] = useState<string | null>(null);

  // PDF Viewer Modal
  const [viewerModal, setViewerModal] = useState<{
    isOpen: boolean;
    title: string;
    pdfUrl: string;
  }>({
    isOpen: false,
    title: '',
    pdfUrl: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to connection status changes
  useEffect(() => {
    const unsub = automationApi.subscribe((_connected, url) => {
      setConnType(automationApi.getConnectionType());
      setActiveBaseUrl(url);
    });
    return unsub;
  }, []);

  // Fetch status, previews, and completed items
  const refreshAllData = async (targetEmailOverride?: string) => {
    const targetEmail = targetEmailOverride || activeClientEmail;
    try {
      setIsLoadingData(true);
      const [apps, prevs, comps] = await Promise.all([
        automationApi.getClientStatus(targetEmail).catch(() => []),
        automationApi.getPendingPreviews(targetEmail).catch(() => []),
        automationApi.getCompletedApplications(targetEmail).catch(() => []),
      ]);
      setApplications(apps);
      setPreviews(prevs);
      setCompleted(comps);
    } catch (err) {
      console.warn('Error fetching automation data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    // 24/7 background polling interval for live updates
    const interval = setInterval(() => refreshAllData(), 4000);
    return () => clearInterval(interval);
  }, [activeClientEmail]);

  // Handle file drop & selection
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const added = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...added]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const added = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...added]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Application Form
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage(null);

    const targetClientEmail = portalEmail.trim().toLowerCase();
    if (!targetClientEmail || !portalPassword.trim()) {
      setUploadMessage({ text: 'Please enter portal Email ID and Password.', type: 'error' });
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadMessage({ text: 'Please attach at least one client document (Passport scan, etc.).', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      // Synchronize client email with typed form email
      localStorage.setItem('fs_active_client_email', targetClientEmail);
      setActiveClientEmail(targetClientEmail);

      const res = await automationApi.uploadApplication(
        targetClientEmail,
        targetClientEmail,
        portalPassword.trim(),
        selectedFiles
      );

      setUploadMessage({
        text: `Application submitted successfully! Folder '${res.folder_name}' created. Background extraction started.`,
        type: 'success',
      });
      // Clear inputs
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshAllData(targetClientEmail);
    } catch (err: any) {
      setUploadMessage({
        text: err.message || 'Failed to submit application to automation server.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle selection for previews
  const togglePreviewCheckbox = (folderName: string, type: 'passport' | 'declaration') => {
    setPreviewSelections(prev => {
      const current = prev[folderName] || { passport: false, declaration: false };
      return {
        ...prev,
        [folderName]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  };

  // Confirm final submission for preview
  const handleConfirmFinalSubmit = async (folderName: string, arn: string) => {
    try {
      setSubmittingArn(arn);
      await automationApi.confirmSubmission(activeClientEmail, folderName, arn);
      // Refresh data so preview is cleared and completed has the new application
      await refreshAllData();
      onSectionChange('submitted');
    } catch (err: any) {
      alert(`Final submission note: ${err.message || 'Could not submit to portal'}. Please retry.`);
      await refreshAllData();
    } finally {
      setSubmittingArn(null);
    }
  };

  const openPdfViewer = (title: string, relativeUrl: string) => {
    const fullUrl = `${automationApi.getBaseUrl()}${relativeUrl}`;
    setViewerModal({
      isOpen: true,
      title,
      pdfUrl: fullUrl,
    });
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      automationApi.setBaseUrl(customUrlInput.trim());
      setShowConfigModal(false);
      refreshAllData();
    }
  };

  // Check if any application has wrong credentials error
  const wrongCredsApp = applications.find(
    a => a.status === 'ERROR' && (
      a.error_type === 'INVALID_CREDENTIALS' || 
      (a.error_message && a.error_message.toLowerCase().includes('incorrect user id')) ||
      (a.error_message && a.error_message.toLowerCase().includes('authentication failed'))
    )
  );

  return (
    <div className="fresh-reissue-container">
      {/* Navigation Header */}
      <div className="view-navigation-bar">
        <button
          type="button"
          onClick={onBackToPassport}
          className="back-btn"
          title="Return to Passport Services"
          aria-label="Return to Passport Services"
        >
          <ArrowLeft className="back-arrow" />
          <span>Passport Services</span>
        </button>

        <div className="section-pill-selector">
          <button
            type="button"
            className={`section-pill ${currentSection === 'form' ? 'active' : ''}`}
            onClick={() => onSectionChange('form')}
          >
            <Upload className="pill-icon" />
            <span>New Application</span>
          </button>
          <button
            type="button"
            className={`section-pill ${currentSection === 'preview' ? 'active' : ''}`}
            onClick={() => onSectionChange('preview')}
          >
            <Eye className="pill-icon" />
            <span>Preview</span>
            {previews.length > 0 && (
              <span className="pill-badge">{previews.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`section-pill ${currentSection === 'submitted' ? 'active' : ''}`}
            onClick={() => onSectionChange('submitted')}
          >
            <CheckCircle2 className="pill-icon" />
            <span>Submitted</span>
            {completed.length > 0 && (
              <span className="pill-badge pill-badge-success">{completed.length}</span>
            )}
          </button>
        </div>

        <div className="nav-right-tools">
          {/* Connection status pill */}
          <button
            type="button"
            className={`gateway-status-pill ${connType}`}
            onClick={() => {
              setCustomUrlInput(activeBaseUrl);
              setShowConfigModal(true);
            }}
            title={`Connected to ${activeBaseUrl}. Click to change gateway endpoint.`}
          >
            <span className={`status-dot ${connType === 'offline' ? 'dot-offline' : (connType === 'local' ? 'dot-local' : 'dot-tunnel')}`} />
            <span className="gateway-text">
              {connType === 'local' ? 'Local Gateway' : connType === 'tunnel' ? 'Cloudflare Online' : 'Gateway Offline'}
            </span>
            <Settings2 className="settings-icon" />
          </button>

          <button
            type="button"
            onClick={() => refreshAllData()}
            className="refresh-btn"
            title="Refresh Data"
          >
            <RefreshCw className={`refresh-icon ${isLoadingData ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SECTION 1: FORM & UPLOAD */}
      {currentSection === 'form' && (
        <div className="fresh-reissue-content">
          {/* Prominent Wrong Credentials Banner if portal rejected login */}
          {wrongCredsApp && (
            <div className="wrong-creds-banner">
              <div className="wrong-creds-left">
                <AlertCircle className="wrong-creds-icon" />
              </div>
              <div className="wrong-creds-body">
                <span className="wrong-creds-title">PORTAL LOGIN FAILED: INCORRECT USER ID OR PASSWORD</span>
                <span className="wrong-creds-desc">
                  The passport portal rejected credentials for applicant <b>{wrongCredsApp.applicant_name}</b> ({wrongCredsApp.error_message}). Please check the Email ID and Password below and submit again.
                </span>
              </div>
            </div>
          )}

          <div className="fresh-form-card">
            <div className="card-header">
              <h2 className="card-title">Fresh / Reissue Passport Application</h2>
              <p className="card-subtitle">
                Provide the applicant's portal credentials and upload supporting documents.
              </p>
            </div>

            {uploadMessage && (
              <div className={`form-alert ${uploadMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {uploadMessage.type === 'success' ? (
                  <CheckCircle2 className="alert-icon" />
                ) : (
                  <AlertCircle className="alert-icon" />
                )}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="fresh-form">
              <div className="form-grid-2">
                <div className="input-group">
                  <label htmlFor="portalEmail" className="input-label">
                    Email ID <span className="required-star">*</span>
                  </label>
                  <input
                    id="portalEmail"
                    type="email"
                    required
                    value={portalEmail}
                    onChange={(e) => setPortalEmail(e.target.value)}
                    placeholder="e.g. client@domain.com"
                    className="form-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="portalPassword" className="input-label">
                    Password <span className="required-star">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="portalPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="Portal account password"
                      className="form-input password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="input-group">
                <label className="input-label">
                  Supporting Documents <span className="required-star">*</span>
                </label>
                <div
                  className="file-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  <div className="dropzone-content">
                    <div className="dropzone-icon-seal">
                      <Upload className="dropzone-icon" />
                    </div>
                    <span className="dropzone-main-text">
                      Click to upload documents or drag & drop files here
                    </span>
                    <span className="dropzone-sub-text">
                      Supports Passport scans (Front & Back), PDFs, Images, and Declarations
                    </span>
                  </div>
                </div>

                {/* Attached Files List */}
                {selectedFiles.length > 0 && (
                  <div className="attached-files-list">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="attached-file-pill">
                        <FileText className="file-pill-icon" />
                        <span className="file-pill-name" title={file.name}>{file.name}</span>
                        <span className="file-pill-size">({(file.size / 1024).toFixed(0)} KB)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="file-pill-remove"
                          title="Remove file"
                        >
                          <Trash2 className="remove-icon" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="submit-btn"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="submit-icon animate-spin" />
                      <span>Uploading & Processing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="submit-icon" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Active Application Status Tracker */}
          {applications.length > 0 && (
            <div className="tracker-card">
              <h3 className="tracker-title">Recent Pipeline Activity ({activeClientEmail})</h3>
              <div className="tracker-list">
                {applications.map((app, idx) => {
                  const isError = app.status === 'ERROR';
                  const isPending = app.status === 'PENDING_CONFIRMATION';
                  const isDone = app.status === 'COMPLETED';

                  return (
                    <div key={idx} className={`tracker-item ${isError ? 'tracker-error' : (isPending ? 'tracker-pending' : '')}`}>
                      <div className="tracker-item-left">
                        <div className="tracker-avatar">
                          {isDone ? (
                            <CheckCircle2 className="avatar-icon text-success" />
                          ) : isError ? (
                            <AlertCircle className="avatar-icon text-error" />
                          ) : isPending ? (
                            <Eye className="avatar-icon text-blue" />
                          ) : (
                            <Clock className="avatar-icon text-muted animate-pulse" />
                          )}
                        </div>
                        <div className="tracker-info">
                          <span className="tracker-name">{app.applicant_name || app.folder_name}</span>
                          <span className="tracker-stage">{app.stage || app.status}</span>
                          {app.arn && (
                            <span className="tracker-arn">ARN: <b>{app.arn}</b></span>
                          )}
                          {isError && app.error_message && (
                            <div className="tracker-error-msg">
                              <AlertCircle className="err-icon" />
                              <span>{app.error_message}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="tracker-item-right">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onSectionChange('preview')}
                            className="btn-link-action"
                          >
                            <span>View Preview</span>
                            <ArrowLeft className="rotate-180 icon-sm" />
                          </button>
                        )}
                        {isDone && (
                          <span className="badge-completed">Completed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PREVIEW */}
      {currentSection === 'preview' && (
        <div className="fresh-reissue-content">
          <div className="view-header">
            <h2 className="view-main-title">Application Previews</h2>
            <p className="card-subtitle">
              Review both generated preview documents carefully before submitting to the portal.
            </p>
          </div>

          {previews.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-seal">
                <FileCheck className="empty-icon" />
              </div>
              <h3 className="empty-title">No Pending Previews</h3>
              <p className="empty-desc">
                When you submit a new application, documents are extracted and preview drafts will appear here for verification.
              </p>
              <button
                type="button"
                onClick={() => onSectionChange('form')}
                className="empty-action-btn"
              >
                Create New Application
              </button>
            </div>
          ) : (
            <div className="previews-grid">
              {previews.map((item) => {
                const folderKey = item.folder_name;
                const selection = previewSelections[folderKey] || { passport: false, declaration: false };
                const canSubmit = selection.passport && selection.declaration;
                const isSubmittingThis = submittingArn === item.arn;

                return (
                  <div key={folderKey} className="preview-card">
                    <div className="preview-card-header">
                      <div className="preview-client-badge">
                        <span className="preview-client-name">{item.applicant_name}</span>
                        <span className="preview-client-arn">ARN: {item.arn}</span>
                      </div>
                      <span className="status-tag-pending">Awaiting Verification</span>
                    </div>

                    <div className="preview-docs-container">
                      {/* 1. Passport Preview PDF */}
                      <div className={`preview-doc-box ${selection.passport ? 'selected' : ''}`}>
                        <div className="doc-box-left">
                          <FileText className="doc-icon text-blue" />
                          <div className="doc-meta">
                            <span className="doc-title">Passport Application Preview</span>
                            <span className="doc-subtitle">Official draft preview with filled stages</span>
                          </div>
                        </div>
                        <div className="doc-box-right">
                          <button
                            type="button"
                            onClick={() => openPdfViewer('Passport Preview Form', item.passport_preview_url)}
                            className="doc-open-btn"
                          >
                            <Eye className="open-icon" />
                            <span>View PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreviewCheckbox(folderKey, 'passport')}
                            className="doc-checkbox-btn"
                            title="Confirm review"
                          >
                            {selection.passport ? (
                              <CheckSquare className="checkbox-icon checked" />
                            ) : (
                              <Square className="checkbox-icon" />
                            )}
                            <span>Reviewed</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Self Declaration PDF */}
                      <div className={`preview-doc-box ${selection.declaration ? 'selected' : ''}`}>
                        <div className="doc-box-left">
                          <ShieldCheck className="doc-icon text-blue" />
                          <div className="doc-meta">
                            <span className="doc-title">Self Declaration Form</span>
                            <span className="doc-subtitle">Pure Python declaration with statutory undertaking</span>
                          </div>
                        </div>
                        <div className="doc-box-right">
                          <button
                            type="button"
                            onClick={() => openPdfViewer('Self Declaration Form', item.declaration_preview_url)}
                            className="doc-open-btn"
                          >
                            <Eye className="open-icon" />
                            <span>View PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePreviewCheckbox(folderKey, 'declaration')}
                            className="doc-checkbox-btn"
                            title="Confirm review"
                          >
                            {selection.declaration ? (
                              <CheckSquare className="checkbox-icon checked" />
                            ) : (
                              <Square className="checkbox-icon" />
                            )}
                            <span>Reviewed</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Final Submission Action */}
                    <div className="preview-card-footer">
                      <div className="review-instruction">
                        {!canSubmit ? (
                          <span className="instruction-text">
                            Please review and select <b>both PDFs</b> above to enable final submission.
                          </span>
                        ) : (
                          <span className="instruction-text text-success">
                            ✓ Both documents verified. Ready for final portal submission.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!canSubmit || isSubmittingThis}
                        onClick={() => handleConfirmFinalSubmit(folderKey, item.arn)}
                        className={`final-submit-btn ${canSubmit ? 'enabled' : 'disabled'}`}
                      >
                        {isSubmittingThis ? (
                          <>
                            <RefreshCw className="submit-icon animate-spin" />
                            <span>Submitting to Portal (Stage 10)...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="submit-icon" />
                            <span>Submit Application</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: SUBMITTED */}
      {currentSection === 'submitted' && (
        <div className="fresh-reissue-content">
          <div className="view-header">
            <h2 className="view-main-title">Completed Applications</h2>
            <p className="card-subtitle">
              All applications successfully submitted and accepted by the Passport Seva Portal.
            </p>
          </div>

          {completed.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-seal">
                <CheckCircle2 className="empty-icon" />
              </div>
              <h3 className="empty-title">No Completed Applications</h3>
              <p className="empty-desc">
                Once an application is verified and submitted from the Preview section, it will appear here with its official ARN and receipt.
              </p>
            </div>
          ) : (
            <div className="completed-grid">
              {completed.map((item, idx) => (
                <div key={idx} className="completed-card">
                  <div className="completed-card-left">
                    <div className="completed-seal">
                      <CheckCircle2 className="completed-icon" />
                    </div>
                    <div className="completed-details">
                      <h3 className="completed-client-name">{item.applicant_name}</h3>
                      <div className="completed-meta-row">
                        <span className="arn-badge">ARN: {item.arn}</span>
                        <span className="submission-date">Submitted: {item.submitted_at}</span>
                      </div>
                    </div>
                  </div>

                  <div className="completed-card-right">
                    {item.receipt_url && (
                      <button
                        type="button"
                        onClick={() => openPdfViewer(`Submission Receipt - ${item.applicant_name}`, item.receipt_url!)}
                        className="receipt-btn"
                        title="View Official Submission Receipt"
                      >
                        <Download className="receipt-icon" />
                        <span>Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full In-App PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={viewerModal.isOpen}
        title={viewerModal.title}
        pdfUrl={viewerModal.pdfUrl}
        onClose={() => setViewerModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Gateway Configuration Modal */}
      {showConfigModal && (
        <div className="pdf-modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="config-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="config-modal-header">
              <div className="config-header-left">
                <Globe className="config-globe-icon" />
                <h3 className="config-title">Automation Gateway Endpoint</h3>
              </div>
              <button
                type="button"
                className="pdf-modal-close-btn"
                onClick={() => setShowConfigModal(false)}
              >
                <X className="close-icon" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomUrl} className="config-modal-form">
              <p className="config-modal-desc">
                Currently connected to: <code>{activeBaseUrl}</code> ({connType.toUpperCase()})
              </p>
              <div className="input-group">
                <label className="input-label">Server / Cloudflare Tunnel URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://...trycloudflare.com or http://127.0.0.1:8001"
                />
              </div>
              <div className="config-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    automationApi.setBaseUrl('http://127.0.0.1:8001');
                    setShowConfigModal(false);
                    refreshAllData();
                  }}
                  className="config-btn-secondary"
                >
                  Reset to Local
                </button>
                <button type="submit" className="config-btn-primary">
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
