import React from 'react';
import { useToast } from '../context/ToastContext';
import '../styles/toast.css';

export const Toast = ({ toast, onClose }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '●';
    }
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};
