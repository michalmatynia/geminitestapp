'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { VariantThumbnailInfo } from './preview-utils';

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

const { Context: VariantPanelContext, useStrictContext: useVariantPanelContext } =
  createStrictContext<VariantPanelContextValue>({
    hookName: 'useVariantPanelContext',
    providerName: 'VariantPanelProvider',
    displayName: 'VariantPanelContext',
    errorFactory: internalError,
  });

export function VariantPanelProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: VariantPanelContextValue;
}): React.JSX.Element {
  return <VariantPanelContext.Provider value={value}>{children}</VariantPanelContext.Provider>;
}
export { useVariantPanelContext };
