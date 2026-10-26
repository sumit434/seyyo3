import React from 'react';
import logoSrc from '../../assets/logo.svg';

interface SeyyoLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

export const SeyyoLogo: React.FC<SeyyoLogoProps> = ({
  className = 'w-6 h-6',
  size,
  alt = 'Seyyo Logo',
}) => {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={logoSrc || '/logo.svg'}
      alt={alt}
      className={`block object-contain shadow-none filter-none border-0 ring-0 outline-none ${className}`}
      style={{
        ...sizeStyle,
        boxShadow: 'none',
        filter: 'none',
        WebkitFilter: 'none',
      }}
      loading="eager"
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== `${window.location.origin}/logo.svg`) {
          target.src = '/logo.svg';
        }
      }}
    />
  );
};