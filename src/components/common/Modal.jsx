import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', footer }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with modern blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-slate-900/20 transition-all w-full ${maxWidth} border border-slate-200/90 my-6 sm:my-8 text-slate-900`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle top ambient gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"></div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 bg-slate-50/80">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-5 max-h-[calc(85vh-120px)] overflow-y-auto text-slate-700 text-xs sm:text-sm">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
