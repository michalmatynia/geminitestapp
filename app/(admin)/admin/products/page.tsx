"use client";

import { memo, Profiler, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { ProfilerOnRenderCallback } from "react";
import dynamic from "next/dynamic";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import DebugPanel from "@/components/DebugPanel";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductTableSkeleton } from "@/components/products/list/ProductTableSkeleton";
import { useProductData } from "./hooks/useProductData";
import { useProductOperations } from "./hooks/useProductOperations";
import { useCatalogSync } from "./hooks/useCatalogSync";
import { useUserPreferences } from "./hooks/useUserPreferences";
import { ProductModals } from "./components/ProductModals";
import { ProductWithImages } from "@/types";
import { useToast } from "@/components/ui/toast";
import { logger } from "@/lib/logger";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import type { ProductDraft } from "@/types/drafts";
import type { Catalog } from "@/types/products";
import type { PriceGroupWithDetails } from "@/types";

const ProductListHeader = dynamic(
  () =>
    import("@/components/products/list/ProductListHeader").then(
      (mod) => mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductFilters = dynamic(
  () =>
    import("@/components/products/list/ProductFilters").then(
      (mod) => mod.ProductFilters
    ),
  { ssr: false }
);

const ProductSelectionActions = dynamic(
  () =>
    import("@/components/products/list/ProductFilters").then(
      (mod) => mod.ProductSelectionActions
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
    handleOpenCreateFromDraft,
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

  // State for integration selection modal (opened by Operations -> Add to Marketplace)
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  const handleCloseIntegrationModal = useCallback(() => {
    setShowIntegrationModal(false);
    setIsMassListing(false);
  }, []);

  // Stable row ID getter to prevent DataTable re-renders
  const getRowId = useCallback((row: ProductWithImages) => row.id, []);

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

  const handleSelectAllGlobal = useCallback(async () => {
    const perfStartMark = "products:selectAllGlobal:start";
    const perfEndMark = "products:selectAllGlobal:end";
    const perfEnabled = isDebugOpen && typeof performance !== "undefined";
    if (perfEnabled) {
      performance.mark(perfStartMark);
    }
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
      if (perfEnabled) {
        performance.mark(perfEndMark);
        performance.measure("products:selectAllGlobal", perfStartMark, perfEndMark);
      }
      setLoadingGlobalSelection(false);
    }
  }, [search, sku, minPrice, maxPrice, startDate, endDate, catalogFilter, toast, isDebugOpen]);

  const handleMassDelete = useCallback(() => {
    const run = async () => {
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
    void run();
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
    <div className="container mx-auto py-10">
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
        onDeleteSelected={() => void handleMassDelete()}
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
    </div>
  );
}

type ProductListPanelProps = {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  nameLocale: "name_en" | "name_pl" | "name_de";
  setNameLocale: (locale: "name_en" | "name_pl" | "name_de") => void;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  currencyOptions: string[];
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
  search: string;
  setSearch: (value: string) => void;
  sku: string;
  setSku: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: (value: RowSelectionState) => void;
  onSelectAllGlobal: () => void;
  loadingGlobal: boolean;
  onDeleteSelected: () => void;
  onAddToMarketplace: () => void;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  productNameKey: "name_en" | "name_pl" | "name_de";
  priceGroups: PriceGroupWithDetails[];
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  getRowId: (row: ProductWithImages) => string | number;
  isLoading: boolean;
  skeletonRows: React.ReactNode;
};

const ProductListPanel = memo(function ProductListPanel({
  onCreateProduct,
  onCreateFromDraft,
  activeDrafts,
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  nameLocale,
  setNameLocale,
  currencyCode,
  setCurrencyCode,
  currencyOptions,
  catalogFilter,
  setCatalogFilter,
  catalogs,
  loadError,
  actionError,
  onDismissActionError,
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
  data,
  rowSelection,
  setRowSelection,
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
  onAddToMarketplace,
  handleProductsTableRender,
  tableColumns,
  setRefreshTrigger,
  productNameKey,
  priceGroups,
  onProductNameClick,
  onProductEditClick,
  onIntegrationsClick,
  onExportSettingsClick,
  integrationBadgeIds,
  integrationBadgeStatuses,
  getRowId,
  isLoading,
  skeletonRows,
}: ProductListPanelProps) {
  const headerProps = useMemo(
    () => ({
      onCreateProduct,
      onCreateFromDraft,
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      setPageSize,
      nameLocale,
      setNameLocale,
      currencyCode,
      setCurrencyCode,
      currencyOptions,
      catalogFilter,
      setCatalogFilter,
      catalogs,
    }),
    [
      onCreateProduct,
      onCreateFromDraft,
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      setPageSize,
      nameLocale,
      setNameLocale,
      currencyCode,
      setCurrencyCode,
      currencyOptions,
      catalogFilter,
      setCatalogFilter,
      catalogs,
    ]
  );

  const filtersProps = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  const tableProps = useMemo(
    () => ({
      columns: tableColumns,
      data,
      setRefreshTrigger,
      productNameKey,
      currencyCode,
      priceGroups,
      onProductNameClick,
      onProductEditClick,
      onIntegrationsClick,
      onExportSettingsClick,
      integrationBadgeIds,
      integrationBadgeStatuses,
      getRowId,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      isLoading,
      skeletonRows,
    }),
    [
      tableColumns,
      data,
      setRefreshTrigger,
      productNameKey,
      currencyCode,
      priceGroups,
      onProductNameClick,
      onProductEditClick,
      onIntegrationsClick,
      onExportSettingsClick,
      integrationBadgeIds,
      integrationBadgeStatuses,
      getRowId,
      rowSelection,
      setRowSelection,
      isLoading,
      skeletonRows,
    ]
  );

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <ProductListHeader {...headerProps} />
      {loadError && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
          <Button
            onClick={onDismissActionError}
            className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
          >
            Dismiss
          </Button>
        </div>
      )}
      <ProductFilters {...filtersProps} />
      <ProductSelectionActions
        data={data}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        onSelectAllGlobal={onSelectAllGlobal}
        loadingGlobal={loadingGlobal}
        onDeleteSelected={onDeleteSelected}
        onAddToMarketplace={onAddToMarketplace}
      />
      <Profiler id="ProductsTable" onRender={handleProductsTableRender}>
        <DataTable {...tableProps} />
      </Profiler>
    </div>
  );
});

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
