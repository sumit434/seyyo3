import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  href?: string;
  target?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  href,
  target,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 min-h-[48px]';

  const sizeClasses = {
    sm: 'text-sm px-4 py-2.5 rounded-xl',
    md: 'text-base px-5 py-3.5 rounded-2xl',
    lg: 'text-lg px-6 py-4 rounded-2xl',
  };

  const variantClasses = {
    primary: 'bg-[#0e7c66] hover:bg-[#0a6252] text-white shadow-sm hover:shadow active:bg-[#084e41]',
    secondary: 'bg-[#e2f1ec] hover:bg-[#d0eae1] text-[#0e7c66]',
    outline: 'border-2 border-[#e2e7e6] hover:border-[#0e7c66] text-[#10181c] bg-white',
    ghost: 'text-[#6a787e] hover:text-[#10181c] hover:bg-black/5',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const combinedClass = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={combinedClass}
        onClick={props.onClick as any}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={combinedClass}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
};