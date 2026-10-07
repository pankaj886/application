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
            background: isFresh ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
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
                {isFresh ? 'Fresh Passport Supplementary Info Form' : 'Reissue Passport Supplementary Info Form'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Fill optional details directly in-app. Fields provided here auto-merge with document extraction.
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
                  1. Applicant Classification &amp; Validity
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
                      Validity Type (Minors 15-18)
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
                </div>
              </div>

              {/* FRESH: Place of Birth */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Place of Birth &amp; Citizenship
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Born Outside India?
                    </label>
                    <select
                      value={formData.is_pob_outside_india || 'YES (BORN ABROAD / ITALY)'}
                      onChange={(e) => handleChange('is_pob_outside_india', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="YES (BORN ABROAD / ITALY)">YES (BORN ABROAD / ITALY)</option>
                      <option value="NO (BORN IN INDIA)">NO (BORN IN INDIA)</option>
                    </select>
                  </div>
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

              {/* FRESH: Parental Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Parental Information (For Minors)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Father's Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="As in Father's Passport"
                      value={formData.father_name || ''}
                      onChange={(e) => handleChange('father_name', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Father's Passport Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Z1234567"
                      value={formData.father_passport_no || ''}
                      onChange={(e) => handleChange('father_passport_no', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mother's Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="As in Mother's Passport"
                      value={formData.mother_name || ''}
                      onChange={(e) => handleChange('mother_name', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mother's Passport Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Z7654321"
                      value={formData.mother_passport_no || ''}
                      onChange={(e) => handleChange('mother_passport_no', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* FRESH: Contact & Police */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  4. Address &amp; Contact Details
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
                      onChange={(e) => handleChange('reissue_reason', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE">VALIDITY EXPIRED WITHIN 3 YEARS/DUE TO EXPIRE</option>
                      <option value="VALIDITY EXPIRED MORE THAN 3 YEARS AGO">VALIDITY EXPIRED MORE THAN 3 YEARS AGO</option>
                      <option value="CHANGE IN EXISTING PERSONAL PARTICULARS">CHANGE IN EXISTING PERSONAL PARTICULARS</option>
                      <option value="EXHAUSTION OF PAGES">EXHAUSTION OF PAGES</option>
                      <option value="DAMAGED PASSPORT">DAMAGED PASSPORT</option>
                      <option value="LOST PASSPORT">LOST PASSPORT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* REISSUE: Personal Details */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. Personal Status &amp; Profession
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Marital Status
                    </label>
                    <select
                      value={formData.marital_status || 'SINGLE'}
                      onChange={(e) => handleChange('marital_status', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="SINGLE">SINGLE</option>
                      <option value="MARRIED">MARRIED</option>
                      <option value="DIVORCED">DIVORCED</option>
                      <option value="WIDOW / WIDOWER">WIDOW / WIDOWER</option>
                      <option value="SEPARATED">SEPARATED</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Spouse Name (if married)
                    </label>
                    <input
                      type="text"
                      placeholder="Spouse Name"
                      value={formData.spouse_name || ''}
                      onChange={(e) => handleChange('spouse_name', e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
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
                      Employment Type
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

              {/* REISSUE: Police Station & Contacts */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  3. Contact &amp; Police Station
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
                      Indian Mobile Number
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
                      Italian Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3331234567"
                      value={formData.italian_mobile_number || ''}
                      onChange={(e) => handleChange('italian_mobile_number', e.target.value)}
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
