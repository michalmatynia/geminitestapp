import type React from 'react';
import {
  CMS_SECTION_BLOCK_TYPE_SET,
  DEFAULT_BLOCK_MIN_HEIGHT,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveAlignItems,
  resolveGapValue,
  resolveJustifyContent,
} from '@/features/cms/components/shared/layout-utils';

export const SECTION_BLOCK_TYPES = CMS_SECTION_BLOCK_TYPE_SET;
export {
  DEFAULT_BLOCK_MIN_HEIGHT,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveAlignItems,
  resolveGapValue,
  resolveJustifyContent,
};

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
