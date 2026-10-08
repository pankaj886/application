import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PdfViewerModalProps {
  isOpen: boolean;
  title: string;
  pdfUrl: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  title,
  pdfUrl,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{ message: string; path?: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !pdfUrl) {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl('');
      }
      setDownloadFeedback(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setDownloadFeedback(null);

    fetch(pdfUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(err => {
        if (!active) return;
        console.warn('Blob conversion fallback to direct url:', err);
        setBlobUrl(pdfUrl);
        setLoading(false);
      });

    return () => {
      active = false;
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  const downloadName = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
  const effectiveUrl = blobUrl || pdfUrl;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(effectiveUrl);
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
        setDownloadFeedback({
          message: 'Saved to Downloads',
          path: savedPath
        });
      } else {
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
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
      console.error('Download error:', e);
      setDownloadFeedback({ message: 'Download failed' });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="pdf-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <div className="pdf-modal-header-left">
            <FileText className="pdf-modal-icon" />
            <h3 className="pdf-modal-title">{title}</h3>
          </div>
          <div className="pdf-modal-header-actions">
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
                title="Download PDF to your PC"
                aria-label="Download PDF"
                style={{ cursor: isDownloading ? 'not-allowed' : 'pointer' }}
              >
                {isDownloading ? (
                  <RefreshCw className="action-icon animate-spin" />
                ) : (
                  <Download className="action-icon" />
                )}
                <span>{isDownloading ? 'Saving...' : 'Download'}</span>
              </button>
            )}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="pdf-modal-action-btn"
              title="Open in new window"
              aria-label="Open in new window"
            >
              <ExternalLink className="action-icon" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="pdf-modal-close-btn"
              title="Close Preview (Esc)"
              aria-label="Close Preview"
            >
              <X className="close-icon" />
            </button>
          </div>
        </div>

        <div className="pdf-modal-body">
          {loading ? (
            <div className="pdf-loading-state">
              <RefreshCw className="pdf-loading-spin animate-spin" />
              <span>Loading preview document...</span>
            </div>
          ) : error ? (
            <div className="pdf-error-state">
              <AlertCircle className="pdf-error-icon" />
              <span>Could not load document preview.</span>
              <a href={pdfUrl} download={downloadName} className="pdf-retry-btn">
                Download PDF directly
              </a>
            </div>
          ) : (
            <iframe
              src={`${effectiveUrl}#toolbar=1&navpanes=0`}
              title={title}
              className="pdf-modal-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
};
