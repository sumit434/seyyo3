import React, { useState, useRef, useEffect } from 'react';
import { User, ArrowRight } from 'lucide-react';
import { SeyyoLogo } from './SeyyoLogo';

export const Header: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e2e7e6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <SeyyoLogo className="w-10 h-10 " />
          <div>
            <span className="font-black text-2xl tracking-tight text-[#10181c] lowercase">seyyo</span>
            <span className="text-[10px] font-bold text-[#0e7c66] block uppercase tracking-widest leading-none">
              Platform
            </span>
          </div>
        </a>

        {/* Desktop View */}
        <div className="hidden sm:flex items-center gap-3">
          <a href="/developer" className="hidden sm:inline-block">
            <button
              type="button"
              className="text-xs font-bold text-[#6a787e] hover:text-[#10181c] px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Developer Admin
            </button>
          </a>
          <a href="/staff/login">
            <button
              type="button"
              className="bg-[#0e7c66] hover:bg-[#0a6252] text-white text-xs font-semibold px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer"
            >
              Staff Terminal
            </button>
          </a>
          <a href="/setup">
            <button
              type="button"
              className="bg-[#10181c] hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </a>
        </div>

        {/* Mobile View: Profile Icon with Dropdown */}
        <div className="relative sm:hidden" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            aria-label="Account menu"
            aria-expanded={isProfileOpen}
            className="w-10 h-10 rounded-2xl bg-[#f1f3f2] hover:bg-[#e2e7e6] text-[#2a383f] flex items-center justify-center border border-[#e2e7e6] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0e7c66]/20"
          >
            <User className="w-5 h-5" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-[#e2e7e6] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <a
                href="/setup"
                onClick={() => setIsProfileOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#10181c] hover:bg-[#e2f1ec] hover:text-[#0e7c66] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <div className="h-px bg-[#e2e7e6] my-1" />
              <a
                href="/staff/login"
                onClick={() => setIsProfileOpen(false)}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#6a787e] hover:bg-[#f1f3f2] hover:text-[#10181c] transition-colors block cursor-pointer"
              >
                Staff Terminal
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};