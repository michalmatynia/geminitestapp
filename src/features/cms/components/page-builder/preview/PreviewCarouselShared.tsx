'use client';

import React, { useCallback, useRef } from 'react';

import type { PreviewBlockItemProps } from '@/shared/contracts/cms';

export const STRETCH_TRUE_BLOCK_CONTEXT_VALUE = { stretch: true };
export const STRETCH_FALSE_BLOCK_CONTEXT_VALUE = { stretch: false };

let PreviewBlockItemComponent: React.ComponentType<PreviewBlockItemProps> | null = null;

export function registerCarouselPreviewBlockItem(
  component: React.ComponentType<PreviewBlockItemProps>
): void {
  PreviewBlockItemComponent = component;
}

export function PreviewBlockItemProxy(props: PreviewBlockItemProps): React.ReactNode {
  if (!PreviewBlockItemComponent) {
    throw new Error(
      'PreviewBlockItem has not been registered. Call registerCarouselPreviewBlockItem first.'
    );
  }

  return <PreviewBlockItemComponent {...props} />;
}

export function useParentBlockContextValueResolver(): (parentBlockId: string) => {
  parentBlockId: string;
  } {
  const cacheRef = useRef<Map<string, { parentBlockId: string }>>(new Map());

  return useCallback((parentBlockId: string): { parentBlockId: string } => {
    const cached = cacheRef.current.get(parentBlockId);
    if (cached) return cached;
    const nextValue = { parentBlockId };
    cacheRef.current.set(parentBlockId, nextValue);
    return nextValue;
  }, []);
}

export const parseCarouselBoolSetting = (value: unknown, defaultValue: boolean = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
};
