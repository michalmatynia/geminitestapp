'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type FileUploadEventsPanelContextValue = {
  title: string;
  description: string;
};

const {
  Context: FileUploadEventsPanelContext,
  useStrictContext: useFileUploadEventsPanelContext,
} = createStrictContext<FileUploadEventsPanelContextValue>({
  hookName: 'useFileUploadEventsPanelContext',
  providerName: 'FileUploadEventsPanelProvider',
  displayName: 'FileUploadEventsPanelContext',
  errorFactory: internalError,
});

export { useFileUploadEventsPanelContext };

type FileUploadEventsPanelProviderProps = {
  value: FileUploadEventsPanelContextValue;
  children: React.ReactNode;
};

export function FileUploadEventsPanelProvider({
  value,
  children,
}: FileUploadEventsPanelProviderProps): React.JSX.Element {
  return (
    <FileUploadEventsPanelContext.Provider value={value}>
      {children}
    </FileUploadEventsPanelContext.Provider>
  );
}
