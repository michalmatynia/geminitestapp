'use client';

import { createContext, useContext } from 'react';

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
    throw new Error(
      'useDocumentRelationSearchUiContext must be used within a DocumentRelationSearchUiProvider'
    );
  }
  return context;
}
