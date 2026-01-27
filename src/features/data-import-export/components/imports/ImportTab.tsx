"use client";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import NextImage from "next/image";
import type {
  CatalogOption,
  ImportListItem,
  ImportResponse,
  InventoryOption,
  Template,
  ImportListStats,
} from "@/features/data-import-export/types/imports";

type ImportTabProps = {
  inventories: InventoryOption[];
  loadingInventories: boolean;
  inventoryId: string;
  setInventoryId: (value: string) => void;
  handleLoadInventories: () => void | Promise<void>;
  handleClearInventory: () => void | Promise<void>;
  limit: string;
  setLimit: (value: string) => void;
  catalogs: CatalogOption[];
  loadingCatalogs: boolean;
  catalogId: string;
  setCatalogId: (value: string) => void;
  importTemplateId: string;
  setImportTemplateId: (value: string) => void;
  importTemplates: Template[];
  loadingImportTemplates: boolean;
  imageMode: "links" | "download";
  setImageMode: (value: "links" | "download") => void;
  allowDuplicateSku: boolean;
  setAllowDuplicateSku: (value: boolean) => void;
  importing: boolean;
  handleImport: () => void | Promise<void>;
  importSearch: string;
  setImportSearch: (value: string) => void;
  uniqueOnly: boolean;
  setUniqueOnly: (value: boolean) => void;
  handleLoadImportList: () => void | Promise<void>;
  loadingImportList: boolean;
  importListStats: ImportListStats | null;
  importList: ImportListItem[];
  filteredImportList: ImportListItem[];
  selectedImportIds: Set<string>;
  setSelectedImportIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedImportCount: number;
  allVisibleSelected: boolean;
  isSomeVisibleSelected: boolean;
  lastResult: ImportResponse | null;
};

export function ImportTab({
  inventories,
  loadingInventories,
  inventoryId,
  setInventoryId,
  handleLoadInventories,
  handleClearInventory,
  limit,
  setLimit,
  catalogs,
  loadingCatalogs,
  catalogId,
  setCatalogId,
  importTemplateId,
  setImportTemplateId,
  importTemplates,
  loadingImportTemplates,
  imageMode,
  setImageMode,
  allowDuplicateSku,
  setAllowDuplicateSku,
  importing,
  handleImport,
  importSearch,
  setImportSearch,
  uniqueOnly,
  setUniqueOnly,
  handleLoadImportList,
  loadingImportList,
  importListStats,
  importList,
  filteredImportList,
  selectedImportIds,
  setSelectedImportIds,
  selectedImportCount,
  allVisibleSelected,
  isSomeVisibleSelected,
  lastResult,
}: ImportTabProps) {
  return (
    <>
      <div className="rounded-md border border-border bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Base.com</h2>
            <p className="mt-1 text-sm text-gray-400">
              Connected via Integrations. Load inventories to start importing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-xs text-green-400">Connected</span>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Button
              onClick={() => void handleLoadInventories()}
              disabled={loadingInventories}
              className="mt-6"
            >
              {loadingInventories ? "Loading..." : "Load inventories"}
            </Button>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-gray-400">Inventory</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={inventoryId}
                onChange={(event) => setInventoryId(event.target.value)}
                disabled={inventories.length === 0}
              >
                {inventories.length === 0 ? (
                  <option value="">Load inventories first</option>
                ) : (
                  inventories.map((inventory) => (
                    <option key={inventory.id} value={inventory.id}>
                      {inventory.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleClearInventory()}
              disabled={!inventoryId}
              className="mt-6"
            >
              Clear inventory
            </Button>
            <div className="w-40">
              <Label className="text-xs text-gray-400">Limit</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              >
                <option value="1">1</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-400">Catalog</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={catalogId}
                onChange={(event) => setCatalogId(event.target.value)}
                disabled={loadingCatalogs || catalogs.length === 0}
              >
                {catalogs.length === 0 ? (
                  <option value="">
                    {loadingCatalogs ? "Loading catalogs..." : "No catalogs"}
                  </option>
                ) : (
                  catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                      {catalog.isDefault ? " (Default)" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-400">Import template</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={importTemplateId}
                onChange={(event) => setImportTemplateId(event.target.value)}
                disabled={loadingImportTemplates || importTemplates.length === 0}
              >
                <option value="">No template</option>
                {importTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-400">Images</Label>
              <select
                className="mt-2 w-full rounded-md border border-border bg-gray-900 px-3 py-2 text-sm text-white"
                value={imageMode}
                onChange={(event) =>
                  setImageMode(
                    event.target.value === "download" ? "download" : "links"
                  )
                }
              >
                <option value="links">Import image links</option>
                <option value="download">Download product images</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Image links keep Base.com URLs. Download stores images in your
                uploads folder.
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-400">SKU Handling</Label>
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id="allowDuplicateSku"
                  checked={allowDuplicateSku} onCheckedChange={(checked) => setAllowDuplicateSku(Boolean(checked))}
                  className="h-4 w-4 rounded border bg-gray-900 text-blue-500"
                />
                <Label htmlFor="allowDuplicateSku" className="text-sm text-white">
                  Allow duplicate SKUs
                </Label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                When unchecked, products with existing SKUs will be skipped.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              Default catalog and price group must be configured before import.
            </p>
            <Button onClick={() => void handleImport()} disabled={importing}>
              {importing ? "Importing..." : "Import products"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-gray-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Import list preview
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Compare Base products with existing records by Base ID.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={importSearch}
              onChange={(event) => setImportSearch(event.target.value)}
              placeholder="Search products..."
              className="h-8 w-48 border-border bg-gray-900 text-xs text-white placeholder:text-gray-500"
            />
            <select
              className="rounded-md border border-border bg-gray-900 px-3 py-2 text-xs text-white"
              value={uniqueOnly ? "unique" : "all"}
              onChange={(event) =>
                setUniqueOnly(event.target.value === "unique")
              }
            >
              <option value="unique">Unique only</option>
              <option value="all">All products</option>
            </select>
            <Button
              onClick={() => void handleLoadImportList()}
              disabled={loadingImportList}
            >
              {loadingImportList ? "Loading..." : "Load import list"}
            </Button>
          </div>
        </div>

        {importListStats ? (
          <div className="mt-3 text-xs text-gray-400">
            Total: {importListStats.total} · Existing: {importListStats.existing} ·
            Available: {importListStats.available ?? importListStats.filtered} ·
            Showing: {importListStats.filtered} · Selected: {selectedImportCount}
            {importListStats.skuDuplicates ? (
              <span className="text-yellow-400">
                {" "}
                · SKU duplicates: {importListStats.skuDuplicates}
              </span>
            ) : null}
          </div>
        ) : null}

        {filteredImportList.length > 0 ? (
          <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border bg-card/70">
            <div className="grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-border px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 sticky top-0 bg-card z-10">
              <span className="flex items-center">
                <Checkbox
                  aria-label="Select all visible products"
                  checked={allVisibleSelected || (isSomeVisibleSelected && "indeterminate")}
                  onCheckedChange={(checked) => {
                    if (Boolean(checked)) {
                      setSelectedImportIds((prev) => {
                        const next = new Set(prev);
                        filteredImportList.forEach((item) => {
                          if (item.baseProductId) next.add(item.baseProductId);
                        });
                        return next;
                      });
                    } else {
                      setSelectedImportIds((prev) => {
                        const next = new Set(prev);
                        filteredImportList.forEach((item) => {
                          if (item.baseProductId) next.delete(item.baseProductId);
                        });
                        return next;
                      });
                    }
                  }}
                  className="h-3 w-3 rounded border bg-gray-900 text-emerald-500"
                />
              </span>
              <span>Img</span>
              <span>Base ID</span>
              <span>Product</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Status</span>
            </div>
            {filteredImportList.map((item) => (
              <div
                key={item.baseProductId}
                className={`grid grid-cols-[28px_50px_100px_1fr_90px_70px_60px_70px] gap-3 border-b border-gray-900/70 px-3 py-2 text-xs text-gray-300 last:border-b-0 items-center transition-colors ${
                  selectedImportIds.has(item.baseProductId)
                    ? "bg-emerald-500/5"
                    : "hover:bg-card/40"
                }`}
              >
                <Checkbox
                  checked={selectedImportIds.has(item.baseProductId)}
                  onCheckedChange={(checked) => {
                    const isChecked = Boolean(checked);
                    setSelectedImportIds((prev) => {
                      const next = new Set(prev);
                      if (isChecked) {
                        next.add(item.baseProductId);
                      } else {
                        next.delete(item.baseProductId);
                      }
                      return next;
                    });
                  }}
                  className="h-3 w-3 rounded border bg-gray-900 text-emerald-500"
                  aria-label={`Select ${item.name}`}
                />
                <div className="relative h-10 w-10 overflow-hidden rounded bg-gray-900">
                  {item.image ? (
                    <NextImage
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized={!item.image.includes('baselinker.com')}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-600">
                      No img
                    </div>
                  )}
                </div>
                <span className="truncate text-gray-400 font-mono text-[11px]">
                  {item.baseProductId}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-200">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="truncate text-[11px] text-gray-500">
                      {item.description}
                    </div>
                  )}
                </div>
                <span
                  className={`truncate font-mono text-[11px] ${
                    item.skuExists ? "text-yellow-400" : "text-gray-400"
                  }`}
                >
                  {item.sku ?? "—"}
                  {item.skuExists && (
                    <span className="ml-1" title="SKU already exists">
                      ⚠
                    </span>
                  )}
                </span>
                <span className="truncate">{item.price ?? 0}</span>
                <span className="truncate">{item.stock ?? 0}</span>
                <span
                  className={`text-[11px] font-medium ${
                    item.exists
                      ? "text-amber-400"
                      : item.skuExists
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {item.exists ? "Exists" : item.skuExists ? "SKU dup" : "New"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            {importList.length > 0
              ? "No matches for this search."
              : "No items loaded yet."}
          </p>
        )}
      </div>

      {lastResult ? (
        <div className="rounded-md border border-border bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-white">
            Last import summary
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            Imported {lastResult.imported} of {lastResult.total} product(s).
          </p>
          {lastResult.failed > 0 ? (
            <p className="mt-1 text-sm text-red-300">
              {lastResult.failed} failed.
            </p>
          ) : null}
          {lastResult.errors?.length ? (
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              {lastResult.errors.map((error, index) => (
                <p key={`${error}-${index}`}>• {error}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

    </>
  );
}
