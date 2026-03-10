'use client';

import { ArrowLeft, Plus, Save } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  EmptyState,
  FormSection,
  Input,
  SearchInput,
  SectionHeader,
  SelectSimple,
  useToast,
} from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

import { ValidatorListTree } from './validator-lists/ValidatorListTree';
import {
  buildValidatorPatternListsPayload,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
} from './validator-scope';

const scopeOptions: Array<{ value: ValidatorScope; label: string }> = [
  { value: 'products', label: VALIDATOR_SCOPE_LABELS['products'] },
  { value: 'image-studio', label: VALIDATOR_SCOPE_LABELS['image-studio'] },
  { value: 'prompt-exploder', label: VALIDATOR_SCOPE_LABELS['prompt-exploder'] },
  {
    value: 'case-resolver-prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
  },
  {
    value: 'case-resolver-plain-text',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-plain-text'],
  },
  {
    value: 'ai-paths',
    label: VALIDATOR_SCOPE_LABELS['ai-paths'],
  },
  {
    value: 'kangur-ai-tutor-onboarding',
    label: VALIDATOR_SCOPE_LABELS['kangur-ai-tutor-onboarding'],
  },
];

const createListId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `validator-list-${crypto.randomUUID()}`;
  }
  return `validator-list-${Math.random().toString(36).slice(2, 10)}`;
};

const canonicalizeLists = (lists: ValidatorPatternList[]): string =>
  JSON.stringify(
    normalizeValidatorPatternLists(lists).map((list: ValidatorPatternList) => ({
      id: list.id,
      name: list.name.trim(),
      description: list.description.trim(),
      scope: list.scope,
      deletionLocked: list.deletionLocked,
      patterns: list.patterns,
      isActive: list.isActive,
    }))
  );

type ValidatorPatternListEditorState = {
  id: string;
  name: string;
  description: string;
  scope: ValidatorScope;
  deletionLocked: boolean;
};

const EMPTY_EDITOR_STATE: ValidatorPatternListEditorState = {
  id: '',
  name: '',
  description: '',
  scope: 'products',
  deletionLocked: true,
};

const EDITOR_FIELDS: SettingsField<ValidatorPatternListEditorState>[] = [
  {
    key: 'name',
    label: 'List Name',
    type: 'text',
    placeholder: 'List name',
    required: true,
  },
  {
    key: 'scope',
    label: 'Scope',
    type: 'select',
    options: scopeOptions.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Optional description',
  },
  {
    key: 'deletionLocked',
    label: 'Deletion Locked',
    type: 'switch',
    helperText: 'Keep this on to prevent accidental list removal.',
  },
];

/**
 * Merges reordered visible items back into the full list array.
 *
 * When a search filter is active, drag-drop only affects visible items.
 * This function places them back into their original position slots in the
 * full array so that non-visible items are not displaced.
 */
function mergeReorderedVisible(
  allLists: ValidatorPatternList[],
  reorderedVisible: ValidatorPatternList[]
): ValidatorPatternList[] {
  if (reorderedVisible.length === allLists.length) {
    return reorderedVisible;
  }
  const visibleIds = new Set(reorderedVisible.map((l) => l.id));
  const originalSlots: number[] = [];
  allLists.forEach((l, i) => {
    if (visibleIds.has(l.id)) originalSlots.push(i);
  });
  const result = [...allLists];
  reorderedVisible.forEach((item, newIdx) => {
    const slot = originalSlots[newIdx];
    if (slot !== undefined) result[slot] = item;
  });
  return result;
}

/**
 * Validator docs: see docs/validator/function-reference.md#ui.adminvalidatorpatternlistspage
 */
export function AdminValidatorPatternListsPage(): React.JSX.Element {
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
    if (!normalizedName) {
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
      toast(error instanceof Error ? error.message : 'Failed to save validation pattern lists.', {
        variant: 'error',
      });
    }
  }, [lists, toast, updateSetting]);

  const filteredLists = useMemo((): ValidatorPatternList[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return lists;
    return lists.filter((list: ValidatorPatternList) => {
      const scopeLabel = (VALIDATOR_SCOPE_LABELS[list.scope] ?? '').toLowerCase();
      const scopeDescription = (VALIDATOR_SCOPE_DESCRIPTIONS[list.scope] ?? '').toLowerCase();
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

  const handleSaveEditor = useCallback(async (): Promise<void> => {
    const normalizedName = editorState.name.trim();
    if (!normalizedName) {
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

  // Drag-drop reorder: merge visible reorder back into full list
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

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        eyebrow='AI · Global Validator'
        title='Validation Pattern List Manager'
        description='Create, manage, and enter validation pattern lists.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button type='button' variant='outline' size='xs' asChild>
              <Link href='/admin/validator'>
                <ArrowLeft className='mr-2 size-4' />
                Back To Validator
              </Link>
            </Button>
            <Button
              type='button'
              size='xs'
              onClick={(): void => {
                void handleSave();
              }}
              disabled={!isDirty || updateSetting.isPending}
            >
              <Save className='mr-2 size-4' />
              Save Lists
            </Button>
          </div>
        }
      />

      <FormSection
        title='Add New List'
        description='Create a new list and choose which validator scope it points to.'
        className='space-y-3 p-4'
      >
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)_auto]'>
          <Input
            value={newListName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setNewListName(event.target.value);
            }}
            placeholder='List name'
            className='h-9'
          />
          <SelectSimple
            size='sm'
            value={newListScope}
            onValueChange={(value: string): void => {
              const matched = scopeOptions.find((option) => option.value === value);
              setNewListScope(matched?.value ?? 'products');
            }}
            options={scopeOptions}
            triggerClassName='h-9'
          />
          <Input
            value={newListDescription}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setNewListDescription(event.target.value);
            }}
            placeholder='Optional description'
            className='h-9'
          />
          <Button type='button' onClick={handleAddList} className='h-9 whitespace-nowrap'>
            <Plus className='mr-1.5 size-3.5' />
            Add List
          </Button>
        </div>
      </FormSection>

      <FormSection
        title='Available Lists'
        description='Drag to reorder. Click Enter to manage patterns. Reset or Save when done.'
        className='p-4'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <div className='max-w-sm'>
              <SearchInput
                placeholder='Search lists...'
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onClear={() => {
                  setQuery('');
                }}
                size='sm'
              />
            </div>
            <Badge variant='outline' className='text-[10px]'>
              {filteredLists.length === lists.length
                ? `${lists.length} lists`
                : `${filteredLists.length} / ${lists.length} shown`}
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {totalLocked} locked
            </Badge>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleReset}
              disabled={!isDirty || updateSetting.isPending}
            >
              Reset
            </Button>
          </div>
        }
      >
        <div className='mt-3'>
          {lists.length === 0 ? (
            <EmptyState
              title='No validation pattern lists'
              description='Create a validation pattern list to get started.'
            />
          ) : (
            <ValidatorListTree
              lists={filteredLists}
              onReorder={handleReorder}
              onEdit={handleOpenEditor}
              onToggleLock={handleToggleLock}
              onRemove={handleRemoveList}
              isPending={updateSetting.isPending}
            />
          )}
        </div>
      </FormSection>

      <SettingsPanelBuilder<ValidatorPatternListEditorState>
        open={editorOpen}
        onClose={handleCloseEditor}
        title='Edit Validation Pattern List'
        subtitle='Update list metadata and scope. Save Lists to persist changes.'
        fields={EDITOR_FIELDS}
        values={editorState}
        onChange={handleEditorChange}
        onSave={handleSaveEditor}
        size='sm'
      />

      <ConfirmationModal />
    </div>
  );
}
