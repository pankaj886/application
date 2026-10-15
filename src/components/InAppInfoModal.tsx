import React, { useState, useEffect } from 'react';
import { X, Save, FileText, RotateCcw, FileCheck, ShieldCheck } from 'lucide-react';

interface InAppInfoModalProps {
  isOpen: boolean;
  serviceType: 'reissue' | 'fresh' | 'surrender' | 'pcc';
  initialData: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onClear?: () => void;
  onClose: () => void;
}

export const REISSUE_REASONS = [
  { value: 'VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE', label: 'Validity Expired within 3 years / Due to expire' },
  { value: 'VALIDITY EXPIRED MORE THAN 3 YEARS AGO', label: 'Validity Expired more than 3 years ago' },
  { value: 'EXHAUSTION OF PAGES', label: 'Exhaustion of Pages' },
  { value: 'DAMAGED PASSPORT', label: 'Damaged Passport' },
  { value: 'LOST PASSPORT', label: 'Lost Passport' },
];

export const InAppInfoModal: React.FC<InAppInfoModalProps> = ({
  isOpen,
  serviceType,
  initialData,
  onSave,
  onClear,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      const data = { ...initialData };
      if (!data.application_type) {
        data.application_type = 'NORMAL';
      }
      if (!data.booklet_type) {
        data.booklet_type = '36 PAGES';
      }
      if (serviceType === 'reissue') {
        if (!data.reissue_reason || data.reissue_reason === 'CHANGE IN EXISTING PERSONAL PARTICULARS') {
          if (data.reissue_reason === 'CHANGE IN EXISTING PERSONAL PARTICULARS') {
            data.is_change_in_particulars = 'Y';
          }
          data.reissue_reason = 'VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE';
        }
      } else if (serviceType === 'surrender') {
        if (!data.foreign_nationality_country && !data['Foreign nationality country']) {
          data.foreign_nationality_country = 'Italy';
        }
        if (!data.surrender_reason && !data['Surrender reason']) {
          data.surrender_reason = 'ACQUIRING FOREIGN NATIONALITY/RENUNCIATION OF INDIAN CITIZENSHIP';
        }
      } else if (serviceType === 'pcc') {
        if (!data.pcc_purpose && !data['Purpose of PCC'] && !data.pccPurpose) {
          data.pcc_purpose = 'CITIZENSHIP/NATIONALITY APPLICATION';
        }
        if (!data.pcc_country && !data['Country for which PCC is required'] && !data.pccApplicantcountry) {
          data.pcc_country = 'Italy';
        }
      }
      setFormData(data);
    }
  }, [isOpen, initialData, serviceType]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev };
      if (value === '' || value === 'SELECT') {
        delete updated[field];
      } else {
        updated[field] = value;
      }
      return updated;
    });
  };

  const handleClear = () => {
    setFormData({});
    if (onClear) {
      onClear();
    }
    onClose();
  };

  const isSurrender = serviceType === 'surrender';
  const isFresh = serviceType === 'fresh';
  const isPcc = serviceType === 'pcc';
  const isChangeInParticulars =
    formData.is_change_in_particulars === 'Y' ||
    (formData.change_type && formData.change_type !== 'NOT APPLICABLE' && formData.change_type !== '');

  const selectedReissueReason =
    formData.reissue_reason &&
    REISSUE_REASONS.some(r => r.value === formData.reissue_reason)
      ? formData.reissue_reason
      : 'VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData: Record<string, any> = {};

    // Only preserve fields that have genuine, non-empty, non-SELECT values
    for (const [k, v] of Object.entries(formData)) {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s !== '' && s !== 'SELECT' && s !== 'NOT APPLICABLE') {
          finalData[k] = s;
        }
      }
    }

    if (serviceType === 'reissue') {
      finalData.reissue_reason = selectedReissueReason;
      if (isChangeInParticulars) {
        finalData.is_change_in_particulars = 'Y';
      } else {
        delete finalData.is_change_in_particulars;
        delete finalData.change_type;
        delete finalData.change_particulars_detail;
        delete finalData.change_in_address;
        delete finalData.change_in_spouse;
        delete finalData.change_in_name;
        delete finalData.change_in_surname;
        delete finalData.change_in_appearance;
        delete finalData.change_in_signature;
        delete finalData.change_in_dob;
      }
    }

    onSave(finalData);
    onClose();
  };

  return (
    <div
      className="info-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="info-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isPcc
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
              : isSurrender
                ? 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)'
                : isFresh
                  ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isPcc ? '#dcfce7' : isSurrender ? '#fef3c7' : isFresh ? '#dcfce7' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isPcc ? '#16a34a' : isSurrender ? '#b45309' : isFresh ? '#15803d' : '#1d4ed8',
              }}
            >
              {isPcc ? (
                <ShieldCheck style={{ width: '20px', height: '20px' }} />
              ) : isSurrender ? (
                <FileCheck style={{ width: '20px', height: '20px' }} />
              ) : (
                <FileText style={{ width: '20px', height: '20px' }} />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {isPcc
                  ? 'Police Clearance Certificate (PCC) Mandatory Info'
                  : isSurrender
                    ? 'Surrender Certificate Mandatory Info'
                    : isFresh
                      ? 'Fresh Passport Mandatory Info'
                      : 'Reissue Passport Mandatory Info'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {isPcc
                  ? 'Enter mandatory details not found on uploaded documents. All details auto-merge into the PCC application.'
                  : isSurrender
                    ? 'Enter mandatory details not found on uploaded documents. All details auto-merge into the application.'
                    : 'Only enter mandatory details not present on uploaded documents. All fields auto-merge into application.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
            }}
            title="Close modal"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isPcc ? (
            <>
              {/* PCC: Purpose & Country */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. PCC Purpose &amp; Destination Country
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Country for which PCC is required *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Italy"
                      value={formData.pcc_country || formData['Country for which PCC is required'] || formData.pccApplicantcountry || 'Italy'}
                      onChange={(e) => handleChange('pcc_country', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Purpose for which PCC is required *
                    </label>
                    <select
                      value={formData.pcc_purpose || formData['Purpose of PCC'] || formData.pccPurpose || 'CITIZENSHIP/NATIONALITY APPLICATION'}
                      onChange={(e) => handleChange('pcc_purpose', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="CITIZENSHIP/NATIONALITY APPLICATION">Citizenship / Nationality Application</option>
                      <option value="EMPLOYMENT/WORK VISA">Employment / Work Visa</option>
                      <option value="IMMIGRATION/RESIDENCE PERMIT">Immigration / Residence Permit</option>
                      <option value="EDUCATION/STUDENT VISA">Education / Student Visa</option>
                      <option value="OTHERS">Others</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PCC: Indian Passport Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Indian Passport Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Z1234567"
                      value={formData.passport_number || formData['Passport Number'] || formData['Current passport number'] || ''}
                      onChange={(e) => handleChange('passport_number', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Issue *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.issue_date || formData['Date of issue'] || ''}
                      onChange={(e) => handleChange('issue_date', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Expiry *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.expiry_date || formData['Date of expiry'] || ''}
                      onChange={(e) => handleChange('expiry_date', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Place of Issue *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ROME / JAIPUR"
                      value={formData.issue_place || formData['Place of issue'] || ''}
                      onChange={(e) => handleChange('issue_place', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      File Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IT107..."
                      value={formData.file_number || formData['File number'] || formData['File Number'] || ''}
                      onChange={(e) => handleChange('file_number', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* PCC: Personal & Family Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Personal &amp; Family Particulars
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Given Name *
                    </label>
                    <input
                      type="text"
                      placeholder="First and Middle Name"
                      value={formData.given_name || formData['Given NAME'] || ''}
                      onChange={(e) => handleChange('given_name', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Surname
                    </label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={formData.surname || formData['SURNAME'] || ''}
                      onChange={(e) => handleChange('surname', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Gender *
                    </label>
                    <select
                      value={formData.gender || formData['GENDER'] || 'MALE'}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                      <option value="TRANSGENDER">TRANSGENDER</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Birth *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.dob || formData['Date of birth'] || formData['DOB'] || ''}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Place of Birth *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JAIPUR"
                      value={formData.place_of_birth || formData['Place of birth'] || ''}
                      onChange={(e) => handleChange('place_of_birth', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Marital Status *
                    </label>
                    <select
                      value={formData.marital_status || formData['Marital status'] || 'MARRIED'}
                      onChange={(e) => handleChange('marital_status', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="MARRIED">MARRIED</option>
                      <option value="SINGLE">SINGLE</option>
                      <option value="DIVORCED">DIVORCED</option>
                      <option value="WIDOW / WIDOWER">WIDOW / WIDOWER</option>
                      <option value="SEPARATED">SEPARATED</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Father's full name"
                      value={formData.father_name || formData["Father's name"] || ''}
                      onChange={(e) => handleChange('father_name', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mother's Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Mother's full name"
                      value={formData.mother_name || formData["Mother's name"] || ''}
                      onChange={(e) => handleChange('mother_name', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Spouse Name
                    </label>
                    <input
                      type="text"
                      placeholder="Spouse's full name"
                      value={formData.spouse_name || formData['Spouse name'] || ''}
                      onChange={(e) => handleChange('spouse_name', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Employment Type
                    </label>
                    <select
                      value={formData.employment_type || formData['Employment type'] || 'PRIVATE'}
                      onChange={(e) => handleChange('employment_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="PRIVATE">PRIVATE</option>
                      <option value="GOVERNMENT">GOVERNMENT</option>
                      <option value="HOMEMAKER">HOMEMAKER</option>
                      <option value="STUDENT">STUDENT</option>
                      <option value="SELF EMPLOYED">SELF EMPLOYED</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Educational Qualification
                    </label>
                    <select
                      value={formData.educational_qualification || formData['Educational qualification'] || '10TH PASS AND ABOVE'}
                      onChange={(e) => handleChange('educational_qualification', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="10TH PASS AND ABOVE">10TH PASS AND ABOVE</option>
                      <option value="GRADUATE AND ABOVE">GRADUATE AND ABOVE</option>
                      <option value="9TH PASS OR LESS">9TH PASS OR LESS</option>
                      <option value="ILLITERATE">ILLITERATE</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PCC: Indian Present Address */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  4. Indian Address (For Police Verification)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      House No. and Street Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VPO BHAWANPURA"
                      value={formData.house_street || formData['House No. and Street Name'] || ''}
                      onChange={(e) => handleChange('house_street', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Village / Town / City *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BHAWANPURA"
                      value={formData.village_city || formData['Village or Town or City'] || ''}
                      onChange={(e) => handleChange('village_city', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RAJASTHAN"
                      value={formData.state || formData['State'] || ''}
                      onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      District *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JAIPUR"
                      value={formData.district || formData['District'] || ''}
                      onChange={(e) => handleChange('district', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Police Station *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PHULERA"
                      value={formData.police_station || formData['Police Station'] || ''}
                      onChange={(e) => handleChange('police_station', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 303338"
                      value={formData.pincode || formData['PIN Code'] || formData['PIN'] || ''}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Indian Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={formData.indian_mobile_number || formData['Indian mobile number'] || ''}
                      onChange={(e) => handleChange('indian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Email ID
                    </label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.email_id || formData['Email id'] || formData['Email ID'] || ''}
                      onChange={(e) => handleChange('email_id', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* PCC: Italian Permanent Address */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  5. Italian Address
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Address Line 1 (Street &amp; No.) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIA APPIA 45"
                      value={formData.italian_street || formData['Italian address line 1'] || ''}
                      onChange={(e) => handleChange('italian_street', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Address Line 2 (City / Commune) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FONDI"
                      value={formData.italian_city || formData['Italian address line 2'] || ''}
                      onChange={(e) => handleChange('italian_city', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Address Line 3 / CAP *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 04022 LT"
                      value={formData.italian_postal_code || formData['Italian address line 3'] || formData['CAP'] || ''}
                      onChange={(e) => handleChange('italian_postal_code', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.italian_mobile_number || formData['Italian mobile number'] || ''}
                      onChange={(e) => handleChange('italian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : isSurrender ? (
            <>
              {/* SURRENDER: Foreign Nationality & Acquisition */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Foreign Nationality &amp; Acquisition
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Foreign Passport Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. YA1234567"
                      value={formData.foreign_passport_number || formData['Foreign passport number'] || ''}
                      onChange={(e) => handleChange('foreign_passport_number', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Acquisition of Foreign Nationality *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.foreign_nationality_acquisition_date || formData['Foreign nationality acquisition date'] || ''}
                      onChange={(e) => handleChange('foreign_nationality_acquisition_date', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Foreign Nationality Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Italy"
                      value={formData.foreign_nationality_country || formData['Foreign nationality country'] || 'Italy'}
                      onChange={(e) => handleChange('foreign_nationality_country', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Surrender Reason
                    </label>
                    <select
                      value={formData.surrender_reason || formData['Surrender reason'] || 'ACQUIRING FOREIGN NATIONALITY/RENUNCIATION OF INDIAN CITIZENSHIP'}
                      onChange={(e) => handleChange('surrender_reason', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="ACQUIRING FOREIGN NATIONALITY/RENUNCIATION OF INDIAN CITIZENSHIP">ACQUIRING FOREIGN NATIONALITY/RENUNCIATION OF INDIAN CITIZENSHIP</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SURRENDER: Surrendered Indian Passport Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Surrendered Indian Passport Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Current Indian Passport Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Z1234567"
                      value={formData.passport_number || formData['Current passport number'] || ''}
                      onChange={(e) => handleChange('passport_number', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Issue *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.issue_date || formData['Date of issue'] || ''}
                      onChange={(e) => handleChange('issue_date', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Date of Expiry *
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={formData.expiry_date || formData['Date of expiry'] || ''}
                      onChange={(e) => handleChange('expiry_date', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Place of Issue *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ROME / JALANDHAR"
                      value={formData.issue_place || formData['Place of issue'] || ''}
                      onChange={(e) => handleChange('issue_place', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SURRENDER: Contact & Italian Address */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Contact &amp; Italian Address
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Mobile Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.italian_mobile_number || formData['Mobile No'] || ''}
                      onChange={(e) => handleChange('italian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Email ID
                    </label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.email_id || formData['Email ID'] || ''}
                      onChange={(e) => handleChange('email_id', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      House No. &amp; Street Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIA ROMA 12"
                      value={formData.italian_street || formData['House No. and Street Name'] || ''}
                      onChange={(e) => handleChange('italian_street', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      City / Comune
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ROMA"
                      value={formData.italian_city || formData['City'] || ''}
                      onChange={(e) => handleChange('italian_city', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Province
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ROMA"
                      value={formData.italian_province || formData['State'] || ''}
                      onChange={(e) => handleChange('italian_province', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Postal Code / PIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 00100"
                      value={formData.italian_postal_code || formData['PIN'] || ''}
                      onChange={(e) => handleChange('italian_postal_code', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SURRENDER: Emergency Contact */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  4. Emergency Contact
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Contact Person Name
                    </label>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.emergency_name || formData['Emergency Name'] || ''}
                      onChange={(e) => handleChange('emergency_name', e.target.value.toUpperCase())}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Contact Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.emergency_mobile || formData['Emergency Mobile'] || ''}
                      onChange={(e) => handleChange('emergency_mobile', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : isFresh ? (
            <>
              {/* FRESH: Service Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Service Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Application Type
                    </label>
                    <select
                      value={formData.application_type || 'NORMAL'}
                      onChange={(e) => handleChange('application_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="TATKAAL">TATKAAL</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Booklet Type
                    </label>
                    <select
                      value={formData.booklet_type || '36 PAGES'}
                      onChange={(e) => handleChange('booklet_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="36 PAGES">36 PAGES</option>
                      <option value="60 PAGES">60 PAGES</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FRESH: Indian Police Station */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Indian Police Station
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Indian Police Station
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PS Nawanshahr"
                      value={formData.police_station || ''}
                      onChange={(e) => handleChange('police_station', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* FRESH: Parent Contact Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Parent Contact Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Indian Mobile Number (Parent)
                    </label>
                    <input
                      type="text"
                      placeholder="10 digits (e.g. 9876543210)"
                      value={formData.indian_mobile_number || ''}
                      onChange={(e) => handleChange('indian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Mobile Number (Parent)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.italian_mobile_number || ''}
                      onChange={(e) => handleChange('italian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Email ID
                    </label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.email_id || ''}
                      onChange={(e) => handleChange('email_id', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* REISSUE: Particulars */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Service &amp; Reissue Reason
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Application Type
                    </label>
                    <select
                      value={formData.application_type || ''}
                      onChange={(e) => handleChange('application_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="">SELECT</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="TATKAAL">TATKAAL</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Booklet Type
                    </label>
                    <select
                      value={formData.booklet_type || ''}
                      onChange={(e) => handleChange('booklet_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="">SELECT</option>
                      <option value="36 PAGES">36 PAGES</option>
                      <option value="60 PAGES">60 PAGES</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                      Reason for Reissue (Mandatory - Select One Radio)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      {REISSUE_REASONS.map((opt) => {
                        const isSelected = selectedReissueReason === opt.value;
                        return (
                          <label
                            key={opt.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                              background: isSelected ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              fontSize: '12.5px',
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? '#1e40af' : '#334155',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name="reissue_reason"
                              value={opt.value}
                              checked={isSelected}
                              onChange={() => handleChange('reissue_reason', opt.value)}
                              style={{ accentColor: '#2563eb', cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isChangeInParticulars ? '#1d4ed8' : '#1e293b',
                        background: isChangeInParticulars ? '#f0fdf4' : '#f8fafc',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: isChangeInParticulars ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChangeInParticulars}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleChange('is_change_in_particulars', checked ? 'Y' : 'N');
                          // Ensure radio button selection is preserved!
                          handleChange('reissue_reason', selectedReissueReason);
                          if (checked) {
                            if (!formData.change_type || formData.change_type === 'NOT APPLICABLE') {
                              handleChange('change_type', 'CHANGE IN ADDRESS');
                              handleChange('change_in_address', 'Y');
                            }
                          } else {
                            handleChange('change_type', 'NOT APPLICABLE');
                            handleChange('change_particulars_detail', '');
                            handleChange('change_in_address', 'N');
                            handleChange('change_in_name', 'N');
                            handleChange('change_in_surname', 'N');
                            handleChange('change_in_spouse', 'N');
                            handleChange('change_in_appearance', 'N');
                            handleChange('change_in_signature', 'N');
                            handleChange('change_in_dob', 'N');
                          }
                        }}
                        style={{ width: '17px', height: '17px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <span>Change in Existing Personal Particulars (Spouse, Address, Name, Appearance, etc.)</span>
                    </label>
                  </div>
                </div>

                {/* Dynamic Advanced Option for Change in Personal Particulars */}
                {isChangeInParticulars && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                      Select Particulars to Change:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      {[
                        { key: 'change_in_address', label: 'Address', typeValue: 'CHANGE IN ADDRESS' },
                        { key: 'change_in_spouse', label: 'Spouse Name', typeValue: 'CHANGE IN SPOUSE NAME' },
                        { key: 'change_in_name', label: 'Name / Surname', typeValue: 'CHANGE IN NAME / SURNAME' },
                        { key: 'change_in_appearance', label: 'Appearance / Signature', typeValue: 'CHANGE IN APPEARANCE / SIGNATURE' },
                        { key: 'change_in_dob', label: 'Date of Birth', typeValue: 'CHANGE IN DATE OF BIRTH' },
                      ].map((item) => {
                        const isChecked =
                          formData[item.key] === 'Y' ||
                          (formData.change_type && formData.change_type.includes(item.typeValue));
                        return (
                          <label
                            key={item.key}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: isChecked ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                              background: isChecked ? '#eff6ff' : '#ffffff',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: isChecked ? 600 : 500,
                              color: isChecked ? '#1d4ed8' : '#334155',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                // Build combined change_type from all checked items
                                setFormData((prev) => {
                                  const updated = { ...prev, [item.key]: checked ? 'Y' : 'N' };
                                  if (item.key === 'change_in_name') {
                                    updated['change_in_surname'] = checked ? 'Y' : 'N';
                                  }
                                  const allChangeItems = [
                                    { key: 'change_in_address', typeValue: 'CHANGE IN ADDRESS' },
                                    { key: 'change_in_spouse', typeValue: 'CHANGE IN SPOUSE NAME' },
                                    { key: 'change_in_name', typeValue: 'CHANGE IN NAME / SURNAME' },
                                    { key: 'change_in_appearance', typeValue: 'CHANGE IN APPEARANCE / SIGNATURE' },
                                    { key: 'change_in_dob', typeValue: 'CHANGE IN DATE OF BIRTH' },
                                  ];
                                  const activeTypes = allChangeItems
                                    .filter((ci) => updated[ci.key] === 'Y')
                                    .map((ci) => ci.typeValue);
                                  updated['change_type'] = activeTypes.length > 0 ? activeTypes.join(', ') : 'NOT APPLICABLE';
                                  return updated;
                                });
                              }}
                              style={{ width: '15px', height: '15px', accentColor: '#2563eb', cursor: 'pointer' }}
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '4px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Primary Change Category
                        </label>
                        <select
                          value={formData.change_type || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleChange('change_type', val);
                            if (val === 'CHANGE IN ADDRESS') handleChange('change_in_address', 'Y');
                            if (val === 'CHANGE IN SPOUSE NAME') handleChange('change_in_spouse', 'Y');
                            if (val === 'CHANGE IN NAME / SURNAME') {
                              handleChange('change_in_name', 'Y');
                              handleChange('change_in_surname', 'Y');
                            }
                            if (val === 'CHANGE IN APPEARANCE / SIGNATURE') {
                              handleChange('change_in_appearance', 'Y');
                              handleChange('change_in_signature', 'Y');
                            }
                            if (val === 'CHANGE IN DATE OF BIRTH') handleChange('change_in_dob', 'Y');
                          }}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                          <option value="">SELECT</option>
                          <option value="NOT APPLICABLE">NOT APPLICABLE</option>
                          <option value="CHANGE IN ADDRESS">CHANGE IN ADDRESS</option>
                          <option value="CHANGE IN NAME / SURNAME">CHANGE IN NAME / SURNAME</option>
                          <option value="CHANGE IN SPOUSE NAME">CHANGE IN SPOUSE NAME</option>
                          <option value="CHANGE IN APPEARANCE / SIGNATURE">CHANGE IN APPEARANCE / SIGNATURE</option>
                          <option value="CHANGE IN DATE OF BIRTH">CHANGE IN DATE OF BIRTH</option>
                          <option value="OTHER PARTICULARS">OTHER PARTICULARS</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Details of Change Requested
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. New address in Italy, new spouse name, etc."
                          value={formData.change_particulars_detail || ''}
                          onChange={(e) => handleChange('change_particulars_detail', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* REISSUE: Personal Details (Matches info.docx) */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Personal Status &amp; Profession (from Info Sheet)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Educational Qualification
                    </label>
                    <select
                      value={formData.educational_qualification || ''}
                      onChange={(e) => handleChange('educational_qualification', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="">SELECT</option>
                      <option value="10TH PASS AND ABOVE">10TH PASS AND ABOVE</option>
                      <option value="GRADUATE AND ABOVE">GRADUATE AND ABOVE</option>
                      <option value="BETWEEN 8TH AND 9TH STANDARD">BETWEEN 8TH AND 9TH STANDARD</option>
                      <option value="7TH PASS OR LESS">7TH PASS OR LESS</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Employment Type / Profession
                    </label>
                    <select
                      value={formData.employment_type || ''}
                      onChange={(e) => handleChange('employment_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="">SELECT</option>
                      <option value="PRIVATE">PRIVATE</option>
                      <option value="SELF EMPLOYED">SELF EMPLOYED</option>
                      <option value="GOVERNMENT">GOVERNMENT</option>
                      <option value="HOMEMAKER">HOMEMAKER</option>
                      <option value="STUDENT">STUDENT</option>
                      <option value="RETIRED">RETIRED</option>
                      <option value="NOT EMPLOYED">NOT EMPLOYED</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* REISSUE: Police Station & Contacts (Matches info.docx) */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Contact Information &amp; Indian Police Station (Mandatory)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Indian Police Station
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PS Nawanshahr"
                      value={formData.police_station || ''}
                      onChange={(e) => handleChange('police_station', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Indian Mobile Number (10 digits)
                    </label>
                    <input
                      type="text"
                      placeholder="10 digits (e.g. 9876543210)"
                      value={formData.indian_mobile_number || ''}
                      onChange={(e) => handleChange('indian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian / Foreign Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.italian_mobile_number || ''}
                      onChange={(e) => handleChange('italian_mobile_number', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Email ID
                    </label>
                    <input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.email_id || ''}
                      onChange={(e) => handleChange('email_id', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="Clear all fields and reset"
            >
              <RotateCcw style={{ width: '14px', height: '14px' }} />
              <span>Clear / Reset All</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSurrender ? '#d97706' : isFresh ? '#059669' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSurrender ? '0 2px 8px rgba(217, 119, 6, 0.25)' : isFresh ? '0 2px 8px rgba(5, 150, 105, 0.25)' : '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                <Save style={{ width: '15px', height: '15px' }} />
                <span>Save Details</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
