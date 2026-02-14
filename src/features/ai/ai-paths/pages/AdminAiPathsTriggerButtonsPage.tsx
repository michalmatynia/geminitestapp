'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { invalidateAiPathTriggerButtons } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { 
  Button, 
  Checkbox, 
  Input, 
  Label, 
  SectionHeader, 
   
  SelectSimple, 
  AppModal, 
  useToast 
} from '@/shared/ui';
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

  const triggerButtonsQuery = useQuery<AiTriggerButtonDto[]>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async () => {
      const result = await triggerButtonsApi.list();
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (triggerButtonsQuery.error) {
      logClientError(triggerButtonsQuery.error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'loadTriggerButtons' } });
      toast(triggerButtonsQuery.error instanceof Error ? triggerButtonsQuery.error.message : 'Failed to load trigger buttons.', { variant: 'error' });
    }
  }, [triggerButtonsQuery.error, toast]);

  const createMutation = useMutation({
    mutationFn: async (payload: AiTriggerButtonCreatePayload): Promise<AiTriggerButtonDto> => {
      const result = await triggerButtonsApi.create(payload);
      if (!result.ok) throw new Error(result.error);
      return result.data;
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

  const updateMutation = useMutation({
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const result = await triggerButtonsApi.remove(id);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: async (): Promise<void> => {
      await invalidateAiPathTriggerButtons(queryClient);
      toast('Trigger button deleted.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      logClientError(error, { context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'deleteTriggerButton' } });
      toast(error instanceof Error ? error.message : 'Failed to delete trigger button.', { variant: 'error' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<AiTriggerButtonDto[]> => {
      const result = await triggerButtonsApi.reorder(orderedIds);
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
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

  const handleDelete = useCallback((id: string): void => {
    if (confirm('Are you sure you want to delete this trigger button?')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleOrderChange = useCallback((orderedIds: string[]): void => {
    reorderMutation.mutate(orderedIds);
  }, [reorderMutation]);

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
  const rows: AiTriggerButtonRecord[] = useMemo(() => {
    return (triggerButtonsQuery.data ?? []).map((btn: AiTriggerButtonDto) => ({
      ...btn,
      // In a real app, you might want to fetch path names as well
      pathName: 'N/A' 
    }));
  }, [triggerButtonsQuery.data]);

  return (
    <div className='container mx-auto max-w-5xl py-10'>
      <SectionHeader
        title='Trigger Buttons'
        actions={
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                void triggerButtonsQuery.refetch();
              }}
            >
              Refresh
            </Button>
            <Button onClick={openCreate}>New Trigger Button</Button>
          </div>
        }
      />

      <div className='mt-6 rounded-lg border border-border/60 bg-card/40 p-6'>
        <TriggerButtonListManager
          data={rows}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOrderChange={handleOrderChange}
          isLoading={triggerButtonsQuery.isLoading}
        />
        <div className='mt-2 text-[11px] text-gray-500'>
          Drag the handle on the left to reorder. The same order is used in modals and lists.
        </div>
      </div>

      <AppModal
        open={editorOpen}
        onClose={(): void => setEditorOpen(false)}
        title={draft.id ? 'Edit Trigger Button' : 'Create Trigger Button'}
        size='md'
      >
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, name: event.target.value }))
              }
              placeholder='e.g. Generate SEO Title'
            />
          </div>

          <div className='space-y-2'>
            <Label>Icon</Label>
            <IconSelector
              value={draft.iconId}
              onChange={(nextValue: string | null) =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({
                  ...prev,
                  iconId: nextValue,
                }))
              }
              columns={6}
              helperText='Click an icon to select it. Click the selected icon again to clear.'
            />
          </div>

          <div className='space-y-2'>
            <Label>Display</Label>
            <SelectSimple size='sm'
              value={draft.display}
              onValueChange={(value: string): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, display: value as AiTriggerButtonDisplay }))
              }
              options={DISPLAY_OPTIONS}
              placeholder='Select display'
            />
            <div className='text-[11px] text-gray-400'>
              Icon only is useful for tight spaces (modal headers). Icon + label is clearer in lists.
            </div>
          </div>

          <div className='space-y-3'>
            <Label>Attach to</Label>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {LOCATION_OPTIONS.map((option: { value: AiTriggerButtonLocation; label: string }): React.JSX.Element => {
                const checked = draft.locations.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className='flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-sm text-gray-200 hover:bg-card/60'
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
                    <span className='text-xs'>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Trigger condition</Label>
            <SelectSimple size='sm'
              value={draft.mode}
              onValueChange={(value: string): void =>
                setDraft((prev: TriggerButtonDraft): TriggerButtonDraft => ({ ...prev, mode: value as AiTriggerButtonMode }))
              }
              options={MODE_OPTIONS}
              placeholder='Select mode'
            />
            <div className='text-[11px] text-gray-400'>
              Click triggers fire immediately. Toggle triggers render as an On/Off switch in the UI and fire when changed.
            </div>
          </div>

          <div className='flex items-center justify-end gap-2'>
            <Button variant='outline' onClick={(): void => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={(): void => { void handleSave(); }} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
