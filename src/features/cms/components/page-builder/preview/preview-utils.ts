import type React from 'react';

export type MediaReplaceTarget = {
  kind: 'section' | 'block';
  sectionId: string;
  blockId?: string | undefined;
  columnId?: string | undefined;
  parentBlockId?: string | undefined;
  key: string;
};

// Section-type block types that get a richer preview
export const SECTION_BLOCK_TYPES = [
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
];

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

export const normalizeSlideshowAnimationType = (value?: string): string => {
  if (!value) return 'fade';
  if (value === 'fade-in') return 'fade';
  return value;
};

export const DEFAULT_BLOCK_MIN_HEIGHT: Record<string, number> = {
  Heading: 48,
  Text: 64,
  TextElement: 32,
  TextAtom: 48,
  TextAtomLetter: 20,
  Announcement: 32,
  Button: 44,
  ImageElement: 140,
  Model3D: 200,
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

export const getSpacingValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const shouldShowSectionDivider = (settings: Record<string, unknown>): boolean => {
  const mt = getSpacingValue(settings['marginTop']);
  const mb = getSpacingValue(settings['marginBottom']);
  return mt === 0 && mb === 0;
};
