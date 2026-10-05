import React from 'react';
import { X, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  title: string;
  imageUrl: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  title,
  imageUrl,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="pdf-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="image-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '680px',
          width: '90%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          className="image-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon style={{ width: '18px', height: '18px', color: '#2563eb' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={imageUrl}
              download={title.replace(/\s+/g, '_') + '.jpg'}
              className="pdf-modal-action-btn"
              title="Download image"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                textDecoration: 'none',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
              }}
            >
              <Download style={{ width: '14px', height: '14px' }} />
              <span>Download</span>
            </a>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="pdf-modal-action-btn"
              title="Open in new tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
              }}
            >
              <ExternalLink style={{ width: '14px', height: '14px' }} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="pdf-modal-close-btn"
              title="Close (Esc)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>

        <div
          className="image-modal-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#0f172a',
            overflow: 'auto',
            minHeight: '320px',
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            style={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: '6px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
              background: '#ffffff',
            }}
          />
        </div>
      </div>
    </div>
  );
};
