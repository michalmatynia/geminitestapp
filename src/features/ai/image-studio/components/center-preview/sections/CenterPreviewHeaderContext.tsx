'use client';

import React, { createContext, useContext } from 'react';

export interface CenterPreviewHeaderContextValue {
  onSaveScreenshot: () => void;
}

const CenterPreviewHeaderContext = createContext<CenterPreviewHeaderContextValue | null>(null);

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

export function useCenterPreviewHeaderContext(): CenterPreviewHeaderContextValue {
  const context = useContext(CenterPreviewHeaderContext);
  if (!context) {
    throw new Error(
      'useCenterPreviewHeaderContext must be used within CenterPreviewHeaderSectionProvider'
    );
  }
  return context;
}
