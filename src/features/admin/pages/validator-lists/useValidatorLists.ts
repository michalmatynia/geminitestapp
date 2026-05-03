'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';

import {
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
} from '../validator-scope';
import {
  type ValidatorListsView,
} from './types';
import {
  canonicalizeLists,
  mergeReorderedVisible,
} from './utils';
import { useValidatorListsActions } from './useValidatorListsActions';
import { useValidatorListsView } from './useValidatorListsView';
import { useValidatorListsEditor } from './useValidatorListsEditor';
import { useValidatorListsFiltering } from './useValidatorListsFiltering';

export interface UseValidatorListsResult {
  activeView: ValidatorListsView;
  lists: ValidatorPatternList[];
  setLists: React.Dispatch<React.SetStateAction<ValidatorPatternList[]>>;
  newListName: string;
  setNewListName: (val: string) => void;
  newListDescription: string;
  setNewListDescription: (val: string) => void;
  newListScope: ValidatorScope;
  setNewListScope: (val: ValidatorScope) => void;
  query: string;
  setQuery: (val: string) => void;
  editorOpen: boolean;
  editorState: unknown;
  isDirty: boolean;
  isPending: boolean;
  totalLocked: number;
  filteredLists: ValidatorPatternList[];
  handleAddList: () => void;
  handleRemoveList: (list: ValidatorPatternList) => void;
  handleReset: () => void;
  handleSave: () => Promise<void>;
  handleOpenEditor: (list: ValidatorPatternList) => void;
  handleCloseEditor: () => void;
  handleEditorChange: (patch: unknown) => void;
  handleSaveEditor: () => void;
  handleReorder: (reorderedVisible: ValidatorPatternList[]) => void;
  handleToggleLock: (listId: string) => void;
  handleSelectView: (view: ValidatorListsView) => void;
  ConfirmationModal: React.ComponentType<unknown>;
}

export function useValidatorLists(): UseValidatorListsResult {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const parsedPatternLists = useMemo(() => parseValidatorPatternLists(rawPatternLists), [rawPatternLists]);

  const [lists, setLists] = useState<ValidatorPatternList[]>(parsedPatternLists);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListScope, setNewListScope] = useState<ValidatorScope>('products');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = rawPatternLists ?? '';
    if (loadedFrom !== raw) { setLists(parsedPatternLists); setLoadedFrom(raw); }
  }, [loadedFrom, parsedPatternLists, rawPatternLists]);

  const { activeView, handleSelectView } = useValidatorListsView();
  const { editorOpen, editorState, handleOpenEditor, handleCloseEditor, handleEditorChange, handleSaveEditor: baseSaveEditor } = useValidatorListsEditor();

  const handleListChange = useCallback((id: string, patch: Partial<ValidatorPatternList>): void => {
    const now = new Date().toISOString();
    setLists((current) => current.map((l) => (l.id !== id ? l : { ...l, ...patch, updatedAt: now })));
  }, []);

  const { isPending, handleAddList, handleRemoveList, handleReset, handleSave, ConfirmationModal } = useValidatorListsActions({
    lists, setLists, newListName, setNewListName, newListDescription, setNewListDescription, newListScope, setNewListScope, setQuery, parsedPatternLists, handleCloseEditor,
  });

  const { filteredLists, totalLocked } = useValidatorListsFiltering(lists, query);

  const isDirty = useMemo(() => canonicalizeLists(lists) !== canonicalizeLists(parsedPatternLists), [lists, parsedPatternLists]);
  const handleSaveEditor = useCallback(() => baseSaveEditor(handleListChange, toast), [baseSaveEditor, handleListChange, toast]);
  const handleReorder = useCallback((reordered: ValidatorPatternList[]) => setLists((current) => mergeReorderedVisible(current, reordered)), []);
  const handleToggleLock = useCallback((id: string) => {
    const list = lists.find((l) => l.id === id);
    if (list) handleListChange(id, { deletionLocked: !list.deletionLocked });
  }, [handleListChange, lists]);

  return {
    activeView, lists, setLists, newListName, setNewListName, newListDescription, setNewListDescription, newListScope, setNewListScope,
    query, setQuery, editorOpen, editorState, isDirty, isPending, totalLocked, filteredLists, handleAddList, handleRemoveList,
    handleReset, handleSave, handleOpenEditor, handleCloseEditor, handleEditorChange, handleSaveEditor, handleReorder, handleToggleLock,
    handleSelectView, ConfirmationModal,
  };
}
