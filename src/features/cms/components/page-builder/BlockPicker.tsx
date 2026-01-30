"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import type { BlockDefinition } from "../../types/page-builder";
import { getAllowedBlockTypes } from "./section-registry";

interface BlockPickerProps {
  sectionType: string;
  onSelect: (blockType: string) => void;
}

export function BlockPicker({ sectionType, onSelect }: BlockPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const blockTypes = getAllowedBlockTypes(sectionType);

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

  if (blockTypes.length === 0) return null;

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
        className="flex h-5 w-5 items-center justify-center rounded text-gray-500 transition hover:bg-muted/50 hover:text-gray-300"
        aria-label="Add block"
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
            aria-label="Close block picker"
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md">
            <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
              Blocks
            </div>
            {blockTypes.map((def: BlockDefinition) => (
              <button
                key={def.type}
                type="button"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleSelect(def.type);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-gray-300 transition hover:bg-foreground/10"
              >
                <span>{def.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
