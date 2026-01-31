"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Trash2, Globe, FileText, MousePointer2, Monitor, Smartphone, PanelRightClose } from "lucide-react";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from "@/shared/ui";
import type { SettingsField, InspectorSettings } from "../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import type { PageStatus, CmsTheme, Slug } from "../../types";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { useCmsAllSlugs, useCmsSlugs, useCmsThemes } from "../../hooks/useCmsQueries";
import { CmsDomainSelector } from "../CmsDomainSelector";
import { getSectionDefinition, getBlockDefinition } from "./section-registry";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import { AnimationConfigPanel } from "./AnimationConfigPanel";
import { useSettingsMap } from "@/shared/hooks/useSettings";
import { parseJsonSetting } from "@/shared/utils/settings-json";
import { APP_EMBED_OPTIONS, APP_EMBED_SETTING_KEY, type AppEmbedId } from "@/features/app-embeds/lib/constants";

const PADDING_KEYS = new Set(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]);
const MARGIN_KEYS = new Set(["marginTop", "marginRight", "marginBottom", "marginLeft"]);

interface FieldGroup {
  kind: "single" | "padding" | "margin";
  fields: SettingsField[];
}

/** Groups consecutive padding / margin number fields so they render compactly. */
function groupSettingsFields(schema: SettingsField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  let paddingBuf: SettingsField[] = [];
  let marginBuf: SettingsField[] = [];

  const flushPadding = () => {
    if (paddingBuf.length) { groups.push({ kind: "padding", fields: paddingBuf }); paddingBuf = []; }
  };
  const flushMargin = () => {
    if (marginBuf.length) { groups.push({ kind: "margin", fields: marginBuf }); marginBuf = []; }
  };

  for (const field of schema) {
    if (PADDING_KEYS.has(field.key)) {
      flushMargin();
      paddingBuf.push(field);
    } else if (MARGIN_KEYS.has(field.key)) {
      flushPadding();
      marginBuf.push(field);
    } else {
      flushPadding();
      flushMargin();
      groups.push({ kind: "single", fields: [field] });
    }
  }
  flushPadding();
  flushMargin();
  return groups;
}

function renderFieldGroups(
  groups: FieldGroup[],
  settings: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void,
  resolveField?: (field: SettingsField) => SettingsField,
): React.ReactNode[] {
  return groups.map((group) => {
    if (group.kind === "single") {
      const raw = group.fields[0]!;
      const field = resolveField ? resolveField(raw) : raw;
      return (
        <SettingsFieldRenderer
          key={field.key}
          field={field}
          value={settings[field.key]}
          onChange={onChange}
        />
      );
    }
    const label = group.kind === "padding" ? "Padding" : "Margin";
    return (
      <div key={group.kind} className="space-y-1.5">
        <Label className="text-xs text-gray-400">{label}</Label>
        <div className="grid grid-cols-2 gap-2">
          {group.fields.map((field) => (
            <div key={field.key} className="space-y-0.5">
              <span className="text-[10px] text-gray-500 uppercase">
                {field.key.replace(/^(padding|margin)/, "")}
              </span>
              <Input
                type="number"
                value={(settings[field.key] as number) ?? field.defaultValue ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(field.key, Number(e.target.value))}
                className="text-xs h-7 px-1.5"
              />
            </div>
          ))}
        </div>
      </div>
    );
  });
}

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
  const settingsQuery = useSettingsMap();
  const [activeTab, setActiveTab] = useState<"settings" | "animation" | "connections">("settings");
  const isRowBlock = selectedBlock?.type === "Row" && selectedParentSection?.type === "Grid";
  const rowCount = useMemo(() => {
    if (!selectedParentSection || selectedParentSection.type !== "Grid") return 0;
    return selectedParentSection.blocks.filter((b) => b.type === "Row").length;
  }, [selectedParentSection]);
  const canRemoveRow = rowCount > 1;
  const rowIndex = useMemo(() => {
    if (!isRowBlock || !selectedParentSection || !selectedBlock) return null;
    const rows = selectedParentSection.blocks.filter((b) => b.type === "Row");
    const idx = rows.findIndex((b) => b.id === selectedBlock.id);
    return idx >= 0 ? idx + 1 : null;
  }, [isRowBlock, selectedParentSection, selectedBlock]);

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

  const handleCopySection = useCallback(() => {
    if (!selectedSection) return;
    dispatch({ type: "COPY_SECTION", sectionId: selectedSection.id });
  }, [selectedSection, dispatch]);

  const handleDuplicateSection = useCallback(() => {
    if (!selectedSection) return;
    dispatch({ type: "DUPLICATE_SECTION", sectionId: selectedSection.id });
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

  const handleRemoveRow = useCallback(() => {
    if (!isRowBlock || !selectedParentSection || !selectedBlock) return;
    dispatch({
      type: "REMOVE_GRID_ROW",
      sectionId: selectedParentSection.id,
      rowId: selectedBlock.id,
    });
  }, [isRowBlock, selectedParentSection, selectedBlock, dispatch]);

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
      } else if (key === "rows" && selectedSection.type === "Grid") {
        dispatch({
          type: "SET_GRID_ROWS",
          sectionId: selectedSection.id,
          rowCount: value as number,
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

  const enabledAppEmbeds = useMemo<AppEmbedId[]>(() => {
    if (!settingsQuery.data) return [];
    return parseJsonSetting<AppEmbedId[]>(
      settingsQuery.data.get(APP_EMBED_SETTING_KEY),
      []
    );
  }, [settingsQuery.data]);

  const appEmbedOptions = useMemo(() => {
    const options = APP_EMBED_OPTIONS.filter((option) => enabledAppEmbeds.includes(option.id)).map((option) => ({
      label: option.label,
      value: option.id,
    }));
    if (options.length > 0) return options;
    return [{ label: "No app embeds enabled", value: "" }];
  }, [enabledAppEmbeds]);

  // ---------------------------------------------------------------------------
  // Determine what to show
  // ---------------------------------------------------------------------------

  const sectionDef = selectedSection ? getSectionDefinition(selectedSection.type) : null;
  const blockDef = selectedBlock ? getBlockDefinition(selectedBlock.type) : null;
  const columnDef = selectedColumn ? getBlockDefinition("Column") : null;
  const inspectorSettings = state.inspectorSettings;

  const hasSelection = !!(selectedSection || selectedBlock || selectedColumn);
  const showConnectionsTab = state.inspectorEnabled;

  const selectedLabel = useMemo(() => {
    if (selectedSection) return sectionDef?.label ?? selectedSection.type;
    if (selectedColumn) return "Column";
    if (selectedBlock) return blockDef?.label ?? selectedBlock.type;
    return "";
  }, [selectedSection, selectedColumn, selectedBlock, sectionDef, blockDef]);

  const connectionSettings = useMemo(() => {
    const settings = selectedSection
      ? selectedSection.settings
      : selectedColumn
      ? selectedColumn.settings
      : selectedBlock
      ? selectedBlock.settings
      : null;
    const raw = (settings?.connection ?? {}) as {
      enabled?: boolean;
      source?: string;
      path?: string;
      fallback?: string;
    };
    return {
      enabled: raw.enabled ?? false,
      source: raw.source ?? "",
      path: raw.path ?? "",
      fallback: raw.fallback ?? "",
    };
  }, [selectedSection, selectedColumn, selectedBlock]);

  const updateConnectionSetting = useCallback(
    (patch: Partial<{ enabled: boolean; source: string; path: string; fallback: string }>) => {
      const next = { ...connectionSettings, ...patch };
      if (selectedSection && !selectedBlock && !selectedColumn) {
        handleSectionSettingChange("connection", next);
        return;
      }
      if (selectedColumn) {
        handleColumnSettingChange("connection", next);
        return;
      }
      if (selectedBlock) {
        handleBlockSettingChange("connection", next);
      }
    },
    [
      connectionSettings,
      selectedSection,
      selectedColumn,
      selectedBlock,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  useEffect(() => {
    if (state.inspectorEnabled) {
      setActiveTab((prev) => (prev === "connections" ? prev : "connections"));
      return;
    }
    setActiveTab((prev) => (prev === "connections" ? "settings" : prev));
  }, [state.inspectorEnabled]);

  const updateInspectorSetting = useCallback(
    (patch: Partial<InspectorSettings>) => {
      dispatch({ type: "UPDATE_INSPECTOR_SETTINGS", settings: patch });
    },
    [dispatch]
  );

  return (
    <aside className="flex w-80 flex-col border-l border-border bg-gray-900">
      {/* Header */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
            aria-label="Hide right panel"
            className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
          >
            <PanelRightClose className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch({ type: "TOGGLE_INSPECTOR" })}
            title={state.inspectorEnabled ? "Inspector (on)" : "Inspector"}
            aria-label="Toggle inspector"
            className={`h-6 w-6 p-0 ${
              state.inspectorEnabled
                ? "text-blue-300 bg-blue-500/10"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <MousePointer2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch({ type: "SET_PREVIEW_MODE", mode: "desktop" })}
            title="Desktop preview"
            aria-label="Desktop preview"
            className={`h-6 w-6 p-0 ${
              state.previewMode === "desktop"
                ? "text-blue-300 bg-blue-500/10"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Monitor className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch({ type: "SET_PREVIEW_MODE", mode: "mobile" })}
            title="Mobile preview"
            aria-label="Mobile preview"
            className={`h-6 w-6 p-0 ${
              state.previewMode === "mobile"
                ? "text-blue-300 bg-blue-500/10"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Smartphone className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-4 py-2">
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

      {state.inspectorEnabled && (
        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Inspector options</div>
          <div className="mt-2 space-y-2 text-xs text-gray-300">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={inspectorSettings.showTooltip}
                onCheckedChange={(value) => updateInspectorSetting({ showTooltip: value === true })}
              />
              Enable tooltip
            </label>
            <div className="rounded border border-border/40 bg-gray-800/30 px-2 py-2 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Tooltip content</div>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showStyleSettings}
                  onCheckedChange={(value) => updateInspectorSetting({ showStyleSettings: value === true })}
                />
                Style settings
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showStructureInfo}
                  onCheckedChange={(value) => updateInspectorSetting({ showStructureInfo: value === true })}
                />
                Structure info (zone + counts)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showIdentifiers}
                  onCheckedChange={(value) => updateInspectorSetting({ showIdentifiers: value === true })}
                />
                Identifiers (IDs)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showVisibilityInfo}
                  onCheckedChange={(value) => updateInspectorSetting({ showVisibilityInfo: value === true })}
                />
                Visibility info
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showConnectionInfo}
                  onCheckedChange={(value) => updateInspectorSetting({ showConnectionInfo: value === true })}
                />
                Connection info
              </label>
            </div>
          </div>
        </div>
      )}

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
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab((prev) => (prev === value ? prev : (value as "settings" | "animation" | "connections")))
          }
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="animation" className="flex-1 text-xs">Animation</TabsTrigger>
            {showConnectionsTab && (
              <TabsTrigger value="connections" className="flex-1 text-xs">Connections</TabsTrigger>
            )}
          </TabsList>

          {/* ---- Settings tab ---- */}
          <TabsContent value="settings" className="flex-1 overflow-y-auto p-4 mt-0">
            {selectedSection && sectionDef ? (
              <div className="space-y-4">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  Section: {sectionDef.label}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleCopySection}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Copy section
                  </Button>
                  <Button
                    onClick={handleDuplicateSection}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Duplicate section
                  </Button>
                </div>

                {renderFieldGroups(
                  groupSettingsFields(sectionDef.settingsSchema),
                  selectedSection.settings,
                  handleSectionSettingChangeWithGridColumns,
                )}

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

                {renderFieldGroups(
                  groupSettingsFields(columnDef.settingsSchema),
                  selectedColumn.settings,
                  handleColumnSettingChange,
                )}
              </div>
            ) : selectedBlock && blockDef ? (
              <div className="space-y-4">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  {isRowBlock && rowIndex ? (
                    <>Row {rowIndex}</>
                  ) : (
                    <>Block: {blockDef.label}</>
                  )}
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

                {renderFieldGroups(
                  groupSettingsFields(blockDef.settingsSchema),
                  selectedBlock.settings,
                  handleBlockSettingChange,
                  (field) =>
                    selectedBlock.type === "AppEmbed" && field.key === "appId"
                      ? { ...field, options: appEmbedOptions }
                      : field,
                )}

                <div className="border-t border-border/30 pt-4">
                  {isRowBlock ? (
                    <Button
                      onClick={handleRemoveRow}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={!canRemoveRow}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove row
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRemoveBlock}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove block
                    </Button>
                  )}
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
          {showConnectionsTab && (
            <TabsContent value="connections" className="flex-1 overflow-y-auto p-4 mt-0">
              {!hasSelection ? (
                <div className="text-xs text-gray-500">Select an element to configure connections.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                    Connection settings for <span className="text-gray-200">{selectedLabel}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Data source</Label>
                    <Input
                      value={connectionSettings.source}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateConnectionSetting({ source: e.target.value })
                      }
                      placeholder="e.g. product, collection, hero"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Key path</Label>
                    <Input
                      value={connectionSettings.path}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateConnectionSetting({ path: e.target.value })
                      }
                      placeholder="e.g. title, hero.text"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Fallback</Label>
                    <Input
                      value={connectionSettings.fallback}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateConnectionSetting({ fallback: e.target.value })
                      }
                      placeholder="Optional fallback text"
                      className="h-8 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <Checkbox
                      checked={connectionSettings.enabled}
                      onCheckedChange={(value) =>
                        updateConnectionSetting({ enabled: value === true })
                      }
                    />
                    Enable data connection
                  </label>
                </div>
              )}
            </TabsContent>
          )}
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
  const { activeDomainId } = useCmsDomainSelection();
  const slugsQuery = useCmsSlugs(activeDomainId);
  const allSlugsQuery = useCmsAllSlugs(Boolean(page));
  const [search, setSearch] = useState("");
  const [selectedSlugIds, setSelectedSlugIds] = useState<string[]>([]);
  const initializedRef = useRef(false);
  if (!page) return null;

  const allSlugs = allSlugsQuery.data ?? [];
  const domainSlugs = slugsQuery.data ?? [];
  const allSlugByValue = useMemo(() => {
    const map = new Map<string, Slug>();
    allSlugs.forEach((slug) => map.set(slug.slug, slug));
    return map;
  }, [allSlugs]);

  useEffect(() => {
    if (!allSlugs.length) return;
    if (initializedRef.current) return;
    const pageSlugValues = (page.slugs ?? []).map((s) => s.slug.slug);
    const ids = pageSlugValues
      .map((value) => allSlugByValue.get(value)?.id)
      .filter((value): value is string => Boolean(value));
    setSelectedSlugIds(ids);
    initializedRef.current = true;
  }, [allSlugs, allSlugByValue, page.id, page.slugs]);

  useEffect(() => {
    initializedRef.current = false;
  }, [page.id, activeDomainId]);

  useEffect(() => {
    if (!initializedRef.current) return;
    const selectedSlugs = selectedSlugIds
      .map((id) => allSlugs.find((slug) => slug.id === id))
      .filter(Boolean) as Slug[];
    dispatch({
      type: "UPDATE_PAGE_SLUGS",
      slugIds: selectedSlugIds,
      slugValues: selectedSlugs.map((slug) => slug.slug),
    });
  }, [selectedSlugIds, allSlugs, dispatch]);

  const domainSlugIds = useMemo(() => new Set(domainSlugs.map((slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo(() => {
    const byId = new Map(allSlugs.map((slug) => [slug.id, slug]));
    return selectedSlugIds
      .map((idValue) => byId.get(idValue))
      .filter((value): value is Slug => Boolean(value));
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    () => selectedSlugs.filter((slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );

  const filteredDomainSlugs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return domainSlugs;
    return domainSlugs.filter((slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, search]);

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

          <div className="rounded border border-border/40 bg-gray-800/20 px-3 py-2">
            <CmsDomainSelector label="Zone" triggerClassName="h-8 w-full" />
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

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Slugs for this zone</Label>
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search slugs..."
              className="h-8 text-xs"
            />
            <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-border/40 bg-gray-900/40 p-2">
              {filteredDomainSlugs.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  No slugs available for this zone.
                </p>
              ) : (
                filteredDomainSlugs.map((slug) => {
                  const checked = selectedSlugIds.includes(slug.id);
                  return (
                    <label key={slug.id} className="flex items-center gap-2 text-xs text-gray-200">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          setSelectedSlugIds((prev) =>
                            checked ? prev.filter((idValue) => idValue !== slug.id) : [...prev, slug.id]
                          );
                        }}
                      />
                      /{slug.slug}
                    </label>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-gray-500">{selectedSlugIds.length} selected</p>
          </div>

          {crossZoneSlugs.length > 0 ? (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                Cross-zone slugs
              </p>
              <p className="mt-1 text-[10px] text-amber-200/80">
                These slugs are not part of the current zone. Remove them or switch zones.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {crossZoneSlugs.map((slug) => (
                  <button
                    key={slug.id}
                    type="button"
                    onClick={() =>
                      setSelectedSlugIds((prev) => prev.filter((idValue) => idValue !== slug.id))
                    }
                    className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200"
                  >
                    /{slug.slug} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
