"use client";

import React, { useMemo, useCallback } from "react";
import { Button } from "./button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { CheckSquare, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/shared/utils";

interface SelectionBarProps<T> {
  data: T[];
  getRowId: (item: T) => string;
  rowSelection: Record<string, boolean>;
  setRowSelection: (selection: Record<string, boolean>) => void;
  onSelectAllGlobal?: () => Promise<void>;
  loadingGlobal?: boolean | undefined;
  actions?: React.ReactNode | undefined;
  onDeleteSelected?: () => Promise<void> | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

export function SelectionBar<T>({
  data,
  getRowId,
  rowSelection,
  setRowSelection,
  onSelectAllGlobal,
  loadingGlobal,
  actions,
  onDeleteSelected,
  className,
  label = "Selection",
}: SelectionBarProps<T>): React.JSX.Element {
  const selectedCount = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]).length,
    [rowSelection]
  );
  const hasSelection = selectedCount > 0;

  const handleSelectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      newSelection[getRowId(item)] = true;
    });
    setRowSelection(newSelection);
  }, [data, getRowId, rowSelection, setRowSelection]);

  const handleDeselectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      delete newSelection[getRowId(item)];
    });
    setRowSelection(newSelection);
  }, [data, getRowId, rowSelection, setRowSelection]);

  const handleDeselectAll = useCallback(() => {
    setRowSelection({});
  }, [setRowSelection]);

  return (
    <div className={cn("flex flex-wrap gap-2 sm:gap-3", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            {label}
            {selectedCount > 0 && (
              <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-muted-foreground">
                {selectedCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>On this Page</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={handleSelectPage} className="cursor-pointer">
              Select All on Page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeselectPage} className="cursor-pointer">
              Deselect All on Page
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>On All Pages</DropdownMenuLabel>
          <DropdownMenuGroup>
            {onSelectAllGlobal && (
              <DropdownMenuItem
                onClick={() => void onSelectAllGlobal()}
                className="cursor-pointer"
                disabled={!!loadingGlobal}
              >
                {loadingGlobal ? "Loading..." : "Select All Globally"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDeselectAll} className="cursor-pointer">
              Deselect All
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {(actions || onDeleteSelected) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={!hasSelection}>
              <Settings2 className="h-4 w-4" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {actions}
            {actions && onDeleteSelected && <DropdownMenuSeparator />}
            {onDeleteSelected && (
              <DropdownMenuItem
                onClick={() => void onDeleteSelected()}
                className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
