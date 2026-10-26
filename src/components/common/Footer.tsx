import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { SeyyoLogo } from './SeyyoLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#e2e7e6] py-12 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex items-center gap-2.5">
          <SeyyoLogo className="w-8 h-8 rounded-xl shadow-xs" />
          <span className="font-black text-lg tracking-tight text-[#10181c] lowercase">seyyo</span>
        </div>

        {/* Universal Contact Touchpoints */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-[#2a383f]">
          <a
            href="mailto:team.seyyo@gmail.com"
            className="flex items-center gap-1.5 hover:text-[#0e7c66] transition-colors"
          >
            <Mail className="w-4 h-4 text-[#0e7c66]" />
            <span>team.seyyo@gmail.com</span>
          </a>
          <span className="hidden sm:inline text-[#e2e7e6]">•</span>
          <a
            href="tel:+917021127377"
            className="flex items-center gap-1.5 hover:text-[#0e7c66] transition-colors"
          >
            <Phone className="w-4 h-4 text-[#0e7c66]" />
            <span>+91 7021127377</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#6a787e]">
          <a href="/terms" className="hover:text-[#10181c] transition-colors">Terms of Service</a>
          <a href="/privacy" className="hover:text-[#10181c] transition-colors">Privacy Policy</a>
          <a href="/refund-policy" className="hover:text-[#10181c] transition-colors">Cancellation & Refund</a>
          <a href="/about" className="hover:text-[#10181c] transition-colors">About & Contact</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-4 border-t border-[#f1f3f2] text-center text-xs text-[#6a787e]">
        © {new Date().getFullYear()} seyyo. All rights reserved.
      </div>
    </footer>
  );
};
