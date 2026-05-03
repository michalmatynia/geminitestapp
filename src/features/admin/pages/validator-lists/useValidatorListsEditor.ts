import { useCallback, useState } from 'react';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import type { ToastType } from '@/shared/ui/primitives.public';
import { EMPTY_EDITOR_STATE, type ValidatorPatternListEditorState } from './types';

export interface UseValidatorListsEditorResult {
  editorOpen: boolean;
  editorState: ValidatorPatternListEditorState;
  handleOpenEditor: (list: ValidatorPatternList) => void;
  handleCloseEditor: () => void;
  handleEditorChange: (patch: Partial<ValidatorPatternListEditorState>) => void;
  handleSaveEditor: (handleListChange: (id: string, patch: Partial<ValidatorPatternList>) => void, toast: (msg: string, options: { variant: ToastType }) => void) => void;
}

export function useValidatorListsEditor(): UseValidatorListsEditorResult {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<ValidatorPatternListEditorState>(EMPTY_EDITOR_STATE);

  const handleOpenEditor = useCallback((list: ValidatorPatternList): void => {
    setEditorState({
      id: list.id,
      name: list.name,
      description: list.description,
      scope: list.scope,
      deletionLocked: list.deletionLocked,
    });
    setEditorOpen(true);
  }, []);

  const handleCloseEditor = useCallback((): void => {
    setEditorOpen(false);
    setEditorState(EMPTY_EDITOR_STATE);
  }, []);

  const handleEditorChange = useCallback(
    (patch: Partial<ValidatorPatternListEditorState>): void => {
      setEditorState((current) => ({ ...current, ...patch }));
    },
    []
  );

  const handleSaveEditor = useCallback(
    (
      handleListChange: (id: string, patch: Partial<ValidatorPatternList>) => void,
      toast: (msg: string, options: { variant: ToastType }) => void
    ): void => {
      const normalizedName = editorState.name.trim();
      if (normalizedName === '') {
        toast('List name is required.', { variant: 'error' });
        return;
      }
      handleListChange(editorState.id, {
        name: normalizedName,
        description: editorState.description.trim(),
        scope: editorState.scope,
        deletionLocked: editorState.deletionLocked,
      });
      setEditorOpen(false);
      setEditorState(EMPTY_EDITOR_STATE);
      toast('List updated. Save to persist.', { variant: 'success' });
    },
    [editorState]
  );

  return {
    editorOpen,
    editorState,
    handleOpenEditor,
    handleCloseEditor,
    handleEditorChange,
    handleSaveEditor,
  };
}
