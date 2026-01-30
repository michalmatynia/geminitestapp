"use client";

import React, { useCallback, useMemo } from "react";
import { Settings, Trash2, Globe, FileText } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Label } from "@/shared/ui";
import type { SettingsField } from "../../types/page-builder";
import type { GsapAnimationConfig } from "../../types/animation";
import type { PageStatus } from "../../types";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { getSectionDefinition, getBlockDefinition } from "./section-registry";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import { AnimationConfigPanel } from "./AnimationConfigPanel";

export function ComponentSettingsPanel(): React.ReactNode {
  const {
    state,
    selectedSection,
    selectedBlock,
    selectedParentSection,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentColumn,
    selectedParentBlock,
    dispatch,
  } = usePageBuilder();

  // ---------------------------------------------------------------------------
  // Section settings handlers
  // ---------------------------------------------------------------------------

  const handleSectionSettingChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedSection) return;
      dispatch({
        type: "UPDATE_SECTION_SETTINGS",
        sectionId: selectedSection.id,
        settings: { [key]: value },
      });
    },
    [selectedSection, dispatch]
  );

  const handleRemoveSection = useCallback(() => {
    if (!selectedSection) return;
    dispatch({ type: "REMOVE_SECTION", sectionId: selectedSection.id });
  }, [selectedSection, dispatch]);

  // ---------------------------------------------------------------------------
  // Block settings handlers (context-aware: direct, column, or nested)
  // ---------------------------------------------------------------------------

  const handleBlockSettingChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedBlock || !selectedParentSection) return;

      if (selectedParentBlock && selectedParentColumn) {
        // Element inside a section-type block inside a column
        dispatch({
          type: "UPDATE_NESTED_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          parentBlockId: selectedParentBlock.id,
          blockId: selectedBlock.id,
          settings: { [key]: value },
        });
      } else if (selectedParentColumn) {
        // Block directly inside a column
        dispatch({
          type: "UPDATE_BLOCK_IN_COLUMN",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          blockId: selectedBlock.id,
          settings: { [key]: value },
        });
      } else {
        // Direct block inside a section
        dispatch({
          type: "UPDATE_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: { [key]: value },
        });
      }
    },
    [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentBlock, dispatch]
  );

  const handleRemoveBlock = useCallback(() => {
    if (!selectedBlock || !selectedParentSection) return;

    if (selectedParentBlock && selectedParentColumn) {
      // Element inside nested block
      dispatch({
        type: "REMOVE_ELEMENT_FROM_NESTED_BLOCK",
        sectionId: selectedParentSection.id,
        columnId: selectedParentColumn.id,
        parentBlockId: selectedParentBlock.id,
        elementId: selectedBlock.id,
      });
    } else if (selectedParentColumn) {
      // Block inside a column
      dispatch({
        type: "REMOVE_BLOCK_FROM_COLUMN",
        sectionId: selectedParentSection.id,
        columnId: selectedParentColumn.id,
        blockId: selectedBlock.id,
      });
    } else {
      // Direct block inside a section
      dispatch({
        type: "REMOVE_BLOCK",
        sectionId: selectedParentSection.id,
        blockId: selectedBlock.id,
      });
    }
  }, [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentBlock, dispatch]);

  // ---------------------------------------------------------------------------
  // Column settings handlers
  // ---------------------------------------------------------------------------

  const handleColumnSettingChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedColumn || !selectedColumnParentSection) return;
      dispatch({
        type: "UPDATE_COLUMN_SETTINGS",
        sectionId: selectedColumnParentSection.id,
        columnId: selectedColumn.id,
        settings: { [key]: value },
      });
    },
    [selectedColumn, selectedColumnParentSection, dispatch]
  );

  const handleSectionSettingChangeWithGridColumns = useCallback(
    (key: string, value: unknown) => {
      if (!selectedSection) return;
      if (key === "columns" && selectedSection.type === "Grid") {
        dispatch({
          type: "SET_GRID_COLUMNS",
          sectionId: selectedSection.id,
          columnCount: value as number,
        });
      } else {
        handleSectionSettingChange(key, value);
      }
    },
    [selectedSection, dispatch, handleSectionSettingChange]
  );

  // ---------------------------------------------------------------------------
  // Animation handler (routes to the correct settings updater)
  // ---------------------------------------------------------------------------

  const handleAnimationChange = useCallback(
    (config: GsapAnimationConfig) => {
      if (selectedSection && !selectedBlock && !selectedColumn) {
        handleSectionSettingChange("gsapAnimation", config);
      } else if (selectedColumn) {
        handleColumnSettingChange("gsapAnimation", config);
      } else if (selectedBlock) {
        handleBlockSettingChange("gsapAnimation", config);
      }
    },
    [selectedSection, selectedBlock, selectedColumn, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]
  );

  const currentAnimationConfig = useMemo((): GsapAnimationConfig | undefined => {
    if (selectedSection && !selectedBlock && !selectedColumn) {
      return selectedSection.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
    }
    if (selectedColumn) {
      return selectedColumn.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
    }
    if (selectedBlock) {
      return selectedBlock.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
    }
    return undefined;
  }, [selectedSection, selectedBlock, selectedColumn]);

  // ---------------------------------------------------------------------------
  // Determine what to show
  // ---------------------------------------------------------------------------

  const sectionDef = selectedSection ? getSectionDefinition(selectedSection.type) : null;
  const blockDef = selectedBlock ? getBlockDefinition(selectedBlock.type) : null;
  const columnDef = selectedColumn ? getBlockDefinition("Column") : null;

  const hasSelection = !!(selectedSection || selectedBlock || selectedColumn);

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Settings className="size-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-white">
          {selectedSection
            ? `${sectionDef?.label ?? selectedSection.type}`
            : selectedColumn
            ? "Column"
            : selectedBlock
            ? `${blockDef?.label ?? selectedBlock.type}`
            : "Settings"}
        </h3>
      </div>

      {/* Content */}
      {!state.currentPage ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500">
            Select a page first to start editing.
          </p>
        </div>
      ) : !hasSelection ? (
        <PageSettingsTab />
      ) : (
        <Tabs defaultValue="settings" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="animation" className="flex-1 text-xs">Animation</TabsTrigger>
          </TabsList>

          {/* ---- Settings tab ---- */}
          <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 mt-0">
            {selectedSection && sectionDef ? (
              <div className="space-y-4">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  Section: {sectionDef.label}
                </div>

                {sectionDef.settingsSchema.map((field: SettingsField) => (
                  <SettingsFieldRenderer
                    key={field.key}
                    field={field}
                    value={selectedSection.settings[field.key]}
                    onChange={handleSectionSettingChangeWithGridColumns}
                  />
                ))}

                <div className="border-t border-border/30 pt-4">
                  <Button
                    onClick={handleRemoveSection}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove section
                  </Button>
                </div>
              </div>
            ) : selectedColumn && columnDef ? (
              <div className="space-y-4">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  Column
                  {selectedColumnParentSection && (
                    <span className="ml-1 text-gray-500">
                      in {selectedColumnParentSection.type}
                    </span>
                  )}
                </div>

                {columnDef.settingsSchema.map((field: SettingsField) => (
                  <SettingsFieldRenderer
                    key={field.key}
                    field={field}
                    value={selectedColumn.settings[field.key]}
                    onChange={handleColumnSettingChange}
                  />
                ))}
              </div>
            ) : selectedBlock && blockDef ? (
              <div className="space-y-4">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  Block: {blockDef.label}
                  {selectedParentBlock && (
                    <span className="ml-1 text-gray-500">
                      in {selectedParentBlock.type}
                    </span>
                  )}
                  {!selectedParentBlock && selectedParentColumn && (
                    <span className="ml-1 text-gray-500">
                      in Column
                    </span>
                  )}
                  {!selectedParentBlock && !selectedParentColumn && selectedParentSection && (
                    <span className="ml-1 text-gray-500">
                      in {selectedParentSection.type}
                    </span>
                  )}
                </div>

                {blockDef.settingsSchema.map((field: SettingsField) => (
                  <SettingsFieldRenderer
                    key={field.key}
                    field={field}
                    value={selectedBlock.settings[field.key]}
                    onChange={handleBlockSettingChange}
                  />
                ))}

                <div className="border-t border-border/30 pt-4">
                  <Button
                    onClick={handleRemoveBlock}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove block
                  </Button>
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* ---- Animation tab ---- */}
          <TabsContent value="animation" className="flex-1 overflow-y-auto p-4 mt-0">
            <AnimationConfigPanel
              value={currentAnimationConfig}
              onChange={handleAnimationChange}
            />
          </TabsContent>
        </Tabs>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Page-level settings (status + SEO) — shown when no node is selected
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { label: string; value: PageStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

function PageSettingsTab(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const page = state.currentPage;
  if (!page) return null;

  const handleStatusChange = (status: PageStatus): void => {
    dispatch({ type: "SET_PAGE_STATUS", status });
  };

  const handleSeoChange = (key: string, value: string): void => {
    dispatch({ type: "UPDATE_SEO", seo: { [key]: value || undefined } });
  };

  return (
    <Tabs defaultValue="page" className="flex flex-1 flex-col overflow-hidden">
      <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
        <TabsTrigger value="page" className="flex-1 text-xs">Page</TabsTrigger>
        <TabsTrigger value="seo" className="flex-1 text-xs">SEO</TabsTrigger>
      </TabsList>

      {/* ---- Page tab ---- */}
      <TabsContent value="page" className="flex-1 overflow-y-auto p-4 mt-0">
        <div className="space-y-4">
          <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
            <FileText className="mr-1.5 inline size-3" />
            {page.name}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Status</Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt: { label: string; value: PageStatus }) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(): void => handleStatusChange(opt.value)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    page.status === opt.value
                      ? opt.value === "published"
                        ? "border-green-500 bg-green-500/10 text-green-400"
                        : "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-border/40 bg-gray-800/30 text-gray-400 hover:border-border/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {page.publishedAt && page.status === "published" && (
              <p className="text-[10px] text-gray-500">
                Published: {new Date(page.publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Select a section or block from the tree to edit its settings.
          </p>
        </div>
      </TabsContent>

      {/* ---- SEO tab ---- */}
      <TabsContent value="seo" className="flex-1 overflow-y-auto p-4 mt-0">
        <div className="space-y-4">
          <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
            <Globe className="mr-1.5 inline size-3" />
            Search Engine Optimization
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-title" className="text-xs text-gray-400">Page title</Label>
            <Input
              id="seo-title"
              value={page.seoTitle ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange("seoTitle", e.target.value)}
              placeholder={page.name}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-desc" className="text-xs text-gray-400">Meta description</Label>
            <Input
              id="seo-desc"
              value={page.seoDescription ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange("seoDescription", e.target.value)}
              placeholder="Page description for search engines"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-canonical" className="text-xs text-gray-400">Canonical URL</Label>
            <Input
              id="seo-canonical"
              value={page.seoCanonical ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange("seoCanonical", e.target.value)}
              placeholder="https://example.com/page"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-og" className="text-xs text-gray-400">OG Image URL</Label>
            <Input
              id="seo-og"
              value={page.seoOgImage ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange("seoOgImage", e.target.value)}
              placeholder="https://example.com/image.png"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seo-robots" className="text-xs text-gray-400">Robots meta</Label>
            <Input
              id="seo-robots"
              value={page.robotsMeta ?? "index,follow"}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleSeoChange("robotsMeta", e.target.value)}
              placeholder="index,follow"
              className="h-8 text-xs"
            />
          </div>

          {/* SEO Preview */}
          <div className="space-y-1.5 rounded border border-border/30 bg-gray-800/20 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Search preview</p>
            <p className="text-sm font-medium text-blue-400 truncate">
              {page.seoTitle || page.name}
            </p>
            <p className="text-xs text-gray-400 line-clamp-2">
              {page.seoDescription || "No description set"}
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
