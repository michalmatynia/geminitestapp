"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/shared/utils";

export interface PickerOption {
  type: string;
  label: string;
  icon?: React.ReactNode;
}

export interface PickerGroup {
  label: string;
  options: PickerOption[];
}

interface PickerDropdownProps {
  groups: PickerGroup[];
  onSelect: (type: string) => void;
  ariaLabel?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
}

export function PickerDropdown({
  groups,
  onSelect,
  ariaLabel = "Add item",
  triggerClassName,
  dropdownClassName,
}: PickerDropdownProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

  const allOptionsCount = groups.reduce((acc, group) => acc + group.options.length, 0);
  if (allOptionsCount === 0) return null;

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={-1}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded text-gray-500 transition hover:bg-muted/50 hover:text-gray-300",
          triggerClassName
        )}
        aria-label={ariaLabel}
      >
        <Plus className="size-3" />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close picker"
          />
          <div className={cn(
            "absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md",
            dropdownClassName
          )}>
            {groups.map((group, groupIdx) => (
              <React.Fragment key={group.label}>
                {groupIdx > 0 && <div className="my-1 border-t border-border/30" />}
                <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {group.label}
                </div>
                {group.options.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleSelect(opt.type);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-gray-300 transition hover:bg-foreground/10"
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
