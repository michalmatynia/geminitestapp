import { useContext } from 'react';

import {
  DocumentStateContext,
  DocumentActionsContext,
  type DocumentState,
  type DocumentActions,
} from '../DocumentContext';

export const useDocumentState = (): DocumentState => {
  const ctx = useContext(DocumentStateContext);
  if (!ctx) throw new Error('useDocumentState must be used within DocumentProvider');
  return ctx;
};

export const useDocumentActions = (): DocumentActions => {
  const ctx = useContext(DocumentActionsContext);
  if (!ctx) throw new Error('useDocumentActions must be used within DocumentProvider');
  return ctx;
};

export const useDocument = (): DocumentState & DocumentActions => {
  return { ...useDocumentState(), ...useDocumentActions() };
};
