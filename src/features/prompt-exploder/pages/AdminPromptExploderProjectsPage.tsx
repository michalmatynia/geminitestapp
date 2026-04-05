'use client';

import {
  ArrowLeft,
  Edit3,
  Plus,
  Trash2,
  Library,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState, useCallback } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { Button, useToast, Card } from '@/shared/ui/primitives.public';
import { ConfirmModal, PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { DocumentationTooltipEnhancer as DocsTooltipEnhancer } from '@/shared/lib/documentation/DocumentationTooltipEnhancer';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/ui/settings';
import { serializeSetting } from '@/shared/utils/settings-json';

import { promptExploderFormatTimestamp } from '../helpers/formatting';
import { usePromptExploderDocsTooltips } from '../hooks/usePromptExploderDocsTooltips';
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
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  const { docsTooltipsEnabled, setDocsTooltipsEnabled } = usePromptExploderDocsTooltips();
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
        ? (projects.find(
          (project: PromptExploderLibraryItem): boolean => project.id === editingProjectId
        ) ?? null)
        : null,
    [editingProjectId, projects]
  );
  const pendingDeleteProject = useMemo(
    () =>
      projectPendingDeleteId
        ? (projects.find(
          (project: PromptExploderLibraryItem): boolean => project.id === projectPendingDeleteId
        ) ?? null)
        : null,
    [projectPendingDeleteId, projects]
  );

  const isBusy = settingsQuery.isLoading || updateSetting.isPending;
  const shouldClearDocumentOnSave =
    Boolean(editingProject?.document) &&
    editingProject !== null &&
    editingProject.prompt.trim() !== draftPrompt.trim();

  const persistProjects = async (nextItems: PromptExploderLibraryItem[]): Promise<boolean> => {
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

    const existing = editingProjectId
      ? (promptLibraryState.items.find(
        (project: PromptExploderLibraryItem): boolean => project.id === editingProjectId
      ) ?? null)
      : null;
    const now = new Date().toISOString();
    const shouldClearDocument =
      Boolean(existing?.document) && (existing?.prompt.trim() ?? '') !== normalizedPrompt;

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
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save Prompt Exploder project.', {
        variant: 'error',
      });
    }
  };

  const handleEditorChange = (vals: Partial<{ name: string; prompt: string }>) => {
    if (vals.name !== undefined) setDraftName(vals.name);
    if (vals.prompt !== undefined) setDraftPrompt(vals.prompt);
  };

  const editorFields: SettingsPanelField<{ name: string; prompt: string }>[] = [
    {
      key: 'name',
      label: 'Project Name',
      type: 'text',
      placeholder: 'Enter a descriptive name',
      required: true,
    },
    {
      key: 'prompt',
      label: 'Prompt Template',
      type: 'textarea',
      placeholder: 'Paste your prompt here...',
      required: true,
    },
    {
      key: 'prompt',
      label: '',
      type: 'custom',
      render: () =>
        shouldClearDocumentOnSave ? (
          <Card variant='warning' padding='md' className='border-amber-500/20'>
            <div className='text-xs text-amber-200/80 leading-relaxed italic'>
              Note: Changing the prompt will reset the existing segment analysis for this project.
            </div>
          </Card>
        ) : null,
    },
  ];

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
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete Prompt Exploder project.', {
        variant: 'error',
      });
    }
  };

  const handleOpenInExploder = useCallback(
    (projectId: string): void => {
      router.push(`/admin/prompt-exploder?projectId=${encodeURIComponent(projectId)}`);
    },
    [router]
  );

  const columns = useMemo<ColumnDef<PromptExploderLibraryItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Project Name',
        cell: ({ row }) => <span className='font-medium text-gray-100'>{row.original.name}</span>,
      },
      {
        accessorKey: 'prompt',
        header: 'Prompt',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{formatPromptPreview(row.original.prompt)}</span>
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
                <ExternalLinkIcon className='mr-1 size-3.5' />
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
    ],
    [handleOpenInExploder, isBusy]
  );

  return (
    <div id='prompt-exploder-projects-docs-root' className='page-section space-y-6'>
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
          },
        ]}
      />
      <div className='flex justify-end'>
        <ToggleRow
          id='prompt-exploder-docs-tooltips-toggle'
          label='Docs Tooltips'
          checked={docsTooltipsEnabled}
          onCheckedChange={(checked: boolean) => {
            setDocsTooltipsEnabled(checked);
          }}
          className='ml-1 border-border/60 bg-card/30 px-2 py-1'
          data-doc-id='docs_tooltips_toggle'
        />
      </div>

      <StandardDataTablePanel
        variant='default'
        columns={columns}
        data={projects}
        isLoading={settingsQuery.isLoading}
        emptyState={
          <EmptyState
            title='No projects found'
            description='Create your first Prompt Exploder project to get started.'
          />
        }
      />

      <SettingsPanelBuilder
        open={isEditorOpen}
        onClose={closeEditor}
        title={editingProject ? 'Edit Prompt Exploder Project' : 'Create Prompt Exploder Project'}
        size='lg'
        fields={editorFields}
        values={{ name: draftName, prompt: draftPrompt }}
        onChange={handleEditorChange}
        onSave={() => handleSaveEditor()}
        isSaving={updateSetting.isPending}
      />

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
      <DocsTooltipEnhancer
        rootId='prompt-exploder-projects-docs-root'
        enabled={docsTooltipsEnabled}
        moduleId={DOCUMENTATION_MODULE_IDS.promptExploder}
        fallbackDocId='workflow_overview'
      />
    </div>
  );
}
