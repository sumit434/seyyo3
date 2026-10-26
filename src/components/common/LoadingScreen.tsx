import React from 'react';
import { Loader2 } from 'lucide-react';
import { SeyyoLogo } from './SeyyoLogo';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading seyyo experience...' }) => {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center bg-[#f1f3f2]">
      <div className="w-16 h-16 mb-6 animate-pulse">
        <SeyyoLogo className="w-full h-full shadow-md" />
      </div>
      <div className="flex items-center gap-3 text-[#10181c] font-semibold text-lg">
        <Loader2 className="w-5 h-5 animate-spin text-[#0e7c66]" />
        <span>{message}</span>
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
