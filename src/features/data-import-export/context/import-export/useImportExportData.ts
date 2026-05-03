'use client';

import { useMemo, useState, useEffect, type MutableRefObject } from 'react';

import {
  useInventories,
  useWarehouses,
  useImportList,
  useImportRun,
} from '@/features/data-import-export/hooks/useImportQueries';
import type {
  BaseImportDirectTargetType,
} from '@/shared/contracts/integrations/base-com';
import type { InventoryOption, ImportListItem, ImportRunDetail, WarehouseOption } from '@/shared/contracts/integrations/import-export';

export function useImportExportData({
  selectedBaseConnectionId,
  isBaseConnected,
  inventoriesEnabled,
  inventoryId,
  inventoryIdRef,
  setInventoryId,
  exportInventoryId,
  exportInventoryIdRef,
  setExportInventoryId,
  includeAllWarehouses,
  warehousesEnabled,
  catalogId,
  limit,
  uniqueOnly,
  importListPage,
  importListPageSize,
  importNameSearch,
  importDirectTargetType,
  importDirectTargetValue,
  importSkuSearch,
  importListEnabled,
  activeImportRunId,
  pollImportRun,
  setPollImportRun,
}: {
  selectedBaseConnectionId: string;
  isBaseConnected: boolean;
  inventoriesEnabled: boolean;
  inventoryId: string;
  inventoryIdRef: MutableRefObject<string>;
  setInventoryId: (id: string) => void;
  exportInventoryId: string;
  exportInventoryIdRef: MutableRefObject<string>;
  setExportInventoryId: (id: string) => void;
  includeAllWarehouses: boolean;
  warehousesEnabled: boolean;
  catalogId: string;
  limit: string;
  uniqueOnly: boolean;
  importListPage: number;
  importListPageSize: number;
  importNameSearch: string;
  importDirectTargetType: BaseImportDirectTargetType;
  importDirectTargetValue: string;
  importSkuSearch: string;
  importListEnabled: boolean;
  activeImportRunId: string;
  pollImportRun: boolean;
  setPollImportRun: (poll: boolean) => void;
}) {
  const normalizedSelectedBaseConnectionId = selectedBaseConnectionId.trim();
  const inventoriesQuery = useInventories(
    normalizedSelectedBaseConnectionId,
    inventoriesEnabled && isBaseConnected && Boolean(normalizedSelectedBaseConnectionId)
  );
  const inventories = useMemo<InventoryOption[]>(() => {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      return '';
    };
    const rawInventories = Array.isArray(inventoriesQuery.data) ? inventoriesQuery.data : [];
    return rawInventories
      .map((inventory: unknown) => {
        const inv = inventory as { inventory_id?: unknown; id?: unknown; name?: unknown };
        return {
          id: toText(inv.inventory_id ?? inv.id),
          name: toText(inv.name),
        };
      })
      .filter((inventory: InventoryOption) => inventory.id.length > 0)
      .map((inventory: InventoryOption) => ({
        ...inventory,
        name: inventory.name || inventory.id,
      }));
  }, [inventoriesQuery.data]);
  const isFetchingInventories = inventoriesQuery.isFetching;
  const refetchInventories = inventoriesQuery.refetch;

  const [hasInitializedInventories, setHasInitializedInventories] = useState(false);
  useEffect(() => {
    if (inventories.length > 0 && !hasInitializedInventories) {
      const firstInventory = inventories[0];
      if (firstInventory?.id) {
        const firstInventoryId = firstInventory.id;
        const timer = setTimeout(() => {
          if (!inventoryIdRef.current.trim()) {
            setInventoryId(firstInventoryId);
          }
          if (!exportInventoryIdRef.current.trim()) {
            setExportInventoryId(firstInventoryId);
          }
          setHasInitializedInventories(true);
        }, 0);
        return (): void => clearTimeout(timer);
      }
    }
    return undefined;
  }, [
    inventories,
    inventoryId,
    exportInventoryId,
    inventoryIdRef,
    exportInventoryIdRef,
    hasInitializedInventories,
    setInventoryId,
    setExportInventoryId,
  ]);

  const warehousesQuery = useWarehouses(
    exportInventoryId,
    normalizedSelectedBaseConnectionId,
    includeAllWarehouses,
    warehousesEnabled &&
      isBaseConnected &&
      Boolean(normalizedSelectedBaseConnectionId) &&
      Boolean(exportInventoryId)
  );
  const warehousesData = warehousesQuery.data;
  const isFetchingWarehouses = warehousesQuery.isFetching;
  const refetchWarehouses = warehousesQuery.refetch;

  const warehouses: WarehouseOption[] = warehousesData?.warehouses ?? [];
  const allWarehouses: WarehouseOption[] = warehousesData?.allWarehouses ?? [];
  const normalizedImportDirectTargetValue = importDirectTargetValue.trim();
  const importDirectTarget =
    normalizedImportDirectTargetValue.length > 0
      ? {
          type: importDirectTargetType,
          value: normalizedImportDirectTargetValue,
        }
      : undefined;

  const importListQuery = useImportList(
    inventoryId,
    {
      connectionId: normalizedSelectedBaseConnectionId,
      catalogId,
      limit,
      uniqueOnly,
      page: importListPage,
      pageSize: importListPageSize,
      searchName: importNameSearch,
      directTarget: importDirectTarget,
      searchSku: importSkuSearch,
    },
    importListEnabled && isBaseConnected && Boolean(inventoryId) && Boolean(normalizedSelectedBaseConnectionId)
  );
  const importListData = importListQuery.data;
  const loadingImportList = importListQuery.isFetching;
  const refetchImportList = importListQuery.refetch;

  const importList: ImportListItem[] = useMemo(
    () => importListData?.products ?? [],
    [importListData]
  );
  const importListStats = useMemo(() => {
    if (!importListData) return null;
    return {
      total: importListData.total ?? 0,
      filtered: importListData.filtered ?? 0,
      available: importListData.available ?? importListData.filtered ?? 0,
      existing: importListData.existing ?? 0,
      skuDuplicates: importListData.skuDuplicates ?? 0,
      page: importListData.page ?? 1,
      pageSize: importListData.pageSize ?? importListPageSize,
      totalPages: importListData.totalPages ?? 1,
    };
  }, [importListData, importListPageSize]);

  const activeImportRunQuery = useImportRun(activeImportRunId, {
    enabled: Boolean(activeImportRunId),
    refetchInterval: pollImportRun ? 2000 : false,
    page: 1,
    pageSize: pollImportRun ? 250 : 1000,
    includeItems: true,
  });
  const activeImportRun = useMemo<ImportRunDetail | null>(() => {
    return activeImportRunQuery.data ?? null;
  }, [activeImportRunQuery.data]);
  const loadingImportRun = activeImportRunQuery.isFetching && Boolean(activeImportRunId);

  useEffect(() => {
    const status = activeImportRun?.run.status;
    if (!status) return;
    const isTerminal =
      status === 'completed' ||
      status === 'partial_success' ||
      status === 'failed' ||
      status === 'canceled';
    if (isTerminal) {
      setPollImportRun(false);
    }
  }, [activeImportRun?.run.status, setPollImportRun]);

  return {
    inventories,
    isFetchingInventories,
    refetchInventories,
    warehouses,
    allWarehouses,
    isFetchingWarehouses,
    refetchWarehouses,
    importList,
    loadingImportList,
    refetchImportList,
    importListStats,
    activeImportRun,
    loadingImportRun,
  };
}
