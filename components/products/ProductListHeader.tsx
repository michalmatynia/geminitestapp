"use client";

import React, { memo } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Catalog } from "@/types/products";

interface ProductListHeaderProps {
  onOpenCreateModal: () => Promise<void>;
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
}

export const ProductListHeader = memo(function ProductListHeader({
  onOpenCreateModal,
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
}: ProductListHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            void onOpenCreateModal();
          }}
          className="size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90"
          aria-label="Create product"
        >
          <PlusIcon className="size-5" />
        </Button>
        <h1 className="text-3xl font-bold text-white">Products</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Page</span>
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded px-2 py-1 text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 transition disabled:opacity-50"
          >
            Next
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 border border-gray-700"
            aria-label="Products per page"
          >
            {[12, 24, 48].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
        <div className="w-44">
          <Select
            value={nameLocale}
            onValueChange={(value) =>
              setNameLocale(value as "name_en" | "name_pl" | "name_de")
            }
          >
            <SelectTrigger aria-label="Select product name language">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_en">English</SelectItem>
              <SelectItem value="name_pl">Polish</SelectItem>
              <SelectItem value="name_de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger aria-label="Select currency">
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
        </div>
        <div className="w-52">
          <Select value={catalogFilter} onValueChange={setCatalogFilter}>
            <SelectTrigger aria-label="Filter by catalog">
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