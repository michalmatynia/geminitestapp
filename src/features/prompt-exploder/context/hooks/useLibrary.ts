import { useContext } from 'react';

import {
  LibraryStateContext,
  LibraryActionsContext,
  type LibraryState,
  type LibraryActions,
} from '../LibraryContext';

export const useLibraryState = (): LibraryState => {
  const ctx = useContext(LibraryStateContext);
  if (!ctx) throw new Error('useLibraryState must be used within LibraryProvider');
  return ctx;
};

export const useLibraryActions = (): LibraryActions => {
  const ctx = useContext(LibraryActionsContext);
  if (!ctx) throw new Error('useLibraryActions must be used within LibraryProvider');
  return ctx;
};
