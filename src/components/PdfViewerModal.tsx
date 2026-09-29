import React, { useState, useEffect } from 'react';
import { X, Download, FileText, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen || !pdfUrl) {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl('');
      }
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

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

  return (
    <div className="pdf-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <div className="pdf-modal-header-left">
            <FileText className="pdf-modal-icon" />
            <h3 className="pdf-modal-title">{title}</h3>
          </div>
          <div className="pdf-modal-header-actions">
            <a
              href={effectiveUrl}
              download={downloadName}
              className="pdf-modal-action-btn"
              title="Download PDF"
              aria-label="Download PDF"
            >
              <Download className="action-icon" />
              <span>Download</span>
            </a>
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
