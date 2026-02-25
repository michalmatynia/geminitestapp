/* eslint-disable */
// @ts-nocheck
'use client';

import React from 'react';
import Image from 'next/image';
import { 
  clampNumber, 
  resolveObjectPosition, 
  buildTransparencyMaskStyles, 
  resolveGradientDirection 
} from './frontend-grid-utils';

function buildImageElementPresentation(
  settings: Record<string, unknown>
): {
  wrapperStyles: React.CSSProperties;
  imageStyles: React.CSSProperties;
  overlayStyles: React.CSSProperties;
  hasOverlay: boolean;
  useFill: boolean;
} {
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

  const wrapperStyles: React.CSSProperties = {
    width: `\${width}%`,
  };
  if (height > 0) wrapperStyles.height = `\${height}px`;
  if (aspectRatio !== 'auto') wrapperStyles.aspectRatio = aspectRatio;
  if (borderWidth > 0 && borderStyle !== 'none') {
    wrapperStyles.borderWidth = `\${borderWidth}px`;
    wrapperStyles.borderStyle = borderStyle;
    wrapperStyles.borderColor = borderColor;
  }
  if (shape === 'circle') {
    wrapperStyles.borderRadius = '9999px';
    wrapperStyles.overflow = 'hidden';
  } else if (shape === 'rounded' && borderRadius > 0) {
    wrapperStyles.borderRadius = `\${borderRadius}px`;
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
      wrapperStyles.boxShadow = `\${x}px \${y}px \${blurShadow}px \${spread}px \${color}`;
    }
  }

  Object.assign(wrapperStyles, buildTransparencyMaskStyles(transparencyMode, transparencyDirection, transparencyStrength));

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(\${blur}px)`);
  if (grayscale > 0) filters.push(`grayscale(\${grayscale / 100})`);
  if (brightness !== 100) filters.push(`brightness(\${brightness / 100})`);
  if (contrast !== 100) filters.push(`contrast(\${contrast / 100})`);

  const transforms: string[] = [];
  if (scale !== 100) transforms.push(`scale(\${scale / 100})`);
  if (rotate !== 0) transforms.push(`rotate(\${rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: '100%',
    objectFit,
    objectPosition,
    opacity: opacity / 100,
    filter: filters.length ? filters.join(' ') : undefined,
    transform: transforms.length ? transforms.join(' ') : undefined,
  };

  const overlayStyles: React.CSSProperties = {};
  if (overlayType === 'solid') {
    overlayStyles.backgroundColor = overlayColor;
    overlayStyles.opacity = overlayOpacity;
  } else if (overlayType === 'gradient') {
    overlayStyles.backgroundImage = `linear-gradient(\${resolveGradientDirection(overlayGradientDirection)}, \${overlayGradientFrom}, \${overlayGradientTo})`;
    overlayStyles.opacity = overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

  return {
    wrapperStyles,
    imageStyles,
    overlayStyles,
    hasOverlay: overlayType !== 'none',
    useFill: height > 0 || aspectRatio !== 'auto',
  };
}

export function BackgroundImageLayer({ 
  settings 
}: { 
  settings?: Record<string, unknown> 
}): React.ReactNode {
  if (!settings) return null;
  const src = (settings['src'] as string) || '';
  if (!src) return null;
  const alt = (settings['alt'] as string) || '';
  const presentation = buildImageElementPresentation(settings);
  const wrapperStyles: React.CSSProperties = {
    ...presentation.wrapperStyles,
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };
  delete (wrapperStyles as { aspectRatio?: string }).aspectRatio;
  const imageStyles: React.CSSProperties = {
    ...presentation.imageStyles,
    display: 'block',
  };
  delete (imageStyles as { height?: string | number }).height;
  delete (imageStyles as { width?: string | number }).width;

  return (
    <div className='absolute inset-0 z-0' style={wrapperStyles}>
      <Image src={src} alt={alt} fill style={imageStyles} />
      {presentation.hasOverlay && (
        <div className='pointer-events-none absolute inset-0' style={presentation.overlayStyles} />
      )}
    </div>
  );
}
