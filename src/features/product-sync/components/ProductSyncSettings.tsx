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
} from '@/features/product-sync/hooks/useProductSyncSettings';
import { usePriceGroups } from '@/features/products/hooks/useProductSettingsQueries';
import type { BaseDefaultConnectionPreferenceResponse } from '@/shared/contracts/integrations/preferences';
import type { BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import {
  findDuplicateProductSyncAppField,
  getProductSyncBaseFieldOptions,
  PRODUCT_SYNC_APP_FIELDS,
  PRODUCT_SYNC_BASE_FIELD_PATTERN_HINTS_BY_APP_FIELD,
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
  useBaseWarehouses,
  useDefaultExportConnection,
  useDefaultExportInventory,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import { api } from '@/shared/lib/api-client';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';
import {
  SelectSimple,
  FormSection,
  FormField,
  ToggleRow,
  FormActions,
} from '@/shared/ui/forms-and-actions.public';
import type { SelectSimpleOption } from '@/shared/ui/forms-and-actions.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type ProductSyncProfileDraft = {
  name: string;
  isDefault: boolean;
  enabled: boolean;
  connectionId: string;
  inventoryId: string;
  catalogId: string;
  scheduleIntervalMinutes: number;
  batchSize: number;
  fieldRules: ProductSyncFieldRule[];
};

type ProductSyncDraftDefaults = {
  isDefault?: boolean;
  connectionId?: string;
  inventoryId?: string;
};

const EMPTY_PROFILES: ProductSyncProfile[] = [];

const BASE_CONNECTION_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select connection...',
};

const CUSTOM_BASE_FIELD_OPTION_VALUE = '__custom__';

const makeRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const defaultDraft = ({
  isDefault = false,
  connectionId = '',
  inventoryId = '',
}: ProductSyncDraftDefaults = {}): ProductSyncProfileDraft => ({
  name: 'Base Product Sync',
  isDefault,
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
  isDefault: profile.isDefault,
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

const areStringSetsEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

const buildWarehouseStockBaseFieldOptions = (
  warehouses: BaseWarehouse[]
): SelectSimpleOption[] => {
  const seen = new Set<string>();
  const options: SelectSimpleOption[] = [];

  warehouses.forEach((warehouse: BaseWarehouse) => {
    const warehouseId = warehouse.id.trim();
    if (!warehouseId) return;
    const typedId = warehouse.typedId?.trim() ?? '';
    const inInventorySuffix = warehouse.is_default ? ' · default' : '';
    const addOption = (value: string, label: string, description: string): void => {
      const normalizedValue = value.trim();
      if (!normalizedValue || seen.has(normalizedValue)) return;
      seen.add(normalizedValue);
      options.push({
        value: normalizedValue,
        label,
        description,
        group: 'Inventory warehouses',
      });
    };

    addOption(
      `stock.${warehouseId}`,
      `${warehouse.name} (${warehouseId})`,
      `Warehouse-specific stock path.${inInventorySuffix}`
    );

    if (typedId && typedId !== warehouseId) {
      addOption(
        `stock.${typedId}`,
        `${warehouse.name} (${typedId})`,
        `Typed warehouse stock path.${inInventorySuffix}`
      );
    }
  });

  return options;
};

const buildPriceGroupBaseFieldOptions = (priceGroups: PriceGroup[]): SelectSimpleOption[] => {
  const seen = new Set<string>();
  const options: SelectSimpleOption[] = [];

  priceGroups.forEach((priceGroup: PriceGroup) => {
    const groupKey = (priceGroup.groupId || priceGroup.id || '').trim();
    if (!groupKey) return;
    const value = `prices.${groupKey}`;
    if (seen.has(value)) return;
    seen.add(value);
    options.push({
      value,
      label: `${priceGroup.name} (${groupKey})`,
      description: `${priceGroup.currencyCode} price group${priceGroup.isDefault ? ' · default' : ''}`,
      group: 'Catalog price groups',
    });
  });

  return options;
};

const buildBaseFieldOptions = (
  input: {
    knownOptions: SelectSimpleOption[];
    customHints: Array<{ value: string }>;
    currentValue: string;
    isCustomMode: boolean;
  }
): SelectSimpleOption[] => {
  const trimmedBaseField = input.currentValue.trim();
  const customDescriptionParts: string[] = [];

  if (input.isCustomMode && trimmedBaseField) {
    customDescriptionParts.push(`Current: ${trimmedBaseField}`);
  }
  if (input.customHints.length > 0) {
    customDescriptionParts.push(
      `Patterns: ${input.customHints.map((hint) => hint.value).join(', ')}`
    );
  }

  return [
    ...input.knownOptions,
    {
      value: CUSTOM_BASE_FIELD_OPTION_VALUE,
      label: 'Custom path',
      group: 'Custom',
      description:
        customDescriptionParts.join(' · ') || 'Use a custom Base.com field path.',
    },
  ];
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
  const [isCreatingNewProfile, setIsCreatingNewProfile] = useState(false);
  const [draft, setDraft] = useState<ProductSyncProfileDraft>(defaultDraft());
  const [customBaseFieldRuleIds, setCustomBaseFieldRuleIds] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [applyingConnectionDefaults, setApplyingConnectionDefaults] = useState(false);

  const runsQuery = useProductSyncRuns(selectedProfileId || null, 50);
  const runs = runsQuery.data ?? [];
  const priceGroupsQuery = usePriceGroups({ enabled: true });
  const priceGroupBaseFieldOptions = useMemo(
    (): SelectSimpleOption[] => buildPriceGroupBaseFieldOptions(priceGroupsQuery.data ?? []),
    [priceGroupsQuery.data]
  );
  const warehousesQuery = useBaseWarehouses(
    draft.connectionId.trim(),
    draft.inventoryId.trim(),
    true,
    Boolean(draft.connectionId.trim() && draft.inventoryId.trim())
  );
  const warehouseBaseFieldOptions = useMemo((): SelectSimpleOption[] => {
    const response = warehousesQuery.data;
    const records = [
      ...(Array.isArray(response?.warehouses) ? response.warehouses : []),
      ...(Array.isArray(response?.allWarehouses) ? response.allWarehouses : []),
    ];
    const seenWarehouseIds = new Set<string>();
    const mergedWarehouses = records.filter((warehouse: BaseWarehouse) => {
      const key = `${warehouse.id.trim()}::${warehouse.typedId?.trim() ?? ''}`;
      if (!warehouse.id.trim() || seenWarehouseIds.has(key)) return false;
      seenWarehouseIds.add(key);
      return true;
    });
    return buildWarehouseStockBaseFieldOptions(mergedWarehouses);
  }, [warehousesQuery.data]);

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
  const directionOptions = useMemo(
    (): Array<LabeledOptionDto<ProductSyncDirection>> =>
      PRODUCT_SYNC_DIRECTION_OPTIONS.map((direction: ProductSyncDirection) => ({
        value: direction,
        label: directionLabel(direction),
      })),
    []
  );
  const getKnownBaseFieldOptions = (appField: ProductSyncAppField): SelectSimpleOption[] => {
    if (appField === 'stock' && warehouseBaseFieldOptions.length > 0) {
      return [...getProductSyncBaseFieldOptions(appField), ...warehouseBaseFieldOptions];
    }
    if (appField === 'price' && priceGroupBaseFieldOptions.length > 0) {
      return [...getProductSyncBaseFieldOptions(appField), ...priceGroupBaseFieldOptions];
    }
    return getProductSyncBaseFieldOptions(appField);
  };
  const isKnownBaseFieldForRule = (rule: ProductSyncFieldRule): boolean => {
    const normalizedValue = rule.baseField.trim();
    if (!normalizedValue) return false;
    return getKnownBaseFieldOptions(rule.appField).some(
      (option) => option.value === normalizedValue
    );
  };
  const getDefaultBaseFieldForAppField = (appField: ProductSyncAppField): string => {
    return getKnownBaseFieldOptions(appField)[0]?.value ?? '';
  };
  const getAppFieldOptionsForRule = (
    currentRuleId: string,
    currentAppField: ProductSyncAppField
  ): Array<LabeledOptionDto<ProductSyncAppField>> =>
    PRODUCT_SYNC_APP_FIELDS.map((field: ProductSyncAppField) => ({
      value: field,
      label: appFieldLabel(field),
      disabled:
        field !== currentAppField &&
        draft.fieldRules.some(
          (rule: ProductSyncFieldRule) => rule.id !== currentRuleId && rule.appField === field
        ),
    }));
  const getUnusedAppField = (): ProductSyncAppField | null =>
    PRODUCT_SYNC_APP_FIELDS.find(
      (field: ProductSyncAppField) =>
        !draft.fieldRules.some((rule: ProductSyncFieldRule) => rule.appField === field)
    ) ?? null;
  const hasUnusedAppField = getUnusedAppField() !== null;

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
      isDefault: profiles.length === 0,
      connectionId: preferredConnectionId,
      inventoryId: preferredInventoryId,
    }),
    [preferredConnectionId, preferredInventoryId, profiles.length]
  );

  useEffect(() => {
    if (isCreatingNewProfile) return;

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
  }, [profiles, selectedProfileId, newProfileDefaults, isCreatingNewProfile]);

  useEffect(() => {
    setCustomBaseFieldRuleIds((previous) => {
      const next = new Set<string>();
      draft.fieldRules.forEach((rule: ProductSyncFieldRule) => {
        if (previous.has(rule.id) || !isKnownBaseFieldForRule(rule)) {
          next.add(rule.id);
        }
      });
      return areStringSetsEqual(previous, next) ? previous : next;
    });
  }, [draft.fieldRules]);

  const isSaving = createProfileMutation.isPending || updateProfileMutation.isPending;

  const handleNewProfile = (): void => {
    setSelectedProfileId('');
    setIsCreatingNewProfile(true);
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

    const normalizedFieldRules = draft.fieldRules.map((rule: ProductSyncFieldRule) => ({
      ...rule,
      baseField: rule.baseField.trim(),
    }));
    const invalidRule = normalizedFieldRules.find(
      (rule: ProductSyncFieldRule) => !rule.baseField
    );
    if (invalidRule) {
      toast(`Base field is required for ${appFieldLabel(invalidRule.appField)}.`, {
        variant: 'error',
      });
      return;
    }
    const duplicateAppField = findDuplicateProductSyncAppField(normalizedFieldRules);
    if (duplicateAppField) {
      toast(`Only one sync rule is allowed for ${appFieldLabel(duplicateAppField)}.`, {
        variant: 'error',
      });
      return;
    }

    const payload: ProductSyncProfileCreatePayload = {
      name: draft.name.trim() || 'Base Product Sync',
      isDefault: draft.isDefault,
      enabled: draft.enabled,
      connectionId: draft.connectionId.trim(),
      inventoryId: draft.inventoryId.trim(),
      catalogId: draft.catalogId.trim() || null,
      scheduleIntervalMinutes: draft.scheduleIntervalMinutes,
      batchSize: draft.batchSize,
      fieldRules: normalizedFieldRules,
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
      setIsCreatingNewProfile(false);
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
          setIsCreatingNewProfile(false);
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

  const setCustomBaseFieldMode = (id: string, enabled: boolean): void => {
    setCustomBaseFieldRuleIds((previous) => {
      const next = new Set(previous);
      if (enabled) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return areStringSetsEqual(previous, next) ? previous : next;
    });
  };

  const handleAppFieldChange = (rule: ProductSyncFieldRule, value: string): void => {
    const nextAppField = value as ProductSyncAppField;
    if (
      draft.fieldRules.some(
        (candidate: ProductSyncFieldRule) =>
          candidate.id !== rule.id && candidate.appField === nextAppField
      )
    ) {
      toast(`Only one sync rule is allowed for ${appFieldLabel(nextAppField)}.`, {
        variant: 'error',
      });
      return;
    }
    setCustomBaseFieldMode(rule.id, false);
    updateRule(rule.id, {
      appField: nextAppField,
      baseField: getDefaultBaseFieldForAppField(nextAppField),
    });
  };

  const handleBaseFieldSelectChange = (rule: ProductSyncFieldRule, value: string): void => {
    if (value === CUSTOM_BASE_FIELD_OPTION_VALUE) {
      setCustomBaseFieldMode(rule.id, true);
      return;
    }
    setCustomBaseFieldMode(rule.id, false);
    updateRule(rule.id, { baseField: value });
  };

  const addRule = (): void => {
    const nextAppField = getUnusedAppField();
    if (!nextAppField) {
      toast('All app fields already have synchronization rules.', { variant: 'info' });
      return;
    }
    setDraft((prev: ProductSyncProfileDraft) => ({
      ...prev,
      fieldRules: [
        ...prev.fieldRules,
        {
          id: makeRuleId(),
          appField: nextAppField,
          baseField: getDefaultBaseFieldForAppField(nextAppField),
          direction: 'disabled',
        },
      ],
    }));
  };

  const removeRule = (id: string): void => {
    setCustomBaseFieldRuleIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
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
                onClick={(): void => {
                  setIsCreatingNewProfile(false);
                  setSelectedProfileId(profile.id);
                }}
                className={`w-full justify-start text-xs ${
                  selectedProfileId === profile.id
                    ? 'bg-gray-800 text-white hover:bg-gray-800'
                    : 'text-gray-300 hover:bg-muted/40'
                }`}
              >
                <span className='truncate'>{profile.name}</span>
                {profile.isDefault && (
                  <Badge variant='outline' className='ml-auto text-[9px] uppercase h-4 px-1'>
                    BL modal
                  </Badge>
                )}
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
              label='Use this profile in the BL modal and manual Base.com sync'
              checked={draft.isDefault}
              onCheckedChange={(value: boolean) =>
                setDraft((prev: ProductSyncProfileDraft) => ({
                  ...prev,
                  isDefault: value,
                }))
              }
              className='border-none bg-transparent hover:bg-transparent p-0'
            />

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
          <Button
            size='sm'
            type='button'
            variant='outline'
            onClick={addRule}
            disabled={!hasUnusedAppField}
          >
            <Plus className='mr-2 size-3.5' />
            Add Rule
          </Button>
        }
      >
        <div className='mt-3 space-y-2'>
          {(warehousesQuery.isLoading ||
            warehouseBaseFieldOptions.length > 0 ||
            priceGroupsQuery.isLoading ||
            priceGroupBaseFieldOptions.length > 0) && (
            <p className='text-[11px] text-gray-500'>
              {warehousesQuery.isLoading
                ? 'Loading inventory warehouse stock targets...'
                : priceGroupsQuery.isLoading
                  ? 'Loading catalog price-group targets...'
                  : `${[
                      warehouseBaseFieldOptions.length > 0
                        ? `${warehouseBaseFieldOptions.length} warehouse stock target${
                            warehouseBaseFieldOptions.length === 1 ? '' : 's'
                          }`
                        : null,
                      priceGroupBaseFieldOptions.length > 0
                        ? `${priceGroupBaseFieldOptions.length} price-group target${
                            priceGroupBaseFieldOptions.length === 1 ? '' : 's'
                          }`
                        : null,
                    ]
                      .filter((value): value is string => Boolean(value))
                      .join(' loaded, ')  } loaded.`}
            </p>
          )}
          {draft.fieldRules.map((rule: ProductSyncFieldRule) => (
            <div key={rule.id} className='space-y-2 rounded-md border border-border/60 bg-card/40 p-2'>
              <div className='grid gap-2 md:grid-cols-[180px_1fr_180px_auto]'>
                <SelectSimple
                  variant='subtle'
                  size='sm'
                  value={rule.appField}
                  onValueChange={(value: string): void => handleAppFieldChange(rule, value)}
                  options={getAppFieldOptionsForRule(rule.id, rule.appField)}
                  triggerClassName='w-full'
                  ariaLabel={`App field for sync rule ${rule.id}`}
                  title={`App field for ${appFieldLabel(rule.appField)}`}
                />

                <SelectSimple
                  variant='subtle'
                  size='sm'
                  value={
                    customBaseFieldRuleIds.has(rule.id) ||
                    !isKnownBaseFieldForRule(rule)
                      ? CUSTOM_BASE_FIELD_OPTION_VALUE
                      : rule.baseField
                  }
                  onValueChange={(value: string): void => handleBaseFieldSelectChange(rule, value)}
                  options={buildBaseFieldOptions({
                    knownOptions: getKnownBaseFieldOptions(rule.appField),
                    customHints: PRODUCT_SYNC_BASE_FIELD_PATTERN_HINTS_BY_APP_FIELD[rule.appField],
                    currentValue: rule.baseField,
                    isCustomMode:
                      customBaseFieldRuleIds.has(rule.id) || !isKnownBaseFieldForRule(rule),
                  })}
                  triggerClassName='w-full'
                  ariaLabel={`Base field for ${appFieldLabel(rule.appField)}`}
                  title={`Base field for ${appFieldLabel(rule.appField)}`}
                />

                <SelectSimple
                  variant='subtle'
                  size='sm'
                  value={rule.direction}
                  onValueChange={(value: string): void =>
                    updateRule(rule.id, { direction: value as ProductSyncDirection })
                  }
                  options={directionOptions}
                  triggerClassName='w-full'
                  ariaLabel={`Direction for ${appFieldLabel(rule.appField)}`}
                  title={`Direction for ${appFieldLabel(rule.appField)}`}
                />

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

              {(customBaseFieldRuleIds.has(rule.id) ||
                !isKnownBaseFieldForRule(rule)) && (
                <div className='grid gap-2 md:grid-cols-[180px_1fr_180px_auto]'>
                  <div className='hidden md:block' />
                  <div className='space-y-1 md:col-span-2'>
                    <Input
                      variant='subtle'
                      size='sm'
                      value={rule.baseField}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                        updateRule(rule.id, { baseField: event.target.value })
                      }
                      placeholder='Custom Base field path'
                      aria-label={`Custom Base field path for ${appFieldLabel(rule.appField)}`}
                      title={`Custom Base field path for ${appFieldLabel(rule.appField)}`}
                    />
                    {PRODUCT_SYNC_BASE_FIELD_PATTERN_HINTS_BY_APP_FIELD[rule.appField].length > 0 && (
                      <p className='px-1 text-[11px] text-gray-500'>
                        Common patterns:{' '}
                        {PRODUCT_SYNC_BASE_FIELD_PATTERN_HINTS_BY_APP_FIELD[rule.appField].map(
                          (hint, index) => (
                            <span key={hint.value}>
                              {index > 0 ? ', ' : ''}
                              <code className='rounded bg-black/20 px-1 py-0.5 text-[10px]'>
                                {hint.value}
                              </code>
                            </span>
                          )
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
