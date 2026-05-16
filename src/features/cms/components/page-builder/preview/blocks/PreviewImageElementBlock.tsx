'use client';

import React from 'react';
import Image from 'next/image';
import { type BlockInstance } from '@/shared/contracts/cms';
import {
  clampNumber,
  resolveObjectPosition,
} from '../image-utils';

type PreviewImageElementBlockProps = {
  block: BlockInstance;
  mediaStyles: React.CSSProperties | null;
  stretch: boolean;
};

export const PreviewImageElementBlock: React.FC<PreviewImageElementBlockProps> = ({
  block,
  mediaStyles,
  stretch,
}) => {
  const settings = block.settings;
  const src = (settings['src'] as string) || '';
  const alt = (settings['alt'] as string) || 'Image';
  const width = (settings['width'] as number) || 100;
  const height = (settings['height'] as number) || 0;
  const aspectRatio = (settings['aspectRatio'] as string) || 'auto';
  const objectFit = (settings['objectFit'] as React.CSSProperties['objectFit']) || 'cover';
  const objectPosition = resolveObjectPosition((settings['objectPosition'] as string) || 'center');
  
  const opacity = clampNumber(settings['opacity'], 0, 100, 100);
  const blur = clampNumber(settings['blur'], 0, 20, 0);
  const grayscale = clampNumber(settings['grayscale'], 0, 100, 0);
  const brightness = clampNumber(settings['brightness'], 0, 200, 100);
  const contrast = clampNumber(settings['contrast'], 0, 200, 100);
  const scale = clampNumber(settings['scale'], 50, 200, 100);
  const rotate = clampNumber(settings['rotate'], -180, 180, 0);

  const wrapperStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    width: `${width}%`,
  };

  if (height > 0) wrapperStyles.height = `${height}px`;
  if (aspectRatio !== 'auto') wrapperStyles.aspectRatio = aspectRatio;
  if (stretch) {
    wrapperStyles.width = '100%';
    wrapperStyles.height = '100%';
  }

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (grayscale > 0) filters.push(`grayscale(${grayscale / 100})`);
  if (brightness !== 100) filters.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) filters.push(`contrast(${contrast / 100})`);

  const transforms: string[] = [];
  if (scale !== 100) transforms.push(`scale(${scale / 100})`);
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: '100%',
    maxHeight: '100%',
    objectFit,
    objectPosition,
    opacity: opacity / 100,
    filter: filters.length ? filters.join(' ') : undefined,
    transform: transforms.length ? transforms.join(' ') : undefined,
    display: 'block',
  };

  if (!src) {
    return (
      <div
        className='cms-media cms-appearance-subtle-surface cms-appearance-muted-text flex items-center justify-center py-8 text-sm'
        style={wrapperStyles}
      >
        No image selected
      </div>
    );
  }

  const useFill = stretch || height > 0 || aspectRatio !== 'auto';
  
  return (
    <div className='relative' style={wrapperStyles}>
      {useFill ? (
        <Image src={src} alt={alt} fill style={imageStyles} />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          style={{ ...imageStyles, height: 'auto' }}
        />
      )}
    </div>
  );
};
