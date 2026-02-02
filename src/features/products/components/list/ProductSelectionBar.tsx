"use client";

import { DropdownMenuItem, SelectionBar } from "@/shared/ui";
import { memo, useCallback } from "react";

import { Store } from "lucide-react";
import type { ProductWithImages } from "@/features/products/types";
import type { RowSelectionState } from "@tanstack/react-table";

interface ProductSelectionBarProps {
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  onSelectAllGlobal?: (() => Promise<void>) | undefined;
  loadingGlobal?: boolean | undefined;
  onDeleteSelected?: (() => Promise<void>) | undefined;
  onAddToMarketplace?: (() => void) | undefined;
  total?: number;
}

export const ProductSelectionBar = memo(function ProductSelectionBar({
  data,
  rowSelection,
  setRowSelection,
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
  onAddToMarketplace,
}: ProductSelectionBarProps) {
  const getRowId = useCallback((p: ProductWithImages) => p.id, []);

  return (
    <SelectionBar
      data={data}
      getRowId={getRowId}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
      {...(onSelectAllGlobal ? { onSelectAllGlobal } : {})}
      {...(loadingGlobal !== undefined ? { loadingGlobal } : {})}
      {...(onDeleteSelected ? { onDeleteSelected } : {})}
      className="mb-4"
      actions={
        <DropdownMenuItem
          onClick={() => {
            if (onAddToMarketplace) onAddToMarketplace();
          }}
          className="cursor-pointer gap-2"
        >
          <Store className="h-4 w-4" />
          Add to Marketplace
        </DropdownMenuItem>
      }
    />
  );
});
