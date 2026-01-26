"use client";

import { memo } from "react";
import {
  PlusIcon,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  Tag,
  Star,
  Heart,
  Zap,
  Gift,
  Truck,
  DollarSign,
  Award,
  Box,
  Sparkles,
  Pin,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { Catalog } from "@/features/products/types";
import type { ProductDraft } from "@/types/drafts";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  "shopping-cart": ShoppingCart,
  tag: Tag,
  star: Star,
  heart: Heart,
  zap: Zap,
  gift: Gift,
  truck: Truck,
  "dollar-sign": DollarSign,
  award: Award,
  box: Box,
  sparkles: Sparkles,
  pin: Pin,
};

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
  return (
    <div className="mb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onCreateProduct}
            className="h-14 w-14 rounded-full border border-white/20 p-0 hover:border-white/40"
            aria-label="Create new product"
          >
            <PlusIcon className="h-6 w-6" />
          </Button>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeDrafts.map((draft) => {
              const IconComponent = draft.icon ? iconMap[draft.icon] : null;
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
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
      </div>

      {/* Controls section */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Pagination controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Page
          </span>
          <Button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-2">
            <span className="min-w-fit text-sm font-medium">
              {page}
            </span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="min-w-fit text-sm text-muted-foreground">
              {totalPages}
            </span>
          </div>
          <Button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Page size selector */}
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-32"
              aria-label="Products per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[12, 24, 48, 96].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} per page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter selectors */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Select
            value={nameLocale}
            onValueChange={(value) =>
              setNameLocale(value as "name_en" | "name_pl" | "name_de")
            }
          >
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Select product name language"
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger
              className="w-full sm:w-32"
              aria-label="Select currency"
            >
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={catalogFilter} onValueChange={setCatalogFilter}>
            <SelectTrigger
              className="w-full sm:w-52"
              aria-label="Filter by catalog"
            >
              <SelectValue placeholder="Catalog" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All catalogs</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {catalogs.map((catalog) => (
                <SelectItem key={catalog.id} value={catalog.id}>
                  {catalog.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
});
