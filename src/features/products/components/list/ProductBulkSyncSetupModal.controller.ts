'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { useProductSyncProfiles } from '@/features/product-sync/hooks/useProductSyncSettings';
import { usePriceGroups } from '@/features/products/hooks/useProductSettingsQueries';
import {
  useBaseInventories,
  useBaseWarehouses,
  useIntegrationsWithConnections,
} from '@/shared/hooks/useIntegrationQueries';
import {
  buildEffectiveProductSyncFieldRules,
  type ProductSyncFieldRule,
  type ProductSyncProfile,
} from '@/shared/contracts/product-sync';

import {
  buildPriceGroupLabelMap,
  buildWarehouseLabelMap,
  resolveConnectionLabel,
  resolveInventoryLabel,
  summarizeDirectionRules,
} from './ProductBulkSyncSetupModal.helpers';
import type {
  ProductBulkSyncSetupController,
  ProductBulkSyncSetupModalProps,
} from './ProductBulkSyncSetupModal.types';

const useDefaultProfileSelection = (
  isOpen: boolean,
  profiles: ProductSyncProfile[],
  setProfileId: Dispatch<SetStateAction<string>>
): void => {
  useEffect(() => {
    if (!isOpen || profiles.length === 0) return;
    const defaultProfile =
      profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null;
    if (defaultProfile !== null) {
      setProfileId((previous) =>
        previous.length > 0 ? previous : defaultProfile.id
      );
    }
  }, [isOpen, profiles, setProfileId]);
};

const useSelectedProfile = (
  profiles: ProductSyncProfile[],
  profileId: string
): ProductSyncProfile | null =>
  useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? null,
    [profileId, profiles]
  );

const useDirectionRules = (
  selectedProfile: ProductSyncProfile | null
): ProductSyncFieldRule[] =>
  useMemo(
    () =>
      selectedProfile !== null
        ? buildEffectiveProductSyncFieldRules(selectedProfile.fieldRules)
        : [],
    [selectedProfile]
  );

const useConnectionLabel = (
  connectionId: string,
  isOpen: boolean
): ProductBulkSyncSetupController['connectionLabel'] => {
  const integrationsQuery = useIntegrationsWithConnections();
  return useMemo(() => {
    if (!isOpen || connectionId.length === 0) return null;
    const integrations = integrationsQuery.data ?? [];
    for (const integration of integrations) {
      const match = integration.connections.find((connection) => connection.id === connectionId);
      if (match !== undefined) return resolveConnectionLabel(connectionId, match.name);
    }
    return resolveConnectionLabel(connectionId, null);
  }, [connectionId, integrationsQuery.data, isOpen]);
};

const useProductBulkSyncLookupLabels = (
  connectionId: string,
  inventoryId: string,
  isOpen: boolean,
  selectedProfile: ProductSyncProfile | null
): Pick<
  ProductBulkSyncSetupController,
  'inventoryLabel' | 'priceGroupLabels' | 'warehouseLabels'
> => {
  const inventoriesQuery = useBaseInventories(connectionId, connectionId.length > 0 && isOpen);
  const warehousesQuery = useBaseWarehouses(
    connectionId,
    inventoryId,
    true,
    connectionId.length > 0 && inventoryId.length > 0 && isOpen
  );
  const priceGroupsQuery = usePriceGroups({ enabled: selectedProfile !== null && isOpen });
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
  return { inventoryLabel, priceGroupLabels, warehouseLabels };
};

export const useProductBulkSyncSetupController = (
  props: ProductBulkSyncSetupModalProps
): ProductBulkSyncSetupController => {
  const profilesQuery = useProductSyncProfiles();
  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const [profileId, setProfileId] = useState('');
  useDefaultProfileSelection(props.isOpen, profiles, setProfileId);
  const options = useMemo(
    () =>
      profiles.map((profile) => ({
        value: profile.id,
        label: profile.isDefault ? `${profile.name} (default)` : profile.name,
      })),
    [profiles]
  );
  const selectedProfile = useSelectedProfile(profiles, profileId);
  const directionRules = useDirectionRules(selectedProfile);
  const connectionId = selectedProfile?.connectionId.trim() ?? '';
  const inventoryId = selectedProfile?.inventoryId.trim() ?? '';
  const connectionLabel = useConnectionLabel(connectionId, props.isOpen);
  const lookupLabels = useProductBulkSyncLookupLabels(
    connectionId,
    inventoryId,
    props.isOpen,
    selectedProfile
  );
  const ruleSummary = useMemo(() => summarizeDirectionRules(directionRules), [directionRules]);
  const handleStart = (): void => {
    if (profileId.length === 0) return;
    props.onStart(profileId);
  };

  return {
    ...props,
    ...lookupLabels,
    connectionLabel,
    directionRules,
    handleStart,
    options,
    profileId,
    profiles,
    profilesLoading: profilesQuery.isLoading,
    ruleSummary,
    selectedProfile,
    setProfileId,
  };
};
