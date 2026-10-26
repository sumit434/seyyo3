import React, { useState, useRef, useEffect } from 'react';
import { User, ArrowRight } from 'lucide-react';
import { SeyyoLogo } from '../common/SeyyoLogo';
import { Button } from '../common/Button';

interface NavbarProps {
  onGetStarted?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStarted }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  const handleGetStartedClick = () => {
    setIsProfileOpen(false);
    if (onGetStarted) {
      onGetStarted();
    } else {
      const pricingEl = document.getElementById('pricing');
      if (pricingEl) {
        pricingEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = '#pricing';
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#e2e7e6]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href="/" className="flex items-center gap-2.5">
          <SeyyoLogo className="w-10 h-10 shadow-sm" />
          <span className="font-extrabold text-2xl tracking-tight text-[#0e7c66] lowercase font-['Clarity_City',sans-serif] block leading-tight">
            seyyo
          </span>
        </a>

        {/* Desktop Navigation Links & Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Button href="/staff/login" variant="ghost" size="sm">
            Staff Terminal
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGetStartedClick}
            className="gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile View: Profile Icon with Dropdown Menu */}
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
              <button
                type="button"
                onClick={handleGetStartedClick}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#10181c] hover:bg-[#e2f1ec] hover:text-[#0e7c66] transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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

export default Navbar;