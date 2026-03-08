'use client';

import React from 'react';

import type { Page } from '@/shared/contracts/cms';
import { internalError } from '@/shared/errors/app-error';

type CmsEditorContextValue = {
  page: Page | null;
  setPage: React.Dispatch<React.SetStateAction<Page | null>>;
};

const CmsEditorContext = React.createContext<CmsEditorContextValue | null>(null);

type CmsEditorProviderProps = {
  value: CmsEditorContextValue;
  children: React.ReactNode;
};

export function CmsEditorProvider({ value, children }: CmsEditorProviderProps): React.JSX.Element {
  return <CmsEditorContext.Provider value={value}>{children}</CmsEditorContext.Provider>;
}

export function useCmsEditor(): CmsEditorContextValue {
  const context = React.useContext(CmsEditorContext);
  if (!context) {
    throw internalError('useCmsEditor must be used within CmsEditorProvider');
  }
  return context;
}
