'use client';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useProductSyncProfiles } from '@/features/product-sync/hooks/useProductSyncSettings';
import { usePriceGroups } from '@/features/products/hooks/useProductSettingsQueries';
import {
  useBaseInventories,
  useBaseWarehouses,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import type {
  ProductSyncDirection,
  ProductSyncFieldRule,
  ProductSyncProfile,
} from '@/shared/contracts/product-sync';
import {
  buildEffectiveProductSyncFieldRules,
  getProductSyncAppFieldLabel,
  getProductSyncBaseFieldPresentation,
} from '@/shared/contracts/product-sync';
import type { BaseImportWarehousesResponse } from '@/shared/contracts/integrations';
import type { BaseInventory, BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { AppModal } from '@/shared/ui/app-modal';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

interface ProductBulkSyncSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  isRunning: boolean;
  onStart: (profileId: string) => void;
}

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

const formatLastRunAt = (value: string | null | undefined): string => {
  const normalized = (value ?? '').trim();
  if (!normalized) return 'Never';
  const ts = Date.parse(normalized);
  if (!Number.isFinite(ts)) return normalized;
  return new Date(ts).toLocaleString();
};

const resolveConnectionLabel = (
  connectionId: string,
  connectionName: string | null | undefined
): { primary: string; secondary: string | null } => {
  const name = (connectionName ?? '').trim();
  const id = connectionId.trim();
  if (!name) return { primary: id, secondary: null };
  return { primary: name, secondary: name === id ? null : id };
};

const resolveInventoryLabel = (
  inventoryId: string,
  inventories: BaseInventory[]
): { primary: string; secondary: string | null } => {
  const id = inventoryId.trim();
  const inv = inventories.find((item: BaseInventory) => item.id === id);
  const name = inv?.name?.trim() ?? '';
  if (!name) return { primary: id, secondary: null };
  return { primary: name, secondary: name === id ? null : id };
};

const buildWarehouseLabelMap = (
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
    if (id && !map.has(id)) map.set(id, `${warehouse.name} (${id})`);
    if (typedId && !map.has(typedId)) map.set(typedId, `${warehouse.name} (${typedId})`);
  });
  return map;
};

const buildPriceGroupLabelMap = (groups: PriceGroup[]): Map<string, string> => {
  const map = new Map<string, string>();
  groups.forEach((g: PriceGroup) => {
    const id = (g.groupId || g.id || '').trim();
    if (!id || map.has(id)) return;
    map.set(id, `${g.name} (${id})`);
  });
  return map;
};

const resolveRuleTargetLabel = (
  rule: ProductSyncFieldRule,
  warehouseLabels: Map<string, string>,
  priceGroupLabels: Map<string, string>
): string => {
  const base = rule.baseField.trim();
  if (rule.appField === 'stock' && base.startsWith('stock.')) {
    const id = base.slice('stock.'.length).trim();
    if (id && warehouseLabels.has(id)) return warehouseLabels.get(id) ?? id;
  }
  if (rule.appField === 'price' && base.startsWith('prices.')) {
    const id = base.slice('prices.'.length).trim();
    if (id && priceGroupLabels.has(id)) return priceGroupLabels.get(id) ?? id;
  }
  return getProductSyncBaseFieldPresentation(rule.appField, rule.baseField).label;
};

export function ProductBulkSyncSetupModal(
  props: ProductBulkSyncSetupModalProps
): React.JSX.Element {
  const { isOpen, onClose, selectedCount, isRunning, onStart } = props;
  const profilesQuery = useProductSyncProfiles();
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const [profileId, setProfileId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    if (profiles.length === 0) return;
    const defaultProfile =
      profiles.find((profile: ProductSyncProfile) => profile.isDefault) ?? profiles[0];
    if (defaultProfile) {
      setProfileId((prev) => prev || defaultProfile.id);
    }
  }, [isOpen, profiles]);

  const options = useMemo(
    () =>
      profiles.map((profile: ProductSyncProfile) => ({
        value: profile.id,
        label: profile.isDefault ? `${profile.name} (default)` : profile.name,
      })),
    [profiles]
  );

  const selectedProfile = profiles.find(
    (profile: ProductSyncProfile) => profile.id === profileId
  ) ?? null;

  const directionRules = useMemo(
    (): ProductSyncFieldRule[] =>
      selectedProfile ? buildEffectiveProductSyncFieldRules(selectedProfile.fieldRules) : [],
    [selectedProfile]
  );

  const connectionId = selectedProfile?.connectionId?.trim() ?? '';
  const inventoryId = selectedProfile?.inventoryId?.trim() ?? '';

  const integrationsQuery = useIntegrationsWithConnections();
  const inventoriesQuery = useBaseInventories(connectionId, Boolean(connectionId && isOpen));
  const warehousesQuery = useBaseWarehouses(
    connectionId,
    inventoryId,
    true,
    Boolean(connectionId && inventoryId && isOpen)
  );
  const priceGroupsQuery = usePriceGroups({ enabled: Boolean(selectedProfile && isOpen) });

  const connectionLabel = useMemo(() => {
    if (!connectionId) return null;
    const integrations = integrationsQuery.data ?? [];
    for (const integration of integrations) {
      const match = integration.connections.find((c) => c.id === connectionId);
      if (match) return resolveConnectionLabel(connectionId, match.name);
    }
    return resolveConnectionLabel(connectionId, null);
  }, [connectionId, integrationsQuery.data]);

  const inventoryLabel = useMemo(
    () => resolveInventoryLabel(inventoryId, inventoriesQuery.data ?? []),
    [inventoriesQuery.data, inventoryId]
  );

  const warehouseLabels = useMemo(
    () => buildWarehouseLabelMap(warehousesQuery.data),
    [warehousesQuery.data]
  );
  const priceGroupLabels = useMemo(
    () => buildPriceGroupLabelMap(priceGroupsQuery.data ?? []),
    [priceGroupsQuery.data]
  );

  const ruleSummary = useMemo(() => {
    const appToBaseCount = directionRules.filter(
      (r: ProductSyncFieldRule) => r.direction === 'app_to_base'
    ).length;
    const baseToAppCount = directionRules.filter(
      (r: ProductSyncFieldRule) => r.direction === 'base_to_app'
    ).length;
    const disabledCount = directionRules.filter(
      (r: ProductSyncFieldRule) => r.direction === 'disabled'
    ).length;
    return { appToBaseCount, baseToAppCount, disabledCount };
  }, [directionRules]);

  const handleStart = (): void => {
    if (!profileId) return;
    onStart(profileId);
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title='Sync with Base.com'
      subtitle={`${selectedCount} product${selectedCount === 1 ? '' : 's'} selected.`}
      size='lg'
      footer={
        <>
          <Button type='button' variant='outline' onClick={onClose} disabled={isRunning}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleStart}
            disabled={isRunning || !profileId || profiles.length === 0}
            loading={isRunning}
            loadingText='Syncing...'
          >
            Start Sync
          </Button>
        </>
      }
    >
      <div className='space-y-4'>
        {profilesQuery.isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading sync profiles...</p>
        ) : profiles.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No sync profiles configured. Create one in Base.com Synchronization Engine first.
          </p>
        ) : (
          <>
            <div>
              <label className='mb-1 block text-xs font-medium text-gray-400'>Sync Profile</label>
              <SelectSimple
                size='sm'
                variant='subtle'
                value={profileId}
                onValueChange={setProfileId}
                options={options}
                triggerClassName='w-full'
                ariaLabel='Sync profile'
                title='Sync profile'
              />
            </div>
            {selectedProfile ? (
              <div className='rounded-md border border-border/60 bg-card/40 p-3 space-y-3'>
                <div className='grid gap-2 md:grid-cols-3'>
                  <div>
                    <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                      Connection
                    </div>
                    <div className='mt-1 text-[11px] text-gray-200 break-words'>
                      {connectionLabel?.primary ?? selectedProfile.connectionId}
                    </div>
                    {connectionLabel?.secondary ? (
                      <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                        {connectionLabel.secondary}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                      Inventory
                    </div>
                    <div className='mt-1 text-[11px] text-gray-200 break-words'>
                      {inventoryLabel.primary}
                    </div>
                    {inventoryLabel.secondary ? (
                      <div className='mt-1 text-[10px] font-mono text-gray-500 break-words'>
                        {inventoryLabel.secondary}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div className='text-[10px] uppercase tracking-wide text-gray-500'>
                      Last Run
                    </div>
                    <div className='mt-1 text-[11px] text-gray-200 break-words'>
                      {formatLastRunAt(selectedProfile.lastRunAt)}
                    </div>
                  </div>
                </div>
                {selectedProfile.catalogId ? (
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      Catalog
                    </Badge>
                    <span className='font-mono text-[11px] text-gray-400'>
                      {selectedProfile.catalogId}
                    </span>
                  </div>
                ) : null}
                <div className='text-[10px] text-gray-400'>
                  {ruleSummary.appToBaseCount} {'App -> Base'}, {ruleSummary.baseToAppCount}{' '}
                  {'Base -> App'}, {ruleSummary.disabledCount} Disabled
                </div>
                {directionRules.length > 0 ? (
                  <div className='grid gap-2 md:grid-cols-2'>
                    {directionRules.map((rule: ProductSyncFieldRule) => (
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
                          Target: {resolveRuleTargetLabel(rule, warehouseLabels, priceGroupLabels)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppModal>
  );
}
