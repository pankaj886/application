import React from 'react';
import { ArrowRight, FileText } from 'lucide-react';

interface ServicesViewProps {
  onSelectPassport: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ onSelectPassport }) => {
  return (
    <div className="services-view-container">
      <div className="view-header">
        <div className="view-header-left">
          <h1 className="view-main-title">Services</h1>
        </div>
      </div>

      <div className="services-grid-area">
        <div 
          className="service-card"
          onClick={onSelectPassport}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectPassport();
            }
          }}
        >
          <div className="service-card-left">
            <div className="passport-emblem-seal">
              <FileText className="passport-emblem-icon" />
            </div>
            <h2 className="service-card-title">Passport Services</h2>
          </div>
          <ArrowRight className="arrow-icon" />
        </div>
      </div>
    </div>
  );
};
