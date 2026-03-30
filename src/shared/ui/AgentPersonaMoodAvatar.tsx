'use client';

import { BrainCircuit } from 'lucide-react';
import NextImage from 'next/image';

import { cn, sanitizeSvg } from '@/shared/utils';

type AgentPersonaMoodAvatarProps = {
  svgContent?: string | null;
  avatarImageUrl?: string | null;
  label: string;
  className?: string;
  imgClassName?: string;
  svgClassName?: string;
  fallbackIconClassName?: string;
  'data-testid'?: string;
};

const AGENT_PERSONA_MOOD_AVATAR_IMAGE_SIZES = '64px';

export function AgentPersonaMoodAvatar(props: AgentPersonaMoodAvatarProps): React.JSX.Element {
  const {
    svgContent,
    avatarImageUrl,
    label,
    className,
    imgClassName,
    svgClassName,
    fallbackIconClassName,
    'data-testid': dataTestId,
  } = props;
  const normalizedImageUrl = typeof avatarImageUrl === 'string' ? avatarImageUrl.trim() : '';
  const hasImage = normalizedImageUrl.length > 0;
  const hasSvg = typeof svgContent === 'string' && svgContent.trim().length > 0;

  return (
    <div
      aria-label={label}
      className={cn('relative flex items-center justify-center overflow-hidden rounded-full', className)}
      data-testid={dataTestId}
      role='img'
    >
      {hasImage ? (
        <NextImage
          src={normalizedImageUrl}
          alt={label}
          fill
          sizes={AGENT_PERSONA_MOOD_AVATAR_IMAGE_SIZES}
          unoptimized
          className={cn('object-cover', imgClassName)}
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
