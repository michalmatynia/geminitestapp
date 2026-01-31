"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui";
import type { PageZone, SectionDefinition } from "../../types/page-builder";
import { getSectionTypesForZone } from "./section-registry";
import { getTemplatesByCategory, type SectionTemplate } from "./section-templates";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";

interface SectionPickerProps {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
}

export function SectionPicker({ disabled, zone, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const sectionTypes = useMemo(() => getSectionTypesForZone(zone), [zone]);
  const groupedTemplates = useMemo(() => getTemplatesByCategory(zone), [zone]);
  const { dispatch } = usePageBuilder();

  const handleSelect = useCallback(
    (type: string) => {
      onSelect(type);
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleInsertTemplate = useCallback(
    (template: SectionTemplate) => {
      const section = template.create();
      section.zone = zone;
      dispatch({ type: "INSERT_TEMPLATE_SECTION", section });
      setIsOpen(false);
    },
    [dispatch, zone]
  );

  const templatePreviewGroups = useMemo(() => {
    if (!isOpen) return [];
    return Object.entries(groupedTemplates).map(([category, templates]) => ({
      category,
      templates: templates.map((template: SectionTemplate) => {
        const section = template.create();
        const blockTypes = section.blocks?.map((block) => block.type) ?? [];
        return { template, blockTypes, sectionType: section.type };
      }),
    }));
  }, [groupedTemplates, isOpen]);

  const renderPreview = (blockTypes: string[]) => {
    const items = blockTypes.slice(0, 4);
    const columns = Math.max(1, Math.min(items.length, 4));
    return (
      <div
        className="grid gap-1 rounded-md border border-border/40 bg-gray-900/60 p-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.length === 0 ? (
          <div className="col-span-full h-6 rounded bg-gray-800/60" />
        ) : (
          items.map((type: string, idx: number) => (
            <div
              key={`${type}-${idx}`}
              className="flex h-6 items-center justify-center rounded bg-gray-800/60 text-[9px] uppercase tracking-wide text-gray-400"
            >
              {type}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderAllowedBlocks = (types: string[]) =>
    types.length > 0 ? `Blocks: ${types.join(", ")}` : "No blocks";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 border-border/60 bg-card/40 text-xs text-gray-300 hover:bg-foreground/5 hover:text-gray-100"
          disabled={disabled}
        >
          <Plus className="size-3.5" />
          Add section
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Sections
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sectionTypes.map((def: SectionDefinition) => (
                <button
                  key={def.type}
                  type="button"
                  onClick={() => handleSelect(def.type)}
                  className="flex w-full flex-col gap-2 rounded-md border border-border/50 bg-card/60 p-3 text-left transition hover:bg-foreground/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">{def.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {def.type}
                    </span>
                  </div>
                  {renderPreview(def.allowedBlockTypes)}
                  <span className="text-xs text-gray-500">
                    {renderAllowedBlocks(def.allowedBlockTypes)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {templatePreviewGroups.length > 0 && (
            <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Templates
            </div>
            <div className="space-y-4">
              {templatePreviewGroups.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {group.category}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.templates.map(({ template, blockTypes, sectionType }) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => handleInsertTemplate(template)}
                        className="flex w-full flex-col gap-2 rounded-md border border-border/50 bg-card/60 p-3 text-left transition hover:bg-foreground/5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-200">{template.name}</span>
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            {sectionType}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{template.description}</span>
                        {renderPreview(blockTypes)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
