import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-charcoal/40 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} border border-brand-border shadow-xl overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-brand-canvas/50">
          <h3 className="font-serif-title text-lg font-bold text-brand-charcoal">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-brand-secondary hover:text-brand-charcoal hover:bg-brand-border/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

