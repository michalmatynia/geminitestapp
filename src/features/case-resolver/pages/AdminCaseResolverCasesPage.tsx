'use client';

import { Edit2, Eye, Lock, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button, FormSection, Input, SectionHeader, useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  normalizeCaseResolverWorkspace,
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
} from '../settings';

import type { CaseResolverFile, CaseResolverWorkspace } from '../types';

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
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(parsedWorkspace);

  const [newCaseName, setNewCaseName] = useState('');
  const [newCaseFolder, setNewCaseFolder] = useState('');
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');
  const [editingCaseFolder, setEditingCaseFolder] = useState('');

  useEffect(() => {
    setWorkspace(parsedWorkspace);
  }, [parsedWorkspace]);

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

    const normalizedFolder = normalizeFolderPath(newCaseFolder);
    const file = createCaseResolverFile({
      id: createId('case-file'),
      name: normalizedName,
      folder: normalizedFolder,
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
  }, [newCaseFolder, newCaseName, persistWorkspace, toast, workspace]);

  const handleStartEditCase = useCallback((file: CaseResolverFile): void => {
    setEditingCaseId(file.id);
    setEditingCaseName(file.name);
    setEditingCaseFolder(file.folder);
  }, []);

  const handleCancelEditCase = useCallback((): void => {
    setEditingCaseId(null);
    setEditingCaseName('');
    setEditingCaseFolder('');
  }, []);

  const handleSaveCase = useCallback(async (): Promise<void> => {
    if (!editingCaseId) return;
    const normalizedName = editingCaseName.trim();
    if (!normalizedName) {
      toast('Case name is required.', { variant: 'error' });
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
    handleCancelEditCase,
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
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]'>
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
                    <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center'>
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
