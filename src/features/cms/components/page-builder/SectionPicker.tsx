"use client";

import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui";
import type { SectionDefinition } from "../../types/page-builder";
import { getAllSectionTypes } from "./section-registry";

interface SectionPickerProps {
  disabled?: boolean;
  onSelect: (sectionType: string) => void;
}

export function SectionPicker({ disabled, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const sectionTypes = getAllSectionTypes();

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className="h-7 gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs"
        disabled={disabled}
      >
        <Plus className="size-3.5" />
        Add section
      </Button>

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
            aria-label="Close section picker"
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md">
            <div className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
              Sections
            </div>
            {sectionTypes.map((def: SectionDefinition) => (
              <button
                key={def.type}
                type="button"
                onClick={() => handleSelect(def.type)}
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
