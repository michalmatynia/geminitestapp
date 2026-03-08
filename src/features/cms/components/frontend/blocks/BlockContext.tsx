'use client';

import type { CSSProperties } from 'react';
import { createContext, useContext } from 'react';

import type { PreviewBlockProps } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

type BlockRenderContextValue = {
  block: PreviewBlockProps['block'];
  mediaStyles: NonNullable<PreviewBlockProps['mediaStyles']> | CSSProperties | null;
  stretch: boolean;
};

export type { BlockRenderContextValue };

export const BlockSettingsContext = createContext<Record<string, unknown> | null>(null);
export const BlockRenderContext = createContext<BlockRenderContextValue | null>(null);

export function useBlockSettings(): Record<string, unknown> | null {
  return useContext(BlockSettingsContext);
}

export function useRequiredBlockSettings(): Record<string, unknown> {
  const context = useContext(BlockSettingsContext);
  if (!context) {
    throw internalError('Block sub-components must be used within a BlockSettingsContext.Provider');
  }
  return context;
}

export function useRequiredBlockRenderContext(): BlockRenderContextValue {
  const context = useContext(BlockRenderContext);
  if (!context) {
    throw internalError('Block sub-components must be used within a BlockRenderContext.Provider');
  }
  return context;
}
