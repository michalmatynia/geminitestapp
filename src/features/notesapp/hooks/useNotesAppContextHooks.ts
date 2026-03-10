'use client';

import { useContext } from 'react';

import { internalError } from '@/shared/errors/app-error';

import { NotesAppActionsContext, NotesAppStateContext } from './NotesAppContext';

import type { NotesAppActionsValue, NotesAppStateValue } from './NotesAppContext.types';

export function useNotesAppState(): NotesAppStateValue {
  const context = useContext(NotesAppStateContext);
  if (!context) {
    throw internalError('useNotesAppState must be used within NotesAppProvider');
  }
  return context;
}

export function useNotesAppActions(): NotesAppActionsValue {
  const context = useContext(NotesAppActionsContext);
  if (!context) {
    throw internalError('useNotesAppActions must be used within NotesAppProvider');
  }
  return context;
}
