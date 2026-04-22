'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { serializeSetting } from '@/shared/utils/settings-json';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildValidatorPatternListsPayload,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
} from '../validator-scope';
import {
  EMPTY_EDITOR_STATE,
  type ValidatorListsView,
  type ValidatorPatternListEditorState,
} from './types';
import {
  canonicalizeLists,
  createListId,
  mergeReorderedVisible,
  toValidatorListsView,
} from './utils';

export function useValidatorLists() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = toValidatorListsView(searchParams.get('view'));
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const parsedPatternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );

  const [lists, setLists] = useState<ValidatorPatternList[]>(parsedPatternLists);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newListScope, setNewListScope] = useState<ValidatorScope>('products');
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] =
    useState<ValidatorPatternListEditorState>(EMPTY_EDITOR_STATE);

  useEffect(() => {
    const raw = rawPatternLists ?? '';
    if (loadedFrom === raw) return;
    setLists(parsedPatternLists);
    setLoadedFrom(raw);
  }, [loadedFrom, parsedPatternLists, rawPatternLists]);

  const isDirty = useMemo(
    () => canonicalizeLists(lists) !== canonicalizeLists(parsedPatternLists),
    [lists, parsedPatternLists]
  );

  const handleListChange = useCallback((id: string, patch: Partial<ValidatorPatternList>): void => {
    const now = new Date().toISOString();
    setLists((current: ValidatorPatternList[]) =>
      current.map((list: ValidatorPatternList) => {
        if (list.id !== id) return list;
        return { ...list, ...patch, updatedAt: now };
      })
    );
  }, []);

  const handleAddList = useCallback((): void => {
    const normalizedName = newListName.trim();
    if (normalizedName === '') {
      toast('List name is required.', { variant: 'error' });
      return;
    }
    const now = new Date().toISOString();
    const nextList: ValidatorPatternList = {
      id: createListId(),
      name: normalizedName,
      description: newListDescription.trim(),
      scope: newListScope,
      deletionLocked: true,
      createdAt: now,
      updatedAt: now,
      patterns: [],
      isActive: true,
    };
    setLists((current: ValidatorPatternList[]) => [...current, nextList]);
    setQuery('');
    setNewListName('');
    setNewListDescription('');
    setNewListScope('products');
    toast('Validation pattern list added. Save to persist.', { variant: 'success' });
  }, [newListDescription, newListName, newListScope, toast]);

  const handleRemoveList = useCallback(
    (list: ValidatorPatternList): void => {
      if (list.deletionLocked) {
        toast('List is locked. Unlock it first to remove.', { variant: 'warning' });
        return;
      }
      if (lists.length <= 1) {
        toast('At least one validation pattern list is required.', { variant: 'warning' });
        return;
      }
      confirm({
        title: 'Remove List?',
        message: `Are you sure you want to remove validation pattern list "${list.name}"? This action must be saved to persist.`,
        confirmText: 'Remove',
        isDangerous: true,
        onConfirm: () => {
          setLists((current: ValidatorPatternList[]) =>
            current.filter((entry: ValidatorPatternList) => entry.id !== list.id)
          );
          toast('List removed. Save to persist.', { variant: 'success' });
        },
      });
    },
    [confirm, lists.length, toast]
  );

  const handleReset = useCallback((): void => {
    setLists(parsedPatternLists);
    setQuery('');
    setEditorOpen(false);
    setEditorState(EMPTY_EDITOR_STATE);
    setNewListName('');
    setNewListDescription('');
    setNewListScope('products');
  }, [parsedPatternLists]);

  const handleSave = useCallback(async (): Promise<void> => {
    const normalized = normalizeValidatorPatternLists(
      lists.map((list: ValidatorPatternList) => ({
        ...list,
        name: list.name.trim(),
        description: list.description.trim(),
      }))
    );

    const invalidList = normalized.find(
      (list: ValidatorPatternList) => list.name.trim().length === 0
    );
    if (invalidList) {
      toast('Each list must have a name.', { variant: 'error' });
      return;
    }

    const value = serializeSetting(buildValidatorPatternListsPayload(normalized));

    try {
      await updateSetting.mutateAsync({ key: VALIDATOR_PATTERN_LISTS_KEY, value });
      setLists(normalized);
      toast('Validation pattern lists saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save validation pattern lists.', {
        variant: 'error',
      });
    }
  }, [lists, toast, updateSetting]);

  const filteredLists = useMemo((): ValidatorPatternList[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) return lists;
    return lists.filter((list: ValidatorPatternList) => {
      const scopeLabel = VALIDATOR_SCOPE_LABELS[list.scope].toLowerCase();
      const scopeDescription = VALIDATOR_SCOPE_DESCRIPTIONS[list.scope].toLowerCase();
      return (
        list.name.toLowerCase().includes(normalizedQuery) ||
        list.id.toLowerCase().includes(normalizedQuery) ||
        list.description.toLowerCase().includes(normalizedQuery) ||
        scopeLabel.includes(normalizedQuery) ||
        scopeDescription.includes(normalizedQuery)
      );
    });
  }, [lists, query]);

  const totalLocked = useMemo(
    () => lists.filter((list: ValidatorPatternList) => list.deletionLocked).length,
    [lists]
  );

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
      setEditorState((current: ValidatorPatternListEditorState) => ({
        ...current,
        ...patch,
      }));
    },
    []
  );

  const handleSaveEditor = useCallback((): void => {
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
  }, [editorState, handleListChange, toast]);

  const handleReorder = useCallback((reorderedVisible: ValidatorPatternList[]): void => {
    setLists((current) => mergeReorderedVisible(current, reorderedVisible));
  }, []);

  const handleToggleLock = useCallback(
    (listId: string): void => {
      const list = lists.find((l) => l.id === listId);
      if (!list) return;
      handleListChange(listId, { deletionLocked: !list.deletionLocked });
    },
    [handleListChange, lists]
  );

  const handleSelectView = useCallback(
    (view: ValidatorListsView): void => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (view === 'lists') {
        nextParams.delete('view');
      } else {
        nextParams.set('view', view);
      }
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery !== '' ? `${pathname}?${nextQuery}` : pathname;
      router.push(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return {
    activeView,
    lists,
    setLists,
    newListName,
    setNewListName,
    newListDescription,
    setNewListDescription,
    newListScope,
    setNewListScope,
    query,
    setQuery,
    editorOpen,
    editorState,
    isDirty,
    isPending: updateSetting.isPending,
    totalLocked,
    filteredLists,
    handleAddList,
    handleRemoveList,
    handleReset,
    handleSave,
    handleOpenEditor,
    handleCloseEditor,
    handleEditorChange,
    handleSaveEditor,
    handleReorder,
    handleToggleLock,
    handleSelectView,
    ConfirmationModal,
  };
}
