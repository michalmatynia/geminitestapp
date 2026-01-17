"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { columns } from "@/components/columns";
import DebugPanel from "@/components/DebugPanel";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductTableFooter } from "@/components/products/ProductTableFooter";
import { ProductListHeader } from "@/components/products/ProductListHeader";
import { ProductFilters } from "@/components/products/ProductFilters";
import { useProductData } from "./hooks/useProductData";
import { useProductOperations } from "./hooks/useProductOperations";
import { useCatalogSync } from "./hooks/useCatalogSync";
import { ProductModals } from "./components/ProductModals";

function AdminPageInner() {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

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
  } = useProductData({ refreshTrigger });

  const {
    catalogs,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
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
    integrationBadgeIds,
    integrationBadgeStatuses,
    handleOpenCreateModal,
    handleCreateSuccess,
    handleEditSuccess,
    handleListProductSuccess,
  } = useProductOperations(setRefreshTrigger);

  const [nameLocale, setNameLocale] = useState<
    "name_en" | "name_pl" | "name_de"
  >("name_en");

  const handleOpenEditModal = useCallback((product: ProductWithImages) => {
    setEditingProduct(product);
  }, [setEditingProduct]);

  const handleOpenIntegrationsModal = useCallback((product: ProductWithImages) => {
    setIntegrationsProduct(product);
  }, [setIntegrationsProduct]);

  const handleSetActionError = useCallback((error: string | null) => {
    setActionError(error);
  }, [setActionError]);

  const handleSetPage = useCallback((p: number) => {
    setPage(p);
  }, [setPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
  }, [setPageSize]);

  const handleSetNameLocale = useCallback((locale: "name_en" | "name_pl" | "name_de") => {
    setNameLocale(locale);
  }, [setNameLocale]);

  const handleSetCurrencyCode = useCallback((code: string) => {
    setCurrencyCode(code);
  }, [setCurrencyCode]);

  const handleSetCatalogFilter = useCallback((filter: string) => {
    setCatalogFilter(filter);
  }, [setCatalogFilter]);

  const handleCloseCreate = useCallback(() => setIsCreateOpen(false), []);
  const handleCloseEdit = useCallback(() => setEditingProduct(null), []);
  const handleCloseIntegrations = useCallback(() => {
    setIntegrationsProduct(null);
    setShowListProductModal(false);
  }, []);
  const handleOpenListProduct = useCallback(() => setShowListProductModal(true), []);
  const handleCloseListProduct = useCallback(() => setShowListProductModal(false), []);

  useEffect(() => {
    setIsDebugOpen(searchParams.get("debug") === "true");
  }, [searchParams]);

  useEffect(() => {
    const stored = window.localStorage.getItem("productListNameLocale");
    if (stored === "name_en" || stored === "name_pl" || stored === "name_de") {
      setNameLocale(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("productListNameLocale", nameLocale);
  }, [nameLocale]);

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

  const tableFooter = useCallback((table: any) => (
    <ProductTableFooter
      table={table}
      setRefreshTrigger={setRefreshTrigger}
      setActionError={handleSetActionError}
    />
  ), [handleSetActionError, setRefreshTrigger]);

  return (
    <div className="container mx-auto py-10">
      {isDebugOpen && <DebugPanel />}
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <ProductListHeader
          onOpenCreateModal={handleOpenCreateModal}
          page={page}
          totalPages={totalPages}
          setPage={handleSetPage}
          pageSize={pageSize}
          setPageSize={handleSetPageSize}
          nameLocale={nameLocale}
          setNameLocale={handleSetNameLocale}
          currencyCode={currencyCode}
          setCurrencyCode={handleSetCurrencyCode}
          currencyOptions={currencyOptions}
          catalogFilter={catalogFilter}
          setCatalogFilter={handleSetCatalogFilter}
          catalogs={catalogs}
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
          productNameKey={nameLocale}
          onProductNameClick={handleOpenEditModal}
          onProductEditClick={handleOpenEditModal}
          onIntegrationsClick={handleOpenIntegrationsModal}
          integrationBadgeIds={integrationBadgeIds}
          integrationBadgeStatuses={integrationBadgeStatuses}
          getRowId={(row) => row.id}
          footer={tableFooter}
        />
      </div>

      <ProductModals 
        isCreateOpen={isCreateOpen}
        initialSku={initialSku}
        onCloseCreate={handleCloseCreate}
        onCreateSuccess={handleCreateSuccess}
        editingProduct={editingProduct}
        onCloseEdit={handleCloseEdit}
        onEditSuccess={handleEditSuccess}
        integrationsProduct={integrationsProduct}
        onCloseIntegrations={handleCloseIntegrations}
        showListProductModal={showListProductModal}
        onOpenListProduct={handleOpenListProduct}
        onCloseListProduct={handleCloseListProduct}
        onListProductSuccess={handleListProductSuccess}
      />
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
