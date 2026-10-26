import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { SeyyoLogo } from './SeyyoLogo';

export interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionText?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
  actionText = 'Try Again',
}) => {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-[#f1f3f2]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e2e7e6] shadow-sm flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#10181c] mb-2">{title}</h3>
        <p className="text-sm text-[#6a787e] mb-6 leading-relaxed">{message}</p>

        {onRetry && (
          <Button onClick={onRetry} variant="primary" fullWidth className="gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>{actionText}</span>
          </Button>
        )}
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 select-none">
        <SeyyoLogo className="w-5 h-5 shadow-xs" />
        <span className="text-xs text-[#2a383f] font-bold tracking-tight">
          Powered by <span className="text-[#10181c] font-black lowercase">seyyo</span>
        </span>
      </div>
    </div>
  );
};
