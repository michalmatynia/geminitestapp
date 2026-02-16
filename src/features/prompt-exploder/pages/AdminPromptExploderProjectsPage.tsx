'use client';

import { ArrowLeft, Edit3, ExternalLink, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  AppModal,
  Button,
  ConfirmDialog,
  FormSection,
  Input,
  Label,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

  const handleOpenInExploder = (projectId: string): void => {
    router.push(`/admin/prompt-exploder?projectId=${encodeURIComponent(projectId)}`);
  };

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <SectionHeader
        eyebrow='AI · Prompt Exploder'
        title='Prompt Exploder Projects'
        description='Create, edit, delete, and open Prompt Exploder projects.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button type='button' variant='outline' size='xs' asChild>
              <Link href='/admin/prompt-exploder'>
                <ArrowLeft className='mr-2 size-4' />
                Back To Prompt Exploder
              </Link>
            </Button>
            <Button type='button' size='xs' onClick={openCreateEditor} disabled={isBusy}>
              <Plus className='mr-2 size-4' />
              New Project
            </Button>
          </div>
        }
      />

      <FormSection
        title='Project List'
        description='Projects store prompt text and the latest saved exploded document.'
        className='p-0'
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead className='w-[120px]'>Segments</TableHead>
              <TableHead className='w-[190px]'>Updated</TableHead>
              <TableHead className='w-[250px] text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='py-8 text-center text-sm text-gray-500'>
                  No projects found. Create your first Prompt Exploder project.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project: PromptExploderLibraryItem) => (
                <TableRow key={project.id}>
                  <TableCell className='font-medium text-gray-100'>{project.name}</TableCell>
                  <TableCell className='text-xs text-gray-400'>
                    {formatPromptPreview(project.prompt)}
                  </TableCell>
                  <TableCell className='text-xs text-gray-300'>
                    {project.document?.segments.length ?? 0}
                  </TableCell>
                  <TableCell className='text-xs text-gray-300'>
                    {promptExploderFormatTimestamp(project.updatedAt)}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </FormSection>

      <AppModal
        open={isEditorOpen}
        onClose={closeEditor}
        title={editingProject ? 'Edit Prompt Exploder Project' : 'Create Prompt Exploder Project'}
        size='lg'
        footer={
          <>
            <Button type='button' variant='outline' onClick={closeEditor} disabled={isBusy}>
              Cancel
            </Button>
            <Button type='button' onClick={() => void handleSaveEditor()} disabled={isBusy}>
              {editingProject ? 'Save Project' : 'Create Project'}
            </Button>
          </>
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

      <ConfirmDialog
        open={Boolean(pendingDeleteProject)}
        onOpenChange={(open: boolean): void => {
          if (!open) {
            setProjectPendingDeleteId(null);
          }
        }}
        onConfirm={() => {
          void handleDeleteProject();
        }}
        title='Delete Project'
        description={
          pendingDeleteProject
            ? `Delete project "${pendingDeleteProject.name}"? This action cannot be undone.`
            : 'Delete this project?'
        }
        confirmText='Delete'
        variant='destructive'
      />
    </div>
  );
}
