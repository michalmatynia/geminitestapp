"use client";
import { ProfilerOnRenderCallback, useCallback, useEffect, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useToast, ConfirmDialog } from "@/shared/ui";
import { ProductTableSkeleton } from "@/features/products/components/list/ProductTableSkeleton";
import {
  useProductData,
  useBulkDeleteProductsMutation,
} from "@/features/products/hooks/useProductData";
import { useProductOperations } from "@/features/products/hooks/useProductOperations";
import { useIntegrationOperations } from "@/features/integrations/hooks/useIntegrationOperations";
import { useCatalogSync } from "@/features/products/hooks/useCatalogSync";
import { useUserPreferences } from "@/features/products/hooks/useUserPreferences";
import { useProductListSync } from "@/shared/hooks/sync/useBackgroundSync";
import { 
  useProductCacheWarmup, 
  useProductPrefetch, 
  useProductSync 
} from "@/features/products/hooks/useProductEnhancements";
import { ProductListPanel } from "@/features/products/components/ProductListPanel";
import { ProductModals } from "@/features/products/components/ProductModals";
import { getProductColumns } from "@/features/products/components/list/ProductColumns";
import DebugPanel from "@/features/products/components/DebugPanel";
import type { RowSelectionState } from "@tanstack/react-table";
import type { ProductDraft } from "@/features/products/types/drafts";
import type { ProductWithImages } from "@/features/products/types";
import { logger } from "@/shared/utils/logger";
import { useDrafts, draftKeys } from "@/features/drafter/hooks/useDrafts";
import { getProducts } from "@/features/products/api";

const SelectIntegrationModal = dynamic<import("@/features/integrations/components/listings/SelectIntegrationModal").SelectIntegrationModalProps>(
  () => import("@/features/integrations/components/listings/SelectIntegrationModal"),
  { ssr: false }
);

export function AdminProductsPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [createDraft, setCreateDraft] = useState<ProductDraft | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductWithImages | null>(null);
  const queryClient = useQueryClient();

  const { data: allDrafts = [] } = useDrafts();
  const activeDrafts = useMemo(() => allDrafts.filter((d: ProductDraft) => d.active !== false), [allDrafts]);

  // Enhanced TanStack Query features
  useProductCacheWarmup();
  useProductSync();
  useProductPrefetch();

  // Load user preferences
  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
  } = useUserPreferences();

  // Load catalog and currency data first
  const {
    catalogs,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    priceGroups,
    languageOptions,
    fallbackNameLocale,
  } = useCatalogSync(preferences.catalogFilter || "all");

  const {
    data,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    sku,
    setSku,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    catalogFilter,
    setCatalogFilter,
    loadError,
    isLoading,
  } = useProductData({
    refreshTrigger,
    initialCatalogFilter: preferences.catalogFilter,
    initialPageSize: preferences.pageSize,
    preferencesLoaded: !preferencesLoading,
    currencyCode,
    priceGroups,
    searchLanguage: preferences.nameLocale,
  });

  // Enable background sync for product list
  useProductListSync({
    search,
    sku,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    catalogFilter,
    page,
    pageSize,
  }, !isLoading);

  const {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
  } = useProductOperations(setRefreshTrigger);

  const {
    integrationsProduct,
    setIntegrationsProduct,
    showListProductModal,
    setShowListProductModal,
    listProductPreset,
    setListProductPreset,
    integrationBadgeIds,
    integrationBadgeStatuses,
    exportSettingsProduct,
    setExportSettingsProduct,
    refreshListingBadges,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useIntegrationOperations();

  // Initialize currency code from preferences
  useEffect(() => {
    if (!preferencesLoading && preferences.currencyCode) {
      setCurrencyCode(preferences.currencyCode);
    }
  }, [preferencesLoading, preferences.currencyCode, setCurrencyCode]);

  const handleOpenEditModal = useCallback((product: ProductWithImages) => {
    setEditingProduct(product);
  }, [setEditingProduct]);

  const handleOpenCreate = useCallback(() => {
    setCreateDraft(null);
    void handleOpenCreateModal();
  }, [handleOpenCreateModal]);

  const handleOpenIntegrationsModal = useCallback((product: ProductWithImages) => {
    setIntegrationsProduct(product);
  }, [setIntegrationsProduct]);

  const handleOpenExportSettings = useCallback((product: ProductWithImages) => {
    setExportSettingsProduct(product);
  }, [setExportSettingsProduct]);

  const handleSetPage = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    updatePageSize(size);
  }, [setPageSize, updatePageSize]);

  const handleSetNameLocale = useCallback((locale: "name_en" | "name_pl" | "name_de") => {
    updateNameLocale(locale);
  }, [updateNameLocale]);

  const handleSetCurrencyCode = useCallback((code: string) => {
    setCurrencyCode(code);
    updateCurrencyCode(code);
  }, [setCurrencyCode, updateCurrencyCode]);

  const handleSetCatalogFilter = useCallback((filter: string) => {
    setCatalogFilter(filter);
    updateCatalogFilter(filter);
  }, [setCatalogFilter, updateCatalogFilter]);

  useEffect(() => {
    if (!languageOptions.length) return;
    const allowed = new Set(languageOptions.map((option: { label: string; value: "name_en" | "name_pl" | "name_de" }) => option.value));
    if (allowed.has(preferences.nameLocale)) return;
    const nextLocale = (fallbackNameLocale && allowed.has(fallbackNameLocale))
      ? fallbackNameLocale
      : languageOptions[0]!.value;
    updateNameLocale(nextLocale);
  }, [languageOptions, fallbackNameLocale, preferences.nameLocale, updateNameLocale]);

  const handleCreateFromDraft = useCallback((draftId: string): void => {
    const run = async (): Promise<void> => {
      try {
        const draft = await queryClient.fetchQuery({
            queryKey: draftKeys.detail(draftId),
            queryFn: async () => {
                const res = await fetch(`/api/drafts/${draftId}`);
                if (!res.ok) throw new Error("Failed to load draft");
                return (await res.json()) as ProductDraft;
            }
        });
        setCreateDraft(draft);
        handleOpenCreateFromDraft(draft);
        toast(`Creating product from draft: ${draft.name}`, { variant: "success" });
      } catch (error) {
        console.error("Failed to load draft:", error);
        toast("Failed to load draft template", { variant: "error" });
      }
    };
    void run();
  }, [handleOpenCreateFromDraft, toast, queryClient]);

  const handleCloseCreate = useCallback(() => {
    setIsCreateOpen(false);
    setCreateDraft(null);
  }, [setIsCreateOpen]);
  const handleDismissActionError = useCallback(() => {
    setActionError(null);
  }, [setActionError]);
  const handleCloseEdit = useCallback(() => setEditingProduct(null), [setEditingProduct]);
  const handleCloseIntegrations = useCallback(() => {
    setIntegrationsProduct(null);
    setShowListProductModal(false);
  }, [setIntegrationsProduct, setShowListProductModal]);
  const handleCloseListProduct = useCallback(() => {
    setShowListProductModal(false);
    setListProductPreset(null);
  }, [setShowListProductModal, setListProductPreset]);

  const handleListProductSuccess = useCallback(() => {
    setListProductPreset(null);
    baseHandleListProductSuccess();
  }, [setListProductPreset, baseHandleListProductSuccess]);

  const handleStartListing = useCallback((integrationId: string, connectionId: string) => {
    setListProductPreset({ integrationId, connectionId });
    setShowListProductModal(true);
  }, [setListProductPreset, setShowListProductModal]);

  // Mass listing state
  const [massListIntegration, setMassListIntegration] = useState<{ integrationId: string; connectionId: string } | null>(null);
  const [massListProductIds, setMassListProductIds] = useState<string[]>([]);
  const [isMassListing, setIsMassListing] = useState(false);
  const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false);

  // State for integration selection modal
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const getRowId = useCallback((row: ProductWithImages): string => row.id, []);

  const handleSelectIntegrationFromModal = useCallback((integrationId: string, connectionId: string): void => {
    setShowIntegrationModal(false);
    if (isMassListing) {
       const ids = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
       setMassListProductIds(ids);
       setMassListIntegration({ integrationId, connectionId });
    }
  }, [isMassListing, rowSelection]);

  const handleCloseMassList = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
  }, []);

  const handleMassListSuccess = useCallback(() => {
    setMassListIntegration(null);
    setMassListProductIds([]);
    setIsMassListing(false);
    setRefreshTrigger((prev: number) => prev + 1);
    toast("Products listed successfully.", { variant: "success" });
    void refreshListingBadges();
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback(() => {
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, []);

  const [loadingGlobalSelection, setLoadingGlobalSelection] = useState(false);

  const bulkDeleteMutation = useBulkDeleteProductsMutation();

  const handleSelectAllGlobal = useCallback(async () => {
    setLoadingGlobalSelection(true);
    try {
      const filters = {
        search,
        sku,
        minPrice,
        maxPrice,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        catalogId: catalogFilter === "all" ? undefined : catalogFilter,
        searchLanguage: preferences.nameLocale,
      };

      const allProducts = await queryClient.fetchQuery({
        queryKey: ["products-all", filters],
        queryFn: () => getProducts(filters)
      });

      const newSelection: RowSelectionState = {};
      allProducts.forEach((p: ProductWithImages) => {
        newSelection[p.id] = true;
      });
      setRowSelection(newSelection);
      toast(`Selected ${allProducts.length} products.`, { variant: "success" });
    } catch (error) {
      console.error(error);
      toast("Failed to select all products", { variant: "error" });
    } finally {
      setLoadingGlobalSelection(false);
    }
  }, [search, sku, minPrice, maxPrice, startDate, endDate, catalogFilter, preferences.nameLocale, toast, queryClient]);

  const handleMassDelete = useCallback(async () => {
    const selectedProductIds = Object.keys(rowSelection).filter(
      (id: string) => rowSelection[id]
    );

    if (selectedProductIds.length === 0) return;

    try {
      await bulkDeleteMutation.mutateAsync(selectedProductIds);
      toast("Selected products deleted successfully.", { variant: "success" });
      setRowSelection({});
      setRefreshTrigger((prev: number) => prev + 1);
    } catch (error) {
      logger.error("Error during mass deletion:", error);
      setActionError(error instanceof Error ? error.message : "An error occurred during deletion.");
    }
  }, [rowSelection, setActionError, toast, bulkDeleteMutation]);

  const handleConfirmSingleDelete = useCallback(async () => {
    if (!productToDelete) return;
    try {
      await bulkDeleteMutation.mutateAsync([productToDelete.id]);
      toast("Product deleted successfully.", { variant: "success" });
      setRefreshTrigger((prev: number) => prev + 1);
    } catch (error) {
      logger.error("Error deleting product:", error);
      setActionError(error instanceof Error ? error.message : "An error occurred during deletion.");
    } finally {
      setProductToDelete(null);
    }
  }, [productToDelete, setActionError, toast, bulkDeleteMutation]);

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

  useEffect(() => {
    setIsMounted(true);
    // Force fresh product queries on mount to avoid showing stale persisted caches.
    void queryClient.invalidateQueries({ queryKey: ["products"] });
    void queryClient.invalidateQueries({ queryKey: ["products-count"] });
  }, [queryClient]);

  useEffect(() => {
    if (!lastEditedId) return;
    if (data.length === 0) return;
    const target = document.querySelector(`[data-row-id="${lastEditedId}"]`);
    if (target instanceof HTMLElement) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [data, lastEditedId]);

  const tableSkeletonRows = isMounted ? pageSize : 12;
  const tableSkeleton = useMemo(
    () => <ProductTableSkeleton rows={tableSkeletonRows} />,
    [tableSkeletonRows]
  );

  const handleProductsTableRender = useCallback<ProfilerOnRenderCallback>(
    (_id: string, _phase: "mount" | "update" | "nested-update", actualDuration: number, _baseDuration: number, _startTime: number, commitTime: number) => {
      if (!isDebugOpen || typeof performance === "undefined") return;
      performance.measure("products:tableRender", {
        start: commitTime - actualDuration,
        end: commitTime,
      });
    },
    [isDebugOpen]
  );

  const columns = useMemo(
    () => getProductColumns(preferences.thumbnailSource ?? "file"),
    [preferences.thumbnailSource]
  );

  return (
    <>
      {isDebugOpen && <DebugPanel />}
      <ConfirmDialog
        open={isMassDeleteConfirmOpen}
        onOpenChange={(open: boolean): void => setIsMassDeleteConfirmOpen(open)}
        onConfirm={(): void => {
          void handleMassDelete();
        }}
        title="Delete Products"
        description={`Are you sure you want to delete ${Object.keys(rowSelection).filter((id: string) => rowSelection[id]).length} selected products? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setProductToDelete(null);
        }}
        onConfirm={(): void => {
          void handleConfirmSingleDelete();
        }}
        title="Delete Product"
        description={`Are you sure you want to delete product "${productToDelete?.name_en || productToDelete?.name_pl || "this product"}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
      <ProductListPanel
        onCreateProduct={handleOpenCreate}
        onCreateFromDraft={handleCreateFromDraft}
        activeDrafts={activeDrafts}
        page={page}
        totalPages={totalPages}
        setPage={handleSetPage}
        pageSize={pageSize}
        setPageSize={handleSetPageSize}
        nameLocale={preferences.nameLocale}
        setNameLocale={handleSetNameLocale}
        languageOptions={languageOptions}
        currencyCode={currencyCode}
        setCurrencyCode={handleSetCurrencyCode}
        currencyOptions={currencyOptions}
        catalogFilter={catalogFilter}
        setCatalogFilter={handleSetCatalogFilter}
        catalogs={catalogs}
        loadError={loadError?.message || null}
        actionError={actionError}
        onDismissActionError={handleDismissActionError}
        search={search}
        setSearch={setSearch}
        sku={sku}
        setSku={setSku}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        startDate={startDate || ""}
        setStartDate={setStartDate}
        endDate={endDate || ""}
        setEndDate={setEndDate}
        data={isMounted ? data : []}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        onSelectAllGlobal={async (): Promise<void> => {
          await handleSelectAllGlobal();
        }}
        loadingGlobal={loadingGlobalSelection}
        onDeleteSelected={async (): Promise<void> => { await Promise.resolve(setIsMassDeleteConfirmOpen(true)); }}
        onAddToMarketplace={handleAddToMarketplace}
        handleProductsTableRender={handleProductsTableRender}
        tableColumns={columns}
        setRefreshTrigger={setRefreshTrigger}
        productNameKey={preferences.nameLocale}
        priceGroups={priceGroups}
        onProductNameClick={handleOpenEditModal}
        onProductEditClick={handleOpenEditModal}
        onProductDeleteClick={setProductToDelete}
        onIntegrationsClick={handleOpenIntegrationsModal}
        onExportSettingsClick={handleOpenExportSettings}
        integrationBadgeIds={integrationBadgeIds}
        integrationBadgeStatuses={integrationBadgeStatuses}
        getRowId={getRowId}
        isLoading={!isMounted || isLoading}
        skeletonRows={tableSkeleton}
      />
      <ProductModals
        isCreateOpen={isCreateOpen}
        initialSku={initialSku}
        createDraft={createDraft}
        initialCatalogId={
          catalogFilter !== "all" && catalogFilter !== "unassigned"
            ? catalogFilter
            : null
        }
        onCloseCreate={handleCloseCreate}
        onCreateSuccess={() => {
          handleCreateSuccess();
          setCreateDraft(null);
        }}
        editingProduct={editingProduct}
        onCloseEdit={handleCloseEdit}
        onEditSuccess={handleEditSuccess}
        onEditSave={handleEditSave}
        integrationsProduct={integrationsProduct}
        onCloseIntegrations={handleCloseIntegrations}
        onStartListing={handleStartListing}
        showListProductModal={showListProductModal}
        onCloseListProduct={handleCloseListProduct}
        onListProductSuccess={handleListProductSuccess}
        listProductPreset={listProductPreset}
        exportSettingsProduct={exportSettingsProduct}
        onCloseExportSettings={() => setExportSettingsProduct(null)}
        onListingsUpdated={() => void refreshListingBadges()}
        massListIntegration={massListIntegration}
        massListProductIds={massListProductIds}
        onCloseMassList={handleCloseMassList}
        onMassListSuccess={handleMassListSuccess}
      />

      {showIntegrationModal && (
        <SelectIntegrationModal
          onClose={handleCloseIntegrationModal}
          onSelect={handleSelectIntegrationFromModal}
        />
      )}
    </>
  );
}
