'use client';

import { ArrowLeft, Edit3, ExternalLink, Plus, Trash2, Library } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState, useCallback } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  AppModal,
  Button,
  ConfirmModal,
  Input,
  Label,
  DataTable,
  ListPanel,
  PanelHeader,
  Textarea,
  useToast,
} from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { promptExploderFormatTimestamp } from '../helpers/formatting';
import {
  createPromptExploderLibraryItemId,
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  removePromptExploderLibraryItemById,
  sortPromptExploderLibraryItemsByUpdated,
  upsertPromptExploderLibraryItems,
  type PromptExploderLibraryItem,
} from '../prompt-library';

import type { ColumnDef } from '@tanstack/react-table';

const MAX_PROMPT_PREVIEW = 120;

const formatPromptPreview = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '—';
  if (normalized.length <= MAX_PROMPT_PREVIEW) return normalized;
  return `${normalized.slice(0, MAX_PROMPT_PREVIEW - 1)}…`;
};

export function AdminPromptExploderProjectsPage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();

  const rawPromptLibrary = settingsQuery.data?.get(PROMPT_EXPLODER_LIBRARY_KEY) ?? null;
  const promptLibraryState = useMemo(
    () => parsePromptExploderLibrary(rawPromptLibrary),
    [rawPromptLibrary]
  );
  const projects = useMemo(
    () => sortPromptExploderLibraryItemsByUpdated(promptLibraryState.items),
    [promptLibraryState.items]
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [projectPendingDeleteId, setProjectPendingDeleteId] = useState<string | null>(null);

  const editingProject = useMemo(
    () =>
      editingProjectId
        ? projects.find((project: PromptExploderLibraryItem): boolean => project.id === editingProjectId) ?? null
        : null,
    [editingProjectId, projects]
  );
  const pendingDeleteProject = useMemo(
    () =>
      projectPendingDeleteId
        ? projects.find((project: PromptExploderLibraryItem): boolean => project.id === projectPendingDeleteId) ?? null
        : null,
    [projectPendingDeleteId, projects]
  );

  const isBusy = settingsQuery.isLoading || updateSetting.isPending;
  const shouldClearDocumentOnSave =
    Boolean(editingProject?.document) &&
    editingProject !== null &&
    editingProject.prompt.trim() !== draftPrompt.trim();

  const persistProjects = async (
    nextItems: PromptExploderLibraryItem[]
  ): Promise<boolean> => {
    const serialized = serializeSetting({
      version: 1,
      items: nextItems,
    });
    if (rawPromptLibrary === serialized) {
      return false;
    }
    await updateSetting.mutateAsync({
      key: PROMPT_EXPLODER_LIBRARY_KEY,
      value: serialized,
    });
    return true;
  };

  const openCreateEditor = (): void => {
    setEditingProjectId(null);
    setDraftName('');
    setDraftPrompt('');
    setIsEditorOpen(true);
  };

  const openEditEditor = (project: PromptExploderLibraryItem): void => {
    setEditingProjectId(project.id);
    setDraftName(project.name);
    setDraftPrompt(project.prompt);
    setIsEditorOpen(true);
  };

  const closeEditor = (): void => {
    if (isBusy) return;
    setIsEditorOpen(false);
    setEditingProjectId(null);
    setDraftName('');
    setDraftPrompt('');
  };

  const handleSaveEditor = async (): Promise<void> => {
    const normalizedName = draftName.trim();
    const normalizedPrompt = draftPrompt.trim();

    if (!normalizedName) {
      toast('Project name is required.', { variant: 'error' });
      return;
    }
    if (!normalizedPrompt) {
      toast('Prompt text is required.', { variant: 'error' });
      return;
    }

    const existing =
      editingProjectId
        ? promptLibraryState.items.find(
          (project: PromptExploderLibraryItem): boolean => project.id === editingProjectId
        ) ?? null
        : null;
    const now = new Date().toISOString();
    const shouldClearDocument =
      Boolean(existing?.document) &&
      (existing?.prompt.trim() ?? '') !== normalizedPrompt;

    const nextProject: PromptExploderLibraryItem = {
      id: existing?.id ?? createPromptExploderLibraryItemId(),
      name: normalizedName,
      prompt: normalizedPrompt,
      document: shouldClearDocument ? null : (existing?.document ?? null),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextItems = upsertPromptExploderLibraryItems({
      items: promptLibraryState.items,
      nextItem: nextProject,
      maxItems: 200,
    });

    try {
      const persisted = await persistProjects(nextItems);
      if (!persisted) {
        toast('No project changes to save.', { variant: 'info' });
        return;
      }
      setIsEditorOpen(false);
      setEditingProjectId(null);
      setDraftName('');
      setDraftPrompt('');
      toast(existing ? 'Project updated.' : 'Project created.', { variant: 'success' });
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to save Prompt Exploder project.',
        { variant: 'error' }
      );
    }
  };

  const handleDeleteProject = async (): Promise<void> => {
    if (!projectPendingDeleteId) return;
    const target = promptLibraryState.items.find(
      (project: PromptExploderLibraryItem): boolean => project.id === projectPendingDeleteId
    );
    if (!target) {
      setProjectPendingDeleteId(null);
      toast('Project no longer exists.', { variant: 'info' });
      return;
    }

    const nextItems = removePromptExploderLibraryItemById(
      promptLibraryState.items,
      projectPendingDeleteId
    );
    try {
      const persisted = await persistProjects(nextItems);
      if (!persisted) {
        toast('Project list was already up to date.', { variant: 'info' });
        return;
      }
      setProjectPendingDeleteId(null);
      toast(`Deleted project: ${target.name}`, { variant: 'success' });
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to delete Prompt Exploder project.',
        { variant: 'error' }
      );
    }
  };

  const handleOpenInExploder = useCallback((projectId: string): void => {
    router.push(`/admin/prompt-exploder?projectId=${encodeURIComponent(projectId)}`);
  }, [router]);

  const columns = useMemo<ColumnDef<PromptExploderLibraryItem>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Project Name',
      cell: ({ row }) => <span className='font-medium text-gray-100'>{row.original.name}</span>,
    },
    {
      accessorKey: 'prompt',
      header: 'Prompt',
      cell: ({ row }) => (
        <span className='text-xs text-gray-400'>
          {formatPromptPreview(row.original.prompt)}
        </span>
      ),
    },
    {
      id: 'segments',
      header: 'Segments',
      cell: ({ row }) => (
        <span className='text-xs text-gray-300'>
          {row.original.document?.segments.length ?? 0}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <span className='text-xs text-gray-300'>
          {promptExploderFormatTimestamp(row.original.updatedAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className='flex items-center justify-end gap-2'>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                handleOpenInExploder(project.id);
              }}
            >
              <ExternalLink className='mr-1 size-3.5' />
              Open
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                openEditEditor(project);
              }}
              disabled={isBusy}
            >
              <Edit3 className='mr-1 size-3.5' />
              Edit
            </Button>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={(): void => {
                setProjectPendingDeleteId(project.id);
              }}
              disabled={isBusy}
              className='text-red-300 hover:text-red-200'
            >
              <Trash2 className='mr-1 size-3.5' />
              Delete
            </Button>
          </div>
        );
      },
    },
  ], [handleOpenInExploder, isBusy]);

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <PanelHeader
        title='Prompt Exploder Projects'
        description='Create, edit, delete, and open Prompt Exploder projects.'
        icon={<Library className='size-4' />}
        actions={[
          {
            key: 'back',
            label: 'Back To Studio',
            icon: <ArrowLeft className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/prompt-exploder'),
          },
          {
            key: 'new',
            label: 'New Project',
            icon: <Plus className='size-4' />,
            onClick: openCreateEditor,
            disabled: isBusy,
          }
        ]}
      />

      <ListPanel
        variant='default'
      >
        <DataTable
          columns={columns}
          data={projects}
          isLoading={settingsQuery.isLoading}
          emptyState={
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <p className='text-sm text-gray-500'>
                No projects found. Create your first Prompt Exploder project.
              </p>
            </div>
          }
        />
      </ListPanel>

      <AppModal
        open={isEditorOpen}
        onClose={closeEditor}
        title={editingProject ? 'Edit Prompt Exploder Project' : 'Create Prompt Exploder Project'}
        size='lg'
        footer={
          <div className='flex gap-2'>
            <Button type='button' variant='outline' onClick={closeEditor} disabled={isBusy}>
              Cancel
            </Button>
            <Button type='button' onClick={() => void handleSaveEditor()} disabled={isBusy}>
              {editingProject ? 'Save Project' : 'Create Project'}
            </Button>
          </div>
        }
      >
        <div className='space-y-4'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Project Name</Label>
            <Input
              value={draftName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setDraftName(event.target.value);
              }}
              placeholder='Project name'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Prompt</Label>
            <Textarea
              value={draftPrompt}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                setDraftPrompt(event.target.value);
              }}
              className='min-h-[240px] font-mono text-[12px]'
              placeholder='Prompt text'
            />
          </div>
          {shouldClearDocumentOnSave ? (
            <div className='rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
              Prompt changed. Saving will reset the stored exploded document for this project.
            </div>
          ) : null}
        </div>
      </AppModal>

      <ConfirmModal
        isOpen={Boolean(pendingDeleteProject)}
        onClose={() => setProjectPendingDeleteId(null)}
        onConfirm={() => {
          void handleDeleteProject();
        }}
        title='Delete Project'
        message={
          pendingDeleteProject
            ? `Are you sure you want to delete project "${pendingDeleteProject.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this project?'
        }
        confirmText='Delete'
        isDangerous={true}
      />
    </div>
  );
}
