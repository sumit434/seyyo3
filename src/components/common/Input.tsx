import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftAddon,
  rightAddon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-[#10181c] flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}

      <div className="relative flex items-center">
        {leftAddon && (
          <div className="absolute left-4 pointer-events-none text-[#6a787e] flex items-center">
            {leftAddon}
          </div>
        )}

        <input
          id={inputId}
          className={`w-full rounded-2xl border bg-white px-4 py-3.5 text-base text-[#10181c] placeholder-[#6a787e]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0e7c66] focus:border-transparent ${
            leftAddon ? 'pl-11' : ''
          } ${rightAddon ? 'pr-11' : ''} ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-[#e2e7e6]'
          } ${className}`}
          {...props}
        />

        {rightAddon && (
          <div className="absolute right-4 text-[#6a787e] flex items-center">
            {rightAddon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs font-medium text-red-600 mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#6a787e] mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
