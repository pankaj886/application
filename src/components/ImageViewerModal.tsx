import React, { useState } from 'react';
import { X, Download, ExternalLink, Image as ImageIcon, RefreshCw, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ message: string; path?: string } | null>(null);

  if (!isOpen || !imageUrl) return null;

  const downloadName = `${title.replace(/\s+/g, '_')}.jpg`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      let savedPath: string | null = null;
      if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
        try {
          savedPath = await invoke<string>('save_file_to_downloads', {
            filename: downloadName,
            bytes: Array.from(uint8)
          });
        } catch (tauriErr) {
          console.warn('Tauri save command failed, falling back to browser download:', tauriErr);
        }
      }

      if (savedPath) {
        setDownloadFeedback({ message: 'Saved to Downloads', path: savedPath });
      } else {
        const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
        const blobDownloadUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobDownloadUrl;
        tempLink.download = downloadName;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobDownloadUrl), 2000);
        setDownloadFeedback({ message: 'Downloaded successfully' });
      }
    } catch (e: any) {
      console.error('Image download error:', e);
      setDownloadFeedback({ message: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  };

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
            {downloadFeedback ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                <span>{downloadFeedback.message}</span>
                {downloadFeedback.path && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await invoke('open_in_folder', { path: downloadFeedback.path });
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Show in Folder
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
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
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  cursor: isDownloading ? 'not-allowed' : 'pointer'
                }}
              >
                {isDownloading ? (
                  <RefreshCw style={{ width: '14px', height: '14px' }} className="animate-spin" />
                ) : (
                  <Download style={{ width: '14px', height: '14px' }} />
                )}
                <span>{isDownloading ? 'Saving...' : 'Download'}</span>
              </button>
            )}
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
