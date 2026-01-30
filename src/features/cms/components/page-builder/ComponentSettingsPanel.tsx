"use client";

import React, { useCallback, useMemo } from "react";
import { Settings, Trash2 } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui";
import type { SettingsField } from "../../types/page-builder";
import type { GsapAnimationConfig } from "../../types/animation";
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
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500">
            Select a section or block from the tree to edit its settings.
          </p>
        </div>
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
