import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertCircle, X } from 'lucide-react';

const PopupContext = createContext(null);

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);

  // showWarning, showError, showSuccess, showConfirm
  const showPopup = useCallback(({
    type = 'warning', // 'warning' | 'error' | 'success' | 'confirm'
    title = 'Warning',
    message = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm = null,
    onCancel = null,
  }) => {
    return new Promise((resolve) => {
      setPopup({
        type,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setPopup(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setPopup(null);
          if (onCancel) onCancel();
          resolve(false);
        },
      });
    });
  }, []);

  const showWarning = useCallback((message, title = 'Notice') => {
    return showPopup({ type: 'warning', title, message, confirmText: 'Understood' });
  }, [showPopup]);

  const showError = useCallback((message, title = 'Error') => {
    return showPopup({ type: 'error', title, message, confirmText: 'Close' });
  }, [showPopup]);

  const showSuccess = useCallback((message, title = 'Success') => {
    return showPopup({ type: 'success', title, message, confirmText: 'Great' });
  }, [showPopup]);

  const showConfirm = useCallback((message, { title = 'Confirm Action', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return showPopup({ type: 'confirm', title, message, confirmText, cancelText });
  }, [showPopup]);

  return (
    <PopupContext.Provider value={{ showPopup, showWarning, showError, showSuccess, showConfirm }}>
      {children}

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-brand-border shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 text-center space-y-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                {popup.type === 'warning' && (
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
                {popup.type === 'error' && (
                  <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-brand-red">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                )}
                {popup.type === 'success' && (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                )}
                {popup.type === 'confirm' && (
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
              </div>

              {/* Title & Message */}
              <div className="space-y-1.5">
                <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">
                  {popup.title}
                </h3>
                <p className="text-xs text-brand-secondary leading-relaxed px-2">
                  {popup.message}
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-center gap-3">
                {popup.type === 'confirm' ? (
                  <>
                    <button
                      onClick={popup.onCancel}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-brand-border text-xs font-semibold text-brand-charcoal hover:bg-brand-canvas transition-colors"
                    >
                      {popup.cancelText}
                    </button>
                    <button
                      onClick={popup.onConfirm}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all"
                    >
                      {popup.confirmText}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={popup.onConfirm}
                    className="w-full py-2.5 px-6 rounded-xl bg-brand-charcoal hover:bg-black active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    {popup.confirmText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
}

