import type React from 'react';

export const CMS_SECTION_BLOCK_TYPES: string[] = [
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
  'Repeater',
];

export const CMS_SECTION_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(CMS_SECTION_BLOCK_TYPES);

export const DEFAULT_BLOCK_MIN_HEIGHT: Record<string, number> = {
  Heading: 48,
  Text: 64,
  TextElement: 32,
  TextAtom: 48,
  TextAtomLetter: 20,
  Announcement: 32,
  Button: 44,
  Input: 44,
  Progress: 28,
  Repeater: 120,
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

export const getBlockMinHeight = (type: string): number => DEFAULT_BLOCK_MIN_HEIGHT[type] ?? 40;
