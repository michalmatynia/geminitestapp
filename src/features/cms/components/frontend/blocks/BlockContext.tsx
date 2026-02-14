'use client';

import React, { createContext, useContext } from 'react';

import type { BlockInstance } from '../../../types/page-builder';

export interface BlockRenderContextValue {
  block: BlockInstance;
  mediaStyles: React.CSSProperties | null;
  stretch: boolean;
}

export const BlockSettingsContext = createContext<Record<string, unknown> | null>(null);
export const BlockRenderContext = createContext<BlockRenderContextValue | null>(null);

export function useBlockSettings(): Record<string, unknown> | null {
  return useContext(BlockSettingsContext);
}

export function useRequiredBlockSettings(): Record<string, unknown> {
  const context = useContext(BlockSettingsContext);
  if (!context) {
    throw new Error('Block sub-components must be used within a BlockSettingsContext.Provider');
  }
  return context;
}

export function useRequiredBlockRenderContext(): BlockRenderContextValue {
  const context = useContext(BlockRenderContext);
  if (!context) {
    throw new Error('Block sub-components must be used within a BlockRenderContext.Provider');
  }
  return context;
}
