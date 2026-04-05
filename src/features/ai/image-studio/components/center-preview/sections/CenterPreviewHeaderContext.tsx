'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface CenterPreviewHeaderContextValue {
  onSaveScreenshot: () => void;
}

const { Context: CenterPreviewHeaderContext, useStrictContext: useCenterPreviewHeaderContext } =
  createStrictContext<CenterPreviewHeaderContextValue>({
    hookName: 'useCenterPreviewHeaderContext',
    providerName: 'CenterPreviewHeaderSectionProvider',
    displayName: 'CenterPreviewHeaderContext',
    errorFactory: internalError,
  });

export function CenterPreviewHeaderSectionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CenterPreviewHeaderContextValue;
}): React.JSX.Element {
  return (
    <CenterPreviewHeaderContext.Provider value={value}>
      {children}
    </CenterPreviewHeaderContext.Provider>
  );
}
export { useCenterPreviewHeaderContext };
