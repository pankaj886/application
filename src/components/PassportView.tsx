import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';

interface PassportViewProps {
  onBack: () => void;
}

export const PassportView: React.FC<PassportViewProps> = ({ onBack }) => {
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
          aria-label="Fresh / Reissue"
          onClick={(e) => {
            e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
            }
          }}
        >
          <div className="service-card-left">
            <div className="passport-emblem-seal">
              <BookOpen className="passport-emblem-icon" />
            </div>
            <h2 className="service-card-title">Fresh / Reissue</h2>
          </div>
          <ArrowRight className="arrow-icon" />
        </div>
      </div>
    </div>
  );
};
