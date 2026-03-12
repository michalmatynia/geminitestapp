import { BrainCircuit } from 'lucide-react';
import NextImage from 'next/image';

import { cn, sanitizeSvg } from '@/shared/utils';

import type { TutorMoodAvatarProps } from './KangurAiTutorWidget.shared';
import type { JSX } from 'react';

const KANGUR_TUTOR_AVATAR_IMAGE_SIZES = '48px';

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
  const normalizedImageUrl = typeof avatarImageUrl === 'string' ? avatarImageUrl.trim() : '';
  const hasImage = normalizedImageUrl.length > 0;
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
          src={normalizedImageUrl}
          alt={label}
          fill
          sizes={KANGUR_TUTOR_AVATAR_IMAGE_SIZES}
          unoptimized
          className={cn('object-cover', imgClassName)}
          loading='eager'
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
