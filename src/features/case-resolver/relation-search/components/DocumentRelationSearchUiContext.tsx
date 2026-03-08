'use client';

import { createContext, useContext } from 'react';
import { internalError } from '@/shared/errors/app-error';

export interface DocumentRelationSearchUiContextValue {
  showSortControl: boolean;
  showFileTypeFilter: boolean;
}

const DocumentRelationSearchUiContext = createContext<DocumentRelationSearchUiContextValue | null>(
  null
);

export function DocumentRelationSearchUiProvider({
  value,
  children,
}: {
  value: DocumentRelationSearchUiContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <DocumentRelationSearchUiContext.Provider value={value}>
      {children}
    </DocumentRelationSearchUiContext.Provider>
  );
}

export function useDocumentRelationSearchUiContext(): DocumentRelationSearchUiContextValue {
  const context = useContext(DocumentRelationSearchUiContext);
  if (!context) {
    throw internalError(
      'useDocumentRelationSearchUiContext must be used within a DocumentRelationSearchUiProvider'
    );
  }
  return context;
}
