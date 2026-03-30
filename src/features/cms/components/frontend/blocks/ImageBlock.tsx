import Image from 'next/image';
import React from 'react';

import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';
import {
  clampNumber,
  resolveObjectPosition,
  resolveGradientDirection,
  buildTransparencyMaskStyles,
  toBoolean,
} from './image-utils';

export function ImageElementBlock(): React.ReactNode {
  const { mediaStyles, stretch } = useRequiredBlockRenderContext();
  const settings = useRequiredBlockSettings();
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
  const shape = (settings['shape'] as string) || 'none';
  const borderRadius = (settings['borderRadius'] as number) || 0;
  const borderWidth = (settings['borderWidth'] as number) || 0;
  const borderStyle = (settings['borderStyle'] as string) || 'solid';
  const borderColor = (settings['borderColor'] as string) || '#ffffff';
  const overlayType = (settings['overlayType'] as string) || 'none';
  const overlayColor = (settings['overlayColor'] as string) || '#000000';
  const overlayOpacity = clampNumber(settings['overlayOpacity'], 0, 100, 0) / 100;
  const overlayGradientFrom = (settings['overlayGradientFrom'] as string) || '#000000';
  const overlayGradientTo = (settings['overlayGradientTo'] as string) || '#ffffff';
  const overlayGradientDirection = (settings['overlayGradientDirection'] as string) || 'to-bottom';
  const transparencyMode = (settings['transparencyMode'] as string) || 'none';
  const transparencyDirection = (settings['transparencyDirection'] as string) || 'bottom';
  const transparencyStrength = clampNumber(settings['transparencyStrength'], 0, 100, 0);
  const clipOverflow = toBoolean(settings['clipOverflow'], false);

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
  if (borderWidth > 0 && borderStyle !== 'none') {
    wrapperStyles.borderWidth = `${borderWidth}px`;
    wrapperStyles.borderStyle = borderStyle;
    wrapperStyles.borderColor = borderColor;
  }
  if (shape === 'circle') {
    wrapperStyles.borderRadius = '9999px';
    wrapperStyles.overflow = 'hidden';
  } else if (shape === 'rounded' && borderRadius > 0) {
    wrapperStyles.borderRadius = `${borderRadius}px`;
    wrapperStyles.overflow = 'hidden';
  }
  if (clipOverflow) {
    wrapperStyles.overflow = 'hidden';
  }

  const shadow = settings['imageShadow'] as Record<string, unknown> | undefined;
  if (shadow) {
    const x = (shadow['x'] as number) ?? 0;
    const y = (shadow['y'] as number) ?? 0;
    const blurShadow = (shadow['blur'] as number) ?? 0;
    const spread = (shadow['spread'] as number) ?? 0;
    const color = shadow['color'] as string | undefined;
    if ((x || y || blurShadow || spread) && color) {
      wrapperStyles.boxShadow = `${x}px ${y}px ${blurShadow}px ${spread}px ${color}`;
    }
  }

  Object.assign(
    wrapperStyles,
    buildTransparencyMaskStyles(transparencyMode, transparencyDirection, transparencyStrength)
  );

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
  const overlayStyles: React.CSSProperties = {};
  if (overlayType === 'solid') {
    overlayStyles.backgroundColor = overlayColor;
    overlayStyles.opacity = overlayOpacity;
  } else if (overlayType === 'gradient') {
    overlayStyles.backgroundImage = `linear-gradient(${resolveGradientDirection(overlayGradientDirection)}, ${overlayGradientFrom}, ${overlayGradientTo})`;
    overlayStyles.opacity = overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

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
  const imageStylesForFill: React.CSSProperties = { ...imageStyles };
  delete (imageStylesForFill as { width?: string | number }).width;
  delete (imageStylesForFill as { height?: string | number }).height;

  return (
    <div className='relative' style={wrapperStyles}>
      {useFill ? (
        <Image src={src} alt={alt} fill style={imageStylesForFill} />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          style={{
            ...imageStyles,
            height: 'auto',
          }}
        />
      )}
      {overlayType !== 'none' && (
        <div className='pointer-events-none absolute inset-0' style={overlayStyles} />
      )}
    </div>
  );
}

export function ImageBlock(): React.ReactNode {
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
  const useFill = stretch;

  return (
    <div className='cms-media' style={wrapperStyles}>
      {useFill ? (
        <Image src={src} alt={alt} fill className={imageClassName} />
      ) : (
        <Image src={src} alt={alt} width={1000} height={1000} className={imageClassName} />
      )}
    </div>
  );
}
