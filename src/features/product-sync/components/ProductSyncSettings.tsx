'use client';

import { Plus, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  useCreateProductSyncProfileMutation,
  useDeleteProductSyncProfileMutation,
  useProductSyncProfiles,
  useProductSyncRuns,
  useRelinkBaseProductsMutation,
  useRunProductSyncProfileMutation,
  useUpdateProductSyncProfileMutation,
} from '@/features/product-sync/public/hooks/useProductSyncSettings';
import type { BaseDefaultConnectionPreferenceResponse } from '@/shared/contracts/integrations';
import {
  PRODUCT_SYNC_APP_FIELDS,
  PRODUCT_SYNC_DIRECTION_OPTIONS,
} from '@/shared/contracts/product-sync';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  ProductSyncAppField,
  ProductSyncDirection,
  ProductSyncFieldRule,
  ProductSyncProfile,
  ProductSyncProfileCreatePayload,
  ProductSyncProfileUpdatePayload,
  ProductSyncRelinkPayload,
} from '@/shared/contracts/product-sync';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  useDefaultExportConnection,
  useDefaultExportInventory,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import { api } from '@/shared/lib/api-client';
import {
  Badge,
  Button,
  Input,
  SelectSimple,
  useToast,
  SimpleSettingsList,
  FormSection,
  FormField,
  ToggleRow,
  FormActions,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type ProductSyncProfileDraft = {
  name: string;
  enabled: boolean;
  connectionId: string;
  inventoryId: string;
  catalogId: string;
  scheduleIntervalMinutes: number;
  batchSize: number;
  fieldRules: ProductSyncFieldRule[];
};

type ProductSyncDraftDefaults = {
  connectionId?: string;
  inventoryId?: string;
};

const EMPTY_PROFILES: ProductSyncProfile[] = [];

const BASE_CONNECTION_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select connection...',
};

const makeRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const defaultDraft = ({
  connectionId = '',
  inventoryId = '',
}: ProductSyncDraftDefaults = {}): ProductSyncProfileDraft => ({
  name: 'Base Product Sync',
  enabled: true,
  connectionId,
  inventoryId,
  catalogId: '',
  scheduleIntervalMinutes: 30,
  batchSize: 100,
  fieldRules: [
    {
      id: makeRuleId(),
      appField: 'stock',
      baseField: 'stock',
      direction: 'base_to_app',
    },
    {
      id: makeRuleId(),
      appField: 'name_en',
      baseField: 'text_fields.name',
      direction: 'app_to_base',
    },
    {
      id: makeRuleId(),
      appField: 'description_en',
      baseField: 'text_fields.description',
      direction: 'app_to_base',
    },
  ],
});

const profileToDraft = (profile: ProductSyncProfile): ProductSyncProfileDraft => ({
  name: profile.name,
  enabled: profile.enabled,
  connectionId: profile.connectionId,
  inventoryId: profile.inventoryId,
  catalogId: profile.catalogId ?? '',
  scheduleIntervalMinutes: profile.scheduleIntervalMinutes,
  batchSize: profile.batchSize,
  fieldRules: (profile.fieldRules ?? []).map((rule: ProductSyncFieldRule) => ({
    id: rule.id,
    appField: rule.appField,
    baseField: rule.baseField,
    direction: rule.direction,
  })),
});

const appFieldLabel = (value: ProductSyncAppField): string => {
  if (value === 'name_en') return 'Name (EN)';
  if (value === 'description_en') return 'Description (EN)';
  if (value === 'stock') return 'Stock';
  if (value === 'price') return 'Price';
  if (value === 'sku') return 'SKU';
  if (value === 'ean') return 'EAN';
  if (value === 'weight') return 'Weight';
  return value;
};

const directionLabel = (value: ProductSyncDirection): string => {
  if (value === 'base_to_app') return 'Base -> App';
  if (value === 'app_to_base') return 'App -> Base';
  return 'Disabled';
};

export function ProductSyncSettings(): React.JSX.Element {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();

  const profilesQuery = useProductSyncProfiles();
  const createProfileMutation = useCreateProductSyncProfileMutation();
  const updateProfileMutation = useUpdateProductSyncProfileMutation();
  const deleteProfileMutation = useDeleteProductSyncProfileMutation();
  const runNowMutation = useRunProductSyncProfileMutation();
  const relinkMutation = useRelinkBaseProductsMutation();
  const integrationsQuery = useIntegrationsWithConnections();
  const defaultExportConnectionQuery = useDefaultExportConnection();
  const defaultExportInventoryQuery = useDefaultExportInventory();

  const profiles = profilesQuery.data ?? EMPTY_PROFILES;
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [draft, setDraft] = useState<ProductSyncProfileDraft>(defaultDraft());
  const [applyingConnectionDefaults, setApplyingConnectionDefaults] = useState(false);

  const runsQuery = useProductSyncRuns(selectedProfileId || null, 50);
  const runs = runsQuery.data ?? [];

  const baseConnections = useMemo(() => {
    const integrations = integrationsQuery.data ?? [];
    const baseIntegration = integrations.find((integration) => {
      const slug = (integration.slug ?? '').trim().toLowerCase();
      return slug === 'base' || slug === 'base-com' || slug === 'baselinker';
    });
    return baseIntegration?.connections ?? [];
  }, [integrationsQuery.data]);
  const baseConnectionOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      BASE_CONNECTION_PLACEHOLDER_OPTION,
      ...baseConnections.map((connection) => ({
        value: connection.id,
        label: connection.name,
      })),
    ],
    [baseConnections]
  );
  const appFieldOptions = useMemo(
    (): Array<LabeledOptionDto<ProductSyncAppField>> =>
      PRODUCT_SYNC_APP_FIELDS.map((field: ProductSyncAppField) => ({
        value: field,
        label: appFieldLabel(field),
      })),
    []
  );
  const directionOptions = useMemo(
    (): Array<LabeledOptionDto<ProductSyncDirection>> =>
      PRODUCT_SYNC_DIRECTION_OPTIONS.map((direction: ProductSyncDirection) => ({
        value: direction,
        label: directionLabel(direction),
      })),
    []
  );

  const preferredConnectionId = useMemo(() => {
    const preferredConnection = (defaultExportConnectionQuery.data?.connectionId ?? '').trim();
    if (
      preferredConnection &&
      baseConnections.some((connection) => connection.id === preferredConnection)
    ) {
      return preferredConnection;
    }
    return baseConnections[0]?.id ?? '';
  }, [defaultExportConnectionQuery.data?.connectionId, baseConnections]);

  const preferredInventoryId = useMemo(() => {
    return (defaultExportInventoryQuery.data?.inventoryId ?? '').trim();
  }, [defaultExportInventoryQuery.data?.inventoryId]);

  const newProfileDefaults = useMemo<ProductSyncDraftDefaults>(
    () => ({
      connectionId: preferredConnectionId,
      inventoryId: preferredInventoryId,
    }),
    [preferredConnectionId, preferredInventoryId]
  );

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId('');
      setDraft(defaultDraft(newProfileDefaults));
      return;
    }

    const selected = profiles.find(
      (profile: ProductSyncProfile) => profile.id === selectedProfileId
    );
    if (selected) {
      setDraft(profileToDraft(selected));
      return;
    }

    const first = profiles[0];
    if (!first) {
      setSelectedProfileId('');
      setDraft(defaultDraft(newProfileDefaults));
      return;
    }
    setSelectedProfileId(first.id);
    setDraft(profileToDraft(first));
  }, [profiles, selectedProfileId, newProfileDefaults]);

  const isSaving = createProfileMutation.isPending || updateProfileMutation.isPending;

  const handleNewProfile = (): void => {
    setSelectedProfileId('');
    setDraft(defaultDraft(newProfileDefaults));
  };

  const handleSave = async (): Promise<void> => {
    if (!draft.connectionId.trim()) {
      toast('Select a Base connection.', { variant: 'error' });
      return;
    }
    if (!draft.inventoryId.trim()) {
      toast('Inventory ID is required.', { variant: 'error' });
      return;
    }

    const payload: ProductSyncProfileCreatePayload = {
      name: draft.name.trim() || 'Base Product Sync',
      enabled: draft.enabled,
      connectionId: draft.connectionId.trim(),
      inventoryId: draft.inventoryId.trim(),
      catalogId: draft.catalogId.trim() || null,
      scheduleIntervalMinutes: draft.scheduleIntervalMinutes,
      batchSize: draft.batchSize,
      fieldRules: draft.fieldRules,
      conflictPolicy: 'skip',
    };

    try {
      if (selectedProfileId) {
        const updated = await updateProfileMutation.mutateAsync({
          id: selectedProfileId,
          data: payload satisfies ProductSyncProfileUpdatePayload,
        });
        setSelectedProfileId(updated.id);
        setDraft(profileToDraft(updated));
        toast('Sync profile updated.', { variant: 'success' });
        return;
      }

      const created = await createProfileMutation.mutateAsync(payload);
      setSelectedProfileId(created.id);
      setDraft(profileToDraft(created));
      toast('Sync profile created.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save profile.', {
        variant: 'error',
      });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedProfileId) return;

    confirm({
      title: 'Delete Sync Profile?',
      message: 'Are you sure you want to delete this sync profile? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteProfileMutation.mutateAsync(selectedProfileId);
          toast('Sync profile deleted.', { variant: 'success' });
          setSelectedProfileId('');
          setDraft(defaultDraft(newProfileDefaults));
        } catch (error) {
          logClientError(error);
          toast(error instanceof Error ? error.message : 'Failed to delete profile.', {
            variant: 'error',
          });
        }
      },
    });
  };

  const handleRunNow = async (): Promise<void> => {
    if (!selectedProfileId) {
      toast('Save the profile first.', { variant: 'error' });
      return;
    }

    try {
      await runNowMutation.mutateAsync({ profileId: selectedProfileId });
      toast('Sync run queued.', { variant: 'success' });
      void runsQuery.refetch();
      void profilesQuery.refetch();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to queue sync run.', {
        variant: 'error',
      });
    }
  };

  const handleBackfill = async (): Promise<void> => {
    try {
      const connectionId = draft.connectionId.trim();
      const inventoryId = draft.inventoryId.trim();
      const catalogId = draft.catalogId.trim();
      const payload: ProductSyncRelinkPayload = {
        ...(connectionId ? { connectionId } : {}),
        ...(inventoryId ? { inventoryId } : {}),
        ...(catalogId ? { catalogId } : { catalogId: null }),
      };

      const result = await relinkMutation.mutateAsync(payload);
      toast(`Backfill queued (${result.jobId}).`, { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to queue backfill.', {
        variant: 'error',
      });
    }
  };

  const handleApplyConnectionAcrossSettings = (): void => {
    const connectionId = draft.connectionId.trim();
    if (!connectionId) {
      toast('Select a Base connection first.', { variant: 'error' });
      return;
    }

    const selectedConnection = baseConnections.find((connection) => connection.id === connectionId);
    const connectionLabel = selectedConnection?.name || connectionId;
    const profilesToUpdate = profiles.filter((profile) => profile.connectionId !== connectionId);

    confirm({
      title: 'Apply connection to Base.com settings?',
      message: `Set "${connectionLabel}" as default import/export connection and update ${profilesToUpdate.length} sync profile(s) to use it.`,
      confirmText: 'Apply',
      onConfirm: async () => {
        setApplyingConnectionDefaults(true);
        try {
          await api.post<BaseDefaultConnectionPreferenceResponse>(
            '/api/v2/integrations/exports/base/default-connection',
            { connectionId }
          );
          for (const profile of profilesToUpdate) {
            await updateProfileMutation.mutateAsync({
              id: profile.id,
              data: { connectionId },
            });
          }
          await Promise.all([profilesQuery.refetch(), defaultExportConnectionQuery.refetch()]);
          toast(
            `Applied "${connectionLabel}" to default Base.com settings and ${profilesToUpdate.length} sync profile(s).`,
            { variant: 'success' }
          );
        } catch (error) {
          logClientError(error);
          toast(error instanceof Error ? error.message : 'Failed to apply Base.com connection.', {
            variant: 'error',
          });
        } finally {
          setApplyingConnectionDefaults(false);
        }
      },
    });
  };

  const updateRule = (id: string, patch: Partial<ProductSyncFieldRule>): void => {
    setDraft((prev: ProductSyncProfileDraft) => ({
      ...prev,
      fieldRules: prev.fieldRules.map((rule: ProductSyncFieldRule) =>
        rule.id === id ? { ...rule, ...patch } : rule
      ),
    }));
  };

  const addRule = (): void => {
    setDraft((prev: ProductSyncProfileDraft) => ({
      ...prev,
      fieldRules: [
        ...prev.fieldRules,
        {
          id: makeRuleId(),
          appField: 'stock',
          baseField: 'stock',
          direction: 'disabled',
        },
      ],
    }));
  };

  const removeRule = (id: string): void => {
    setDraft((prev: ProductSyncProfileDraft) => ({
      ...prev,
      fieldRules:
        prev.fieldRules.length <= 1
          ? prev.fieldRules
          : prev.fieldRules.filter((rule: ProductSyncFieldRule) => rule.id !== id),
    }));
  };

  return (
    <div className='space-y-6'>
      <FormSection
        title='Profile'
        description='Configure scheduled field-level sync between your products and Base.com.'
        variant='subtle'
        className='p-4'
      >
        <div className='mt-4 grid gap-3 md:grid-cols-[240px_1fr]'>
          <div className='space-y-2 rounded-md border border-border/60 bg-card/40 p-2'>
            {profiles.map((profile: ProductSyncProfile) => (
              <Button
                size='xs'
                key={profile.id}
                type='button'
                variant='ghost'
                onClick={(): void => setSelectedProfileId(profile.id)}
                className={`w-full justify-start text-xs ${
                  selectedProfileId === profile.id
                    ? 'bg-gray-800 text-white hover:bg-gray-800'
                    : 'text-gray-300 hover:bg-muted/40'
                }`}
              >
                {profile.name}
              </Button>
            ))}
            <Button
              size='xs'
              type='button'
              variant='secondary'
              onClick={handleNewProfile}
              className='w-full justify-start text-xs'
            >
              <Plus className='mr-2 size-3.5' />
              New Profile
            </Button>
          </div>

          <div className='space-y-4'>
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='Name'>
                <Input
                  variant='subtle'
                  size='sm'
                  value={draft.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                 aria-label='Name' title='Name'/>
              </FormField>
              <FormField label='Base Connection'>
                <SelectSimple
                  variant='subtle'
                  size='sm'
                  value={draft.connectionId || '__none__'}
                  onValueChange={(value: string): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      connectionId: value === '__none__' ? '' : value,
                    }))
                  }
                  options={baseConnectionOptions}
                  triggerClassName='w-full'
                 ariaLabel='Base Connection' title='Base Connection'/>
                <div className='mt-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='secondary'
                    onClick={handleApplyConnectionAcrossSettings}
                    disabled={!draft.connectionId.trim()}
                    loading={applyingConnectionDefaults}
                    loadingText='Applying...'
                  >
                    Apply To Import/Export + All Sync Profiles
                  </Button>
                </div>
              </FormField>
            </div>

            <div className='grid gap-3 md:grid-cols-4'>
              <FormField label='Inventory ID'>
                <Input
                  variant='subtle'
                  size='sm'
                  value={draft.inventoryId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      inventoryId: event.target.value,
                    }))
                  }
                 aria-label='Inventory ID' title='Inventory ID'/>
              </FormField>
              <FormField label='Catalog Filter'>
                <Input
                  variant='subtle'
                  size='sm'
                  value={draft.catalogId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      catalogId: event.target.value,
                    }))
                  }
                  placeholder='optional catalog ID'
                 aria-label='optional catalog ID' title='optional catalog ID'/>
              </FormField>
              <FormField label='Interval (min)'>
                <Input
                  variant='subtle'
                  size='sm'
                  type='number'
                  min={1}
                  max={24 * 60}
                  value={draft.scheduleIntervalMinutes}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      scheduleIntervalMinutes: Math.max(
                        1,
                        Math.min(24 * 60, Number(event.target.value) || 30)
                      ),
                    }))
                  }
                 aria-label='Interval (min)' title='Interval (min)'/>
              </FormField>
              <FormField label='Batch Size'>
                <Input
                  variant='subtle'
                  size='sm'
                  type='number'
                  min={1}
                  max={500}
                  value={draft.batchSize}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      batchSize: Math.max(1, Math.min(500, Number(event.target.value) || 100)),
                    }))
                  }
                 aria-label='Batch Size' title='Batch Size'/>
              </FormField>
            </div>

            <ToggleRow
              label='Enable scheduled synchronization'
              checked={draft.enabled}
              onCheckedChange={(value: boolean) =>
                setDraft((prev: ProductSyncProfileDraft) => ({
                  ...prev,
                  enabled: value,
                }))
              }
              className='border-none bg-transparent hover:bg-transparent p-0'
            />

            <FormActions
              onSave={(): void => {
                void handleSave();
              }}
              saveText='Save Profile'
              isSaving={isSaving}
              className='justify-start'
            >
              <Button
                type='button'
                variant='secondary'
                onClick={(): void => {
                  void handleRunNow();
                }}
                disabled={runNowMutation.isPending || !selectedProfileId}
              >
                <Play className='mr-2 size-3.5' />
                {runNowMutation.isPending ? 'Queueing...' : 'Run Now'}
              </Button>
              <Button
                type='button'
                variant='secondary'
                onClick={(): void => {
                  void handleBackfill();
                }}
                disabled={relinkMutation.isPending}
              >
                <RefreshCw className='mr-2 size-3.5' />
                {relinkMutation.isPending ? 'Queueing...' : 'Backfill Links'}
              </Button>
              <Button
                type='button'
                variant='destructive'
                onClick={(): void => {
                  void handleDelete();
                }}
                disabled={!selectedProfileId || deleteProfileMutation.isPending}
              >
                <Trash2 className='mr-2 size-3.5' />
                Delete
              </Button>
            </FormActions>
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Field Rules'
        description='Choose which fields sync and the direction for each field.'
        variant='subtle'
        className='p-4'
        actions={
          <Button size='sm' type='button' variant='outline' onClick={addRule}>
            <Plus className='mr-2 size-3.5' />
            Add Rule
          </Button>
        }
      >
        <div className='mt-3 space-y-2'>
          {draft.fieldRules.map((rule: ProductSyncFieldRule) => (
            <div
              key={rule.id}
              className='grid gap-2 rounded-md border border-border/60 bg-card/40 p-2 md:grid-cols-[180px_1fr_180px_auto]'
            >
              <SelectSimple
                variant='subtle'
                size='sm'
                value={rule.appField}
                onValueChange={(value: string): void =>
                  updateRule(rule.id, { appField: value as ProductSyncAppField })
                }
                options={appFieldOptions}
                triggerClassName='w-full'
               ariaLabel='Select option' title='Select option'/>

              <Input
                variant='subtle'
                size='sm'
                value={rule.baseField}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateRule(rule.id, { baseField: event.target.value })
                }
                placeholder='Base field path (e.g. text_fields.name)'
               aria-label='Base field path (e.g. text_fields.name)' title='Base field path (e.g. text_fields.name)'/>

              <SelectSimple
                variant='subtle'
                size='sm'
                value={rule.direction}
                onValueChange={(value: string): void =>
                  updateRule(rule.id, { direction: value as ProductSyncDirection })
                }
                options={directionOptions}
                triggerClassName='w-full'
               ariaLabel='Select option' title='Select option'/>

              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={(): void => removeRule(rule.id)}
                disabled={draft.fieldRules.length <= 1}
                aria-label='Remove synchronization rule'
                title='Remove synchronization rule'
              >
                <Trash2 className='size-4' />
              </Button>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        title='Synchronization History'
        description='Latest sync runs for the selected profile.'
        variant='subtle'
        className='p-4'
      >
        <div className='mt-3'>
          <SimpleSettingsList
            items={runs.map((run) => ({
              id: run.id,
              title: (
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-[11px]'>{run.id}</span>
                  <Badge variant='outline' className='text-[9px] uppercase h-4 px-1'>
                    {run.trigger}
                  </Badge>
                  <Badge variant='outline' className='text-[9px] uppercase h-4 px-1'>
                    {run.status}
                  </Badge>
                </div>
              ),
              description:
                run.summaryMessage || `Processed ${run.stats.processed}/${run.stats.total} items.`,
              subtitle: `${new Date(run.createdAt || 0).toLocaleString()} · success ${run.stats.success} · skipped ${run.stats.skipped} · failed ${run.stats.failed}`,
              original: run,
            }))}
            emptyMessage='No sync runs yet.'
          />
        </div>
      </FormSection>
      <ConfirmationModal />
    </div>
  );
}
