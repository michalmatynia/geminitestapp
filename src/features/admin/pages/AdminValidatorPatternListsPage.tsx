'use client';

import { ArrowLeft, Lock, Plus, Save, Trash2, Unlock } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  FormSection,
  Input,
  Pagination,
  SectionHeader,
  SelectSimple,
  ToggleRow,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  VALIDATOR_SCOPE_LABELS,
  type ValidatorPatternList,
  type ValidatorScope,
} from './validator-scope';

const scopeOptions: Array<{ value: ValidatorScope; label: string }> = [
  { value: 'products', label: VALIDATOR_SCOPE_LABELS.products },
  { value: 'image-studio', label: VALIDATOR_SCOPE_LABELS['image-studio'] },
  { value: 'prompt-exploder', label: VALIDATOR_SCOPE_LABELS['prompt-exploder'] },
  {
    value: 'case-resolver-prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
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
        }
      });
    },
    [lists.length, toast, confirm]
  );

  const handleReset = useCallback((): void => {
    setLists(parsedPatternLists);
    setPage(1);
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

  const totalLocked = useMemo(
    () =>
      lists.filter((list: ValidatorPatternList): boolean => list.deletionLocked).length,
    [lists]
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(lists.length / pageSize)),
    [lists.length, pageSize]
  );
  const paginatedLists = useMemo((): ValidatorPatternList[] => {
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    return lists.slice(start, start + pageSize);
  }, [lists, page, pageSize, totalPages]);
  const pageStart = useMemo((): number => {
    if (lists.length === 0) return 0;
    const clampedPage = Math.min(page, totalPages);
    return (clampedPage - 1) * pageSize + 1;
  }, [lists.length, page, pageSize, totalPages]);
  const pageEnd = useMemo((): number => {
    if (lists.length === 0) return 0;
    return Math.min(lists.length, pageStart + pageSize - 1);
  }, [lists.length, pageSize, pageStart]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        eyebrow='AI · Global Validator'
        title='Validation Pattern List Manager'
        description='Create, rename, lock, and remove available validation pattern lists.'
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

      <FormSection
        title='Available Lists'
        description='Use the lock toggle to prevent accidental deletions.'
        className='space-y-3 p-4'
        actions={(
          <div className='flex items-center gap-2'>
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
      >
        {lists.length === 0 ? (
          <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
            No lists available.
          </div>
        ) : (
          <div className='space-y-3'>
            {paginatedLists.map((list: ValidatorPatternList) => (
              <div
                key={list.id}
                className='space-y-3 rounded-lg border border-border/60 bg-card/30 p-3'
              >
                <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_280px_minmax(0,1fr)_auto] md:items-center'>
                  <Input
                    value={list.name}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      handleListChange(list.id, { name: event.target.value });
                    }}
                    placeholder='List name'
                    className='h-9'
                  />
                  <SelectSimple
                    size='sm'
                    value={list.scope}
                    onValueChange={(value: string): void => {
                      const matched = scopeOptions.find((option) => option.value === value);
                      handleListChange(list.id, {
                        scope: matched?.value ?? 'products',
                      });
                    }}
                    options={scopeOptions}
                    triggerClassName='h-9'
                  />
                  <Input
                    value={list.description}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                      handleListChange(list.id, { description: event.target.value });
                    }}
                    placeholder='Optional description'
                    className='h-9'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    className='h-9 text-red-300 hover:text-red-200'
                    onClick={(): void => {
                      handleRemoveList(list);
                    }}
                    disabled={list.deletionLocked || updateSetting.isPending}
                    title={
                      list.deletionLocked
                        ? 'Unlock list before removing'
                        : 'Remove list'
                    }
                  >
                    <Trash2 className='mr-1.5 size-3.5' />
                    Remove
                  </Button>
                </div>
                <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3'>
                  <div className='flex items-center gap-2'>
                    <ToggleRow
                      label={list.deletionLocked ? 'Deletion locked' : 'Deletion unlocked'}
                      checked={list.deletionLocked}
                      onCheckedChange={(checked: boolean): void => {
                        handleListChange(list.id, { deletionLocked: checked });
                      }}
                      icon={list.deletionLocked ? (
                        <Lock className='size-3.5 text-amber-300' />
                      ) : (
                        <Unlock className='size-3.5 text-emerald-300' />
                      )}
                      className='bg-transparent border-none p-0 hover:bg-transparent'
                      labelClassName='text-xs text-gray-300 normal-case tracking-normal font-normal'
                    />
                    <Badge variant='outline' className='text-[10px] ml-2'>
                      {VALIDATOR_SCOPE_LABELS[list.scope]}
                    </Badge>
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    {list.description.trim() ||
                      VALIDATOR_SCOPE_DESCRIPTIONS[list.scope]}
                    {' '}| Updated: {formatUpdatedAt(list.updatedAt ?? undefined)}
                  </div>
                </div>
              </div>
            ))}
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
          </div>
        )}
      </FormSection>
      <ConfirmationModal />
    </div>
  );
}
