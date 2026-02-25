// @ts-nocheck
'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  useInventories,
  useWarehouses,
  useImportList,
  useImportRun,
} from '@/features/data-import-export/hooks/useImportQueries';
import type { 
  InventoryOption, 
  ImportListItem, 
  ImportRunDetail,
  WarehouseOption
} from '@/shared/contracts/data-import-export';

export function useImportExportData({
  selectedBaseConnectionId,
  isBaseConnected,
  inventoriesEnabled,
  inventoryId,
  setInventoryId,
  exportInventoryId,
  setExportInventoryId,
  includeAllWarehouses,
  warehousesEnabled,
  catalogId,
  limit,
  uniqueOnly,
  importListPage,
  importListPageSize,
  importNameSearch,
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
  setInventoryId: (id: string) => void;
  exportInventoryId: string;
  setExportInventoryId: (id: string) => void;
  includeAllWarehouses: boolean;
  warehousesEnabled: boolean;
  catalogId: string;
  limit: string;
  uniqueOnly: boolean;
  importListPage: number;
  importListPageSize: number;
  importNameSearch: string;
  importSkuSearch: string;
  importListEnabled: boolean;
  activeImportRunId: string;
  pollImportRun: boolean;
  setPollImportRun: (poll: boolean) => void;
}) {
  const inventoriesQuery = useInventories(
    selectedBaseConnectionId,
    inventoriesEnabled && isBaseConnected && !!selectedBaseConnectionId
  );
  const inventories = useMemo<InventoryOption[]>(() => {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      return '';
    };
    const rawInventories = Array.isArray(inventoriesQuery.data) ? inventoriesQuery.data : [];
    return rawInventories
      .map((inventory) => ({
        id: toText(
          (inventory as { inventory_id?: unknown; id?: unknown })?.inventory_id ??
            (inventory as { inventory_id?: unknown; id?: unknown })?.id
        ),
        name: toText((inventory as { name?: unknown })?.name),
      }))
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
          if (!inventoryId) {
            setInventoryId(firstInventoryId);
          }
          if (!exportInventoryId) {
            setExportInventoryId(firstInventoryId);
          }
          setHasInitializedInventories(true);
        }, 0);
        return (): void => clearTimeout(timer);
      }
    }
    return undefined;
  }, [inventories, inventoryId, exportInventoryId, hasInitializedInventories, setInventoryId, setExportInventoryId]);

  const warehousesQuery = useWarehouses(
    exportInventoryId,
    selectedBaseConnectionId,
    includeAllWarehouses,
    warehousesEnabled &&
      isBaseConnected &&
      !!selectedBaseConnectionId &&
      !!exportInventoryId
  );
  const warehousesData = warehousesQuery.data;
  const isFetchingWarehouses = warehousesQuery.isFetching;
  const refetchWarehouses = warehousesQuery.refetch;
  
  const warehouses: WarehouseOption[] = (warehousesData as { warehouses?: WarehouseOption[] })?.warehouses ?? [];
  const allWarehouses: WarehouseOption[] = (warehousesData as { allWarehouses?: WarehouseOption[] })?.allWarehouses ?? [];

  const importListQuery = useImportList(
    inventoryId,
    {
      connectionId: selectedBaseConnectionId,
      catalogId,
      limit,
      uniqueOnly,
      page: importListPage,
      pageSize: importListPageSize,
      searchName: importNameSearch,
      searchSku: importSkuSearch,
    },
    importListEnabled && isBaseConnected && !!inventoryId
  );
  const importListData = importListQuery.data;
  const loadingImportList = importListQuery.isFetching;
  const refetchImportList = importListQuery.refetch;
  
  const importList: ImportListItem[] = useMemo(() => (importListData as { products?: ImportListItem[] })?.products ?? [], [importListData]);
  const importListStats = useMemo(() => {
    if (!importListData) return null;
    const data = importListData as {
      total?: number;
      filtered?: number;
      available?: number;
      existing?: number;
      skuDuplicates?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
    };
    return {
      total: data.total ?? 0,
      filtered: data.filtered ?? 0,
      available: data.available ?? data.filtered ?? 0,
      existing: data.existing ?? 0,
      skuDuplicates: data.skuDuplicates ?? 0,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? importListPageSize,
      totalPages: data.totalPages ?? 1,
    };
  }, [importListData, importListPageSize]);

  const activeImportRunQuery = useImportRun(
    activeImportRunId,
    {
      enabled: Boolean(activeImportRunId),
      refetchInterval: pollImportRun ? 2000 : false,
      page: 1,
      pageSize: pollImportRun ? 250 : 1000,
      includeItems: true,
    }
  );
  const activeImportRun = useMemo<ImportRunDetail | null>(() => {
    return (activeImportRunQuery.data) ?? null;
  }, [activeImportRunQuery.data]);
  const loadingImportRun = activeImportRunQuery.isFetching && !!activeImportRunId;

  useEffect(() => {
    const status = activeImportRun?.run.status;
    if (!status) return;
    const isTerminal =
      status === 'completed' || status === 'partial_success' || status === 'failed' || status === 'canceled';
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
