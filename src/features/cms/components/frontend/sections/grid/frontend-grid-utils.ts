import React from 'react';

export const SECTION_BLOCK_TYPES = new Set([
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
]);

export const getGapClass = (gap?: string): string => {
  if (gap === 'none') return 'gap-0';
  if (gap === 'small') return 'gap-4';
  if (gap === 'large') return 'gap-12';
  return 'gap-8';
};

export const resolveGapValue = (gap: unknown, fallback: string): string => {
  if (typeof gap === 'string' && gap !== 'inherit') return gap;
  return fallback;
};

export const getGapStyle = (gapPx: unknown): React.CSSProperties | undefined => {
  if (typeof gapPx === 'number' && Number.isFinite(gapPx) && gapPx > 0) {
    return { gap: `${gapPx}px` };
  }
  return undefined;
};

export const resolveJustifyContent = (
  value: unknown
): React.CSSProperties['justifyContent'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'space-between') return 'space-between';
  if (value === 'space-around') return 'space-around';
  if (value === 'space-evenly') return 'space-evenly';
  if (value === 'start') return 'flex-start';
  return undefined;
};

export const resolveAlignItems = (
  value: unknown
): React.CSSProperties['alignItems'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'stretch') return 'stretch';
  if (value === 'start') return 'flex-start';
  return undefined;
};

export const DEFAULT_BLOCK_MIN_HEIGHT: Record<string, number> = {
  Heading: 48,
  Text: 64,
  TextElement: 32,
  TextAtom: 48,
  Announcement: 32,
  Button: 44,
  ImageElement: 140,
  Image: 140,
  VideoEmbed: 160,
  Divider: 12,
  SocialLinks: 40,
  Icon: 40,
  AppEmbed: 180,
  RichText: 140,
  ImageWithText: 200,
  Hero: 240,
  Block: 0,
};

export const getBlockMinHeight = (type: string): number => DEFAULT_BLOCK_MIN_HEIGHT[type] ?? 40;

export const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

export const resolveObjectPosition = (value: string): string => {
  const map: Record<string, string> = {
    center: 'center',
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom',
  };
  return map[value] ?? 'center';
};

export const resolveGradientDirection = (value: string): string => {
  const map: Record<string, string> = {
    'to-top': 'to top',
    'to-bottom': 'to bottom',
    'to-left': 'to left',
    'to-right': 'to right',
    'to-top-left': 'to top left',
    'to-top-right': 'to top right',
    'to-bottom-left': 'to bottom left',
    'to-bottom-right': 'to bottom right',
  };
  return map[value] ?? 'to bottom';
};

export const buildTransparencyMaskStyles = (
  mode: string,
  direction: string,
  strength: number
): React.CSSProperties => {
  if (mode !== 'gradient' || strength <= 0) return {};
  const dirMap: Record<string, string> = {
    top: 'to bottom',
    bottom: 'to top',
    left: 'to right',
    right: 'to left',
    'top-left': 'to bottom right',
    'top-right': 'to bottom left',
    'bottom-left': 'to top right',
    'bottom-right': 'to top left',
  };
  const dir = dirMap[direction] ?? 'to bottom';
  const stop = Math.min(100, Math.max(0, strength));
  const gradient = `linear-gradient(${dir}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${stop}%, rgba(0,0,0,1) 100%)`;
  return {
    WebkitMaskImage: gradient,
    maskImage: gradient,
  };
};
