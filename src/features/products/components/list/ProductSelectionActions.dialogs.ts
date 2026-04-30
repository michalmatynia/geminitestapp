'use client';

import { useCallback, useState } from 'react';

import type { ProductSyncBulkResponse } from '@/shared/contracts/product-sync';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import type { ProductSelectionDialogController } from './ProductSelectionActions.types';

type ListingDialogController = Pick<
  ProductSelectionDialogController,
  | 'batchEditProductIds'
  | 'closeBatchEdit'
  | 'closeMarketplaceCopyDebrand'
  | 'closeParseActions'
  | 'closeProductScan'
  | 'closeScrapeProfiles'
  | 'closeTraderaStatusCheck'
  | 'isBatchEditOpen'
  | 'isMarketplaceCopyDebrandOpen'
  | 'isParseActionsOpen'
  | 'isProductScanOpen'
  | 'isScrapeProfilesOpen'
  | 'isTraderaStatusCheckOpen'
  | 'marketplaceCopyDebrandProductIds'
  | 'openBatchEdit'
  | 'openMarketplaceCopyDebrand'
  | 'openParseActions'
  | 'openProductScan'
  | 'openScrapeProfiles'
  | 'openTraderaStatusCheck'
  | 'productScanProductIds'
  | 'productScanProducts'
  | 'statusCheckProductIds'
  | 'statusCheckProducts'
>;

type BulkSyncDialogController = Pick<
  ProductSelectionDialogController,
  | 'bulkSyncResultProducts'
  | 'bulkSyncResults'
  | 'bulkSyncSetupProductIds'
  | 'bulkSyncSetupProducts'
  | 'closeBulkSyncResults'
  | 'closeBulkSyncSetup'
  | 'isBulkSyncResultsOpen'
  | 'isBulkSyncSetupOpen'
  | 'openBulkSyncSetup'
  | 'setBulkSyncResultsView'
>;

const useListingDialogController = (): ListingDialogController => {
  const [isTraderaStatusCheckOpen, setIsTraderaStatusCheckOpen] = useState(false);
  const [statusCheckProductIds, setStatusCheckProductIds] = useState<string[]>([]);
  const [statusCheckProducts, setStatusCheckProducts] = useState<ProductWithImages[]>([]);
  const [isProductScanOpen, setIsProductScanOpen] = useState(false);
  const [productScanProductIds, setProductScanProductIds] = useState<string[]>([]);
  const [productScanProducts, setProductScanProducts] = useState<ProductWithImages[]>([]);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchEditProductIds, setBatchEditProductIds] = useState<string[]>([]);
  const [isMarketplaceCopyDebrandOpen, setIsMarketplaceCopyDebrandOpen] = useState(false);
  const [marketplaceCopyDebrandProductIds, setMarketplaceCopyDebrandProductIds] =
    useState<string[]>([]);
  const [isParseActionsOpen, setIsParseActionsOpen] = useState(false);
  const [isScrapeProfilesOpen, setIsScrapeProfilesOpen] = useState(false);

  return {
    batchEditProductIds,
    closeBatchEdit: () => setIsBatchEditOpen(false),
    closeMarketplaceCopyDebrand: () => setIsMarketplaceCopyDebrandOpen(false),
    closeParseActions: () => setIsParseActionsOpen(false),
    closeProductScan: () => setIsProductScanOpen(false),
    closeScrapeProfiles: () => setIsScrapeProfilesOpen(false),
    closeTraderaStatusCheck: () => setIsTraderaStatusCheckOpen(false),
    isBatchEditOpen,
    isMarketplaceCopyDebrandOpen,
    isParseActionsOpen,
    isProductScanOpen,
    isScrapeProfilesOpen,
    isTraderaStatusCheckOpen,
    marketplaceCopyDebrandProductIds,
    openBatchEdit: (productIds) => {
      setBatchEditProductIds(productIds);
      setIsBatchEditOpen(true);
    },
    openMarketplaceCopyDebrand: (productIds) => {
      setMarketplaceCopyDebrandProductIds(productIds);
      setIsMarketplaceCopyDebrandOpen(true);
    },
    openParseActions: () => setIsParseActionsOpen(true),
    openProductScan: (productIds, products) => {
      setProductScanProductIds(productIds);
      setProductScanProducts(products);
      setIsProductScanOpen(true);
    },
    openScrapeProfiles: () => setIsScrapeProfilesOpen(true),
    openTraderaStatusCheck: (productIds, products) => {
      setStatusCheckProductIds(productIds);
      setStatusCheckProducts(products);
      setIsTraderaStatusCheckOpen(true);
    },
    productScanProductIds,
    productScanProducts,
    statusCheckProductIds,
    statusCheckProducts,
  };
};

const useBulkSyncDialogController = (): BulkSyncDialogController => {
  const [bulkSyncResults, setBulkSyncResults] = useState<ProductSyncBulkResponse | null>(null);
  const [bulkSyncResultProducts, setBulkSyncResultProducts] = useState<ProductWithImages[]>([]);
  const [isBulkSyncResultsOpen, setIsBulkSyncResultsOpen] = useState(false);
  const [isBulkSyncSetupOpen, setIsBulkSyncSetupOpen] = useState(false);
  const [bulkSyncSetupProductIds, setBulkSyncSetupProductIds] = useState<string[]>([]);
  const [bulkSyncSetupProducts, setBulkSyncSetupProducts] = useState<ProductWithImages[]>([]);

  const setBulkSyncResultsView = useCallback(
    (response: ProductSyncBulkResponse, products: ProductWithImages[]): void => {
      setBulkSyncResults(response);
      setBulkSyncResultProducts(products);
      setIsBulkSyncSetupOpen(false);
      setIsBulkSyncResultsOpen(true);
    },
    []
  );

  return {
    bulkSyncResultProducts,
    bulkSyncResults,
    bulkSyncSetupProductIds,
    bulkSyncSetupProducts,
    closeBulkSyncResults: () => setIsBulkSyncResultsOpen(false),
    closeBulkSyncSetup: () => setIsBulkSyncSetupOpen(false),
    isBulkSyncResultsOpen,
    isBulkSyncSetupOpen,
    openBulkSyncSetup: (productIds, products) => {
      setBulkSyncSetupProductIds(productIds);
      setBulkSyncSetupProducts(products);
      setIsBulkSyncSetupOpen(true);
    },
    setBulkSyncResultsView,
  };
};

export const useProductSelectionDialogController = (): ProductSelectionDialogController => ({
  ...useListingDialogController(),
  ...useBulkSyncDialogController(),
});
