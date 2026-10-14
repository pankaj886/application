import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Sparkles, FileCheck } from 'lucide-react';

interface PassportViewProps {
  onBack: () => void;
  onSelectFreshReissue: (service?: 'fresh' | 'reissue' | 'surrender') => void;
}

export const PassportView: React.FC<PassportViewProps> = ({ onBack, onSelectFreshReissue }) => {
  return (
    <div className="passport-view-container">
      <div className="view-navigation-bar">
        <button 
          type="button" 
          onClick={onBack}
          className="back-btn"
          title="Return to Services"
          aria-label="Return to Services"
        >
          <ArrowLeft className="back-arrow" />
          <span>Services</span>
        </button>
      </div>

      <div className="services-grid-area">
        <div 
          className="service-card"
          role="button"
          tabIndex={0}
          aria-label="Reissue Passport"
          onClick={(e) => {
            e.preventDefault();
            onSelectFreshReissue('reissue');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectFreshReissue('reissue');
            }
          }}
        >
          <div className="service-card-left">
            <div className="passport-emblem-seal">
              <BookOpen className="passport-emblem-icon" />
            </div>
            <div>
              <h2 className="service-card-title">Reissue Passport</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Passport renewals, expired validity, exhaustion of pages, lost, or damaged
              </p>
            </div>
          </div>
          <ArrowRight className="arrow-icon" />
        </div>

        <div 
          className="service-card"
          role="button"
          tabIndex={0}
          aria-label="Fresh Passport"
          onClick={(e) => {
            e.preventDefault();
            onSelectFreshReissue('fresh');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectFreshReissue('fresh');
            }
          }}
        >
          <div className="service-card-left">
            <div className="passport-emblem-seal" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <Sparkles className="passport-emblem-icon" style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 className="service-card-title">Fresh Passport</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                First-time applicants &amp; minors without an existing Indian passport
              </p>
            </div>
          </div>
          <ArrowRight className="arrow-icon" />
        </div>

        <div 
          className="service-card"
          role="button"
          tabIndex={0}
          aria-label="Surrender Certificate"
          onClick={(e) => {
            e.preventDefault();
            onSelectFreshReissue('surrender');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectFreshReissue('surrender');
            }
          }}
        >
          <div className="service-card-left">
            <div className="passport-emblem-seal" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <FileCheck className="passport-emblem-icon" style={{ color: '#d97706' }} />
            </div>
            <div>
              <h2 className="service-card-title">Surrender Certificate</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                Renunciation of Indian citizenship &amp; surrender of passport upon foreign nationality acquisition
              </p>
            </div>
          </div>
          <ArrowRight className="arrow-icon" />
        </div>
      </div>
    </div>
  );
};
