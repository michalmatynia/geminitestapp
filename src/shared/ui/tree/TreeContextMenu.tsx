"use client";

import React, { useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui";
import { cn } from "@/shared/utils";

export type TreeContextMenuItem = {
  id: string;
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  icon?: React.ReactNode;
  separator?: boolean;
};

export interface TreeContextMenuProps {
  items: TreeContextMenuItem[];
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
}

export function TreeContextMenu({
  items,
  align = "start",
  sideOffset = 4,
  className,
  children,
}: TreeContextMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const hasItems = useMemo(
    () => items.some((item) => item.separator || item.label),
    [items]
  );

  if (!hasItems) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span
          className={cn("contents", className)}
          onContextMenu={(event: React.MouseEvent): void => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          {children}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={sideOffset}>
        {items.map((item) => {
          if (item.separator) {
            return <DropdownMenuSeparator key={item.id} />;
          }
          return (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => item.onSelect?.()}
              disabled={item.disabled}
              className={cn(item.tone === "danger" && "text-red-300 focus:text-red-200")}
            >
              {item.icon ? <span className="mr-2 inline-flex size-4 items-center justify-center">{item.icon}</span> : null}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
