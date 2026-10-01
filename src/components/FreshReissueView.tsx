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
  FileCheck
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
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
  const initialEmail = (localStorage.getItem('fs_active_client_email') || user.email || '').toUpperCase();
  const initialPassword = localStorage.getItem('fs_portal_password') || '';
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [activeClientEmail, setActiveClientEmail] = useState(initialEmail || 'CLIENT@FOREIGNERSSTUDIO.COM');
  const [portalPassword, setPortalPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Missing data correction state
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionFormData, setCorrectionFormData] = useState<Record<string, string>>({});
  const [dismissedCorrectionFolder, setDismissedCorrectionFolder] = useState<string | null>(null);

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

      // When previews become available, automatically dismiss the waiting message
      if (prevs && prevs.length > 0) {
        setUploadMessage(prev => (prev?.type === 'success' ? null : prev));
      }
    } catch (err) {
      console.warn('Error fetching automation data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (previews.length > 0) {
      setUploadMessage(prev => (prev?.type === 'success' ? null : prev));
    }
  }, [previews]);

  useEffect(() => {
    refreshAllData();
    // 24/7 background polling interval for live updates
    const interval = setInterval(() => refreshAllData(), 4000);
    return () => clearInterval(interval);
  }, [activeClientEmail]);

  // Find application that requires user correction / missing data
  const correctionApp = applications.find(
    app => (app.status === 'NEEDS_CORRECTION' || (app.status === 'ERROR' && (app.error_type === 'PORTAL_FORM_ERROR' || app.error_type === 'STAGE1_7_FAILED'))) && app.folder_name !== dismissedCorrectionFolder
  );

  // Helper to categorize missing fields into Indian vs Italian vs General
  const classifyMissingField = (fieldName: string) => {
    const lower = fieldName.toLowerCase();
    if (
      lower.includes('italian') ||
      lower.includes('italy') ||
      lower.includes('permesso') ||
      lower.includes('cie')
    ) {
      return { type: 'it', label: 'Italian', badgeClass: 'tag-badge-it', tagClass: 'missing-tag-it' };
    }
    if (
      lower.includes('indian') ||
      lower.includes('pin') ||
      lower.includes('district') ||
      lower.includes('state') ||
      lower.includes('village') ||
      lower.includes('house') ||
      lower.includes('police station') ||
      lower.includes('street')
    ) {
      return { type: 'in', label: 'Indian', badgeClass: 'tag-badge-in', tagClass: 'missing-tag-in' };
    }
    return { type: 'gen', label: 'General', badgeClass: 'tag-badge-gen', tagClass: 'missing-tag-gen' };
  };

  // Strict Error Sanitizer to prevent any Cloudflare/tunnel URLs or technical stack traces from reaching user
  const sanitizeErrorMessage = (err: any): string => {
    const raw = typeof err === 'string' ? err : (err?.message || '');
    if (!raw) return 'Error Connecting to Server';
    const lower = raw.toLowerCase();
    if (
      lower.includes('connect') ||
      lower.includes('fetch') ||
      lower.includes('gateway') ||
      lower.includes('network') ||
      lower.includes('cloudflare') ||
      lower.includes('trycloudflare') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504') ||
      lower.includes('520') ||
      lower.includes('521') ||
      lower.includes('522') ||
      lower.includes('523') ||
      lower.includes('524') ||
      lower.includes('http://') ||
      lower.includes('https://') ||
      lower.includes('load failed') ||
      lower.includes('failed to fetch') ||
      lower.includes('aborted') ||
      lower.includes('timeout')
    ) {
      return 'Error Connecting to Server';
    }
    return raw;
  };

  useEffect(() => {
    if (correctionApp && correctionApp.extracted_data) {
      const ed = correctionApp.extracted_data;
      setCorrectionFormData({
        "Educational qualification": ed["Educational qualification"] || "10TH PASS AND ABOVE",
        "Employment type": ed["Employment type"] || "PRIVATE",
        "PIN Code": ed["PIN Code"] || "332301",
        "State": ed["State"] || "",
        "District": ed["District"] || "",
        "House No. and Street Name": ed["House No. and Street Name"] || "VPO",
        "Village or Town or City": ed["Village or Town or City"] || "",
        "Indian mobile number": ed["Indian mobile number"] || "",
        "Italian address line 1": ed["Italian address line 1"] || "",
        "Italian address line 2": ed["Italian address line 2"] || "",
        "Italian mobile number": ed["Italian mobile number"] || "",
        "Marital status": ed["Marital status"] || "SINGLE",
        "Spouse name": ed["Spouse name"] || ed["Spouse given name"] || "",
        "Spouse given name": ed["Spouse given name"] || ed["Spouse name"] || "",
      });
    }
  }, [correctionApp?.folder_name]);

  // Handle file drop & selection
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const added = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...added]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
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

  const handleEmailBlur = () => {
    const trimmed = portalEmail.trim().toUpperCase();
    if (trimmed && trimmed.includes('@')) {
      setActiveClientEmail(trimmed);
      localStorage.setItem('fs_active_client_email', trimmed);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPortalPassword(val);
    localStorage.setItem('fs_portal_password', val);
  };

  // Window-level file drag & drop listener: Native Tauri OLE drop + HTML5 fallback
  useEffect(() => {
    let unlistenNative: (() => void) | null = null;
    let isSubscribed = true;

    // 1. Native Tauri OS-level drag and drop listener (reads files from Windows Explorer)
    try {
      getCurrentWindow().onDragDropEvent(async (event) => {
        if (!isSubscribed) return;
        if (currentSection !== 'form' || !!correctionApp) return;

        if (event.payload.type === 'over' || event.payload.type === 'enter') {
          setIsDragActive(true);
        } else if (event.payload.type === 'leave') {
          setIsDragActive(false);
        } else if (event.payload.type === 'drop') {
          setIsDragActive(false);
          const paths = event.payload.paths || [];
          if (paths.length > 0) {
            const loadedFiles: File[] = [];
            for (const p of paths) {
              try {
                const info = await invoke<{ name: string; data: number[] }>('read_local_file', { path: p });
                const bytes = new Uint8Array(info.data);
                const ext = info.name.toLowerCase();
                const mime = ext.endsWith('.pdf')
                  ? 'application/pdf'
                  : ext.match(/\.(jpg|jpeg)$/)
                  ? 'image/jpeg'
                  : ext.match(/\.png$/)
                  ? 'image/png'
                  : ext.match(/\.docx$/)
                  ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : 'application/octet-stream';
                loadedFiles.push(new File([bytes], info.name, { type: mime }));
              } catch (readErr) {
                console.warn('Native drag drop read failed for:', p, readErr);
              }
            }
            if (loadedFiles.length > 0) {
              setSelectedFiles((prev) => {
                const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
                const toAdd = loadedFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
                return [...prev, ...toAdd];
              });
            }
          }
        }
      }).then((unlisten) => {
        if (isSubscribed) {
          unlistenNative = unlisten;
        } else {
          unlisten();
        }
      }).catch((e) => {
        console.warn('Native onDragDropEvent listener failed:', e);
      });
    } catch (e) {
      console.warn('Could not attach native drag-drop listener:', e);
    }

    // 2. HTML5 drag and drop fallback
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentSection === 'form' && !correctionApp) {
        setIsDragActive(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragActive(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (currentSection === 'form' && !correctionApp && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const added = Array.from(e.dataTransfer.files);
        setSelectedFiles(prev => {
          const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
          const toAdd = added.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
          return [...prev, ...toAdd];
        });
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      isSubscribed = false;
      if (unlistenNative) {
        unlistenNative();
      }
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [currentSection, correctionApp]);

  // Submit Application Form
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage(null);

    const targetClientEmail = portalEmail.trim().toUpperCase();
    const cleanPassword = portalPassword.trim();
    if (!targetClientEmail || !cleanPassword) {
      setUploadMessage({ text: 'Please enter portal Email ID and Password.', type: 'error' });
      return;
    }
    if (selectedFiles.length === 0) {
      setUploadMessage({ text: 'Please attach at least one client document (Passport scan, etc.).', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      // Synchronize client email and password with storage
      localStorage.setItem('fs_active_client_email', targetClientEmail);
      localStorage.setItem('fs_portal_password', cleanPassword);
      setActiveClientEmail(targetClientEmail);

      await automationApi.uploadApplication(
        targetClientEmail,
        targetClientEmail,
        cleanPassword,
        selectedFiles
      );

      setUploadMessage({
        text: 'File submitted, waiting for preview...',
        type: 'success',
      });
      // Clear inputs
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshAllData(targetClientEmail);
    } catch (err: any) {
      const friendlyMsg = sanitizeErrorMessage(err);
      setUploadMessage({
        text: friendlyMsg,
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Correction Form
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionApp) return;

    try {
      setIsSubmittingCorrection(true);
      setUploadMessage(null);

      const finalData: Record<string, any> = {
        ...correctionFormData,
        "PIN Code": (correctionFormData["PIN Code"] || "").trim() || "332301",
        "House No. and Street Name": (correctionFormData["House No. and Street Name"] || "").trim() || "VPO",
        "Educational qualification": (correctionFormData["Educational qualification"] || "").trim() || "10TH PASS AND ABOVE",
        "Employment type": (correctionFormData["Employment type"] || "").trim() || "PRIVATE",
        "Marital status": (correctionFormData["Marital status"] || "").trim() || "SINGLE",
      };

      if (finalData["Marital status"] === "MARRIED") {
        finalData["Spouse name"] = (correctionFormData["Spouse name"] || correctionFormData["Spouse given name"] || "").trim().toUpperCase();
        delete finalData["Spouse given name"];
      } else {
        finalData["Spouse name"] = null;
        delete finalData["Spouse given name"];
      }

      await automationApi.submitCorrection(
        activeClientEmail,
        correctionApp.folder_name,
        finalData
      );

      setUploadMessage({
        text: 'Details saved! Resuming portal form filling...',
        type: 'success',
      });
      refreshAllData();
    } catch (err: any) {
      const friendlyMsg = sanitizeErrorMessage(err);
      setUploadMessage({
        text: friendlyMsg,
        type: 'error',
      });
    } finally {
      setIsSubmittingCorrection(false);
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
      alert(`Final submission note: ${sanitizeErrorMessage(err)}. Please retry.`);
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

          {correctionApp ? (
            <div className="correction-card">
              <div className="card-header">
                <h2 className="card-title">Missing Details &amp; Correction Required</h2>
                <p className="card-subtitle">
                  Applicant: <strong>{correctionApp.applicant_name || correctionApp.folder_name}</strong>
                  {correctionApp.arn && <span> &bull; ARN: <strong>{correctionApp.arn}</strong></span>}
                </p>
              </div>

              {/* Missing Fields Banner */}
              <div className="missing-fields-banner">
                <AlertCircle className="missing-alert-icon" />
                <div className="missing-content">
                  <span className="missing-title">Action Required: Complete or correct the information below to continue</span>
                  {correctionApp.error_message && (
                    <span className="missing-error-msg">{correctionApp.error_message}</span>
                  )}
                  {correctionApp.missing_fields && correctionApp.missing_fields.length > 0 && (
                    <div className="missing-tags">
                      {correctionApp.missing_fields.map((f, i) => {
                        const meta = classifyMissingField(f);
                        return (
                          <span key={i} className={`missing-tag ${meta.tagClass}`}>
                            <span className={`tag-badge ${meta.badgeClass}`}>{meta.label}</span>
                            {f}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {uploadMessage && (
                <div className={`form-alert ${uploadMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {uploadMessage.type === 'success' ? (
                    <Clock className="alert-icon animate-pulse" />
                  ) : (
                    <AlertCircle className="alert-icon" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmitCorrection} className="fresh-form">
                {/* SECTION: GENERAL & APPLICANT DETAILS */}
                <h3 className="form-section-title">General Details</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label htmlFor="corrQualification" className="input-label">
                      Educational Qualification <span className="required-star">*</span>
                    </label>
                    <select
                      id="corrQualification"
                      className="form-input"
                      value={correctionFormData["Educational qualification"] || "10TH PASS AND ABOVE"}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Educational qualification": e.target.value }))}
                      required
                    >
                      <option value="GRADUATE AND ABOVE">GRADUATE AND ABOVE</option>
                      <option value="10TH PASS AND ABOVE">10TH PASS AND ABOVE</option>
                      <option value="BETWEEN 8TH AND 9TH STANDARD">BETWEEN 8TH AND 9TH STANDARD</option>
                      <option value="7TH PASS OR LESS">7TH PASS OR LESS</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrEmployment" className="input-label">
                      Employment Type <span className="required-star">*</span>
                    </label>
                    <select
                      id="corrEmployment"
                      className="form-input"
                      value={correctionFormData["Employment type"] || "PRIVATE"}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Employment type": e.target.value }))}
                      required
                    >
                      <option value="PRIVATE">PRIVATE</option>
                      <option value="GOVERNMENT">GOVERNMENT</option>
                      <option value="SELF EMPLOYED">SELF EMPLOYED</option>
                      <option value="HOME MAKER">HOME MAKER</option>
                      <option value="STUDENT">STUDENT</option>
                      <option value="NOT EMPLOYED">NOT EMPLOYED</option>
                      <option value="RETIRED PRIVATE SERVANT">RETIRED PRIVATE SERVANT</option>
                      <option value="RETIRED GOVERNMENT SERVANT">RETIRED GOVERNMENT SERVANT</option>
                      <option value="PSU">PSU</option>
                      <option value="STATUTORY BODY">STATUTORY BODY</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrMarital" className="input-label">
                      Marital Status <span className="required-star">*</span>
                    </label>
                    <select
                      id="corrMarital"
                      className="form-input"
                      value={correctionFormData["Marital status"] || "SINGLE"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCorrectionFormData(prev => ({
                          ...prev,
                          "Marital status": val,
                          "Spouse name": val === "MARRIED" ? (prev["Spouse name"] || prev["Spouse given name"] || "") : "",
                          "Spouse given name": val === "MARRIED" ? (prev["Spouse given name"] || prev["Spouse name"] || "") : ""
                        }));
                      }}
                      required
                    >
                      <option value="SINGLE">SINGLE</option>
                      <option value="MARRIED">MARRIED</option>
                      <option value="WIDOW/ WIDOWER">WIDOW/ WIDOWER</option>
                      <option value="DIVORCED">DIVORCED</option>
                      <option value="SEPARATED">SEPARATED</option>
                    </select>
                  </div>

                  {correctionFormData["Marital status"] === "MARRIED" && (
                    <div className="input-group">
                      <label htmlFor="corrSpouse" className="input-label">
                        Spouse Name <span className="required-star">*</span>
                      </label>
                      <input
                        id="corrSpouse"
                        type="text"
                        className="form-input"
                        placeholder="Spouse full name"
                        value={correctionFormData["Spouse name"] || correctionFormData["Spouse given name"] || ""}
                        onChange={(e) => setCorrectionFormData(prev => ({ 
                          ...prev, 
                          "Spouse name": e.target.value.toUpperCase(),
                          "Spouse given name": e.target.value.toUpperCase()
                        }))}
                        required={correctionFormData["Marital status"] === "MARRIED"}
                      />
                    </div>
                  )}
                </div>

                {/* SECTION: PRESENT RESIDENTIAL ADDRESS (INDIA) */}
                <h3 className="form-section-title">Present Residential Address (India)</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label htmlFor="corrHouse" className="input-label">
                      House No. and Street Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="corrHouse"
                      type="text"
                      className="form-input"
                      placeholder="e.g. VPO or House / Ward No."
                      value={correctionFormData["House No. and Street Name"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "House No. and Street Name": e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrVillage" className="input-label">
                      Village or Town or City <span className="required-star">*</span>
                    </label>
                    <input
                      id="corrVillage"
                      type="text"
                      className="form-input"
                      placeholder="e.g. FATEHPUR SHEKHAWATI"
                      value={correctionFormData["Village or Town or City"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Village or Town or City": e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrState" className="input-label">
                      State <span className="required-star">*</span>
                    </label>
                    <input
                      id="corrState"
                      type="text"
                      className="form-input"
                      placeholder="e.g. RAJASTHAN"
                      value={correctionFormData["State"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "State": e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrDistrict" className="input-label">
                      District <span className="required-star">*</span>
                    </label>
                    <input
                      id="corrDistrict"
                      type="text"
                      className="form-input"
                      placeholder="e.g. SIKAR"
                      value={correctionFormData["District"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "District": e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrPin" className="input-label">
                      PIN Code <span className="required-star">*</span>
                    </label>
                    <input
                      id="corrPin"
                      type="text"
                      maxLength={6}
                      className="form-input"
                      placeholder="e.g. 332301"
                      value={correctionFormData["PIN Code"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "PIN Code": e.target.value.trim() }))}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrIndianMobile" className="input-label">
                      Indian Mobile Number
                    </label>
                    <input
                      id="corrIndianMobile"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 9876543210"
                      value={correctionFormData["Indian mobile number"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Indian mobile number": e.target.value.trim() }))}
                    />
                  </div>
                </div>

                {/* SECTION: ADDRESS IN ITALY */}
                <h3 className="form-section-title">Address in Italy</h3>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label htmlFor="corrItLine1" className="input-label">
                      Italian Address Line 1
                    </label>
                    <input
                      id="corrItLine1"
                      type="text"
                      className="form-input"
                      placeholder="e.g. VIA ROMA 10"
                      value={correctionFormData["Italian address line 1"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Italian address line 1": e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrItLine2" className="input-label">
                      Italian Address Line 2
                    </label>
                    <input
                      id="corrItLine2"
                      type="text"
                      className="form-input"
                      placeholder="e.g. MILANO"
                      value={correctionFormData["Italian address line 2"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Italian address line 2": e.target.value.toUpperCase() }))}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="corrItMobile" className="input-label">
                      Italian Mobile Number
                    </label>
                    <input
                      id="corrItMobile"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 3279020120"
                      value={correctionFormData["Italian mobile number"] || ""}
                      onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Italian mobile number": e.target.value.trim() }))}
                    />
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="correction-actions-row">
                  <button
                    type="button"
                    onClick={() => setDismissedCorrectionFolder(correctionApp.folder_name)}
                    className="dismiss-btn"
                  >
                    Dismiss / Upload New Instead
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCorrection}
                    className="submit-btn save-correction-btn"
                  >
                    {isSubmittingCorrection ? (
                      <>
                        <RefreshCw className="submit-icon animate-spin" />
                        <span>Saving &amp; Resuming...</span>
                      </>
                    ) : (
                      <>
                        <Send className="submit-icon" />
                        <span>Save &amp; Start Filling Form</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
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
                    <Clock className="alert-icon animate-pulse" />
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
                      type="text"
                      required
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value.toUpperCase())}
                      onBlur={handleEmailBlur}
                      placeholder="e.g. CLIENT@DOMAIN.COM"
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
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
                        onChange={(e) => handlePasswordChange(e.target.value)}
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
                    className={`file-dropzone ${isDragActive ? 'drag-active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
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
                        Click to upload documents or drag &amp; drop files here
                      </span>
                      <span className="dropzone-sub-text">
                        Supports Passport scans (Front &amp; Back), PDFs, Images, and Declarations
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
                        <span>Uploading &amp; Processing...</span>
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
    </div>
  );
};
