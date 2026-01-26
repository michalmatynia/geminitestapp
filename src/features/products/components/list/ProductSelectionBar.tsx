"use client";

import { memo, useCallback, useMemo } from "react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { CheckSquare, Settings2, Trash2, Store } from "lucide-react";
import type { ProductWithImages } from "@/types";
import type { RowSelectionState } from "@tanstack/react-table";

interface ProductSelectionBarProps {
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal?: boolean;
  onDeleteSelected?: () => Promise<void>;
  onAddToMarketplace?: () => void;
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
  const handleSelectAllGlobal = useCallback(async () => {
    if (!onSelectAllGlobal) return;
    try {
      await onSelectAllGlobal();
    } catch (error) {
      console.error("Failed to select all products:", error);
    }
  }, [onSelectAllGlobal]);

  const handleDeleteSelected = useCallback(async () => {
    if (!onDeleteSelected) return;
    try {
      await onDeleteSelected();
    } catch (error) {
      console.error("Failed to delete selected products:", error);
    }
  }, [onDeleteSelected]);

  const handleSelectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      newSelection[product.id] = true;
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      delete newSelection[product.id];
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectAll = useCallback(() => {
    setRowSelection({});
  }, [setRowSelection]);

  const hasSelection = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]).length > 0,
    [rowSelection]
  );

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Selection
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>On this Page</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleSelectPage}
              className="cursor-pointer"
            >
              Select All on Page
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectPage}
              className="cursor-pointer"
            >
              Deselect All on Page
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>On All Pages</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => void handleSelectAllGlobal()}
              className="cursor-pointer"
              disabled={!!loadingGlobal}
            >
              {loadingGlobal ? "Loading..." : "Select All Globally"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectAll}
              className="cursor-pointer"
            >
              Deselect All
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!hasSelection}
          >
            <Settings2 className="h-4 w-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              if (onAddToMarketplace) onAddToMarketplace();
            }}
            className="cursor-pointer gap-2"
          >
            <Store className="h-4 w-4" />
            Add to Marketplace
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleDeleteSelected()}
            className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
