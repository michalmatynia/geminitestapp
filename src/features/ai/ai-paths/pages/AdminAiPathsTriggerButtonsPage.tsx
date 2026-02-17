'use client';

import { useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { MousePointer2, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { triggerButtonsApi } from '@/features/ai/ai-paths/lib';
import {
  aiTriggerButtonCreateSchema,
  type AiTriggerButtonCreatePayload,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import { IconSelector } from '@/features/icons';
import { logClientError } from '@/features/observability';
import type {
  AiTriggerButtonDisplay,
  AiTriggerButtonLocation,
  AiTriggerButtonMode,
  AiTriggerButtonDto,
} from '@/shared/contracts/ai-trigger-buttons';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { invalidateAiPathTriggerButtons } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { 
  Checkbox, 
  useToast,
  PanelHeader,
  ListPanel,
  ConfirmModal,
} from '@/shared/ui';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';
import { cn } from '@/shared/utils';
import { validateFormData } from '@/shared/validations/form-validation';

import { TriggerButtonListManager, type AiTriggerButtonRecord } from '../components/TriggerButtonListManager';

type TriggerButtonDraft = AiTriggerButtonCreatePayload & { id?: string };

const LOCATION_OPTIONS: Array<{ value: AiTriggerButtonLocation; label: string }> = [
  { value: 'product_modal', label: 'Products: Product Modal' },
  { value: 'product_list', label: 'Products: Product List' },
  { value: 'note_modal', label: 'Notes: Note Modal' },
  { value: 'note_list', label: 'Notes: Note List' },
];

const MODE_OPTIONS: Array<{ value: AiTriggerButtonMode; label: string }> = [
  { value: 'click', label: 'On click' },
  { value: 'toggle', label: 'Toggle (On/Off)' },
];

const DISPLAY_OPTIONS: Array<{ value: AiTriggerButtonDisplay; label: string }> = [
  { value: 'icon_label', label: 'Icon + label' },
  { value: 'icon', label: 'Icon only' },
];

const normalizeDraft = (record?: AiTriggerButtonDto | null): TriggerButtonDraft => ({
  ...(record?.id ? { id: record.id } : {}),
  name: record?.name ?? '',
  iconId: record?.iconId ?? null,
  locations: record?.locations ?? ['product_modal'],
  mode: record?.mode ?? 'click',
  display: record?.display ?? 'icon_label',
});

export function AdminAiPathsTriggerButtonsPage(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerButtonDraft>(() => normalizeDraft(null));

  const triggerButtonsQuery = createListQueryV2<AiTriggerButtonDto[], Error>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async (): Promise<AiTriggerButtonDto[]> => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.list',
      operation: 'list',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      tags: ['ai-paths', 'trigger-buttons'],
    },
  });

  useEffect(() => {
    if (triggerButtonsQuery.error) {
      logClientError(triggerButtonsQuery.error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'loadTriggerButtons' } });
      toast(triggerButtonsQuery.error instanceof Error ? triggerButtonsQuery.error.message : 'Failed to load trigger buttons.', { variant: 'error' });
    }
  }, [triggerButtonsQuery.error, toast]);

  const createMutation = createCreateMutationV2<AiTriggerButtonDto, AiTriggerButtonCreatePayload>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.create'),
    mutationFn: async (payload: AiTriggerButtonCreatePayload): Promise<AiTriggerButtonDto> => {
      const result = await triggerButtonsApi.create(payload);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.create',
      operation: 'create',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    onSuccess: async (): Promise<void> => {
      await invalidateAiPathTriggerButtons(queryClient);
      toast('Trigger button created.', { variant: 'success' });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      logClientError(error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'createTriggerButton' } });
      toast(error instanceof Error ? error.message : 'Failed to create trigger button.', { variant: 'error' });
    },
  });

  const updateMutation = createUpdateMutationV2<
    AiTriggerButtonDto,
    {
      id: string;
      input: AiTriggerButtonCreatePayload;
    }
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.update'),
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: AiTriggerButtonCreatePayload;
    }): Promise<AiTriggerButtonDto> => {
      const result = await triggerButtonsApi.update(id, {
        name: input.name,
        iconId: input.iconId,
        locations: input.locations,
        mode: input.mode,
        display: input.display,
      });
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.update',
      operation: 'update',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    onSuccess: async (): Promise<void> => {
      await invalidateAiPathTriggerButtons(queryClient);
      toast('Trigger button updated.', { variant: 'success' });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      logClientError(error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'updateTriggerButton' } });
      toast(error instanceof Error ? error.message : 'Failed to update trigger button.', { variant: 'error' });
    },
  });

  const deleteMutation: UseMutationResult<void, Error, string> = createDeleteMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.delete'),
    mutationFn: async (id: string): Promise<void> => {
      const result = await triggerButtonsApi.remove(id);
      if (!result.ok) throw new Error(result.error);
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.delete',
      operation: 'delete',
      resource: 'ai-paths.trigger-buttons',
      domain: 'global',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    onSuccess: async (): Promise<void> => {
      await invalidateAiPathTriggerButtons(queryClient);
      toast('Trigger button deleted.', { variant: 'success' });
      setButtonToDelete(null);
    },
    onError: (error: unknown): void => {
      logClientError(error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'deleteTriggerButton' } });
      toast(error instanceof Error ? error.message : 'Failed to delete trigger button.', { variant: 'error' });
    },
  });

  const reorderMutation: UseMutationResult<AiTriggerButtonDto[], Error, string[]> = createUpdateMutationV2({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.reorder'),
    mutationFn: async (orderedIds: string[]): Promise<AiTriggerButtonDto[]> => {
      const result = await triggerButtonsApi.reorder(orderedIds);
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.reorder',
      operation: 'update',
      resource: 'ai-paths.trigger-buttons.order',
      domain: 'global',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    onSuccess: (data: AiTriggerButtonDto[]): void => {
      queryClient.setQueryData(QUERY_KEYS.ai.aiPaths.triggerButtons(), data);
      toast('Trigger button order updated.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      logClientError(error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'reorderTriggerButtons' } });
      toast(error instanceof Error ? error.message : 'Failed to reorder trigger buttons.', { variant: 'error' });
      void triggerButtonsQuery.refetch();
    },
  });

  const openCreate = (): void => {
    setDraft(normalizeDraft(null));
    setEditorOpen(true);
  };

  const handleEdit = useCallback((record: AiTriggerButtonDto): void => {
    setDraft(normalizeDraft(record));
    setEditorOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((id: string): void => {
    const list = triggerButtonsQuery.data ?? [];
    const btn = list.find((b: AiTriggerButtonDto) => b.id === id);
    if (btn) setButtonToDelete(btn);
  }, [triggerButtonsQuery.data]);

  const handleConfirmDelete = useCallback((): void => {
    if (buttonToDelete) {
      deleteMutation.mutate(buttonToDelete.id);
    }
  }, [buttonToDelete, deleteMutation]);

  const handleOrderChange = useCallback((orderedIds: string[]): void => {
    reorderMutation.mutate(orderedIds);
  }, [reorderMutation]);

  const editorFields: SettingsField<TriggerButtonDraft>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Button Name',
      type: 'text',
      placeholder: 'e.g. Generate SEO Title',
      helperText: 'Displayed to users in the UI.',
      required: true,
    },
    {
      key: 'iconId',
      label: 'Icon',
      type: 'custom',
      render: () => (
        <IconSelector
          value={draft.iconId}
          onChange={(nextValue: string | null) =>
            setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({
              ...prev,
              iconId: nextValue,
            }))
          }
          columns={6}
        />
      ),
      helperText: 'Choose a visual representation for the button.',
    },
    {
      key: 'display',
      label: 'Display Style',
      type: 'select',
      options: DISPLAY_OPTIONS,
      placeholder: 'Select display',
      helperText: 'Icon only is best for headers.',
    },
    {
      key: 'mode',
      label: 'Trigger Mode',
      type: 'select',
      options: MODE_OPTIONS,
      placeholder: 'Select mode',
      helperText: 'How the button behaves when clicked.',
    },
    {
      key: 'locations' as unknown as keyof TriggerButtonDraft,
      label: 'Location Visibility',
      type: 'custom',
      render: () => (
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 mt-2'>
          {LOCATION_OPTIONS.map((option): React.JSX.Element => {
            const checked = draft.locations.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card/30 px-3 py-2.5 transition-all hover:bg-card/50',
                  checked && 'border-primary/30 bg-primary/5'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value: boolean | 'indeterminate') => {
                    const nextChecked = Boolean(value);
                    setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => {
                      const next = new Set(prev.locations);
                      if (nextChecked) next.add(option.value);
                      else next.delete(option.value);
                      return { ...prev, locations: Array.from(next.values()) };
                    });
                  }}
                />
                <span className='text-xs font-medium'>{option.label}</span>
              </label>
            );
          })}
        </div>
      )
    }
  ], [draft.iconId, draft.locations]);

  const handleSave = async (): Promise<void> => {
    const validation = validateFormData(
      aiTriggerButtonCreateSchema,
      {
        name: draft.name,
        iconId: draft.iconId,
        locations: draft.locations,
        mode: draft.mode,
        display: draft.display,
      },
      'Trigger button form is invalid.',
    );
    if (!validation.success) {
      toast(validation.firstError, { variant: 'error' });
      return;
    }
    const input = validation.data;

    if (draft.id) {
      await updateMutation.mutateAsync({ id: draft.id, input });
      return;
    }
    await createMutation.mutateAsync(input);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const rows: AiTriggerButtonRecord[] = useMemo((): AiTriggerButtonRecord[] => {
    const list = triggerButtonsQuery.data ?? [];
    return list.map((btn: AiTriggerButtonDto): AiTriggerButtonRecord => ({
      ...btn,
      pathName: 'N/A' 
    }));
  }, [triggerButtonsQuery.data]);

  return (
    <div className='container mx-auto max-w-5xl py-10 space-y-6'>
      <PanelHeader
        title='Trigger Buttons'
        description='Configure interactive buttons that appear in modals and lists to trigger AI path executions.'
        icon={<MousePointer2 className='size-4' />}
        refreshable={true}
        isRefreshing={triggerButtonsQuery.isFetching}
        onRefresh={(): void => { void triggerButtonsQuery.refetch(); }}
        actions={[
          {
            key: 'create',
            label: 'New Trigger Button',
            icon: <Plus className='size-4' />,
            onClick: (): void => { openCreate(); },
          }
        ]}
      />

      <ListPanel>
        <TriggerButtonListManager
          data={rows}
          onEdit={(record: AiTriggerButtonRecord): void => { handleEdit(record); }}
          onDelete={(id: string): void => { handleDeleteRequest(id); }}
          onOrderChange={(ids: string[]): void => { handleOrderChange(ids); }}
          isLoading={triggerButtonsQuery.isLoading}
        />
        <div className='mt-4 flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded'>
          <RefreshCw className='size-3' />
          Drag the handle on the left to reorder. The same order is used in modals and lists.
        </div>
      </ListPanel>

      <SettingsPanelBuilder
        open={editorOpen}
        onClose={(): void => setEditorOpen(false)}
        title={draft.id ? 'Edit Trigger Button' : 'Create Trigger Button'}
        fields={editorFields}
        values={draft}
        onChange={(vals: Partial<TriggerButtonDraft>): void => { setDraft(prev => ({ ...prev, ...vals })); }}
        onSave={async (): Promise<void> => { await handleSave(); }}
        isSaving={saving}
        size='md'
      />

      <ConfirmModal
        isOpen={!!buttonToDelete}
        onClose={(): void => { setButtonToDelete(null); }}
        onConfirm={(): void => { handleConfirmDelete(); }}
        title='Delete Trigger Button'
        message={`Are you sure you want to delete "${buttonToDelete ? (buttonToDelete as AiTriggerButtonDto).name : ''}"? This will remove it from all assigned locations.`}
        confirmText='Delete Button'
        isDangerous={true}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
