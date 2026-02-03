"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { AppModal, Button, ModalShell } from "@/shared/ui";
import type { BlockInstance, PageZone, SectionDefinition } from "../../types/page-builder";
import { getSectionTypesForZone } from "./section-registry";
import { getTemplatesByCategory, type SectionTemplate } from "./section-templates";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { GRID_TEMPLATE_SETTINGS_KEY, normalizeGridTemplates, cloneGridTemplateSection, type GridTemplateRecord } from "./grid-templates";

interface SectionPickerProps {
  disabled?: boolean;
  zone: PageZone;
  onSelect: (sectionType: string) => void;
}

type TemplatePreview = {
  template: SectionTemplate;
  blockTypes: string[];
  sectionType: string;
};

type TemplatePreviewGroup = {
  category: string;
  templates: TemplatePreview[];
};

export function SectionPicker({ disabled, zone, onSelect }: SectionPickerProps): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const sectionTypes = useMemo(() => getSectionTypesForZone(zone), [zone]);
  const { dispatch } = usePageBuilder();
  const settingsQuery = useSettingsMap();
  const primitiveTypes = useMemo(() => new Set(["Grid", "Block"]), []);
  const elementTypes = useMemo(() => new Set(["TextElement", "TextAtom", "ImageElement", "Model3DElement", "ButtonElement"]), []);
  const gridAllowed = useMemo(
    () => sectionTypes.some((def: SectionDefinition) => def.type === "Grid"),
    [sectionTypes]
  );
  const savedGridTemplates = useMemo<GridTemplateRecord[]>(() => {
    if (!settingsQuery.data) return [];
    const stored = parseJsonSetting<unknown>(
      settingsQuery.data.get(GRID_TEMPLATE_SETTINGS_KEY),
      []
    );
    return normalizeGridTemplates(stored);
  }, [settingsQuery.data]);
  const groupedTemplates = useMemo(() => {
    const base = getTemplatesByCategory(zone);
    if (!gridAllowed || savedGridTemplates.length === 0) return base;
    const savedTemplates: SectionTemplate[] = savedGridTemplates.map((record: GridTemplateRecord) => ({
      name: record.name,
      description: record.description && record.description.length > 0 ? record.description : "Saved grid template",
      category: "Saved grids",
      create: () => cloneGridTemplateSection(record.section),
    }));
    return {
      "Saved grids": savedTemplates,
      ...base,
    };
  }, [zone, gridAllowed, savedGridTemplates]);
  const primitives = useMemo(
    () => sectionTypes.filter((def: SectionDefinition) => primitiveTypes.has(def.type)),
    [sectionTypes, primitiveTypes]
  );
  const elements = useMemo(
    () => sectionTypes.filter((def: SectionDefinition) => elementTypes.has(def.type)),
    [sectionTypes, elementTypes]
  );
  const templates = useMemo(
    () => sectionTypes.filter((def: SectionDefinition) => !primitiveTypes.has(def.type) && !elementTypes.has(def.type)),
    [sectionTypes, primitiveTypes, elementTypes]
  );

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

  const templatePreviewGroups = useMemo((): TemplatePreviewGroup[] => {
    if (!isOpen) return [];
    return Object.entries(groupedTemplates).map(([category, templates]: [string, SectionTemplate[]]) => ({
      category,
      templates: templates.map((template: SectionTemplate) => {
        const section = template.create();
        const blockTypes = section.blocks?.map((block: BlockInstance) => block.type) ?? [];
        return { template, blockTypes, sectionType: section.type };
      }),
    }));
  }, [groupedTemplates, isOpen]);

  const renderPreview = (blockTypes: string[]): React.ReactNode => {
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

  const renderAllowedBlocks = (types: string[]): string =>
    types.length > 0 ? `Blocks: ${types.join(", ")}` : "No blocks";

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 border-border/60 bg-card/40 text-xs text-gray-300 hover:bg-foreground/5 hover:text-gray-100"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-3.5" />
        Add section
      </Button>
      <SharedModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add a section"
        size="lg"
        bodyClassName="h-[70vh]"
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Add a section</h2>
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-w-[100px] border border-white/20 hover:border-white/40"
            >
              Close
            </Button>
          </div>
        }
      >
          <div className="space-y-6">
          {primitives.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Primitives
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {primitives.map((def: SectionDefinition) => (
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
          )}

          {elements.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Elements
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {elements.map((def: SectionDefinition) => (
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
          )}

          {templates.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Templates
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((def: SectionDefinition) => (
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
          )}

          {templatePreviewGroups.length > 0 && (
            <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Templates
            </div>
            <div className="space-y-4">
              {templatePreviewGroups.map((group: TemplatePreviewGroup) => (
                <div key={group.category}>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {group.category}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.templates.map(({ template, blockTypes, sectionType }: TemplatePreview) => (
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
      </SharedModal>
    </>
  );
}
