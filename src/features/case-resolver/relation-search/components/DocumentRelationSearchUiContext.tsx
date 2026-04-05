'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface DocumentRelationSearchUiContextValue {
  showSortControl: boolean;
  showFileTypeFilter: boolean;
}

const {
  Context: DocumentRelationSearchUiContext,
  useStrictContext: useDocumentRelationSearchUiContext,
} = createStrictContext<DocumentRelationSearchUiContextValue>({
  hookName: 'useDocumentRelationSearchUiContext',
  providerName: 'a DocumentRelationSearchUiProvider',
  displayName: 'DocumentRelationSearchUiContext',
  errorFactory: internalError,
});

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

export { useDocumentRelationSearchUiContext };
