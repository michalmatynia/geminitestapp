'use client';

import {
  Check,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  X,
  Folder,
} from 'lucide-react';
import React, { useMemo, useCallback } from 'react';

import {
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
} from '@/features/ai/image-studio/utils/studio-settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  Input,
  DataTable,
  ListPanel,
  PanelHeader,
  SearchInput,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useProjects } from '../context/ProjectsContext';
import {
  IMAGE_STUDIO_PROJECT_LOCKS_KEY,
  isImageStudioProjectLocked,
  moveImageStudioProjectLock,
  parseImageStudioProjectLocks,
  serializeImageStudioProjectLocks,
  setImageStudioProjectDeletionLock,
} from '../utils/project-locks';

import type { ColumnDef } from '@tanstack/react-table';

interface StudioProjectsListProps {
  onOpenProject?: (projectId: string) => void;
}

export function StudioProjectsList({ onOpenProject }: StudioProjectsListProps): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const projectSettingsMutation = useUpdateSetting();
  const projectLocksMutation = useUpdateSetting();
  const {
    projectId,
    setProjectId,
    projectsQuery,
    createProjectMutation,
    renameProjectMutation,
    deleteProjectMutation,
    handleDeleteProject,
    handleRenameProject,
    projectSearch,
    setProjectSearch,
  } = useProjects();

  const [newProjectId, setNewProjectId] = React.useState('');
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingProjectValue, setEditingProjectValue] = React.useState('');

  const projectLocks = useMemo(
    () =>
      parseImageStudioProjectLocks(
        settingsQuery.data?.get(IMAGE_STUDIO_PROJECT_LOCKS_KEY) ?? null
      ),
    [settingsQuery.data]
  );

  const filteredProjects = useMemo((): string[] => {
    const list = projectsQuery.data ?? [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((id: string) => id.toLowerCase().includes(term));
  }, [projectSearch, projectsQuery.data]);

  const lockedProjectsCount = useMemo(
    () =>
      filteredProjects.filter((id: string) =>
        isImageStudioProjectLocked(projectLocks, id)
      ).length,
    [filteredProjects, projectLocks]
  );

  const persistProjectLocks = useCallback(
    async (locks: Record<string, boolean>): Promise<void> => {
      await projectLocksMutation.mutateAsync({
        key: IMAGE_STUDIO_PROJECT_LOCKS_KEY,
        value: serializeImageStudioProjectLocks(locks),
      });
    },
    [projectLocksMutation]
  );

  const handleCreate = async () => {
    const id = newProjectId.trim();
    if (!id) return;
    try {
      const createdProjectId = await createProjectMutation.mutateAsync(id);
      const projectSettingsKey = getImageStudioProjectSettingsKey(createdProjectId);
      if (projectSettingsKey) {
        try {
          await projectSettingsMutation.mutateAsync({
            key: projectSettingsKey,
            value: serializeSetting(defaultImageStudioSettings),
          });
        } catch {
          toast('Project created, but failed to initialize default settings.', { variant: 'warning' });
        }
      }
      try {
        const nextLocks = setImageStudioProjectDeletionLock(
          projectLocks,
          createdProjectId,
          true
        );
        await persistProjectLocks(nextLocks);
      } catch {
        toast('Project created, but failed to persist lock state.', {
          variant: 'warning',
        });
      }
      setNewProjectId('');
      setProjectId(createdProjectId);
      toast(`Project "${createdProjectId}" added and locked by default.`, {
        variant: 'success',
      });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create project', { variant: 'error' });
    }
  };

  const handleStartEdit = useCallback((id: string): void => {
    setEditingProjectId(id);
    setEditingProjectValue(id);
  }, []);

  const handleCancelEdit = useCallback((): void => {
    setEditingProjectId(null);
    setEditingProjectValue('');
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string): Promise<void> => {
      const nextId = editingProjectValue.trim();
      if (!nextId) {
        toast('Project id is required.', { variant: 'error' });
        return;
      }
      try {
        const renamedProjectId = await handleRenameProject(id, nextId);
        const nextLocks = moveImageStudioProjectLock(projectLocks, id, renamedProjectId);
        if (
          serializeImageStudioProjectLocks(nextLocks) !==
          serializeImageStudioProjectLocks(projectLocks)
        ) {
          try {
            await persistProjectLocks(nextLocks);
          } catch {
            toast('Project renamed, but lock state failed to update.', {
              variant: 'warning',
            });
          }
        }
        handleCancelEdit();
      } catch {
        // Toast is handled in context action.
      }
    },
    [
      editingProjectValue,
      handleCancelEdit,
      handleRenameProject,
      persistProjectLocks,
      projectLocks,
      toast,
    ]
  );

  const handleToggleLock = useCallback(
    async (id: string): Promise<void> => {
      const currentlyLocked = isImageStudioProjectLocked(projectLocks, id);
      const nextLocks = setImageStudioProjectDeletionLock(
        projectLocks,
        id,
        !currentlyLocked
      );
      try {
        await persistProjectLocks(nextLocks);
        toast(
          currentlyLocked
            ? `Project "${id}" unlocked.`
            : `Project "${id}" locked.`,
          { variant: 'success' }
        );
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to update project lock state.',
          { variant: 'error' }
        );
      }
    },
    [persistProjectLocks, projectLocks, toast]
  );

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      if (isImageStudioProjectLocked(projectLocks, id)) {
        toast('Project is locked. Unlock it before removing.', {
          variant: 'warning',
        });
        return;
      }
      await handleDeleteProject(id);
      if (editingProjectId === id) {
        handleCancelEdit();
      }
      const nextLocks = setImageStudioProjectDeletionLock(projectLocks, id, false);
      if (
        serializeImageStudioProjectLocks(nextLocks) ===
        serializeImageStudioProjectLocks(projectLocks)
      ) {
        return;
      }
      try {
        await persistProjectLocks(nextLocks);
      } catch {
        toast('Project removed, but failed to clean up lock state.', {
          variant: 'warning',
        });
      }
    },
    [
      editingProjectId,
      handleCancelEdit,
      handleDeleteProject,
      persistProjectLocks,
      projectLocks,
      toast,
    ]
  );

  const handleOpenProject = useCallback(
    (id: string): void => {
      if (onOpenProject) {
        onOpenProject(id);
        return;
      }
      setProjectId(id);
    },
    [onOpenProject, setProjectId]
  );

  const columns = useMemo<ColumnDef<string>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Project',
      cell: ({ row }) => {
        const id = row.original;
        const isEditing = editingProjectId === id;
        const isSelected = projectId === id;

        if (isEditing) {
          return (
            <Input
              size='sm'
              value={editingProjectValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setEditingProjectValue(event.target.value);
              }}
              className='h-8 text-xs max-w-[230px]'
              autoFocus
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSaveEdit(id);
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  handleCancelEdit();
                }
              }}
            />
          );
        }

        return (
          <button
            type='button'
            className={cn(
              'max-w-[230px] truncate text-left transition-colors',
              isSelected ? 'font-medium text-primary' : 'text-gray-200 hover:text-white'
            )}
            onClick={() => handleOpenProject(id)}
            title={id}
          >
            {id}
          </button>
        );
      },
    },
    {
      id: 'lock',
      header: () => <div className='text-center'>Lock</div>,
      cell: ({ row }) => {
        const id = row.original;
        const locked = isImageStudioProjectLocked(projectLocks, id);
        const rowPending = renameProjectMutation.isPending || projectLocksMutation.isPending;

        return (
          <div className='flex justify-center'>
            <Button
              type='button'
              size='xs'
              variant='outline'
              className={cn(
                'h-7 gap-1 px-2',
                locked ? 'text-amber-300' : 'text-emerald-300'
              )}
              onClick={() => {
                void handleToggleLock(id);
              }}
              disabled={rowPending}
              title={locked ? 'Unlock project' : 'Lock project'}
            >
              {locked ? (
                <Lock className='size-3.5' />
              ) : (
                <Unlock className='size-3.5' />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => {
        const id = row.original;
        const locked = isImageStudioProjectLocked(projectLocks, id);
        const isEditing = editingProjectId === id;
        const rowPending = renameProjectMutation.isPending || projectLocksMutation.isPending;

        return (
          <div className='flex items-center justify-end gap-1'>
            {isEditing ? (
              <>
                <Button
                  type='button'
                  size='xs'
                  className='h-7 px-2'
                  onClick={() => {
                    void handleSaveEdit(id);
                  }}
                  disabled={!editingProjectValue.trim() || rowPending}
                  title='Save project id'
                >
                  <Check className='size-3.5' />
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-7 px-2'
                  onClick={handleCancelEdit}
                  disabled={rowPending}
                  title='Cancel edit'
                >
                  <X className='size-3.5' />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-7 px-2'
                  onClick={() => handleOpenProject(id)}
                  title='Open project editor'
                >
                  Edit
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-7 px-2'
                  onClick={() => handleStartEdit(id)}
                  disabled={rowPending}
                  title='Rename project'
                >
                  <Pencil className='mr-1 size-3.5' />
                  Rename
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-7 px-2 text-red-300 hover:text-red-200'
                  onClick={() => {
                    void handleDelete(id).catch(() => {});
                  }}
                  disabled={locked || deleteProjectMutation.isPending}
                  title={locked ? 'Unlock project before removing' : 'Remove project'}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ], [
    editingProjectId,
    editingProjectValue,
    projectId,
    projectLocks,
    renameProjectMutation.isPending,
    projectLocksMutation.isPending,
    deleteProjectMutation.isPending,
    handleSaveEdit,
    handleCancelEdit,
    handleOpenProject,
    handleToggleLock,
    handleStartEdit,
    handleDelete,
  ]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3'>
        <Input
          size='sm'
          placeholder='New project ID...'
          value={newProjectId}
          onChange={(e) => setNewProjectId(e.target.value)}
          className='h-9'
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleCreate();
            }
          }}
        />
        <Button
          size='xs'
          onClick={() => void handleCreate()}
          disabled={!newProjectId.trim() || createProjectMutation.isPending}
        >
          <Plus className='mr-2 size-4' />
          Add Project
        </Button>
      </div>

      <ListPanel
        header={
          <PanelHeader
            title='Studio Projects'
            description='Manage and organize your image studio projects.'
            icon={<Folder className='size-4' />}
          />
        }
        filters={
          <div className='flex flex-wrap items-center gap-2'>
            <SearchInput
              size='sm'
              placeholder='Search projects...'
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              onClear={() => setProjectSearch('')}
              containerClassName='min-w-[220px] flex-1'
            />
            <div className='flex gap-1'>
              <Badge variant='outline' className='text-[10px]'>
                {filteredProjects.length} total
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                {lockedProjectsCount} locked
              </Badge>
            </div>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={filteredProjects}
          isLoading={projectsQuery.isLoading}
          emptyState={
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <p className='text-sm text-gray-500'>
                {projectSearch ? 'No projects found matching your search.' : 'No projects found. Create one above!'}
              </p>
            </div>
          }
          getRowClassName={(row) => (row === projectId ? 'bg-primary/5' : '')}
        />
      </ListPanel>
    </div>
  );
}
