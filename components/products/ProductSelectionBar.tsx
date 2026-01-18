"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Settings2, Trash2 } from "lucide-react";
import type { ProductWithImages } from "@/types";
import type { RowSelectionState } from "@tanstack/react-table";

interface ProductSelectionBarProps {
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState) => void;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal?: boolean;
  onDeleteSelected?: () => Promise<void>;
}

export function ProductSelectionBar({
  data,
  rowSelection,
  setRowSelection,
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
}: ProductSelectionBarProps) {
  const handleSelectPage = () => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      newSelection[product.id] = true;
    });
    setRowSelection(newSelection);
  };

  const handleDeselectPage = () => {
    const newSelection = { ...rowSelection };
    data.forEach((product) => {
      delete newSelection[product.id];
    });
    setRowSelection(newSelection);
  };

  const handleDeselectAll = () => {
    setRowSelection({});
  };

  const hasSelection = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length > 0;

  return (
    <div className="mb-4 flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <CheckSquare className="h-4 w-4" />
            Checked products settings
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 border-gray-800 bg-gray-900 text-gray-200"
        >
          <DropdownMenuLabel>On this Page</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={handleSelectPage}
              className="cursor-pointer focus:bg-gray-800 focus:text-white"
            >
              Check All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectPage}
              className="cursor-pointer focus:bg-gray-800 focus:text-white"
            >
              Uncheck All
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-gray-800" />
          <DropdownMenuLabel>On All Pages</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => void onSelectAllGlobal()}
              className="cursor-pointer focus:bg-gray-800 focus:text-white"
              disabled={loadingGlobal}
            >
              {loadingGlobal ? "Loading..." : "Check All"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeselectAll}
              className="cursor-pointer focus:bg-gray-800 focus:text-white"
            >
              Uncheck All
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            disabled={!hasSelection}
          >
            <Settings2 className="h-4 w-4" />
            Operations
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 border-gray-800 bg-gray-900 text-gray-200"
        >
          <DropdownMenuItem
            onClick={() => {
              if (onDeleteSelected) void onDeleteSelected();
            }}
            className="cursor-pointer text-red-400 focus:bg-red-900/20 focus:text-red-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
