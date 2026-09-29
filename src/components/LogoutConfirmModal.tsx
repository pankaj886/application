import React, { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open for safe keyboard default
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="logout-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
    >
      <div
        className="logout-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="logout-modal-icon-wrapper">
          <LogOut className="logout-modal-icon" />
        </div>

        <h3 id="logout-dialog-title" className="logout-modal-title">
          Are you sure you want to log out?
        </h3>

        <p className="logout-modal-subtitle">
          You will need to sign in again to access the Foreigners Studio portal.
        </p>

        <div className="logout-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="logout-modal-btn cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="logout-modal-btn confirm-btn"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
