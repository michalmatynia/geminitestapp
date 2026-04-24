import type React from 'react';
import {
  CMS_SECTION_BLOCK_TYPES,
  DEFAULT_BLOCK_MIN_HEIGHT,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveAlignItems,
  resolveGapValue,
  resolveJustifyContent,
} from '@/features/cms/components/shared/layout-utils';

export type MediaReplaceTarget = {
  kind: 'section' | 'block';
  sectionId: string;
  blockId?: string | undefined;
  columnId?: string | undefined;
  parentBlockId?: string | undefined;
  key: string;
};

// Section-type block types that get a richer preview
export const SECTION_BLOCK_TYPES = CMS_SECTION_BLOCK_TYPES.filter((type) => type !== 'Repeater');

export const normalizeSlideshowAnimationType = (value?: string): string => {
  if (value === undefined || value === '') return 'fade';
  if (value === 'fade-in') return 'fade';
  return value;
};

export {
  DEFAULT_BLOCK_MIN_HEIGHT,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveAlignItems,
  resolveGapValue,
  resolveJustifyContent,
};

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

type SelectableSurfaceProps = Pick<
  React.HTMLAttributes<HTMLElement>,
  'onClick'
>;

export const getSelectableSurfaceProps = (
  onSelect: (event: React.SyntheticEvent<HTMLElement>) => void
): SelectableSurfaceProps => ({
  onClick: onSelect,
});
