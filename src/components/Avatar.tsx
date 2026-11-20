import React, { useState } from 'react';
import { isValidImageSrc } from '../utils/format';

interface AvatarProps {
  avatar: string;
  name: string;
  accentColor?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-lg',
  lg: 'h-14 w-14 text-2xl',
  xl: 'h-20 w-20 text-4xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  name,
  accentColor = '#B83B35',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = isValidImageSrc(avatar) && !imgError;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-white shadow-sm ${SIZE_MAP[size]} ${className}`}
      style={{
        backgroundColor: showImage ? '#F4EFE6' : `${accentColor}22`,
        color: accentColor,
      }}
      title={name}
    >
      {showImage ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="select-none leading-none">
          {avatar || name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};
