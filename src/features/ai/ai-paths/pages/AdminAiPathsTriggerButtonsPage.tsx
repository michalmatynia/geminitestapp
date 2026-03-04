'use client';

import { MousePointer2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAiPathsSettingsQuery } from '@/shared/lib/ai-paths/hooks/useAiPathQueries';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY, triggerButtonsApi } from '@/shared/lib/ai-paths';
import {
  aiTriggerButtonCreateSchema,
  type AiTriggerButtonCreatePayload,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import { ICON_LIBRARY, IconSelector } from '@/shared/lib/icons';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { AiTriggerButtonLocation } from '@/shared/contracts/ai-trigger-buttons';
import { api } from '@/shared/lib/api-client';
import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createListQueryV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  AppModal,
  Badge,
  Button,
  Checkbox,
  useToast,
  PanelHeader,
  ConfirmModal,
  Card,
  Hint,
} from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { cn } from '@/shared/utils';
import { validateFormData } from '@/shared/validations/form-validation';

import {
  TriggerButtonListManager,
  type AiTriggerButtonRecord,
} from '../components/TriggerButtonListManager';

type TriggerButtonDraft = AiTriggerButtonCreatePayload & { id?: string };
type TriggerButtonPathUsage = { id: string; name: string };

const LOCATION_OPTIONS: Array<{ value: AiTriggerButtonLocation; label: string }> = [
  { value: 'product_modal', label: 'Products: Product Modal' },
  { value: 'product_list', label: 'Products: Product List (Footer)' },
  { value: 'product_row', label: 'Products: Product Row' },
  { value: 'product_list_header', label: 'Products: List Header' },
  { value: 'product_list_item', label: 'Products: List Item (Context)' },
  { value: 'product_form_header', label: 'Products: Form Header' },
  { value: 'product_form_footer', label: 'Products: Form Footer' },
  { value: 'note_modal', label: 'Notes: Note Modal' },
  { value: 'note_list', label: 'Notes: Note List' },
  { value: 'cms_page_header', label: 'CMS: Page Header' },
  { value: 'cms_block_header', label: 'CMS: Block Header' },
  { value: 'admin_dashboard', label: 'Admin: Dashboard' },
];

const MODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'click', label: 'On click' },
  { value: 'toggle', label: 'Toggle (On/Off)' },
  { value: 'execute_path', label: 'Execute AI Path' },
  { value: 'open_chat', label: 'Open Chatbot' },
  { value: 'open_url', label: 'Open URL' },
  { value: 'copy_text', label: 'Copy Text' },
];

const DISPLAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'icon_label', label: 'Icon + label' },
  { value: 'icon', label: 'Icon only (name in tooltip)' },
];

const toDisplayMode = (
  record: Pick<AiTriggerButtonRecord, 'display'> | null | undefined
): 'icon' | 'icon_label' => (record?.display.showLabel === false ? 'icon' : 'icon_label');

const normalizeDraft = (record?: AiTriggerButtonRecord | null): TriggerButtonDraft => ({
  ...(record?.id ? { id: record.id } : {}),
  name: record?.name ?? '',
  iconId: record?.iconId ?? null,
  pathId: record?.pathId ?? null,
  enabled: record?.enabled ?? true,
  locations: record?.locations ?? ['product_modal'],
  mode: record?.mode ?? 'click',
  display: toDisplayMode(record),
});

const BUILT_IN_TRIGGER_EVENTS = new Set<string>(['manual', 'scheduled_run']);

const extractTriggerButtonPathUsageMap = (
  settings: Array<{ key: string; value: string }>
): Map<string, TriggerButtonPathUsage[]> => {
  const map = new Map<string, string>(settings.map((item) => [item.key, item.value]));
  const usageByButtonId = new Map<string, TriggerButtonPathUsage[]>();
  const indexNameById = new Map<string, string>();
  const indexRaw = map.get(PATH_INDEX_KEY);
  if (indexRaw) {
    try {
      const parsedIndex = JSON.parse(indexRaw) as unknown;
      if (Array.isArray(parsedIndex)) {
        parsedIndex.forEach((entry: unknown) => {
          if (!entry || typeof entry !== 'object') return;
          const id = (entry as { id?: unknown }).id;
          if (typeof id !== 'string' || id.trim().length === 0) return;
          const nameRaw = (entry as { name?: unknown }).name;
          const name =
            typeof nameRaw === 'string' && nameRaw.trim().length > 0 ? nameRaw.trim() : '';
          indexNameById.set(id, name);
        });
      }
    } catch {
      // Ignore malformed index; config scan below remains source of truth.
    }
  }

  map.forEach((value: string, key: string) => {
    if (!key.startsWith(PATH_CONFIG_PREFIX)) return;
    const pathId = key.slice(PATH_CONFIG_PREFIX.length).trim();
    if (!pathId) return;

    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(value);
    } catch {
      return;
    }
    if (!parsedConfig || typeof parsedConfig !== 'object') return;

    const configNameRaw = (parsedConfig as { name?: unknown }).name;
    const configName =
      typeof configNameRaw === 'string' && configNameRaw.trim().length > 0
        ? configNameRaw.trim()
        : '';
    const pathName =
      indexNameById.get(pathId)?.trim() || configName || `Path ${pathId.slice(0, 6)}`;

    const nodes = (parsedConfig as { nodes?: unknown }).nodes;
    if (!Array.isArray(nodes)) return;

    const usedButtonIds = new Set<string>();
    nodes.forEach((node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const nodeType = (node as { type?: unknown }).type;
      if (nodeType !== 'trigger') return;

      const eventValue = (
        node as {
          config?: { trigger?: { event?: unknown } };
        }
      ).config?.trigger?.event;
      if (typeof eventValue !== 'string') return;
      const event = eventValue.trim();
      if (!event || BUILT_IN_TRIGGER_EVENTS.has(event)) return;
      usedButtonIds.add(event);
    });

    usedButtonIds.forEach((buttonId: string) => {
      const existing = usageByButtonId.get(buttonId) ?? [];
      if (existing.some((entry: TriggerButtonPathUsage) => entry.id === pathId)) return;
      usageByButtonId.set(buttonId, [...existing, { id: pathId, name: pathName }]);
    });
  });

  usageByButtonId.forEach((entries: TriggerButtonPathUsage[], buttonId: string) => {
    usageByButtonId.set(
      buttonId,
      [...entries].sort((a: TriggerButtonPathUsage, b: TriggerButtonPathUsage) =>
        a.name.localeCompare(b.name)
      )
    );
  });

  return usageByButtonId;
};

export function AdminAiPathsTriggerButtonsPage(): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();

  const [editorOpen, setEditorOpen] = useState(false);
  const [iconLibraryOpen, setIconLibraryOpen] = useState(false);
  const [draft, setDraft] = useState<TriggerButtonDraft>(() => normalizeDraft(null));
  const [buttonToDelete, setButtonToDelete] = useState<AiTriggerButtonRecord | null>(null);
  const aiPathsSettingsQuery = useAiPathsSettingsQuery();

  const triggerButtonsQuery = createListQueryV2<AiTriggerButtonRecord>({
    queryKey: QUERY_KEYS.ai.aiPaths.triggerButtons(),
    queryFn: async (): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.list({ entityType: 'custom' });
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.list',
      operation: 'list',
      resource: 'ai-paths.trigger-buttons',
      domain: 'ai_paths',
      tags: ['ai-paths', 'trigger-buttons'],
    },
  });

  useEffect(() => {
    if (triggerButtonsQuery.error) {
      logClientError(triggerButtonsQuery.error, {
        context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'loadTriggerButtons' },
      });
      toast(
        triggerButtonsQuery.error instanceof Error
          ? triggerButtonsQuery.error.message
          : 'Failed to load trigger buttons.',
        { variant: 'error' }
      );
    }
  }, [triggerButtonsQuery.error, toast]);

  const createMutation = createCreateMutationV2<
    AiTriggerButtonRecord,
    AiTriggerButtonCreatePayload
  >({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.create'),
    mutationFn: async (payload: AiTriggerButtonCreatePayload): Promise<AiTriggerButtonRecord> => {
      const result = await triggerButtonsApi.create(payload);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.create',
      operation: 'create',
      resource: 'ai-paths.trigger-buttons',
      domain: 'ai_paths',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    invalidateKeys: [QUERY_KEYS.ai.aiPaths.triggerButtons()],
    onSuccess: () => {
      toast('Trigger button created.', { variant: 'success' });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      logClientError(error, {
        context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'createTriggerButton' },
      });
      toast(error instanceof Error ? error.message : 'Failed to create trigger button.', {
        variant: 'error',
      });
    },
  });

  const updateMutation = createUpdateMutationV2<
    AiTriggerButtonRecord,
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
    }): Promise<AiTriggerButtonRecord> => {
      const result = await triggerButtonsApi.update(id, {
        name: input.name,
        iconId: input.iconId,
        enabled: input.enabled,
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
      domain: 'ai_paths',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    invalidateKeys: [QUERY_KEYS.ai.aiPaths.triggerButtons()],
    onSuccess: () => {
      toast('Trigger button updated.', { variant: 'success' });
      setEditorOpen(false);
    },
    onError: (error: unknown): void => {
      logClientError(error, {
        context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'updateTriggerButton' },
      });
      toast(error instanceof Error ? error.message : 'Failed to update trigger button.', {
        variant: 'error',
      });
      void triggerButtonsQuery.refetch();
    },
  });

  const deleteMutation = createDeleteMutationV2<void, string>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.delete'),
    mutationFn: async (id: string): Promise<void> => {
      const result = await triggerButtonsApi.delete(id);
      if (!result.ok) throw new Error(result.error);
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.delete',
      operation: 'delete',
      resource: 'ai-paths.trigger-buttons',
      domain: 'ai_paths',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    invalidateKeys: [QUERY_KEYS.ai.aiPaths.triggerButtons()],
    onSuccess: () => {
      toast('Trigger button deleted.', { variant: 'success' });
      setButtonToDelete(null);
    },
    onError: (error: unknown): void => {
      logClientError(error, {
        context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'deleteTriggerButton' },
      });
      toast(error instanceof Error ? error.message : 'Failed to delete trigger button.', {
        variant: 'error',
      });
    },
  });

  const reorderMutation = createUpdateMutationV2<AiTriggerButtonRecord[], string[]>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('trigger-buttons.reorder'),
    mutationFn: async (orderedIds: string[]): Promise<AiTriggerButtonRecord[]> => {
      const result = await triggerButtonsApi.reorder({ orderedIds });
      if (!result.ok) throw new Error(result.error);
      return Array.isArray(result.data) ? result.data : [];
    },
    meta: {
      source: 'ai.ai-paths.pages.trigger-buttons.reorder',
      operation: 'update',
      resource: 'ai-paths.trigger-buttons.order',
      domain: 'ai_paths',
      tags: ['ai-paths', 'trigger-buttons'],
    },
    invalidateKeys: [QUERY_KEYS.ai.aiPaths.triggerButtons()],
    onSuccess: () => {
      toast('Trigger button order updated.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      logClientError(error, {
        context: { source: 'AdminAiPathsTriggerButtonsPage', action: 'reorderTriggerButtons' },
      });
      toast(error instanceof Error ? error.message : 'Failed to reorder trigger buttons.', {
        variant: 'error',
      });
      void triggerButtonsQuery.refetch();
    },
  });

  const openCreate = (): void => {
    setDraft(normalizeDraft(null));
    setIconLibraryOpen(false);
    setEditorOpen(true);
  };

  const handleEdit = useCallback((record: AiTriggerButtonRecord): void => {
    setDraft(normalizeDraft(record));
    setIconLibraryOpen(false);
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    if (!editorOpen) {
      setIconLibraryOpen(false);
    }
  }, [editorOpen]);

  const handleDeleteRequest = useCallback(
    (id: string): void => {
      const list = triggerButtonsQuery.data ?? [];
      const btn = list.find((b: AiTriggerButtonRecord) => b.id === id);
      if (btn) setButtonToDelete(btn);
    },
    [triggerButtonsQuery.data]
  );

  const handleConfirmDelete = useCallback((): void => {
    if (buttonToDelete) {
      deleteMutation.mutate(buttonToDelete.id);
    }
  }, [buttonToDelete, deleteMutation]);

  const handleOrderChange = useCallback(
    (orderedIds: string[]): void => {
      reorderMutation.mutate(orderedIds);
    },
    [reorderMutation]
  );
  const handleToggleVisibility = useCallback(
    (record: AiTriggerButtonRecord, enabled: boolean): void => {
      updateMutation.mutate({
        id: record.id,
        input: {
          name: record.name,
          iconId: record.iconId ?? null,
          enabled,
          locations:
            record.locations && record.locations.length > 0 ? record.locations : ['product_modal'],
          mode: record.mode ?? 'click',
          display: toDisplayMode(record),
        },
      });
    },
    [updateMutation]
  );
  const handleOpenPath = useCallback(
    (pathId: string): void => {
      const normalizedPathId = pathId.trim();
      if (!normalizedPathId) return;
      void api
        .patch('/api/user/preferences', { aiPathsActivePathId: normalizedPathId })
        .catch((error: unknown) => {
          logClientError(error, {
            context: {
              source: 'AdminAiPathsTriggerButtonsPage',
              action: 'setActivePathPreferenceFromTriggerButtons',
              pathId: normalizedPathId,
            },
          });
        });
      const params = new URLSearchParams({ pathId: normalizedPathId });
      router.push(`/admin/ai-paths?${params.toString()}`);
    },
    [router]
  );

  const triggerButtonPathUsageMap = useMemo(
    () => extractTriggerButtonPathUsageMap(aiPathsSettingsQuery.data ?? []),
    [aiPathsSettingsQuery.data]
  );
  const draftPathUsage = useMemo<TriggerButtonPathUsage[]>(
    () => (draft.id ? (triggerButtonPathUsageMap.get(draft.id) ?? []) : []),
    [draft.id, triggerButtonPathUsageMap]
  );
  const selectedIconItem = useMemo(
    () => ICON_LIBRARY.find((item) => item.id === draft.iconId) ?? null,
    [draft.iconId]
  );
  const handleSelectIcon = useCallback((nextIcon: string | null): void => {
    setDraft(
      (prev: TriggerButtonDraft): TriggerButtonDraft => ({
        ...prev,
        iconId: nextIcon,
      })
    );
    setIconLibraryOpen(false);
  }, []);

  const editorFields: SettingsField<TriggerButtonDraft>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Button Name',
        type: 'text',
        placeholder: 'e.g. Generate SEO Title',
        helperText: 'Displayed to users in the UI.',
        required: true,
      },
      {
        key: 'enabled',
        label: 'Visible',
        type: 'switch',
        helperText: 'Show this trigger button in product/note lists and modals.',
      },
      {
        key: 'iconId',
        label: 'Icon',
        type: 'custom',
        render: () => (
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={(): void => {
                  setIconLibraryOpen(true);
                }}
              >
                {draft.iconId ? 'Change Icon' : 'Choose Icon'}
              </Button>
              {draft.iconId ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={(): void =>
                    setDraft(
                      (prev: TriggerButtonDraft): TriggerButtonDraft => ({
                        ...prev,
                        iconId: null,
                      })
                    )
                  }
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <Card
              variant='subtle-compact'
              padding='sm'
              className='flex items-center gap-2 border-border bg-card/40'
            >
              {selectedIconItem ? (
                <selectedIconItem.icon className='size-4 text-primary' />
              ) : (
                <MousePointer2 className='size-4 text-gray-500' />
              )}
              <span className='text-xs text-gray-300'>
                {selectedIconItem?.label ?? 'No icon selected'}
              </span>
            </Card>
          </div>
        ),
        helperText: 'Choose a visual representation for the button.',
      },
      {
        key: 'display',
        label: 'Display Style',
        type: 'select',
        options: DISPLAY_OPTIONS,
        placeholder: 'Select display',
        helperText: 'Set per button. Icon-only mode shows the button name in a hover tooltip.',
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
        key: 'locations',
        label: 'Location Visibility',
        type: 'custom',
        render: () => (
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 mt-2'>
            {LOCATION_OPTIONS.map((option): React.JSX.Element => {
              const checked = draft.locations.includes(option.value);
              return (
                <label key={option.value} className='block cursor-pointer'>
                  <Card
                    variant='subtle-compact'
                    padding='none'
                    className={cn(
                      'flex items-center gap-3 border-border bg-card/30 px-3 py-2.5 transition-all hover:bg-card/50',
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
                    <Hint size='xs' className='font-medium'>
                      {option.label}
                    </Hint>
                  </Card>
                </label>
              );
            })}
          </div>
        ),
      },
      {
        key: 'id',
        label: 'Used In AI Paths',
        type: 'custom',
        render: () => (
          <div className='mt-2'>
            {draft.id ? (
              draftPathUsage.length > 0 ? (
                <div className='flex flex-wrap gap-1.5'>
                  {draftPathUsage.map(
                    (path: TriggerButtonPathUsage): React.JSX.Element => (
                      <Badge
                        key={path.id}
                        variant='neutral'
                        className='border-border bg-muted/30 text-[11px] text-gray-300'
                      >
                        {path.name}
                      </Badge>
                    )
                  )}
                </div>
              ) : (
                <p className='text-xs text-gray-500'>
                  This button is not linked to any AI Path trigger node yet.
                </p>
              )
            ) : (
              <p className='text-xs text-gray-500'>
                Save the button first to see where it is used.
              </p>
            )}
          </div>
        ),
        helperText: 'Paths containing Trigger nodes configured for this button.',
      },
    ],
    [draft.iconId, draft.id, draft.locations, draftPathUsage, selectedIconItem]
  );

  const handleSave = async (): Promise<void> => {
    const validation = validateFormData(
      aiTriggerButtonCreateSchema,
      {
        name: draft.name,
        iconId: draft.iconId,
        enabled: draft.enabled,
        locations: draft.locations,
        mode: draft.mode,
        display: draft.display,
      },
      'Trigger button form is invalid.'
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
    return list.map(
      (btn: AiTriggerButtonRecord): AiTriggerButtonRecord =>
        ({
          ...btn,
          usedPaths: (triggerButtonPathUsageMap.get(btn.id) ?? []).map(
            (entry: TriggerButtonPathUsage) => ({
              id: entry.id,
              name: entry.name,
            })
          ),
        }) as AiTriggerButtonRecord
    );
  }, [triggerButtonsQuery.data, triggerButtonPathUsageMap]);

  return (
    <div className='container mx-auto max-w-5xl py-10 space-y-6'>
      <PanelHeader
        title='Trigger Buttons'
        description='Configure interactive buttons that appear in modals and lists to trigger AI path executions.'
        icon={<MousePointer2 className='size-4' />}
        refreshable={true}
        isRefreshing={triggerButtonsQuery.isFetching}
        onRefresh={(): void => {
          void triggerButtonsQuery.refetch();
        }}
        actions={[
          {
            key: 'create',
            label: 'New Trigger Button',
            icon: <Plus className='size-4' />,
            onClick: (): void => {
              openCreate();
            },
          },
        ]}
      />

      <TriggerButtonListManager
        data={rows}
        onEdit={(record: AiTriggerButtonRecord): void => {
          handleEdit(record);
        }}
        onDelete={(id: string): void => {
          handleDeleteRequest(id);
        }}
        onOrderChange={(ids: string[]): void => {
          handleOrderChange(ids);
        }}
        onToggleVisibility={handleToggleVisibility}
        onOpenPath={handleOpenPath}
        isLoading={triggerButtonsQuery.isLoading}
        isReordering={reorderMutation.isPending}
      />

      <SettingsPanelBuilder
        open={editorOpen}
        onClose={(): void => setEditorOpen(false)}
        title={draft.id ? 'Edit Trigger Button' : 'Create Trigger Button'}
        fields={editorFields}
        values={draft}
        onChange={(vals: Partial<TriggerButtonDraft>): void => {
          setDraft((prev) => ({ ...prev, ...vals }));
        }}
        onSave={async (): Promise<void> => {
          await handleSave();
        }}
        isSaving={saving}
        size='xl'
      />
      <AppModal
        open={iconLibraryOpen}
        onClose={(): void => {
          setIconLibraryOpen(false);
        }}
        title='Choose Icon'
        size='xl'
        className='md:min-w-[72rem] max-w-[80rem]'
        bodyClassName='h-[76vh]'
      >
        <IconSelector
          value={draft.iconId}
          onChange={handleSelectIcon}
          columns={12}
          showSearch
          helperText='Search and pick an icon. Selecting an icon applies it immediately.'
        />
      </AppModal>

      <ConfirmModal
        isOpen={!!buttonToDelete}
        onClose={(): void => {
          setButtonToDelete(null);
        }}
        onConfirm={(): void => {
          handleConfirmDelete();
        }}
        title='Delete Trigger Button'
        message={`Are you sure you want to delete "${buttonToDelete?.name ?? ''}"? This will remove it from all assigned locations.`}
        confirmText='Delete Button'
        isDangerous={true}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
