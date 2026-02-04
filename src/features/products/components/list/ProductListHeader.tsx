"use client";

import { Button, UnifiedSelect, useToast, Pagination, ConfirmDialog, SectionPanel, SectionHeader } from "@/shared/ui";
import { memo, useState } from "react";
import {
  PlusIcon,
  Package,
} from "lucide-react";
import { PRODUCT_ICON_MAP } from "@/shared/constants/product-icons";
import { TriggerButtonBar } from "@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar";


import type { Catalog } from "@/features/products/types";
import type { ProductDraft } from "@/features/products/types/drafts";

interface ProductListHeaderProps {
  onCreateProduct: () => void;
  onCreateFromDraft?: (draftId: string) => void;
  activeDrafts?: ProductDraft[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  nameLocale: "name_en" | "name_pl" | "name_de";
  setNameLocale: (locale: "name_en" | "name_pl" | "name_de") => void;
  languageOptions: Array<{ value: "name_en" | "name_pl" | "name_de"; label: string }>;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  currencyOptions: string[];
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
}

export const ProductListHeader = memo(function ProductListHeader({
  onCreateProduct,
  onCreateFromDraft,
  activeDrafts = [],
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  nameLocale,
  setNameLocale,
  languageOptions,
  currencyCode,
  setCurrencyCode,
  currencyOptions,
  catalogFilter,
  setCatalogFilter,
  catalogs,
}: ProductListHeaderProps) {
  const { toast } = useToast();
  const [showBase64AllConfirm, setShowBase64AllConfirm] = useState(false);
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  const handleConvertAllBase64 = async (): Promise<void> => {
    setIsConvertingAll(true);
    try {
      const res = await fetch("/api/products/images/base64/all", { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to convert images");
      }
      toast("Base64 images generated for all products.", { variant: "success" });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "An error occurred during conversion",
        { variant: "error" }
      );
    } finally {
      setIsConvertingAll(false);
      setShowBase64AllConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Products"
        actions={
          <div className="flex items-center gap-3">
            <TriggerButtonBar location="product_list" entityType="product" />
          </div>
        }
        eyebrow={
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Button
              onClick={onCreateProduct}
              className="h-14 w-14 rounded-full border border-white/20 p-0 hover:border-white/40"
              aria-label="Create new product"
            >
              <PlusIcon className="h-6 w-6" />
            </Button>
            <div className="flex flex-wrap items-center gap-1.5">
              {activeDrafts.map((draft: ProductDraft) => {
                const IconComponent = draft.icon ? PRODUCT_ICON_MAP[draft.icon] : null;
                return (
                  <Button
                    key={draft.id}
                    onClick={() => onCreateFromDraft?.(draft.id)}
                    className="h-8 w-8 rounded-full border border-white/20 bg-transparent p-0 text-white hover:border-white/40 hover:bg-white/10"
                    aria-label={`Create product from ${draft.name}`}
                    title={draft.name}
                  >
                    {IconComponent ? (
                      <IconComponent className="h-3.5 w-3.5" />
                    ) : (
                      <Package className="h-3.5 w-3.5" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        }
      />

      {/* Controls section */}
      <SectionPanel className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[12, 24, 48, 96]}
          showPageSize
        />

        {/* Filter selectors */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <UnifiedSelect
            value={nameLocale}
            onValueChange={(value: string) =>
              setNameLocale(value as "name_en" | "name_pl" | "name_de")
            }
            options={languageOptions}
            placeholder="Language"
            triggerClassName="w-full sm:w-44"
            ariaLabel="Select product name language"
          />

          <UnifiedSelect
            value={currencyCode}
            onValueChange={setCurrencyCode}
            options={currencyOptions.map((code: string) => ({ value: code, label: code }))}
            placeholder="Currency"
            triggerClassName="w-full sm:w-32"
            ariaLabel="Select currency"
          />

          <UnifiedSelect
            value={catalogFilter}
            onValueChange={setCatalogFilter}
            options={[
              { value: "all", label: "All catalogs" },
              { value: "unassigned", label: "Unassigned" },
              ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name }))
            ]}
            placeholder="Catalog"
            triggerClassName="w-full sm:w-52"
            ariaLabel="Filter by catalog"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowBase64AllConfirm(true)}
            disabled={isConvertingAll}
          >
            {isConvertingAll ? "Converting..." : "Convert all products"}
          </Button>
        </div>
      </SectionPanel>

      <ConfirmDialog
        open={showBase64AllConfirm}
        onOpenChange={setShowBase64AllConfirm}
        title="Generate Base64 images for all products?"
        description="This will generate Base64 images for every product and may take time on large catalogs."
        onConfirm={() => void handleConvertAllBase64()}
        confirmText="Convert"
        variant="success"
        loading={isConvertingAll}
      />
    </div>
  );
});
