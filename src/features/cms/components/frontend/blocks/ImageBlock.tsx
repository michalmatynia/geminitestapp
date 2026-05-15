'use client';

import React from 'react';
import Image from 'next/image';
import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';
import {
  clampNumber,
  resolveObjectPosition,
  resolveGradientDirection,
  buildTransparencyMaskStyles,
  toBoolean,
} from './image-utils';

type ImageSettings = {
  src: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: string;
  objectFit: React.CSSProperties['objectFit'];
  objectPosition: string;
  opacity: number;
  blur: number;
  grayscale: number;
  brightness: number;
  contrast: number;
  scale: number;
  rotate: number;
  shape: string;
  borderRadius: number;
  borderWidth: number;
  borderStyle: string;
  borderColor: string;
  overlayType: string;
  overlayColor: string;
  overlayOpacity: number;
  overlayGradientFrom: string;
  overlayGradientTo: string;
  overlayGradientDirection: string;
  transparencyMode: string;
  transparencyDirection: string;
  transparencyStrength: number;
  clipOverflow: boolean;
};

const resolveImageSettings = (settings: Record<string, unknown>): ImageSettings => ({
  src: (settings['src'] as string) || '',
  alt: (settings['alt'] as string) || 'Image',
  width: (settings['width'] as number) || 100,
  height: (settings['height'] as number) || 0,
  aspectRatio: (settings['aspectRatio'] as string) || 'auto',
  objectFit: (settings['objectFit'] as React.CSSProperties['objectFit']) || 'cover',
  objectPosition: resolveObjectPosition((settings['objectPosition'] as string) || 'center'),
  opacity: clampNumber(settings['opacity'], 0, 100, 100),
  blur: clampNumber(settings['blur'], 0, 20, 0),
  grayscale: clampNumber(settings['grayscale'], 0, 100, 0),
  brightness: clampNumber(settings['brightness'], 0, 200, 100),
  contrast: clampNumber(settings['contrast'], 0, 200, 100),
  scale: clampNumber(settings['scale'], 50, 200, 100),
  rotate: clampNumber(settings['rotate'], -180, 180, 0),
  shape: (settings['shape'] as string) || 'none',
  borderRadius: (settings['borderRadius'] as number) || 0,
  borderWidth: (settings['borderWidth'] as number) || 0,
  borderStyle: (settings['borderStyle'] as string) || 'solid',
  borderColor: (settings['borderColor'] as string) || '#ffffff',
  overlayType: (settings['overlayType'] as string) || 'none',
  overlayColor: (settings['overlayColor'] as string) || '#000000',
  overlayOpacity: clampNumber(settings['overlayOpacity'], 0, 100, 0) / 100,
  overlayGradientFrom: (settings['overlayGradientFrom'] as string) || '#000000',
  overlayGradientTo: (settings['overlayGradientTo'] as string) || '#ffffff',
  overlayGradientDirection: (settings['overlayGradientDirection'] as string) || 'to-bottom',
  transparencyMode: (settings['transparencyMode'] as string) || 'none',
  transparencyDirection: (settings['transparencyDirection'] as string) || 'bottom',
  transparencyStrength: clampNumber(settings['transparencyStrength'], 0, 100, 0),
  clipOverflow: toBoolean(settings['clipOverflow'], false),
});

export function ImageElementBlock(): React.JSX.Element | null {
  const { mediaStyles, stretch } = useRequiredBlockRenderContext();
  const settings = useRequiredBlockSettings();
  const s = resolveImageSettings(settings);

  const wrapperStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    width: `${s.width}%`,
  };
  if (s.height > 0) wrapperStyles.height = `${s.height}px`;
  if (s.aspectRatio !== 'auto') wrapperStyles.aspectRatio = s.aspectRatio;
  if (stretch) {
    wrapperStyles.width = '100%';
    wrapperStyles.height = '100%';
  }
  if (s.borderWidth > 0 && s.borderStyle !== 'none') {
    wrapperStyles.borderWidth = `${s.borderWidth}px`;
    wrapperStyles.borderStyle = s.borderStyle;
    wrapperStyles.borderColor = s.borderColor;
  }
  if (s.shape === 'circle') {
    wrapperStyles.borderRadius = '9999px';
    wrapperStyles.overflow = 'hidden';
  } else if (s.shape === 'rounded' && s.borderRadius > 0) {
    wrapperStyles.borderRadius = `${s.borderRadius}px`;
    wrapperStyles.overflow = 'hidden';
  }
  if (s.clipOverflow) {
    wrapperStyles.overflow = 'hidden';
  }

  const filters: string[] = [];
  if (s.blur > 0) filters.push(`blur(${s.blur}px)`);
  if (s.grayscale > 0) filters.push(`grayscale(${s.grayscale / 100})`);
  if (s.brightness !== 100) filters.push(`brightness(${s.brightness / 100})`);
  if (s.contrast !== 100) filters.push(`contrast(${s.contrast / 100})`);

  const transforms: string[] = [];
  if (s.scale !== 100) transforms.push(`scale(${s.scale / 100})`);
  if (s.rotate !== 0) transforms.push(`rotate(${s.rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: '100%',
    maxHeight: '100%',
    objectFit: s.objectFit,
    objectPosition: s.objectPosition,
    opacity: s.opacity / 100,
    filter: filters.length ? filters.join(' ') : undefined,
    transform: transforms.length ? transforms.join(' ') : undefined,
    display: 'block',
  };

  const overlayStyles: React.CSSProperties = {};
  if (s.overlayType === 'solid') {
    overlayStyles.backgroundColor = s.overlayColor;
    overlayStyles.opacity = s.overlayOpacity;
  } else if (s.overlayType === 'gradient') {
    overlayStyles.backgroundImage = `linear-gradient(${resolveGradientDirection(s.overlayGradientDirection)}, ${s.overlayGradientFrom}, ${s.overlayGradientTo})`;
    overlayStyles.opacity = s.overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

  if (!s.src) {
    return (
      <div
        className='cms-media cms-appearance-subtle-surface cms-appearance-muted-text flex items-center justify-center py-8 text-sm'
        style={wrapperStyles}
      >
        No image selected
      </div>
    );
  }
  
  const useFill = stretch || s.height > 0 || s.aspectRatio !== 'auto';
  
  return (
    <div className='relative' style={wrapperStyles}>
      {useFill ? (
        <Image src={s.src} alt={s.alt} fill style={imageStyles} />
      ) : (
        <Image
          src={s.src}
          alt={s.alt}
          width={1000}
          height={1000}
          style={{ ...imageStyles, height: 'auto' }}
        />
      )}
      {s.overlayType !== 'none' && (
        <div className='pointer-events-none absolute inset-0' style={overlayStyles} />
      )}
    </div>
  );
}

export function ImageBlock(): React.JSX.Element {
  const { mediaStyles, stretch } = useRequiredBlockRenderContext();
  const settings = useRequiredBlockSettings();
  const src = (settings['src'] as string) || '';
  const alt = (settings['alt'] as string) || '';
  const width = (settings['width'] as number) || 100;
  const borderRadius = (settings['borderRadius'] as number) || 0;
  const clipOverflow = toBoolean(settings['clipOverflow'], false);

  const resolvedStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    ...(borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {}),
  };

  if (!src) {
    return (
      <div
        className='cms-media cms-appearance-subtle-surface cms-appearance-muted-text flex items-center justify-center py-8 text-sm'
        style={{ width: `${width}%`, ...resolvedStyles }}
      >
        No image selected
      </div>
    );
  }

  const wrapperStyles: React.CSSProperties = {
    width: `${width}%`,
    ...(stretch ? { width: '100%', height: '100%' } : {}),
    ...resolvedStyles,
    ...(clipOverflow ? { overflow: 'hidden' } : {}),
  };
  
  const imageClassName = stretch
    ? 'block h-full w-full object-cover'
    : 'block h-auto w-full max-h-full object-cover';

  return (
    <div className='cms-media' style={wrapperStyles}>
      {stretch ? (
        <Image src={src} alt={alt} fill className={imageClassName} />
      ) : (
        <Image src={src} alt={alt} width={1000} height={1000} className={imageClassName} />
      )}
    </div>
  );
}
