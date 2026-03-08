'use client';

import React, { createContext, useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import type {
  ImportExportActionsContextType,
  ImportExportDataContextType,
  ImportExportStateContextType,
} from './ImportExportContext.types';
import { useImportExportRuntime } from './useImportExportRuntime';

export type {
  ImportExportActionsContextType,
  ImportExportContextType,
  ImportExportDataContextType,
  ImportExportStateContextType,
} from './ImportExportContext.types';

const ImportExportStateContext = createContext<ImportExportStateContextType | undefined>(undefined);
const ImportExportDataContext = createContext<ImportExportDataContextType | undefined>(undefined);
const ImportExportActionsContext = createContext<ImportExportActionsContextType | undefined>(
  undefined
);

export function ImportExportProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { actionsValue, dataValue, stateValue } = useImportExportRuntime();

  return (
    <ImportExportStateContext.Provider value={stateValue}>
      <ImportExportDataContext.Provider value={dataValue}>
        <ImportExportActionsContext.Provider value={actionsValue}>
          {children}
        </ImportExportActionsContext.Provider>
      </ImportExportDataContext.Provider>
    </ImportExportStateContext.Provider>
  );
}

export function useImportExportState(): ImportExportStateContextType {
  const context = useContext(ImportExportStateContext);
  if (context === undefined) {
    throw internalError('useImportExportState must be used within an ImportExportProvider');
  }
  return context;
}

export function useImportExportData(): ImportExportDataContextType {
  const context = useContext(ImportExportDataContext);
  if (context === undefined) {
    throw internalError('useImportExportData must be used within an ImportExportProvider');
  }
  return context;
}

export function useImportExportActions(): ImportExportActionsContextType {
  const context = useContext(ImportExportActionsContext);
  if (context === undefined) {
    throw internalError('useImportExportActions must be used within an ImportExportProvider');
  }
  return context;
}
