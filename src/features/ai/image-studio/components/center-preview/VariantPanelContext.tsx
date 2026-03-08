'use client';

import React, { createContext, useContext } from 'react';

import type { VariantThumbnailInfo } from './preview-utils';
import { internalError } from '@/shared/errors/app-error';

export type VariantPanelContextValue = {
  activeRunError: string | null;
  activeVariantId: string | null;
  compareVariantA: VariantThumbnailInfo | null;
  compareVariantB: VariantThumbnailInfo | null;
  compareVariantIds: [string | null, string | null];
  deletePending: boolean;
  filteredVariantThumbnails: VariantThumbnailInfo[];
  variantLoadingId: string | null;
  variantTimestampQuery: string;
  visibleVariantThumbnails: VariantThumbnailInfo[];
  onClearCompare: () => void;
  onDeleteVariant: (variant: VariantThumbnailInfo) => void;
  onDismissRunError: () => void;
  onLoadVariantToCanvas: (variant: VariantThumbnailInfo) => Promise<void>;
  onOpenVariantDetails: (variant: VariantThumbnailInfo) => void;
  onSetCompareVariantA: (variantId: string) => void;
  onSetCompareVariantB: (variantId: string) => void;
  onVariantTimestampQueryChange: (value: string) => void;
  onVariantTooltipLeave: () => void;
  onVariantTooltipMove: (
    event: React.MouseEvent<HTMLButtonElement>,
    variant: VariantThumbnailInfo
  ) => void;
};

const VariantPanelContext = createContext<VariantPanelContextValue | null>(null);

export function VariantPanelProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: VariantPanelContextValue;
}) {
  return <VariantPanelContext.Provider value={value}>{children}</VariantPanelContext.Provider>;
}

export function useVariantPanelContext() {
  const context = useContext(VariantPanelContext);
  if (!context) {
    throw internalError('useVariantPanelContext must be used within VariantPanelProvider');
  }
  return context;
}
