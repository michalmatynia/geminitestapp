'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

import { useProductListings } from '@/features/integrations/hooks/useListingQueries';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type {
  ProductListingWithDetails,
} from '@/shared/contracts/integrations';
import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import {
  internalError,
} from '@/shared/errors/app-error';
import { useProductListingsActionsImpl } from './useProductListingsActionsImpl';

// --- Granular Contexts ---

export interface ProductListingsData {
  product: ProductWithImages;
  listings: ProductListingWithDetails[];
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}
const DataContext = createContext<ProductListingsData | null>(null);
export const useProductListingsData = () => {
  const context = useContext(DataContext);
  if (!context)
    throw internalError('useProductListingsData must be used within ProductListingsProvider');
  return context;
};

export interface ProductListingsUIState {
  deletingFromBase: string | null;
  purgingListing: string | null;
  exportingListing: string | null;
  savingInventoryId: string | null;
  syncingImages: string | null;
  relistingListing: string | null;
  openingTraderaLogin: string | null;
  inventoryOverrides: Record<string, string>;
  setInventoryOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  historyOpenByListing: Record<string, boolean>;
  setHistoryOpenByListing: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}
const UIStateContext = createContext<ProductListingsUIState | null>(null);
export const useProductListingsUIState = () => {
  const context = useContext(UIStateContext);
  if (!context)
    throw internalError('useProductListingsUIState must be used within ProductListingsProvider');
  return context;
};

export interface ProductListingsModals {
  listingToDelete: string | null;
  setListingToDelete: (id: string | null) => void;
  listingToPurge: string | null;
  setListingToPurge: (id: string | null) => void;
  isSyncImagesConfirmOpen: boolean;
  setIsSyncImagesConfirmOpen: (open: boolean) => void;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
}
const ModalsContext = createContext<ProductListingsModals | null>(null);
export const useProductListingsModals = () => {
  const context = useContext(ModalsContext);
  if (!context)
    throw internalError('useProductListingsModals must be used within ProductListingsProvider');
  return context;
};

export interface ProductListingsLogs {
  exportLogs: CapturedLog[];
  logsOpen: boolean;
  setLogsOpen: (open: boolean) => void;
  lastExportListingId: string | null;
}
const LogsContext = createContext<ProductListingsLogs | null>(null);
export const useProductListingsLogs = () => {
  const context = useContext(LogsContext);
  if (!context)
    throw internalError('useProductListingsLogs must be used within ProductListingsProvider');
  return context;
};

export interface ProductListingsActions {
  handleDeleteFromBase: (listingId: string) => Promise<void>;
  handlePurgeListing: (listingId: string) => Promise<void>;
  handleSaveInventoryId: (listingId: string) => Promise<void>;
  handleSyncBaseImages: (baseListing: ProductListingWithDetails | null) => Promise<void>;
  handleRelistTradera: (listingId: string) => Promise<void>;
  handleOpenTraderaLogin: (
    listingId: string,
    integrationId: string,
    connectionId: string
  ) => Promise<void>;
  handleExportAgain: (listingId: string) => Promise<void>;
  handleExportImagesOnly: (listingId: string, preset?: ImageRetryPreset) => Promise<void>;
  handleImageRetry: (preset: ImageRetryPreset) => Promise<void>;
  refetchListings: () => Promise<void>;
}
const ActionsContext = createContext<ProductListingsActions | null>(null);
export const useProductListingsActions = () => {
  const context = useContext(ActionsContext);
  if (!context)
    throw internalError('useProductListingsActions must be used within ProductListingsProvider');
  return context;
};

export function ProductListingsProvider({
  product,
  children,
  onListingsUpdated,
  onClose,
  onStartListing,
  filterIntegrationSlug,
}: {
  product: ProductWithImages;
  children: React.ReactNode;
  onListingsUpdated?: (() => void) | undefined;
  onClose: () => void;
  onStartListing?: ((integrationId: string, connectionId: string) => void) | undefined;
  filterIntegrationSlug?: string | null | undefined;
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [deletingFromBase, setDeletingFromBase] = useState<string | null>(null);
  const [purgingListing, setPurgingListing] = useState<string | null>(null);
  const [exportingListing, setExportingListing] = useState<string | null>(null);
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, string>>({});
  const [savingInventoryId, setSavingInventoryId] = useState<string | null>(null);
  const [historyOpenByListing, setHistoryOpenByListing] = useState<Record<string, boolean>>({});
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [lastExportListingId, setLastExportListingId] = useState<string | null>(null);
  const [syncingImages, setSyncingImages] = useState<string | null>(null);
  const [relistingListing, setRelistingListing] = useState<string | null>(null);
  const [openingTraderaLogin, setOpeningTraderaLogin] = useState<string | null>(null);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);
  const [listingToPurge, setListingToPurge] = useState<string | null>(null);
  const [isSyncImagesConfirmOpen, setIsSyncImagesConfirmOpen] = useState(false);

  const listingsQuery = useProductListings(product.id);
  const listings = listingsQuery.data ?? [];
  const isListingsLoading =
    listingsQuery.isLoading || (listingsQuery.isFetching && listings.length === 0);

  const actions = useProductListingsActionsImpl({
    inventoryOverrides,
    lastExportListingId,
    listings,
    onListingsUpdated,
    productId: product.id,
    refetchListingsQuery: listingsQuery.refetch,
    setDeletingFromBase,
    setError,
    setExportingListing,
    setExportLogs,
    setInventoryOverrides,
    setIsSyncImagesConfirmOpen,
    setLastExportListingId,
    setListingToDelete,
    setListingToPurge,
    setLogsOpen,
    setOpeningTraderaLogin,
    setPurgingListing,
    setRelistingListing,
    setSavingInventoryId,
    setSyncingImages,
  });

  const dataValue = useMemo<ProductListingsData>(
    () => ({
      product,
      listings,
      isLoading: isListingsLoading,
      error,
      setError,
    }),
    [product, listings, isListingsLoading, error]
  );

  const uiStateValue = useMemo<ProductListingsUIState>(
    () => ({
      deletingFromBase,
      purgingListing,
      exportingListing,
      savingInventoryId,
      syncingImages,
      relistingListing,
      openingTraderaLogin,
      inventoryOverrides,
      setInventoryOverrides,
      historyOpenByListing,
      setHistoryOpenByListing,
    }),
    [
      deletingFromBase,
      purgingListing,
      exportingListing,
      savingInventoryId,
      syncingImages,
      relistingListing,
      openingTraderaLogin,
      inventoryOverrides,
      historyOpenByListing,
    ]
  );

  const modalsValue = useMemo<ProductListingsModals>(
    () => ({
      listingToDelete,
      setListingToDelete,
      listingToPurge,
      setListingToPurge,
      isSyncImagesConfirmOpen,
      setIsSyncImagesConfirmOpen,
      onClose,
      onStartListing,
      filterIntegrationSlug,
    }),
    [
      listingToDelete,
      listingToPurge,
      isSyncImagesConfirmOpen,
      onClose,
      onStartListing,
      filterIntegrationSlug,
    ]
  );

  const logsValue = useMemo<ProductListingsLogs>(
    () => ({
      exportLogs,
      logsOpen,
      setLogsOpen,
      lastExportListingId,
    }),
    [exportLogs, logsOpen, lastExportListingId]
  );

  const actionsValue = useMemo<ProductListingsActions>(
    () => actions,
    [actions]
  );

  return (
    <DataContext.Provider value={dataValue}>
      <UIStateContext.Provider value={uiStateValue}>
        <ModalsContext.Provider value={modalsValue}>
          <LogsContext.Provider value={logsValue}>
            <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
          </LogsContext.Provider>
        </ModalsContext.Provider>
      </UIStateContext.Provider>
    </DataContext.Provider>
  );
}
