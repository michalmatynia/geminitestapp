"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProfilerOnRenderCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/shared/ui/toast";
import { ProductTableSkeleton } from "@/features/products/components/list/ProductTableSkeleton";
import { useProductData } from "@/features/products/hooks/useProductData";
import { useProductOperations } from "@/features/products/hooks/useProductOperations";
import { useIntegrationOperations } from "@/features/integrations/hooks/useIntegrationOperations";
import { useCatalogSync } from "@/features/products/hooks/useCatalogSync";
import { useUserPreferences } from "@/features/products/hooks/useUserPreferences";
import { ProductListPanel } from "@/features/products/components/ProductListPanel";
import { ProductModals } from "@/features/products/components/ProductModals";
import { columns } from "@/features/products/components/list/ProductColumns";
import DebugPanel from "@/features/products/components/DebugPanel";
import type { RowSelectionState } from "@tanstack/react-table";
import type { ProductDraft } from "@/types/drafts";
import type { ProductWithImages } from "@/types";
import { logger } from "@/shared/utils/logger";

const SelectIntegrationModal = dynamic(
  () => import("@/features/integrations/components/listings/SelectIntegrationModal"),
  { ssr: false }
);

export function AdminProductsPage() {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeDrafts, setActiveDrafts] = useState<ProductDraft[]>([]);
  const [createDraft, setCreateDraft] = useState<ProductDraft | null>(null);

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
    const allowed = new Set(languageOptions.map((option) => option.value));
    if (allowed.has(preferences.nameLocale)) return;
    const nextLocale = allowed.has(fallbackNameLocale)
      ? fallbackNameLocale
      : languageOptions[0]!.value;
    updateNameLocale(nextLocale);
  }, [languageOptions, fallbackNameLocale, preferences.nameLocale, updateNameLocale]);

  // Load active drafts
  useEffect(() => {
    const loadActiveDrafts = async () => {
      try {
        const res = await fetch("/api/drafts");
        if (res.ok) {
          const drafts = await res.json() as ProductDraft[];
          setActiveDrafts(drafts.filter((d) => d.active !== false));
        }
      } catch (error) {
        console.error("Failed to load active drafts:", error);
      }
    };
    void loadActiveDrafts();
  }, []);

  const handleCreateFromDraft = useCallback((draftId: string) => {
    const run = async () => {
      try {
        const res = await fetch(`/api/drafts/${draftId}`);
        if (!res.ok) throw new Error("Failed to load draft");

        const draft = (await res.json()) as ProductDraft;
        setCreateDraft(draft);
        handleOpenCreateFromDraft(draft);
        toast(`Creating product from draft: ${draft.name}`, { variant: "success" });
      } catch (error) {
        console.error("Failed to load draft:", error);
        toast("Failed to load draft template", { variant: "error" });
      }
    };
    void run();
  }, [handleOpenCreateFromDraft, toast]);

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

  // State for integration selection modal
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  const getRowId = useCallback((row: ProductWithImages) => row.id, []);

  const handleSelectIntegrationFromModal = useCallback((integrationId: string, connectionId: string) => {
    setShowIntegrationModal(false);
    if (isMassListing) {
       const ids = Object.keys(rowSelection).filter(id => rowSelection[id]);
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
    setRefreshTrigger((prev) => prev + 1);
    toast("Products listed successfully.", { variant: "success" });
    void refreshListingBadges();
  }, [toast, refreshListingBadges]);

  const handleAddToMarketplace = useCallback(() => {
    setIsMassListing(true);
    setShowIntegrationModal(true);
  }, []);

  const [loadingGlobalSelection, setLoadingGlobalSelection] = useState(false);

  const handleSelectAllGlobal = useCallback(async () => {
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
      if (preferences.nameLocale) params.append("searchLanguage", preferences.nameLocale);

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
  }, [search, sku, minPrice, maxPrice, startDate, endDate, catalogFilter, preferences.nameLocale, toast]);

  const handleMassDelete = useCallback(async () => {
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
  }, [rowSelection, setActionError, toast]);

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

  const tableSkeleton = useMemo(
    () => <ProductTableSkeleton rows={pageSize} />,
    [pageSize]
  );

  const handleProductsTableRender = useCallback<ProfilerOnRenderCallback>(
    (_id, _phase, actualDuration, _baseDuration, _startTime, commitTime) => {
      if (!isDebugOpen || typeof performance === "undefined") return;
      performance.measure("products:tableRender", {
        start: commitTime - actualDuration,
        end: commitTime,
      });
    },
    [isDebugOpen]
  );

  return (
    <>
      {isDebugOpen && <DebugPanel />}
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
        loadError={loadError}
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
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        data={data}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        onSelectAllGlobal={handleSelectAllGlobal}
        loadingGlobal={loadingGlobalSelection}
        onDeleteSelected={handleMassDelete}
        onAddToMarketplace={handleAddToMarketplace}
        handleProductsTableRender={handleProductsTableRender}
        tableColumns={columns}
        setRefreshTrigger={setRefreshTrigger}
        productNameKey={preferences.nameLocale}
        priceGroups={priceGroups}
        onProductNameClick={handleOpenEditModal}
        onProductEditClick={handleOpenEditModal}
        onIntegrationsClick={handleOpenIntegrationsModal}
        onExportSettingsClick={handleOpenExportSettings}
        integrationBadgeIds={integrationBadgeIds}
        integrationBadgeStatuses={integrationBadgeStatuses}
        getRowId={getRowId}
        isLoading={isLoading}
        skeletonRows={tableSkeleton}
      />
      <ProductModals
        isCreateOpen={isCreateOpen}
        initialSku={initialSku}
        createDraft={createDraft}
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
