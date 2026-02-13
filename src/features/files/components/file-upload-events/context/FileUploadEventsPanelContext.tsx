'use client';

import React from 'react';

type FileUploadEventsPanelContextValue = {
  title: string;
  description: string;
};

const FileUploadEventsPanelContext = React.createContext<FileUploadEventsPanelContextValue | null>(null);

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

export function useFileUploadEventsPanelContext(): FileUploadEventsPanelContextValue {
  const context = React.useContext(FileUploadEventsPanelContext);
  if (!context) {
    throw new Error('useFileUploadEventsPanelContext must be used within FileUploadEventsPanelProvider');
  }
  return context;
}
