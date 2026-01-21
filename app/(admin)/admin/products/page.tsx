"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import DebugPanel from "@/components/DebugPanel";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "@/components/products/list/ProductFilters";
import { useProductData } from "./hooks/useProductData";
import { useProductOperations } from "./hooks/useProductOperations";
import { useCatalogSync } from "./hooks/useCatalogSync";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { ProductModals } from "./components/ProductModals";
import { ProductWithImages } from "@/types";
import { useToast } from "@/components/ui/toast";
import { logger } from "@/lib/logger";
import type { RowSelectionState } from "@tanstack/react-table";

const ProductListHeader = dynamic(
  () =>
    import("@/components/products/list/ProductListHeader").then(
      (mod) => mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductSelectionBar = dynamic(
  () =>
    import("@/components/products/list/ProductSelectionBar").then(
      (mod) => mod.ProductSelectionBar
    ),
  { ssr: false }
);

const SelectIntegrationModal = dynamic(
  () => import("@/components/products/modals/SelectIntegrationModal"),
  { ssr: false }
);

function AdminPageInner() {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Load user preferences
  const {
    preferences,
    loading: preferencesLoading,
    setNameLocale: updateNameLocale,
    setCatalogFilter: updateCatalogFilter,
    setCurrencyCode: updateCurrencyCode,
    setPageSize: updatePageSize,
  } = useUserPreferences();

  const {
    data,
    total,
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
  } = useProductData({
    refreshTrigger,
    initialCatalogFilter: preferences.catalogFilter,
    initialPageSize: preferences.pageSize,
    preferencesLoaded: !preferencesLoading,
  });

  const {
    catalogs,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    priceGroups,
  } = useCatalogSync(catalogFilter);

  const {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
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
    handleOpenCreateModal,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
    handleListProductSuccess: baseHandleListProductSuccess,
  } = useProductOperations(setRefreshTrigger);

  // Initialize currency code from preferences (catalog filter and page size are handled by useProductData)
  useEffect(() => {
    if (!preferencesLoading && preferences.currencyCode) {
      setCurrencyCode(preferences.currencyCode);
    }
  }, [preferencesLoading, preferences.currencyCode, setCurrencyCode]);

  const handleOpenEditModal = useCallback((product: ProductWithImages) => {
    setEditingProduct(product);
  }, [setEditingProduct]);

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

  const handleCloseCreate = useCallback(() => setIsCreateOpen(false), [setIsCreateOpen]);
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

  // State for integration selection modal (opened by Operations -> Add to Marketplace)
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const handleSelectIntegrationFromModal = useCallback((integrationId: string, connectionId: string) => {
    setShowIntegrationModal(false);
    if (isMassListing) {
       setMassListIntegration({ integrationId, connectionId });
       // Use currently selected row IDs
       const ids = Object.keys(rowSelection).filter(id => rowSelection[id]);
       setMassListProductIds(ids);
    }
    // If we ever needed single selection again, we would handle it here, but mass listing covers selected items
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
    setRefreshTrigger((prev) => prev + 1);
    // Unselect rows on success? Maybe keep them selected so user can do other things?
    // Usually mass actions clear selection or user clears manually. Let's keep selection for now or clear it?
    // User can manually clear.
    toast("Products listed successfully.", { variant: "success" });
    void refreshListingBadges();
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback(() => {
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, []);

  const [loadingGlobalSelection, setLoadingGlobalSelection] = useState(false);

  const handleSelectAllGlobal = async () => {
    setLoadingGlobalSelection(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (sku) params.append("sku", sku);
      if (minPrice !== undefined) params.append("minPrice", String(minPrice));
      if (maxPrice !== undefined) params.append("maxPrice", String(maxPrice));
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (catalogFilter && catalogFilter !== "all") params.append("catalogId", catalogFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch all products");

      const allProducts = (await res.json()) as ProductWithImages[];

      const newSelection: RowSelectionState = {};
      allProducts.forEach((p) => {
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
  };

  const handleMassDelete = async () => {
    logger.log("Mass delete initiated.");
    const selectedProductIds = Object.keys(rowSelection).filter(
      (id) => rowSelection[id]
    );

    if (selectedProductIds.length === 0) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedProductIds.length} selected products?`
      )
    ) {
      try {
        const deletePromises = selectedProductIds.map((id) =>
          fetch(`/api/products/${id}`, { method: "DELETE" })
        );
        const results = await Promise.all(deletePromises);
        const failedDeletions = results.filter((res) => !res.ok);

        if (failedDeletions.length > 0) {
          setActionError("Some products could not be deleted.");
        } else {
          toast("Selected products deleted successfully.", { variant: "success" });
        }
        setRowSelection({});
        setRefreshTrigger((prev) => prev + 1);
      } catch (error) {
        logger.error("Error during mass deletion:", error);
        setActionError("An error occurred during deletion.");
      }
    }
  };

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

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

  return (
    <div className="container mx-auto py-10">
      {isDebugOpen && <DebugPanel />}
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <ProductListHeader
          onCreateProduct={() => void handleOpenCreateModal()}
          page={page}
          totalPages={totalPages}
          setPage={handleSetPage}
          pageSize={pageSize}
          setPageSize={handleSetPageSize}
          nameLocale={preferences.nameLocale}
          setNameLocale={handleSetNameLocale}
          currencyCode={currencyCode}
          setCurrencyCode={handleSetCurrencyCode}
          currencyOptions={currencyOptions}
          catalogFilter={catalogFilter}
          setCatalogFilter={handleSetCatalogFilter}
          catalogs={catalogs}
        />
        <ProductSelectionBar
          data={data}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          onSelectAllGlobal={() => void handleSelectAllGlobal()}
          loadingGlobal={loadingGlobalSelection}
          total={total}
          onDeleteSelected={() => void handleMassDelete()}
          onAddToMarketplace={handleAddToMarketplace}
        />
        {loadError && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
            <Button
              onClick={() => setActionError(null)}
              className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
            >
              Dismiss
            </Button>
          </div>
        )}
        <ProductFilters
          search={search}
          setSearch={setSearch}
          sku={sku}
          setSku={setSku}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
        <DataTable
          columns={columns}
          data={data}
          setRefreshTrigger={setRefreshTrigger}
          productNameKey={preferences.nameLocale}
          currencyCode={currencyCode}
          priceGroups={priceGroups}
          onProductNameClick={handleOpenEditModal}
          onProductEditClick={handleOpenEditModal}
          onIntegrationsClick={handleOpenIntegrationsModal}
          onExportSettingsClick={handleOpenExportSettings}
          integrationBadgeIds={integrationBadgeIds}
          integrationBadgeStatuses={integrationBadgeStatuses}
          getRowId={(row) => row.id}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>

      <ProductModals
        isCreateOpen={isCreateOpen}
        initialSku={initialSku}
        initialCatalogId={catalogFilter !== "all" ? catalogFilter : undefined}
        onCloseCreate={handleCloseCreate}
        onCreateSuccess={handleCreateSuccess}
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
        onListingsUpdated={refreshListingBadges}
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
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
