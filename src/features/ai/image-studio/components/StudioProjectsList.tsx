'use client';

import {
  Check,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import React, { useMemo } from 'react';

import {
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
} from '@/features/ai/image-studio/utils/studio-settings';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

export function StudioProjectsList(): React.JSX.Element {
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

  const persistProjectLocks = React.useCallback(
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

  const handleStartEdit = React.useCallback((id: string): void => {
    setEditingProjectId(id);
    setEditingProjectValue(id);
  }, []);

  const handleCancelEdit = React.useCallback((): void => {
    setEditingProjectId(null);
    setEditingProjectValue('');
  }, []);

  const handleSaveEdit = React.useCallback(
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

  const handleToggleLock = React.useCallback(
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

  const handleDelete = React.useCallback(
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

      <div className='overflow-hidden rounded-lg border border-border/60 bg-card/40'>
        <div className='flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 p-2'>
          <Input
            size='sm'
            placeholder='Search projects...'
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className='h-8 min-w-[220px] flex-1 text-xs'
          />
          <Badge variant='outline' className='text-[10px]'>
            {filteredProjects.length} total
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            {lockedProjectsCount} locked
          </Badge>
        </div>
        <Table className='text-xs'>
          <TableHeader>
            <TableRow>
              <TableHead className='h-9 px-3'>Project</TableHead>
              <TableHead className='h-9 px-3'>Status</TableHead>
              <TableHead className='h-9 px-3 text-center'>Lock</TableHead>
              <TableHead className='h-9 px-3 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className='px-3 py-6 text-center text-xs text-gray-500'>
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className='px-3 py-6 text-center text-xs text-gray-500'>
                  No projects found.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((id) => {
                const locked = isImageStudioProjectLocked(projectLocks, id);
                const isEditing = editingProjectId === id;
                const isSelected = projectId === id;
                const rowPending = renameProjectMutation.isPending || projectLocksMutation.isPending;

                return (
                  <TableRow
                    key={id}
                    className={cn(
                      isSelected ? 'bg-primary/10' : 'text-gray-300',
                      'align-middle'
                    )}
                  >
                    <TableCell className='px-3 py-2'>
                      {isEditing ? (
                        <Input
                          size='sm'
                          value={editingProjectValue}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setEditingProjectValue(event.target.value);
                          }}
                          className='h-8 text-xs'
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
                      ) : (
                        <button
                          type='button'
                          className={cn(
                            'max-w-[230px] truncate text-left',
                            isSelected ? 'font-medium text-primary' : 'text-gray-200 hover:text-white'
                          )}
                          onClick={() => setProjectId(id)}
                          title={id}
                        >
                          {id}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className='px-3 py-2'>
                      {isSelected ? (
                        <Badge variant='secondary' className='text-[10px]'>
                          Active
                        </Badge>
                      ) : (
                        <span className='text-[11px] text-gray-500'>Inactive</span>
                      )}
                    </TableCell>
                    <TableCell className='px-3 py-2 text-center'>
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
                    </TableCell>
                    <TableCell className='px-3 py-2 text-right'>
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
                              onClick={() => setProjectId(id)}
                              title='Set active project'
                            >
                              Active
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
                              <Pencil className='size-3.5' />
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
