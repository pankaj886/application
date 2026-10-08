import React, { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';

interface InAppInfoModalProps {
  isOpen: boolean;
  serviceType: 'reissue' | 'fresh';
  initialData: Record<string, any>;
  onSave: (data: Record<string, any>) => void;
  onClose: () => void;
}

export const InAppInfoModal: React.FC<InAppInfoModalProps> = ({
  isOpen,
  serviceType,
  initialData,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...initialData });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const isFresh = serviceType === 'fresh';
  const isChangeInParticulars =
    formData.is_change_in_particulars === 'Y' ||
    formData.reissue_reason === 'CHANGE IN EXISTING PERSONAL PARTICULARS' ||
    (formData.change_type && formData.change_type !== 'NOT APPLICABLE');

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
            background: isFresh
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
                background: isFresh ? '#dcfce7' : '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFresh ? '#15803d' : '#1d4ed8',
              }}
            >
              <FileText style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {isFresh ? 'Fresh Passport Supplementary Info' : 'Reissue Passport Supplementary Info'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Only enter supplementary details not present on uploaded documents. All fields auto-merge into application.
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
          {isFresh ? (
            <>
              {/* FRESH: Classification */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Service &amp; Applicant Classification
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Applicant Category
                    </label>
                    <select
                      value={formData.applicant_category || 'MINOR (UNDER 18 YEARS)'}
                      onChange={(e) => handleChange('applicant_category', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="MINOR (UNDER 18 YEARS)">MINOR (UNDER 18 YEARS)</option>
                      <option value="ADULT (18 YEARS & ABOVE)">ADULT (18 YEARS & ABOVE)</option>
                    </select>
                  </div>
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
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Validity Required (Minors 15-18)
                    </label>
                    <select
                      value={formData.validity_type || 'NOT APPLICABLE (< 15 YRS)'}
                      onChange={(e) => handleChange('validity_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="NOT APPLICABLE (< 15 YRS)">NOT APPLICABLE (&lt; 15 YRS)</option>
                      <option value="UPTO 18 YEARS OF AGE">UPTO 18 YEARS OF AGE (5 YRS)</option>
                      <option value="10 YEARS VALIDITY">10 YEARS VALIDITY</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Non-ECR Status
                    </label>
                    <select
                      value={formData.eligible_ecnr || 'YES (ALL MINORS ARE NON-ECR)'}
                      onChange={(e) => handleChange('eligible_ecnr', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="YES (ALL MINORS ARE NON-ECR)">YES (ALL MINORS ARE NON-ECR)</option>
                      <option value="NO">NO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FRESH: Place of Birth */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Birthplace &amp; Citizenship Particulars
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      City / Town of Birth
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rome, Latina, Fondi"
                      value={formData.birth_place || ''}
                      onChange={(e) => handleChange('birth_place', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Country of Birth
                    </label>
                    <input
                      type="text"
                      placeholder="ITALY"
                      value={formData.country_of_birth || 'ITALY'}
                      onChange={(e) => handleChange('country_of_birth', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Citizenship By
                    </label>
                    <select
                      value={formData.citizenship || 'DESCENT (BORN ABROAD TO INDIAN PARENTS)'}
                      onChange={(e) => handleChange('citizenship', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="DESCENT (BORN ABROAD TO INDIAN PARENTS)">DESCENT (BORN ABROAD TO INDIAN PARENTS)</option>
                      <option value="BIRTH">BIRTH</option>
                      <option value="REGISTRATION">REGISTRATION</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* FRESH: Address & Police Station */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Italian Residence &amp; Indian Police Station
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Italian Residence Address
                    </label>
                    <input
                      type="text"
                      placeholder="Via Roma 12, 00100 Roma (RM)"
                      value={formData.italian_address || ''}
                      onChange={(e) => handleChange('italian_address', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Village / Town (India)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VPO Kang Mai"
                      value={formData.indian_address_village || ''}
                      onChange={(e) => handleChange('indian_address_village', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      District (India)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hoshiarpur"
                      value={formData.indian_address_district || ''}
                      onChange={(e) => handleChange('indian_address_district', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      State (India)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Punjab"
                      value={formData.indian_address_state || ''}
                      onChange={(e) => handleChange('indian_address_state', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      PIN Code (India)
                    </label>
                    <input
                      type="text"
                      placeholder="6 digits"
                      value={formData.indian_address_pin || ''}
                      onChange={(e) => handleChange('indian_address_pin', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* FRESH: Contact & Emergency */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  4. Parent Contact Details
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
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Emergency Contact Person &amp; Mobile
                    </label>
                    <input
                      type="text"
                      placeholder="Name & contact"
                      value={formData.emergency_contact_name_address || ''}
                      onChange={(e) => handleChange('emergency_contact_name_address', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Visible Distinguishing Mark (if any)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mole on forehead"
                      value={formData.visible_mark || ''}
                      onChange={(e) => handleChange('visible_mark', e.target.value)}
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
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Reason for Reissue
                    </label>
                    <select
                      value={formData.reissue_reason || 'VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE'}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange('reissue_reason', val);
                        if (val === 'CHANGE IN EXISTING PERSONAL PARTICULARS') {
                          handleChange('is_change_in_particulars', 'Y');
                          if (!formData.change_type || formData.change_type === 'NOT APPLICABLE') {
                            handleChange('change_type', 'CHANGE IN ADDRESS');
                          }
                        }
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE">VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE</option>
                      <option value="VALIDITY EXPIRED MORE THAN 3 YEARS AGO">VALIDITY EXPIRED MORE THAN 3 YEARS AGO</option>
                      <option value="EXHAUSTION OF PAGES">EXHAUSTION OF PAGES</option>
                      <option value="DAMAGED PASSPORT">DAMAGED PASSPORT</option>
                      <option value="LOST PASSPORT">LOST PASSPORT</option>
                      <option value="CHANGE IN EXISTING PERSONAL PARTICULARS">CHANGE IN EXISTING PERSONAL PARTICULARS</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={isChangeInParticulars}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          handleChange('is_change_in_particulars', checked ? 'Y' : 'N');
                          if (checked) {
                            if (!formData.change_type || formData.change_type === 'NOT APPLICABLE') {
                              handleChange('change_type', 'CHANGE IN ADDRESS');
                            }
                          } else {
                            handleChange('change_type', 'NOT APPLICABLE');
                            handleChange('change_particulars_detail', '');
                            if (formData.reissue_reason === 'CHANGE IN EXISTING PERSONAL PARTICULARS') {
                              handleChange('reissue_reason', 'VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE');
                            }
                          }
                        }}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <span>Change in Existing Personal Particulars (Address, Name, Spouse, etc.)</span>
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
                      Change in Personal Particulars Options:
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Particulars to Change
                        </label>
                        <select
                          value={formData.change_type || 'CHANGE IN ADDRESS'}
                          onChange={(e) => handleChange('change_type', e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
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
                          placeholder="e.g. New address in Italy or name modification"
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
                      value={formData.educational_qualification || '10TH PASS AND ABOVE'}
                      onChange={(e) => handleChange('educational_qualification', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
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
                      value={formData.employment_type || 'PRIVATE'}
                      onChange={(e) => handleChange('employment_type', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
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
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
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
                background: isFresh ? '#059669' : '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isFresh ? '0 2px 8px rgba(5, 150, 105, 0.25)' : '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Save style={{ width: '15px', height: '15px' }} />
              <span>Save Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
