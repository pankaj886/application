import React, { useState, useEffect, useRef } from 'react';
import { 
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
  X,
  Mic,
  Edit3,
  Plus
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { 
  automationApi, 
  ApplicationItem, 
  PreviewItem, 
  CompletedItem,
  QuotaInfo
} from '../services/automationApi';
import { FreshReissueSection, UserProfile } from '../types';
import { PdfViewerModal } from './PdfViewerModal';
import { ImageViewerModal } from './ImageViewerModal';
import { InAppInfoModal } from './InAppInfoModal';

interface FreshReissueViewProps {
  user: UserProfile;
  currentSection: FreshReissueSection;
  onSectionChange: (sec: FreshReissueSection) => void;
  onBackToPassport?: () => void;
  serviceType?: 'reissue' | 'fresh';
  onServiceTypeChange?: (service: 'reissue' | 'fresh') => void;
}

export const FreshReissueView: React.FC<FreshReissueViewProps> = ({
  user,
  currentSection,
  onSectionChange,
  serviceType,
  onServiceTypeChange: _onServiceTypeChange,
}) => {
  const [activeServiceType, setActiveServiceType] = useState<'reissue' | 'fresh'>(serviceType || 'reissue');

  useEffect(() => {
    if (serviceType) {
      setActiveServiceType(serviceType);
    }
  }, [serviceType]);

  const [showInAppInfoModal, setShowInAppInfoModal] = useState(false);
  const [inAppInfoData, setInAppInfoData] = useState<Record<string, any>>({});
  const [previewFilter, setPreviewFilter] = useState<'all' | 'reissue' | 'fresh'>('all');
  const [submittedFilter, setSubmittedFilter] = useState<'all' | 'reissue' | 'fresh'>('all');

  const initialEmail = (localStorage.getItem('fs_active_client_email') || '').toUpperCase();
  const initialPassword = localStorage.getItem('fs_portal_password') || '';
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [activeClientEmail, setActiveClientEmail] = useState(initialEmail || '');
  const [portalPassword, setPortalPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const declarationPlace = 'ROME';

  // 6 Distinct Document Upload Boxes + Extras
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [residenceFile, setResidenceFile] = useState<File | null>(null);
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Box Drag Over states & tracking refs
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const dragSlotRef = useRef<string | null>(null);
  const lastDropTimeRef = useRef<number>(0);

  const filesStateRef = useRef({
    photo: photoFile,
    sign: signFile,
    passport: passportFile,
    identity: identityFile,
    residence: residenceFile,
    info: infoFile,
    selected: selectedFiles,
  });

  useEffect(() => {
    filesStateRef.current = {
      photo: photoFile,
      sign: signFile,
      passport: passportFile,
      identity: identityFile,
      residence: residenceFile,
      info: infoFile,
      selected: selectedFiles,
    };
  }, [photoFile, signFile, passportFile, identityFile, residenceFile, infoFile, selectedFiles]);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [submissionTracker, setSubmissionTracker] = useState<{
    active: boolean;
    ready: boolean;
    folderName?: string;
    isError?: boolean;
    errorType?: string;
    percent: number;
    stageText: string;
    applicantName?: string;
    startedAt: number;
  } | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const prevPreviewFoldersRef = useRef<Set<string>>(new Set());

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
  const identityInputRef = useRef<HTMLInputElement>(null);
  const residenceInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryAccountEmail = (portalEmail || activeClientEmail || localStorage.getItem('fs_active_client_email') || '').trim().toLowerCase();

  const refreshAllData = async (targetEmailOverride?: string) => {
    const targetEmail = (targetEmailOverride || queryAccountEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      setApplications([]);
      setPreviews([]);
      setCompleted([]);
      return;
    }
    try {
      const [statusRes, prevs, comps] = await Promise.all([
        automationApi.getClientStatus(targetEmail).catch(() => ({ client_email: targetEmail, applications: [], quota: undefined })),
        automationApi.getPendingPreviews(targetEmail).catch(() => []),
        automationApi.getCompletedApplications(targetEmail).catch(() => []),
      ]);
      const apps = statusRes.applications || [];
      if (statusRes.quota) {
        setQuota(statusRes.quota);
      }
      setApplications(apps);
      setPreviews(prevs);
      setCompleted(comps);

      const targetFolder = submissionTracker?.folderName;

      const activeProcessingApp = targetFolder
        ? apps.find(a => a.folder_name === targetFolder && ['UPLOADED', 'EXTRACTING', 'EXTRACTED', 'FILLING_PORTAL'].includes(a.status))
        : undefined;

      const currentPreviewFolders = new Set((prevs || []).map(p => p.folder_name));
      prevPreviewFoldersRef.current = currentPreviewFolders;

      // Match the preview specifically for the active submission tracker folder
      const matchingPreview = targetFolder
        ? (prevs || []).find(p => p.folder_name === targetFolder)
        : undefined;

      const matchingErrorApp = targetFolder
        ? apps.find(a => a.folder_name === targetFolder && a.status === 'ERROR')
        : undefined;

      const matchingNeedsCorrection = targetFolder
        ? apps.some(a => a.folder_name === targetFolder && a.status === 'NEEDS_CORRECTION')
        : false;

      if (activeProcessingApp) {
        let serverPct = activeProcessingApp.progress || 25;
        if (activeProcessingApp.status === 'UPLOADED') serverPct = Math.max(serverPct, 18);
        else if (activeProcessingApp.status === 'EXTRACTING') serverPct = Math.max(serverPct, 38);
        else if (activeProcessingApp.status === 'EXTRACTED') serverPct = Math.max(serverPct, 55);
        else if (activeProcessingApp.status === 'FILLING_PORTAL') {
          if ((activeProcessingApp.stage || '').includes('Generating PDF')) serverPct = Math.max(serverPct, 90);
          else if ((activeProcessingApp.stage || '').includes('Submitting Stages')) serverPct = Math.max(serverPct, 76);
          else serverPct = Math.max(serverPct, 64);
        }
        setSubmissionTracker(prev => {
          const nextPct = prev && prev.active && !prev.ready && !prev.isError ? Math.max(prev.percent, serverPct) : serverPct;
          return {
            active: true,
            ready: false,
            folderName: activeProcessingApp.folder_name || prev?.folderName,
            isError: false,
            percent: Math.min(96, nextPct),
            stageText: activeProcessingApp.stage || 'File submitted, waiting for preview...',
            applicantName: activeProcessingApp.applicant_name || activeProcessingApp.folder_name,
            startedAt: prev?.startedAt || Date.now(),
          };
        });
      } else if (matchingErrorApp && submissionTracker?.active && !submissionTracker.ready) {
        let errTitle = 'Portal Error';
        if (matchingErrorApp.error_type === 'PORTAL_DOWNTIME') {
          errTitle = 'Portal Facing Downtime / Maintenance';
        } else if (matchingErrorApp.error_type === 'PORTAL_QUOTA_EXHAUSTED') {
          errTitle = '50 Application Limit Reached';
        } else if (matchingErrorApp.error_type === 'INVALID_CREDENTIALS') {
          errTitle = 'Portal Login Error: Incorrect Credentials';
        } else if (matchingErrorApp.error_type === 'ACCOUNT_LOCKED') {
          errTitle = 'Portal Account Locked';
        } else if (matchingErrorApp.error_type === 'PORTAL_LOGIN_ERROR' || matchingErrorApp.error_type === 'AUTH_FAILED') {
          errTitle = 'Portal Authentication Error';
        }

        setSubmissionTracker(prev => ({
          active: true,
          ready: false,
          folderName: matchingErrorApp.folder_name || prev?.folderName,
          isError: true,
          errorType: matchingErrorApp.error_type,
          percent: 100,
          stageText: matchingErrorApp.error_message || matchingErrorApp.stage || errTitle,
          applicantName: matchingErrorApp.applicant_name || matchingErrorApp.folder_name,
          startedAt: prev?.startedAt || Date.now(),
        }));
      } else if (matchingNeedsCorrection) {
        setSubmissionTracker(null);
      } else if (matchingPreview) {
        setSubmissionTracker(prev => {
          if (prev && prev.active) {
            return {
              active: true,
              ready: true,
              folderName: matchingPreview.folder_name,
              percent: 100,
              stageText: 'Preview Ready!',
              applicantName: matchingPreview.applicant_name || prev.applicantName,
              startedAt: prev.startedAt,
            };
          }
          return prev;
        });
      } else {
        setSubmissionTracker(prev => {
          if (prev && Date.now() - prev.startedAt > 10000 && !prev.folderName) {
            return null;
          }
          return prev;
        });
      }
    } catch (err) {
      console.warn('Error fetching automation data:', err);
    }
  };

  // Manual refresh spinner state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refreshAllData();
      automationApi.resolveGateway(false).catch(() => {});
    } catch (err) {
      console.warn('Manual refresh error:', err);
      try {
        await automationApi.resolveGateway(true);
        await refreshAllData();
      } catch (e) {
        console.warn('Fallback gateway resolution failed:', e);
      }
    } finally {
      setTimeout(() => {
        setIsManualRefreshing(false);
      }, 600);
    }
  };

  // Smart Voice Agent States
  const [recordingFolder, setRecordingFolder] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [voiceProcessingFolder, setVoiceProcessingFolder] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState<Record<string, { percent: number; stage: string }>>({});
  const [voiceResults, setVoiceResults] = useState<Record<string, { transcription: string; summary: string; success: boolean }>>({});
  const [voiceTextInputs, setVoiceTextInputs] = useState<Record<string, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const startVoiceRecording = async (folderName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const elapsed = Date.now() - recordingStartTimeRef.current;
        if (elapsed < 500 || audioChunksRef.current.length === 0) {
          console.warn('Recording discarded: shorter than 500ms or empty');
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          console.warn('Recording discarded: blob size too small');
          return;
        }
        await handleSendVoiceAction(folderName, blob);
      };

      recordingStartTimeRef.current = Date.now();
      recorder.start(250);
      setRecordingFolder(folderName);
      setRecordingDuration(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setVoiceResults((prev) => ({
        ...prev,
        [folderName]: {
          transcription: '',
          summary: 'Microphone access is unavailable or denied. Please enable microphone permissions or type your instructions in the input box below.',
          success: false,
        },
      }));
    }
  };

  const stopVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingFolder(null);
  };

  const handleSendVoiceAction = async (folderName: string, audioBlob?: Blob | null, textPrompt?: string) => {
    let progressTimer: any = null;
    try {
      setVoiceProcessingFolder(folderName);
      const text = textPrompt !== undefined ? textPrompt : (voiceTextInputs[folderName] || '');
      const lowText = text.toLowerCase();
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();

      const detectedActionLabel = lowText.includes('sign') || lowText.includes('firma')
        ? 'Re-cropping signature & isolating strokes on white background...'
        : lowText.includes('photo') || lowText.includes('shoulder') || lowText.includes('face') || lowText.includes('foto')
        ? 'Re-cropping photograph from source document...'
        : audioBlob
        ? 'Decoding voice note & applying document/field updates...'
        : 'Applying requested updates to application fields & documents...';

      setVoiceProgress((prev) => ({
        ...prev,
        [folderName]: { percent: 15, stage: 'Analyzing update request...' },
      }));

      let currentTick = 0;
      progressTimer = setInterval(() => {
        currentTick += 1;
        setVoiceProgress((prev) => {
          const cur = prev[folderName]?.percent || 15;
          if (currentTick === 1) {
            return { ...prev, [folderName]: { percent: 42, stage: detectedActionLabel } };
          }
          if (currentTick === 2) {
            return { ...prev, [folderName]: { percent: 68, stage: 'Regenerating official PDF previews...' } };
          }
          if (currentTick >= 3) {
            const nextPct = Math.min(92, cur + 6);
            return { ...prev, [folderName]: { percent: nextPct, stage: 'Finalizing updated previews...' } };
          }
          return prev;
        });
      }, 900);

      const res = await automationApi.sendVoiceInstruction(email, folderName, audioBlob, text);

      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }

      setVoiceProgress((prev) => ({
        ...prev,
        [folderName]: { percent: 100, stage: 'Update complete! Refreshing previews...' },
      }));

      // Immediately update preview URLs with fresh cache-busters
      setPreviews((prev) =>
        prev.map((p) =>
          p.folder_name === folderName
            ? {
                ...p,
                passport_preview_url: res.passport_preview_url || p.passport_preview_url,
                declaration_preview_url: res.declaration_preview_url || p.declaration_preview_url,
                photo_preview_url: res.photo_preview_url || p.photo_preview_url,
                signature_preview_url: res.signature_preview_url || p.signature_preview_url,
              }
            : p
        )
      );

      setVoiceResults((prev) => ({
        ...prev,
        [folderName]: {
          transcription: res.transcription || 'Instruction processed',
          summary: res.summary || 'Draft preview updated with your instructions.',
          success: true,
        },
      }));

      // Clear text input
      setVoiceTextInputs((prev) => ({ ...prev, [folderName]: '' }));

      // Automatically refresh all applications and previews
      await refreshAllData();
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (err: any) {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      const msg = sanitizeErrorMessage(err);
      setVoiceResults((prev) => ({
        ...prev,
        [folderName]: {
          transcription: '',
          summary: `Smart Voice Agent could not apply changes: ${msg}`,
          success: false,
        },
      }));
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      setVoiceProcessingFolder(null);
      setVoiceProgress((prev) => {
        const copy = { ...prev };
        delete copy[folderName];
        return copy;
      });
    }
  };

  useEffect(() => {
    if (!submissionTracker?.active || submissionTracker.ready) return;
    const progInterval = setInterval(() => {
      setSubmissionTracker(prev => {
        if (!prev || !prev.active || prev.ready) return prev;
        if (prev.percent >= 95) return prev;
        const step = prev.percent < 45 ? 3 : prev.percent < 75 ? 2 : 1;
        return {
          ...prev,
          percent: Math.min(95, prev.percent + step),
        };
      });
    }, 1200);
    return () => clearInterval(progInterval);
  }, [submissionTracker?.active, submissionTracker?.ready]);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(() => refreshAllData(), 2500);
    return () => clearInterval(interval);
  }, [portalEmail, activeClientEmail]);

  const correctionApp = applications.find(
    app => (app.status === 'NEEDS_CORRECTION' || (app.status === 'ERROR' && (app.error_type === 'PORTAL_FORM_ERROR' || app.error_type === 'STAGE1_7_FAILED'))) && app.folder_name !== dismissedCorrectionFolder
  );

  const formatMissingFieldLabel = (fieldName: string): string => {
    const clean = (fieldName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const friendlyMap: Record<string, string> = {
      applicantpreviouspassportfilenumber: 'File number',
      previouspassportfilenumber: 'File number',
      filenumber: 'File number',
      fileno: 'File number',
      applicantpreviouspassportno: 'Current passport number',
      currentpassportnumber: 'Current passport number',
      passportnumber: 'Current passport number',
      applicantpreviouspassportissuedate: 'Date of issue',
      applicantpreviousdateofissue: 'Date of issue',
      applicantpreviouspassportexpirydate: 'Date of expiry',
      applicantpreviousdateofexpiry: 'Date of expiry',
      applicantpreviouspassportissueplace: 'Place of issue',
      applicantpreviousplaceofissue: 'Place of issue',
      presentaddresshnostreetname: 'House No. and Street Name',
      presentaddressvillagetowncityindia: 'Village or Town or City',
      presentaddresspolicestation: 'Police Station',
      presentaddresspin: 'PIN Code',
      presentaddressstate: 'State',
      presentaddressdistrict: 'District',
      presentaddressemail: 'Email id',
      presentaddressmobileno: 'Indian mobile number',
      permanentaddresshnostreetname: 'Italian address line 1',
      permanentaddressvillagetowncity: 'Italian address line 2',
      permanentaddressmobileno: 'Italian mobile number',
    };
    return friendlyMap[clean] || fieldName;
  };

  const classifyMissingField = (fieldName: string) => {
    const lower = formatMissingFieldLabel(fieldName).toLowerCase();
    if (
      lower.includes('passport') ||
      lower.includes('issue') ||
      lower.includes('expiry') ||
      lower.includes('file')
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
        ...ed,
        "Educational qualification": ed["Educational qualification"] || "10TH PASS AND ABOVE",
        "Employment type": ed["Employment type"] || "PRIVATE",
        "PIN Code": ed["PIN Code"] || "",
        "State": ed["State"] || "",
        "District": ed["District"] || "",
        "House No. and Street Name": ed["House No. and Street Name"] || ed["address_line1"] || "VPO",
        "Village or Town or City": ed["Village or Town or City"] || ed["address_line2"] || "",
        "Indian mobile number": ed["Indian mobile number"] || "",
        "Email id": ed["Email id"] || ed["presentAddressEmail"] || ed["Email"] || "",
        "Italian address line 1": ed["Italian address line 1"] || "",
        "Italian address line 2": ed["Italian address line 2"] || "",
        "Italian mobile number": ed["Italian mobile number"] || "",
        "Marital status": ed["Marital status"] || "SINGLE",
        "Spouse name": ed["Spouse name"] || ed["Spouse given name"] || "",
        "Given NAME": ed["Given NAME"] || ed["given_name"] || "",
        "SURNAME": ed["SURNAME"] || ed["surname"] || "",
        "Date of birth": ed["Date of birth"] || ed["dob"] || "",
        "Place of birth": ed["Place of birth"] || ed["pob"] || "",
        "GENDER": ed["GENDER"] || ed["gender"] || "MALE",
        "Father's name": ed["Father's name"] || ed["father"] || "",
        "Mother's name": ed["Mother's name"] || ed["mother"] || "",
        "Police Station": ed["Police Station"] || ed["police"] || "",
        "Current passport number": ed["Current passport number"] || ed["Passport number"] || ed["passport_number"] || ed["old_passport_number"] || "",
        "Passport number": ed["Current passport number"] || ed["Passport number"] || ed["passport_number"] || ed["old_passport_number"] || "",
        "Date of issue": ed["Date of issue"] || ed["issue_date"] || ed["date_of_issue"] || "",
        "Date of expiry": ed["Date of expiry"] || ed["expiry_date"] || ed["date_of_expiry"] || "",
        "Place of issue": ed["Place of issue"] || ed["issue_place"] || ed["place_of_issue"] || "",
        "File number": ed["File number"] || ed["File Number"] || ed["file_number"] || ed["applicantPreviousPassportFileNumber"] || "",
      });
    }
  }, [correctionApp?.folder_name, correctionApp?.updated_at]);

  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit per file

  const updateSlotFile = (slot: 'photo' | 'sign' | 'passport' | 'identity' | 'residence' | 'info', file: File | null) => {
    if (file && submissionTracker?.ready) {
      setSubmissionTracker(null);
      setUploadMessage(null);
    }
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setUploadMessage({
        text: `File "${file.name}" exceeds the 10 MB maximum size limit.`,
        type: 'error',
      });
      if (slot === 'photo' && photoInputRef.current) photoInputRef.current.value = '';
      if (slot === 'sign' && signInputRef.current) signInputRef.current.value = '';
      if (slot === 'passport' && passportInputRef.current) passportInputRef.current.value = '';
      if (slot === 'identity' && identityInputRef.current) identityInputRef.current.value = '';
      if (slot === 'residence' && residenceInputRef.current) residenceInputRef.current.value = '';
      if (slot === 'info' && infoInputRef.current) infoInputRef.current.value = '';
      return;
    }
    filesStateRef.current[slot] = file;
    if (slot === 'photo') {
      setPhotoFile(file);
      if (!file && photoInputRef.current) photoInputRef.current.value = '';
    } else if (slot === 'sign') {
      setSignFile(file);
      if (!file && signInputRef.current) signInputRef.current.value = '';
    } else if (slot === 'passport') {
      setPassportFile(file);
      if (!file && passportInputRef.current) passportInputRef.current.value = '';
    } else if (slot === 'identity') {
      setIdentityFile(file);
      if (!file && identityInputRef.current) identityInputRef.current.value = '';
    } else if (slot === 'residence') {
      setResidenceFile(file);
      if (!file && residenceInputRef.current) residenceInputRef.current.value = '';
    } else if (slot === 'info') {
      setInfoFile(file);
      if (!file && infoInputRef.current) infoInputRef.current.value = '';
    }
  };

  const autoCategorizeFiles = (incoming: File[]) => {
    if (!incoming || incoming.length === 0) return;
    if (submissionTracker?.ready) {
      setSubmissionTracker(null);
      setUploadMessage(null);
    }

    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setUploadMessage({
        text: `File "${oversized[0].name}" exceeds the 10 MB maximum size limit.`,
        type: 'error',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    const validIncoming = incoming.filter(f => f.size <= MAX_FILE_SIZE_BYTES);
    if (validIncoming.length === 0) return;

    const current = filesStateRef.current;
    let p = current.photo;
    let s = current.sign;
    let pass = current.passport;
    let ident = current.identity;
    let res = current.residence;
    let inf = current.info;
    const extras: File[] = [];

    for (const f of validIncoming) {
      const lower = f.name.toLowerCase();
      if (!p && (lower.includes('photo') || lower.includes('fototessera') || lower.includes('picture') || lower.includes('portrait'))) {
        p = f;
      } else if (!s && (lower.includes('sign') || lower.includes('signature') || lower.includes('firma'))) {
        s = f;
      } else if (!pass && (lower.includes('pass') || lower.includes('passport') || lower.includes('passaporto'))) {
        pass = f;
      } else if (!ident && (
        lower.includes('permesso') || 
        lower.includes('pds') || 
        lower.includes('soggiorno') || 
        lower.includes('cie') || 
        lower.includes('carta') || 
        lower.includes('identity') || 
        lower.includes('identita')
      )) {
        ident = f;
      } else if (!res && (
        lower.includes('residen') || 
        lower.includes('certificato') || 
        lower.includes('ospiti') || 
        lower.includes('ospitalita') || 
        lower.includes('fabbricato') || 
        lower.includes('cessione') || 
        lower.includes('affitto') || 
        lower.includes('locazione') || 
        lower.includes('bolletta') ||
        lower.includes('contratto') ||
        lower.includes('anagrafe') ||
        lower.includes('famiglia')
      )) {
        res = f;
      } else if (!inf && (
        lower.includes('info') || 
        lower.includes('detail') || 
        lower.includes('dettagli') || 
        lower.endsWith('.docx') || 
        lower.endsWith('.doc') || 
        lower.includes('support') || 
        lower.includes('annexure') || 
        lower.includes('necessity') ||
        lower.endsWith('.txt')
      )) {
        inf = f;
      } else {
        if (activeServiceType === 'fresh') {
          if (!ident && lower.endsWith('.pdf')) {
            ident = f;
          } else if (!res && lower.endsWith('.pdf')) {
            res = f;
          } else if (!p && lower.match(/\.(jpg|jpeg|png|webp)$/)) {
            p = f;
          } else if (!s && lower.match(/\.(jpg|jpeg|png)$/)) {
            s = f;
          } else if (!inf) {
            inf = f;
          } else if (!pass && lower.endsWith('.pdf')) {
            pass = f;
          } else {
            extras.push(f);
          }
        } else {
          if (!pass && lower.endsWith('.pdf')) {
            pass = f;
          } else if (!p && lower.match(/\.(jpg|jpeg|png|webp)$/)) {
            p = f;
          } else if (!ident && lower.endsWith('.pdf')) {
            ident = f;
          } else if (!res && lower.endsWith('.pdf')) {
            res = f;
          } else if (!s && lower.match(/\.(jpg|jpeg|png)$/)) {
            s = f;
          } else if (!inf) {
            inf = f;
          } else {
            extras.push(f);
          }
        }
      }
    }

    if (p !== current.photo) {
      filesStateRef.current.photo = p;
      setPhotoFile(p);
    }
    if (s !== current.sign) {
      filesStateRef.current.sign = s;
      setSignFile(s);
    }
    if (pass !== current.passport) {
      filesStateRef.current.passport = pass;
      setPassportFile(pass);
    }
    if (ident !== current.identity) {
      filesStateRef.current.identity = ident;
      setIdentityFile(ident);
    }
    if (res !== current.residence) {
      filesStateRef.current.residence = res;
      setResidenceFile(res);
    }
    if (inf !== current.info) {
      filesStateRef.current.info = inf;
      setInfoFile(inf);
    }

    if (extras.length > 0) {
      setSelectedFiles(prev => {
        const existingKeys = new Set(prev.map(item => `${item.name}_${item.size}`));
        const toAdd = extras.filter(item => !existingKeys.has(`${item.name}_${item.size}`));
        return [...prev, ...toAdd];
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (Date.now() - lastDropTimeRef.current < 400) return;
    lastDropTimeRef.current = Date.now();
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

  const clearDocumentSlots = () => {
    filesStateRef.current = {
      photo: null,
      sign: null,
      passport: null,
      identity: null,
      residence: null,
      info: null,
      selected: [],
    };
    setPhotoFile(null);
    setSignFile(null);
    setPassportFile(null);
    setIdentityFile(null);
    setResidenceFile(null);
    setInfoFile(null);
    setSelectedFiles([]);
    setInAppInfoData({});
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (signInputRef.current) signInputRef.current.value = '';
    if (passportInputRef.current) passportInputRef.current.value = '';
    if (identityInputRef.current) identityInputRef.current.value = '';
    if (residenceInputRef.current) residenceInputRef.current.value = '';
    if (infoInputRef.current) infoInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSubmissionTracker(null);
    setUploadMessage(null);
  };

  const handleEmailBlur = () => {
    const trimmed = portalEmail.trim().toUpperCase();
    if (trimmed !== activeClientEmail) {
      clearDocumentSlots();
      setActiveClientEmail(trimmed);
      if (trimmed) {
        localStorage.setItem('fs_active_client_email', trimmed);
      } else {
        localStorage.removeItem('fs_active_client_email');
      }
      try {
        window.dispatchEvent(new Event('fs_active_email_changed'));
      } catch (_) {}
      refreshAllData(trimmed.toLowerCase());
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
          const pos = (event.payload as any).position;
          if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            const scale = window.devicePixelRatio || 1;
            const el = document.elementFromPoint(pos.x / scale, pos.y / scale) || document.elementFromPoint(pos.x, pos.y);
            const targetSlot = el?.closest('[data-drop-slot]')?.getAttribute('data-drop-slot');
            if (targetSlot) {
              dragSlotRef.current = targetSlot;
              setDragSlot(targetSlot);
            }
          }
        } else if (event.payload.type === 'leave') {
          setIsDragActive(false);
          dragSlotRef.current = null;
          setDragSlot(null);
        } else if (event.payload.type === 'drop') {
          setIsDragActive(false);
          if (Date.now() - lastDropTimeRef.current < 400) {
            dragSlotRef.current = null;
            setDragSlot(null);
            return;
          }
          lastDropTimeRef.current = Date.now();
          let targetSlot = dragSlotRef.current;
          const dropPos = (event.payload as any).position;
          if (dropPos && typeof dropPos.x === 'number' && typeof dropPos.y === 'number') {
            const scale = window.devicePixelRatio || 1;
            const el = document.elementFromPoint(dropPos.x / scale, dropPos.y / scale) || document.elementFromPoint(dropPos.x, dropPos.y);
            const found = el?.closest('[data-drop-slot]')?.getAttribute('data-drop-slot');
            if (found) targetSlot = found;
          }
          dragSlotRef.current = null;
          setDragSlot(null);

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
                  : ext.match(/\.doc$/)
                  ? 'application/msword'
                  : 'application/octet-stream';
                loadedFiles.push(new File([bytes], info.name, { type: mime }));
              } catch (readErr: any) {
                const errStr = String(readErr || '');
                if (errStr.includes('10 MB')) {
                  setUploadMessage({
                    text: errStr,
                    type: 'error',
                  });
                } else {
                  console.warn('Native drag drop read failed for:', p, readErr);
                }
              }
            }
            if (loadedFiles.length > 0) {
              if (loadedFiles.length > 1) {
                autoCategorizeFiles(loadedFiles);
              } else if (targetSlot && ['photo', 'sign', 'passport', 'identity', 'residence', 'info'].includes(targetSlot)) {
                updateSlotFile(targetSlot as any, loadedFiles[0]);
              } else {
                autoCategorizeFiles(loadedFiles);
              }
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
      if (Date.now() - lastDropTimeRef.current < 400) return;
      lastDropTimeRef.current = Date.now();
      const targetSlot = dragSlotRef.current;
      dragSlotRef.current = null;
      setDragSlot(null);

      if (currentSection === 'form' && !correctionApp && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 1) {
          autoCategorizeFiles(droppedFiles);
        } else if (targetSlot && ['photo', 'sign', 'passport', 'identity', 'residence', 'info'].includes(targetSlot)) {
          updateSlotFile(targetSlot as any, droppedFiles[0]);
        } else {
          autoCategorizeFiles(droppedFiles);
        }
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

    if (quota && quota.is_exhausted && quota.portal_username && targetClientEmail.toLowerCase() === quota.portal_username.toLowerCase()) {
      setUploadMessage({
        text: `Portal account ${targetClientEmail} has reached the 50 application limit (${quota.used}/50). Please enter a new portal Email ID.`,
        type: 'error'
      });
      return;
    }

    const allCandidateFiles = [
      photoFile,
      signFile,
      passportFile,
      identityFile,
      residenceFile,
      infoFile,
      ...selectedFiles,
    ].filter((f): f is File => Boolean(f));

    const oversized = allCandidateFiles.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setUploadMessage({
        text: `File "${oversized.name}" exceeds the 10 MB maximum size limit.`,
        type: 'error',
      });
      return;
    }

    if (activeServiceType === 'reissue' && !passportFile) {
      setUploadMessage({
        text: 'Please upload the applicant’s current Passport copy for Reissue application.',
        type: 'error',
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage(null);
      setSubmissionTracker({
        active: true,
        ready: false,
        percent: 10,
        stageText: 'Uploading documents to server...',
        startedAt: Date.now(),
      });
      localStorage.setItem('fs_active_client_email', targetClientEmail);
      localStorage.setItem('fs_portal_password', cleanPassword);
      localStorage.setItem('fs_declaration_place', declarationPlace);
      setActiveClientEmail(targetClientEmail);

      const uploadRes = await automationApi.uploadApplication(
        targetClientEmail,
        targetClientEmail,
        cleanPassword,
        {
          photo: photoFile,
          signature: signFile,
          passport: passportFile,
          identity: identityFile,
          residence: residenceFile,
          supporting: infoFile,
          files: selectedFiles,
        },
        user?.email,
        declarationPlace,
        activeServiceType,
        Object.keys(inAppInfoData).length > 0 ? JSON.stringify(inAppInfoData) : undefined
      );

      const uploadedFolder = uploadRes?.folder_name;

      setSubmissionTracker({
        active: true,
        ready: false,
        folderName: uploadedFolder,
        percent: 20,
        stageText: 'File submitted, waiting for preview...',
        startedAt: Date.now(),
      });
      setUploadMessage({
        text: 'File submitted, waiting for preview...',
        type: 'success',
      });
      setPhotoFile(null);
      setSignFile(null);
      setPassportFile(null);
      setIdentityFile(null);
      setResidenceFile(null);
      setInfoFile(null);
      setSelectedFiles([]);
      setInAppInfoData({});
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (signInputRef.current) signInputRef.current.value = '';
      if (passportInputRef.current) passportInputRef.current.value = '';
      if (identityInputRef.current) identityInputRef.current.value = '';
      if (residenceInputRef.current) residenceInputRef.current.value = '';
      if (infoInputRef.current) infoInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshAllData(targetClientEmail.toLowerCase());
    } catch (err: any) {
      const friendlyMsg = sanitizeErrorMessage(err);
      setSubmissionTracker(null);
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
      }
      delete finalData["presentAddressEmail"];
      delete finalData["mrz_line1"];
      delete finalData["mrz_line2"];

      if (correctionFormData["Current passport number"] !== undefined || correctionFormData["Passport number"] !== undefined || correctionFormData["passport_number"] !== undefined) {
        const pno = (correctionFormData["Current passport number"] || correctionFormData["Passport number"] || correctionFormData["passport_number"] || "").trim().toUpperCase();
        if (pno) {
          finalData["Current passport number"] = pno;
          finalData["Passport number"] = pno;
          finalData["passport_number"] = pno;
        }
      }
      if (correctionFormData["File number"] !== undefined || correctionFormData["file_number"] !== undefined || correctionFormData["applicantPreviousPassportFileNumber"] !== undefined) {
        const fno = (correctionFormData["File number"] || correctionFormData["file_number"] || correctionFormData["applicantPreviousPassportFileNumber"] || "").trim().toUpperCase();
        if (fno) {
          finalData["File number"] = fno;
          finalData["file_number"] = fno;
          delete finalData["applicantPreviousPassportFileNumber"];
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
        (queryAccountEmail || activeClientEmail || '').trim().toLowerCase(),
        correctionApp.folder_name,
        finalData
      );

      setSubmissionTracker({
        active: true,
        ready: false,
        percent: 60,
        stageText: 'Details saved! Resuming portal form filling...',
        applicantName: correctionApp.applicant_name || correctionApp.folder_name,
        startedAt: Date.now(),
      });
      setUploadMessage({
        text: 'File submitted, waiting for preview...',
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
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
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
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
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
    if (voiceProcessingFolder) return;
    try {
      setSubmittingArn(arn);
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
      await automationApi.confirmSubmission(email, folderName, arn);
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

  const portalErrorApp = applications.find(
    a => a.status === 'ERROR' &&
    a.error_type !== 'PORTAL_FORM_ERROR' &&
    a.error_type !== 'STAGE1_7_FAILED' &&
    a.folder_name !== dismissedCorrectionFolder
  );

  const getPortalErrorDetails = (app: ApplicationItem) => {
    const errType = app.error_type;
    const rawMsg = app.error_message || app.stage || 'An error occurred connecting to the passport portal.';
    if (errType === 'PORTAL_DOWNTIME') {
      return {
        title: 'PASSPORT SEVA PORTAL FACING DOWNTIME / MAINTENANCE',
        desc: `The official Passport Seva portal is temporarily down or unreachable for applicant ${app.applicant_name || app.folder_name} (${rawMsg}). Your files are completely safe. Please wait a few moments until portal services resume normal operation.`,
        badge: 'Portal Downtime',
        badgeColor: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        borderLeft: '#f59e0b',
        titleColor: '#92400e',
        descColor: '#b45309'
      };
    }
    if (errType === 'PORTAL_QUOTA_EXHAUSTED') {
      return {
        title: '50 USER APPLICATION LIMIT EXHAUSTED',
        desc: `This portal login account has reached the maximum ceiling of 50 applications allowed by Passport Seva (${rawMsg}). You cannot submit more applications on this ID. Please use a fresh portal email ID.`,
        badge: 'Quota Exhausted',
        badgeColor: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        borderLeft: '#ef4444',
        titleColor: '#991b1b',
        descColor: '#b91c1c'
      };
    }
    if (errType === 'INVALID_CREDENTIALS') {
      return {
        title: 'PORTAL LOGIN FAILED: INCORRECT USER ID OR PASSWORD',
        desc: `The passport portal rejected credentials for applicant ${app.applicant_name || app.folder_name} (${rawMsg}). Please verify the Email ID and Password below and submit again.`,
        badge: 'Invalid Credentials',
        badgeColor: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        borderLeft: '#ef4444',
        titleColor: '#991b1b',
        descColor: '#b91c1c'
      };
    }
    if (errType === 'ACCOUNT_LOCKED') {
      return {
        title: 'PORTAL ACCOUNT LOCKED OR DEACTIVATED',
        desc: `The portal account for applicant ${app.applicant_name || app.folder_name} is locked or inactive on Passport Seva. Please unlock it on the official portal website.`,
        badge: 'Account Locked',
        badgeColor: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        borderLeft: '#ef4444',
        titleColor: '#991b1b',
        descColor: '#b91c1c'
      };
    }
    return {
      title: 'PORTAL AUTHENTICATION / CONNECTION ERROR',
      desc: `Portal error for applicant ${app.applicant_name || app.folder_name}: ${rawMsg}. Please check credentials or retry after a moment.`,
      badge: 'Portal Error',
      badgeColor: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      borderLeft: '#ef4444',
      titleColor: '#991b1b',
      descColor: '#b91c1c'
    };
  };

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
    house: ['housenoandstreetname', 'houseno', 'streetname', 'house', 'housenumber', 'street', 'presentaddresshnostreetname'],
    village: ['villageortownorcity', 'village', 'city', 'town', 'villagetowncity', 'presentaddressvillagetowncityindia'],
    state: ['state', 'stateut', 'addrstate', 'presentaddressstate'],
    district: ['district', 'addrdist', 'presentaddressdistrict'],
    pin: ['pincode', 'pin', 'postalcode', 'presentaddresspin'],
    police: ['policestation', 'police', 'presentaddresspolicestation'],
    indian_mobile: ['indianmobilenumber', 'indianmobile', 'mobile', 'mobilenumber', 'presentaddressmobileno'],
    email: ['emailid', 'email', 'presentaddressemail', 'mail', 'emailaddress'],
    italian_l1: ['italianaddressline1', 'addr_l1', 'addrl1', 'italianaddress1', 'italianaddress', 'permanentaddresshnostreetname'],
    italian_l2: ['italianaddressline2', 'addr_l2', 'addrl2', 'italianaddress2', 'permanentaddressvillagetowncity'],
    italian_mobile: ['italianmobilenumber', 'italianmobile', 'em_mobile', 'emmobile', 'overseasmobile', 'permanentaddressmobileno'],
    passport_number: ['currentpassportnumber', 'passportnumber', 'passportno', 'oldpassportnumber', 'oldpassportno', 'applicantpreviouspassportno'],
    file_number: ['filenumber', 'fileno', 'applicantpreviouspassportfilenumber', 'previouspassportfilenumber'],
    issue_date: ['dateofissue', 'issuedate', 'doi', 'passportissuedate', 'dateofissuance', 'applicantpreviouspassportissuedate', 'applicantpreviousdateofissue'],
    expiry_date: ['dateofexpiry', 'expirydate', 'doe', 'passportexpirydate', 'dateofexpiration', 'applicantpreviouspassportexpirydate', 'applicantpreviousdateofexpiry'],
    issue_place: ['placeofissue', 'issueplace', 'passportplaceofissue', 'applicantpreviouspassportissueplace', 'applicantpreviousplaceofissue'],
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
    isFieldMissing(["Current passport number", "Passport number", "passport_number", "passportno", "old_passport_number", "applicantPreviousPassportNo"]) ||
    isFieldMissing(["File number", "file_number", "fileno", "applicantPreviousPassportFileNumber"]) ||
    isFieldMissing(["Date of issue", "issue_date", "date_of_issue", "applicantPreviousPassportIssueDate"]) ||
    isFieldMissing(["Date of expiry", "expiry_date", "date_of_expiry", "applicantPreviousPassportExpiryDate"]) ||
    isFieldMissing(["Place of issue", "issue_place", "place_of_issue", "applicantPreviousPassportIssuePlace"]);

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
      }
      if (isFieldMissing(["Italian address line 1", "addr_l1", "italian address"])) updated["Italian address line 1"] = "";
      if (isFieldMissing(["Italian address line 2", "addr_l2"])) updated["Italian address line 2"] = "";
      if (isFieldMissing(["Italian mobile number", "em_mobile", "italian mobile"])) updated["Italian mobile number"] = "";
      if (isFieldMissing(["Current passport number", "Passport number", "passport_number", "passportno", "old_passport_number", "applicantPreviousPassportNo"])) {
        updated["Current passport number"] = "";
        updated["Passport number"] = "";
        updated["passport_number"] = "";
      }
      if (isFieldMissing(["File number", "file_number", "fileno", "applicantPreviousPassportFileNumber"])) {
        updated["File number"] = "";
        updated["file_number"] = "";
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


      {currentSection === 'form' && (
        <div className="fresh-reissue-content">

          {portalErrorApp && (() => {
            const errDet = getPortalErrorDetails(portalErrorApp);
            return (
              <div 
                className="wrong-creds-banner" 
                style={{ 
                  background: errDet.bg, 
                  borderColor: errDet.border, 
                  borderLeftColor: errDet.borderLeft 
                }}
              >
                <div className="wrong-creds-left">
                  <AlertCircle className="wrong-creds-icon" style={{ color: errDet.badgeColor }} />
                </div>
                <div className="wrong-creds-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="wrong-creds-title" style={{ color: errDet.titleColor }}>{errDet.title}</span>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: errDet.badgeColor, 
                        background: 'rgba(0,0,0,0.06)', 
                        padding: '2px 8px', 
                        borderRadius: '999px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {errDet.badge}
                    </span>
                  </div>
                  <span className="wrong-creds-desc" style={{ color: errDet.descColor }}>
                    {errDet.desc}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignSelf: 'center' }}>
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isManualRefreshing}
                    className="dismiss-banner-btn"
                    style={{ background: '#ffffff', color: '#374151', borderColor: '#d1d5db' }}
                    title="Check portal status and retry"
                  >
                    {isManualRefreshing ? 'Checking...' : 'Check Status'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissCorrection(portalErrorApp.folder_name)}
                    disabled={isDismissing}
                    className="dismiss-banner-btn"
                    title="Dismiss and delete this application from database"
                  >
                    {isDismissing ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              </div>
            );
          })()}

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
                            {formatMissingFieldLabel(f)}
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
                                "Email id": val
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
                      {isFieldMissing(["Current passport number", "Passport number", "passport_number", "passportno", "old_passport_number", "applicantPreviousPassportNo"]) && (
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
                            value={correctionFormData["Current passport number"] || correctionFormData["Passport number"] || correctionFormData["passport_number"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().replace(/\s/g, '');
                              setCorrectionFormData(prev => ({ ...prev, "Current passport number": val, "Passport number": val, "passport_number": val }));
                            }}
                            required
                          />
                        </div>
                      )}

                      {isFieldMissing(["File number", "file_number", "fileno", "applicantPreviousPassportFileNumber"]) && (
                        <div className="input-group">
                          <label htmlFor="corrFileNumber" className="input-label">
                            File Number <span className="required-star">*</span>
                          </label>
                          <input
                            id="corrFileNumber"
                            type="text"
                            maxLength={20}
                            className="form-input"
                            placeholder="e.g. ITAR00444516"
                            value={correctionFormData["File number"] || correctionFormData["file_number"] || correctionFormData["applicantPreviousPassportFileNumber"] || ""}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                              setCorrectionFormData(prev => ({ ...prev, "File number": val, "file_number": val }));
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
                            {formatMissingFieldLabel(fieldKey)} <span className="required-star">*</span>
                          </label>
                          <input
                            id={`corr_${fieldKey}`}
                            type="text"
                            className="form-input"
                            placeholder={`Enter ${formatMissingFieldLabel(fieldKey)}`}
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

              {submissionTracker?.active ? (
                <div
                  className="voice-progress-container"
                  style={{
                    marginBottom: '20px',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    border: submissionTracker.isError
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : submissionTracker.ready
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid rgba(37, 99, 235, 0.28)',
                    background: submissionTracker.isError
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.04) 100%)'
                      : submissionTracker.ready
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
                  }}
                >
                  <div className="voice-progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px' }}>
                    <div className="voice-progress-status" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '14px', color: submissionTracker.isError ? '#dc2626' : submissionTracker.ready ? '#059669' : '#1e40af' }}>
                      {submissionTracker.isError ? (
                        <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                      ) : submissionTracker.ready ? (
                        <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }} />
                      ) : (
                        <RefreshCw style={{ width: '16px', height: '16px', color: '#2563eb', flexShrink: 0 }} className="animate-spin" />
                      )}
                      <div>
                        <div>
                          {submissionTracker.isError
                            ? (submissionTracker.errorType === 'PORTAL_DOWNTIME'
                                ? `Portal Facing Downtime${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                                : submissionTracker.errorType === 'PORTAL_QUOTA_EXHAUSTED'
                                ? `50 Application Limit Reached${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                                : submissionTracker.errorType === 'INVALID_CREDENTIALS'
                                ? `Portal Login Error: Incorrect Credentials${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                                : submissionTracker.errorType === 'ACCOUNT_LOCKED'
                                ? `Portal Account Locked${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                                : `Portal Authentication Error${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`)
                            : submissionTracker.ready
                            ? `Preview Ready!${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                            : `File submitted, waiting for preview...${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`}
                        </div>
                        {!submissionTracker.ready && submissionTracker.stageText && (
                          <div style={{ fontSize: '12px', fontWeight: 500, color: submissionTracker.isError ? '#b91c1c' : '#475569', marginTop: '2px' }}>
                            {submissionTracker.stageText}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className="voice-progress-percent"
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color: submissionTracker.isError ? '#dc2626' : submissionTracker.ready ? '#059669' : '#2563eb',
                          background: submissionTracker.isError ? 'rgba(239, 68, 68, 0.15)' : submissionTracker.ready ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.12)',
                          padding: '3px 10px',
                          borderRadius: '999px',
                        }}
                      >
                        {submissionTracker.isError ? 'Error' : submissionTracker.ready ? '100%' : `${submissionTracker.percent}%`}
                      </span>
                      {submissionTracker.ready && (
                        <>
                          <button
                            type="button"
                            onClick={() => onSectionChange('preview')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#ffffff',
                              background: '#10b981',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                            <span>Open Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionTracker(null);
                              setUploadMessage(null);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#065f46',
                              background: '#d1fae5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Plus style={{ width: '14px', height: '14px' }} />
                            <span>Start New Application</span>
                          </button>
                        </>
                      )}
                      {submissionTracker.isError && (
                        <button
                          type="button"
                          onClick={() => setSubmissionTracker(null)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#991b1b',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <X style={{ width: '14px', height: '14px' }} />
                          <span>Dismiss</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className="voice-progress-track"
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '999px',
                      background: 'rgba(148, 163, 184, 0.25)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="voice-progress-fill"
                      style={{
                        width: `${submissionTracker.ready || submissionTracker.isError ? 100 : submissionTracker.percent}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: submissionTracker.isError
                          ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                          : submissionTracker.ready
                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                        transition: 'width 0.45s ease',
                      }}
                    />
                  </div>
                </div>
              ) : uploadMessage ? (
                <div className={`form-alert ${uploadMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {uploadMessage.type === 'success' ? (
                    <Clock className="alert-icon animate-pulse" />
                  ) : (
                    <AlertCircle className="alert-icon" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              ) : null}

              {quota && quota.is_exhausted && (
                <div
                  className="status-banner-card warning"
                  style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                  <span>
                    Portal account quota reached (50/50 applications used). Please enter a new portal email ID to submit applications.
                  </span>
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

                <div className="compact-docs-section">
                  <div className="compact-docs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="compact-docs-title">Document Uploads</span>
                    <span className="compact-docs-hint">Select or drop documents into boxes</span>
                  </div>

                  <div
                    className="info-template-actions-bar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                      margin: '10px 0 14px 0',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: activeServiceType === 'fresh' ? '#f0fdf4' : '#f8fafc',
                      border: activeServiceType === 'fresh' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText style={{ width: '16px', height: '16px', color: activeServiceType === 'fresh' ? '#059669' : '#2563eb' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        Supplementary Info Form ({activeServiceType === 'fresh' ? 'Fresh / Minor Form' : 'Reissue Form'}):
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={`/templates/${activeServiceType === 'fresh' ? 'Fresh_Passport_Info_Form.pdf' : 'Reissue_Passport_Info_Form.pdf'}`}
                        download={activeServiceType === 'fresh' ? 'Fresh_Passport_Info_Form.pdf' : 'Reissue_Passport_Info_Form.pdf'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        title="Download official fillable AcroForm PDF to print or fill digitally"
                      >
                        <Download style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                        <span>Download Fillable PDF</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setShowInAppInfoModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: 'none',
                          background: Object.keys(inAppInfoData).length > 0 ? '#059669' : (activeServiceType === 'fresh' ? '#10b981' : '#2563eb'),
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                        title="Fill the supplementary details directly inside this application"
                      >
                        <Edit3 style={{ width: '13px', height: '13px' }} />
                        <span>
                          {Object.keys(inAppInfoData).length > 0
                            ? `✓ Info Saved (${Object.keys(inAppInfoData).length} fields)`
                            : 'Fill Info in App'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="docs-boxes-grid">
                    {/* 1. Photograph Box */}
                    <div
                      className={`doc-upload-box ${photoFile ? 'has-file' : ''} ${dragSlot === 'photo' ? 'drag-target' : ''}`}
                      data-drop-slot="photo"
                      onClick={() => photoInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'photo'; setDragSlot('photo'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'photo'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'photo') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('photo', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('photo', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <Camera className="doc-box-icon" />
                        <span className="doc-box-title">Photograph</span>
                      </div>
                      <div className="doc-box-content">
                        {photoFile ? (
                          <div className="doc-box-file-info">
                            <img src={URL.createObjectURL(photoFile)} alt="Photo" className="doc-box-thumb" />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={photoFile.name}>{photoFile.name}</span>
                              <span className="doc-box-filesize">{(photoFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove photograph"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('photo', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">630×810 JPG</span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Signature Box */}
                    <div
                      className={`doc-upload-box ${signFile ? 'has-file' : ''} ${dragSlot === 'sign' ? 'drag-target' : ''}`}
                      data-drop-slot="sign"
                      onClick={() => signInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'sign'; setDragSlot('sign'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'sign'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'sign') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('sign', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={signInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('sign', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <PenTool className="doc-box-icon" />
                        <span className="doc-box-title">Signature</span>
                      </div>
                      <div className="doc-box-content">
                        {signFile ? (
                          <div className="doc-box-file-info">
                            <img src={URL.createObjectURL(signFile)} alt="Signature" className="doc-box-thumb" />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={signFile.name}>{signFile.name}</span>
                              <span className="doc-box-filesize">{(signFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove signature"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('sign', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">≤100 KB JPG</span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Passport Copy Box */}
                    <div
                      className={`doc-upload-box ${passportFile ? 'has-file' : ''} ${dragSlot === 'passport' ? 'drag-target' : ''}`}
                      data-drop-slot="passport"
                      onClick={() => passportInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'passport'; setDragSlot('passport'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'passport'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'passport') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('passport', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={passportInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('passport', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <BookOpen className="doc-box-icon" />
                        <span className="doc-box-title">
                          {activeServiceType === 'fresh' ? 'Previous PPT (Optional)' : 'Passport Copy *'}
                        </span>
                      </div>
                      <div className="doc-box-content">
                        {passportFile ? (
                          <div className="doc-box-file-info">
                            <FileText style={{ width: '22px', height: '22px', color: '#059669', flexShrink: 0 }} />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={passportFile.name}>{passportFile.name}</span>
                              <span className="doc-box-filesize">{(passportFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove passport copy"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('passport', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">
                              {activeServiceType === 'fresh' ? 'Optional (If Any)' : 'PDF ≤1 MB'}
                            </span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Identity Proof Box */}
                    <div
                      className={`doc-upload-box ${identityFile ? 'has-file' : ''} ${dragSlot === 'identity' ? 'drag-target' : ''}`}
                      data-drop-slot="identity"
                      onClick={() => identityInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'identity'; setDragSlot('identity'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'identity'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'identity') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('identity', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={identityInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('identity', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <FileCheck className="doc-box-icon" />
                        <span className="doc-box-title">Identity Proof</span>
                      </div>
                      <div className="doc-box-content">
                        {identityFile ? (
                          <div className="doc-box-file-info">
                            <FileText style={{ width: '22px', height: '22px', color: '#059669', flexShrink: 0 }} />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={identityFile.name}>{identityFile.name}</span>
                              <span className="doc-box-filesize">{(identityFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove identity proof"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('identity', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">Permesso / Permesso di Soggiorno</span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Residence Proof Box */}
                    <div
                      className={`doc-upload-box ${residenceFile ? 'has-file' : ''} ${dragSlot === 'residence' ? 'drag-target' : ''}`}
                      data-drop-slot="residence"
                      onClick={() => residenceInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'residence'; setDragSlot('residence'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'residence'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'residence') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('residence', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={residenceInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/jpg"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('residence', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <ShieldCheck className="doc-box-icon" />
                        <span className="doc-box-title">Residence Proof</span>
                      </div>
                      <div className="doc-box-content">
                        {residenceFile ? (
                          <div className="doc-box-file-info">
                            <FileText style={{ width: '22px', height: '22px', color: '#059669', flexShrink: 0 }} />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={residenceFile.name}>{residenceFile.name}</span>
                              <span className="doc-box-filesize">{(residenceFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove residence proof"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('residence', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">Residenza / Certificato di Residenza / Ospiti</span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. Info Box */}
                    <div
                      className={`doc-upload-box ${infoFile ? 'has-file' : ''} ${dragSlot === 'info' ? 'drag-target' : ''}`}
                      data-drop-slot="info"
                      onClick={() => infoInputRef.current?.click()}
                      onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = 'info'; setDragSlot('info'); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = 'info'; }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === 'info') { dragSlotRef.current = null; setDragSlot(null); } }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lastDropTimeRef.current = Date.now();
                        dragSlotRef.current = null;
                        setDragSlot(null);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          if (e.dataTransfer.files.length > 1) {
                            autoCategorizeFiles(Array.from(e.dataTransfer.files));
                          } else {
                            updateSlotFile('info', e.dataTransfer.files[0]);
                          }
                        }
                      }}
                    >
                      <input
                        ref={infoInputRef}
                        type="file"
                        accept=".docx,.doc,.pdf,.txt,image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) updateSlotFile('info', e.target.files[0]); }}
                      />
                      <div className="doc-box-header">
                        <FileText className="doc-box-icon" />
                        <span className="doc-box-title">
                          {activeServiceType === 'fresh' ? 'Fresh Info Form' : 'Reissue Info Form'}
                        </span>
                      </div>
                      <div className="doc-box-content">
                        {infoFile ? (
                          <div className="doc-box-file-info">
                            <FileText style={{ width: '22px', height: '22px', color: '#059669', flexShrink: 0 }} />
                            <div className="doc-box-text-info">
                              <span className="doc-box-filename" title={infoFile.name}>{infoFile.name}</span>
                              <span className="doc-box-filesize">{(infoFile.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="doc-box-remove-btn"
                              title="Remove info document"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlotFile('info', null);
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="doc-box-empty">
                            <span className="doc-box-badge">
                              {Object.keys(inAppInfoData).length > 0 ? 'Filled In-App ✓' : 'Fillable PDF / Doc'}
                            </span>
                            <div className="doc-box-action-hint">
                              <Upload style={{ width: '12px', height: '12px' }} />
                              <span>Upload</span>
                            </div>
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
                    <span>Or drag all 6 documents together here to auto-assign</span>
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

      {currentSection === 'preview' && (() => {
        const displayedPreviews = previews.filter(p => {
          if (previewFilter === 'fresh') return (p.service_type || '').toLowerCase() === 'fresh';
          if (previewFilter === 'reissue') return (p.service_type || 'reissue').toLowerCase() !== 'fresh';
          return true;
        });

        const reissueCount = previews.filter(p => (p.service_type || 'reissue').toLowerCase() !== 'fresh').length;
        const freshCount = previews.filter(p => (p.service_type || '').toLowerCase() === 'fresh').length;

        return (
        <div className="fresh-reissue-content">
          <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="view-main-title">Application Previews</h2>
              <p className="card-subtitle">
                Review both generated preview documents carefully before submitting to the portal.
              </p>
            </div>

            <div className="service-filter-pills" style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setPreviewFilter('all')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: previewFilter === 'all' ? '#2563eb' : 'transparent',
                  color: previewFilter === 'all' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                All ({previews.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter('reissue')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: previewFilter === 'reissue' ? '#2563eb' : 'transparent',
                  color: previewFilter === 'reissue' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Reissue ({reissueCount})
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter('fresh')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  background: previewFilter === 'fresh' ? '#059669' : 'transparent',
                  color: previewFilter === 'fresh' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Fresh ({freshCount})
              </button>
            </div>
          </div>

          {portalErrorApp && (() => {
            const errDet = getPortalErrorDetails(portalErrorApp);
            return (
              <div 
                className="wrong-creds-banner" 
                style={{ 
                  background: errDet.bg, 
                  borderColor: errDet.border, 
                  borderLeftColor: errDet.borderLeft,
                  marginBottom: '20px'
                }}
              >
                <div className="wrong-creds-left">
                  <AlertCircle className="wrong-creds-icon" style={{ color: errDet.badgeColor }} />
                </div>
                <div className="wrong-creds-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="wrong-creds-title" style={{ color: errDet.titleColor }}>{errDet.title}</span>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: errDet.badgeColor, 
                        background: 'rgba(0,0,0,0.06)', 
                        padding: '2px 8px', 
                        borderRadius: '999px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {errDet.badge}
                    </span>
                  </div>
                  <span className="wrong-creds-desc" style={{ color: errDet.descColor }}>
                    {errDet.desc}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignSelf: 'center' }}>
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isManualRefreshing}
                    className="dismiss-banner-btn"
                    style={{ background: '#ffffff', color: '#374151', borderColor: '#d1d5db' }}
                    title="Check portal status and retry"
                  >
                    {isManualRefreshing ? 'Checking...' : 'Check Status'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissCorrection(portalErrorApp.folder_name)}
                    disabled={isDismissing}
                    className="dismiss-banner-btn"
                    title="Dismiss and delete this application from database"
                  >
                    {isDismissing ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              </div>
            );
          })()}

          {displayedPreviews.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-seal">
                <FileCheck className="empty-icon" />
              </div>
              <h3 className="empty-title">
                {previewFilter === 'all' ? 'No Pending Previews' : `No Pending ${previewFilter === 'fresh' ? 'Fresh Passport' : 'Reissue'} Previews`}
              </h3>
              <p className="empty-desc">
                When you submit a new application, documents are extracted and preview drafts will appear here for verification.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSectionChange('form');
                }}
                className="empty-action-btn"
              >
                Create New Application
              </button>
            </div>
          ) : (
            <div className="previews-grid">
              {displayedPreviews.map((item) => {
                const folderKey = item.folder_name;
                const selection = previewSelections[folderKey] || { passport: false, declaration: false };
                const isUpdatingThis = voiceProcessingFolder === folderKey;
                const isAnyUpdating = Boolean(voiceProcessingFolder);
                const canSubmit = selection.passport && selection.declaration && !isUpdatingThis && !isAnyUpdating;
                const isSubmittingThis = submittingArn === item.arn;

                return (
                  <div key={folderKey} className="preview-card">
                    <div className="preview-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="preview-arn-badge">
                        <span className="preview-client-arn" style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>ARN: {item.arn}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: (item.service_type || '').toLowerCase() === 'fresh' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                            color: (item.service_type || '').toLowerCase() === 'fresh' ? '#059669' : '#2563eb',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {(item.service_type || '').toLowerCase() === 'fresh' ? 'Fresh Passport' : 'Reissue Passport'}
                        </span>
                        <span className="preview-client-name" style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>{item.applicant_name}</span>
                        <span className="status-tag-pending">Awaiting Verification</span>
                      </div>
                    </div>

                    {/* Smart Voice Agent & Preview Editor */}
                    <div className="preview-voice-agent-container">
                      <div className="voice-agent-header">
                        <div className="voice-agent-title-row">
                          <span className="voice-agent-badge">
                            Smart Voice Agent
                          </span>
                        </div>
                        {recordingFolder === folderKey && (
                          <div className="recording-timer-pill">
                            <span className="recording-dot-pulse" />
                            <span>REC {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}</span>
                          </div>
                        )}
                      </div>

                      <div className="voice-agent-instructions">
                        Speak or type any adjustment (e.g. <b>"Photo crop is too close, show more shoulders"</b>, <b>"Signature cut off, recrop wider"</b>, <b>"Applicant is single, remove spouse name"</b>, <b>"Change date of birth to 15/08/1995"</b>). The agent re-crops from source uploads, clears old data, and regenerates fresh previews.
                      </div>

                      <div className="voice-agent-main-row">
                        {recordingFolder === folderKey ? (
                          <button
                            type="button"
                            onClick={stopVoiceRecording}
                            className="voice-recording-active-btn"
                            title="Click red square button to stop recording and send voice note"
                          >
                            <Square className="stop-square-icon" fill="#ffffff" style={{ width: '13px', height: '13px', background: 'transparent' }} />
                            <span>Stop &amp; Apply Changes</span>
                            <div className="voice-waves-visualizer">
                              <span className="voice-wave-bar" />
                              <span className="voice-wave-bar" />
                              <span className="voice-wave-bar" />
                              <span className="voice-wave-bar" />
                              <span className="voice-wave-bar" />
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={voiceProcessingFolder === folderKey}
                            onClick={() => startVoiceRecording(folderKey)}
                            className="voice-record-btn"
                            title="Record voice note for Smart Voice Agent"
                          >
                            <Mic style={{ width: '15px', height: '15px' }} />
                            <span>Record Voice Note</span>
                          </button>
                        )}

                        <div className="voice-text-input-wrap">
                          <input
                            type="text"
                            disabled={voiceProcessingFolder === folderKey || recordingFolder === folderKey}
                            placeholder="Or type instructions here..."
                            value={voiceTextInputs[folderKey] || ''}
                            onChange={(e) => setVoiceTextInputs({ ...voiceTextInputs, [folderKey]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (voiceTextInputs[folderKey] || '').trim()) {
                                handleSendVoiceAction(folderKey, null, voiceTextInputs[folderKey]);
                              }
                            }}
                            className="voice-text-input"
                          />
                          <button
                            type="button"
                            disabled={voiceProcessingFolder === folderKey || recordingFolder === folderKey || !(voiceTextInputs[folderKey] || '').trim()}
                            onClick={() => handleSendVoiceAction(folderKey, null, voiceTextInputs[folderKey])}
                            className="voice-text-send-btn"
                            title="Send text instruction"
                          >
                            <Send style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      </div>

                      {voiceProcessingFolder === folderKey && (
                        <div className="voice-progress-container">
                          <div className="voice-progress-header">
                            <div className="voice-progress-status">
                              <RefreshCw style={{ width: '15px', height: '15px', color: '#2563eb' }} className="animate-spin" />
                              <span>{voiceProgress[folderKey]?.stage || 'Applying updates and regenerating fresh previews...'}</span>
                            </div>
                            <span className="voice-progress-percent">{voiceProgress[folderKey]?.percent ?? 20}%</span>
                          </div>
                          <div className="voice-progress-track">
                            <div
                              className="voice-progress-fill"
                              style={{ width: `${voiceProgress[folderKey]?.percent ?? 20}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {voiceResults[folderKey] && voiceProcessingFolder !== folderKey && (
                        <div className="voice-result-banner">
                          <div className="voice-result-title">
                            {voiceResults[folderKey].success ? (
                              <>
                                <CheckCircle2 style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                                <span>Updates Applied &amp; Fresh Previews Ready</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle style={{ width: '14px', height: '14px', color: '#2563eb' }} />
                                <span>Update Notice</span>
                              </>
                            )}
                          </div>
                          {voiceResults[folderKey].transcription && (
                            <div className="voice-result-transcription">
                              &ldquo;{voiceResults[folderKey].transcription}&rdquo;
                            </div>
                          )}
                          <div className="voice-result-summary">
                            {voiceResults[folderKey].summary}
                          </div>
                        </div>
                      )}
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
                            disabled={isUpdatingThis}
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
                            disabled={isUpdatingThis}
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
                        {isUpdatingThis ? (
                          <span className="instruction-text" style={{ color: '#2563eb', fontWeight: 600 }}>
                            Update in progress — Submit Application is locked until updates finish.
                          </span>
                        ) : !canSubmit ? (
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
                          disabled={cancellingFolder === folderKey || isSubmittingThis || isUpdatingThis}
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
                            cursor: isUpdatingThis ? 'not-allowed' : 'pointer',
                            opacity: isUpdatingThis ? 0.5 : 1,
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
                          disabled={!canSubmit || isSubmittingThis || cancellingFolder === folderKey || isUpdatingThis || isAnyUpdating}
                          onClick={() => handleConfirmFinalSubmit(folderKey, item.arn)}
                          className={`final-submit-btn ${canSubmit ? 'enabled' : 'disabled'}`}
                        >
                          {isUpdatingThis ? (
                            <>
                              <RefreshCw className="submit-icon animate-spin" />
                              <span>Updating Previews...</span>
                            </>
                          ) : isSubmittingThis ? (
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
      );
    })()}

      {currentSection === 'submitted' && (() => {
        const displayedCompleted = completed.filter(c => {
          if (submittedFilter === 'fresh') return (c.service_type || '').toLowerCase() === 'fresh';
          if (submittedFilter === 'reissue') return (c.service_type || 'reissue').toLowerCase() !== 'fresh';
          return true;
        });

        const reissueCount = completed.filter(c => (c.service_type || 'reissue').toLowerCase() !== 'fresh').length;
        const freshCount = completed.filter(c => (c.service_type || '').toLowerCase() === 'fresh').length;

        return (
          <div className="fresh-reissue-content">
            <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="view-main-title">Completed Applications</h2>
                <p className="card-subtitle">
                  All applications successfully submitted and accepted by the Passport Seva Portal.
                </p>
              </div>

              <div className="service-filter-pills" style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setSubmittedFilter('all')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: submittedFilter === 'all' ? '#2563eb' : 'transparent',
                    color: submittedFilter === 'all' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  All ({completed.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedFilter('reissue')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: submittedFilter === 'reissue' ? '#2563eb' : 'transparent',
                    color: submittedFilter === 'reissue' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Reissue ({reissueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedFilter('fresh')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    background: submittedFilter === 'fresh' ? '#059669' : 'transparent',
                    color: submittedFilter === 'fresh' ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Fresh ({freshCount})
                </button>
              </div>
            </div>

            {displayedCompleted.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-icon-seal">
                  <CheckCircle2 className="empty-icon" />
                </div>
                <h3 className="empty-title">
                  {submittedFilter === 'all' ? 'No Completed Applications' : `No Completed ${submittedFilter === 'fresh' ? 'Fresh Passport' : 'Reissue'} Applications`}
                </h3>
                <p className="empty-desc">
                  Once an application is verified and submitted from the Preview section, it will appear here with its official ARN and receipt.
                </p>
              </div>
            ) : (
              <div className="completed-grid">
                {displayedCompleted.map((item, idx) => (
                  <div key={idx} className="completed-card">
                    <div className="completed-card-left">
                      <div className="completed-seal">
                        <CheckCircle2 className="completed-icon" />
                      </div>
                      <div className="completed-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 className="completed-client-name">{item.applicant_name}</h3>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: (item.service_type || '').toLowerCase() === 'fresh' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                              color: (item.service_type || '').toLowerCase() === 'fresh' ? '#059669' : '#2563eb',
                              border: `1px solid ${(item.service_type || '').toLowerCase() === 'fresh' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(37, 99, 235, 0.25)'}`,
                            }}
                          >
                            {(item.service_type || '').toLowerCase() === 'fresh' ? 'Fresh Passport' : 'Reissue Passport'}
                          </span>
                        </div>
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
        );
      })()}

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

      <InAppInfoModal
        isOpen={showInAppInfoModal}
        serviceType={activeServiceType}
        initialData={inAppInfoData}
        onSave={(saved) => setInAppInfoData(saved)}
        onClose={() => setShowInAppInfoModal(false)}
      />
    </div>
  );
};
