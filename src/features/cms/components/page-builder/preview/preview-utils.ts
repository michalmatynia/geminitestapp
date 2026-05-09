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

export const getCarouselAlignmentClasses = (
  contentAlignment: string,
  verticalAlignment: string
): { alignmentClass: string; verticalAlignmentClass: string } => {
  let alignmentClass = 'items-start justify-start';
  if (contentAlignment === 'center') {
    alignmentClass = 'items-center justify-center';
  } else if (contentAlignment === 'right') {
    alignmentClass = 'items-end justify-end';
  }

  let verticalAlignmentClass = 'justify-start';
  if (verticalAlignment === 'center') {
    verticalAlignmentClass = 'justify-center';
  } else if (verticalAlignment === 'bottom') {
    verticalAlignmentClass = 'justify-end';
  }

  return { alignmentClass, verticalAlignmentClass };
};

export const getSlideshowAlignment = (
  contentAlignment: string,
  verticalAlignment: string
): { alignItems: 'center' | 'flex-end' | 'flex-start'; justifyContent: 'center' | 'flex-end' | 'flex-start' } => {
  let alignItems: 'center' | 'flex-end' | 'flex-start' = 'flex-start';
  if (contentAlignment === 'center') {
    alignItems = 'center';
  } else if (contentAlignment === 'right') {
    alignItems = 'flex-end';
  }

  let justifyContent: 'center' | 'flex-end' | 'flex-start' = 'flex-start';
  if (verticalAlignment === 'center') {
    justifyContent = 'center';
  } else if (verticalAlignment === 'bottom') {
    justifyContent = 'flex-end';
  }

  return { alignItems, justifyContent };
};

export interface CarouselFrameStyleProps {
  frameSettings: Record<string, unknown>;
  transitionType: string;
  transitionDuration: number;
  isActive: boolean;
  index: number;
}

export const getCarouselFrameStyle = ({
  frameSettings,
  transitionType,
  transitionDuration,
  isActive,
  index,
}: CarouselFrameStyleProps): React.CSSProperties => {
  const backgroundColor = (frameSettings['backgroundColor'] as string | undefined) ?? '';
  const paddingTop = (frameSettings['paddingTop'] as number | undefined) ?? 0;
  const paddingBottom = (frameSettings['paddingBottom'] as number | undefined) ?? 0;
  const paddingLeft = (frameSettings['paddingLeft'] as number | undefined) ?? 0;
  const paddingRight = (frameSettings['paddingRight'] as number | undefined) ?? 0;

  const frameStyle: React.CSSProperties = {
    backgroundColor: backgroundColor !== '' ? backgroundColor : undefined,
    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
  };

  if (transitionType === 'slide') {
    frameStyle.minWidth = '100%';
    frameStyle.flexShrink = 0;
  } else {
    frameStyle.position = index === 0 ? 'relative' : 'absolute';
    frameStyle.top = 0;
    frameStyle.left = 0;
    frameStyle.width = '100%';
    frameStyle.height = '100%';
    frameStyle.opacity = isActive ? 1 : 0;
    frameStyle.visibility = isActive ? 'visible' : 'hidden';
    if (transitionType === 'fade') {
      frameStyle.transition = `opacity ${transitionDuration}ms ease-in-out`;
    }
  }

  return frameStyle;
};

export interface SlideshowFrameData {
  backgroundColor: string;
  contentAlignment: string;
  verticalAlignment: string;
  fillContent: boolean;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  animationType: string;
  animationDuration: number;
  animationDelay: number;
  animationEasing: string;
}

export const getSlideshowFrameData = (
  frameSettings: Record<string, unknown>,
  elementAnimationType: string,
  elementAnimationDuration: number,
  elementAnimationDelay: number,
  elementAnimationEasing: string
): SlideshowFrameData => ({
  backgroundColor: (frameSettings['backgroundColor'] as string | undefined) ?? '',
  contentAlignment: (frameSettings['contentAlignment'] as string | undefined) ?? 'center',
  verticalAlignment: (frameSettings['verticalAlignment'] as string | undefined) ?? 'center',
  fillContent: frameSettings['fillContent'] === true || frameSettings['fillContent'] === 'yes',
  paddingTop: (frameSettings['paddingTop'] as number | undefined) ?? 0,
  paddingBottom: (frameSettings['paddingBottom'] as number | undefined) ?? 0,
  paddingLeft: (frameSettings['paddingLeft'] as number | undefined) ?? 0,
  paddingRight: (frameSettings['paddingRight'] as number | undefined) ?? 0,
  animationType: ((): string => {
    const type = frameSettings['animationType'] as string | undefined;
    return type === 'inherit' || type === undefined || type === '' ? elementAnimationType : type;
  })(),
  animationDuration: (frameSettings['animationDuration'] as number | undefined) ?? elementAnimationDuration,
  animationDelay: (frameSettings['animationDelay'] as number | undefined) ?? elementAnimationDelay,
  animationEasing: ((): string => {
    const easing = frameSettings['animationEasing'] as string | undefined;
    return easing === 'inherit' || easing === undefined || easing === '' ? elementAnimationEasing : easing;
  })(),
});
