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
  Camera,
  PenTool,
  BookOpen,
  Home,
  X
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
import { ImageViewerModal } from './ImageViewerModal';

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
  const initialEmail = (localStorage.getItem('fs_active_client_email') || user.email || '').toUpperCase();
  const initialPassword = localStorage.getItem('fs_portal_password') || '';
  const initialPlace = (localStorage.getItem('fs_declaration_place') || '').toUpperCase();
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [activeClientEmail, setActiveClientEmail] = useState(initialEmail || 'CLIENT@FOREIGNERSSTUDIO.COM');
  const [portalPassword, setPortalPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [declarationPlace, setDeclarationPlace] = useState(initialPlace);
  const [isPlaceSubmitted, setIsPlaceSubmitted] = useState(false);

  // 5 Guided Upload Slots + Extras
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [residenceFile, setResidenceFile] = useState<File | null>(null);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Slot Drag Over states
  const [dragSlot, setDragSlot] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [cancellingFolder, setCancellingFolder] = useState<string | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<{
    folderName: string;
    applicantName: string;
  } | null>(null);
  const [correctionFormData, setCorrectionFormData] = useState<Record<string, string>>({});
  const [dismissedCorrectionFolder, setDismissedCorrectionFolder] = useState<string | null>(null);

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [previewSelections, setPreviewSelections] = useState<{
    [key: string]: { passport: boolean; declaration: boolean };
  }>({});
  const [submittingArn, setSubmittingArn] = useState<string | null>(null);

  const [viewerModal, setViewerModal] = useState<{
    isOpen: boolean;
    title: string;
    pdfUrl: string;
  }>({
    isOpen: false,
    title: '',
    pdfUrl: '',
  });

  const [imageViewerModal, setImageViewerModal] = useState<{
    isOpen: boolean;
    title: string;
    imageUrl: string;
  }>({
    isOpen: false,
    title: '',
    imageUrl: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const residenceInputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryAccountEmail = user?.email ? user.email.trim().toLowerCase() : activeClientEmail;

  const refreshAllData = async (targetEmailOverride?: string) => {
    const targetEmail = targetEmailOverride || queryAccountEmail;
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
    const interval = setInterval(() => refreshAllData(), 4000);
    return () => clearInterval(interval);
  }, [user?.email, activeClientEmail]);

  const correctionApp = applications.find(
    app => (app.status === 'NEEDS_CORRECTION' || (app.status === 'ERROR' && (app.error_type === 'PORTAL_FORM_ERROR' || app.error_type === 'STAGE1_7_FAILED'))) && app.folder_name !== dismissedCorrectionFolder
  );

  const classifyMissingField = (fieldName: string) => {
    const lower = fieldName.toLowerCase();
    if (
      lower.includes('passport') ||
      lower.includes('issue') ||
      lower.includes('expiry')
    ) {
      return { type: 'gen', label: 'Passport', badgeClass: 'tag-badge-gen', tagClass: 'missing-tag-gen' };
    }
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

  const sanitizeErrorMessage = (err: any): string => {
    let raw = '';
    if (typeof err === 'string') {
      raw = err;
    } else if (err?.message && typeof err.message === 'string') {
      raw = err.message;
    } else if (err?.detail) {
      if (typeof err.detail === 'string') {
        raw = err.detail;
      } else if (Array.isArray(err.detail)) {
        raw = err.detail
          .map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
          .filter(Boolean)
          .join(', ');
      } else {
        raw = JSON.stringify(err.detail);
      }
    } else {
      raw = String(err || '');
    }

    if (!raw || raw === '[object Object]') return 'Error Connecting to Server';

    const lower = raw.toLowerCase();

    // Catch any internal JS engine error strings so technical syntax/type errors never leak to the user
    if (
      lower.includes('is not a function') ||
      lower.includes('cannot read property') ||
      lower.includes('is not defined') ||
      lower.includes('null is not') ||
      lower.includes('undefined is not') ||
      lower.includes('typeerror') ||
      lower.includes('syntaxerror')
    ) {
      return 'Unexpected application error. Please try again.';
    }

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
        "PIN Code": ed["PIN Code"] || "",
        "State": ed["State"] || "",
        "District": ed["District"] || "",
        "House No. and Street Name": ed["House No. and Street Name"] || ed["address_line1"] || "VPO",
        "Village or Town or City": ed["Village or Town or City"] || ed["address_line2"] || "",
        "Indian mobile number": ed["Indian mobile number"] || "",
        "Email id": ed["Email id"] || ed["presentAddressEmail"] || ed["Email"] || "",
        "presentAddressEmail": ed["presentAddressEmail"] || ed["Email id"] || ed["Email"] || "",
        "Italian address line 1": ed["Italian address line 1"] || "",
        "Italian address line 2": ed["Italian address line 2"] || "",
        "Italian mobile number": ed["Italian mobile number"] || "",
        "Marital status": ed["Marital status"] || "SINGLE",
        "Spouse name": ed["Spouse name"] || ed["Spouse given name"] || "",
        "Spouse given name": ed["Spouse given name"] || ed["Spouse name"] || "",
        "Given NAME": ed["Given NAME"] || ed["given_name"] || "",
        "SURNAME": ed["SURNAME"] || ed["surname"] || "",
        "Date of birth": ed["Date of birth"] || ed["dob"] || "",
        "Place of birth": ed["Place of birth"] || ed["pob"] || "",
        "GENDER": ed["GENDER"] || ed["gender"] || "M",
        "Father's name": ed["Father's name"] || ed["father"] || "",
        "Mother's name": ed["Mother's name"] || ed["mother"] || "",
        "Police Station": ed["Police Station"] || ed["police"] || "",
        "Passport number": ed["Passport number"] || ed["passport_number"] || ed["old_passport_number"] || "",
        "passport_number": ed["passport_number"] || ed["Passport number"] || ed["old_passport_number"] || "",
        "Date of issue": ed["Date of issue"] || ed["issue_date"] || ed["date_of_issue"] || "",
        "issue_date": ed["issue_date"] || ed["Date of issue"] || ed["date_of_issue"] || "",
        "Date of expiry": ed["Date of expiry"] || ed["expiry_date"] || ed["date_of_expiry"] || "",
        "expiry_date": ed["expiry_date"] || ed["Date of expiry"] || ed["date_of_expiry"] || "",
        "Place of issue": ed["Place of issue"] || ed["issue_place"] || ed["place_of_issue"] || "",
        "issue_place": ed["issue_place"] || ed["Place of issue"] || ed["place_of_issue"] || "",
        ...ed,
      });
    }
  }, [correctionApp?.folder_name, correctionApp?.updated_at]);

  const autoCategorizeFiles = (incoming: File[]) => {
    let p = photoFile;
    let s = signFile;
    let pass = passportFile;
    let res = residenceFile;
    let supp = supportingFile;
    const extras: File[] = [];

    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      if (!p && (lower.includes('photo') || lower.includes('fototessera') || lower.includes('picture') || lower.includes('portrait'))) {
        p = f;
      } else if (!s && (lower.includes('sign') || lower.includes('signature') || lower.includes('firma'))) {
        s = f;
      } else if (!pass && (lower.includes('pass') || lower.includes('passport') || lower.includes('passaporto'))) {
        pass = f;
      } else if (!res && (lower.includes('pds') || lower.includes('cie') || lower.includes('carta') || lower.includes('soggiorno') || lower.includes('residen'))) {
        res = f;
      } else if (!supp && (lower.includes('ospiti') || lower.includes('support') || lower.includes('fabbricato') || lower.includes('affitto') || lower.includes('annexure') || lower.includes('necessity') || lower.includes('bolletta'))) {
        supp = f;
      } else {
        if (!pass && lower.endsWith('.pdf')) {
          pass = f;
        } else if (!p && lower.match(/\.(jpg|jpeg|png|webp)$/)) {
          p = f;
        } else if (!res && lower.endsWith('.pdf')) {
          res = f;
        } else if (!s && lower.match(/\.(jpg|jpeg|png)$/)) {
          s = f;
        } else if (!supp) {
          supp = f;
        } else {
          extras.push(f);
        }
      }
    }

    setPhotoFile(p);
    setSignFile(s);
    setPassportFile(pass);
    setResidenceFile(res);
    setSupportingFile(supp);
    if (extras.length > 0) {
      setSelectedFiles(prev => {
        const existingKeys = new Set(prev.map(item => `${item.name}_${item.size}`));
        const toAdd = extras.filter(item => !existingKeys.has(`${item.name}_${item.size}`));
        return [...prev, ...toAdd];
      });
    }
    setIsPlaceSubmitted(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      autoCategorizeFiles(Array.from(e.dataTransfer.files));
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
      autoCategorizeFiles(Array.from(e.target.files));
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

  useEffect(() => {
    let unlistenNative: (() => void) | null = null;
    let isSubscribed = true;

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
              autoCategorizeFiles(loadedFiles);
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
        autoCategorizeFiles(Array.from(e.dataTransfer.files));
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

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMessage(null);

    const targetClientEmail = portalEmail.trim().toUpperCase();
    const cleanPassword = portalPassword.trim();
    if (!targetClientEmail || !cleanPassword) {
      setUploadMessage({ text: 'Please enter portal Email ID and Password.', type: 'error' });
      return;
    }
    const hasAnyDocs = photoFile || signFile || passportFile || residenceFile || supportingFile || selectedFiles.length > 0;
    if (!hasAnyDocs) {
      setUploadMessage({ text: 'Please upload client documents (Photo, Signature, Passport, etc.).', type: 'error' });
      return;
    }

    try {
      setIsUploading(true);
      setIsPlaceSubmitted(true);
      localStorage.setItem('fs_active_client_email', targetClientEmail);
      localStorage.setItem('fs_portal_password', cleanPassword);
      if (declarationPlace?.trim()) {
        localStorage.setItem('fs_declaration_place', declarationPlace.trim().toUpperCase());
      }
      setActiveClientEmail(targetClientEmail);

      const placeToSend = declarationPlace?.trim() || localStorage.getItem('fs_declaration_place') || 'ROME';
      await automationApi.uploadApplication(
        targetClientEmail,
        targetClientEmail,
        cleanPassword,
        {
          photo: photoFile,
          signature: signFile,
          passport: passportFile,
          residence: residenceFile,
          supporting: supportingFile,
          files: selectedFiles,
        },
        user?.email,
        placeToSend
      );

      setUploadMessage({
        text: 'File submitted, waiting for preview...',
        type: 'success',
      });
      setPhotoFile(null);
      setSignFile(null);
      setPassportFile(null);
      setResidenceFile(null);
      setSupportingFile(null);
      setSelectedFiles([]);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (signInputRef.current) signInputRef.current.value = '';
      if (passportInputRef.current) passportInputRef.current.value = '';
      if (residenceInputRef.current) residenceInputRef.current.value = '';
      if (supportingInputRef.current) supportingInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshAllData(user?.email || targetClientEmail);
    } catch (err: any) {
      setIsPlaceSubmitted(false);
      const friendlyMsg = sanitizeErrorMessage(err);
      setUploadMessage({
        text: friendlyMsg,
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionApp) return;

    try {
      setIsSubmittingCorrection(true);
      setUploadMessage(null);

      const finalData: Record<string, any> = {
        ...(correctionApp.extracted_data || {}),
        ...correctionFormData,
      };

      if (correctionFormData["PIN Code"] !== undefined) {
        finalData["PIN Code"] = (correctionFormData["PIN Code"] || "").trim();
      }
      if (isFieldMissing(["PIN Code", "pin", "pincode"]) && (!finalData["PIN Code"] || finalData["PIN Code"].length !== 6 || !/^[1-9]\d{5}$/.test(finalData["PIN Code"]))) {
        setUploadMessage({
          text: 'Please enter a valid 6-digit PIN code.',
          type: 'error',
        });
        setIsSubmittingCorrection(false);
        return;
      }
      if (correctionFormData["House No. and Street Name"] !== undefined) {
        finalData["House No. and Street Name"] = (correctionFormData["House No. and Street Name"] || "").trim() || "VPO";
      }
      if (correctionFormData["Village or Town or City"] !== undefined) {
        finalData["Village or Town or City"] = (correctionFormData["Village or Town or City"] || "").trim().toUpperCase();
      }
      if (isFieldMissing(["Village or Town or City", "village", "city"]) && !finalData["Village or Town or City"]) {
        setUploadMessage({
          text: 'Please enter Village or Town or City.',
          type: 'error',
        });
        setIsSubmittingCorrection(false);
        return;
      }
      if (correctionFormData["Educational qualification"] !== undefined) {
        finalData["Educational qualification"] = (correctionFormData["Educational qualification"] || "").trim() || "10TH PASS AND ABOVE";
      }
      if (correctionFormData["Employment type"] !== undefined) {
        finalData["Employment type"] = (correctionFormData["Employment type"] || "").trim() || "PRIVATE";
      }
      if (correctionFormData["Marital status"] !== undefined) {
        finalData["Marital status"] = (correctionFormData["Marital status"] || "").trim() || "SINGLE";
      }

      if (finalData["Marital status"] === "MARRIED") {
        finalData["Spouse name"] = (correctionFormData["Spouse name"] || correctionFormData["Spouse given name"] || "").trim().toUpperCase();
        delete finalData["Spouse given name"];
      } else {
        finalData["Spouse name"] = null;
        delete finalData["Spouse given name"];
      }

      const em = (correctionFormData["Email id"] || correctionFormData["presentAddressEmail"] || finalData["Email id"] || finalData["presentAddressEmail"] || "").trim();
      if (isFieldMissing(["Email id", "email", "presentaddressemail", "mail"]) || !em) {
        if (!em || !em.includes("@") || !em.includes(".")) {
          setUploadMessage({
            text: 'Please enter a valid Email ID.',
            type: 'error',
          });
          setIsSubmittingCorrection(false);
          return;
        }
      }
      if (em) {
        finalData["Email id"] = em;
        finalData["presentAddressEmail"] = em;
      }

      if (correctionFormData["Passport number"] !== undefined || correctionFormData["passport_number"] !== undefined) {
        const pno = (correctionFormData["Passport number"] || correctionFormData["passport_number"] || "").trim().toUpperCase();
        if (pno) {
          finalData["Passport number"] = pno;
          finalData["passport_number"] = pno;
        }
      }
      if (correctionFormData["Date of issue"] !== undefined || correctionFormData["issue_date"] !== undefined) {
        const doi = (correctionFormData["Date of issue"] || correctionFormData["issue_date"] || "").trim();
        if (doi) {
          finalData["Date of issue"] = doi;
          finalData["issue_date"] = doi;
        }
      }
      if (correctionFormData["Date of expiry"] !== undefined || correctionFormData["expiry_date"] !== undefined) {
        const doe = (correctionFormData["Date of expiry"] || correctionFormData["expiry_date"] || "").trim();
        if (doe) {
          finalData["Date of expiry"] = doe;
          finalData["expiry_date"] = doe;
        }
      }
      if (correctionFormData["Place of issue"] !== undefined || correctionFormData["issue_place"] !== undefined) {
        const poi = (correctionFormData["Place of issue"] || correctionFormData["issue_place"] || "").trim().toUpperCase();
        if (poi) {
          finalData["Place of issue"] = poi;
          finalData["issue_place"] = poi;
        }
      }

      await automationApi.submitCorrection(
        user?.email || activeClientEmail,
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

  const handleDismissCorrection = async (folderName?: string) => {
    const targetFolder = folderName || correctionApp?.folder_name;
    if (!targetFolder) return;
    try {
      setIsDismissing(true);
      const email = user?.email || activeClientEmail;
      await automationApi.dismissApplication(email, targetFolder);
      setApplications(prev => prev.filter(a => a.folder_name !== targetFolder));
      setDismissedCorrectionFolder(null);
      setUploadMessage(null);
      await refreshAllData();
    } catch (err: any) {
      console.warn("Failed to dismiss application on server:", err);
      setApplications(prev => prev.filter(a => a.folder_name !== targetFolder));
      setDismissedCorrectionFolder(targetFolder);
      await refreshAllData();
    } finally {
      setIsDismissing(false);
    }
  };

  const handleCancelPreview = (folderName: string, applicantName?: string) => {
    setCancelModalTarget({
      folderName,
      applicantName: applicantName || folderName,
    });
  };

  const executeCancelApplication = async (folderName: string) => {
    try {
      setCancellingFolder(folderName);
      const email = user?.email || activeClientEmail;
      await automationApi.dismissApplication(email, folderName);

      setPreviews(prev => prev.filter(p => p.folder_name !== folderName));
      setApplications(prev => prev.filter(a => a.folder_name !== folderName));
      setPreviewSelections(prev => {
        const copy = { ...prev };
        delete copy[folderName];
        return copy;
      });
      setCancelModalTarget(null);
      await refreshAllData();
    } catch (err: any) {
      console.warn("Failed to delete application files from server:", err);
      setPreviews(prev => prev.filter(p => p.folder_name !== folderName));
      setApplications(prev => prev.filter(a => a.folder_name !== folderName));
      setCancelModalTarget(null);
      await refreshAllData();
    } finally {
      setCancellingFolder(null);
    }
  };

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

  const handleConfirmFinalSubmit = async (folderName: string, arn: string) => {
    try {
      setSubmittingArn(arn);
      await automationApi.confirmSubmission(user?.email || activeClientEmail, folderName, arn);
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

  const openImageViewer = (title: string, fullUrl: string) => {
    setImageViewerModal({
      isOpen: true,
      title,
      imageUrl: fullUrl,
    });
  };

  const wrongCredsApp = applications.find(
    a => a.status === 'ERROR' && (
      a.error_type === 'INVALID_CREDENTIALS' || 
      (a.error_message && a.error_message.toLowerCase().includes('incorrect user id')) ||
      (a.error_message && a.error_message.toLowerCase().includes('authentication failed'))
    )
  );

  const FIELD_ALIAS_MAP: Record<string, string[]> = {
    given_name: ['givenname', 'givennames', 'firstname', 'applicantgivenname'],
    surname: ['surname', 'lastname', 'applicantsurname'],
    dob: ['dateofbirth', 'dob', 'birthdate'],
    pob: ['placeofbirth', 'pob', 'birthplace'],
    gender: ['gender', 'sex'],
    father: ['fathersname', 'father', 'fathername', 'fathersgivenname', 'nameoffatherlegalguardian', 'applicantfathername'],
    mother: ['mothersname', 'mother', 'mothername', 'mothersgivenname', 'nameofmother', 'applicantmothername'],
    education: ['educationalqualification', 'education', 'qualification'],
    employment: ['employmenttype', 'employment'],
    marital: ['maritalstatus', 'marital'],
    spouse: ['spousename', 'spouse', 'spousesname', 'spousesgivenname', 'spousegivenname'],
    house: ['housenoandstreetname', 'houseno', 'streetname', 'house', 'housenumber', 'street'],
    village: ['villageortownorcity', 'village', 'city', 'town', 'villagetowncity'],
    state: ['state', 'stateut', 'addrstate'],
    district: ['district', 'addrdist'],
    pin: ['pincode', 'pin', 'postalcode'],
    police: ['policestation', 'police'],
    indian_mobile: ['indianmobilenumber', 'indianmobile', 'mobile', 'mobilenumber'],
    email: ['emailid', 'email', 'presentaddressemail', 'mail', 'emailaddress'],
    italian_l1: ['italianaddressline1', 'addr_l1', 'addrl1', 'italianaddress1', 'italianaddress'],
    italian_l2: ['italianaddressline2', 'addr_l2', 'addrl2', 'italianaddress2'],
    italian_mobile: ['italianmobilenumber', 'italianmobile', 'em_mobile', 'emmobile', 'overseasmobile'],
    passport_number: ['passportnumber', 'passportno', 'oldpassportnumber', 'oldpassportno'],
    issue_date: ['dateofissue', 'issuedate', 'doi', 'passportissuedate', 'dateofissuance'],
    expiry_date: ['dateofexpiry', 'expirydate', 'doe', 'passportexpirydate', 'dateofexpiration'],
    issue_place: ['placeofissue', 'issueplace', 'passportplaceofissue'],
  };

  const allKnownCleanAliases = new Set(
    Object.values(FIELD_ALIAS_MAP).flat().map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  const isFieldMissing = (fieldKeys: string[]): boolean => {
    const missingList = correctionApp?.missing_fields;
    if (!missingList || missingList.length === 0) {
      return false;
    }
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTargets = new Set(fieldKeys.map(clean));

    for (const [_, aliases] of Object.entries(FIELD_ALIAS_MAP)) {
      if (aliases.some(a => cleanTargets.has(clean(a)))) {
        aliases.forEach(a => cleanTargets.add(clean(a)));
      }
    }

    return missingList.some(mf => {
      const cleanMf = clean(mf);
      return cleanTargets.has(cleanMf);
    });
  };

  const hasGeneralMissing = 
    isFieldMissing(["Educational qualification", "education", "qualification"]) ||
    isFieldMissing(["Employment type", "employment"]) ||
    isFieldMissing(["Marital status", "marital"]) ||
    (correctionFormData["Marital status"] === "MARRIED" && isFieldMissing(["Spouse name", "spouse"])) ||
    isFieldMissing(["Given NAME", "given_name", "first name"]) ||
    isFieldMissing(["SURNAME", "surname", "last name"]) ||
    isFieldMissing(["Date of birth", "dob", "birth date"]) ||
    isFieldMissing(["Place of birth", "pob"]) ||
    isFieldMissing(["GENDER", "gender", "sex"]) ||
    isFieldMissing(["Father's name", "father"]) ||
    isFieldMissing(["Mother's name", "mother"]);

  const hasIndianAddressMissing =
    isFieldMissing(["House No. and Street Name", "house", "houseno"]) ||
    isFieldMissing(["Village or Town or City", "village", "city"]) ||
    isFieldMissing(["State", "state/ut"]) ||
    isFieldMissing(["District"]) ||
    isFieldMissing(["PIN Code", "pin", "pincode"]) ||
    isFieldMissing(["Indian mobile number", "mobile"]) ||
    isFieldMissing(["Email id", "email", "presentaddressemail", "mail"]) ||
    isFieldMissing(["Police Station", "police"]);

  const hasItalianAddressMissing =
    isFieldMissing(["Italian address line 1", "addr_l1", "italian address"]) ||
    isFieldMissing(["Italian address line 2", "addr_l2"]) ||
    isFieldMissing(["Italian mobile number", "em_mobile", "italian mobile"]);

  const hasPassportMissing =
    isFieldMissing(["Passport number", "passport_number", "passportno", "old_passport_number"]) ||
    isFieldMissing(["Date of issue", "issue_date", "date_of_issue"]) ||
    isFieldMissing(["Date of expiry", "expiry_date", "date_of_expiry"]) ||
    isFieldMissing(["Place of issue", "issue_place", "place_of_issue"]);

  const otherMissingFields = (correctionApp?.missing_fields || []).filter(mf => {
    const cleanMf = mf.toLowerCase().replace(/[^a-z0-9]/g, '');
    return !allKnownCleanAliases.has(cleanMf);
  });

  const handleClearMissingFields = () => {
    setCorrectionFormData(prev => {
      const updated = { ...prev };
      if (isFieldMissing(["PIN Code", "pin", "pincode"])) updated["PIN Code"] = "";
      if (isFieldMissing(["Educational qualification", "education", "qualification"])) updated["Educational qualification"] = "";
      if (isFieldMissing(["Employment type", "employment"])) updated["Employment type"] = "";
      if (isFieldMissing(["Marital status", "marital"])) {
        updated["Marital status"] = "SINGLE";
        updated["Spouse name"] = "";
      }
      if (isFieldMissing(["Spouse name", "spouse"])) updated["Spouse name"] = "";
      if (isFieldMissing(["House No. and Street Name", "house", "houseno"])) updated["House No. and Street Name"] = "";
      if (isFieldMissing(["Village or Town or City", "village", "city"])) updated["Village or Town or City"] = "";
      if (isFieldMissing(["State", "state/ut"])) updated["State"] = "";
      if (isFieldMissing(["District"])) updated["District"] = "";
      if (isFieldMissing(["Indian mobile number", "mobile"])) updated["Indian mobile number"] = "";
      if (isFieldMissing(["Email id", "email", "presentaddressemail", "mail"])) {
        updated["Email id"] = "";
        updated["presentAddressEmail"] = "";
      }
      if (isFieldMissing(["Italian address line 1", "addr_l1", "italian address"])) updated["Italian address line 1"] = "";
      if (isFieldMissing(["Italian address line 2", "addr_l2"])) updated["Italian address line 2"] = "";
      if (isFieldMissing(["Italian mobile number", "em_mobile", "italian mobile"])) updated["Italian mobile number"] = "";
      if (isFieldMissing(["Passport number", "passport_number", "passportno", "old_passport_number"])) {
        updated["Passport number"] = "";
        updated["passport_number"] = "";
      }
      if (isFieldMissing(["Date of issue", "issue_date", "date_of_issue"])) {
        updated["Date of issue"] = "";
        updated["issue_date"] = "";
      }
      if (isFieldMissing(["Date of expiry", "expiry_date", "date_of_expiry"])) {
        updated["Date of expiry"] = "";
        updated["expiry_date"] = "";
      }
      if (isFieldMissing(["Place of issue", "issue_place", "place_of_issue"])) {
        updated["Place of issue"] = "";
        updated["issue_place"] = "";
      }
      if (isFieldMissing(["Given NAME", "given_name", "first name"])) updated["Given NAME"] = "";
      if (isFieldMissing(["SURNAME", "surname", "last name"])) updated["SURNAME"] = "";
      if (isFieldMissing(["Date of birth", "dob", "birth date"])) updated["Date of birth"] = "";
      if (isFieldMissing(["Place of birth", "pob"])) updated["Place of birth"] = "";
      if (isFieldMissing(["Father's name", "father"])) updated["Father's name"] = "";
      if (isFieldMissing(["Mother's name", "mother"])) updated["Mother's name"] = "";
      if (isFieldMissing(["Police Station", "police"])) updated["Police Station"] = "";
      otherMissingFields.forEach(f => {
        updated[f] = "";
      });
      return updated;
    });
  };

  return (
    <div className="fresh-reissue-container">

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

      {currentSection === 'form' && (
        <div className="fresh-reissue-content">

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
              <button
                type="button"
                onClick={() => handleDismissCorrection(wrongCredsApp.folder_name)}
                disabled={isDismissing}
                className="dismiss-banner-btn"
                title="Dismiss and delete this application from database"
              >
                {isDismissing ? 'Dismissing...' : 'Dismiss / Upload New'}
              </button>
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

              <div className="missing-fields-banner">
                <AlertCircle className="missing-alert-icon" />
                <div className="missing-content">
                  <span className="missing-title">Some information from your side was missing and we suggested these values. Please review or edit before submitting.</span>
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

                {hasGeneralMissing && (
                  <>
                    <h3 className="form-section-title">General Details</h3>
                    <div className="form-grid-2">
                      {isFieldMissing(["Given NAME", "given_name", "first name"]) && (
                        <div className="input-group">
                          <label htmlFor="corrGivenName" className="input-label">
                            Given Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrGivenName"
                            type="text"
                            className="form-input"
                            placeholder="e.g. AMIT"
                            value={correctionFormData["Given NAME"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Given NAME": e.target.value.toUpperCase() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["SURNAME", "surname", "last name"]) && (
                        <div className="input-group">
                          <label htmlFor="corrSurname" className="input-label">
                            Surname
                          </label>
                          <input
                            id="corrSurname"
                            type="text"
                            className="form-input"
                            placeholder="e.g. KUMAR"
                            value={correctionFormData["SURNAME"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "SURNAME": e.target.value.toUpperCase() }))}
                          />
                        </div>
                      )}

                      {isFieldMissing(["Date of birth", "dob", "birth date"]) && (
                        <div className="input-group">
                          <label htmlFor="corrDob" className="input-label">
                            Date of Birth <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrDob"
                            type="text"
                            className="form-input"
                            placeholder="DD/MM/YYYY"
                            value={correctionFormData["Date of birth"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Date of birth": e.target.value.trim() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Place of birth", "pob"]) && (
                        <div className="input-group">
                          <label htmlFor="corrPob" className="input-label">
                            Place of Birth <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrPob"
                            type="text"
                            className="form-input"
                            placeholder="e.g. JAIPUR"
                            value={correctionFormData["Place of birth"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Place of birth": e.target.value.toUpperCase() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["GENDER", "gender", "sex"]) && (
                        <div className="input-group">
                          <label htmlFor="corrGender" className="input-label">
                            Gender <span className="required-star">*</span>
                          </label>
                          <select
                            id="corrGender"
                            className="form-input"
                            value={correctionFormData["GENDER"] || "MALE"}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "GENDER": e.target.value }))}
                            required
                          >
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                            <option value="TRANSGENDER">TRANSGENDER</option>
                          </select>
                        </div>
                      )}

                      {isFieldMissing(["Father's name", "father"]) && (
                        <div className="input-group">
                          <label htmlFor="corrFather" className="input-label">
                            Father's Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrFather"
                            type="text"
                            className="form-input"
                            placeholder="e.g. RAMESH CHAND"
                            value={correctionFormData["Father's name"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Father's name": e.target.value.toUpperCase() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Mother's name", "mother"]) && (
                        <div className="input-group">
                          <label htmlFor="corrMother" className="input-label">
                            Mother's Name <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrMother"
                            type="text"
                            className="form-input"
                            placeholder="e.g. SUNITA DEVI"
                            value={correctionFormData["Mother's name"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Mother's name": e.target.value.toUpperCase() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Educational qualification", "education", "qualification"]) && (
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
                      )}

                      {isFieldMissing(["Employment type", "employment"]) && (
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
                            <option value="OTHERS">OTHERS</option>
                          </select>
                        </div>
                      )}

                      {isFieldMissing(["Marital status", "marital"]) && (
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
                      )}

                      {correctionFormData["Marital status"] === "MARRIED" && (isFieldMissing(["Spouse name", "spouse"]) || isFieldMissing(["Marital status", "marital"])) && (
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
                  </>
                )}

                {hasIndianAddressMissing && (
                  <>
                    <h3 className="form-section-title">Present Residential Address (India)</h3>
                    <div className="form-grid-2">
                      {isFieldMissing(["House No. and Street Name", "house", "houseno"]) && (
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
                      )}

                      {isFieldMissing(["Village or Town or City", "village", "city"]) && (
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
                      )}

                      {isFieldMissing(["State", "state/ut"]) && (
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
                      )}

                      {isFieldMissing(["District"]) && (
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
                      )}

                      {isFieldMissing(["PIN Code", "pin", "pincode"]) && (
                        <div className="input-group">
                          <label htmlFor="corrPin" className="input-label">
                            PIN Code <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrPin"
                            type="text"
                            maxLength={6}
                            className="form-input"
                            placeholder="e.g. 110001"
                            value={correctionFormData["PIN Code"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "PIN Code": e.target.value.trim() }))}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Police Station", "police"]) && (
                        <div className="input-group">
                          <label htmlFor="corrPolice" className="input-label">
                            Police Station
                          </label>
                          <input
                            id="corrPolice"
                            type="text"
                            className="form-input"
                            placeholder="e.g. KOTWALI"
                            value={correctionFormData["Police Station"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Police Station": e.target.value.toUpperCase() }))}
                          />
                        </div>
                      )}

                      {isFieldMissing(["Indian mobile number", "mobile"]) && (
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
                      )}

                      {isFieldMissing(["Email id", "email", "presentaddressemail", "mail"]) && (
                        <div className="input-group">
                          <label htmlFor="corrEmail" className="input-label">
                            Email ID <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrEmail"
                            type="email"
                            className="form-input"
                            placeholder="e.g. applicant@domain.com"
                            value={correctionFormData["Email id"] || correctionFormData["presentAddressEmail"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setCorrectionFormData(prev => ({
                                ...prev,
                                "Email id": val,
                                "presentAddressEmail": val
                              }));
                            }}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {hasItalianAddressMissing && (
                  <>
                    <h3 className="form-section-title">Address in Italy</h3>
                    <div className="form-grid-2">
                      {isFieldMissing(["Italian address line 1", "addr_l1", "italian address"]) && (
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
                      )}

                      {isFieldMissing(["Italian address line 2", "addr_l2"]) && (
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
                      )}

                      {isFieldMissing(["Italian mobile number", "em_mobile", "italian mobile"]) && (
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
                      )}
                    </div>
                  </>
                )}

                {hasPassportMissing && (
                  <>
                    <h3 className="form-section-title">Passport Details (Previous Passport)</h3>
                    <div className="form-grid-2">
                      {isFieldMissing(["Passport number", "passport_number", "passportno", "old_passport_number"]) && (
                        <div className="input-group">
                          <label htmlFor="corrPassportNumber" className="input-label">
                            Passport Number <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrPassportNumber"
                            type="text"
                            maxLength={9}
                            className="form-input"
                            placeholder="e.g. Z1234567"
                            value={correctionFormData["Passport number"] || correctionFormData["passport_number"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().replace(/\s/g, '');
                              setCorrectionFormData(prev => ({ ...prev, "Passport number": val, "passport_number": val }));
                            }}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Date of issue", "issue_date", "date_of_issue"]) && (
                        <div className="input-group">
                          <label htmlFor="corrIssueDate" className="input-label">
                            Date of Issue <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrIssueDate"
                            type="text"
                            className="form-input"
                            placeholder="DD/MM/YYYY"
                            value={correctionFormData["Date of issue"] || correctionFormData["issue_date"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setCorrectionFormData(prev => ({ ...prev, "Date of issue": val, "issue_date": val }));
                            }}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Date of expiry", "expiry_date", "date_of_expiry"]) && (
                        <div className="input-group">
                          <label htmlFor="corrExpiryDate" className="input-label">
                            Date of Expiry <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrExpiryDate"
                            type="text"
                            className="form-input"
                            placeholder="DD/MM/YYYY"
                            value={correctionFormData["Date of expiry"] || correctionFormData["expiry_date"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setCorrectionFormData(prev => ({ ...prev, "Date of expiry": val, "expiry_date": val }));
                            }}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["Place of issue", "issue_place", "place_of_issue"]) && (
                        <div className="input-group">
                          <label htmlFor="corrPlaceOfIssue" className="input-label">
                            Place of Issue <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrPlaceOfIssue"
                            type="text"
                            className="form-input"
                            placeholder="e.g. JAIPUR or ROME"
                            value={correctionFormData["Place of issue"] || correctionFormData["issue_place"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setCorrectionFormData(prev => ({ ...prev, "Place of issue": val, "issue_place": val }));
                            }}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {otherMissingFields.length > 0 && (
                  <>
                    <h3 className="form-section-title">Other Required Details</h3>
                    <div className="form-grid-2">
                      {otherMissingFields.map((fieldKey) => (
                        <div className="input-group" key={fieldKey}>
                          <label htmlFor={`corr_${fieldKey}`} className="input-label">
                            {fieldKey} <span className="required-star">*</span>
                          </label>
                          <input
                            id={`corr_${fieldKey}`}
                            type="text"
                            className="form-input"
                            placeholder={`Enter ${fieldKey}`}
                            value={correctionFormData[fieldKey] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!hasGeneralMissing && !hasIndianAddressMissing && !hasItalianAddressMissing && !hasPassportMissing && otherMissingFields.length === 0 && (
                  <div className="empty-correction-notice" style={{ padding: '16px', color: '#94a3b8', textAlign: 'center' }}>
                    All required fields appear to be present. Click Save to continue.
                  </div>
                )}

                <div className="correction-actions-row">
                  <button
                    type="button"
                    onClick={() => handleDismissCorrection(correctionApp.folder_name)}
                    disabled={isDismissing}
                    className="dismiss-btn"
                  >
                    {isDismissing ? 'Dismissing & Deleting...' : 'Dismiss / Upload New Instead'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearMissingFields}
                    className="dismiss-btn clear-fields-btn"
                  >
                    Clear Fields
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

                {!isPlaceSubmitted && (
                  <div className="input-group">
                    <label htmlFor="declarationPlace" className="input-label">
                      Declaration Place <span className="required-star">*</span>
                    </label>
                    <input
                      id="declarationPlace"
                      type="text"
                      required
                      value={declarationPlace}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setDeclarationPlace(val);
                        localStorage.setItem('fs_declaration_place', val);
                      }}
                      placeholder="e.g. ROME, MILANO, NAPOLI"
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                  </div>
                )}

                <div className="compact-docs-section">
                  <div className="compact-docs-header">
                    <span className="compact-docs-title">Required Documents <span className="required-star">*</span></span>
                    <span className="compact-docs-hint">Photos &amp; signatures to JPG, documents to PDF (&le;1 MB)</span>
                  </div>

                  <div className="compact-slots-list">
                    {/* 1. Photograph */}
                    <div
                      className={`compact-slot-row ${photoFile ? 'has-file' : ''} ${dragSlot === 'photo' ? 'drag-target' : ''}`}
                      onClick={() => photoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot('photo'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot(null); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragSlot(null);
                        if (e.dataTransfer.files?.[0]) setPhotoFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); }}
                      />
                      <div className="compact-slot-label">
                        <Camera className="compact-slot-icon" />
                        <span className="compact-slot-name">Photograph <span className="required-star">*</span></span>
                        <span className="compact-slot-spec">630×810 JPG</span>
                      </div>
                      <div className="compact-slot-action">
                        {photoFile ? (
                          <div className="compact-file-badge">
                            <img src={URL.createObjectURL(photoFile)} alt="Photo" className="compact-thumb" />
                            <span className="compact-file-name" title={photoFile.name}>{photoFile.name}</span>
                            <span className="compact-file-size">({(photoFile.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              className="compact-remove-btn"
                              title="Remove photo"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoFile(null);
                                if (photoInputRef.current) photoInputRef.current.value = '';
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="compact-upload-btn">
                            <Upload style={{ width: '13px', height: '13px' }} />
                            <span>Choose Photo</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Signature */}
                    <div
                      className={`compact-slot-row ${signFile ? 'has-file' : ''} ${dragSlot === 'sign' ? 'drag-target' : ''}`}
                      onClick={() => signInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot('sign'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot(null); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragSlot(null);
                        if (e.dataTransfer.files?.[0]) setSignFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={signInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setSignFile(e.target.files[0]); }}
                      />
                      <div className="compact-slot-label">
                        <PenTool className="compact-slot-icon" />
                        <span className="compact-slot-name">Signature <span className="required-star">*</span></span>
                        <span className="compact-slot-spec">&le;100 KB</span>
                      </div>
                      <div className="compact-slot-action">
                        {signFile ? (
                          <div className="compact-file-badge">
                            <img src={URL.createObjectURL(signFile)} alt="Sign" className="compact-thumb" />
                            <span className="compact-file-name" title={signFile.name}>{signFile.name}</span>
                            <span className="compact-file-size">({(signFile.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              className="compact-remove-btn"
                              title="Remove signature"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSignFile(null);
                                if (signInputRef.current) signInputRef.current.value = '';
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="compact-upload-btn">
                            <Upload style={{ width: '13px', height: '13px' }} />
                            <span>Choose Signature</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Passport Copy */}
                    <div
                      className={`compact-slot-row ${passportFile ? 'has-file' : ''} ${dragSlot === 'passport' ? 'drag-target' : ''}`}
                      onClick={() => passportInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot('passport'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot(null); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragSlot(null);
                        if (e.dataTransfer.files?.[0]) setPassportFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={passportInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setPassportFile(e.target.files[0]); }}
                      />
                      <div className="compact-slot-label">
                        <BookOpen className="compact-slot-icon" />
                        <span className="compact-slot-name">Passport Copy <span className="required-star">*</span></span>
                        <span className="compact-slot-spec">PDF &le;1 MB</span>
                      </div>
                      <div className="compact-slot-action">
                        {passportFile ? (
                          <div className="compact-file-badge">
                            <FileText style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                            <span className="compact-file-name" title={passportFile.name}>{passportFile.name}</span>
                            <span className="compact-file-size">({(passportFile.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              className="compact-remove-btn"
                              title="Remove passport"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPassportFile(null);
                                if (passportInputRef.current) passportInputRef.current.value = '';
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="compact-upload-btn">
                            <Upload style={{ width: '13px', height: '13px' }} />
                            <span>Choose Passport</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Residence Card / Proof */}
                    <div
                      className={`compact-slot-row ${residenceFile ? 'has-file' : ''} ${dragSlot === 'residence' ? 'drag-target' : ''}`}
                      onClick={() => residenceInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot('residence'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot(null); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragSlot(null);
                        if (e.dataTransfer.files?.[0]) setResidenceFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={residenceInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setResidenceFile(e.target.files[0]); }}
                      />
                      <div className="compact-slot-label">
                        <ShieldCheck className="compact-slot-icon" />
                        <span className="compact-slot-name">Residence Card / Proof <span className="required-star">*</span></span>
                        <span className="compact-slot-spec">PDF &le;1 MB</span>
                      </div>
                      <div className="compact-slot-action">
                        {residenceFile ? (
                          <div className="compact-file-badge">
                            <FileText style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                            <span className="compact-file-name" title={residenceFile.name}>{residenceFile.name}</span>
                            <span className="compact-file-size">({(residenceFile.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              className="compact-remove-btn"
                              title="Remove residence card"
                              onClick={(e) => {
                                e.stopPropagation();
                                setResidenceFile(null);
                                if (residenceInputRef.current) residenceInputRef.current.value = '';
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="compact-upload-btn">
                            <Upload style={{ width: '13px', height: '13px' }} />
                            <span>Choose Residence Card</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Supporting Document / Necessity */}
                    <div
                      className={`compact-slot-row ${supportingFile ? 'has-file' : ''} ${dragSlot === 'supporting' ? 'drag-target' : ''}`}
                      onClick={() => supportingInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot('supporting'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragSlot(null); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation(); setDragSlot(null);
                        if (e.dataTransfer.files?.[0]) setSupportingFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <input
                        ref={supportingInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) setSupportingFile(e.target.files[0]); }}
                      />
                      <div className="compact-slot-label">
                        <Home className="compact-slot-icon" />
                        <span className="compact-slot-name">Supporting / Necessity</span>
                        <span className="compact-slot-spec">PDF &le;1 MB</span>
                      </div>
                      <div className="compact-slot-action">
                        {supportingFile ? (
                          <div className="compact-file-badge">
                            <FileText style={{ width: '16px', height: '16px', color: '#059669', flexShrink: 0 }} />
                            <span className="compact-file-name" title={supportingFile.name}>{supportingFile.name}</span>
                            <span className="compact-file-size">({(supportingFile.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              className="compact-remove-btn"
                              title="Remove supporting doc"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupportingFile(null);
                                if (supportingInputRef.current) supportingInputRef.current.value = '';
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="compact-upload-btn">
                            <Upload style={{ width: '13px', height: '13px' }} />
                            <span>Choose Supporting Doc</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compact Batch Dropstrip */}
                  <div
                    className={`compact-drop-strip ${isDragActive ? 'drag-active' : ''}`}
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
                    <Upload style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                    <span>Or drag all 5 documents together here to auto-assign</span>
                  </div>

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
                onClick={() => {
                  setIsPlaceSubmitted(false);
                  onSectionChange('form');
                }}
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
                    <div className="preview-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="preview-arn-badge">
                        <span className="preview-client-arn" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>ARN: {item.arn}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="preview-client-name" style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{item.applicant_name}</span>
                        <span className="status-tag-pending">Awaiting Verification</span>
                      </div>
                    </div>

                    {/* Photo & Signature Crop Verification Section */}
                    {(item.photo_preview_url || item.signature_preview_url) && (
                      <div className="preview-media-verify-section">
                        <div className="preview-media-verify-header">
                          <span className="media-verify-label">Processed Photo &amp; Signature</span>
                          <span className="media-verify-hint">Verify crop framing &amp; margins before final submission</span>
                        </div>
                        <div className="preview-media-verify-grid">
                          {/* Photo Preview Card */}
                          <div className="preview-media-card">
                            <div className="media-card-top">
                              <div className="media-card-info">
                                <Camera style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                                <span className="media-card-title">Photograph</span>
                              </div>
                              <span className="media-card-tag">630×810 JPG (&le;250 KB)</span>
                            </div>
                            <div
                              className="media-card-preview-area"
                              onClick={() => {
                                if (item.photo_preview_url) {
                                  openImageViewer('Applicant Photograph (630×810)', `${automationApi.getBaseUrl()}${item.photo_preview_url}`);
                                }
                              }}
                            >
                              {item.photo_preview_url ? (
                                <img
                                  src={`${automationApi.getBaseUrl()}${item.photo_preview_url}`}
                                  alt="Photograph"
                                  className="media-card-img photo-frame"
                                  title="Click to zoom &amp; inspect face framing"
                                />
                              ) : (
                                <div className="media-card-empty">No Photograph</div>
                              )}
                            </div>
                            <span className="media-card-subhint">Click image to inspect face framing</span>
                          </div>

                          {/* Signature Preview Card */}
                          <div className="preview-media-card">
                            <div className="media-card-top">
                              <div className="media-card-info">
                                <PenTool style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                                <span className="media-card-title">Signature</span>
                              </div>
                              <span className="media-card-tag">JPG &le;100 KB</span>
                            </div>
                            <div
                              className="media-card-preview-area"
                              onClick={() => {
                                if (item.signature_preview_url) {
                                  openImageViewer('Applicant Signature', `${automationApi.getBaseUrl()}${item.signature_preview_url}`);
                                }
                              }}
                            >
                              {item.signature_preview_url ? (
                                <img
                                  src={`${automationApi.getBaseUrl()}${item.signature_preview_url}`}
                                  alt="Signature"
                                  className="media-card-img sign-frame"
                                  title="Click to zoom &amp; inspect signature crop"
                                />
                              ) : (
                                <div className="media-card-empty">No Signature</div>
                              )}
                            </div>
                            <span className="media-card-subhint">Click image to inspect signature crop</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="preview-docs-container">

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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          disabled={cancellingFolder === folderKey || isSubmittingThis}
                          onClick={() => handleCancelPreview(folderKey, item.applicant_name)}
                          className="cancel-preview-btn-footer"
                          title="Cancel application and delete both preview files from PC"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          {cancellingFolder === folderKey ? (
                            <>
                              <RefreshCw style={{ width: '14px', height: '14px' }} className="animate-spin" />
                              <span>Canceling...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                              <span>Cancel Application</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!canSubmit || isSubmittingThis || cancellingFolder === folderKey}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                        {item.portal_email && (
                          <span className="arn-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                            Portal: {item.portal_email}
                          </span>
                        )}
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

      {cancelModalTarget && (
        <div
          className="logout-modal-overlay"
          onClick={() => !cancellingFolder && setCancelModalTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="logout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logout-modal-icon-wrapper">
              <Trash2 className="logout-modal-icon" />
            </div>

            <h3 className="logout-modal-title">
              Cancel Application?
            </h3>

            <p className="logout-modal-subtitle">
              Are you sure you want to cancel the application for <strong>{cancelModalTarget.applicantName}</strong>? Both preview files and all associated documents will be permanently deleted from your computer and database.
            </p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-btn cancel-btn"
                style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                disabled={Boolean(cancellingFolder)}
                onClick={() => setCancelModalTarget(null)}
              >
                Keep Application
              </button>
              <button
                type="button"
                className="logout-modal-btn confirm-btn"
                disabled={Boolean(cancellingFolder)}
                onClick={() => executeCancelApplication(cancelModalTarget.folderName)}
              >
                {cancellingFolder ? (
                  <>
                    <RefreshCw className="animate-spin" style={{ width: '15px', height: '15px', marginRight: '6px' }} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Application</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PdfViewerModal
        isOpen={viewerModal.isOpen}
        title={viewerModal.title}
        pdfUrl={viewerModal.pdfUrl}
        onClose={() => setViewerModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ImageViewerModal
        isOpen={imageViewerModal.isOpen}
        title={imageViewerModal.title}
        imageUrl={imageViewerModal.imageUrl}
        onClose={() => setImageViewerModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
