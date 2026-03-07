'use client';

import { Check, Lock, Pencil, Plus, Trash2, Unlock, X } from 'lucide-react';
import React, { useMemo, useCallback } from 'react';

import {
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
} from '@/features/ai/image-studio/utils/studio-settings';
import type { ImageStudioProjectRecord } from '@/shared/contracts/image-studio';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Badge,
  Button,
  Card,
  Input,
  SearchInput,
  useToast,
  StandardDataTablePanel,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import {
  IMAGE_STUDIO_CANVAS_TEMPLATES_KEY,
  parseImageStudioCanvasTemplates,
  type ImageStudioCanvasTemplate,
} from '@/features/ai/image-studio/utils/canvas-templates';
import {
  IMAGE_STUDIO_PROJECT_LOCKS_KEY,
  isImageStudioProjectLocked,
  moveImageStudioProjectLock,
  parseImageStudioProjectLocks,
  serializeImageStudioProjectLocks,
  setImageStudioProjectDeletionLock,
} from '@/features/ai/image-studio/utils/project-locks';

import type { ColumnDef } from '@tanstack/react-table';

interface StudioProjectsListProps {
  onOpenProject?: (projectId: string) => void;
}

const formatProjectTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
};

const parseCanvasDimensionInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.floor(parsed);
  if (normalized < 64 || normalized > 32_768) return null;
  return normalized;
};

const formatProjectCanvasSize = (project: ImageStudioProjectRecord): string => {
  if (
    typeof project.canvasWidthPx !== 'number' ||
    !Number.isFinite(project.canvasWidthPx) ||
    typeof project.canvasHeightPx !== 'number' ||
    !Number.isFinite(project.canvasHeightPx)
  ) {
    return 'Auto';
  }
  return `${project.canvasWidthPx} x ${project.canvasHeightPx}`;
};

const buildCanvasTemplateId = (width: number, height: number): string =>
  `template_${width}x${height}_${Date.now().toString(36)}`;

export function StudioProjectsList({ onOpenProject }: StudioProjectsListProps): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'heavy' });
  const projectSettingsMutation = useUpdateSetting();
  const projectLocksMutation = useUpdateSetting();
  const canvasTemplatesMutation = useUpdateSetting();
  const { projectId, projectsQuery, projectSearch } = useProjectsState();
  const {
    setProjectId,
    createProjectMutation,
    renameProjectMutation,
    deleteProjectMutation,
    handleConfirmDeleteProject,
    handleRenameProject,
    setProjectSearch,
    ConfirmationModal,
  } = useProjectsActions();

  const [newProjectId, setNewProjectId] = React.useState('');
  const [newProjectCanvasWidthPx, setNewProjectCanvasWidthPx] = React.useState('1024');
  const [newProjectCanvasHeightPx, setNewProjectCanvasHeightPx] = React.useState('1024');
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);
  const [editingProjectValue, setEditingProjectValue] = React.useState('');

  const projectLocks = useMemo(
    () =>
      parseImageStudioProjectLocks(settingsQuery.data?.get(IMAGE_STUDIO_PROJECT_LOCKS_KEY) ?? null),
    [settingsQuery.data]
  );
  const canvasTemplates = useMemo(
    () =>
      parseImageStudioCanvasTemplates(
        settingsQuery.data?.get(IMAGE_STUDIO_CANVAS_TEMPLATES_KEY) ?? null
      ),
    [settingsQuery.data]
  );

  const filteredProjects = useMemo((): ImageStudioProjectRecord[] => {
    const list = projectsQuery.data ?? [];
    const term = projectSearch.trim().toLowerCase();
    if (!term) return list;
    return list.filter((project: ImageStudioProjectRecord) =>
      project.id.toLowerCase().includes(term)
    );
  }, [projectSearch, projectsQuery.data]);

  const lockedProjectsCount = useMemo(
    () =>
      filteredProjects.filter((project: ImageStudioProjectRecord) =>
        isImageStudioProjectLocked(projectLocks, project.id)
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

  const persistCanvasTemplates = useCallback(
    async (templates: ImageStudioCanvasTemplate[]): Promise<void> => {
      await canvasTemplatesMutation.mutateAsync({
        key: IMAGE_STUDIO_CANVAS_TEMPLATES_KEY,
        value: serializeSetting(templates),
      });
    },
    [canvasTemplatesMutation]
  );

  const handleCreate = async () => {
    const id = newProjectId.trim();
    if (!id) return;
    const canvasWidthPx = parseCanvasDimensionInput(newProjectCanvasWidthPx);
    const canvasHeightPx = parseCanvasDimensionInput(newProjectCanvasHeightPx);
    if (canvasWidthPx === null || canvasHeightPx === null) {
      toast('Canvas size must be between 64 and 32768 pixels for both width and height.', {
        variant: 'error',
      });
      return;
    }
    try {
      const { projectId: createdProjectId } = await createProjectMutation.mutateAsync({
        projectId: id,
        canvasWidthPx,
        canvasHeightPx,
      });
      const projectSettingsKey = getImageStudioProjectSettingsKey(createdProjectId);
      if (projectSettingsKey) {
        try {
          await projectSettingsMutation.mutateAsync({
            key: projectSettingsKey,
            value: serializeSetting(defaultImageStudioSettings),
          });
        } catch {
          toast('Project created, but failed to initialize default settings.', {
            variant: 'warning',
          });
        }
      }
      try {
        const nextLocks = setImageStudioProjectDeletionLock(projectLocks, createdProjectId, true);
        await persistProjectLocks(nextLocks);
      } catch {
        toast('Project created, but failed to persist lock state.', {
          variant: 'warning',
        });
      }
      setNewProjectId('');
      setNewProjectCanvasWidthPx('1024');
      setNewProjectCanvasHeightPx('1024');
      setProjectId(createdProjectId);
      toast(
        `Project "${createdProjectId}" added (${canvasWidthPx}x${canvasHeightPx}) and locked by default.`,
        {
          variant: 'success',
        }
      );
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create project', {
        variant: 'error',
      });
    }
  };

  const handleSaveCanvasTemplate = useCallback(async (): Promise<void> => {
    const width = parseCanvasDimensionInput(newProjectCanvasWidthPx);
    const height = parseCanvasDimensionInput(newProjectCanvasHeightPx);
    if (width === null || height === null) {
      toast('Enter a valid canvas width and height first.', { variant: 'info' });
      return;
    }

    const duplicate = canvasTemplates.find(
      (template) => template.width === width && template.height === height
    );
    if (duplicate) {
      toast(`Template "${duplicate.label}" already exists.`, { variant: 'info' });
      return;
    }

    const label = `${width} x ${height}`;
    const nextTemplates: ImageStudioCanvasTemplate[] = [
      {
        id: buildCanvasTemplateId(width, height),
        width,
        height,
        label,
      },
      ...canvasTemplates,
    ];

    try {
      await persistCanvasTemplates(nextTemplates);
      toast(`Saved canvas template "${label}".`, { variant: 'success' });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to save canvas template.', {
        variant: 'error',
      });
    }
  }, [
    canvasTemplates,
    newProjectCanvasWidthPx,
    newProjectCanvasHeightPx,
    persistCanvasTemplates,
    toast,
  ]);

  const handleDeleteCanvasTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      const template = canvasTemplates.find((entry) => entry.id === templateId);
      if (!template) return;

      const nextTemplates = canvasTemplates.filter((entry) => entry.id !== templateId);
      try {
        await persistCanvasTemplates(nextTemplates);
        toast(`Deleted canvas template "${template.label}".`, { variant: 'success' });
      } catch (error: unknown) {
        toast(error instanceof Error ? error.message : 'Failed to delete canvas template.', {
          variant: 'error',
        });
      }
    },
    [canvasTemplates, persistCanvasTemplates, toast]
  );

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
      const nextLocks = setImageStudioProjectDeletionLock(projectLocks, id, !currentlyLocked);
      try {
        await persistProjectLocks(nextLocks);
        toast(currentlyLocked ? `Project "${id}" unlocked.` : `Project "${id}" locked.`, {
          variant: 'success',
        });
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to update project lock state.', {
          variant: 'error',
        });
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
      handleConfirmDeleteProject(id);
    },
    [handleConfirmDeleteProject, projectLocks, toast]
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

  const columns = useMemo<ColumnDef<ImageStudioProjectRecord>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Project',
        cell: ({ row }) => {
          const project = row.original;
          const id = project.id;
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
            <Button
              variant='link'
              className={cn(
                'h-auto p-0 max-w-[230px] truncate text-left transition-colors font-normal hover:no-underline',
                isSelected ? 'font-medium text-primary' : 'text-gray-200 hover:text-white'
              )}
              onClick={() => handleOpenProject(id)}
              title={id}
            >
              <span className='truncate'>{id}</span>
            </Button>
          );
        },
      },
      {
        id: 'canvas',
        header: 'Canvas',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{formatProjectCanvasSize(row.original)}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>
            {formatProjectTimestamp(row.original.createdAt ?? null)}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>
            {formatProjectTimestamp(row.original.updatedAt ?? null)}
          </span>
        ),
      },
      {
        id: 'lock',
        header: () => <div className='text-center'>Lock</div>,
        cell: ({ row }) => {
          const id = row.original.id;
          const locked = isImageStudioProjectLocked(projectLocks, id);
          const rowPending = renameProjectMutation.isPending || projectLocksMutation.isPending;

          return (
            <div className='flex justify-center'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                className={cn('h-7 gap-1 px-2', locked ? 'text-amber-300' : 'text-emerald-300')}
                onClick={() => {
                  void handleToggleLock(id);
                }}
                disabled={rowPending}
                title={locked ? 'Unlock project' : 'Lock project'}
              >
                {locked ? <Lock className='size-3.5' /> : <Unlock className='size-3.5' />}
              </Button>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const id = row.original.id;
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
    ],
    [
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
    ]
  );

  const canvasWidthDraftValid = parseCanvasDimensionInput(newProjectCanvasWidthPx) !== null;
  const canvasHeightDraftValid = parseCanvasDimensionInput(newProjectCanvasHeightPx) !== null;
  const canCreateProject =
    Boolean(newProjectId.trim()) &&
    canvasWidthDraftValid &&
    canvasHeightDraftValid &&
    !createProjectMutation.isPending;
  const canSaveCanvasTemplate =
    canvasWidthDraftValid && canvasHeightDraftValid && !canvasTemplatesMutation.isPending;
  const normalizedDraftCanvasWidth = parseCanvasDimensionInput(newProjectCanvasWidthPx);
  const normalizedDraftCanvasHeight = parseCanvasDimensionInput(newProjectCanvasHeightPx);

  return (
    <div className='space-y-4'>
      <Card
        variant='subtle'
        padding='sm'
        className='flex flex-wrap items-end gap-2 border-border/60 bg-card/40'
      >
        <div className='min-w-[220px] flex-1 space-y-1'>
          <div className='text-[11px] text-gray-500'>Project ID</div>
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
        </div>
        <div className='w-[120px] space-y-1'>
          <div className='text-[11px] text-gray-500'>Canvas W (px)</div>
          <Input
            size='sm'
            type='number'
            min={64}
            max={32768}
            step={1}
            value={newProjectCanvasWidthPx}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setNewProjectCanvasWidthPx(event.target.value);
            }}
            className={cn('h-9', !canvasWidthDraftValid && 'border-red-400/50')}
          />
        </div>
        <div className='w-[120px] space-y-1'>
          <div className='text-[11px] text-gray-500'>Canvas H (px)</div>
          <Input
            size='sm'
            type='number'
            min={64}
            max={32768}
            step={1}
            value={newProjectCanvasHeightPx}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setNewProjectCanvasHeightPx(event.target.value);
            }}
            className={cn('h-9', !canvasHeightDraftValid && 'border-red-400/50')}
          />
        </div>
        <div className='flex w-full flex-wrap items-center gap-2'>
          <div className='text-[11px] text-gray-500'>Canvas Templates:</div>
          {canvasTemplates.length === 0 ? (
            <span className='text-[11px] text-gray-500'>No saved templates.</span>
          ) : null}
          {canvasTemplates.map((template) => {
            const selected =
              normalizedDraftCanvasWidth === template.width &&
              normalizedDraftCanvasHeight === template.height;
            return (
              <Card
                key={template.id}
                variant='subtle-compact'
                padding='none'
                className='inline-flex items-center gap-1 border-border/60 bg-card/20 p-0.5'
              >
                <Button
                  type='button'
                  size='xs'
                  variant={selected ? 'secondary' : 'ghost'}
                  className='h-6 px-2 text-[11px]'
                  onClick={(): void => {
                    setNewProjectCanvasWidthPx(String(template.width));
                    setNewProjectCanvasHeightPx(String(template.height));
                  }}
                >
                  {template.label}
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='ghost'
                  className='h-6 w-6 p-0 text-red-300 hover:text-red-200'
                  onClick={(): void => {
                    void handleDeleteCanvasTemplate(template.id);
                  }}
                  disabled={canvasTemplatesMutation.isPending}
                  title={`Delete template ${template.label}`}
                  aria-label={`Delete template ${template.label}`}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              </Card>
            );
          })}
          <Button
            size='xs'
            type='button'
            variant='outline'
            className='h-7 px-2 text-[11px]'
            onClick={() => {
              void handleSaveCanvasTemplate();
            }}
            disabled={!canSaveCanvasTemplate}
            title='Save current width and height as template'
          >
            Save Template
          </Button>
        </div>
        <Button size='xs' onClick={() => void handleCreate()} disabled={!canCreateProject}>
          <Plus className='mr-2 size-4' />
          Add Project
        </Button>
      </Card>

      <StandardDataTablePanel
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
        columns={columns}
        data={filteredProjects}
        isLoading={projectsQuery.isLoading}
        emptyState={
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <p className='text-sm text-gray-500'>
              {projectSearch
                ? 'No projects found matching your search.'
                : 'No projects found. Create one above!'}
            </p>
          </div>
        }
        getRowClassName={(row) => (row.original.id === projectId ? 'bg-primary/5' : '')}
      />
      <ConfirmationModal />
    </div>
  );
}
