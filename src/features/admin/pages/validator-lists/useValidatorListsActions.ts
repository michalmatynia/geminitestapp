'use client';
import { useCallback } from 'react';
import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { buildValidatorPatternListsPayload, normalizeValidatorPatternLists, VALIDATOR_PATTERN_LISTS_KEY } from '../validator-scope';
import { createListId } from './utils';

interface UseValidatorListsActionsProps {
  lists: ValidatorPatternList[];
  setLists: React.Dispatch<React.SetStateAction<ValidatorPatternList[]>>;
  newListName: string;
  setNewListName: (val: string) => void;
  newListDescription: string;
  setNewListDescription: (val: string) => void;
  newListScope: ValidatorScope;
  setNewListScope: (val: ValidatorScope) => void;
  setQuery: (val: string) => void;
  parsedPatternLists: ValidatorPatternList[];
  handleCloseEditor: () => void;
}

export function useValidatorListsActions({ lists, setLists, newListName, setNewListName, newListDescription, setNewListDescription, newListScope, setNewListScope, setQuery, parsedPatternLists, handleCloseEditor }: UseValidatorListsActionsProps): {
  isPending: boolean;
  handleAddList: () => void;
  handleRemoveList: (list: ValidatorPatternList) => void;
  handleReset: () => void;
  handleSave: () => Promise<void>;
  ConfirmationModal: React.ComponentType<unknown>;
} {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const updateSetting = useUpdateSetting();
  const handleAddList = useCallback((): void => {
    const name = newListName.trim();
    if (name === '') { toast('List name is required.', { variant: 'error' }); return; }
    const now = new Date().toISOString();
    const next: ValidatorPatternList = { id: createListId(), name, description: newListDescription.trim(), scope: newListScope, deletionLocked: true, createdAt: now, updatedAt: now, patterns: [], isActive: true };
    setLists((current) => [...current, next]);
    setNewListName(''); setNewListDescription(''); setNewListScope('products');
    toast('Validation pattern list added. Save to persist.', { variant: 'success' });
  }, [newListDescription, newListName, newListScope, setLists, setNewListName, setNewListDescription, setNewListScope, toast]);
  const handleRemoveList = useCallback((list: ValidatorPatternList): void => {
    if (list.deletionLocked) { toast('List is locked. Unlock it first to remove.', { variant: 'warning' }); return; }
    confirm({ title: 'Remove List?', message: `Are you sure you want to remove validation pattern list "${list.name}"? This action must be saved to persist.`, confirmText: 'Remove', isDangerous: true, onConfirm: () => {
      setLists((current) => current.filter((entry) => entry.id !== list.id));
      toast('List removed. Save to persist.', { variant: 'success' });
    }});
  }, [confirm, setLists, toast]);
  const handleReset = useCallback((): void => {
    setLists(parsedPatternLists); setQuery(''); handleCloseEditor();
    setNewListName(''); setNewListDescription(''); setNewListScope('products');
  }, [parsedPatternLists, handleCloseEditor, setLists, setQuery, setNewListName, setNewListDescription, setNewListScope]);
  const handleSave = useCallback(async (): Promise<void> => {
    const normalized = normalizeValidatorPatternLists(lists.map(l => ({ ...l, name: l.name.trim(), description: l.description.trim() })));
    if (normalized.some(l => l.name.length === 0)) { toast('Each list must have a name.', { variant: 'error' }); return; }
    try {
      const value = serializeSetting(buildValidatorPatternListsPayload(normalized));
      await updateSetting.mutateAsync({ key: VALIDATOR_PATTERN_LISTS_KEY, value });
      setLists(normalized); toast('Validation pattern lists saved.', { variant: 'success' });
    } catch (e: unknown) {
      logClientError(e); toast(e instanceof Error ? e.message : 'Failed to save validation pattern lists.', { variant: 'error' });
    }
  }, [lists, setLists, toast, updateSetting]);
  return { isPending: updateSetting.isPending, handleAddList, handleRemoveList, handleReset, handleSave, ConfirmationModal };
}
