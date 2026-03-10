import { BrainCircuit } from 'lucide-react';
import NextImage from 'next/image';


import { cn, sanitizeSvg } from '@/shared/utils';

import type { TutorMoodAvatarProps } from './KangurAiTutorWidget.shared';
import type { JSX } from 'react';

export function KangurAiTutorMoodAvatar({
  svgContent,
  avatarImageUrl,
  label,
  className,
  imgClassName,
  svgClassName,
  fallbackIconClassName,
  'data-testid': dataTestId,
}: TutorMoodAvatarProps): JSX.Element {
  const hasImage = typeof avatarImageUrl === 'string' && avatarImageUrl.trim().length > 0;
  const hasSvg = typeof svgContent === 'string' && svgContent.trim().length > 0;

  return (
    <div
      aria-label={label}
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-full',
        className
      )}
      data-testid={dataTestId}
      role='img'
    >
      {hasImage ? (
        <NextImage
          src={avatarImageUrl}
          alt={label}
          fill
          sizes='100%'
          unoptimized
          className={cn('h-full w-full object-cover', imgClassName)}
          loading='lazy'
        />
      ) : hasSvg ? (
        <div
          className={cn(
            'h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:overflow-visible',
            svgClassName
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent, { viewBox: '0 0 100 100' }) }}
        />
      ) : (
        <BrainCircuit
          aria-hidden='true'
          className={cn('h-1/2 w-1/2 text-white', fallbackIconClassName)}
        />
      )}
    </div>
  );
}
