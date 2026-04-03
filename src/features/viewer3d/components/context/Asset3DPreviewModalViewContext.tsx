'use client';

import React from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type Asset3DPreviewModalViewContextValue = {
  asset: Asset3DRecord;
};

const {
  Context: Asset3DPreviewModalViewContext,
  useStrictContext: useAsset3DPreviewModalViewContext,
} = createStrictContext<Asset3DPreviewModalViewContextValue>({
  hookName: 'useAsset3DPreviewModalViewContext',
  providerName: 'Asset3DPreviewModalViewProvider',
  displayName: 'Asset3DPreviewModalViewContext',
  errorFactory: internalError,
});

export { useAsset3DPreviewModalViewContext };

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
