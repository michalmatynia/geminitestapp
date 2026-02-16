'use client';

import { Plus, Play, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import {
  PRODUCT_SYNC_APP_FIELDS,
  PRODUCT_SYNC_DIRECTION_OPTIONS,
} from '@/features/product-sync/types/product-sync';
import type {
  ProductSyncAppField,
  ProductSyncDirection,
  ProductSyncFieldRule,
  ProductSyncProfile,
} from '@/features/product-sync/types/product-sync';
import {
  useCreateProductSyncProfileMutation,
  useDeleteProductSyncProfileMutation,
  useProductSyncProfiles,
  useProductSyncRuns,
  useRelinkBaseProductsMutation,
  useRunProductSyncProfileMutation,
  useUpdateProductSyncProfileMutation,
} from '@/features/product-sync/hooks/useProductSyncSettings';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  SelectSimple,
  useToast,
} from '@/shared/ui';

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

const makeRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const defaultDraft = (connectionId = ''): ProductSyncProfileDraft => ({
  name: 'Base Product Sync',
  enabled: true,
  connectionId,
  inventoryId: '',
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

  const profilesQuery = useProductSyncProfiles();
  const createProfileMutation = useCreateProductSyncProfileMutation();
  const updateProfileMutation = useUpdateProductSyncProfileMutation();
  const deleteProfileMutation = useDeleteProductSyncProfileMutation();
  const runNowMutation = useRunProductSyncProfileMutation();
  const relinkMutation = useRelinkBaseProductsMutation();
  const integrationsQuery = useIntegrationsWithConnections();

  const profiles = profilesQuery.data ?? [];
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [draft, setDraft] = useState<ProductSyncProfileDraft>(defaultDraft());

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

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileId('');
      setDraft(defaultDraft(baseConnections[0]?.id ?? ''));
      return;
    }

    const selected = profiles.find((profile: ProductSyncProfile) => profile.id === selectedProfileId);
    if (selected) {
      setDraft(profileToDraft(selected));
      return;
    }

    const first = profiles[0];
    if (!first) {
      setSelectedProfileId('');
      setDraft(defaultDraft(baseConnections[0]?.id ?? ''));
      return;
    }
    setSelectedProfileId(first.id);
    setDraft(profileToDraft(first));
  }, [profiles, selectedProfileId, baseConnections]);

  const isSaving =
    createProfileMutation.isPending || updateProfileMutation.isPending;

  const handleNewProfile = (): void => {
    setSelectedProfileId('');
    setDraft(defaultDraft(baseConnections[0]?.id ?? ''));
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

    const payload: Partial<ProductSyncProfile> = {
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
          data: payload,
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
      toast(error instanceof Error ? error.message : 'Failed to save profile.', {
        variant: 'error',
      });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedProfileId) return;
    if (!confirm('Delete this sync profile?')) return;

    try {
      await deleteProfileMutation.mutateAsync(selectedProfileId);
      toast('Sync profile deleted.', { variant: 'success' });
      setSelectedProfileId('');
      setDraft(defaultDraft(baseConnections[0]?.id ?? ''));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete profile.', {
        variant: 'error',
      });
    }
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
      const payload: {
        connectionId?: string;
        inventoryId?: string;
        catalogId?: string | null;
      } = {
        ...(connectionId ? { connectionId } : {}),
        ...(inventoryId ? { inventoryId } : {}),
        ...(catalogId ? { catalogId } : { catalogId: null }),
      };

      const result = await relinkMutation.mutateAsync(payload);
      toast(`Backfill queued (${result.jobId}).`, { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to queue backfill.', {
        variant: 'error',
      });
    }
  };

  const updateRule = (
    id: string,
    patch: Partial<ProductSyncFieldRule>
  ): void => {
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
      <div className='rounded-md border border-border/60 bg-card/30 p-4'>
        <h3 className='text-sm font-semibold text-white'>Profile</h3>
        <p className='mt-1 text-xs text-gray-400'>
          Configure scheduled field-level sync between your products and Base.com.
        </p>

        <div className='mt-4 grid gap-3 md:grid-cols-[240px_1fr]'>
          <div className='space-y-2 rounded-md border border-border/60 bg-card/40 p-2'>
            {profiles.map((profile: ProductSyncProfile) => (
              <Button size='xs'
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
            <Button size='xs'
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
              <div>
                <Label className='text-xs text-gray-400'>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className='mt-1'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Base Connection</Label>
                <SelectSimple
                  size='sm'
                  value={draft.connectionId || '__none__'}
                  onValueChange={(value: string): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      connectionId: value === '__none__' ? '' : value,
                    }))
                  }
                  options={[
                    { value: '__none__', label: 'Select connection...' },
                    ...baseConnections.map((connection) => ({
                      value: connection.id,
                      label: connection.name,
                    })),
                  ]}
                  triggerClassName='mt-1 w-full'
                />
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-4'>
              <div>
                <Label className='text-xs text-gray-400'>Inventory ID</Label>
                <Input
                  value={draft.inventoryId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      inventoryId: event.target.value,
                    }))
                  }
                  className='mt-1'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Catalog Filter</Label>
                <Input
                  value={draft.catalogId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      catalogId: event.target.value,
                    }))
                  }
                  placeholder='optional catalog ID'
                  className='mt-1'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Interval (minutes)</Label>
                <Input
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
                  className='mt-1'
                />
              </div>
              <div>
                <Label className='text-xs text-gray-400'>Batch Size</Label>
                <Input
                  type='number'
                  min={1}
                  max={500}
                  value={draft.batchSize}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                    setDraft((prev: ProductSyncProfileDraft) => ({
                      ...prev,
                      batchSize: Math.max(
                        1,
                        Math.min(500, Number(event.target.value) || 100)
                      ),
                    }))
                  }
                  className='mt-1'
                />
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Checkbox
                id='product-sync-enabled'
                checked={draft.enabled}
                onCheckedChange={(value: boolean | 'indeterminate'): void =>
                  setDraft((prev: ProductSyncProfileDraft) => ({
                    ...prev,
                    enabled: Boolean(value),
                  }))
                }
              />
              <Label htmlFor='product-sync-enabled' className='text-sm text-gray-200'>
                Enable scheduled synchronization
              </Label>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                onClick={(): void => {
                  void handleSave();
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
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
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-md border border-border/60 bg-card/30 p-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-sm font-semibold text-white'>Field Rules</h3>
            <p className='mt-1 text-xs text-gray-400'>
              Choose which fields sync and the direction for each field.
            </p>
          </div>
          <Button size='xs' type='button' variant='secondary' onClick={addRule}>
            <Plus className='mr-2 size-3.5' />
            Add Rule
          </Button>
        </div>

        <div className='mt-3 space-y-2'>
          {draft.fieldRules.map((rule: ProductSyncFieldRule) => (
            <div
              key={rule.id}
              className='grid gap-2 rounded-md border border-border/60 bg-card/40 p-2 md:grid-cols-[180px_1fr_180px_auto]'
            >
              <SelectSimple
                size='sm'
                value={rule.appField}
                onValueChange={(value: string): void =>
                  updateRule(rule.id, { appField: value as ProductSyncAppField })
                }
                options={PRODUCT_SYNC_APP_FIELDS.map((field: ProductSyncAppField) => ({
                  value: field,
                  label: appFieldLabel(field),
                }))}
                triggerClassName='w-full'
              />

              <Input
                value={rule.baseField}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  updateRule(rule.id, { baseField: event.target.value })
                }
                placeholder='Base field path (e.g. text_fields.name)'
              />

              <SelectSimple
                size='sm'
                value={rule.direction}
                onValueChange={(value: string): void =>
                  updateRule(rule.id, { direction: value as ProductSyncDirection })
                }
                options={PRODUCT_SYNC_DIRECTION_OPTIONS.map((direction: ProductSyncDirection) => ({
                  value: direction,
                  label: directionLabel(direction),
                }))}
                triggerClassName='w-full'
              />

              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={(): void => removeRule(rule.id)}
                disabled={draft.fieldRules.length <= 1}
              >
                <Trash2 className='size-4' />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className='rounded-md border border-border/60 bg-card/30 p-4'>
        <h3 className='text-sm font-semibold text-white'>Synchronization History</h3>
        <p className='mt-1 text-xs text-gray-400'>
          Latest sync runs for the selected profile.
        </p>

        <div className='mt-3 space-y-2'>
          {runs.length === 0 ? (
            <p className='text-xs text-gray-500'>No sync runs yet.</p>
          ) : (
            runs.map((run) => (
              <div key={run.id} className='rounded-md border border-border/60 bg-card/40 p-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='text-xs text-gray-300'>
                    <span className='font-mono text-[11px]'>{run.id}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {run.trigger}
                    </Badge>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {run.status}
                    </Badge>
                  </div>
                </div>
                <p className='mt-2 text-xs text-gray-400'>
                  {run.summaryMessage ||
                    `Processed ${run.stats.processed}/${run.stats.total} items.`}
                </p>
                <p className='mt-1 text-[11px] text-gray-500'>
                  {new Date(run.createdAt).toLocaleString()} · success {run.stats.success} · skipped {run.stats.skipped} · failed {run.stats.failed}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
