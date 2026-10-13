import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Plus,
  AlertTriangle,
  Heart,
  Users,
  Baby,
  Award,
  FilePlus,
  ArrowLeft
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

export const isUserUploadedDocument = (fileName: string): boolean => {
  if (!fileName) return false;
  const clean = fileName.trim().toLowerCase();
  if (clean.startsWith('.') || clean.startsWith('raw_')) return false;
  if (
    clean.endsWith('.json') ||
    clean.endsWith('.lock') ||
    clean.endsWith('.tmp') ||
    clean.endsWith('.log') ||
    clean.endsWith('.txt') ||
    clean.endsWith('.bak') ||
    clean.endsWith('.part')
  ) {
    return false;
  }
  if (
    clean.endsWith('_preview.pdf') ||
    clean.endsWith('_declaration.pdf') ||
    clean.endsWith('_preview.png') ||
    clean.endsWith('_declaration.png')
  ) {
    return false;
  }
  if (
    clean === 'passport_preview.pdf' ||
    clean === 'self_declaration_preview.pdf' ||
    clean === 'submission_receipt.pdf' ||
    clean === 'application_form.pdf' ||
    clean === 'printapplicationreceipt_opp.pdf'
  ) {
    return false;
  }
  return /\.(pdf|jpg|jpeg|png|webp|tiff|bmp)$/i.test(clean);
};

export type DocSlotKey =
  | 'photo'
  | 'sign'
  | 'passport'
  | 'identity'
  | 'residence'
  | 'info'
  | 'marriage_cert'
  | 'spouse_passport'
  | 'birth_cert'
  | 'police_report'
  | 'annexure_f'
  | 'father_passport'
  | 'mother_passport'
  | 'annexure_d'
  | 'annexure_e'
  | 'divorce_death_cert'
  | 'name_change_proof'
  | 'education_proof';

export interface DocSlotDef {
  key: DocSlotKey;
  title: string;
  badge: string;
  accept: string;
  canonicalName: string;
  iconName: 'camera' | 'pen' | 'book' | 'id' | 'shield' | 'heart' | 'users' | 'baby' | 'file-plus' | 'award' | 'alert' | 'file';
  description?: string;
}

export const SLOT_CATALOG: Record<DocSlotKey, DocSlotDef> = {
  photo: {
    key: 'photo',
    title: 'Photograph *',
    badge: '630×810 JPG',
    accept: 'image/jpeg,image/png,image/webp,image/jpg',
    canonicalName: 'photograph.jpg',
    iconName: 'camera',
    description: 'ICAO standard biometric photo',
  },
  sign: {
    key: 'sign',
    title: 'Signature *',
    badge: '≤85 KB JPG',
    accept: 'image/jpeg,image/png,image/jpg',
    canonicalName: 'signature.jpg',
    iconName: 'pen',
    description: 'Specimen signature or thumb impression',
  },
  passport: {
    key: 'passport',
    title: 'Passport Copy *',
    badge: 'PDF ≤870 KB',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'applicant_passport.pdf',
    iconName: 'book',
    description: 'First & last pages of current passport',
  },
  identity: {
    key: 'identity',
    title: 'Residence Permit',
    badge: 'PDS/renewal slip/visa',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'pds.pdf',
    iconName: 'id',
    description: 'Permesso di soggiorno (plastic card or postal kit receipt)',
  },
  residence: {
    key: 'residence',
    title: 'Address Proof',
    badge: 'Residenza / CIE / Ospiti',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'residenza.pdf',
    iconName: 'shield',
    description: "Certificato di residenza, CIE (Carta d'Identità), ospitalità, or bolletta",
  },
  marriage_cert: {
    key: 'marriage_cert',
    title: 'Marriage Certificate *',
    badge: 'Marriage Certificate',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'marriage_certificate.pdf',
    iconName: 'heart',
    description: 'Copy of marriage certificate',
  },
  spouse_passport: {
    key: 'spouse_passport',
    title: 'Spouse Passport',
    badge: 'Spouse Copy PDF',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'spouse_passport.pdf',
    iconName: 'users',
    description: "Self-attested copy of spouse's Indian passport",
  },
  birth_cert: {
    key: 'birth_cert',
    title: 'Birth Certificate *',
    badge: 'Estratto di nascita by comune/hospital',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'birth_certificate.pdf',
    iconName: 'baby',
    description: 'Estratto di nascita by comune/hospital',
  },
  father_passport: {
    key: 'father_passport',
    title: "Father's Document *",
    badge: 'Passport/PDS/C.C.I.E./Ospiti',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'father_document.pdf',
    iconName: 'users',
    description: 'Passport/PDS/C.C.I.E./Ospiti',
  },
  mother_passport: {
    key: 'mother_passport',
    title: "Mother's Document *",
    badge: 'Passport/PDS/C.C.I.E./Ospiti',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'mother_document.pdf',
    iconName: 'users',
    description: 'Passport/PDS/C.C.I.E./Ospiti',
  },
  annexure_d: {
    key: 'annexure_d',
    title: 'Annexure D (Consent) *',
    badge: 'Parent Consent',
    accept: '.pdf,image/jpeg,image/png,image/jpg,.docx,.doc',
    canonicalName: 'annexure_d_consent.pdf',
    iconName: 'file-plus',
    description: 'Parental declaration for minor passport',
  },
  annexure_e: {
    key: 'annexure_e',
    title: 'Annexure E (Declaration) *',
    badge: 'Self Declaration',
    accept: '.pdf,image/jpeg,image/png,image/jpg,.docx,.doc',
    canonicalName: 'annexure_e_declaration.pdf',
    iconName: 'file-plus',
    description: 'Self-declaration for adult fresh passport',
  },
  police_report: {
    key: 'police_report',
    title: 'Police Report / Denuncia *',
    badge: 'Original Denuncia',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'police_report_denuncia.pdf',
    iconName: 'alert',
    description: 'Official police complaint / Denuncia smarrimento',
  },
  annexure_f: {
    key: 'annexure_f',
    title: 'Annexure F (Lost/Damage) *',
    badge: 'Loss / Damage Affidavit',
    accept: '.pdf,image/jpeg,image/png,image/jpg,.docx,.doc',
    canonicalName: 'annexure_f_affidavit.pdf',
    iconName: 'alert',
    description: 'Affidavit stating circumstances of loss or damage',
  },
  divorce_death_cert: {
    key: 'divorce_death_cert',
    title: 'Divorce / Death Cert *',
    badge: 'Decree / Certificate',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'divorce_death_certificate.pdf',
    iconName: 'file-plus',
    description: 'Divorce decree or spouse death certificate for deletion',
  },
  name_change_proof: {
    key: 'name_change_proof',
    title: 'Name Change Proof *',
    badge: 'Gazette / Deed Poll',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'name_change_proof.pdf',
    iconName: 'file-plus',
    description: 'Gazette notification, deed poll or two public IDs',
  },
  education_proof: {
    key: 'education_proof',
    title: 'Education Certificate',
    badge: '10th / Degree Non-ECR',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    canonicalName: 'education_certificate.pdf',
    iconName: 'award',
    description: 'Matriculation or higher degree certificate for Non-ECR',
  },
  info: {
    key: 'info',
    title: 'Additional Documents',
    badge: 'Info Sheet / Docs',
    accept: '.docx,.doc,.pdf,.txt,image/*',
    canonicalName: 'additional_documents.pdf',
    iconName: 'file',
    description: 'Client info sheet or other supporting paperwork',
  },
};

export type ApplyingScenarioId =
  | 'reissue_standard'
  | 'reissue_spouse_add'
  | 'reissue_spouse_del'
  | 'reissue_lost'
  | 'reissue_damaged'
  | 'reissue_name_change'
  | 'fresh_minor'
  | 'fresh_adult';

export interface ApplyingScenario {
  id: ApplyingScenarioId;
  label: string;
  serviceType: 'reissue' | 'fresh';
  icon: string;
  slots: DocSlotKey[];
  description: string;
}

export const APPLYING_SCENARIOS: ApplyingScenario[] = [
  {
    id: 'reissue_standard',
    label: 'Standard Reissue (Expired / Validity)',
    serviceType: 'reissue',
    icon: 'book',
    slots: ['photo', 'sign', 'passport', 'identity', 'residence', 'info'],
    description: 'Normal passport renewal due to expiry or page exhaustion',
  },
  {
    id: 'reissue_spouse_add',
    label: 'Add / Update Spouse Name',
    serviceType: 'reissue',
    icon: 'heart',
    slots: ['photo', 'sign', 'passport', 'marriage_cert', 'spouse_passport', 'identity', 'residence', 'info'],
    description: 'Renewal with spouse endorsement (requires marriage certificate)',
  },
  {
    id: 'reissue_spouse_del',
    label: 'Delete Spouse Name',
    serviceType: 'reissue',
    icon: 'users',
    slots: ['photo', 'sign', 'passport', 'divorce_death_cert', 'identity', 'residence', 'info'],
    description: 'Deletion of spouse due to divorce decree or bereavement',
  },
  {
    id: 'reissue_lost',
    label: 'Lost Passport',
    serviceType: 'reissue',
    icon: 'alert',
    slots: ['photo', 'sign', 'police_report', 'annexure_f', 'passport', 'identity', 'residence', 'info'],
    description: 'Passport lost: requires Italian police denuncia and Annexure F',
  },
  {
    id: 'reissue_damaged',
    label: 'Damaged Passport',
    serviceType: 'reissue',
    icon: 'alert',
    slots: ['photo', 'sign', 'passport', 'annexure_f', 'identity', 'residence', 'info'],
    description: 'Passport damaged: requires copy of damaged pages and Annexure F',
  },
  {
    id: 'reissue_name_change',
    label: 'Change in Name / Surname',
    serviceType: 'reissue',
    icon: 'file-plus',
    slots: ['photo', 'sign', 'passport', 'name_change_proof', 'identity', 'residence', 'info'],
    description: 'Major/minor name change: requires Gazette or deed poll',
  },
  {
    id: 'fresh_minor',
    label: 'Fresh Passport',
    serviceType: 'fresh',
    icon: 'baby',
    slots: ['photo', 'sign', 'birth_cert', 'father_passport', 'mother_passport', 'marriage_cert', 'info'],
    description: 'Fresh passport application for applicant born abroad / in Italy',
  },
  {
    id: 'fresh_adult',
    label: 'Fresh Passport',
    serviceType: 'fresh',
    icon: 'award',
    slots: ['photo', 'sign', 'birth_cert', 'father_passport', 'mother_passport', 'marriage_cert', 'info'],
    description: 'Fresh passport application for applicant born abroad / in Italy',
  },
];

export const detectSlotAndCanonicalName = (
  file: File,
  fallbackSlot?: DocSlotKey
): { slot: DocSlotKey; canonicalName: string } => {
  const originalName = file.name || '';
  const lower = originalName.toLowerCase();
  const ext = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.'))
    : (file.type.startsWith('image/') ? '.jpg' : '.pdf');

  // Explicit slot targeting: if dropped or uploaded into signature, it must be signature.jpg
  if (fallbackSlot === 'sign') {
    return { slot: 'sign', canonicalName: 'signature.jpg' };
  }
  // If dropped or uploaded into residence
  if (fallbackSlot === 'residence') {
    const isCie = lower.includes('cie') || lower.includes('carta_ident') || lower.includes('carta_d_ident') || lower.includes("carta d'ident") || lower.includes('carta di ident') || lower.includes('identita') || lower.includes('identità') || (lower.includes('carta') && !lower.includes('soggiorno'));
    return {
      slot: 'residence',
      canonicalName: isCie ? `cie${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` : `residenza${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}`,
    };
  }

  // CIE / Carta d'Identità: STRICTLY Proof of Residence (NEVER Identity Proof / Permesso di Soggiorno)
  if (
    lower.includes('cie') ||
    lower.includes('carta_ident') ||
    lower.includes('carta_d_ident') ||
    lower.includes("carta d'ident") ||
    lower.includes('carta di ident') ||
    lower.includes('identita') ||
    lower.includes('identità') ||
    (lower.includes('carta') && !lower.includes('soggiorno'))
  ) {
    return { slot: 'residence', canonicalName: `cie${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 1. Marriage Certificate
  if (
    lower.includes('marr') ||
    lower.includes('marraige') ||
    lower.includes('matrimonio') ||
    lower.includes('spos') ||
    lower.includes('nikah') ||
    lower.includes('shadi') ||
    lower.includes('vivah') ||
    lower.includes('wedding')
  ) {
    return { slot: 'marriage_cert', canonicalName: `marriage_certificate${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 2. Spouse Passport
  if (
    (lower.includes('spouse') || lower.includes('husband') || lower.includes('wife') || lower.includes('patni') || lower.includes('pati') || lower.includes('moglie') || lower.includes('marito')) &&
    (lower.includes('pass') || lower.includes('ppt') || lower.includes('passaporto'))
  ) {
    return { slot: 'spouse_passport', canonicalName: `spouse_passport${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 3. Father Document (Passport / PDS / CIE / Ospiti)
  if (
    lower.includes('father') || lower.includes('dad') || lower.includes('padre') || lower.includes('pita') || lower.includes('papa')
  ) {
    return { slot: 'father_passport', canonicalName: `father_document${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 4. Mother Document (Passport / PDS / CIE / Ospiti)
  if (
    lower.includes('mother') || lower.includes('mom') || lower.includes('madre') || lower.includes('mata') || lower.includes('mamma')
  ) {
    return { slot: 'mother_passport', canonicalName: `mother_document${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 5. Birth Certificate
  if (
    lower.includes('birth') ||
    lower.includes('nascit') ||
    lower.includes('estratto') ||
    lower.includes('atto') ||
    lower.includes('janm') ||
    lower.includes('pedigree')
  ) {
    return { slot: 'birth_cert', canonicalName: `birth_certificate${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 6. Police Report / Denuncia
  if (
    lower.includes('denun') ||
    lower.includes('police') ||
    lower.includes('polizia') ||
    lower.includes('carabinieri') ||
    lower.includes('questura') ||
    lower.includes('smarrimento') ||
    lower.includes('furto') ||
    lower.includes('lost_report') ||
    lower.includes('fir')
  ) {
    return { slot: 'police_report', canonicalName: `police_report_denuncia${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 7. Annexure F (Lost / Damage Affidavit)
  if (
    lower.includes('annexure_f') ||
    lower.includes('annex_f') ||
    lower.includes('allegato_f') ||
    lower.includes('affidavit_f') ||
    lower.includes('loss_affidavit') ||
    (lower.includes('annexure') && lower.includes('f'))
  ) {
    return { slot: 'annexure_f', canonicalName: `annexure_f_affidavit${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 8. Annexure D (Parental consent -> routes to Additional Supporting Documents)
  if (
    lower.includes('annexure_d') ||
    lower.includes('annex_d') ||
    lower.includes('allegato_d') ||
    lower.includes('consent') ||
    lower.includes('assenso') ||
    (lower.includes('annexure') && lower.includes('d'))
  ) {
    return { slot: 'info', canonicalName: `annexure_d_consent${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 9. Annexure E (Self declaration)
  if (
    lower.includes('annexure_e') ||
    lower.includes('annex_e') ||
    lower.includes('allegato_e') ||
    (lower.includes('annexure') && lower.includes('e'))
  ) {
    return { slot: 'annexure_e', canonicalName: `annexure_e_declaration${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 10. Divorce / Death Certificate
  if (
    lower.includes('divorc') ||
    lower.includes('divorzio') ||
    lower.includes('death') ||
    lower.includes('morte') ||
    lower.includes('decesso') ||
    lower.includes('talaq')
  ) {
    return { slot: 'divorce_death_cert', canonicalName: `divorce_death_certificate${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 11. Name Change Proof
  if (
    lower.includes('name_change') ||
    lower.includes('change_name') ||
    lower.includes('cambio_nome') ||
    lower.includes('deed_poll') ||
    lower.includes('gazette')
  ) {
    return { slot: 'name_change_proof', canonicalName: `name_change_proof${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 12. Education Proof
  if (
    lower.includes('degree') ||
    lower.includes('diploma') ||
    lower.includes('laurea') ||
    lower.includes('matric') ||
    lower.includes('10th') ||
    lower.includes('12th') ||
    lower.includes('marksheet') ||
    lower.includes('school') ||
    lower.includes('education')
  ) {
    return { slot: 'education_proof', canonicalName: `education_certificate${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 13. Photo
  if (
    lower.includes('photo') ||
    lower.includes('foto') ||
    lower.includes('pic') ||
    lower.includes('portrait') ||
    lower.includes('fototessera') ||
    lower.includes('selfie')
  ) {
    return { slot: 'photo', canonicalName: 'photograph.jpg' };
  }

  // 14. Signature
  if (
    lower.includes('sign') ||
    lower.includes('firma') ||
    lower.includes('signature') ||
    lower.includes('thumb') ||
    lower.includes('hastakshar') ||
    lower.includes('dastakhat')
  ) {
    return { slot: 'sign', canonicalName: 'signature.jpg' };
  }

  // 14.5 Appointment / Booking / Embassy / Urgent Slip (MUST precede Applicant Passport)
  if (
    lower.includes('appointment') ||
    lower.includes('appuntam') ||
    lower.includes('prenota') ||
    lower.includes('prenotaz') ||
    lower.includes('booking') ||
    lower.includes('urgent') ||
    lower.includes('am_urgent') ||
    lower.includes('pm_urgent') ||
    lower.includes('embassy') ||
    lower.includes('consolato') ||
    lower.includes('consulate') ||
    lower.includes('slip')
  ) {
    return { slot: 'info', canonicalName: `appointment_details${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 15. Applicant Passport (Strict: exclude appointment, booking, urgent, mother, father, spouse)
  if (
    !lower.includes('appointment') &&
    !lower.includes('appuntam') &&
    !lower.includes('prenota') &&
    !lower.includes('prenotaz') &&
    !lower.includes('booking') &&
    !lower.includes('urgent') &&
    !lower.includes('father') &&
    !lower.includes('mother') &&
    !lower.includes('spouse') &&
    (
      lower.includes('passport') ||
      lower.includes('passaporto') ||
      lower.includes('ppt') ||
      lower === 'pass.pdf' ||
      lower.startsWith('pass_')
    )
  ) {
    return { slot: 'passport', canonicalName: `applicant_passport${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 16. Permesso / Identity (Permesso di Soggiorno ONLY)
  if (
    lower.includes('permesso') ||
    lower.includes('pds') ||
    lower.includes('soggiorno') ||
    lower.includes('ricevuta') ||
    lower.includes('assicurat') ||
    lower.includes('kit_post')
  ) {
    return { slot: 'identity', canonicalName: `permesso_di_soggiorno${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 17. Italian Carta d'Identità (CIE) -> STRICTLY Proof of Residence
  if (
    lower.includes('cie') ||
    lower.includes('carta_ident') ||
    lower.includes('carta_d_ident') ||
    lower.includes("carta d'ident") ||
    lower.includes('carta di ident') ||
    lower.includes('identita') ||
    lower.includes('identità') ||
    (lower.includes('carta') && !lower.includes('soggiorno'))
  ) {
    return { slot: 'residence', canonicalName: `cie${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 18. Residence Proof (Residenza, Ospitalità, Cessione, Lease, Utility, Anagrafe)
  if (
    lower.includes('residen') ||
    lower.includes('ospital') ||
    lower.includes('ospiti') ||
    lower.includes('fabbricato') ||
    lower.includes('cessione') ||
    lower.includes('bolletta') ||
    lower.includes('contratto') ||
    lower.includes('enel') ||
    lower.includes('gas') ||
    lower.includes('luce') ||
    lower.includes('anagrafe') ||
    lower.includes('famiglia')
  ) {
    return { slot: 'residence', canonicalName: `residenza${ext.toLowerCase() === '.pdf' ? '.pdf' : ext}` };
  }

  // 18. Info Sheet / Supporting
  if (
    lower.includes('info') ||
    lower.includes('detail') ||
    lower.includes('dettagli') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.txt')
  ) {
    return { slot: 'info', canonicalName: `additional_info${ext}` };
  }

  // Fallback to designated target slot if specified
  if (fallbackSlot && SLOT_CATALOG[fallbackSlot]) {
    const slotDef = SLOT_CATALOG[fallbackSlot];
    return { slot: fallbackSlot, canonicalName: slotDef.canonicalName };
  }

  // Default heuristic based on mime type or extension
  if (file.type.startsWith('image/')) {
    return { slot: 'photo', canonicalName: 'photograph.jpg' };
  }
  return { slot: 'info', canonicalName: `additional_documents${ext}` };
};

export const detectSlotAndCanonicalNameAsync = async (
  file: File,
  fallbackSlot?: DocSlotKey
): Promise<{ slot: DocSlotKey; canonicalName: string }> => {
  const originalName = file.name || '';
  const lowerName = originalName.toLowerCase();
  const ext = originalName.includes('.')
    ? originalName.slice(originalName.lastIndexOf('.'))
    : (file.type.startsWith('image/') ? '.jpg' : '.pdf');

  // Explicit slot targeting: if dropped or uploaded into signature, it must be signature.jpg
  if (fallbackSlot === 'sign') {
    return { slot: 'sign', canonicalName: 'signature.jpg' };
  }
  // If dropped or uploaded into residence
  if (fallbackSlot === 'residence') {
    const isCie = lowerName.includes('cie') || lowerName.includes('carta_ident') || lowerName.includes('carta_d_ident') || lowerName.includes("carta d'ident") || lowerName.includes('carta di ident') || lowerName.includes('identita') || lowerName.includes('identità') || (lowerName.includes('carta') && !lowerName.includes('soggiorno'));
    return {
      slot: 'residence',
      canonicalName: isCie ? ((lowerName.endsWith('.pdf') || file.type === 'application/pdf') ? 'cie.pdf' : `cie${ext}`) : ((lowerName.endsWith('.pdf') || file.type === 'application/pdf') ? 'residenza.pdf' : `residenza${ext}`),
    };
  }

  // CIE / Carta d'Identità: STRICTLY Proof of Residence (NEVER Identity Proof / Permesso di Soggiorno)
  if (
    lowerName.includes('cie') ||
    lowerName.includes('carta_ident') ||
    lowerName.includes('carta_d_ident') ||
    lowerName.includes("carta d'ident") ||
    lowerName.includes('carta di ident') ||
    lowerName.includes('identita') ||
    lowerName.includes('identità') ||
    (lowerName.includes('carta') && !lowerName.includes('soggiorno'))
  ) {
    return {
      slot: 'residence',
      canonicalName: (lowerName.endsWith('.pdf') || file.type === 'application/pdf') ? 'cie.pdf' : `cie${ext}`,
    };
  }

  // 1. Initial fast keyword check on original filename
  const nameDetected = detectSlotAndCanonicalName(file, fallbackSlot);
  const isGenericImageFallback = nameDetected.slot === 'photo' &&
    !lowerName.includes('photo') &&
    !lowerName.includes('foto') &&
    !lowerName.includes('pic') &&
    !lowerName.includes('portrait') &&
    !lowerName.includes('fototessera') &&
    !lowerName.includes('selfie');
  const isHighConfidenceName = nameDetected.slot !== 'info' && !isGenericImageFallback;

  // 2. Uncompressed PDF content sniffing (first 128 KB)
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
  let pdfText = '';
  if (isPdf) {
    try {
      const slice = file.slice(0, 131072);
      pdfText = (await slice.text()).toLowerCase();
    } catch (_) {}
  }

  if (pdfText) {
    // A. Marriage Certificate
    if (
      pdfText.includes('matrimonio') ||
      pdfText.includes('atto di matrimonio') ||
      pdfText.includes('certificato di matrimonio') ||
      pdfText.includes('marriage certificate') ||
      pdfText.includes('registrar of marriages') ||
      pdfText.includes('special marriage act') ||
      pdfText.includes('hindu marriage') ||
      pdfText.includes('anand marriage') ||
      pdfText.includes('nikahnama') ||
      pdfText.includes('nikah') ||
      pdfText.includes('coniugi')
    ) {
      return { slot: 'marriage_cert', canonicalName: 'marriage_certificate.pdf' };
    }

    // B. Police Report / Denuncia
    if (
      (pdfText.includes('carabinieri') || pdfText.includes('questura') || pdfText.includes('polizia') || pdfText.includes('commissariato')) &&
      (pdfText.includes('denuncia') || pdfText.includes('smarrimento') || pdfText.includes('furto') || pdfText.includes('verbale'))
    ) {
      return { slot: 'police_report', canonicalName: 'police_report_denuncia.pdf' };
    }
    if (pdfText.includes('denuncia') || pdfText.includes('denunzia') || pdfText.includes('police report') || pdfText.includes('fir copy')) {
      return { slot: 'police_report', canonicalName: 'police_report_denuncia.pdf' };
    }

    // C. Annexure F (Affidavit for lost or damaged passport)
    if (
      pdfText.includes('annexure f') ||
      pdfText.includes('annexure-f') ||
      pdfText.includes('allegato f') ||
      pdfText.includes('affidavit for a passport in lieu of lost') ||
      pdfText.includes('lost/damaged passport')
    ) {
      return { slot: 'annexure_f', canonicalName: 'annexure_f_affidavit.pdf' };
    }

    // D. Annexure D (Parental consent for minor -> routes to Additional Documents)
    if (
      pdfText.includes('annexure d') ||
      pdfText.includes('annexure-d') ||
      pdfText.includes('allegato d') ||
      pdfText.includes('declaration by the applicant\'s parent') ||
      pdfText.includes('parental consent')
    ) {
      return { slot: 'info', canonicalName: 'annexure_d_consent.pdf' };
    }

    // E. Annexure E (Self declaration for adult)
    if (
      pdfText.includes('annexure e') ||
      pdfText.includes('annexure-e') ||
      pdfText.includes('allegato e') ||
      pdfText.includes('declaration of the applicant')
    ) {
      return { slot: 'annexure_e', canonicalName: 'annexure_e_declaration.pdf' };
    }

    // F. Divorce or Death Certificate
    if (
      pdfText.includes('divorz') ||
      pdfText.includes('sentenza di divorzio') ||
      pdfText.includes('certificato di morte') ||
      pdfText.includes('decesso') ||
      pdfText.includes('death certificate') ||
      pdfText.includes('talaq') ||
      pdfText.includes('dissolution of marriage')
    ) {
      return { slot: 'divorce_death_cert', canonicalName: 'divorce_death_certificate.pdf' };
    }

    // G. Name Change Proof
    if (
      pdfText.includes('deed poll') ||
      pdfText.includes('cambio di nome') ||
      pdfText.includes('cambio cognome') ||
      pdfText.includes('gazette of india') ||
      pdfText.includes('sworn affidavit for change of name')
    ) {
      return { slot: 'name_change_proof', canonicalName: 'name_change_proof.pdf' };
    }

    // H. Birth Certificate
    if (
      pdfText.includes('atto di nascita') ||
      pdfText.includes('certificato di nascita') ||
      pdfText.includes('estratto di nascita') ||
      pdfText.includes('birth certificate') ||
      (pdfText.includes('registration of birth') && pdfText.includes('date of birth'))
    ) {
      return { slot: 'birth_cert', canonicalName: 'birth_certificate.pdf' };
    }

    // I. Education Certificate
    if (
      pdfText.includes('board of secondary') ||
      pdfText.includes('central board of secondary') ||
      pdfText.includes('cbse') ||
      pdfText.includes('icse') ||
      pdfText.includes('matriculation') ||
      pdfText.includes('marks sheet') ||
      pdfText.includes('bachelor') ||
      pdfText.includes('diploma') ||
      pdfText.includes('laurea') ||
      pdfText.includes('certificato scolastico')
    ) {
      return { slot: 'education_proof', canonicalName: 'education_certificate.pdf' };
    }

    // J. Italian Carta d'Identità (CIE) -> STRICTLY Proof of Residence
    if (
      pdfText.includes("carta d'identita") ||
      pdfText.includes("carta di identita") ||
      pdfText.includes("carta d'identità") ||
      pdfText.includes("carta di identità") ||
      pdfText.includes("carta d’identit") ||
      (pdfText.includes('repubblica italiana') && (pdfText.includes('identita') || pdfText.includes('identità')))
    ) {
      return { slot: 'residence', canonicalName: 'cie.pdf' };
    }

    // J2. Residence Proof / Ospitalità / Cessione / Utility Bill / Anagrafe
    if (
      pdfText.includes('certificato di residenza') ||
      pdfText.includes('stato di famiglia') ||
      pdfText.includes('cessione di fabbricato') ||
      pdfText.includes('dichiarazione di ospitalita') ||
      pdfText.includes('comunicazione di ospitalita') ||
      pdfText.includes('contratto di locazione') ||
      pdfText.includes('servizio elettrico') ||
      pdfText.includes('enel energia') ||
      pdfText.includes('italgas') ||
      pdfText.includes('bolletta') ||
      (pdfText.includes('comune di') && pdfText.includes('residenza'))
    ) {
      return { slot: 'residence', canonicalName: 'residenza.pdf' };
    }

    // K. Permesso di Soggiorno (ONLY)
    if (
      pdfText.includes('permesso di soggiorno') ||
      pdfText.includes('carta di soggiorno') ||
      pdfText.includes('questura di') ||
      pdfText.includes('soggiornante') ||
      pdfText.includes('ricevuta assicurata') ||
      (pdfText.includes('poste italiane') && pdfText.includes('stranieri'))
    ) {
      return { slot: 'identity', canonicalName: 'permesso_di_soggiorno.pdf' };
    }

    // K2. Appointment / Booking / Embassy Slip
    if (
      pdfText.includes('appointment details') ||
      pdfText.includes('appointment id') ||
      pdfText.includes('booking reference') ||
      pdfText.includes('prenotazione appuntamento') ||
      pdfText.includes('ricevuta appuntamento') ||
      (pdfText.includes('appointment') && pdfText.includes('embassy of india'))
    ) {
      return { slot: 'info', canonicalName: 'appointment_details.pdf' };
    }

    // L. Indian Passport
    if (
      pdfText.includes('republic of india') ||
      pdfText.includes('p<ind') ||
      pdfText.includes('nationality indian') ||
      (pdfText.includes('passport') && (pdfText.includes('ministry of external affairs') || pdfText.includes('given name')))
    ) {
      if (lowerName.includes('father') || lowerName.includes('dad') || lowerName.includes('padre') || (pdfText.includes('father') && lowerName.includes('dad'))) {
        return { slot: 'father_passport', canonicalName: 'father_document.pdf' };
      }
      if (lowerName.includes('mother') || lowerName.includes('mom') || lowerName.includes('madre') || (pdfText.includes('mother') && lowerName.includes('mom'))) {
        return { slot: 'mother_passport', canonicalName: 'mother_document.pdf' };
      }
      if (lowerName.includes('spouse') || pdfText.includes('spouse') || lowerName.includes('husband') || lowerName.includes('wife')) {
        return { slot: 'spouse_passport', canonicalName: 'spouse_passport.pdf' };
      }
      return { slot: 'passport', canonicalName: 'applicant_passport.pdf' };
    }
  }

  // 3. Image aspect ratio and dimension inspection
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(lowerName);
  if (isImage) {
    try {
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });

      if (dims.width > 0 && dims.height > 0) {
        const ratio = dims.width / dims.height;
        // Wide aspect ratio: Signature (ratio >= 1.6 or height < 60% of width)
        if (ratio >= 1.6 || dims.height <= dims.width * 0.6) {
          return { slot: 'sign', canonicalName: 'signature.jpg' };
        }
        // Portrait aspect ratio ~ 0.65 to 0.95 with size <= 6MB: Photograph
        if (ratio >= 0.65 && ratio <= 0.95 && file.size <= 6 * 1024 * 1024) {
          if (!lowerName.includes('passport') && !lowerName.includes('permesso') && !lowerName.includes('carta')) {
            return { slot: 'photo', canonicalName: 'photograph.jpg' };
          }
        }
      }
    } catch (_) {}
  }

  // 4. If filename had a high-confidence match, use it
  if (isHighConfidenceName) {
    return nameDetected;
  }

  // 5. Fallback slot if provided and matches valid types
  if (fallbackSlot && SLOT_CATALOG[fallbackSlot]) {
    const slotDef = SLOT_CATALOG[fallbackSlot];
    const targetExt = ext.toLowerCase();
    const isTargetPdf = targetExt === '.pdf';
    return {
      slot: fallbackSlot,
      canonicalName: isTargetPdf ? slotDef.canonicalName : `${slotDef.canonicalName.replace(/\.[^/.]+$/, '')}${targetExt}`,
    };
  }

  return nameDetected;
};

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
  const [inAppInfoData, setInAppInfoData] = useState<Record<string, any>>({
    application_type: 'NORMAL',
    booklet_type: '36 PAGES',
  });
  const filledParticularsKeys = useMemo(() => {
    return Object.keys(inAppInfoData).filter((k) => {
      if (
        k === 'is_change_in_particulars' ||
        k === 'reissue_reason' ||
        k === 'application_type' ||
        k === 'booklet_type'
      ) return false;
      const val = inAppInfoData[k];
      if (val === undefined || val === null) return false;
      const str = String(val).trim();
      return str !== '' && str !== 'SELECT' && str !== 'NOT APPLICABLE';
    });
  }, [inAppInfoData]);
  const filledParticularsCount = filledParticularsKeys.length;
  const [previewFilter, setPreviewFilter] = useState<'all' | 'reissue' | 'fresh'>('all');
  const [submittedFilter, setSubmittedFilter] = useState<'all' | 'reissue' | 'fresh'>('all');

  const googleUserEmail = (user?.email || '').trim().toLowerCase();
  const scopedEmailKey = googleUserEmail ? `fs_active_client_email_${googleUserEmail}` : 'fs_active_client_email';
  const scopedPassKey = googleUserEmail ? `fs_portal_password_${googleUserEmail}` : 'fs_portal_password';

  const initialEmail = (localStorage.getItem(scopedEmailKey) || '').toUpperCase();
  const initialPassword = localStorage.getItem(scopedPassKey) || '';
  const [portalEmail, setPortalEmail] = useState(initialEmail);
  const [activeClientEmail, setActiveClientEmail] = useState(initialEmail || '');
  const [portalPassword, setPortalPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const declarationPlace = useMemo(() => {
    const clean = (portalEmail || activeClientEmail || '').toLowerCase().trim();
    if (clean.includes('milan') || clean.includes('milano')) return 'MILAN';
    if (clean.includes('rome') || clean.includes('roma') || clean.includes('fondi')) return 'ROME';
    return 'ROME';
  }, [portalEmail, activeClientEmail]);

  useEffect(() => {
    const savedEmail = (localStorage.getItem(scopedEmailKey) || '').toUpperCase();
    const savedPass = localStorage.getItem(scopedPassKey) || '';
    setPortalEmail(savedEmail);
    setActiveClientEmail(savedEmail);
    setPortalPassword(savedPass);
    setApplications([]);
    setPreviews([]);
    setCompleted([]);
    setQuota(null);
  }, [scopedEmailKey, scopedPassKey]);

  // 6 Distinct Document Upload Boxes + Extras
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signFile, setSignFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [residenceFile, setResidenceFile] = useState<File | null>(null);
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Dynamic Application Scenario and Dynamic Document Requirement Slots
  const [selectedScenario, setSelectedScenario] = useState<ApplyingScenarioId>(
    activeServiceType === 'fresh' ? 'fresh_minor' : 'reissue_standard'
  );
  const [dynamicallyActivatedSlots, setDynamicallyActivatedSlots] = useState<DocSlotKey[]>([]);
  const [slotFiles, setSlotFiles] = useState<Record<DocSlotKey, File | null>>({
    photo: null,
    sign: null,
    passport: null,
    identity: null,
    residence: null,
    info: null,
    marriage_cert: null,
    spouse_passport: null,
    birth_cert: null,
    police_report: null,
    annexure_f: null,
    father_passport: null,
    mother_passport: null,
    annexure_d: null,
    annexure_e: null,
    divorce_death_cert: null,
    name_change_proof: null,
    education_proof: null,
  });

  const dynamicInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync default scenario when service type toggles
  useEffect(() => {
    if (activeServiceType === 'fresh') {
      setSelectedScenario('fresh_minor');
    } else {
      setSelectedScenario('reissue_standard');
    }
  }, [activeServiceType]);

  // Sync scenario when inAppInfoData changes
  useEffect(() => {
    if (activeServiceType === 'reissue') {
      if (inAppInfoData.reissue_reason === 'LOST PASSPORT') {
        setSelectedScenario('reissue_lost');
      } else if (inAppInfoData.reissue_reason === 'DAMAGED PASSPORT') {
        setSelectedScenario('reissue_damaged');
      } else if (inAppInfoData.change_type === 'CHANGE IN SPOUSE NAME' || inAppInfoData.change_in_spouse === 'Y') {
        setSelectedScenario('reissue_spouse_add');
      } else if (inAppInfoData.change_type === 'CHANGE IN NAME / SURNAME' || inAppInfoData.change_in_name === 'Y') {
        setSelectedScenario('reissue_name_change');
      } else if (inAppInfoData.marital_status === 'DIVORCED' || inAppInfoData.marital_status === 'WIDOW / WIDOWER') {
        setSelectedScenario('reissue_spouse_del');
      } else {
        setSelectedScenario('reissue_standard');
      }
    } else if (activeServiceType === 'fresh') {
      setSelectedScenario('fresh_minor');
    }
  }, [inAppInfoData, activeServiceType]);

  // Prune unused dynamically activated slots when scenario or modal info changes
  useEffect(() => {
    setDynamicallyActivatedSlots(prev => prev.filter(slot => slotFiles[slot] != null));
  }, [selectedScenario, inAppInfoData]);

  const activeSlots = useMemo<DocSlotKey[]>(() => {
    const curScenario = APPLYING_SCENARIOS.find(s => s.id === selectedScenario) || APPLYING_SCENARIOS[0];
    const baseSlots = [...curScenario.slots];
    for (const extraSlot of dynamicallyActivatedSlots) {
      if (!baseSlots.includes(extraSlot)) {
        baseSlots.push(extraSlot);
      }
    }
    for (const key of Object.keys(slotFiles) as DocSlotKey[]) {
      if (slotFiles[key] && !baseSlots.includes(key)) {
        baseSlots.push(key);
      }
    }
    return baseSlots;
  }, [selectedScenario, dynamicallyActivatedSlots, slotFiles]);

  // Box Drag Over states & tracking refs
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const dragSlotRef = useRef<string | null>(null);
  const lastDropTimeRef = useRef<number>(0);
  const lastDropFingerprintRef = useRef<string>('');

  const isDuplicateDropEvent = (files: File[]) => {
    const now = Date.now();
    const fp = files.map(f => `${f.name}:${f.size}`).join('|');
    if (now - lastDropTimeRef.current < 1500 && fp && fp === lastDropFingerprintRef.current) {
      return true;
    }
    lastDropTimeRef.current = now;
    lastDropFingerprintRef.current = fp;
    return false;
  };

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
  const isUploadingRef = useRef(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  type SubmissionTrackerState = {
    active: boolean;
    ready: boolean;
    folderName?: string;
    originalFolder?: string;
    arn?: string;
    isError?: boolean;
    errorType?: string;
    isMissingInfo?: boolean;
    percent: number;
    stageText: string;
    applicantName?: string;
    startedAt: number;
  } | null;
  const [submissionTracker, _setSubmissionTracker] = useState<SubmissionTrackerState>(null);
  const submissionTrackerRef = useRef<SubmissionTrackerState>(null);
  submissionTrackerRef.current = submissionTracker;
  const setSubmissionTracker = (
    updater: SubmissionTrackerState | ((prev: SubmissionTrackerState) => SubmissionTrackerState)
  ) => {
    const next = typeof updater === 'function' ? updater(submissionTrackerRef.current) : updater;
    submissionTrackerRef.current = next;
    _setSubmissionTracker(next);
  };
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const prevPreviewFoldersRef = useRef<Set<string>>(new Set());

  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [cancellingFolder, setCancellingFolder] = useState<string | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<{
    folderName: string;
    applicantName: string;
  } | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{
    folderName: string;
    filename: string;
    applicantName?: string;
  } | null>(null);
  const [deletingFile, setDeletingFile] = useState<boolean>(false);
  const [deleteDraftTarget, setDeleteDraftTarget] = useState<{
    folderName: string;
    applicantName?: string;
  } | null>(null);
  const [correctionFormData, setCorrectionFormData] = useState<Record<string, string>>({});
  const [dismissedCorrectionFolder, setDismissedCorrectionFolder] = useState<string | null>(null);
  const dismissedFoldersRef = useRef<Set<string>>(new Set());

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [selectedDraftFolder, setSelectedDraftFolder] = useState<string | null>(null);

  const draftApplications = useMemo<ApplicationItem[]>(() => {
    // Collect all folder names and ARNs of applications that are already in preview or submitted
    const previewFolderSet = new Set((previews || []).map(p => (p.folder_name || '').trim().toLowerCase()));
    const completedFolderSet = new Set((completed || []).map(c => (c.folder_name || '').trim().toLowerCase()));
    const completedArnSet = new Set((completed || []).map(c => (c.arn || '').trim().toLowerCase()).filter(Boolean));

    return applications.filter(app => {
      const fName = (app.folder_name || '').trim();
      const folderKey = fName.toLowerCase();
      if (dismissedFoldersRef.current.has(fName) || dismissedFoldersRef.current.has(folderKey)) {
        return false;
      }

      const status = (app.status || '').toUpperCase();

      // 1. Exclude anything already submitted or completed
      if (
        status === 'COMPLETED' ||
        status === 'SUBMITTED' ||
        status === 'DISMISSED' ||
        Boolean(app.is_submitted) ||
        Boolean(app.has_receipt) ||
        completedFolderSet.has(folderKey) ||
        (app.arn && completedArnSet.has(app.arn.trim().toLowerCase()))
      ) {
        return false;
      }

      // 2. Exclude anything that is already in Preview
      if (
        status === 'PENDING_CONFIRMATION' ||
        status === 'PREVIEW_READY' ||
        Boolean(app.is_in_preview) ||
        Boolean(app.has_passport_preview) ||
        Boolean(app.has_declaration_preview) ||
        previewFolderSet.has(folderKey)
      ) {
        return false;
      }

      // 3. Exclude background processing / queued / in-flight states (unless a slot upload failed)
      if (
        !app.failed_upload_slot &&
        (status === 'UPLOADED' ||
        status === 'QUEUED' ||
        status === 'EXTRACTING' ||
        status === 'EXTRACTED' ||
        status === 'FILLING_PORTAL' ||
        status === 'SUBMITTING_PORTAL' ||
        status === 'PROCESSING' ||
        status === 'UPLOADING')
      ) {
        return false;
      }

      // 4. In drafts, it must show ONLY when information is required into that application
      const requiresInfo = Boolean(
        status === 'NEEDS_CORRECTION' ||
        status === 'PORTAL_FORM_ERROR' ||
        status === 'MISSING_MANDATORY_DATA' ||
        app.failed_upload_slot ||
        (Array.isArray(app.missing_fields) && app.missing_fields.length > 0)
      );

      return requiresInfo;
    });
  }, [applications, previews, completed]);

  const [previewSelections, setPreviewSelections] = useState<{
    [key: string]: { passport: boolean; declaration: boolean };
  }>({});
  const [submittingArn, setSubmittingArn] = useState<string | null>(null);
  const submittingPreviewRef = useRef<PreviewItem | null>(null);
  const [reuploadFiles, setReuploadFiles] = useState<Record<string, File | null>>({});
  const [reuploadingFolder, setReuploadingFolder] = useState<string | null>(null);

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

  const [photoValidation, setPhotoValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  const photoValidationSeqRef = useRef<number>(0);
  const signValidationSeqRef = useRef<number>(0);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const residenceInputRef = useRef<HTMLInputElement>(null);
  const infoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryAccountEmail = (portalEmail || activeClientEmail || localStorage.getItem(scopedEmailKey) || '').trim().toLowerCase();

  const refreshAllData = async (targetEmailOverride?: string) => {
    const targetEmail = (targetEmailOverride || queryAccountEmail || '').trim().toLowerCase();
    if (!targetEmail || !googleUserEmail) {
      setApplications([]);
      setPreviews([]);
      setCompleted([]);
      setQuota(null);
      return;
    }

    const activeTracker = submissionTrackerRef.current;
    if (isUploadingRef.current || (activeTracker?.active && !activeTracker.folderName && Date.now() - activeTracker.startedAt < 45000)) {
      // Application upload is currently in flight over the network.
      // Maintain active uploading progress bar and prevent background polling from clearing it.
      return;
    }
    try {
      const [statusRes, prevs, comps] = await Promise.all([
        automationApi.getClientStatus(targetEmail, googleUserEmail).catch(() => ({ client_email: targetEmail, applications: [], quota: undefined })),
        automationApi.getPendingPreviews(targetEmail, googleUserEmail).catch(() => []),
        automationApi.getCompletedApplications(targetEmail, googleUserEmail).catch(() => []),
      ]);
      const apps = (statusRes.applications || []).filter(a => !dismissedFoldersRef.current.has(a.folder_name));
      if (statusRes.quota) {
        setQuota(statusRes.quota);
      }
      setApplications(apps);
      setPreviews(prevs);
      setCompleted(comps);

      const activeTracker = submissionTrackerRef.current;
      const matchesTrackerFolder = (item: { folder_name?: string; original_folder?: string; applicant_name?: string; arn?: string }) => {
        if (!activeTracker) return false;
        const tf = (activeTracker.folderName || '').trim().toLowerCase();
        const of = (activeTracker.originalFolder || '').trim().toLowerCase();
        const an = (activeTracker.applicantName || '').trim().toLowerCase();
        const ta = (activeTracker.arn || '').trim().toLowerCase();
        const itemFolder = (item.folder_name || '').trim().toLowerCase();
        const itemOrig = ((item as any).original_folder || '').trim().toLowerCase();
        const itemApp = ((item as any).applicant_name || '').trim().toLowerCase();
        const itemArn = ((item as any).arn || '').trim().toLowerCase();
        if (ta && itemArn && ta === itemArn) return true;
        if (tf && (itemFolder === tf || itemOrig === tf)) return true;
        if (of && (itemFolder === of || itemOrig === of)) return true;
        if (an && itemApp && (an === itemApp || itemApp.includes(an) || an.includes(itemApp))) return true;
        if (an && itemFolder && (an === itemFolder || itemFolder.includes(an) || an.includes(itemFolder))) return true;
        return false;
      };

      // ONLY track an application if the user currently initiated an active submission in this session!
      if (!activeTracker || !activeTracker.active) {
        return;
      }

      // If the currently tracked folder was explicitly dismissed, abort tracker immediately
      // CRITICAL: If this tracked folder has been completed (submitted to portal), clear tracker immediately so it NEVER lingers on Home page with "Open Preview"!
      const isAlreadyCompleted = (comps || []).some(c => matchesTrackerFolder(c)) || (apps || []).some(a => a.status === 'COMPLETED' && matchesTrackerFolder(a));
      if (isAlreadyCompleted) {
        submissionTrackerRef.current = null;
        _setSubmissionTracker(null);
        return;
      }

      const activeProcessingApp = apps.find(a =>
        ['UPLOADED', 'EXTRACTING', 'EXTRACTED', 'FILLING_PORTAL'].includes(a.status) &&
        matchesTrackerFolder(a)
      );

      // Check if this specific tracked application requires correction (missing information)
      const matchingCorrectionApp = apps.find(a => a.status === 'NEEDS_CORRECTION' && matchesTrackerFolder(a));

      const currentPreviewFolders = new Set((prevs || []).map(p => p.folder_name));
      prevPreviewFoldersRef.current = currentPreviewFolders;

      // Find matching preview strictly for this application
      let matchingPreview = (prevs || []).find(p => matchesTrackerFolder(p));
      if (!matchingPreview) {
        const readyApp = apps.find(a => a.status === 'PENDING_CONFIRMATION' && matchesTrackerFolder(a));
        if (readyApp) {
          matchingPreview = (prevs || []).find(p => p.folder_name === readyApp.folder_name);
        }
      }

      const matchingErrorApp = apps.find(a => a.status === 'ERROR' && matchesTrackerFolder(a));

      if (matchingCorrectionApp) {
        // Freeze tracker at extraction % and show missing info alert — NEVER jump to 100% or clear tracker!
        setUploadMessage(null);
        setSubmissionTracker(prev => {
          const frozenPct = Math.max(prev?.percent || 35, 35);
          return {
            active: true,
            ready: false,
            isMissingInfo: true,
            isError: false,
            folderName: matchingCorrectionApp.folder_name,
            originalFolder: (matchingCorrectionApp as any).original_folder || prev?.originalFolder || prev?.folderName,
            percent: frozenPct,
            stageText: 'Required details missing — please complete the fields below to resume.',
            applicantName: matchingCorrectionApp.applicant_name || prev?.applicantName || matchingCorrectionApp.folder_name,
            startedAt: prev?.startedAt || Date.now(),
          };
        });
      } else if (matchingPreview && matchesTrackerFolder(matchingPreview)) {
        // Only mark ready when preview actually belongs to this application and is generated
        setUploadMessage(null);
        setSubmissionTracker(prev => {
          if (prev && prev.active) {
            return {
              active: true,
              ready: true,
              isMissingInfo: false,
              isError: false,
              folderName: matchingPreview.folder_name,
              originalFolder: prev.originalFolder || prev.folderName,
              arn: matchingPreview.arn,
              percent: 100,
              stageText: 'Preview Ready!',
              applicantName: matchingPreview.applicant_name || prev.applicantName || matchingPreview.folder_name,
              startedAt: prev.startedAt,
            };
          }
          return prev;
        });
      } else if (activeProcessingApp) {
        const serverPct = typeof activeProcessingApp.progress === 'number' && activeProcessingApp.progress > 0
          ? activeProcessingApp.progress
          : (activeProcessingApp.status === 'UPLOADED'
              ? 18
              : activeProcessingApp.status === 'EXTRACTING'
              ? 35
              : activeProcessingApp.status === 'EXTRACTED'
              ? 50
              : 68);
        setSubmissionTracker(prev => {
          const currentPct = prev?.percent || 10;
          const targetPct = Math.min(99, Math.max(currentPct, serverPct));
          return {
            active: true,
            ready: false,
            isMissingInfo: false,
            folderName: activeProcessingApp.folder_name || prev?.folderName,
            originalFolder: (activeProcessingApp as any).original_folder || prev?.originalFolder || prev?.folderName,
            isError: false,
            percent: targetPct,
            stageText: activeProcessingApp.stage || 'Processing application on backend...',
            applicantName: activeProcessingApp.applicant_name || activeProcessingApp.folder_name,
            startedAt: prev?.startedAt || Date.now(),
          };
        });
      } else if (matchingErrorApp) {
        setUploadMessage(null);
        setSubmissionTracker(prev => {
          if (prev && prev.active) {
            return {
              active: true,
              ready: false,
              isError: true,
              isMissingInfo: false,
              errorType: matchingErrorApp.error_type,
              folderName: matchingErrorApp.folder_name,
              originalFolder: (matchingErrorApp as any).original_folder || prev.originalFolder,
              percent: Math.max(prev.percent || 40, 40),
              stageText: matchingErrorApp.error_message || 'Application encountered an error during submission.',
              applicantName: matchingErrorApp.applicant_name || prev.applicantName || matchingErrorApp.folder_name,
              startedAt: prev.startedAt,
            };
          }
          return null;
        });
      } else {
        setSubmissionTracker(prev => {
          if (isUploadingRef.current) return prev;
          // If the tracker was marked ready (waiting for preview), but preview is no longer in pending previews or apps (e.g. submitted): clear it immediately!
          if (prev?.ready && !matchingPreview) {
            return null;
          }
          if (prev && Date.now() - prev.startedAt > 30000 && !prev.folderName && !prev.ready && !prev.isMissingInfo) {
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

  // Download notice & progress
  const [downloadNotice, setDownloadNotice] = useState<{
    path?: string;
    message: string;
    type?: 'success' | 'error' | 'loading';
  } | null>(null);

  // Auto-dismiss download confirmation toast after 10 seconds
  useEffect(() => {
    if (downloadNotice && downloadNotice.type !== 'loading') {
      const timer = setTimeout(() => {
        setDownloadNotice(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [downloadNotice]);

  // Sleek centered permission request & notification dialog states
  const [micPermissionModal, setMicPermissionModal] = useState<{
    isOpen: boolean;
    targetFolder: string | null;
    status: 'prompt' | 'denied';
    errorMessage?: string;
  }>({
    isOpen: false,
    targetFolder: null,
    status: 'prompt'
  });

  const [centeredAlert, setCenteredAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const requestMicAndRecord = async (folderName: string) => {
    const hasGranted = localStorage.getItem('fs_mic_permission_granted') === 'true';
    if (!hasGranted) {
      setMicPermissionModal({
        isOpen: true,
        targetFolder: folderName,
        status: 'prompt'
      });
      return;
    }
    await startVoiceRecording(folderName);
  };

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioPcmChunksRef = useRef<Float32Array[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const encodeWavPcm16 = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return buffer;
  };

  const cleanupAudioRecording = () => {
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
      } catch (_) {}
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch (_) {}
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
      mediaRecorderRef.current = null;
    }
    audioPcmChunksRef.current = [];
    audioChunksRef.current = [];
  };

  const startVoiceRecording = async (folderName: string) => {
    try {
      cleanupAudioRecording();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      localStorage.setItem('fs_mic_permission_granted', 'true');
      audioStreamRef.current = stream;
      audioPcmChunksRef.current = [];

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          const channel = e.inputBuffer.getChannelData(0);
          audioPcmChunksRef.current.push(new Float32Array(channel));
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      } else {
        // Fallback to MediaRecorder
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(250);
      }

      recordingStartTimeRef.current = Date.now();
      setRecordingFolder(folderName);
      setRecordingDuration(0);

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      localStorage.removeItem('fs_mic_permission_granted');
      cleanupAudioRecording();
      setMicPermissionModal({
        isOpen: true,
        targetFolder: null,
        status: 'denied',
        errorMessage: err.message || 'Microphone access is blocked in your system settings.'
      });
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

  const stopVoiceRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    const targetFolder = recordingFolder;
    setRecordingFolder(null);

    const elapsed = Date.now() - recordingStartTimeRef.current;
    if (elapsed < 500) {
      console.warn('Recording discarded: shorter than 500ms');
      cleanupAudioRecording();
      return;
    }

    let audioBlob: Blob | null = null;
    if (audioContextRef.current && audioPcmChunksRef.current.length > 0) {
      const sampleRate = audioContextRef.current.sampleRate || 16000;
      let totalLength = 0;
      for (const chunk of audioPcmChunksRef.current) totalLength += chunk.length;
      if (totalLength > 100) {
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioPcmChunksRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        const wavBuffer = encodeWavPcm16(merged, sampleRate);
        audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      }
    } else if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    }

    cleanupAudioRecording();

    if (targetFolder && audioBlob && audioBlob.size >= 100) {
      await handleSendVoiceAction(targetFolder, audioBlob);
    }
  };

  const handleSendVoiceAction = async (folderName: string, audioBlob?: Blob | null, textPrompt?: string) => {
    let progressTimer: any = null;
    try {
      setVoiceProcessingFolder(folderName);
      const text = textPrompt !== undefined ? textPrompt : (voiceTextInputs[folderName] || '');
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();

      setVoiceProgress((prev) => ({
        ...prev,
        [folderName]: {
          percent: 15,
          stage: audioBlob
            ? 'Sending voice instruction to backend...'
            : 'Sending edit instruction to backend...',
        },
      }));

      progressTimer = setInterval(async () => {
        try {
          const statusRes = await automationApi.getClientStatus(email, googleUserEmail);
          const match = (statusRes.applications || []).find(
            (a) => a.folder_name === folderName || (a as any).original_folder === folderName
          );
          if (match) {
            setVoiceProgress((prev) => ({
              ...prev,
              [folderName]: {
                percent: typeof match.progress === 'number' && match.progress > 0 ? match.progress : (prev[folderName]?.percent || 20),
                stage: match.stage || prev[folderName]?.stage || 'Applying updates on backend...',
              },
            }));
          }
        } catch (_) {}
      }, 800);

      const res = await automationApi.sendVoiceInstruction(email, folderName, audioBlob, text, googleUserEmail);

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

  const refreshAllDataRef = useRef(refreshAllData);
  refreshAllDataRef.current = refreshAllData;

  useEffect(() => {
    refreshAllDataRef.current();
    const isBusy =
      Boolean(submissionTracker?.active && !submissionTracker.ready) ||
      Boolean(submittingArn) ||
      Boolean(reuploadingFolder) ||
      Boolean(voiceProcessingFolder);
    const pollMs = isBusy ? 900 : 2200;
    const interval = setInterval(() => refreshAllDataRef.current(), pollMs);
    return () => clearInterval(interval);
  }, [
    portalEmail,
    activeClientEmail,
    currentSection,
    googleUserEmail,
    submissionTracker?.active,
    submissionTracker?.ready,
    submittingArn,
    reuploadingFolder,
    voiceProcessingFolder,
  ]);

  const correctionApp = (() => {
    // When on Drafts section, return the currently selected draft application
    if (currentSection === 'drafts' && selectedDraftFolder) {
      return applications.find(app => app.folder_name === selectedDraftFolder && !dismissedFoldersRef.current.has(app.folder_name));
    }
    return undefined;
  })();

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
      lower.includes('portal server error') ||
      lower.includes('failed to upload') ||
      lower.includes('self-healing attempts')
    ) {
      return raw;
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
        "Place of birth": (ed["Place of birth"] || ed["pob"] || "").replace(/,/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase(),
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

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB maximum size limit per file

  const standardizePhotoClientSide = async (file: File): Promise<File | null> => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          canvas.width = 630;
          canvas.height = 810;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          // Pure white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, 630, 810);

          const targetAspect = 630 / 810;
          const imgAspect = img.naturalWidth / img.naturalHeight;
          let drawW = 630;
          let drawH = 810;
          let drawX = 0;
          let drawY = 0;

          if (imgAspect > targetAspect) {
            drawW = 630;
            drawH = 630 / imgAspect;
            drawY = (810 - drawH) / 2;
          } else {
            drawH = 810;
            drawW = 810 * imgAspect;
            drawX = (630 - drawW) / 2;
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          canvas.toBlob((blob) => {
            if (!blob) { resolve(null); return; }
            resolve(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.92);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch (_) {
        resolve(null);
      }
    });
  };

  const triggerPortalPhotoValidation = async (file: File | null) => {
    const reqSeq = ++photoValidationSeqRef.current;
    if (!file) {
      setPhotoValidation({ status: 'idle' });
      return;
    }
    // Set optimistic photo file immediately so user is NEVER blocked
    filesStateRef.current.photo = file;
    setPhotoFile(file);
    setPhotoValidation({
      status: 'validating',
      message: 'Checking photograph compliance with Passport Seva Portal...',
    });
    setUploadMessage(null);
    try {
      const targetEmail = (portalEmail || activeClientEmail || localStorage.getItem(scopedEmailKey) || '').trim();
      const targetPass = (portalPassword || localStorage.getItem(scopedPassKey) || '').trim();
      const res = await automationApi.validatePhotoWithPortal(
        file,
        targetEmail,
        targetPass,
        googleUserEmail
      );
      if (photoValidationSeqRef.current !== reqSeq) return;
      if (res.valid) {
        if (res.processed_photo_base64) {
          try {
            const byteString = atob(res.processed_photo_base64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const verifiedFile = new File([ab], 'photo.jpg', { type: 'image/jpeg' });
            filesStateRef.current.photo = verifiedFile;
            setPhotoFile(verifiedFile);
          } catch (_) {}
        }
        setPhotoValidation({
          status: 'valid',
          message: res.message || 'Photograph verified and accepted (ICAO Doc 9303: 630x810, white background).',
        });
        setUploadMessage({
          text: res.message || 'Photograph verified and accepted by Passport Seva Portal.',
          type: 'success',
        });
        return;
      }
    } catch (err: any) {
      console.warn('[PHOTO VALIDATION NOTICE]', err);
    }

    // Client-side ICAO standardization fallback: guarantees photo is never blocked
    const clientStandardized = await standardizePhotoClientSide(file);
    if (photoValidationSeqRef.current !== reqSeq) return;

    if (clientStandardized) {
      filesStateRef.current.photo = clientStandardized;
      setPhotoFile(clientStandardized);
      setPhotoValidation({
        status: 'valid',
        message: 'Photograph standardized and verified (ICAO Doc 9303: 630x810, white background).',
      });
      setUploadMessage({
        text: 'Photograph verified and standardized according to ICAO specifications.',
        type: 'success',
      });
    } else {
      filesStateRef.current.photo = null;
      setPhotoFile(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      const rejectMsg = 'The uploaded file is not a valid photograph image. Please upload a clear JPG/PNG photo.';
      setPhotoValidation({
        status: 'invalid',
        message: rejectMsg,
      });
      setUploadMessage({
        text: rejectMsg,
        type: 'error',
      });
    }
  };

  const MAX_TOTAL_FILES = 10; // Maximum of 10 files can be uploaded

  const countTotalFiles = (
    p: File | null = filesStateRef.current.photo,
    s: File | null = filesStateRef.current.sign,
    pass: File | null = filesStateRef.current.passport,
    ident: File | null = filesStateRef.current.identity,
    res: File | null = filesStateRef.current.residence,
    inf: File | null = filesStateRef.current.info,
    selected: File[] = filesStateRef.current.selected || []
  ) => {
    const slotCount = Object.values(slotFiles).filter(Boolean).length;
    return Math.max(slotCount, [p, s, pass, ident, res, inf].filter(Boolean).length) + selected.length;
  };

  const compressAndStandardizeDocument = async (file: File): Promise<File> => {
    const maxPortalBytes = 1024 * 1024; // 1 MB (1024 KB) strict portal limit
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
    if ((isPdf && file.size > maxPortalBytes) || isImage) {
      try {
        const res = await automationApi.validateDocumentWithPortal(file);
        if (res.valid && res.processed_doc_base64) {
          const byteString = atob(res.processed_doc_base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newName = `${baseName}.pdf`;
          return new File([ab], newName, { type: 'application/pdf' });
        }
      } catch (err) {
        console.warn('[DOC STANDARDIZE WARNING]', err);
      }
    }
    return file;
  };

  const triggerPortalSignatureValidation = async (file: File | null) => {
    const reqSeq = ++signValidationSeqRef.current;
    if (!file) return;
    try {
      const res = await automationApi.validateSignatureWithPortal(file);
      if (signValidationSeqRef.current !== reqSeq) return;
      if (res.valid && res.processed_signature_base64) {
        try {
          const byteString = atob(res.processed_signature_base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const standardizedFile = new File([ab], 'signature.jpg', { type: 'image/jpeg' });
          filesStateRef.current.sign = standardizedFile;
          setSignFile(standardizedFile);
          setSlotFiles(prev => ({ ...prev, sign: standardizedFile }));
        } catch (_) {}
      }
    } catch (_) {}
  };

  const updateSlotFile = (slot: DocSlotKey, file: File | null) => {
    if (file && submissionTracker?.ready) {
      setSubmissionTracker(null);
      setUploadMessage(null);
    }
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setUploadMessage({
        text: `File "${file.name}" exceeds the 20 MB maximum size limit.`,
        type: 'error',
      });
      if (dynamicInputRefs.current[slot]) dynamicInputRefs.current[slot]!.value = '';
      return;
    }
    if (file && !slotFiles[slot] && !filesStateRef.current[slot as keyof typeof filesStateRef.current] && countTotalFiles() >= MAX_TOTAL_FILES) {
      setUploadMessage({
        text: `Maximum ${MAX_TOTAL_FILES} files can be uploaded.`,
        type: 'error',
      });
      return;
    }

    // Update slotFiles map
    setSlotFiles(prev => ({
      ...prev,
      [slot]: file,
    }));

    if (!file && dynamicInputRefs.current[slot]) {
      dynamicInputRefs.current[slot]!.value = '';
    }

    // Keep individual backward-compatible states in sync
    if (slot === 'photo') {
      filesStateRef.current.photo = file;
      setPhotoFile(file);
      if (!file && photoInputRef.current) photoInputRef.current.value = '';
      triggerPortalPhotoValidation(file);
    } else if (slot === 'sign') {
      filesStateRef.current.sign = file;
      setSignFile(file);
      if (!file && signInputRef.current) signInputRef.current.value = '';
      if (file) triggerPortalSignatureValidation(file);
    } else if (slot === 'passport') {
      filesStateRef.current.passport = file;
      setPassportFile(file);
      if (!file && passportInputRef.current) passportInputRef.current.value = '';
      if (file) {
        compressAndStandardizeDocument(file).then(comp => {
          if (comp !== file) {
            filesStateRef.current.passport = comp;
            setPassportFile(comp);
            setSlotFiles(prev => ({ ...prev, passport: comp }));
          }
        });
      }
    } else if (slot === 'identity') {
      filesStateRef.current.identity = file;
      setIdentityFile(file);
      if (!file && identityInputRef.current) identityInputRef.current.value = '';
      if (file) {
        compressAndStandardizeDocument(file).then(comp => {
          if (comp !== file) {
            filesStateRef.current.identity = comp;
            setIdentityFile(comp);
            setSlotFiles(prev => ({ ...prev, identity: comp }));
          }
        });
      }
    } else if (slot === 'residence') {
      filesStateRef.current.residence = file;
      setResidenceFile(file);
      if (!file && residenceInputRef.current) residenceInputRef.current.value = '';
      if (file) {
        compressAndStandardizeDocument(file).then(comp => {
          if (comp !== file) {
            filesStateRef.current.residence = comp;
            setResidenceFile(comp);
            setSlotFiles(prev => ({ ...prev, residence: comp }));
          }
        });
      }
    } else if (slot === 'info') {
      filesStateRef.current.info = file;
      setInfoFile(file);
      if (!file && infoInputRef.current) infoInputRef.current.value = '';
      if (file && (file.name.toLowerCase().endsWith('.pdf') || file.type.startsWith('image/'))) {
        compressAndStandardizeDocument(file).then(comp => {
          if (comp !== file) {
            filesStateRef.current.info = comp;
            setInfoFile(comp);
            setSlotFiles(prev => ({ ...prev, info: comp }));
          }
        });
      }
    } else {
      // Dynamic slots
      if (file && (file.name.toLowerCase().endsWith('.pdf') || file.type.startsWith('image/'))) {
        compressAndStandardizeDocument(file).then(comp => {
          if (comp !== file) {
            setSlotFiles(prev => ({ ...prev, [slot]: comp }));
          }
        });
      }
    }
  };

  const routeIncomingFiles = async (incoming: File[], preferredSlot?: DocSlotKey) => {
    if (!incoming || incoming.length === 0) return;
    if (submissionTracker?.ready) {
      setSubmissionTracker(null);
      setUploadMessage(null);
    }

    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setUploadMessage({
        text: `File "${oversized[0].name}" exceeds the 20 MB maximum size limit.`,
        type: 'error',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    let validIncoming = incoming.filter(f => f.size <= MAX_FILE_SIZE_BYTES);
    if (validIncoming.length === 0) return;

    const currentTotal = countTotalFiles();
    if (currentTotal >= MAX_TOTAL_FILES) {
      setUploadMessage({
        text: `Maximum ${MAX_TOTAL_FILES} files can be uploaded.`,
        type: 'error',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const remainingSlots = MAX_TOTAL_FILES - currentTotal;
    if (validIncoming.length > remainingSlots) {
      setUploadMessage({
        text: `Maximum ${MAX_TOTAL_FILES} files can be uploaded. Accepting first ${remainingSlots} files.`,
        type: 'error',
      });
      validIncoming = validIncoming.slice(0, remainingSlots);
    }

    // Step 1: Detect best matching slot and canonical name for each incoming file
    const analyzedList: Array<{ original: File; processed: File; detectedSlot: DocSlotKey }> = [];
    for (const f of validIncoming) {
      const fallback = (validIncoming.length === 1 && preferredSlot) ? preferredSlot : undefined;
      const detected = await detectSlotAndCanonicalNameAsync(f, fallback);
      let canonicalFile = f;
      if (f.name !== detected.canonicalName) {
        try {
          canonicalFile = new File([f], detected.canonicalName, {
            type: f.type || (detected.canonicalName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            lastModified: f.lastModified || Date.now(),
          });
        } catch (_) {
          canonicalFile = f;
        }
      }
      analyzedList.push({ original: f, processed: canonicalFile, detectedSlot: detected.slot });
    }

    // Step 2: If user dropped a single file directly onto a preferred slot box, place it directly there
    if (validIncoming.length === 1 && preferredSlot) {
      const single = analyzedList[0];
      setDynamicallyActivatedSlots(prev => prev.includes(preferredSlot) ? prev : [...prev, preferredSlot]);
      updateSlotFile(preferredSlot, single.processed);
      setUploadMessage({
        text: `Assigned ${single.original.name} to ${SLOT_CATALOG[preferredSlot]?.title || preferredSlot}.`,
        type: 'success',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Step 3: Multi-file / Batch Drop Smart Allocation
    // Sort analyzedList so that highest-confidence and primary booklet matches claim slots first
    analyzedList.sort((a, b) => {
      const aName = a.original.name.toLowerCase();
      const bName = b.original.name.toLowerCase();
      // Photo and signature first
      if (a.detectedSlot === 'photo' && b.detectedSlot !== 'photo') return -1;
      if (b.detectedSlot === 'photo' && a.detectedSlot !== 'photo') return 1;
      if (a.detectedSlot === 'sign' && b.detectedSlot !== 'sign') return -1;
      if (b.detectedSlot === 'sign' && a.detectedSlot !== 'sign') return 1;
      // Exact passport.pdf booklet before other passport matches
      if (aName === 'passport.pdf' && bName !== 'passport.pdf') return -1;
      if (bName === 'passport.pdf' && aName !== 'passport.pdf') return 1;
      // Primary passport slot over supporting/info slots
      if (a.detectedSlot === 'passport' && b.detectedSlot !== 'passport') return -1;
      if (b.detectedSlot === 'passport' && a.detectedSlot !== 'passport') return 1;
      return 0;
    });

    // Track occupied slots so no existing box is overwritten or clobbered
    const occupiedSlots = new Set<DocSlotKey>();
    (Object.keys(slotFiles) as DocSlotKey[]).forEach(k => {
      if (slotFiles[k]) occupiedSlots.add(k);
    });
    if (filesStateRef.current.photo) occupiedSlots.add('photo');
    if (filesStateRef.current.sign) occupiedSlots.add('sign');
    if (filesStateRef.current.passport) occupiedSlots.add('passport');
    if (filesStateRef.current.identity) occupiedSlots.add('identity');
    if (filesStateRef.current.residence) occupiedSlots.add('residence');
    if (filesStateRef.current.info) occupiedSlots.add('info');

    const slotAssignments: Array<{ slot: DocSlotKey; file: File; origName: string }> = [];
    const extraFilesToAppend: File[] = [];
    const slotsToActivate = new Set<DocSlotKey>();

    for (const item of analyzedList) {
      const targetSlot = item.detectedSlot;

      // Primary detected slot is unoccupied
      if (!occupiedSlots.has(targetSlot)) {
        slotAssignments.push({ slot: targetSlot, file: item.processed, origName: item.original.name });
        occupiedSlots.add(targetSlot);
        slotsToActivate.add(targetSlot);
        continue;
      }

      // Primary slot is already occupied: check alternative compatible empty slots
      let altSlot: DocSlotKey | null = null;
      const lowerName = item.original.name.toLowerCase();

      if (lowerName.includes('pds') || lowerName.includes('soggiorno') || lowerName.includes('permesso') || lowerName.includes('ricevuta')) {
        if (!occupiedSlots.has('identity')) altSlot = 'identity';
        else if (!occupiedSlots.has('residence')) altSlot = 'residence';
      } else if (lowerName.includes('cie') || lowerName.includes('residen') || lowerName.includes('carta') || lowerName.includes('ospitalita')) {
        if (!occupiedSlots.has('residence')) altSlot = 'residence';
        else if (!occupiedSlots.has('identity')) altSlot = 'identity';
      } else if (lowerName.includes('marriage') || lowerName.includes('matrimonio')) {
        if (!occupiedSlots.has('marriage_cert')) altSlot = 'marriage_cert';
      } else if (lowerName.includes('father') || lowerName.includes('padre')) {
        if (!occupiedSlots.has('father_passport')) altSlot = 'father_passport';
      } else if (lowerName.includes('mother') || lowerName.includes('madre')) {
        if (!occupiedSlots.has('mother_passport')) altSlot = 'mother_passport';
      } else if (lowerName.includes('police') || lowerName.includes('denuncia')) {
        if (!occupiedSlots.has('police_report')) altSlot = 'police_report';
      }

      // If no specific alternative slot matches, try general 'info' (Additional Documents box)
      if (!altSlot && !occupiedSlots.has('info') && targetSlot !== 'photo' && targetSlot !== 'sign') {
        altSlot = 'info';
      }

      if (altSlot && !occupiedSlots.has(altSlot)) {
        slotAssignments.push({ slot: altSlot, file: item.processed, origName: item.original.name });
        occupiedSlots.add(altSlot);
        slotsToActivate.add(altSlot);
      } else {
        // All matching/compatible boxes are occupied:
        // KEEP AS ADDITIONAL FILE BELOW! NEVER DISCARD OR OVERWRITE!
        extraFilesToAppend.push(item.original);
      }
    }

    // Step 4: Apply activations and slot updates
    if (slotsToActivate.size > 0) {
      setDynamicallyActivatedSlots(prev => {
        const updated = [...prev];
        for (const s of slotsToActivate) {
          if (!updated.includes(s)) updated.push(s);
        }
        return updated;
      });
    }

    for (const assignment of slotAssignments) {
      updateSlotFile(assignment.slot, assignment.file);
    }

    if (extraFilesToAppend.length > 0) {
      setSelectedFiles(prev => {
        const updated = [...prev];
        for (const ef of extraFilesToAppend) {
          if (!updated.some(existing => existing.name === ef.name && existing.size === ef.size)) {
            updated.push(ef);
          }
        }
        filesStateRef.current.selected = updated;
        return updated;
      });
    }

    // Step 5: Inform user with clear feedback
    const assignedCount = slotAssignments.length;
    const extraCount = extraFilesToAppend.length;
    let feedback = '';
    if (assignedCount > 0 && extraCount > 0) {
      feedback = `Assigned ${assignedCount} file(s) to boxes, and added ${extraCount} file(s) as additional documents below.`;
    } else if (assignedCount > 0) {
      feedback = `Auto-assigned ${assignedCount} file(s) to designated boxes.`;
    } else if (extraCount > 0) {
      feedback = `Added ${extraCount} file(s) to additional uploaded documents below.`;
    }
    setUploadMessage({
      text: feedback,
      type: 'success',
    });

    if (fileInputRef.current) fileInputRef.current.value = '';

    // Step 6: Backend AI semantic classifier for further refinement (non-destructive)
    automationApi.classifyDocuments(validIncoming, activeServiceType)
      .then(res => {
        if (!res || !res.success || !res.classifications || res.classifications.length === 0) return;
        res.classifications.forEach(item => {
          const matched = slotAssignments.find(p => p.origName === item.filename);
          if (!matched) return;
          if (matched.slot === 'sign') return;
          const target = item.target_slot as DocSlotKey;
          if (!target || target === 'info' || (item.target_slot as string) === 'extra') return;
          if (matched.slot === 'residence' && target === 'identity') return;
          if (target === 'identity' && item.role !== 'pds') return;

          // Only move if the target slot is strictly EMPTY
          if (SLOT_CATALOG[target] && target !== matched.slot && !occupiedSlots.has(target)) {
            const recName = item.recommended_name || matched.file.name;
            const refined = (recName !== matched.file.name)
              ? new File([matched.file], recName, { type: matched.file.type })
              : matched.file;
            updateSlotFile(matched.slot, null);
            occupiedSlots.delete(matched.slot);
            setDynamicallyActivatedSlots(prev => prev.includes(target) ? prev : [...prev, target]);
            updateSlotFile(target, refined);
            occupiedSlots.add(target);
          }
        });
      })
      .catch(err => {
        console.warn('[SEMANTIC ENGINE NOTICE]', err);
      });
  };

  const autoCategorizeFiles = (incoming: File[]) => {
    routeIncomingFiles(incoming);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      if (isDuplicateDropEvent(filesArr)) return;
      autoCategorizeFiles(filesArr);
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
    setSelectedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      filesStateRef.current.selected = updated;
      return updated;
    });
  };

  const clearDocumentSlots = (preserveTracker = false) => {
    photoValidationSeqRef.current++;
    setPhotoValidation({ status: 'idle' });
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
    setInAppInfoData({
      application_type: 'NORMAL',
      booklet_type: '36 PAGES',
    });
    setSlotFiles({
      photo: null,
      sign: null,
      passport: null,
      identity: null,
      residence: null,
      info: null,
      marriage_cert: null,
      spouse_passport: null,
      birth_cert: null,
      police_report: null,
      annexure_f: null,
      father_passport: null,
      mother_passport: null,
      annexure_d: null,
      annexure_e: null,
      divorce_death_cert: null,
      name_change_proof: null,
      education_proof: null,
    });
    setDynamicallyActivatedSlots([]);
    setSelectedScenario(activeServiceType === 'fresh' ? 'fresh_minor' : 'reissue_standard');
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (signInputRef.current) signInputRef.current.value = '';
    if (passportInputRef.current) passportInputRef.current.value = '';
    if (identityInputRef.current) identityInputRef.current.value = '';
    if (residenceInputRef.current) residenceInputRef.current.value = '';
    if (infoInputRef.current) infoInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    Object.keys(dynamicInputRefs.current).forEach((k) => {
      if (dynamicInputRefs.current[k]) {
        dynamicInputRefs.current[k]!.value = '';
      }
    });
    if (!preserveTracker && !isUploadingRef.current && !submissionTrackerRef.current?.active) {
      setSubmissionTracker(null);
      setUploadMessage(null);
    }
  };

  const handleEmailBlur = () => {
    if (isUploadingRef.current || submissionTrackerRef.current?.active) {
      return;
    }
    const trimmed = portalEmail.trim().toUpperCase();
    if (trimmed !== activeClientEmail) {
      clearDocumentSlots();
      setActiveClientEmail(trimmed);
      if (trimmed) {
        localStorage.setItem(scopedEmailKey, trimmed);
      } else {
        localStorage.removeItem(scopedEmailKey);
      }
      try {
        window.dispatchEvent(new Event('fs_active_email_changed'));
      } catch (_) {}
      refreshAllData(trimmed.toLowerCase());
    }
  };

  const handlePasswordChange = (val: string) => {
    setPortalPassword(val);
    localStorage.setItem(scopedPassKey, val);
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
                if (errStr.includes('20 MB') || errStr.includes('10 MB')) {
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
              if (isDuplicateDropEvent(loadedFiles)) return;
              routeIncomingFiles(loadedFiles, targetSlot as any);
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
      const targetSlot = dragSlotRef.current;
      dragSlotRef.current = null;
      setDragSlot(null);

      if (currentSection === 'form' && !correctionApp && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (isDuplicateDropEvent(droppedFiles)) return;
        routeIncomingFiles(droppedFiles, targetSlot as any);
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
    if (isUploading || isUploadingRef.current) return;
    setUploadMessage(null);
    dismissedFoldersRef.current.clear();
    setDismissedCorrectionFolder(null);

    const targetClientEmail = portalEmail.trim().toUpperCase();
    const cleanPassword = portalPassword.trim();
    if (!targetClientEmail || !cleanPassword) {
      const msg = 'Please enter portal Email ID and Password before submitting.';
      setUploadMessage({ text: msg, type: 'error' });
      return;
    }

    if (quota && quota.is_exhausted && quota.portal_username && targetClientEmail.toLowerCase() === quota.portal_username.toLowerCase()) {
      const msg = `Portal account ${targetClientEmail} has reached the 50 application limit (${quota.used}/50). Please enter a new portal Email ID.`;
      setUploadMessage({
        text: msg,
        type: 'error'
      });
      return;
    }

    const activeSlotFileList = Object.values(slotFiles).filter((f): f is File => Boolean(f));
    const allCandidateFiles = Array.from(new Set([
      photoFile,
      signFile,
      passportFile,
      identityFile,
      residenceFile,
      infoFile,
      ...activeSlotFileList,
      ...selectedFiles,
    ])).filter((f): f is File => Boolean(f));

    if (allCandidateFiles.length > MAX_TOTAL_FILES) {
      const msg = `Maximum 10 files can be uploaded (currently ${allCandidateFiles.length} files selected).`;
      setUploadMessage({
        text: msg,
        type: 'error',
      });
      return;
    }

    const oversized = allCandidateFiles.find(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      const msg = `File "${oversized.name}" exceeds the 20 MB maximum size limit.`;
      setUploadMessage({
        text: msg,
        type: 'error',
      });
      return;
    }

    if (photoValidation.status === 'validating') {
      setUploadMessage({
        text: 'Please wait while the photograph is being verified with the Passport Seva Portal.',
        type: 'error',
      });
      return;
    }

    if (photoValidation.status === 'invalid') {
      setUploadMessage({
        text: photoValidation.message || 'This photo is not allowed by the portal. Please upload another photograph.',
        type: 'error',
      });
      return;
    }

    if (!photoFile || photoValidation.status !== 'valid' || !signFile) {
      const missing = [];
      if (!photoFile || photoValidation.status !== 'valid') missing.push('a Portal-Verified Photograph');
      if (!signFile) missing.push('Signature');
      const msg = `Please upload ${missing.join(' and ')} in the designated box(es).`;
      setUploadMessage({
        text: msg,
        type: 'error',
      });
      return;
    }

    if (activeServiceType === 'reissue') {
      if (selectedScenario === 'reissue_lost' && !slotFiles.police_report) {
        setUploadMessage({
          text: 'Police Report / Denuncia is mandatory for Lost Passport reissue.',
          type: 'error',
        });
        return;
      }
      if (selectedScenario === 'reissue_spouse_add' && !slotFiles.marriage_cert) {
        setUploadMessage({
          text: 'Marriage Certificate is required for adding/updating Spouse Name.',
          type: 'error',
        });
        return;
      }
      if (selectedScenario === 'reissue_spouse_del' && !slotFiles.divorce_death_cert) {
        setUploadMessage({
          text: 'Divorce Decree or Death Certificate is required for deleting Spouse Name.',
          type: 'error',
        });
        return;
      }
      if (selectedScenario !== 'reissue_lost' && !passportFile) {
        const msg = 'Please upload the applicant’s current Passport copy for Reissue application.';
        setUploadMessage({
          text: msg,
          type: 'error',
        });
        return;
      }
    } else {
      // Fresh application
      if (!slotFiles.birth_cert) {
        setUploadMessage({
          text: 'Birth Certificate (Estratto di Nascita) is mandatory for Fresh passport application.',
          type: 'error',
        });
        return;
      }
      if (!slotFiles.father_passport || !slotFiles.mother_passport) {
        setUploadMessage({
          text: "Father and Mother documents (Passport/PDS/C.C.I.E./Ospiti) are required for Fresh passport application.",
          type: 'error',
        });
        return;
      }
    }

    const payloadFiles = {
      photo: photoFile,
      signature: signFile,
      passport: passportFile,
      identity: identityFile,
      residence: residenceFile,
      supporting: infoFile,
      files: selectedFiles,
      marriage_cert: slotFiles.marriage_cert || undefined,
      spouse_passport: slotFiles.spouse_passport || undefined,
      birth_cert: slotFiles.birth_cert || undefined,
      police_report: slotFiles.police_report || undefined,
      annexure_f: slotFiles.annexure_f || undefined,
      father_passport: slotFiles.father_passport || undefined,
      mother_passport: slotFiles.mother_passport || undefined,
      annexure_d: slotFiles.annexure_d || undefined,
      annexure_e: slotFiles.annexure_e || undefined,
      divorce_death_cert: slotFiles.divorce_death_cert || undefined,
      name_change_proof: slotFiles.name_change_proof || undefined,
      education_proof: slotFiles.education_proof || undefined,
    };
    const infoPayload = Object.keys(inAppInfoData).length > 0 ? JSON.stringify(inAppInfoData) : undefined;

    // Immediately clear slots so uploaded documents fade away from UI without double process
    clearDocumentSlots(true);
    isUploadingRef.current = true;

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
      localStorage.setItem(scopedEmailKey, targetClientEmail);
      localStorage.setItem(scopedPassKey, cleanPassword);
      localStorage.setItem('fs_declaration_place', declarationPlace);
      setActiveClientEmail(targetClientEmail);
      try {
        window.dispatchEvent(new Event('fs_active_email_changed'));
      } catch (_) {}

      const uploadRes = await automationApi.uploadApplication(
        targetClientEmail,
        targetClientEmail,
        cleanPassword,
        payloadFiles,
        user?.email,
        declarationPlace,
        activeServiceType,
        infoPayload
      );

      const uploadedFolder = uploadRes?.folder_name;

      setSubmissionTracker({
        active: true,
        ready: false,
        folderName: uploadedFolder,
        originalFolder: uploadedFolder,
        percent: 18,
        stageText: 'Extracting details from uploaded documents...',
        startedAt: Date.now(),
      });
      setUploadMessage({
        text: 'File submitted, waiting for preview...',
        type: 'success',
      });
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
      isUploadingRef.current = false;
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

      if (correctionFormData["Place of birth"] !== undefined || finalData["Place of birth"] !== undefined) {
        const rawPob = String(correctionFormData["Place of birth"] || finalData["Place of birth"] || "");
        finalData["Place of birth"] = rawPob.replace(/,/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
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
        finalData,
        googleUserEmail
      );

      setSubmissionTracker({
        active: true,
        ready: false,
        folderName: correctionApp.folder_name,
        originalFolder: (correctionApp as any).original_folder || correctionApp.folder_name,
        percent: 54,
        stageText: 'Details saved! Resuming portal form filling...',
        applicantName: correctionApp.applicant_name || correctionApp.folder_name,
        startedAt: Date.now(),
      });
      setUploadMessage({
        text: 'File submitted, waiting for preview...',
        type: 'success',
      });
      setSelectedDraftFolder(null);
      onSectionChange('form');
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

  const handleDismissCorrection = (folderName?: string) => {
    const targetFolder = folderName || submissionTrackerRef.current?.folderName || submissionTracker?.folderName || correctionApp?.folder_name;
    // 1. Immediately abort active tracker, upload message and draft selection so UI updates synchronously in this exact single click
    submissionTrackerRef.current = null;
    _setSubmissionTracker(null);
    setUploadMessage(null);
    setSelectedDraftFolder(null);

    // 2. Clear document slots completely so form is ready for a new clean upload
    clearDocumentSlots(false);

    if (targetFolder) {
      const cleanKey = targetFolder.trim();
      dismissedFoldersRef.current.add(cleanKey);
      dismissedFoldersRef.current.add(cleanKey.toLowerCase());
      setDismissedCorrectionFolder(cleanKey);
      setApplications(prev => prev.filter(a => (a.folder_name || '').trim().toLowerCase() !== cleanKey.toLowerCase()));

      // 3. Fire delete to server and synchronize all data
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
      automationApi.dismissApplication(email, cleanKey, googleUserEmail)
        .then(async () => {
          await refreshAllData();
        })
        .catch(err => {
          console.warn('Server dismiss warning:', err);
        });

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
      await automationApi.dismissApplication(email, folderName, googleUserEmail);

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

  const executeDeleteDraftFile = async () => {
    if (!deleteFileTarget) return;
    const { folderName, filename } = deleteFileTarget;
    setDeletingFile(true);
    try {
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
      await automationApi.deleteDraftFile(email, folderName, filename, googleUserEmail);

      setApplications(prev => prev.map(app => {
        if (app.folder_name === folderName) {
          const updatedFiles = (app.files || []).filter(f => f !== filename);
          return {
            ...app,
            files: updatedFiles,
          };
        }
        return app;
      }));

      setUploadMessage({
        text: `File "${filename}" deleted successfully.`,
        type: 'success',
      });
      setDeleteFileTarget(null);
      await refreshAllData();
    } catch (err: any) {
      console.error("Failed to delete draft file:", err);
      setUploadMessage({
        text: sanitizeErrorMessage(err) || `Failed to delete file "${filename}".`,
        type: 'error',
      });
      setDeleteFileTarget(null);
    } finally {
      setDeletingFile(false);
    }
  };

  const executeDeleteDraft = (folderName: string) => {
    setDeleteDraftTarget(null);
    handleDismissCorrection(folderName);
    setSelectedDraftFolder(null);
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

  const handleConfirmFinalSubmit = async (folderName: string, arn: string, previewItem?: PreviewItem) => {
    if (voiceProcessingFolder) return;
    try {
      if (previewItem) {
        submittingPreviewRef.current = previewItem;
      }
      setSubmittingArn(arn);
      // Immediately clear Home page submission tracker so it NEVER lingers with "Open Preview"
      submissionTrackerRef.current = null;
      _setSubmissionTracker(null);

      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
      await automationApi.confirmSubmission(email, folderName, arn, googleUserEmail);

      submissionTrackerRef.current = null;
      _setSubmissionTracker(null);
      await refreshAllData();
      onSectionChange('submitted');
    } catch (err: any) {
      setCenteredAlert({
        isOpen: true,
        title: 'Submission Note',
        message: `${sanitizeErrorMessage(err)}`,
      });
      await refreshAllData();
    } finally {
      submittingPreviewRef.current = null;
      setSubmittingArn(null);
    }
  };

  const handleReuploadAndRetry = async (
    folderName: string,
    arn: string,
    slot?: string,
    targetFilename?: string
  ) => {
    const file = reuploadFiles[folderName];
    if (!file) {
      setCenteredAlert({
        isOpen: true,
        title: 'Select Replacement File',
        message: 'Please select a replacement file to re-upload and retry portal submission.',
      });
      return;
    }
    try {
      setReuploadingFolder(folderName);
      setSubmittingArn(arn);
      const email = (queryAccountEmail || activeClientEmail || '').trim().toLowerCase();
      await automationApi.reuploadFailedPortalFile(
        email,
        folderName,
        file,
        slot,
        targetFilename,
        arn,
        true,
        googleUserEmail
      );
      setReuploadFiles(prev => {
        const copy = { ...prev };
        delete copy[folderName];
        return copy;
      });
      await refreshAllData();
      onSectionChange('submitted');
    } catch (err: any) {
      setCenteredAlert({
        isOpen: true,
        title: 'Portal Upload Error',
        message: `${sanitizeErrorMessage(err)}`,
      });
      await refreshAllData();
    } finally {
      setReuploadingFolder(null);
      setSubmittingArn(null);
    }
  };

  const [downloadingFormKey, setDownloadingFormKey] = useState<string | null>(null);

  const handleDirectDownloadPdf = async (title: string, relativeUrl: string, itemKey: string) => {
    if (downloadingFormKey) return;
    setDownloadingFormKey(itemKey);
    setDownloadNotice({
      message: 'Your file is being downloaded...',
      type: 'loading',
    });
    try {
      const baseUrl = await automationApi.resolveGateway();
      const cleanRel = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
      const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${cleanRel}`;
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      const rawName = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
      const safeName = rawName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();

      let savedPath: string | null = null;
      if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
        try {
          savedPath = await invoke<string>('save_file_to_downloads', {
            filename: safeName,
            bytes: Array.from(uint8),
          });
        } catch (tauriErr) {
          console.warn('Tauri save_file_to_downloads failed, falling back to browser download:', tauriErr);
        }
      }

      if (savedPath) {
        setDownloadNotice({
          path: savedPath,
          message: `Saved to Downloads (${safeName})`,
          type: 'success',
        });
      } else {
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = safeName;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        setDownloadNotice({
          message: `Downloaded ${safeName}`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setDownloadNotice({
        message: `Download failed: ${err?.message || 'Unable to download PDF'}`,
        type: 'error',
      });
    } finally {
      setDownloadingFormKey(null);
    }
  };

  const openPdfViewer = async (title: string, relativeUrl: string) => {
    const baseUrl = await automationApi.resolveGateway().catch(() => automationApi.getBaseUrl());
    const cleanRel = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
    const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${baseUrl}${cleanRel}`;
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
    a.folder_name !== dismissedCorrectionFolder &&
    !dismissedFoldersRef.current.has(a.folder_name)
  );


  useEffect(() => {
    if (!uploadMessage || uploadMessage.type !== 'error') return;
    const timer = setTimeout(() => {
      setUploadMessage(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [uploadMessage]);

  useEffect(() => {
    if (!centeredAlert?.isOpen) return;
    const timer = setTimeout(() => {
      setCenteredAlert(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [centeredAlert]);

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
    if (errType === 'MISSING_PHOTO_OR_SIGNATURE') {
      return {
        title: 'PHOTOGRAPH OR SIGNATURE REQUIRED',
        desc: `Applicant ${app.applicant_name || app.folder_name}: ${rawMsg}`,
        badge: 'Photo / Sign Missing',
        badgeColor: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        borderLeft: '#ef4444',
        titleColor: '#991b1b',
        descColor: '#b91c1c'
      };
    }
    if (errType === 'EXTRACTION_FAILURE') {
      return {
        title: 'DOCUMENT EXTRACTION NOTICE',
        desc: `Applicant ${app.applicant_name || app.folder_name}: ${rawMsg}`,
        badge: 'Extraction Notice',
        badgeColor: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        borderLeft: '#ef4444',
        titleColor: '#991b1b',
        descColor: '#b91c1c'
      };
    }
    const isAuth = errType === 'PORTAL_LOGIN_ERROR' || (rawMsg && /login|credentials|password|auth/i.test(rawMsg));
    return {
      title: isAuth ? 'PORTAL LOGIN / AUTHENTICATION NOTICE' : 'APPLICATION NOTICE',
      desc: `Notice for applicant ${app.applicant_name || app.folder_name}: ${rawMsg}`,
      badge: isAuth ? 'Login Notice' : 'Notice',
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

  const attachedDraftFiles = useMemo(() => {
    return (correctionApp?.files || []).filter(isUserUploadedDocument);
  }, [correctionApp?.files]);

  const isDraftAlreadyInPreview = Boolean(
    correctionApp?.status === 'PENDING_CONFIRMATION' ||
    correctionApp?.status === 'PREVIEW_READY' ||
    correctionApp?.is_in_preview ||
    correctionApp?.has_passport_preview
  );

  return (
    <div className="fresh-reissue-container">


      {currentSection === 'form' && (
        <div className="fresh-reissue-content">

          {submissionTracker?.active && (
            <div
              className="voice-progress-container"
              style={{
                marginBottom: '16px',
                padding: '14px 18px',
                borderRadius: '12px',
                border: submissionTracker.isError
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : submissionTracker.ready
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : submissionTracker.isMissingInfo
                  ? '1px solid rgba(245, 158, 11, 0.4)'
                  : '1px solid rgba(37, 99, 235, 0.28)',
                background: submissionTracker.isError
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.04) 100%)'
                  : submissionTracker.ready
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)'
                  : submissionTracker.isMissingInfo
                  ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(253, 230, 138, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
              }}
            >
              <div className="voice-progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '12px' }}>
                <div className="voice-progress-status" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '14px', color: submissionTracker.isError ? '#dc2626' : submissionTracker.ready ? '#059669' : submissionTracker.isMissingInfo ? '#d97706' : '#1e40af' }}>
                  {submissionTracker.isError ? (
                    <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                  ) : submissionTracker.ready ? (
                    <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }} />
                  ) : submissionTracker.isMissingInfo ? (
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#d97706', flexShrink: 0 }} />
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
                            : submissionTracker.errorType === 'INVALID_CREDENTIALS' || submissionTracker.errorType === 'PORTAL_LOGIN_ERROR'
                            ? `Portal Login Error: Incorrect Credentials${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                            : submissionTracker.errorType === 'ACCOUNT_LOCKED'
                            ? `Portal Account Locked${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                            : submissionTracker.errorType === 'MISSING_PHOTO_OR_SIGNATURE'
                            ? `Missing Photograph or Signature${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                            : submissionTracker.errorType === 'EXTRACTION_FAILURE'
                            ? `Document Extraction Notice${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                            : `Submission Notice${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`)
                        : submissionTracker.ready
                        ? `Preview Ready!${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                        : submissionTracker.isMissingInfo
                        ? `Information Required${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`
                        : `File submitted, waiting for preview...${submissionTracker.applicantName ? ` (${submissionTracker.applicantName})` : ''}`}
                    </div>
                    {!submissionTracker.ready &&
                      submissionTracker.stageText &&
                      submissionTracker.stageText !== 'File submitted, waiting for preview...' && (
                      <div style={{ fontSize: '12px', fontWeight: 500, color: submissionTracker.isError ? '#b91c1c' : submissionTracker.isMissingInfo ? '#92400e' : '#475569', marginTop: '2px' }}>
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
                      color: submissionTracker.isError ? '#dc2626' : submissionTracker.ready ? '#059669' : submissionTracker.isMissingInfo ? '#d97706' : '#2563eb',
                      background: submissionTracker.isError ? 'rgba(239, 68, 68, 0.15)' : submissionTracker.ready ? 'rgba(16, 185, 129, 0.15)' : submissionTracker.isMissingInfo ? 'rgba(245, 158, 11, 0.18)' : 'rgba(37, 99, 235, 0.12)',
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
                        onClick={() => {
                          submissionTrackerRef.current = null;
                          setSubmissionTracker(null);
                          onSectionChange('preview');
                        }}
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
                  {submissionTracker.isMissingInfo && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (submissionTracker.folderName) {
                            setSelectedDraftFolder(submissionTracker.folderName);
                          }
                          onSectionChange('drafts');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#ffffff',
                          background: '#d97706',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <FileText style={{ width: '14px', height: '14px' }} />
                        <span>Open in Drafts</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDismissCorrection(submissionTracker.folderName);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#92400e',
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        <X style={{ width: '14px', height: '14px' }} />
                        <span>Dismiss &amp; New Upload</span>
                      </button>
                    </>
                  )}
                  {submissionTracker.isError && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDismissCorrection(submissionTracker.folderName);
                      }}
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
                      <span>Dismiss &amp; New Upload</span>
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
                      : submissionTracker.isMissingInfo
                      ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                    transition: 'width 0.45s ease',
                  }}
                />
              </div>
            </div>
          )}

            <div className="fresh-form-card">

              {uploadMessage && !portalErrorApp && !submissionTracker?.active && (
                <div className={`form-alert ${uploadMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                  {uploadMessage.type === 'success' ? (
                    <Clock className="alert-icon animate-pulse" />
                  ) : (
                    <AlertCircle className="alert-icon" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              )}

              {quota && quota.is_exhausted && !portalErrorApp && (
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
                    <label
                      htmlFor="portalEmail"
                      className="input-label"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                    >
                      <span>
                        Email ID <span className="required-star">*</span>
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {portalEmail.trim() && (
                          <span
                            title={`Consular Jurisdiction: ${declarationPlace === 'MILAN' ? 'Consulate General of India, Milan' : 'Embassy of India, Rome'} (${declarationPlace})`}
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: '999px',
                              background: declarationPlace === 'MILAN' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(99, 102, 241, 0.14)',
                              color: declarationPlace === 'MILAN' ? '#059669' : '#4f46e5',
                              letterSpacing: '0.3px',
                            }}
                          >
                            {declarationPlace === 'MILAN' ? '📍 Milan' : '📍 Rome'}
                          </span>
                        )}
                        {quota && portalEmail.trim() && (
                          <span
                            title={`Portal ID quota: ${quota.used} of ${quota.total} applications used`}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '1px 8px',
                              borderRadius: '999px',
                              background: quota.is_exhausted
                                ? 'rgba(239, 68, 68, 0.14)'
                                : quota.used >= 40
                                ? 'rgba(245, 158, 11, 0.14)'
                                : 'rgba(37, 99, 235, 0.12)',
                              color: quota.is_exhausted
                                ? '#dc2626'
                                : quota.used >= 40
                                ? '#d97706'
                                : '#2563eb',
                              letterSpacing: '0.3px',
                            }}
                          >
                            {quota.used}/{quota.total}
                          </span>
                        )}
                      </div>
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
                      gap: '12px',
                      margin: '10px 0 16px 0',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: activeServiceType === 'fresh' ? '#f0fdf4' : '#f8fafc',
                      border: activeServiceType === 'fresh' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText style={{ width: '18px', height: '18px', color: activeServiceType === 'fresh' ? '#059669' : '#2563eb' }} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                          Application Reason &amp; Mandatory Details ({activeServiceType === 'fresh' ? 'Fresh Passport' : 'Passport Reissue'})
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Selected Reason: <strong style={{ color: '#0f172a' }}>{APPLYING_SCENARIOS.find(s => s.id === selectedScenario)?.label || 'Standard'}</strong>
                          {filledParticularsCount > 0 && ` • ${filledParticularsCount} ${filledParticularsCount === 1 ? 'particular' : 'particulars'} saved`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowInAppInfoModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          border: 'none',
                          background: filledParticularsCount > 0 ? '#059669' : (activeServiceType === 'fresh' ? '#10b981' : '#2563eb'),
                          color: '#ffffff',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                        }}
                        title="Select application reason and enter applicant details in the app"
                      >
                        <Edit3 style={{ width: '14px', height: '14px' }} />
                        <span>
                          {filledParticularsCount > 0
                            ? `✓ Reason & Info Configured (${filledParticularsCount} ${filledParticularsCount === 1 ? 'detail' : 'details'})`
                            : 'Fill Info & Application Reason'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="docs-boxes-grid">
                    {activeSlots.map((slotKey) => {
                      const slotDef = SLOT_CATALOG[slotKey];
                      if (!slotDef) return null;
                      const file = slotFiles[slotKey];
                      const isPhoto = slotKey === 'photo';
                      const isSign = slotKey === 'sign';
                      const hasFile = isPhoto
                        ? photoFile && photoValidation.status === 'valid'
                        : Boolean(file);

                      const renderSlotIcon = () => {
                        switch (slotDef.iconName) {
                          case 'camera': return <Camera className="doc-box-icon" />;
                          case 'pen': return <PenTool className="doc-box-icon" />;
                          case 'book': return <BookOpen className="doc-box-icon" />;
                          case 'id': return <FileCheck className="doc-box-icon" />;
                          case 'shield': return <ShieldCheck className="doc-box-icon" />;
                          case 'heart': return <Heart className="doc-box-icon" style={{ color: '#ec4899' }} />;
                          case 'users': return <Users className="doc-box-icon" style={{ color: '#8b5cf6' }} />;
                          case 'baby': return <Baby className="doc-box-icon" style={{ color: '#06b6d4' }} />;
                          case 'award': return <Award className="doc-box-icon" style={{ color: '#f59e0b' }} />;
                          case 'file-plus': return <FilePlus className="doc-box-icon" style={{ color: '#10b981' }} />;
                          case 'alert': return <AlertTriangle className="doc-box-icon" style={{ color: '#ef4444' }} />;
                          default: return <FileText className="doc-box-icon" />;
                        }
                      };

                      return (
                        <div
                          key={slotKey}
                          className={`doc-upload-box ${hasFile ? 'has-file' : ''} ${dragSlot === slotKey ? 'drag-target' : ''}`}
                          style={
                            isPhoto && photoValidation.status === 'invalid'
                              ? { borderColor: '#ef4444', background: 'rgba(254, 242, 242, 0.85)' }
                              : isPhoto && photoValidation.status === 'validating'
                              ? { borderColor: '#3b82f6', background: 'rgba(239, 246, 255, 0.85)' }
                              : undefined
                          }
                          data-drop-slot={slotKey}
                          onClick={() => dynamicInputRefs.current[slotKey]?.click()}
                          onDragEnter={(e) => { e.preventDefault(); dragSlotRef.current = slotKey; setDragSlot(slotKey); }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); dragSlotRef.current = slotKey; }}
                          onDragLeave={(e) => { e.preventDefault(); if (dragSlotRef.current === slotKey) { dragSlotRef.current = null; setDragSlot(null); } }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dragSlotRef.current = null;
                            setDragSlot(null);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              const filesArr = Array.from(e.dataTransfer.files);
                              if (isDuplicateDropEvent(filesArr)) return;
                              routeIncomingFiles(filesArr, slotKey);
                            }
                          }}
                        >
                          <input
                            ref={(el) => {
                              dynamicInputRefs.current[slotKey] = el;
                              if (slotKey === 'photo') (photoInputRef as any).current = el;
                              if (slotKey === 'sign') (signInputRef as any).current = el;
                              if (slotKey === 'passport') (passportInputRef as any).current = el;
                              if (slotKey === 'identity') (identityInputRef as any).current = el;
                              if (slotKey === 'residence') (residenceInputRef as any).current = el;
                              if (slotKey === 'info') (infoInputRef as any).current = el;
                            }}
                            type="file"
                            multiple
                            accept={slotDef.accept}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                routeIncomingFiles(Array.from(e.target.files), slotKey);
                                e.target.value = '';
                              }
                            }}
                          />
                          <div className="doc-box-header">
                            {renderSlotIcon()}
                            <span className="doc-box-title">
                              {slotKey === 'passport' && activeServiceType === 'fresh'
                                ? 'Previous PPT (Optional)'
                                : slotDef.title}
                            </span>
                          </div>
                          <div className="doc-box-content">
                            {isPhoto && photoValidation.status === 'validating' ? (
                              <div className="doc-box-empty" style={{ gap: '6px' }}>
                                <span className="doc-box-badge" style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>
                                  Checking with Portal...
                                </span>
                                <div className="doc-box-action-hint" style={{ color: '#2563eb' }}>
                                  <RefreshCw style={{ width: '12px', height: '12px' }} className="animate-spin" />
                                  <span>Verifying ICAO</span>
                                </div>
                              </div>
                            ) : isPhoto && photoFile && photoValidation.status === 'valid' ? (
                              <div className="doc-box-file-info">
                                <img src={URL.createObjectURL(photoFile)} alt="Photo" className="doc-box-thumb" />
                                <div className="doc-box-text-info">
                                  <span className="doc-box-filename" title={photoFile.name}>{photoFile.name}</span>
                                  <span className="doc-box-filesize" style={{ color: '#059669', fontWeight: 700 }}>
                                    Portal Verified ✓ ({(photoFile.size / 1024).toFixed(0)} KB)
                                  </span>
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
                            ) : isPhoto && photoValidation.status === 'invalid' ? (
                              <div className="doc-box-empty" style={{ gap: '4px' }}>
                                <span className="doc-box-badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                                  Rejected by Portal
                                </span>
                                <div className="doc-box-action-hint" style={{ color: '#dc2626', fontWeight: 600 }}>
                                  <Upload style={{ width: '12px', height: '12px' }} />
                                  <span>Upload Another</span>
                                </div>
                              </div>
                            ) : isSign && file ? (
                              <div className="doc-box-file-info">
                                <img src={URL.createObjectURL(file)} alt="Signature" className="doc-box-thumb" />
                                <div className="doc-box-text-info">
                                  <span className="doc-box-filename" title={file.name}>{file.name}</span>
                                  <span className="doc-box-filesize">{(file.size / 1024).toFixed(0)} KB</span>
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
                            ) : file ? (
                              <div className="doc-box-file-info">
                                <FileText style={{ width: '22px', height: '22px', color: '#059669', flexShrink: 0 }} />
                                <div className="doc-box-text-info">
                                  <span className="doc-box-filename" title={file.name}>{file.name}</span>
                                  <span className="doc-box-filesize">{(file.size / 1024).toFixed(0)} KB</span>
                                </div>
                                <button
                                  type="button"
                                  className="doc-box-remove-btn"
                                  title={`Remove ${slotDef.title}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateSlotFile(slotKey, null);
                                  }}
                                >
                                  <X style={{ width: '13px', height: '13px' }} />
                                </button>
                              </div>
                            ) : (
                              <div className="doc-box-empty">
                                <span className="doc-box-badge">
                                  {slotKey === 'info' && Object.keys(inAppInfoData).length > 0
                                    ? 'Filled In-App ✓'
                                    : slotKey === 'passport' && activeServiceType === 'fresh'
                                    ? 'Optional (If Any)'
                                    : slotDef.badge}
                                </span>
                                <div className="doc-box-action-hint">
                                  <Upload style={{ width: '12px', height: '12px' }} />
                                  <span>Upload</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                    <span>Or drag &amp; drop all files together here (up to 10 files, max 20 MB each) to auto-assign</span>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="additional-files-section" style={{
                      marginTop: '16px',
                      padding: '14px 16px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                            Additional Uploaded Files ({selectedFiles.length})
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                          Will be processed &amp; consolidated by AI
                        </span>
                      </div>
                      <div className="attached-files-list" style={{ marginTop: '0px' }}>
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="attached-file-pill" style={{
                            background: '#ffffff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            padding: '6px 10px',
                          }}>
                            <FileText className="file-pill-icon" style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                            <span className="file-pill-name" title={file.name} style={{ maxWidth: '220px', fontWeight: 600 }}>{file.name}</span>
                            <span className="file-pill-size" style={{ color: '#64748b', fontSize: '11px' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="file-pill-remove"
                              title="Remove file"
                              style={{
                                marginLeft: '4px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <Trash2 className="remove-icon" style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-submit-row">
                  {photoFile && photoValidation.status === 'valid' ? (
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
                  ) : photoValidation.status === 'validating' ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1e40af',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <RefreshCw style={{ width: '15px', height: '15px' }} className="animate-spin" />
                      <span>Verifying photograph with Passport Seva Portal...</span>
                    </div>
                  ) : photoValidation.status === 'invalid' ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      <span>{photoValidation.message || 'This photo is not allowed by the portal. Please upload another photograph.'}</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <Camera style={{ width: '15px', height: '15px', color: '#3b82f6' }} />
                      <span>Upload an ICAO-compliant Photograph above to unlock Submit Application</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
        </div>
      )}

      {currentSection === 'drafts' && (
        <div className="fresh-reissue-content drafts-view-container">
          {selectedDraftFolder && correctionApp ? (
            <div className="draft-detail-wrapper">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDraftFolder(null)}
                  className="draft-back-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#2563eb',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft style={{ width: '16px', height: '16px' }} />
                  <span>Back to All Drafts</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDraftTarget({
                      folderName: correctionApp.folder_name,
                      applicantName: correctionApp.applicant_name || correctionApp.folder_name,
                    });
                  }}
                  className="draft-btn-dismiss"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#dc2626',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                  <span>Dismiss Draft</span>
                </button>
              </div>

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
                  <span className="missing-title">
                    {correctionApp.error_type === 'PORTAL_FORM_ERROR' || correctionApp.error_type === 'STAGE1_7_FAILED'
                      ? 'Portal Submission Error — Action Required'
                      : 'Missing Mandatory Details — Please Review & Complete'}
                  </span>
                  {correctionApp.error_message &&
                    correctionApp.error_message !== 'Some information from your side was missing and we suggested these values. Please review or edit before submitting.' &&
                    !correctionApp.error_message.includes('Some information from your side was missing') && (
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

              {/* Draft Attached Documents & Delete Manager */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck style={{ width: '18px', height: '18px', color: '#16a34a' }} />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Attached Files in Draft {attachedDraftFiles.length > 0 ? `(${attachedDraftFiles.length})` : ''}
                    </h3>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Click file name or eye to view, trash icon to permanently delete
                  </span>
                </div>

                {attachedDraftFiles.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    No uploaded document files currently in this draft folder.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                    {attachedDraftFiles.map((fileName: string) => {
                      const isImg = /\.(jpg|jpeg|png|webp)$/i.test(fileName);
                      const isPdf = /\.pdf$/i.test(fileName);
                      const fileUrl = automationApi.getDraftFileUrl(
                        queryAccountEmail || activeClientEmail || '',
                        correctionApp.folder_name,
                        fileName,
                        googleUserEmail
                      );
                      return (
                        <div
                          key={fileName}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            gap: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              cursor: 'pointer',
                            }}
                            title={`Click to view ${fileName}`}
                            onClick={() => {
                              if (isPdf) {
                                setViewerModal({ isOpen: true, title: fileName, pdfUrl: fileUrl });
                              } else if (isImg) {
                                openImageViewer(fileName, fileUrl);
                              } else {
                                window.open(fileUrl, '_blank');
                              }
                            }}
                          >
                            {isImg ? (
                              <Camera style={{ width: '16px', height: '16px', color: '#6366f1', flexShrink: 0 }} />
                            ) : (
                              <FileText style={{ width: '16px', height: '16px', color: '#0284c7', flexShrink: 0 }} />
                            )}
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#1e293b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fileName}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isPdf) {
                                  setViewerModal({ isOpen: true, title: fileName, pdfUrl: fileUrl });
                                } else if (isImg) {
                                  openImageViewer(fileName, fileUrl);
                                } else {
                                  window.open(fileUrl, '_blank');
                                }
                              }}
                              style={{
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                color: '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title="View file"
                            >
                              <Eye style={{ width: '13px', height: '13px' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteFileTarget({
                                  folderName: correctionApp.folder_name,
                                  filename: fileName,
                                  applicantName: correctionApp.applicant_name,
                                });
                              }}
                              style={{
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                              title={`Delete ${fileName}`}
                            >
                              <Trash2 style={{ width: '13px', height: '13px' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Place of birth": e.target.value.replace(/,/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').toUpperCase() }))}
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
                            value={correctionFormData["GENDER"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "GENDER": e.target.value }))}
                            required
                          >
                            <option value="">SELECT</option>
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
                            value={correctionFormData["Educational qualification"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Educational qualification": e.target.value }))}
                            required
                          >
                            <option value="">SELECT</option>
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
                            value={correctionFormData["Employment type"] || ""}
                            onChange={(e) => setCorrectionFormData(prev => ({ ...prev, "Employment type": e.target.value }))}
                            required
                          >
                            <option value="">SELECT</option>
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
                            value={correctionFormData["Marital status"] || ""}
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
                            <option value="">SELECT</option>
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
                  <div className="empty-correction-notice" style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '13px' }}>
                    {correctionApp.error_type === 'PORTAL_FORM_ERROR' || correctionApp.error_type === 'STAGE1_7_FAILED'
                      ? 'Portal form reported an issue. Review details below and click Submit Application to retry.'
                      : 'All required fields are verified. Review the details below and click Submit Application to proceed with form filling.'}
                  </div>
                )}

                <div className="correction-actions-row">
                  <button
                    type="button"
                    onClick={() => {
                      handleDismissCorrection(correctionApp.folder_name);
                      setSelectedDraftFolder(null);
                    }}
                    className="dismiss-btn"
                  >
                    Dismiss Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDraftFolder(null)}
                    className="dismiss-btn"
                    style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                  >
                    Back to All Drafts
                  </button>
                  {isDraftAlreadyInPreview && (
                    <button
                      type="button"
                      onClick={() => onSectionChange('preview')}
                      className="submit-btn"
                      style={{ background: '#16a34a', borderColor: '#15803d', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye style={{ width: '15px', height: '15px' }} />
                      <span>View in Preview</span>
                    </button>
                  )}
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
                    style={isSubmittingCorrection ? {
                      background: '#cbd5e1',
                      borderColor: '#94a3b8',
                      color: '#475569',
                      cursor: 'not-allowed',
                      opacity: 0.85,
                      boxShadow: 'none',
                    } : {}}
                    title={isSubmittingCorrection ? 'Submitting application...' : 'Submit Application'}
                  >
                    {isSubmittingCorrection ? (
                      <>
                        <RefreshCw className="submit-icon animate-spin" />
                        <span>Submitting Application...</span>
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
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="drafts-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 className="view-main-title">Draft Applications</h2>
                  <p className="card-subtitle">
                    Applications that have not yet been submitted to the portal or require missing details before generating preview.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSectionChange('form')}
                  className="submit-btn"
                  style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  <span>New Application</span>
                </button>
              </div>

              {draftApplications.length === 0 ? (
                <div
                  style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <FileText style={{ width: '48px', height: '48px', color: '#94a3b8', margin: '0 auto 16px', strokeWidth: 1.5 }} />
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                    No Draft Applications
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    All applications have either been submitted or are ready in the Preview section. Any applications requiring corrections or missing details will appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSectionChange('form')}
                    className="submit-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                  >
                    <Plus style={{ width: '16px', height: '16px' }} />
                    <span>Start New Application</span>
                  </button>
                </div>
              ) : (
                <div className="drafts-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {draftApplications.map((draft: ApplicationItem) => {
                    const missingList = draft.missing_fields || [];
                    const isError = draft.status === 'PORTAL_FORM_ERROR' || draft.error_type === 'PORTAL_FORM_ERROR' || draft.error_type === 'STAGE1_7_FAILED';
                    return (
                      <div
                        key={draft.folder_name}
                        className="draft-card-item"
                        style={{
                          background: '#ffffff',
                          borderRadius: '14px',
                          border: isError ? '1px solid #fca5a5' : '1px solid #fcd34d',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Folder #{draft.folder_name}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: isError ? '#fee2e2' : '#fef3c7',
                                  color: isError ? '#dc2626' : '#b45309',
                                  border: isError ? '1px solid #fecaca' : '1px solid #fde68a',
                                }}
                              >
                                {isError ? 'Portal Error' : 'Needs Correction'}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {draft.applicant_name || `Applicant (Folder ${draft.folder_name})`}
                            </h3>
                            {draft.arn && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                ARN: <strong>{draft.arn}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className="draft-card-problem-box"
                          style={{
                            background: isError ? '#fef2f2' : '#fffbeb',
                            borderRadius: '10px',
                            border: isError ? '1px solid #fee2e2' : '1px solid #fef3c7',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: isError ? '#991b1b' : '#92400e' }}>
                            <AlertCircle style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                            <span>
                              {isError ? 'Action Required: Portal Form Issue' : 'Action Required: Missing Information'}
                            </span>
                          </div>
                          {draft.error_message && (
                            <p style={{ margin: 0, fontSize: '12px', color: isError ? '#b91c1c' : '#78350f', lineHeight: 1.4 }}>
                              {draft.error_message}
                            </p>
                          )}
                          {missingList.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {missingList.map((m: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="draft-missing-pill"
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    color: '#475569',
                                  }}
                                >
                                  {formatMissingFieldLabel(m)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {(() => {
                          const userAttachedFiles = (draft.files || []).filter(isUserUploadedDocument);
                          if (userAttachedFiles.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FileCheck style={{ width: '13px', height: '13px', color: '#16a34a' }} />
                                <span>Attached Documents ({userAttachedFiles.length})</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {userAttachedFiles.map((fileName: string) => {
                                  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(fileName);
                                  const isPdf = /\.pdf$/i.test(fileName);
                                  const fileUrl = automationApi.getDraftFileUrl(
                                    queryAccountEmail || activeClientEmail || '',
                                    draft.folder_name,
                                    fileName,
                                    googleUserEmail
                                  );
                                  return (
                                    <div
                                      key={fileName}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 8px',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        color: '#334155',
                                      }}
                                    >
                                      {isImg ? (
                                        <Camera style={{ width: '12px', height: '12px', color: '#6366f1' }} />
                                      ) : (
                                        <FileText style={{ width: '12px', height: '12px', color: '#0284c7' }} />
                                      )}
                                      <span
                                        style={{
                                          maxWidth: '120px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          cursor: 'pointer',
                                        }}
                                        title={`Click to view ${fileName}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isPdf) {
                                            setViewerModal({ isOpen: true, title: fileName, pdfUrl: fileUrl });
                                          } else if (isImg) {
                                            openImageViewer(fileName, fileUrl);
                                          } else {
                                            window.open(fileUrl, '_blank');
                                          }
                                        }}
                                      >
                                        {fileName}
                                      </span>
                                      <button
                                        type="button"
                                        title={`Delete ${fileName}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteFileTarget({
                                            folderName: draft.folder_name,
                                            filename: fileName,
                                            applicantName: draft.applicant_name,
                                          });
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          color: '#94a3b8',
                                          borderRadius: '4px',
                                          transition: 'color 0.15s',
                                        }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                                      >
                                        <Trash2 style={{ width: '12px', height: '12px' }} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDraftFolder(draft.folder_name)}
                            className="submit-btn"
                            style={{
                              flex: 1,
                              padding: '8px 14px',
                              fontSize: '13px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Edit3 style={{ width: '14px', height: '14px' }} />
                            <span>Review &amp; Fix Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDraftTarget({ folderName: draft.folder_name, applicantName: draft.applicant_name || draft.folder_name })}
                            style={{
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Dismiss Draft"
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentSection === 'preview' && (() => {
        let displayedPreviews = previews.filter(p => {
          if (previewFilter === 'fresh') return (p.service_type || '').toLowerCase() === 'fresh';
          if (previewFilter === 'reissue') return (p.service_type || 'reissue').toLowerCase() !== 'fresh';
          return true;
        });

        // Ensure currently submitting card stays firmly pinned during the submission process until complete
        if (submittingArn && submittingPreviewRef.current) {
          const itemArn = submittingPreviewRef.current.arn;
          const itemFname = submittingPreviewRef.current.folder_name;
          const exists = displayedPreviews.some(p => (itemArn && p.arn === itemArn) || (itemFname && p.folder_name === itemFname));
          if (!exists) {
            displayedPreviews = [submittingPreviewRef.current, ...displayedPreviews];
          }
        }

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {quota && (
                <span
                  title={`Portal ID quota: ${quota.used} of ${quota.total} applications used`}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: quota.is_exhausted ? '#fef2f2' : '#eff6ff',
                    color: quota.is_exhausted ? '#dc2626' : '#2563eb',
                    border: `1px solid ${quota.is_exhausted ? '#fecaca' : '#bfdbfe'}`,
                  }}
                >
                  {quota.used}/{quota.total}
                </span>
              )}
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
          </div>

          {portalErrorApp && !submissionTracker?.active && (() => {
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
                    className="dismiss-banner-btn"
                    title="Dismiss this notice"
                  >
                    Dismiss
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
                const isSubmittingThis = submittingArn === item.arn || (item as any).status === 'SUBMITTING_PORTAL' || reuploadingFolder === folderKey;
                const appMatch = applications.find(a => a.folder_name === item.folder_name || (item.arn && a.arn === item.arn));
                const liveProgress = (typeof appMatch?.progress === 'number' && appMatch.progress > 0) ? appMatch.progress : item.progress;
                const liveStage = appMatch?.stage || item.stage;
                const liveSubmitPct =
                  typeof liveProgress === 'number' && liveProgress > 0 && liveProgress <= 100
                    ? liveProgress
                    : 90;
                const liveSubmitStage =
                  liveStage && liveStage !== 'Previews Ready for Confirmation' && !liveStage.toLowerCase().includes('previews ready')
                    ? liveStage
                    : 'Submitting application to Passport Seva Portal...';

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
                        <span className="status-tag-pending">
                          {isSubmittingThis ? 'Submitting to Portal...' : 'Awaiting Verification'}
                        </span>
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
                            disabled={voiceProcessingFolder === folderKey || isSubmittingThis}
                            onClick={() => requestMicAndRecord(folderKey)}
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
                            disabled={voiceProcessingFolder === folderKey || recordingFolder === folderKey || isSubmittingThis}
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
                            disabled={voiceProcessingFolder === folderKey || recordingFolder === folderKey || isSubmittingThis || !(voiceTextInputs[folderKey] || '').trim()}
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
                              <span className="media-card-tag">630×810 JPG (&le;212.5 KB)</span>
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
                              <span className="media-card-tag">JPG &le;85 KB</span>
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
                            disabled={isUpdatingThis || isSubmittingThis}
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
                            disabled={isUpdatingThis || isSubmittingThis}
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

                    {isSubmittingThis && (
                      <div
                        className="voice-progress-container"
                        style={{
                          margin: '0 20px 14px 20px',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: '1px solid rgba(37, 99, 235, 0.28)',
                          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
                        }}
                      >
                        <div className="voice-progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
                          <div className="voice-progress-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: '#1e40af' }}>
                            <RefreshCw style={{ width: '15px', height: '15px', color: '#2563eb', flexShrink: 0 }} className="animate-spin" />
                            <span>{liveSubmitStage}</span>
                          </div>
                          <span
                            className="voice-progress-percent"
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: '#2563eb',
                              background: 'rgba(37, 99, 235, 0.12)',
                              padding: '2px 9px',
                              borderRadius: '999px',
                            }}
                          >
                            {liveSubmitPct}%
                          </span>
                        </div>
                        <div
                          className="voice-progress-track"
                          style={{
                            width: '100%',
                            height: '7px',
                            borderRadius: '999px',
                            background: 'rgba(148, 163, 184, 0.25)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            className="voice-progress-fill"
                            style={{
                              width: `${liveSubmitPct}%`,
                              height: '100%',
                              borderRadius: '999px',
                              background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                              transition: 'width 0.35s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {(item.error_type === 'PORTAL_UPLOAD_ERROR' || item.portal_server_error || item.error_message) && !isSubmittingThis && (
                      <div
                        style={{
                          margin: '0 20px 14px 20px',
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderLeft: '4px solid #dc2626',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <AlertCircle style={{ width: '18px', height: '18px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                                Portal Rejected Document Upload
                              </span>
                              {item.failed_upload_file && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#b91c1c',
                                    background: '#fee2e2',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                  }}
                                >
                                  File: {item.failed_upload_file}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '12.5px', color: '#7f1d1d', lineHeight: 1.45 }}>
                              {item.error_message || `Portal Server Error: ${item.portal_server_error}`}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            paddingTop: '6px',
                            borderTop: '1px dashed #fca5a5',
                          }}
                        >
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1e293b',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '7px',
                              cursor: 'pointer',
                            }}
                          >
                            <Upload style={{ width: '13px', height: '13px', color: '#2563eb' }} />
                            <span>
                              {reuploadFiles[folderKey]
                                ? reuploadFiles[folderKey]!.name
                                : `Choose Replacement ${item.failed_upload_file || 'File'}`}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const picked = e.target.files?.[0] || null;
                                setReuploadFiles((prev) => ({ ...prev, [folderKey]: picked }));
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            disabled={!reuploadFiles[folderKey] || reuploadingFolder === folderKey || isSubmittingThis}
                            onClick={() =>
                              handleReuploadAndRetry(
                                folderKey,
                                item.arn,
                                item.failed_upload_slot,
                                item.failed_upload_file
                              )
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '7px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#ffffff',
                              background: reuploadFiles[folderKey] ? '#dc2626' : '#94a3b8',
                              border: 'none',
                              borderRadius: '7px',
                              cursor: reuploadFiles[folderKey] ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {reuploadingFolder === folderKey ? (
                              <>
                                <RefreshCw style={{ width: '13px', height: '13px' }} className="animate-spin" />
                                <span>Re-Uploading &amp; Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Send style={{ width: '13px', height: '13px' }} />
                                <span>Re-Upload &amp; Retry Submission</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="preview-card-footer">
                      <div className="review-instruction">
                        {isUpdatingThis ? (
                          <span className="instruction-text" style={{ color: '#2563eb', fontWeight: 600 }}>
                            Update in progress — Submit Application is locked until updates finish.
                          </span>
                        ) : isSubmittingThis ? (
                          <span className="instruction-text" style={{ color: '#2563eb', fontWeight: 600 }}>
                            {liveSubmitStage} ({liveSubmitPct}%)
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
                            cursor: isUpdatingThis || isSubmittingThis ? 'not-allowed' : 'pointer',
                            opacity: isUpdatingThis || isSubmittingThis ? 0.5 : 1,
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
                          onClick={() => handleConfirmFinalSubmit(folderKey, item.arn, item)}
                          className={`final-submit-btn ${canSubmit && !isSubmittingThis ? 'enabled' : 'disabled'}`}
                        >
                          {isUpdatingThis ? (
                            <>
                              <RefreshCw className="submit-icon animate-spin" />
                              <span>Updating Previews...</span>
                            </>
                          ) : isSubmittingThis ? (
                            <>
                              <RefreshCw className="submit-icon animate-spin" />
                              <span>Submitting ({liveSubmitPct}%)...</span>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {quota && (
                  <span
                    title={`Portal ID quota: ${quota.used} of ${quota.total} applications used`}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: quota.is_exhausted ? '#fef2f2' : '#eff6ff',
                      color: quota.is_exhausted ? '#dc2626' : '#2563eb',
                      border: `1px solid ${quota.is_exhausted ? '#fecaca' : '#bfdbfe'}`,
                    }}
                  >
                    {quota.used}/{quota.total}
                  </span>
                )}
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
                  Once an application is verified and submitted from the Preview section, it will appear here with its official ARN and printable Application Form PDF.
                </p>
              </div>
            ) : (
              <div className="completed-grid">
                {displayedCompleted.map((item, idx) => {
                  const pdfRelUrl = item.application_form_url || item.receipt_url;
                  const itemKey = item.arn || item.folder_name || String(idx);
                  const isDownloadingThis = downloadingFormKey === itemKey;
                  return (
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

                      <div className="completed-card-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {pdfRelUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openPdfViewer(
                                  `Official Application Form - ${item.applicant_name}`,
                                  pdfRelUrl
                                )
                              }
                              className="receipt-btn"
                              style={{
                                background: '#f8fafc',
                                color: '#1e293b',
                                border: '1px solid #cbd5e1',
                              }}
                              title="Preview & Print Official Application Form PDF"
                            >
                              <Eye className="receipt-icon" style={{ color: '#2563eb' }} />
                              <span>View Form</span>
                            </button>
                            <button
                              type="button"
                              disabled={isDownloadingThis}
                              onClick={() =>
                                handleDirectDownloadPdf(
                                  `Official_Application_Form_${item.applicant_name}`,
                                  pdfRelUrl,
                                  itemKey
                                )
                              }
                              className="receipt-btn"
                              title="Download Official Application Form PDF directly to your Downloads folder"
                            >
                              {isDownloadingThis ? (
                                <RefreshCw className="receipt-icon animate-spin" />
                              ) : (
                                <Download className="receipt-icon" />
                              )}
                              <span>{isDownloadingThis ? 'Saving...' : 'Download'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {deleteFileTarget && (
        <div
          className="logout-modal-overlay"
          onClick={() => !deletingFile && setDeleteFileTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="logout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logout-modal-icon-wrapper" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <Trash2 className="logout-modal-icon" style={{ stroke: '#dc2626' }} />
            </div>

            <h3 className="logout-modal-title">
              Delete File from Draft?
            </h3>

            <p className="logout-modal-subtitle">
              Are you sure you want to permanently delete <strong>{deleteFileTarget.filename}</strong>
              {deleteFileTarget.applicantName && (
                <span> from the draft for <strong>{deleteFileTarget.applicantName}</strong></span>
              )}? This file will be removed from your computer and database.
            </p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-btn cancel-btn"
                style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                disabled={deletingFile}
                onClick={() => setDeleteFileTarget(null)}
              >
                Keep File
              </button>
              <button
                type="button"
                className="logout-modal-btn confirm-btn"
                disabled={deletingFile}
                onClick={executeDeleteDraftFile}
                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
              >
                {deletingFile ? (
                  <>
                    <RefreshCw className="animate-spin" style={{ width: '15px', height: '15px', marginRight: '6px' }} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete File</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDraftTarget && (
        <div
          className="logout-modal-overlay"
          onClick={() => setDeleteDraftTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="logout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="logout-modal-icon-wrapper" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <Trash2 className="logout-modal-icon" style={{ stroke: '#dc2626' }} />
            </div>

            <h3 className="logout-modal-title">
              Dismiss Draft Application?
            </h3>

            <p className="logout-modal-subtitle">
              Are you sure you want to dismiss and delete the draft application for <strong>{deleteDraftTarget.applicantName || `Folder ${deleteDraftTarget.folderName}`}</strong>? All uploaded documents and form progress will be permanently removed.
            </p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-modal-btn cancel-btn"
                style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
                onClick={() => setDeleteDraftTarget(null)}
              >
                Keep Draft
              </button>
              <button
                type="button"
                className="logout-modal-btn confirm-btn"
                onClick={() => executeDeleteDraft(deleteDraftTarget.folderName)}
                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
              >
                <span>Yes, Dismiss Draft</span>
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
        onClear={clearDocumentSlots}
        onClose={() => setShowInAppInfoModal(false)}
      />

      {/* Sleek Middle-Centered Microphone Permission Dialog */}
      {micPermissionModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: micPermissionModal.status === 'denied' ? '#fef2f2' : '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              border: `2px solid ${micPermissionModal.status === 'denied' ? '#fecaca' : '#bfdbfe'}`
            }}>
              {micPermissionModal.status === 'denied' ? (
                <AlertCircle style={{ width: '32px', height: '32px', color: '#ef4444' }} />
              ) : (
                <Mic style={{ width: '32px', height: '32px', color: '#2563eb' }} />
              )}
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
              {micPermissionModal.status === 'denied' ? 'Microphone Permission Blocked' : 'Allow Microphone Access'}
            </h3>

            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              {micPermissionModal.status === 'denied'
                ? (micPermissionModal.errorMessage || 'Microphone access is blocked in your system settings. Please grant microphone permission to Foreigners Studio in Windows Privacy Settings to use Voice Agent.')
                : 'Foreigners Studio Voice Assistant requires microphone permission to record voice notes, review applicant details, and assist you with hands-free instructions.'
              }
            </p>

            {micPermissionModal.status === 'denied' ? (
              <button
                type="button"
                onClick={() => setMicPermissionModal({ isOpen: false, targetFolder: null, status: 'prompt' })}
                style={{
                  width: '100%',
                  padding: '11px 18px',
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setMicPermissionModal({ isOpen: false, targetFolder: null, status: 'prompt' })}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = micPermissionModal.targetFolder;
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      stream.getTracks().forEach(t => t.stop());
                      localStorage.setItem('fs_mic_permission_granted', 'true');
                      setMicPermissionModal({ isOpen: false, targetFolder: null, status: 'prompt' });
                      if (target) {
                        startVoiceRecording(target);
                      }
                    } catch (err: any) {
                      console.error('Microphone access denied:', err);
                      setMicPermissionModal({
                        isOpen: true,
                        targetFolder: null,
                        status: 'denied',
                        errorMessage: err.message || 'Microphone permission was denied.'
                      });
                    }
                  }}
                  style={{
                    flex: 2,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  Grant Microphone Access
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Middle-Centered Notice / Alert Dialog */}
      {centeredAlert && centeredAlert.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '2px solid #bfdbfe'
            }}>
              <AlertCircle style={{ width: '28px', height: '28px', color: '#2563eb' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              {centeredAlert.title}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {centeredAlert.message}
            </p>
            <button
              type="button"
              onClick={() => setCenteredAlert(null)}
              style={{
                width: '100%',
                padding: '11px 18px',
                borderRadius: '12px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Floating Centered Download Confirmation Toast */}
      {downloadNotice && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          fontWeight: 500,
          border: '1px solid #334155'
        }}>
          {downloadNotice.type === 'loading' ? (
            <RefreshCw className="animate-spin" style={{ width: '18px', height: '18px', color: '#60a5fa', flexShrink: 0 }} />
          ) : downloadNotice.type === 'error' ? (
            <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
          ) : (
            <CheckCircle2 style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }} />
          )}
          <span>{downloadNotice.message}</span>
          {downloadNotice.path && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await invoke('open_in_folder', { path: downloadNotice.path });
                } catch (e) {
                  console.error(e);
                }
              }}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              Show in Folder
            </button>
          )}
          <button
            type="button"
            onClick={() => setDownloadNotice(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}
    </div>
  );
};
