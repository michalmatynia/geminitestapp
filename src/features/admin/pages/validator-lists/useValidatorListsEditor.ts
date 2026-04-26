'use client';
import { useCallback, useState } from 'react';
import { EMPTY_EDITOR_STATE, type ValidatorPatternListEditorState } from './types';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import { useToast } from '@/shared/ui/primitives.public';

export function useValidatorListsEditor(
  handleListChange: (id: string, patch: Partial<ValidatorPatternList>) => void
): {
  editorOpen: boolean;
  editorState: ValidatorPatternListEditorState;
  handleOpenEditor: (list: ValidatorPatternList) => void;
  handleCloseEditor: () => void;
  handleEditorChange: (patch: Partial<ValidatorPatternListEditorState>) => void;
  handleSaveEditor: () => void;
} {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<ValidatorPatternListEditorState>(EMPTY_EDITOR_STATE);
  const handleOpenEditor = useCallback((list: ValidatorPatternList): void => {
    setEditorState({ id: list.id, name: list.name, description: list.description, scope: list.scope, deletionLocked: list.deletionLocked });
    setEditorOpen(true);
  }, []);
  const handleCloseEditor = useCallback((): void => {
    setEditorOpen(false);
    setEditorState(EMPTY_EDITOR_STATE);
  }, []);
  const handleEditorChange = useCallback((patch: Partial<ValidatorPatternListEditorState>): void => {
    setEditorState((current) => ({ ...current, ...patch }));
  }, []);
  const handleSaveEditor = useCallback((): void => {
    const normalizedName = editorState.name.trim();
    if (normalizedName === '') {
      toast('List name is required.', { variant: 'error' });
      return;
    }
    handleListChange(editorState.id, { name: normalizedName, description: editorState.description.trim(), scope: editorState.scope, deletionLocked: editorState.deletionLocked });
    setEditorOpen(false);
    setEditorState(EMPTY_EDITOR_STATE);
    toast('List updated. Save to persist.', { variant: 'success' });
  }, [editorState, handleListChange, toast]);
  return { editorOpen, editorState, handleOpenEditor, handleCloseEditor, handleEditorChange, handleSaveEditor };
}
