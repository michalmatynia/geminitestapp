'use client';

import { Edit2, Eye, Lock, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button, FormSection, Input, SectionHeader, SelectSimple, useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverCategories,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';

import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileType,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatUpdatedAt = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

export function AdminCaseResolverCasesPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const caseResolverTagOptions = useMemo(
    () =>
      caseResolverTags.map((tag: CaseResolverTag) => ({
        value: tag.id,
        label: tag.name,
      })),
    [caseResolverTags]
  );
  const caseResolverCategoryOptions = useMemo(() => {
    const byId = new Map<string, CaseResolverCategory>(
      caseResolverCategories.map(
        (category: CaseResolverCategory): [string, CaseResolverCategory] => [category.id, category]
      )
    );
    const resolveDepth = (category: CaseResolverCategory): number => {
      let depth = 0;
      let parentId = category.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        depth += 1;
        parentId = parent.parentId;
      }
      return depth;
    };
    return caseResolverCategories
      .map((category: CaseResolverCategory) => ({
        value: category.id,
        label: `${' '.repeat(resolveDepth(category) * 2)}${category.name}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [caseResolverCategories]);
  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;
  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);

  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseFolder, setNewCaseFolder] = useState('');
  const [newCaseFileType, setNewCaseFileType] = useState<CaseResolverFileType>('document');
  const [newCaseTagId, setNewCaseTagId] = useState<string | null>(defaultTagId);
  const [newCaseCategoryId, setNewCaseCategoryId] = useState<string | null>(defaultCategoryId);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');
  const [editingCaseFolder, setEditingCaseFolder] = useState('');
  const [editingCaseFileType, setEditingCaseFileType] = useState<CaseResolverFileType>('document');
  const [editingCaseTagId, setEditingCaseTagId] = useState<string | null>(null);
  const [editingCaseCategoryId, setEditingCaseCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

  useEffect(() => {
    setNewCaseTagId((current: string | null) => {
      if (!current) return defaultTagId;
      return caseResolverTags.some((tag: CaseResolverTag) => tag.id === current)
        ? current
        : defaultTagId;
    });
  }, [caseResolverTags, defaultTagId]);

  useEffect(() => {
    setNewCaseCategoryId((current: string | null) => {
      if (!current) return defaultCategoryId;
      return caseResolverCategories.some((category: CaseResolverCategory) => category.id === current)
        ? current
        : defaultCategoryId;
    });
  }, [caseResolverCategories, defaultCategoryId]);

  const files = useMemo(
    () =>
      [...workspace.files].sort((left: CaseResolverFile, right: CaseResolverFile) => {
        if (left.folder !== right.folder) {
          return left.folder.localeCompare(right.folder);
        }
        return left.name.localeCompare(right.name);
      }),
    [workspace.files]
  );

  const persistWorkspace = useCallback(
    async (nextWorkspace: CaseResolverWorkspace, successMessage: string): Promise<void> => {
      const normalized = normalizeCaseResolverWorkspace(nextWorkspace);
      try {
        await updateSetting.mutateAsync({
          key: CASE_RESOLVER_WORKSPACE_KEY,
          value: JSON.stringify(normalized),
        });
        setWorkspace(normalized);
        toast(successMessage, { variant: 'success' });
      } catch (error: unknown) {
        toast(
          error instanceof Error ? error.message : 'Failed to save Case Resolver cases.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateSetting]
  );

  const handleCreateCase = useCallback(async (): Promise<void> => {
    const normalizedName = newCaseName.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }

    const normalizedTagId =
      newCaseTagId && caseResolverTags.some((tag: CaseResolverTag) => tag.id === newCaseTagId)
        ? newCaseTagId
        : null;
    const normalizedCategoryId =
      newCaseCategoryId && caseResolverCategories.some((category: CaseResolverCategory) => category.id === newCaseCategoryId)
        ? newCaseCategoryId
        : null;
    if (caseResolverTags.length > 0 && !normalizedTagId) {
      toast('Select a document tag.', { variant: 'error' });
      return;
    }
    if (caseResolverCategories.length > 0 && !normalizedCategoryId) {
      toast('Select a document category.', { variant: 'error' });
      return;
    }

    const normalizedFolder = normalizeFolderPath(newCaseFolder);
    const file = createCaseResolverFile({
      id: createId('case-file'),
      fileType: newCaseFileType,
      name: normalizedName,
      folder: normalizedFolder,
      tagId: normalizedTagId,
      categoryId: normalizedCategoryId,
    });

    const nextWorkspace: CaseResolverWorkspace = {
      ...workspace,
      files: [...workspace.files, file],
      activeFileId: file.id,
      folders: normalizeFolderPaths([...workspace.folders, normalizedFolder]),
    };

    await persistWorkspace(nextWorkspace, 'Case created.');
    setNewCaseName('');
    setNewCaseFolder('');
    setNewCaseFileType('document');
    setNewCaseTagId(defaultTagId);
    setNewCaseCategoryId(defaultCategoryId);
  }, [
    caseResolverCategories,
    caseResolverTags,
    defaultCategoryId,
    defaultTagId,
    newCaseCategoryId,
    newCaseFolder,
    newCaseFileType,
    newCaseName,
    newCaseTagId,
    persistWorkspace,
    toast,
    workspace,
  ]);

  const handleStartEditCase = useCallback((file: CaseResolverFile): void => {
    setEditingCaseId(file.id);
    setEditingCaseName(file.name);
    setEditingCaseFolder(file.folder);
    setEditingCaseFileType(file.fileType);
    setEditingCaseTagId(file.tagId);
    setEditingCaseCategoryId(file.categoryId);
  }, []);

  const handleCancelEditCase = useCallback((): void => {
    setEditingCaseId(null);
    setEditingCaseName('');
    setEditingCaseFolder('');
    setEditingCaseFileType('document');
    setEditingCaseTagId(null);
    setEditingCaseCategoryId(null);
  }, []);

  const handleSaveCase = useCallback(async (): Promise<void> => {
    if (!editingCaseId) return;
    const normalizedName = editingCaseName.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
      return;
    }
    const normalizedTagId =
      editingCaseTagId && caseResolverTags.some((tag: CaseResolverTag) => tag.id === editingCaseTagId)
        ? editingCaseTagId
        : null;
    const normalizedCategoryId =
      editingCaseCategoryId &&
      caseResolverCategories.some((category: CaseResolverCategory) => category.id === editingCaseCategoryId)
        ? editingCaseCategoryId
        : null;
    if (caseResolverTags.length > 0 && !normalizedTagId) {
      toast('Select a document tag.', { variant: 'error' });
      return;
    }
    if (caseResolverCategories.length > 0 && !normalizedCategoryId) {
      toast('Select a document category.', { variant: 'error' });
      return;
    }
    const normalizedFolder = normalizeFolderPath(editingCaseFolder);

    const nextWorkspace: CaseResolverWorkspace = {
      ...workspace,
      files: workspace.files.map((file: CaseResolverFile) =>
        file.id === editingCaseId
          ? {
            ...file,
            name: normalizedName,
            folder: normalizedFolder,
            fileType: editingCaseFileType,
            scanSlots: editingCaseFileType === 'scanfile' ? file.scanSlots : [],
            tagId: normalizedTagId,
            categoryId: normalizedCategoryId,
            updatedAt: new Date().toISOString(),
          }
          : file
      ),
      folders: normalizeFolderPaths([...workspace.folders, normalizedFolder]),
    };

    await persistWorkspace(nextWorkspace, 'Case updated.');
    handleCancelEditCase();
  }, [
    editingCaseFolder,
    editingCaseId,
    editingCaseName,
    editingCaseCategoryId,
    editingCaseTagId,
    editingCaseFileType,
    handleCancelEditCase,
    caseResolverCategories,
    caseResolverTags,
    persistWorkspace,
    toast,
    workspace,
  ]);

  const handleDeleteCase = useCallback(
    async (fileId: string): Promise<void> => {
      const target = workspace.files.find((file: CaseResolverFile) => file.id === fileId);
      if (!target) return;
      if (target.isLocked) {
        toast('Case is locked. Unlock it in Case Resolver before removing.', { variant: 'warning' });
        return;
      }
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(`Delete case "${target.name}"?`);
        if (!confirmed) return;
      }

      const nextFiles = workspace.files.filter((file: CaseResolverFile) => file.id !== fileId);
      const nextWorkspace: CaseResolverWorkspace = {
        ...workspace,
        files: nextFiles,
        activeFileId:
          workspace.activeFileId === fileId
            ? (nextFiles[0]?.id ?? null)
            : workspace.activeFileId,
      };

      await persistWorkspace(nextWorkspace, 'Case removed.');
      if (editingCaseId === fileId) {
        handleCancelEditCase();
      }
    },
    [editingCaseId, handleCancelEditCase, persistWorkspace, workspace]
  );

  const handleViewCase = useCallback(
    (fileId: string): void => {
      router.push(`/admin/case-resolver?fileId=${encodeURIComponent(fileId)}`);
    },
    [router]
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Case Resolver Cases'
        description='Manage all cases in one place. Open a case to work on its full node-map editor.'
      />

      <FormSection title='Add Case' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_160px_200px_240px_auto]'>
          <Input
            value={newCaseName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setNewCaseName(event.target.value);
            }}
            placeholder='Case name'
            className='h-9'
          />
          <Input
            value={newCaseFolder}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setNewCaseFolder(event.target.value);
            }}
            placeholder='Folder (optional)'
            className='h-9'
          />
          <SelectSimple size='sm'
            value={newCaseFileType}
            onValueChange={(value: string): void => {
              setNewCaseFileType(value === 'scanfile' ? 'scanfile' : 'document');
            }}
            options={[
              { value: 'document', label: 'Document' },
              { value: 'scanfile', label: 'Scan File' },
            ]}
            placeholder='File type'
            triggerClassName='h-9'
          />
          <SelectSimple size='sm'
            value={newCaseTagId ?? '__none__'}
            onValueChange={(value: string): void => {
              setNewCaseTagId(value === '__none__' ? null : value);
            }}
            options={[
              { value: '__none__', label: caseResolverTags.length > 0 ? 'Select tag' : 'No tags' },
              ...caseResolverTagOptions,
            ]}
            placeholder='Select tag'
            triggerClassName='h-9'
          />
          <SelectSimple size='sm'
            value={newCaseCategoryId ?? '__none__'}
            onValueChange={(value: string): void => {
              setNewCaseCategoryId(value === '__none__' ? null : value);
            }}
            options={[
              { value: '__none__', label: caseResolverCategories.length > 0 ? 'Select category' : 'No categories' },
              ...caseResolverCategoryOptions,
            ]}
            placeholder='Select category'
            triggerClassName='h-9'
          />
          <Button
            type='button'
            onClick={(): void => {
              void handleCreateCase();
            }}
            disabled={updateSetting.isPending}
            className='h-9 whitespace-nowrap'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Case
          </Button>
        </div>
      </FormSection>

      <FormSection
        title='All Cases'
        className='space-y-3 p-4'
        actions={(
          <Badge variant='outline' className='text-[10px]'>
            {files.length} total
          </Badge>
        )}
      >
        {files.length === 0 ? (
          <div className='rounded border border-dashed border-border/60 bg-card/20 px-3 py-6 text-sm text-gray-400'>
            No cases found.
          </div>
        ) : (
          <div className='space-y-2'>
            {files.map((file: CaseResolverFile) => {
              const isEditing = editingCaseId === file.id;
              return (
                <div
                  key={file.id}
                  className='rounded-lg border border-border/60 bg-card/35 p-3'
                >
                  {isEditing ? (
                    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_160px_200px_240px_auto] md:items-center'>
                      <Input
                        value={editingCaseName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingCaseName(event.target.value);
                        }}
                        placeholder='Case name'
                        className='h-9'
                      />
                      <Input
                        value={editingCaseFolder}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setEditingCaseFolder(event.target.value);
                        }}
                        placeholder='Folder (optional)'
                        className='h-9'
                      />
                      <SelectSimple size='sm'
                        value={editingCaseFileType}
                        onValueChange={(value: string): void => {
                          setEditingCaseFileType(value === 'scanfile' ? 'scanfile' : 'document');
                        }}
                        options={[
                          { value: 'document', label: 'Document' },
                          { value: 'scanfile', label: 'Scan File' },
                        ]}
                        placeholder='File type'
                        triggerClassName='h-9'
                      />
                      <SelectSimple size='sm'
                        value={editingCaseTagId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseTagId(value === '__none__' ? null : value);
                        }}
                        options={[
                          { value: '__none__', label: caseResolverTags.length > 0 ? 'Select tag' : 'No tags' },
                          ...caseResolverTagOptions,
                        ]}
                        placeholder='Select tag'
                        triggerClassName='h-9'
                      />
                      <SelectSimple size='sm'
                        value={editingCaseCategoryId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          setEditingCaseCategoryId(value === '__none__' ? null : value);
                        }}
                        options={[
                          { value: '__none__', label: caseResolverCategories.length > 0 ? 'Select category' : 'No categories' },
                          ...caseResolverCategoryOptions,
                        ]}
                        placeholder='Select category'
                        triggerClassName='h-9'
                      />
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          onClick={(): void => {
                            void handleSaveCase();
                          }}
                          disabled={updateSetting.isPending}
                          className='h-9'
                        >
                          Save
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={handleCancelEditCase}
                          className='h-9'
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <div className='truncate text-sm font-semibold text-gray-100'>{file.name}</div>
                          {file.isLocked ? (
                            <Badge variant='outline' className='text-[10px] text-amber-300'>
                              <Lock className='mr-1 size-3' />
                              Locked
                            </Badge>
                          ) : null}
                          <Badge variant='outline' className='text-[10px]'>
                            {file.fileType === 'scanfile' ? 'Scan File' : 'Document'}
                          </Badge>
                          {file.tagId ? (
                            <Badge variant='outline' className='text-[10px]'>
                              {caseResolverTags.find((tag: CaseResolverTag) => tag.id === file.tagId)?.name ?? 'Tag'}
                            </Badge>
                          ) : null}
                          {file.categoryId ? (
                            <Badge variant='outline' className='text-[10px]'>
                              {caseResolverCategories.find((category: CaseResolverCategory) => category.id === file.categoryId)?.name ?? 'Category'}
                            </Badge>
                          ) : null}
                        </div>
                        <div className='mt-0.5 text-xs text-gray-400'>
                          Folder: {file.folder || '(root)'} | Updated: {formatUpdatedAt(file.updatedAt)}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 px-2'
                          onClick={(): void => handleViewCase(file.id)}
                        >
                          <Eye className='mr-1.5 size-3.5' />
                          View
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 px-2'
                          onClick={(): void => handleStartEditCase(file)}
                        >
                          <Edit2 className='mr-1.5 size-3.5' />
                          Edit
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 px-2 text-red-300 hover:text-red-200'
                          disabled={file.isLocked}
                          onClick={(): void => {
                            void handleDeleteCase(file.id);
                          }}
                        >
                          <Trash2 className='mr-1.5 size-3.5' />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}
