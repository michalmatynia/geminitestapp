'use client';

import {
  ArrowLeft,
  ExternalLink,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  Unlock,
} from 'lucide-react';
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
  Pagination,
  SearchInput,
  SectionHeader,
  SelectSimple,
  StandardDataTablePanel,
  useToast,
} from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
} from './validator-scope';

import type { ColumnDef } from '@tanstack/react-table';

const scopeOptions: Array<{ value: ValidatorScope; label: string }> = [
  { value: 'products', label: VALIDATOR_SCOPE_LABELS.products },
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
    }))
  );

const formatUpdatedAt = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const raw = rawPatternLists ?? '';
    if (loadedFrom === raw) return;
    setLists(parsedPatternLists);
    setPage(1);
    setLoadedFrom(raw);
  }, [loadedFrom, parsedPatternLists, rawPatternLists]);

  const isDirty = useMemo(
    () => canonicalizeLists(lists) !== canonicalizeLists(parsedPatternLists),
    [lists, parsedPatternLists]
  );

  const handleListChange = useCallback(
    (id: string, patch: Partial<ValidatorPatternList>): void => {
      const now = new Date().toISOString();
      setLists((current: ValidatorPatternList[]) =>
        current.map((list: ValidatorPatternList) => {
          if (list.id !== id) return list;
          return {
            ...list,
            ...patch,
            updatedAt: now,
          };
        })
      );
    },
    []
  );

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
    };
    setLists((current: ValidatorPatternList[]) => [...current, nextList]);
    const nextTotalPages = Math.max(1, Math.ceil((lists.length + 1) / pageSize));
    setPage(nextTotalPages);
    setQuery('');
    setNewListName('');
    setNewListDescription('');
    setNewListScope('products');
    toast('Validation pattern list added. Save to persist.', {
      variant: 'success',
    });
  }, [lists.length, newListDescription, newListName, newListScope, pageSize, toast]);

  const handleRemoveList = useCallback(
    (list: ValidatorPatternList): void => {
      if (list.deletionLocked) {
        toast('List is locked. Unlock it first to remove.', { variant: 'warning' });
        return;
      }
      if (lists.length <= 1) {
        toast('At least one validation pattern list is required.', {
          variant: 'warning',
        });
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
    setPage(1);
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

    const value = serializeSetting({
      version: 1,
      lists: normalized,
    });

    try {
      await updateSetting.mutateAsync({
        key: VALIDATOR_PATTERN_LISTS_KEY,
        value,
      });
      setLists(normalized);
      toast('Validation pattern lists saved.', { variant: 'success' });
    } catch (error: unknown) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save validation pattern lists.',
        { variant: 'error' }
      );
    }
  }, [lists, toast, updateSetting]);

  const filteredLists = useMemo((): ValidatorPatternList[] => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return lists;
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
    () =>
      lists.filter((list: ValidatorPatternList): boolean => list.deletionLocked).length,
    [lists]
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredLists.length / pageSize)),
    [filteredLists.length, pageSize]
  );
  const paginatedLists = useMemo((): ValidatorPatternList[] => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return filteredLists.slice(start, start + pageSize);
  }, [filteredLists, page, pageSize, totalPages]);
  const pageStart = useMemo((): number => {
    if (filteredLists.length === 0) return 0;
    const clampedPage = Math.min(page, totalPages);
    return (clampedPage - 1) * pageSize + 1;
  }, [filteredLists.length, page, pageSize, totalPages]);
  const pageEnd = useMemo((): number => {
    if (filteredLists.length === 0) return 0;
    return Math.min(filteredLists.length, pageStart + pageSize - 1);
  }, [filteredLists.length, pageSize, pageStart]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const columns = useMemo<ColumnDef<ValidatorPatternList>[]>(() => [
    {
      id: 'name',
      header: 'List',
      cell: ({ row }) => {
        const list = row.original;
        return (
          <div className='min-w-0 space-y-1'>
            <Link
              href={`/admin/validator?list=${encodeURIComponent(list.id)}`}
              className='block truncate text-sm font-medium text-gray-100 transition-colors hover:text-white hover:underline'
            >
              {list.name.trim() || 'Unnamed List'}
            </Link>
            <p className='truncate text-[11px] text-muted-foreground'>
              ID: {list.id}
            </p>
          </div>
        );
      },
    },
    {
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => {
        const list = row.original;
        return (
          <Badge variant='outline' className='text-[10px]'>
            {VALIDATOR_SCOPE_LABELS[list.scope]}
          </Badge>
        );
      },
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const list = row.original;
        const description =
          list.description.trim() || VALIDATOR_SCOPE_DESCRIPTIONS[list.scope];
        return (
          <p className='line-clamp-2 text-xs text-muted-foreground'>
            {description}
          </p>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const list = row.original;
        return list.deletionLocked ? (
          <Badge variant='outline' className='text-[10px] border-amber-300/40 text-amber-300'>
            Locked
          </Badge>
        ) : (
          <Badge variant='outline' className='text-[10px] border-emerald-300/40 text-emerald-300'>
            Unlocked
          </Badge>
        );
      },
    },
    {
      id: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground'>
          {formatUpdatedAt(row.original.updatedAt ?? undefined)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => {
        const list = row.original;
        return (
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button type='button' size='xs' variant='outline' asChild>
              <Link href={`/admin/validator?list=${encodeURIComponent(list.id)}`}>
                <ExternalLink className='mr-1.5 size-3.5' />
                Enter
              </Link>
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                handleOpenEditor(list);
              }}
            >
              <Pencil className='mr-1.5 size-3.5' />
              Edit
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                handleListChange(list.id, {
                  deletionLocked: !list.deletionLocked,
                });
              }}
              disabled={updateSetting.isPending}
            >
              {list.deletionLocked ? (
                <Unlock className='mr-1.5 size-3.5 text-emerald-300' />
              ) : (
                <Lock className='mr-1.5 size-3.5 text-amber-300' />
              )}
              {list.deletionLocked ? 'Unlock' : 'Lock'}
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                handleRemoveList(list);
              }}
              disabled={list.deletionLocked || updateSetting.isPending}
              className='text-red-300 hover:text-red-200'
              title={
                list.deletionLocked
                  ? 'Unlock list before removing'
                  : 'Remove list'
              }
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        );
      },
    },
  ], [
    handleListChange,
    handleOpenEditor,
    handleRemoveList,
    updateSetting.isPending,
  ]);

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        eyebrow='AI · Global Validator'
        title='Validation Pattern List Manager'
        description='Create, manage, and enter validation pattern lists.'
        actions={(
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
        )}
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

      <StandardDataTablePanel
        title='Available Lists'
        description='Browse lists like product list rows and enter any list to edit its validation rules.'
        filters={(
          <div className='max-w-sm'>
            <SearchInput
              placeholder='Search lists by name, id, scope, or description...'
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              onClear={() => {
                setQuery('');
                setPage(1);
              }}
              size='sm'
            />
          </div>
        )}
        actions={(
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='text-[10px]'>
              {filteredLists.length} shown
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {lists.length} total
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {totalLocked} locked
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              {pageStart}-{pageEnd}
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
        )}
        columns={columns}
        data={paginatedLists}
        isLoading={settingsQuery.isLoading && !settingsQuery.data}
        loadingVariant='table'
        emptyState={(
          <EmptyState
            title='No validation pattern lists'
            description={
              query.trim()
                ? 'No lists match your search query.'
                : 'Create a validation pattern list to get started.'
            }
          />
        )}
        footer={(
          <div className='flex justify-end border-t border-border/50 pt-3'>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              showPageSize
              showLabels={false}
              variant='compact'
            />
          </div>
        )}
      />

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
