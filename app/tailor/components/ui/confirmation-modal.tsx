import React from 'react';
import styles from './confirmation-modal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText: string;
  cancelButtonText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel,
  isProcessing = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            disabled={isProcessing}
          >
            ×
          </button>
        </div>
        <div className={styles.modalContent}>
          <p>{message}</p>
          <div className={styles.modalActions}>
            <button 
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={isProcessing}
            >
              {cancelButtonText}
            </button>
            <button 
              className={styles.confirmButton}
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 