'use client';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { RelationTreeInstance } from '../types';

export type DocumentRelationSearchRuntimeValue = {
  relationTreeInstance: RelationTreeInstance;
};

export const {
  Context: DocumentRelationSearchRuntimeContext,
  useStrictContext: useDocumentRelationSearchRuntime,
} = createStrictContext<DocumentRelationSearchRuntimeValue>({
  hookName: 'useDocumentRelationSearchRuntime',
  providerName: 'DocumentRelationSearchRuntimeProvider',
  displayName: 'DocumentRelationSearchRuntimeContext',
});
