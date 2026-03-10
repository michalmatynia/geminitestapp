import { useContext } from 'react';

import {
  SegmentEditorStateContext,
  SegmentEditorActionsContext,
} from '../SegmentEditorContext';

import type { SegmentEditorState, SegmentEditorActions } from '../SegmentEditorContext.types';

export const useSegmentEditorState = (): SegmentEditorState => {
  const ctx = useContext(SegmentEditorStateContext);
  if (!ctx) throw new Error('useSegmentEditorState must be used within SegmentEditorProvider');
  return ctx;
};

export const useSegmentEditorActions = (): SegmentEditorActions => {
  const ctx = useContext(SegmentEditorActionsContext);
  if (!ctx) throw new Error('useSegmentEditorActions must be used within SegmentEditorProvider');
  return ctx;
};
