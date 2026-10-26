import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-x-hidden">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-t-3xl sm:rounded-3xl border border-[#e2e7e6] shadow-xl overflow-hidden z-10 animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[85vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) ? (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#e2e7e6]/60 shrink-0 bg-white sticky top-0 z-10">
            <div className="pr-2">
              {title && <h3 className="text-lg sm:text-xl font-bold text-[#10181c]">{title}</h3>}
              {description && <p className="text-xs sm:text-sm text-[#6a787e] mt-0.5 sm:mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#6a787e] hover:text-[#10181c] hover:bg-black/5 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#6a787e] hover:text-[#10181c] hover:bg-black/5 rounded-full transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center z-20"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className={`overflow-y-auto overscroll-contain flex-1 ${title || description ? 'p-4 sm:p-6' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
