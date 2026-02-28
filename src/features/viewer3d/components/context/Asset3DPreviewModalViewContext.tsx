'use client';

import React from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';

type Asset3DPreviewModalViewContextValue = {
  asset: Asset3DRecord;
};

const Asset3DPreviewModalViewContext =
  React.createContext<Asset3DPreviewModalViewContextValue | null>(null);

type Asset3DPreviewModalViewProviderProps = {
  value: Asset3DPreviewModalViewContextValue;
  children: React.ReactNode;
};

export function Asset3DPreviewModalViewProvider({
  value,
  children,
}: Asset3DPreviewModalViewProviderProps): React.JSX.Element {
  return (
    <Asset3DPreviewModalViewContext.Provider value={value}>
      {children}
    </Asset3DPreviewModalViewContext.Provider>
  );
}

export function useAsset3DPreviewModalViewContext(): Asset3DPreviewModalViewContextValue {
  const context = React.useContext(Asset3DPreviewModalViewContext);
  if (!context) {
    throw internalError(
      'useAsset3DPreviewModalViewContext must be used within Asset3DPreviewModalViewProvider'
    );
  }
  return context;
}
