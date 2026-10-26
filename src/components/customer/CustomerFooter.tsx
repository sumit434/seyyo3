import React from 'react';
import { SeyyoLogo } from '../common/SeyyoLogo';

export const CustomerFooter: React.FC = () => {
  return (
    <footer className="mt-8 mb-4 text-center flex items-center justify-center gap-2 select-none">
      <SeyyoLogo className="w-5 h-5 shadow-xs" />
      <span className="text-xs text-[#2a383f] font-bold tracking-tight">
        Powered by <span className="text-[#10181c] font-black">Seyyo</span>
      </span>
    </footer>
  );
};
