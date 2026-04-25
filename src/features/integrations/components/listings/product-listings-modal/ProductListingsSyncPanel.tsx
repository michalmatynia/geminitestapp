'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Play, X } from 'lucide-react';
import React from 'react';

import { useProductBaseSyncPreview, useRunProductBaseSyncMutation } from '@/features/product-sync/hooks/useProductBaseSync';
import { useProductSyncProfiles } from '@/features/product-sync/hooks/useProductSyncSettings';
import { usePriceGroups } from '@/features/products/hooks/useProductSettingsQueries';
import {
  useProductListingsData,
  useProductListingsModals,
  useProductListingsUIState,
} from '@/features/integrations/context/ProductListingsContext';
import {
  useBaseInventories,
  useBaseWarehouses,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type {
  ProductSyncFieldRule,
  ProductSyncDirection,
  ProductSyncFieldPreview,
  ProductSyncPreview,
  ProductSyncPreviewValue,
  ProductSyncProfile,
  ProductSyncSingleProductResult,
  ProductSyncTargetSource,
} from '@/shared/contracts/product-sync';
import {
  buildEffectiveProductSyncFieldRules,
  getProductSyncAppFieldLabel,
  getProductSyncBaseFieldPresentation,
} from '@/shared/contracts/product-sync';
import type { BaseImportWarehousesResponse } from '@/shared/contracts/integrations';
import type { BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { BaseInventory } from '@/shared/contracts/integrations/base-com';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import {
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { cn } from '@/shared/utils/ui-utils';

const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const directionLabel = (direction: ProductSyncDirection): string => {
  if (direction === 'app_to_base') return 'App -> Base';
  if (direction === 'base_to_app') return 'Base -> App';
  return 'Disabled';
};

const directionIcon = (direction: ProductSyncDirection): React.JSX.Element => {
  if (direction === 'app_to_base') return <ArrowRight className='size-3 text-blue-400' />;
  if (direction === 'base_to_app') return <ArrowLeft className='size-3 text-purple-400' />;
  return <X className='size-3 text-gray-500' />;
};

const formatFieldValue = (value: ProductSyncPreviewValue, appField: string): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (appField === 'price') return value.toFixed(2);
    return `${value}`;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) return '—';
  return normalizedValue;
};

const renderFieldActionHint = (field: ProductSyncFieldPreview): string | null => {
  if (field.willWriteToApp) {
    if (field.baseValue === null) {
      return 'Next sync clears the app value because Base.com is blank.';
    }
    return 'Next sync writes Base.com value into the app.';
  }
  if (field.willWriteToBase) {
    if (field.appValue === null) {
      return 'Next sync clears the Base.com value because the app field is blank.';
    }
    return 'Next sync pushes the app value to Base.com.';
  }
  if (field.hasDifference && field.direction === 'disabled') {
    return 'Values differ, but this field is disabled in the active sync profile.';
  }
  return null;
};

const resolveSyncToastMessage = (
  localChanges: string[],
  baseChanges: string[],
  message: string | null
): string => {
  if (localChanges.length === 0 && baseChanges.length === 0) {
    return message ?? 'No field changes detected.';
  }

  const parts: string[] = [];
  if (localChanges.length > 0) parts.push(`${localChanges.length} app update(s)`);
  if (baseChanges.length > 0) parts.push(`${baseChanges.length} Base.com update(s)`);
  return `Synchronization completed: ${parts.join(', ')}.`;
};

const formatLastRunAt = (value: string | null | undefined): string => {
  const normalizedValue = (value ?? '').trim();
  if (!normalizedValue) return 'Never';

  const timestamp = Date.parse(normalizedValue);
  if (!Number.isFinite(timestamp)) return normalizedValue;

  return new Date(timestamp).toLocaleString();
};

const resolveConnectionLabel = (
  connectionId: string,
  connectionName: string | null | undefined
): { primary: string; secondary: string | null } => {
  const normalizedName = (connectionName ?? '').trim();
  const normalizedId = connectionId.trim();

  if (!normalizedName) {
    return {
      primary: normalizedId,
      secondary: null,
    };
  }

  return {
    primary: normalizedName,
    secondary: normalizedName === normalizedId ? null : normalizedId,
  };
};

const resolveTargetSourceLabel = (source: ProductSyncTargetSource): string | null => {
  if (source === 'product') return 'Saved Link';
  if (source === 'listing') return 'Listing Link';
  if (source === 'sku_backfill') return 'Import SKU';
  return null;
};

const GLOBAL_SYNC_SETTINGS_HREF = '/admin/integrations/aggregators/base-com/synchronization-engine';

const renderTargetSourceHint = (source: ProductSyncTargetSource): string | null => {
  if (source === 'listing') {
    return 'Target resolved from an existing Base listing link. The first successful sync will save the Base ID on this product.';
  }
  if (source === 'sku_backfill') {
    return 'Target resolved from the product SKU in the active Base inventory. The first successful sync will save the Base ID and Base listing link locally.';
  }
  return null;
};

const buildConfiguredWarehouseLabelMap = (
  response: BaseImportWarehousesResponse | undefined
): Map<string, string> => {
  const map = new Map<string, string>();
  const records = [
    ...(Array.isArray(response?.warehouses) ? response.warehouses : []),
    ...(Array.isArray(response?.allWarehouses) ? response.allWarehouses : []),
  ];

  records.forEach((warehouse: BaseWarehouse) => {
    const id = warehouse.id.trim();
    const typedId = warehouse.typedId?.trim() ?? '';
    if (id && !map.has(id)) {
      map.set(id, `${warehouse.name} (${id})`);
    }
    if (typedId && !map.has(typedId)) {
      map.set(typedId, `${warehouse.name} (${typedId})`);
    }
  });

  return map;
};

const buildConfiguredPriceGroupLabelMap = (priceGroups: PriceGroup[]): Map<string, string> => {
  const map = new Map<string, string>();
  priceGroups.forEach((priceGroup: PriceGroup) => {
    const identifier = (priceGroup.groupId || priceGroup.id || '').trim();
    if (!identifier || map.has(identifier)) return;
    map.set(identifier, `${priceGroup.name} (${identifier})`);
  });
  return map;
};

const resolveInventoryLabel = (
  inventoryId: string,
  inventories: BaseInventory[]
): { primary: string; secondary: string | null } => {
  const normalizedInventoryId = inventoryId.trim();
  const inventory = inventories.find((item: BaseInventory) => item.id === normalizedInventoryId);
  const normalizedName = inventory?.name?.trim() ?? '';

  if (!normalizedName) {
    return {
      primary: normalizedInventoryId,
      secondary: null,
    };
  }

  return {
    primary: normalizedName,
    secondary: normalizedName === normalizedInventoryId ? null : normalizedInventoryId,
  };
};

const resolveConfiguredBaseFieldLabel = (
  rule: ProductSyncFieldRule,
  warehouseLabels: Map<string, string>,
  priceGroupLabels: Map<string, string>
): string => {
  const normalizedBaseField = rule.baseField.trim();
  if (rule.appField === 'stock' && normalizedBaseField.startsWith('stock.')) {
    const identifier = normalizedBaseField.slice('stock.'.length).trim();
    if (identifier && warehouseLabels.has(identifier)) {
      return warehouseLabels.get(identifier) ?? identifier;
    }
  }
  if (rule.appField === 'price' && normalizedBaseField.startsWith('prices.')) {
    const identifier = normalizedBaseField.slice('prices.'.length).trim();
    if (identifier && priceGroupLabels.has(identifier)) {
      return priceGroupLabels.get(identifier) ?? identifier;
    }
  }
  return getProductSyncBaseFieldPresentation(rule.appField, rule.baseField).label;
};

const resolveSyncDisabledHint = (
  preview: ProductSyncPreview,
  syncableFieldCount: number,
  enabledOutOfSyncFieldCount: number,
  disabledOutOfSyncFieldCount: number
): string | null => {
  if (!preview.canSync) {
    return preview.disabledReason ?? 'Base.com sync is not available for this product.';
  }
  if (enabledOutOfSyncFieldCount === 0) {
    if (disabledOutOfSyncFieldCount > 0) {
      return 'No enabled fields are currently out of sync. Disabled field differences are ignored by this profile.';
    }
    return 'No enabled fields are currently out of sync.';
  }
  if (syncableFieldCount === 0) {
    return 'No enabled out-of-sync fields can be synced with the active sync profile.';
  }
  return null;
};

type LastManualSyncSummary = {
  result: ProductSyncSingleProductResult;
  localChangeLabels: string[];
  baseChangeLabels: string[];
  recordedAt: string;
};

const resolveLocalChangeLabel = (
  change: string,
  fields: ProductSyncFieldPreview[]
): string => {
  if (change === 'baseProductId') {
    return 'Base product link';
  }

  return (
    fields.find((field: ProductSyncFieldPreview) => field.appField === change)?.appFieldLabel ??
    change
  );
};

const resolveBaseChangeLabel = (
  change: string,
  fields: ProductSyncFieldPreview[]
): string =>
  fields.find((field: ProductSyncFieldPreview) => field.baseField === change)?.baseFieldLabel ??
  change;

const summarizeManualSyncResult = (result: ProductSyncSingleProductResult): string => {
  if (result.errorMessage) return result.errorMessage;
  if (result.message) return result.message;
  if (result.localChanges.length === 0 && result.baseChanges.length === 0) {
    return 'No field changes were needed.';
  }
  return resolveSyncToastMessage(result.localChanges, result.baseChanges, result.message);
};

export function ProductListingsSyncPanel(): React.JSX.Element {
  const { toast } = useToast();
  const { product, listings } = useProductListingsData();
  const { syncingImages } = useProductListingsUIState();
  const { setIsSyncImagesConfirmOpen } = useProductListingsModals();
  const profilesQuery = useProductSyncProfiles();
  const integrationsQuery = useIntegrationsWithConnections();
  const previewQuery = useProductBaseSyncPreview(product.id, { enabled: false });
  const runSyncMutation = useRunProductBaseSyncMutation();
  const [hasChecked, setHasChecked] = React.useState(false);
  const [checkedPreview, setCheckedPreview] = React.useState<ProductSyncPreview | null>(null);
  const [lastRunSummary, setLastRunSummary] = React.useState<LastManualSyncSummary | null>(null);

  const baseListing = listings.find((listing) =>
    ['baselinker', 'base-com', 'base'].includes(normalizeIntegrationSlug(listing.integration.slug))
  );
  const normalizedBaseListingStatus = (baseListing?.status ?? '').trim().toLowerCase();
  const isBaseListingExportBusy = [
    'queued',
    'queued_relist',
    'running',
    'processing',
    'pending',
    'in_progress',
  ].includes(normalizedBaseListingStatus);

  React.useEffect(() => {
    setHasChecked(false);
    setCheckedPreview(null);
    setLastRunSummary(null);
  }, [product.id]);

  const preview = hasChecked ? checkedPreview : null;
  const isCheckingPreview = previewQuery.isFetching === true;
  const isLoadingPreview =
    hasChecked && !preview && (previewQuery.isLoading === true || isCheckingPreview);
  const outOfSyncFields =
    preview?.fields.filter((field: ProductSyncFieldPreview) => field.hasDifference) ?? [];
  const enabledOutOfSyncFields = outOfSyncFields.filter(
    (field: ProductSyncFieldPreview) => field.direction !== 'disabled'
  );
  const disabledOutOfSyncFields = outOfSyncFields.filter(
    (field: ProductSyncFieldPreview) => field.direction === 'disabled'
  );
  const visibleFields =
    preview?.fields.filter(
      (field: ProductSyncFieldPreview) => field.willWriteToApp || field.willWriteToBase
    ) ?? [];
  const activeFieldCount =
    preview?.fields.filter((field: ProductSyncFieldPreview) => field.direction !== 'disabled')
      .length ?? 0;
  const syncableFieldCount = visibleFields.length;
  const imageLinkCount = Array.isArray(product.imageLinks) ? product.imageLinks.length : 0;
  const uploadCount = Array.isArray(product.images) ? product.images.length : 0;
  const connectionLabel = preview?.profile
    ? resolveConnectionLabel(preview.profile.connectionId, preview.profile.connectionName)
    : null;
  const targetSourceLabel = preview ? resolveTargetSourceLabel(preview.resolvedTargetSource) : null;
  const targetSourceHint = preview ? renderTargetSourceHint(preview.resolvedTargetSource) : null;
  const syncDisabledHint = preview
    ? resolveSyncDisabledHint(
        preview,
        syncableFieldCount,
        enabledOutOfSyncFields.length,
        disabledOutOfSyncFields.length
      )
    : null;
  const canRunSync =
    Boolean(preview?.canSync) &&
    syncableFieldCount > 0 &&
    !runSyncMutation.isPending &&
    !isCheckingPreview;
  const configuredProfile = React.useMemo((): ProductSyncProfile | null => {
    const profiles = profilesQuery.data ?? [];
    if (profiles.length === 0) return null;

    return (
      profiles.find((profile: ProductSyncProfile) => profile.isDefault) ??
      profiles[0] ??
      null
    );
  }, [profilesQuery.data]);
  const configuredProfileId = configuredProfile?.id ?? '';
  React.useEffect(() => {
    setHasChecked(false);
    setCheckedPreview(null);
    setLastRunSummary(null);
  }, [configuredProfileId]);
  const configuredDirectionRules = React.useMemo(
    (): ProductSyncFieldRule[] =>
      configuredProfile ? buildEffectiveProductSyncFieldRules(configuredProfile.fieldRules) : [],
    [configuredProfile]
  );
  const activeConfiguredDirectionRules = React.useMemo(
    (): ProductSyncFieldRule[] =>
      configuredDirectionRules.filter(
        (rule: ProductSyncFieldRule) => rule.direction !== 'disabled'
      ),
    [configuredDirectionRules]
  );
  const configuredConnectionId = configuredProfile?.connectionId?.trim() ?? '';
  const configuredInventoryId = configuredProfile?.inventoryId?.trim() ?? '';
  const configuredInventoriesQuery = useBaseInventories(
    configuredConnectionId,
    Boolean(configuredConnectionId && configuredProfile)
  );
  const configuredWarehousesQuery = useBaseWarehouses(
    configuredConnectionId,
    configuredInventoryId,
    true,
    Boolean(configuredConnectionId && configuredInventoryId && configuredProfile)
  );
  const configuredPriceGroupsQuery = usePriceGroups({
    enabled: Boolean(configuredProfile),
  });
  const configuredWarehouseLabels = React.useMemo(
    () => buildConfiguredWarehouseLabelMap(configuredWarehousesQuery.data),
    [configuredWarehousesQuery.data]
  );
  const configuredPriceGroupLabels = React.useMemo(
    () => buildConfiguredPriceGroupLabelMap(configuredPriceGroupsQuery.data ?? []),
    [configuredPriceGroupsQuery.data]
  );
  const configuredConnectionLabel = React.useMemo(() => {
    if (!configuredConnectionId) return null;
    const integrations = integrationsQuery.data ?? [];
    for (const integration of integrations) {
      const matchingConnection = integration.connections.find(
        (connection) => connection.id === configuredConnectionId
      );
      if (matchingConnection) {
        return resolveConnectionLabel(configuredConnectionId, matchingConnection.name);
      }
    }
    return resolveConnectionLabel(configuredConnectionId, null);
  }, [configuredConnectionId, integrationsQuery.data]);
  const configuredInventoryLabel = React.useMemo(
    () => resolveInventoryLabel(configuredInventoryId, configuredInventoriesQuery.data ?? []),
    [configuredInventoriesQuery.data, configuredInventoryId]
  );
  const previewConnectionId = preview?.profile?.connectionId?.trim() ?? '';
  const previewInventoryId = preview?.profile?.inventoryId?.trim() ?? '';
  const previewInventoriesQuery = useBaseInventories(
    previewConnectionId,
    Boolean(previewConnectionId && preview?.profile)
  );
  const previewInventoryLabel = React.useMemo(
    () => resolveInventoryLabel(previewInventoryId, previewInventoriesQuery.data ?? []),
    [previewInventoriesQuery.data, previewInventoryId]
  );
  const configuredRuleSummary = React.useMemo(() => {
    const appToBaseCount = activeConfiguredDirectionRules.filter(
      (rule: ProductSyncFieldRule) => rule.direction === 'app_to_base'
    ).length;
    const baseToAppCount = activeConfiguredDirectionRules.filter(
      (rule: ProductSyncFieldRule) => rule.direction === 'base_to_app'
    ).length;

    return {
      appToBaseCount,
      baseToAppCount,
    };
  }, [activeConfiguredDirectionRules]);

  const handleCheckPreview = async (): Promise<void> => {
    setHasChecked(true);

    try {
      setCheckedPreview(null);
      const result = await previewQuery.refetch();
      setCheckedPreview(result.data ?? null);
    } catch (error) {
      logClientError(error);
      setCheckedPreview(null);
    }
  };

  const handleRunSync = async (): Promise<void> => {
    try {
      const response = await runSyncMutation.mutateAsync({ productId: product.id });
      const fieldSource =
        Array.isArray(response.preview.fields) && response.preview.fields.length > 0
          ? response.preview.fields
          : checkedPreview?.fields ?? [];

      setHasChecked(true);
      setCheckedPreview(response.preview);
      setLastRunSummary({
        result: response.result,
        localChangeLabels: response.result.localChanges.map((change: string) =>
          resolveLocalChangeLabel(change, fieldSource)
        ),
        baseChangeLabels: response.result.baseChanges.map((change: string) =>
          resolveBaseChangeLabel(change, fieldSource)
        ),
        recordedAt: new Date().toISOString(),
      });

      const toastMessage = resolveSyncToastMessage(
        response.result.localChanges,
        response.result.baseChanges,
        response.result.message
      );
      toast(toastMessage, {
        variant:
          response.result.status === 'failed'
            ? 'error'
            : response.result.status === 'skipped'
              ? 'warning'
              : 'success',
      });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to synchronize with Base.com.', {
        variant: 'error',
      });
    }
  };

  return (
    <Card variant='subtle' padding='md' className='bg-card/40 space-y-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400'>Field Sync</h4>
          <p className='text-[11px] text-gray-500'>
            Uses the global Base.com synchronization-engine profile selected for the BL modal.
          </p>
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleCheckPreview();
            }}
            disabled={isCheckingPreview || runSyncMutation.isPending}
            loading={isCheckingPreview}
            className='min-w-[140px]'
          >
            <Check className='mr-2 size-3.5' />
            {isCheckingPreview ? 'Checking...' : hasChecked ? 'Check Again' : 'Check'}
          </Button>
          {preview?.profile && (
            <Button asChild variant='outline' size='sm' className='h-7 px-3 text-[10px]'>
              <Link href={GLOBAL_SYNC_SETTINGS_HREF} title='Open global sync settings'>
                {preview.profile.name}
              </Link>
            </Button>
          )}
          {preview?.linkedBaseProductId && (
            <Badge variant='outline' className='text-[10px] font-mono'>
              Base ID: {preview.linkedBaseProductId}
            </Badge>
          )}
          {targetSourceLabel && (
            <Badge variant='outline' className='text-[10px]'>
              {targetSourceLabel}
            </Badge>
          )}
        </div>
      </div>

      {profilesQuery.isLoading ? (
        <Card variant='glass' padding='md' className='bg-white/5 text-[12px] text-gray-400'>
          Loading configured Base.com sync directions...
        </Card>
      ) : profilesQuery.error ? (
        <Hint variant='warning'>
          {profilesQuery.error.message || 'Failed to load saved Base.com sync directions.'}
        </Hint>
      ) : configuredProfile ? (
        <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='space-y-1'>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                Configured Directions
              </div>
              <div className='text-[11px] text-gray-300'>
                These are the saved field directions. Click Check to preview the fields this
                profile will sync now.
              </div>
            </div>
            <Button asChild variant='outline' size='sm' className='h-7 px-3 text-[10px]'>
              <Link href={GLOBAL_SYNC_SETTINGS_HREF} title={`Open sync settings — ${configuredProfile.name}`}>
                Sync Settings
              </Link>
            </Button>
          </div>
          <div className='grid gap-2 md:grid-cols-3'>
            <div>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Connection</div>
              <div className='mt-1 text-[11px] text-gray-200 break-words'>
                {configuredConnectionLabel?.primary ?? configuredProfile.connectionId}
              </div>
              {configuredConnectionLabel?.secondary && (
                <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                  {configuredConnectionLabel.secondary}
                </div>
              )}
            </div>
            <div>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Inventory</div>
              <div className='mt-1 text-[11px] text-gray-200 break-words'>
                {configuredInventoryLabel.primary}
              </div>
              {configuredInventoryLabel.secondary && (
                <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                  {configuredInventoryLabel.secondary}
                </div>
              )}
            </div>
            <div>
              <div className='text-[10px] uppercase tracking-wide text-gray-500'>Last Run</div>
              <div className='mt-1 text-[11px] text-gray-200 break-words'>
                {formatLastRunAt(configuredProfile.lastRunAt)}
              </div>
            </div>
          </div>
          <div className='text-[10px] text-gray-400'>
            {configuredRuleSummary.appToBaseCount} {'App -> Base'},{' '}
            {configuredRuleSummary.baseToAppCount} {'Base -> App'}
          </div>
          {activeConfiguredDirectionRules.length > 0 ? (
            <div className='grid gap-2 md:grid-cols-2'>
              {activeConfiguredDirectionRules.map((rule: ProductSyncFieldRule) => {
                return (
                  <div
                    key={rule.appField}
                    className='rounded-md border border-white/5 bg-black/10 px-2 py-2'
                  >
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 text-[11px] text-gray-200'>
                        {getProductSyncAppFieldLabel(rule.appField)}
                      </div>
                      <Badge
                        variant='outline'
                        className={cn(
                          'shrink-0 text-[10px] gap-1',
                          rule.direction === 'app_to_base' &&
                            'text-blue-300 border-blue-500/30',
                          rule.direction === 'base_to_app' &&
                            'text-purple-300 border-purple-500/30'
                        )}
                      >
                        {directionIcon(rule.direction)}
                        {directionLabel(rule.direction)}
                      </Badge>
                    </div>
                    <div className='mt-1 text-[10px] text-gray-500 break-words'>
                      Target:{' '}
                      {resolveConfiguredBaseFieldLabel(
                        rule,
                        configuredWarehouseLabels,
                        configuredPriceGroupLabels
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2 text-[11px] text-gray-400'>
              This profile has no active field directions.
            </div>
          )}
        </Card>
      ) : (
        <Card variant='glass' padding='md' className='bg-white/5 text-[12px] text-gray-400'>
          No BL modal Base.com sync profile is selected yet. Choose one in global sync settings,
          then click Check here for live differences.
        </Card>
      )}

      {!hasChecked ? (
        <Card variant='glass' padding='md' className='bg-white/5 text-[12px] text-gray-400'>
          Click Check to load the live Base.com status for this product and preview only the fields
          this profile is about to sync.
        </Card>
      ) : isLoadingPreview ? (
        <Card variant='glass' padding='md' className='bg-white/5 text-[12px] text-gray-400'>
          Checking live Base.com sync status...
        </Card>
      ) : previewQuery.error && !preview ? (
        <Hint variant='warning'>
          {previewQuery.error.message || 'Failed to load Base.com sync preview.'}
        </Hint>
      ) : preview ? (
        <>
          {preview.profile && (
            <Card variant='glass' padding='md' className='bg-white/5 space-y-2'>
              <div className='grid gap-2 md:grid-cols-3'>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Connection</div>
                  <div className='mt-1 text-[11px] text-gray-200 break-words'>
                    {connectionLabel?.primary ?? preview.profile.connectionId}
                  </div>
                  {connectionLabel?.secondary && (
                    <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                      {connectionLabel.secondary}
                    </div>
                  )}
                </div>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Inventory</div>
                  <div className='mt-1 text-[11px] text-gray-200 break-words'>
                    {previewInventoryLabel.primary}
                  </div>
                  {previewInventoryLabel.secondary && (
                    <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                      {previewInventoryLabel.secondary}
                    </div>
                  )}
                </div>
                <div>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Last Run</div>
                  <div className='mt-1 text-[11px] text-gray-200 break-words'>
                    {formatLastRunAt(preview.profile.lastRunAt)}
                  </div>
                </div>
              </div>
              {targetSourceHint && <div className='text-[10px] text-gray-400'>{targetSourceHint}</div>}
            </Card>
          )}

          {lastRunSummary && (
            <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='space-y-1'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                    Last Manual Sync
                  </div>
                  <div className='text-[11px] text-gray-200'>
                    {formatLastRunAt(lastRunSummary.recordedAt)}
                  </div>
                </div>
                <Badge
                  variant='outline'
                  className={cn(
                    'text-[10px]',
                    lastRunSummary.result.status === 'success' &&
                      'text-emerald-300 border-emerald-500/30',
                    lastRunSummary.result.status === 'skipped' &&
                      'text-amber-300 border-amber-500/30',
                    lastRunSummary.result.status === 'failed' &&
                      'text-red-300 border-red-500/30'
                  )}
                >
                  {lastRunSummary.result.status}
                </Badge>
              </div>

              <div className='text-[11px] text-gray-300'>
                {summarizeManualSyncResult(lastRunSummary.result)}
              </div>

              {lastRunSummary.localChangeLabels.length > 0 && (
                <div className='space-y-1'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>App updated</div>
                  <div className='flex flex-wrap gap-2'>
                    {lastRunSummary.localChangeLabels.map((label: string) => (
                      <Badge key={`local-${label}`} variant='outline' className='text-[10px]'>
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {lastRunSummary.baseChangeLabels.length > 0 && (
                <div className='space-y-1'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Base.com updated</div>
                  <div className='flex flex-wrap gap-2'>
                    {lastRunSummary.baseChangeLabels.map((label: string) => (
                      <Badge key={`base-${label}`} variant='outline' className='text-[10px]'>
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {visibleFields.length > 0 && (
            <div className='space-y-2'>
              {visibleFields.map((field: ProductSyncFieldPreview) => {
                const fieldActionHint = renderFieldActionHint(field);
                return (
                  <Card
                    key={field.appField}
                    variant='glass'
                    padding='md'
                    className={cn(
                      'bg-white/5 space-y-2',
                      field.direction === 'disabled' && 'opacity-80'
                    )}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='text-xs font-semibold text-gray-200'>
                          {field.appFieldLabel}
                        </div>
                        <div className='text-[10px] text-gray-400 break-words'>
                          Base.com field: {field.baseFieldLabel}
                        </div>
                        {field.baseFieldDescription && (
                          <div className='text-[10px] text-gray-500 break-words'>
                            {field.baseFieldDescription}
                          </div>
                        )}
                        {field.baseFieldLabel !== field.baseField && (
                          <div className='text-[10px] font-mono text-gray-500 break-words'>
                            {field.baseField}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant='outline'
                        className={cn(
                          'text-[10px] gap-1',
                          field.direction === 'app_to_base' && 'text-blue-300 border-blue-500/30',
                          field.direction === 'base_to_app' &&
                            'text-purple-300 border-purple-500/30'
                        )}
                      >
                        {directionIcon(field.direction)}
                        {directionLabel(field.direction)}
                      </Badge>
                    </div>

                    <div className='grid gap-2 md:grid-cols-2'>
                      <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2'>
                        <div className='text-[10px] uppercase tracking-wide text-gray-500'>App</div>
                        <div
                          className='mt-1 text-[11px] font-mono text-gray-200 break-words'
                          title={formatFieldValue(field.appValue, field.appField)}
                        >
                          {formatFieldValue(field.appValue, field.appField)}
                        </div>
                      </div>
                      <div className='rounded-md border border-white/5 bg-black/10 px-2 py-2'>
                        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Base</div>
                        <div
                          className='mt-1 text-[11px] font-mono text-gray-200 break-words'
                          title={formatFieldValue(field.baseValue, field.appField)}
                        >
                          {formatFieldValue(field.baseValue, field.appField)}
                        </div>
                      </div>
                    </div>

                    {fieldActionHint && (
                      <div className='text-[10px] text-gray-400'>{fieldActionHint}</div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <div className='border-t border-white/5 pt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-1'>
              <Hint size='xxs' uppercase>
                {activeFieldCount} of {preview.fields.length} fields enabled
              </Hint>
              <div className={cn(UI_CENTER_ROW_SPACED_CLASSNAME, 'text-[10px] text-gray-500')}>
                <div className='flex items-center gap-1'>
                  <Check className='size-3 text-emerald-400' />
                  <span>{syncableFieldCount} field(s) will sync</span>
                </div>
              </div>
            </div>

            <Button
              type='button'
              variant='secondary'
              size='sm'
              onClick={(): void => {
                void handleRunSync();
              }}
              disabled={!canRunSync}
              loading={runSyncMutation.isPending}
              className='min-w-[140px]'
            >
              <Play className='mr-2 size-3.5' />
              {runSyncMutation.isPending ? 'Syncing...' : 'Sync'}
            </Button>
          </div>

          {syncDisabledHint && (
            <Hint variant='warning'>{syncDisabledHint}</Hint>
          )}
        </>
      ) : (
        <Hint variant='warning'>Base.com sync preview is unavailable for this product.</Hint>
      )}

      <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
        <div className='flex items-center justify-between'>
          <h5 className='text-xs font-bold uppercase tracking-wider text-gray-300'>Images</h5>
          <div className='flex gap-2'>
            <Badge variant='outline' className='text-[9px]'>
              Links: {imageLinkCount}
            </Badge>
            <Badge variant='outline' className='text-[9px]'>
              Files: {uploadCount}
            </Badge>
          </div>
        </div>
        <p className='text-[11px] text-gray-400 leading-relaxed'>
          Sync Base.com image URLs into product links to keep backups even if local uploads go
          missing.
        </p>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={!baseListing || syncingImages === baseListing.id || isBaseListingExportBusy}
          onClick={(): void => setIsSyncImagesConfirmOpen(true)}
          className='w-full'
          loading={syncingImages === baseListing?.id}
        >
          Sync Image URLs
        </Button>
        {!baseListing && (
          <Hint variant='warning' className='text-center'>
            Connect to Base.com to enable image sync.
          </Hint>
        )}
      </Card>
    </Card>
  );
}
