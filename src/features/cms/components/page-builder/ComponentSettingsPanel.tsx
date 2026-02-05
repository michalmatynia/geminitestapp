"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Globe, FileText, MousePointer2, Monitor, Smartphone, PanelRightClose } from "lucide-react";
import { Button, PanelHeader, Tabs, TabsList, TabsTrigger, TabsContent, Input, Label, Checkbox, Switch, Textarea, UnifiedSelect, SectionPanel, useToast } from "@/shared/ui";
import type { SettingsField, InspectorSettings, BlockInstance, SectionInstance, PageZone } from "../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import type { PageStatus, Slug, PageSlugLink } from "../../types";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { useCmsDomainSelection } from "../../hooks/useCmsDomainSelection";
import { useCmsAllSlugs, useCmsSlugs, useUpdateSlug } from "../../hooks/useCmsQueries";
import { CmsDomainSelector } from "../CmsDomainSelector";
import { getSectionDefinition, getBlockDefinition, IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS, getImageBackgroundTargetOptions, type ImageBackgroundTarget } from "./section-registry";
import { SettingsFieldRenderer } from "./SettingsFieldRenderer";
import { AnimationConfigPanel } from "./AnimationConfigPanel";
import { CssAnimationConfigPanel } from "./CssAnimationConfigPanel";
import type { CssAnimationConfig } from "@/features/cms/types/css-animations";
import type { CustomCssAiConfig, CustomCssAiProvider } from "@/features/cms/types/custom-css-ai";
import { DEFAULT_CUSTOM_CSS_AI_CONFIG } from "@/features/cms/types/custom-css-ai";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { APP_EMBED_SETTING_KEY, type AppEmbedId, APP_EMBED_OPTIONS } from "@/features/app-embeds/lib/constants";
import { GRID_TEMPLATE_SETTINGS_KEY, normalizeGridTemplates, type GridTemplateRecord } from "./grid-templates";
import { logClientError } from "@/features/observability";
import { RangeField, SelectField } from "./shared-fields";
import { SECTION_TEMPLATES } from "./section-templates";
import {
  EVENT_CLICK_ACTION_OPTIONS,
  EVENT_CLICK_TARGET_OPTIONS,
  EVENT_HOVER_EFFECT_OPTIONS,
  EVENT_SCROLL_BEHAVIOR_OPTIONS,
  getEventEffectsConfig,
} from "@/features/cms/utils/event-effects";
import { useChatbotModels } from "@/features/ai/chatbot/hooks/useChatbotQueries";
import { useTeachingAgents } from "@/features/ai/agentcreator/teaching/hooks/useAgentTeaching";
import type { AgentTeachingAgentRecord } from "@/shared/types/agent-teaching";
import type { ChatMessage } from "@/shared/types/chatbot";

const PADDING_KEYS = new Set(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]);
const MARGIN_KEYS = new Set(["marginTop", "marginRight", "marginBottom", "marginLeft"]);
type AppEmbedOption = (typeof APP_EMBED_OPTIONS)[number];
const MANAGEMENT_FIELDS: SettingsField[] = [
  { key: "label", label: "Label", type: "text", defaultValue: "" },
  { key: "notes", label: "Internal notes", type: "text", defaultValue: "" },
];

function prependManagementFields(schema: SettingsField[]): SettingsField[] {
  const existing = new Set(schema.map((field: SettingsField) => field.key));
  const extra = MANAGEMENT_FIELDS.filter((field: SettingsField) => !existing.has(field.key));
  return extra.length ? [...extra, ...schema] : schema;
}

interface FieldGroup {
  kind: "single" | "padding" | "margin";
  fields: SettingsField[];
}

/** Groups consecutive padding / margin number fields so they render compactly. */
function groupSettingsFields(schema: SettingsField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  let paddingBuf: SettingsField[] = [];
  let marginBuf: SettingsField[] = [];

  const flushPadding = (): void => {
    if (paddingBuf.length) { groups.push({ kind: "padding", fields: paddingBuf }); paddingBuf = []; }
  };
  const flushMargin = (): void => {
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
  return groups.map((group: FieldGroup) => {
    if (group.kind === "single") {
      const raw = group.fields[0]!;
      const field = resolveField ? resolveField(raw) : raw;
      const legacyBackground =
        field.type === "background" && settings[field.key] === undefined
          ? ((): Record<string, unknown> | undefined => {
              const bgColor = settings["backgroundColor"];
              if (typeof bgColor !== "string") return undefined;
              const trimmed = bgColor.trim();
              if (!trimmed) return undefined;
              return { type: "solid", color: trimmed };
            })()
          : undefined;
      return (
        <SettingsFieldRenderer
          key={field.key}
          field={field}
          value={legacyBackground ?? settings[field.key]}
          onChange={onChange}
        />
      );
    }
    const label = group.kind === "padding" ? "Padding" : "Margin";
    return (
      <div key={group.kind} className="space-y-1.5">
        <Label className="text-xs text-gray-400">{label}</Label>
        <div className="grid grid-cols-2 gap-2">
          {group.fields.map((field: SettingsField) => (
            <div key={field.key} className="space-y-0.5">
              <span className="text-[10px] text-gray-500 uppercase">
                {field.key.replace(/^(padding|margin)/, "")}
              </span>
              <Input
                type="number"
                value={(settings[field.key] as number) ?? field.defaultValue ?? 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(field.key, Number(e.target.value))}
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
    selectedParentRow,
    selectedParentBlock,
    dispatch,
  } = usePageBuilder();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [gridTemplateName, setGridTemplateName] = useState<string>("");
  const [cssAiAppend, setCssAiAppend] = useState<boolean>(true);
  const [cssAiAutoApply, setCssAiAutoApply] = useState<boolean>(false);
  const [cssAiLoading, setCssAiLoading] = useState<boolean>(false);
  const [cssAiError, setCssAiError] = useState<string | null>(null);
  const [cssAiOutput, setCssAiOutput] = useState<string>("");
  const [cssAiDiffOnly, setCssAiDiffOnly] = useState<boolean>(true);
  const [contentAiProvider, setContentAiProvider] = useState<"model" | "agent">("model");
  const [contentAiModelId, setContentAiModelId] = useState<string>("");
  const [contentAiAgentId, setContentAiAgentId] = useState<string>("");
  const [contentAiPrompt, setContentAiPrompt] = useState<string>("");
  const [contentAiLoading, setContentAiLoading] = useState<boolean>(false);
  const [contentAiError, setContentAiError] = useState<string | null>(null);
  const [contentAiOutput, setContentAiOutput] = useState<string>("");
  const [contextPreviewOpen, setContextPreviewOpen] = useState<boolean>(false);
  const [contextPreviewTab, setContextPreviewTab] = useState<"page" | "element">("page");
  const [contextPreviewFull, setContextPreviewFull] = useState<boolean>(false);
  const [contextPreviewNonce, setContextPreviewNonce] = useState<number>(0);
  const cssAiAbortRef = useRef<AbortController | null>(null);
  const contentAiAbortRef = useRef<AbortController | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "animation" | "cssAnimation" | "events" | "connections" | "customCss" | "ai">("settings");
  const isRowBlock = selectedBlock?.type === "Row" && selectedParentSection?.type === "Grid";
  const isGridSection = selectedSection?.type === "Grid";
  const isBlockSection = selectedSection?.type === "Block";
  const showCustomCssTab = Boolean(isGridSection || isBlockSection || selectedColumn || selectedBlock);
  const customCssValue = useMemo((): string => {
    if (selectedSection && (isGridSection || isBlockSection)) {
      return (selectedSection.settings["customCss"] as string) || "";
    }
    if (selectedColumn) {
      return (selectedColumn.settings["customCss"] as string) || "";
    }
    if (selectedBlock) {
      return (selectedBlock.settings["customCss"] as string) || "";
    }
    return "";
  }, [selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection]);
  const customCssAiRaw = useMemo((): CustomCssAiConfig | undefined => {
    if (selectedSection && (isGridSection || isBlockSection)) {
      return selectedSection.settings["customCssAi"] as CustomCssAiConfig | undefined;
    }
    if (selectedColumn) {
      return selectedColumn.settings["customCssAi"] as CustomCssAiConfig | undefined;
    }
    if (selectedBlock) {
      return selectedBlock.settings["customCssAi"] as CustomCssAiConfig | undefined;
    }
    return undefined;
  }, [selectedSection, selectedColumn, selectedBlock, isGridSection, isBlockSection]);
  const customCssAiConfig = useMemo(
    (): CustomCssAiConfig => ({ ...DEFAULT_CUSTOM_CSS_AI_CONFIG, ...(customCssAiRaw ?? {}) }),
    [customCssAiRaw]
  );
  useEffect((): void => {
    if (cssAiLoading && cssAiAbortRef.current) {
      cssAiAbortRef.current.abort();
      cssAiAbortRef.current = null;
    }
    setCssAiOutput("");
    setCssAiError(null);
  }, [selectedSection?.id, selectedColumn?.id, selectedBlock?.id, cssAiLoading]);

  useEffect((): void => {
    if (contentAiLoading && contentAiAbortRef.current) {
      contentAiAbortRef.current.abort();
      contentAiAbortRef.current = null;
    }
    setContentAiOutput("");
    setContentAiError(null);
  }, [selectedSection?.id, selectedColumn?.id, selectedBlock?.id, contentAiLoading]);

    useEffect((): (() => void) => {

      return (): void => {

        if (cssAiAbortRef.current) {

          cssAiAbortRef.current.abort();

          cssAiAbortRef.current = null;

        }

        if (contentAiAbortRef.current) {

          contentAiAbortRef.current.abort();

          contentAiAbortRef.current = null;

        }

      };

    }, []);

  

    const modelsQuery = useChatbotModels({ enabled: showCustomCssTab });

    const teachingAgentsQuery = useTeachingAgents();

    const modelOptions = useMemo((): string[] => {

      const fromApi = (modelsQuery.data ?? []).filter((value: string) => value.trim().length > 0);

      return Array.from(new Set(fromApi));

    }, [modelsQuery.data]);

    const agentOptions = useMemo(

      (): Array<{ label: string; value: string }> => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),

      [teachingAgentsQuery.data]

    );

    const providerOptions = useMemo(

      (): Array<{ label: string; value: string }> => [

        { label: "AI model", value: "model" },

        { label: "Deepthinking agent", value: "agent" },

      ],

      []

    );
  const contextPlaceholder = "{{page_context}}\n{{element_context}}";
  const PAGE_CONTEXT_LIMIT = 6000;
  const ELEMENT_CONTEXT_LIMIT = 2500;

  useEffect((): void => {
    if (contentAiProvider !== "model") return;
    if (contentAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    setContentAiModelId(modelOptions[0]!);
  }, [contentAiProvider, contentAiModelId, modelOptions]);

  const stringifyContext = useCallback((value: unknown, limit?: number | null): string => {
    try {
      const json = JSON.stringify(value, null, 2);
      if (limit == null) return json;
      if (json.length <= limit) return json;
      return `${json.slice(0, limit)}\n...truncated...`;
    } catch {
      const fallback = (typeof value === "string" || typeof value === "number" || typeof value === "boolean") ? String(value) : "[complex value]";
      if (limit == null) return fallback;
      return fallback.length <= limit ? fallback : `${fallback.slice(0, limit)}...`;
    }
  }, []);

  const serializeBlock = useCallback((block: BlockInstance): Record<string, unknown> => ({
    id: block.id,
    type: block.type,
    settings: block.settings ?? {},
    blocks: (block.blocks ?? []).map(serializeBlock),
  }), []);

  const buildPageContext = useCallback((limit?: number | null): string => {
    const resolvedLimit = limit === undefined ? PAGE_CONTEXT_LIMIT : limit;
    if (!state.currentPage) return "No page loaded.";
    const pageContext = {
      page: {
        id: state.currentPage.id,
        name: state.currentPage.name,
        status: state.currentPage.status,
        themeId: state.currentPage.themeId,
        publishedAt: state.currentPage.publishedAt,
        slugs: state.currentPage.slugs ?? [],
        slugIds: state.currentPage.slugIds ?? [],
      },
      sections: state.sections.map((section: SectionInstance) => ({
        id: section.id,
        type: section.type,
        zone: section.zone,
        settings: section.settings ?? {},
        blocks: (section.blocks ?? []).map(serializeBlock),
      })),
    };
    return stringifyContext(pageContext, resolvedLimit);
  }, [state.currentPage, state.sections, stringifyContext, serializeBlock]);

  const selectedGridRow = useMemo<BlockInstance | null>(() => {
    if (!selectedParentSection || selectedParentSection.type !== "Grid" || !selectedParentColumn) return null;
    return (
      selectedParentSection.blocks.find(
        (block: BlockInstance) =>
          block.type === "Row" &&
          (block.blocks ?? []).some((column: BlockInstance) => column.id === selectedParentColumn.id)
      ) ?? null
    );
  }, [selectedParentSection, selectedParentColumn]);

  const buildElementContext = useCallback((limit?: number | null): string => {
    const resolvedLimit = limit === undefined ? ELEMENT_CONTEXT_LIMIT : limit;
    if (selectedSection && !selectedBlock && !selectedColumn) {
      return stringifyContext(
        {
          kind: "section",
          id: selectedSection.id,
          type: selectedSection.type,
          zone: selectedSection.zone,
          settings: selectedSection.settings ?? {},
          blocks: (selectedSection.blocks ?? []).map(serializeBlock),
        },
        resolvedLimit
      );
    }
    if (selectedColumn) {
      return stringifyContext(
        {
          kind: "column",
          id: selectedColumn.id,
          sectionId: selectedColumnParentSection?.id,
          rowId: selectedGridRow?.id,
          settings: selectedColumn.settings ?? {},
          blocks: (selectedColumn.blocks ?? []).map(serializeBlock),
        },
        resolvedLimit
      );
    }
    if (selectedBlock) {
      return stringifyContext(
        {
          kind: selectedBlock.type === "Row" ? "row" : "block",
          id: selectedBlock.id,
          type: selectedBlock.type,
          sectionId: selectedParentSection?.id,
          columnId: selectedParentColumn?.id,
          parentBlockId: selectedParentBlock?.id,
          settings: selectedBlock.settings ?? {},
          blocks: (selectedBlock.blocks ?? []).map(serializeBlock),
        },
        resolvedLimit
      );
    }
    return "No element selected.";
  }, [
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
    selectedColumnParentSection,
    selectedGridRow,
    stringifyContext,
    serializeBlock,
  ]);
  const rowCount = useMemo((): number => {
    if (!selectedParentSection || selectedParentSection.type !== "Grid") return 0;
    return selectedParentSection.blocks.filter((b: BlockInstance) => b.type === "Row").length;
  }, [selectedParentSection]);
  const canRemoveRow = rowCount > 1;
  const rowIndex = useMemo((): number | null => {
    if (!isRowBlock || !selectedParentSection || !selectedBlock) return null;
    const rows = selectedParentSection.blocks.filter((b: BlockInstance) => b.type === "Row");
    const idx = rows.findIndex((b: BlockInstance) => b.id === selectedBlock.id);
    return idx >= 0 ? idx + 1 : null;
  }, [isRowBlock, selectedParentSection, selectedBlock]);
  const rowHeightMode = (selectedBlock?.settings?.["heightMode"] as string) || "inherit";
  const rowSettingsForRender = useMemo<Record<string, unknown> | null>(() => {
    if (!isRowBlock || !selectedBlock) return null;
    if (rowHeightMode !== "inherit") return selectedBlock.settings;
    return { ...selectedBlock.settings, height: 0 };
  }, [isRowBlock, selectedBlock, rowHeightMode]);
  const columnHeightMode = (selectedColumn?.settings?.["heightMode"] as string) || "inherit";
  const columnSettingsForRender = useMemo<Record<string, unknown> | null>(() => {
    if (!selectedColumn) return null;
    if (columnHeightMode !== "inherit") return selectedColumn.settings;
    return { ...selectedColumn.settings, height: 0 };
  }, [selectedColumn, columnHeightMode]);
  const isGridImageElement =
    selectedBlock?.type === "ImageElement" &&
    selectedParentSection?.type === "Grid" &&
    !selectedParentBlock;
  const imageBackgroundSrc = (selectedBlock?.settings?.["src"] as string) || "";
  // ---------------------------------------------------------------------------
  // Background mode for ImageElement
  // ---------------------------------------------------------------------------
  const isImageElementInContainer =
    selectedBlock?.type === "ImageElement" &&
    selectedParentSection?.type === "Grid" &&
    !selectedParentBlock;
  const currentBackgroundTarget = (selectedBlock?.settings?.["backgroundTarget"] as ImageBackgroundTarget) || "none";
  const isInBackgroundMode = currentBackgroundTarget !== "none";
  const backgroundTargetOptions = useMemo(() => {
    if (!isImageElementInContainer) return [];
    const hasGrid = selectedParentSection?.type === "Grid";
    const hasRow = Boolean(selectedGridRow);
    const hasColumn = Boolean(selectedParentColumn);
    return getImageBackgroundTargetOptions(hasGrid, hasRow, hasColumn);
  }, [isImageElementInContainer, selectedParentSection, selectedGridRow, selectedParentColumn]);

  // ---------------------------------------------------------------------------
  // Section settings handlers
  // ---------------------------------------------------------------------------

  const handleSectionSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedSection) return;
      const nextSettings = {
        [key]: value,
        ...(key === "background" ? { backgroundColor: "" } : {}),
      };
      dispatch({
        type: "UPDATE_SECTION_SETTINGS",
        sectionId: selectedSection.id,
        settings: nextSettings,
      });
    },
    [selectedSection, dispatch]
  );

  const handleRemoveSection = useCallback((): void => {
    if (!selectedSection) return;
    dispatch({ type: "REMOVE_SECTION", sectionId: selectedSection.id });
  }, [selectedSection, dispatch]);

  const handleCopySection = useCallback((): void => {
    if (!selectedSection) return;
    dispatch({ type: "COPY_SECTION", sectionId: selectedSection.id });
  }, [selectedSection, dispatch]);

  const handleDuplicateSection = useCallback((): void => {
    if (!selectedSection) return;
    dispatch({ type: "DUPLICATE_SECTION", sectionId: selectedSection.id });
  }, [selectedSection, dispatch]);

  // ---------------------------------------------------------------------------
  // Block settings handlers (context-aware: direct, column, or nested)
  // ---------------------------------------------------------------------------

  const handleBlockSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedBlock || !selectedParentSection) return;
      const shouldResetRowHeight = selectedBlock.type === "Row" && key === "heightMode" && value === "inherit";
      const nextSettings = {
        [key]: value,
        ...(key === "background" ? { backgroundColor: "" } : {}),
        ...(shouldResetRowHeight ? { height: 0 } : {}),
      };

      if (selectedParentBlock && selectedParentColumn) {
        // Element inside a section-type block inside a column
        dispatch({
          type: "UPDATE_NESTED_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          parentBlockId: selectedParentBlock.id,
          blockId: selectedBlock.id,
          settings: nextSettings,
        });
      } else if (selectedParentBlock) {
        // Element inside a nested block within a section (e.g. slideshow frame)
        dispatch({
          type: "UPDATE_SECTION_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          parentBlockId: selectedParentBlock.id,
          blockId: selectedBlock.id,
          settings: nextSettings,
        });
      } else if (selectedParentColumn) {
        // Block directly inside a column
        dispatch({
          type: "UPDATE_BLOCK_IN_COLUMN",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          blockId: selectedBlock.id,
          settings: nextSettings,
        });
      } else if (selectedParentRow) {
        // Block directly inside a Row container
        dispatch({
          type: "UPDATE_SECTION_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          parentBlockId: selectedParentRow.id,
          blockId: selectedBlock.id,
          settings: nextSettings,
        });
      } else {
        // Direct block inside a section
        dispatch({
          type: "UPDATE_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
          settings: nextSettings,
        });
      }
    },
    [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock, dispatch]
  );

  const handleEventSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (selectedBlock) {
        handleBlockSettingChange(key, value);
        return;
      }
      if (selectedSection) {
        handleSectionSettingChange(key, value);
      }
    },
    [selectedBlock, selectedSection, handleBlockSettingChange, handleSectionSettingChange]
  );

  // ---------------------------------------------------------------------------
  // Column settings handlers
  // ---------------------------------------------------------------------------

  const handleColumnSettingChange = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedColumn || !selectedColumnParentSection) return;
      const nextSettings: Record<string, unknown> = {
        [key]: value,
        ...(key === "background" ? { backgroundColor: "" } : {}),
      };
      if (key === "heightMode" && value === "inherit") {
        nextSettings.height = 0;
      }
      dispatch({
        type: "UPDATE_COLUMN_SETTINGS",
        sectionId: selectedColumnParentSection.id,
        columnId: selectedColumn.id,
        settings: nextSettings,
      });
    },
    [selectedColumn, selectedColumnParentSection, dispatch]
  );

  const handleCustomCssChange = useCallback(
    (value: string): void => {
      if (selectedSection && (isGridSection || isBlockSection)) {
        handleSectionSettingChange("customCss", value);
        return;
      }
      if (selectedColumn) {
        handleColumnSettingChange("customCss", value);
        return;
      }
      if (selectedBlock) {
        handleBlockSettingChange("customCss", value);
      }
    },
    [
      selectedSection,
      selectedColumn,
      selectedBlock,
      isGridSection,
      isBlockSection,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  const handleCustomCssAiChange = useCallback(
    (patch: Partial<CustomCssAiConfig>): void => {
      const next: CustomCssAiConfig = { ...customCssAiConfig, ...patch };
      if (selectedSection && (isGridSection || isBlockSection)) {
        handleSectionSettingChange("customCssAi", next);
        return;
      }
      if (selectedColumn) {
        handleColumnSettingChange("customCssAi", next);
        return;
      }
      if (selectedBlock) {
        handleBlockSettingChange("customCssAi", next);
      }
    },
    [
      customCssAiConfig,
      selectedSection,
      selectedColumn,
      selectedBlock,
      isGridSection,
      isBlockSection,
      handleSectionSettingChange,
      handleColumnSettingChange,
      handleBlockSettingChange,
    ]
  );

  const extractCssFromResponse = useCallback((raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const fenceMatch = trimmed.match(/```(?:css)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }
    return trimmed.replace(/```/g, "").trim();
  }, []);

  const extractJsonFromResponse = useCallback((raw: string): Record<string, unknown> | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }, []);

  const buildDiffLines = useCallback(
    (
      prev: string,
      next: string,
      limit: number = 220
    ): { lines: Array<{ type: "add" | "remove" | "same"; text: string }>; truncated: boolean } => {
      const prevLines = prev.split("\n");
      const nextLines = next.split("\n");
      const max = Math.max(prevLines.length, nextLines.length);
      const lines: Array<{ type: "add" | "remove" | "same"; text: string }> = [];
      let truncated = false;
      for (let index = 0; index < max; index += 1) {
        const prevLine = prevLines[index];
        const nextLine = nextLines[index];
        if (prevLine === nextLine) {
          if (prevLine !== undefined) {
            lines.push({ type: "same", text: prevLine });
          }
        } else {
          if (prevLine !== undefined) {
            lines.push({ type: "remove", text: prevLine });
          }
          if (nextLine !== undefined) {
            lines.push({ type: "add", text: nextLine });
          }
        }
        if (lines.length >= limit) {
          truncated = true;
          break;
        }
      }
      return { lines, truncated };
    },
    []
  );

  const cssDiff = useMemo(() => {
    if (!cssAiOutput) return null;
    return buildDiffLines(customCssValue, cssAiOutput);
  }, [cssAiOutput, customCssValue, buildDiffLines]);

  const cssDiffLines = useMemo(() => {
    if (!cssDiff) return [];
    return cssAiDiffOnly ? cssDiff.lines.filter((line: { type: "add" | "remove" | "same"; text: string }) => line.type !== "same") : cssDiff.lines;
  }, [cssDiff, cssAiDiffOnly]);

  const cssDiffStats = useMemo(() => {
    if (!cssDiff) return { added: 0, removed: 0, same: 0 };
    return cssDiff.lines.reduce(
      (acc: { added: number; removed: number; same: number }, line: { type: "add" | "remove" | "same"; text: string }) => {
        if (line.type === "add") acc.added += 1;
        else if (line.type === "remove") acc.removed += 1;
        else acc.same += 1;
        return acc;
      },
      { added: 0, removed: 0, same: 0 }
    );
  }, [cssDiff]);

  const pageContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return "";
     
    contextPreviewNonce;
    return buildPageContext(contextPreviewFull ? null : undefined);
  }, [contextPreviewOpen, contextPreviewFull, contextPreviewNonce, buildPageContext]);

  const elementContextPreview = useMemo((): string => {
    if (!contextPreviewOpen) return "";
     
    contextPreviewNonce;
    return buildElementContext(contextPreviewFull ? null : undefined);
  }, [contextPreviewOpen, contextPreviewFull, contextPreviewNonce, buildElementContext]);

  const handleCopyContext = useCallback(
    async (value: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(value);
        toast("Context copied.", { variant: "success" });
      } catch (error) {
        toast("Failed to copy context.", { variant: "error" });
        logClientError(error, { context: { source: "ComponentSettingsPanel", action: "copyContext" } });
      }
    },
    [toast]
  );

  const buildCssAiPrompt = useCallback((): string => {
    const basePrompt = (customCssAiConfig.prompt ?? "").trim();
    const pageContext = buildPageContext();
    const elementContext = buildElementContext();
    const defaultPrompt =
      "Generate a CSS snippet for the selected element. Return only CSS without explanations.";
    const promptBody = basePrompt.length > 0 ? basePrompt : defaultPrompt;
    const hasPagePlaceholder = /{{\s*page_context\s*}}/i.test(promptBody);
    const hasElementPlaceholder = /{{\s*element_context\s*}}/i.test(promptBody);
    const resolved = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*element_context\s*}}/gi, elementContext);
    if (hasPagePlaceholder || hasElementPlaceholder) {
      return resolved;
    }
    return `${resolved}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [customCssAiConfig.prompt, buildPageContext, buildElementContext]);

  const handleGenerateCss = useCallback(async (): Promise<void> => {
    if (cssAiLoading) return;
    setCssAiError(null);
    setCssAiLoading(true);
    setCssAiOutput("");
    try {
      const prompt = buildCssAiPrompt();
      if (!prompt.trim()) {
        throw new Error("Prompt is empty.");
      }

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: "You are a CSS assistant. Return only valid CSS without code fences or explanations.",
        },
        { role: "user", content: prompt },
      ];

      const controller = new AbortController();
      cssAiAbortRef.current = controller;

      const provider = customCssAiConfig.provider ?? "model";
      const modelId = (customCssAiConfig.modelId ?? "").trim() || modelOptions[0] || "";
      const agentId = (customCssAiConfig.agentId ?? "").trim();
      if (provider === "model" && !modelId) {
        throw new Error("Select an AI model first.");
      }
      if (provider === "agent" && !agentId) {
        throw new Error("Select a Deepthinking agent first.");
      }

      const res = await fetch("/api/cms/css-ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Streaming request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneSignal = false;

      const processEvent = (raw: string): void => {
        const lines = raw.split("\n").map((line: string) => line.trim());
        const dataLine = lines.find((line: string) => line.startsWith("data:"));
        if (!dataLine) return;
        try {
          const payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as {
            delta?: string;
            done?: boolean;
            error?: string;
          };
          if (payload.error) {
            throw new Error(payload.error);
          }
          if (payload.delta) {
            accumulated += payload.delta;
            setCssAiOutput(accumulated);
          }
          if (payload.done) {
            doneSignal = true;
          }
        } catch (error) {
          throw error;
        }
      };

      while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          processEvent(chunk);
          if (doneSignal) break;
        }
      }
      if (buffer.trim() && !doneSignal) {
        processEvent(buffer);
      }
      if (doneSignal) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      }

      const finalCss = extractCssFromResponse(accumulated);
      if (!finalCss) throw new Error("No CSS returned.");
      setCssAiOutput(finalCss);
      if (cssAiAutoApply) {
        const nextCss = cssAiAppend
          ? [customCssValue.trim(), finalCss].filter(Boolean).join("\n\n")
          : finalCss;
        handleCustomCssChange(nextCss);
        toast(`CSS generated and applied (${provider}).`, { variant: "success" });
      } else {
        toast(`CSS generated from ${provider}.`, { variant: "success" });
      }
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        setCssAiError("Generation cancelled.");
        toast("Generation cancelled.", { variant: "info" });
      } else {
        const message = error instanceof Error ? error.message : "Failed to generate CSS.";
        setCssAiError(message);
        toast(message, { variant: "error" });
      }
    } finally {
      setCssAiLoading(false);
      cssAiAbortRef.current = null;
    }
  }, [
    cssAiLoading,
    buildCssAiPrompt,
    customCssAiConfig.provider,
    customCssAiConfig.agentId,
    customCssAiConfig.modelId,
    modelOptions,
    extractCssFromResponse,
    cssAiAppend,
    cssAiAutoApply,
    customCssValue,
    handleCustomCssChange,
    toast,
  ]);

  const handleApplyGeneratedCss = useCallback(
    (mode: "append" | "replace"): void => {
      if (!cssAiOutput) return;
      const nextCss =
        mode === "append"
          ? [customCssValue.trim(), cssAiOutput].filter(Boolean).join("\n\n")
          : cssAiOutput;
      handleCustomCssChange(nextCss);
      toast(mode === "append" ? "CSS appended." : "CSS replaced.", { variant: "success" });
    },
    [cssAiOutput, customCssValue, handleCustomCssChange, toast]
  );

  const handleCancelCss = useCallback((): void => {
    if (cssAiAbortRef.current) {
      cssAiAbortRef.current.abort();
      cssAiAbortRef.current = null;
    }
  }, []);

  const handleRemoveBlock = useCallback((): void => {
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
    } else if (selectedParentBlock) {
      // Element inside a nested block within a section (e.g. slideshow frame)
      dispatch({
        type: "REMOVE_ELEMENT_FROM_SECTION_BLOCK",
        sectionId: selectedParentSection.id,
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
    } else if (selectedParentRow) {
      // Block inside a Row container
      dispatch({
        type: "REMOVE_ELEMENT_FROM_SECTION_BLOCK",
        sectionId: selectedParentSection.id,
        parentBlockId: selectedParentRow.id,
        elementId: selectedBlock.id,
      });
    } else {
      // Direct block inside a section
      dispatch({
        type: "REMOVE_BLOCK",
        sectionId: selectedParentSection.id,
        blockId: selectedBlock.id,
      });
    }
  }, [selectedBlock, selectedParentSection, selectedParentColumn, selectedParentRow, selectedParentBlock, dispatch]);

  const handleMakeBackground = useCallback(
    (target: "grid" | "row" | "column"): void => {
      if (!selectedBlock || selectedBlock.type !== "ImageElement" || !selectedParentSection) return;
      if (selectedParentSection.type !== "Grid") return;
      if (!imageBackgroundSrc) return;
      if (selectedParentBlock) return;

      const backgroundImage = { ...selectedBlock.settings };

      if (target === "grid") {
        dispatch({
          type: "UPDATE_SECTION_SETTINGS",
          sectionId: selectedParentSection.id,
          settings: { backgroundImage },
        });
      } else if (target === "row") {
        if (!selectedGridRow) return;
        dispatch({
          type: "UPDATE_BLOCK_SETTINGS",
          sectionId: selectedParentSection.id,
          blockId: selectedGridRow.id,
          settings: { backgroundImage },
        });
      } else {
        if (!selectedParentColumn) return;
        dispatch({
          type: "UPDATE_COLUMN_SETTINGS",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          settings: { backgroundImage },
        });
      }

      if (selectedParentColumn) {
        dispatch({
          type: "REMOVE_BLOCK_FROM_COLUMN",
          sectionId: selectedParentSection.id,
          columnId: selectedParentColumn.id,
          blockId: selectedBlock.id,
        });
      } else {
        dispatch({
          type: "REMOVE_BLOCK",
          sectionId: selectedParentSection.id,
          blockId: selectedBlock.id,
        });
      }
    },
    [
      dispatch,
      imageBackgroundSrc,
      selectedBlock,
      selectedGridRow,
      selectedParentBlock,
      selectedParentColumn,
      selectedParentSection,
    ]
  );

  const handleRemoveRow = useCallback((): void => {
    if (!isRowBlock || !selectedParentSection || !selectedBlock) return;
    dispatch({
      type: "REMOVE_GRID_ROW",
      sectionId: selectedParentSection.id,
      rowId: selectedBlock.id,
    });
  }, [isRowBlock, selectedParentSection, selectedBlock, dispatch]);

  const handleSectionSettingChangeWithGridColumns = useCallback(
    (key: string, value: unknown): void => {
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
    (config: GsapAnimationConfig): void => {
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

  const handleCssAnimationChange = useCallback(
    (config: CssAnimationConfig): void => {
      if (selectedSection && !selectedBlock && !selectedColumn) {
        handleSectionSettingChange("cssAnimation", config);
      } else if (selectedColumn) {
        handleColumnSettingChange("cssAnimation", config);
      } else if (selectedBlock) {
        handleBlockSettingChange("cssAnimation", config);
      }
    },
    [selectedSection, selectedBlock, selectedColumn, handleSectionSettingChange, handleColumnSettingChange, handleBlockSettingChange]
  );

  const currentCssAnimationConfig = useMemo((): CssAnimationConfig | undefined => {
    if (selectedSection && !selectedBlock && !selectedColumn) {
      return selectedSection.settings["cssAnimation"] as CssAnimationConfig | undefined;
    }
    if (selectedColumn) {
      return selectedColumn.settings["cssAnimation"] as CssAnimationConfig | undefined;
    }
    if (selectedBlock) {
      return selectedBlock.settings["cssAnimation"] as CssAnimationConfig | undefined;
    }
    return undefined;
  }, [selectedSection, selectedBlock, selectedColumn]);

  const enabledAppEmbedsRaw = settingsStore.get(APP_EMBED_SETTING_KEY);
  const enabledAppEmbeds = useMemo<AppEmbedId[]>(() => {
    return parseJsonSetting<AppEmbedId[]>(
      enabledAppEmbedsRaw,
      []
    );
  }, [enabledAppEmbedsRaw]);

  const appEmbedOptions = useMemo((): { label: string; value: string }[] => {
    const options = APP_EMBED_OPTIONS
      .filter((option: AppEmbedOption) => enabledAppEmbeds.includes(option.id))
      .map((option: AppEmbedOption) => ({
        label: option.label,
        value: option.id,
      }));
    if (options.length > 0) return options;
    return [{ label: "No app embeds enabled", value: "" }];
  }, [enabledAppEmbeds]);

  const gridTemplatesRaw = settingsStore.get(GRID_TEMPLATE_SETTINGS_KEY);
  const gridTemplates = useMemo<GridTemplateRecord[]>(() => {
    const stored = parseJsonSetting<unknown>(
      gridTemplatesRaw,
      []
    );
    return normalizeGridTemplates(stored);
  }, [gridTemplatesRaw]);

  const handleSaveGridTemplate = useCallback(async (): Promise<void> => {
    if (!selectedSection || selectedSection.type !== "Grid") return;
    const trimmed = gridTemplateName.trim();
    const name = trimmed.length > 0 ? trimmed : `Grid template ${gridTemplates.length + 1}`;
    const sectionClone: SectionInstance = structuredClone({
      ...selectedSection,
      zone: "template",
    });
    const nextTemplate: GridTemplateRecord = {
      id: `grid-${Date.now()}`,
      name,
      description: "",
      createdAt: new Date().toISOString(),
      section: sectionClone,
    };
    const nextTemplates = [...gridTemplates, nextTemplate];
    try {
      await updateSetting.mutateAsync({
        key: GRID_TEMPLATE_SETTINGS_KEY,
        value: serializeSetting(nextTemplates),
      });
      setGridTemplateName("");
      toast("Grid saved as template.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "ComponentSettingsPanel", action: "saveGridTemplate", templateName: gridTemplateName } });
      toast("Failed to save grid template.", { variant: "error" });
    }
  }, [selectedSection, gridTemplateName, gridTemplates, updateSetting, toast]);

  // ---------------------------------------------------------------------------
  // Determine what to show
  // ---------------------------------------------------------------------------

  const sectionDef = selectedSection ? getSectionDefinition(selectedSection.type) : null;
  const blockDef = selectedBlock ? getBlockDefinition(selectedBlock.type) : null;
  const columnDef = selectedColumn ? getBlockDefinition("Column") : null;
  const inspectorSettings = state.inspectorSettings;

  const hasSelection = !!(selectedSection || selectedBlock || selectedColumn);
  const showConnectionsTab = state.inspectorEnabled;
  const showEventsTab = Boolean(selectedBlock || selectedSection);
  const eventSettingsSource = selectedBlock?.settings ?? selectedSection?.settings ?? null;
  const eventConfig = useMemo(
    () => (eventSettingsSource ? getEventEffectsConfig(eventSettingsSource) : null),
    [eventSettingsSource]
  );

  const contentAiAllowedKeys = useMemo((): string[] => {
    if (selectedSection && sectionDef) {
      return prependManagementFields(sectionDef.settingsSchema ?? []).map((field: SettingsField) => field.key);
    }
    if (selectedColumn && columnDef) {
      return prependManagementFields(columnDef.settingsSchema ?? []).map((field: SettingsField) => field.key);
    }
    if (selectedBlock && blockDef) {
      return prependManagementFields(blockDef.settingsSchema ?? []).map((field: SettingsField) => field.key);
    }
    return [];
  }, [selectedSection, selectedColumn, selectedBlock, sectionDef, columnDef, blockDef]);

  const contentAiPlaceholder = "{{page_context}}\n{{element_context}}\n{{allowed_keys}}";

  const buildContentAiPrompt = useCallback((): string => {
    const basePrompt = contentAiPrompt.trim();
    const defaultPrompt = "Generate JSON settings for the selected element. Return only JSON.";
    const promptBody = basePrompt.length ? basePrompt : defaultPrompt;
    const pageContext = buildPageContext();
    const elementContext = buildElementContext();
    const allowedKeys = contentAiAllowedKeys.length
      ? contentAiAllowedKeys.join(", ")
      : "No schema keys available.";
    const withPlaceholders = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*element_context\s*}}/gi, elementContext)
      .replace(/{{\s*allowed_keys\s*}}/gi, allowedKeys);
    const usesPlaceholders =
      /{{\s*page_context\s*}}/i.test(promptBody) ||
      /{{\s*element_context\s*}}/i.test(promptBody) ||
      /{{\s*allowed_keys\s*}}/i.test(promptBody);
    if (usesPlaceholders) return withPlaceholders;
    return `${withPlaceholders}\n\nAllowed keys:\n${allowedKeys}\n\nPage context:\n${pageContext}\n\nElement context:\n${elementContext}`;
  }, [contentAiPrompt, buildPageContext, buildElementContext, contentAiAllowedKeys]);

  const applyContentAiSettings = useCallback(
    (settingsPatch: Record<string, unknown>): void => {
      const allowed = new Set(contentAiAllowedKeys);
      const filtered =
        allowed.size > 0
          ? Object.entries(settingsPatch).reduce<Record<string, unknown>>((acc: Record<string, unknown>, [key, value]: [string, unknown]) => {
              if (allowed.has(key)) acc[key] = value;
              return acc;
            }, {})
          : settingsPatch;
      const entries = Object.entries(filtered);
      if (entries.length === 0) {
        setContentAiError("No valid settings keys found in AI output.");
        return;
      }
      entries.forEach(([key, value]: [string, unknown]) => {
        if (selectedSection && !selectedBlock && !selectedColumn) {
          handleSectionSettingChangeWithGridColumns(key, value);
        } else if (selectedColumn) {
          handleColumnSettingChange(key, value);
        } else if (selectedBlock) {
          handleBlockSettingChange(key, value);
        }
      });
      toast("AI settings applied.", { variant: "success" });
    },
    [
      contentAiAllowedKeys,
      selectedSection,
      selectedBlock,
      selectedColumn,
      handleSectionSettingChangeWithGridColumns,
      handleColumnSettingChange,
      handleBlockSettingChange,
      toast,
    ]
  );

  const handleGenerateContentAi = useCallback(async (): Promise<void> => {
    if (contentAiLoading) return;
    setContentAiError(null);
    setContentAiOutput("");
    setContentAiLoading(true);
    try {
      const prompt = buildContentAiPrompt();
      if (!prompt.trim()) {
        throw new Error("Prompt is empty.");
      }

      const provider = contentAiProvider;
      const modelId = provider === "model" ? (contentAiModelId.trim() || modelOptions[0] || "") : "";
      const agentId = provider === "agent" ? contentAiAgentId.trim() : "";
      if (provider === "model" && !modelId) {
        throw new Error("Select an AI model first.");
      }
      if (provider === "agent" && !agentId) {
        throw new Error("Select a Deepthinking agent first.");
      }

      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a CMS content assistant. Return only JSON. If updating settings, output an object of key/value pairs matching allowed keys.",
        },
        { role: "user", content: prompt },
      ];

      const controller = new AbortController();
      contentAiAbortRef.current = controller;

      const res = await fetch("/api/cms/css-ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Streaming request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneSignal = false;

      const processEvent = (raw: string): void => {
        const lines = raw.split("\n").map((line: string) => line.trim());
        const dataLine = lines.find((line: string) => line.startsWith("data:"));
        if (!dataLine) return;
        const payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (payload.error) {
          throw new Error(payload.error);
        }
        if (payload.delta) {
          accumulated += payload.delta;
          setContentAiOutput(accumulated);
        }
        if (payload.done) {
          doneSignal = true;
        }
      };

      while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          processEvent(chunk);
          if (doneSignal) break;
        }
      }
      if (buffer.trim() && !doneSignal) {
        processEvent(buffer);
      }
      if (doneSignal) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      }

      const parsed = extractJsonFromResponse(accumulated);
      if (!parsed) throw new Error("AI response did not include JSON.");
      setContentAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${provider}).`, { variant: "success" });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        setContentAiError("Generation cancelled.");
        toast("Generation cancelled.", { variant: "info" });
      } else {
        const message = error instanceof Error ? error.message : "Failed to generate AI output.";
        setContentAiError(message);
        toast(message, { variant: "error" });
      }
    } finally {
      setContentAiLoading(false);
      contentAiAbortRef.current = null;
    }
  }, [
    contentAiLoading,
    buildContentAiPrompt,
    contentAiProvider,
    contentAiModelId,
    contentAiAgentId,
    modelOptions,
    extractJsonFromResponse,
    toast,
  ]);

  const handleApplyContentAi = useCallback((): void => {
    if (!contentAiOutput.trim()) {
      setContentAiError("No AI output to apply.");
      return;
    }
    const parsed = extractJsonFromResponse(contentAiOutput);
    if (!parsed) {
      setContentAiError("AI output is not valid JSON.");
      return;
    }
    const settingsSource =
      typeof parsed.settings === "object" && parsed.settings
        ? (parsed.settings as Record<string, unknown>)
        : parsed;
    applyContentAiSettings(settingsSource);
  }, [contentAiOutput, extractJsonFromResponse, applyContentAiSettings]);

  const handleCancelContentAi = useCallback((): void => {
    if (contentAiAbortRef.current) {
      contentAiAbortRef.current.abort();
      contentAiAbortRef.current = null;
    }
  }, []);

  const selectedLabel = useMemo((): string => {
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
    (patch: Partial<{ enabled: boolean; source: string; path: string; fallback: string }>): void => {
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

  const updateInspectorSetting = useCallback(
    (patch: Partial<InspectorSettings>): void => {
      dispatch({ type: "UPDATE_INSPECTOR_SETTINGS", settings: patch });
    },
    [dispatch]
  );

  const handleToggleInspector = useCallback((): void => {
    const nextEnabled = !state.inspectorEnabled;
    dispatch({ type: "TOGGLE_INSPECTOR" });
    if (nextEnabled) {
      setActiveTab("connections");
      return;
    }
    if (activeTab === "connections") {
      setActiveTab("settings");
    }
  }, [activeTab, dispatch, state.inspectorEnabled]);

  useEffect((): void => {
    if (!showEventsTab && activeTab === "events") {
      setActiveTab("settings");
      return;
    }
    if (!showCustomCssTab && activeTab === "customCss") {
      setActiveTab("settings");
    }
  }, [showEventsTab, showCustomCssTab, activeTab]);

  return (
    <aside className="flex w-80 min-h-0 flex-col border-l border-border bg-gray-900">
      <PanelHeader
        title={selectedLabel || "Settings"}
        actions={(
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(): void => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
              aria-label="Hide right panel"
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-300"
            >
              <PanelRightClose className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleToggleInspector}
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
              onClick={(): void => dispatch({ type: "SET_PREVIEW_MODE", mode: "desktop" })}
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
              onClick={(): void => dispatch({ type: "SET_PREVIEW_MODE", mode: "mobile" })}
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
        )}
      />

      <div className="border-b border-border px-4 py-3">
        <div className="text-[10px] uppercase tracking-wider text-gray-400">Preview appearance</div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
          <span>Edit chrome</span>
          <Checkbox
            checked={inspectorSettings.showEditorChrome}
            onCheckedChange={(value: boolean | "indeterminate"): void =>
              updateInspectorSetting({ showEditorChrome: value === true })
            }
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Turn off for a faithful preview that matches the rendered page.
        </p>
      </div>

      {state.inspectorEnabled && (
        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400">Inspector options</div>
          <div className="mt-2 space-y-2 text-xs text-gray-300">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={inspectorSettings.showTooltip}
                onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showTooltip: value === true })}
              />
              Enable tooltip
            </label>
            <div className="rounded border border-border/40 bg-gray-800/30 px-2 py-2 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Tooltip content</div>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showStyleSettings}
                  onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showStyleSettings: value === true })}
                />
                Style settings
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showStructureInfo}
                  onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showStructureInfo: value === true })}
                />
                Structure info (zone + counts)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showIdentifiers}
                  onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showIdentifiers: value === true })}
                />
                Identifiers (IDs)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showVisibilityInfo}
                  onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showVisibilityInfo: value === true })}
                />
                Visibility info
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={inspectorSettings.showConnectionInfo}
                  onCheckedChange={(value: boolean | "indeterminate"): void => updateInspectorSetting({ showConnectionInfo: value === true })}
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
          onValueChange={(value: string): void =>
            setActiveTab(value as "settings" | "animation" | "cssAnimation" | "events" | "connections" | "customCss" | "ai")
          }
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
            <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            <TabsTrigger value="animation" className="flex-1 text-xs">Animation</TabsTrigger>
            <TabsTrigger value="cssAnimation" className="flex-1 text-xs">CSS Anim</TabsTrigger>
            {showCustomCssTab && (
              <TabsTrigger value="customCss" className="flex-1 text-xs">CSS</TabsTrigger>
            )}
            {showEventsTab && (
              <TabsTrigger value="events" className="flex-1 text-xs">Events</TabsTrigger>
            )}
            {showConnectionsTab && (
              <TabsTrigger value="connections" className="flex-1 text-xs">Connections</TabsTrigger>
            )}
            <TabsTrigger value="ai" className="flex-1 text-xs">AI</TabsTrigger>
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
                  groupSettingsFields(
                    selectedSection.type === "Grid"
                      ? prependManagementFields(sectionDef.settingsSchema)
                      : sectionDef.settingsSchema
                  ),
                  selectedSection.settings,
                  handleSectionSettingChangeWithGridColumns,
                )}

                {selectedSection.type === "Grid" && (
                  <div className="rounded border border-border/40 bg-gray-900/40 p-3">
                    <div className="text-xs font-semibold text-gray-200">Save grid as template</div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Saved grids appear under Templates when adding sections.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={gridTemplateName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setGridTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="h-8 text-xs"
                      />
                      <Button
                        onClick={() => void handleSaveGridTemplate()}
                        size="sm"
                        className="h-8"
                        disabled={updateSetting.isPending || !selectedSection}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
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
                  groupSettingsFields(prependManagementFields(columnDef.settingsSchema)),
                  columnSettingsForRender ?? selectedColumn.settings,
                  handleColumnSettingChange,
                  (field: SettingsField): SettingsField =>
                    columnHeightMode === "inherit" && field.key === "height"
                      ? { ...field, disabled: true }
                      : field,
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

                {/* Background mode selector for ImageElement in Grid containers */}
                {isImageElementInContainer && backgroundTargetOptions.length > 1 && (
                  <div className="rounded border border-border/40 bg-gray-900/40 p-3 mb-4">
                    <div className="text-xs font-semibold text-gray-200">Background Mode</div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Attach this image as a background to a container element.
                    </p>
                    <div className="mt-2">
                      <select
                        value={currentBackgroundTarget}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => handleBlockSettingChange("backgroundTarget", e.target.value as ImageBackgroundTarget)}
                        className="w-full h-8 text-xs bg-gray-800 border border-border rounded px-2 text-gray-200"
                      >
                        {backgroundTargetOptions.map((opt: { label: string; value: ImageBackgroundTarget }) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isInBackgroundMode && (
                      <div className="mt-2 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-[11px] text-blue-300">
                        This image is now a {currentBackgroundTarget} background. It will render behind the {currentBackgroundTarget} content.
                      </div>
                    )}
                  </div>
                )}

                {/* Show background mode settings when in background mode, otherwise regular settings */}
                {isImageElementInContainer && isInBackgroundMode ? (
                  renderFieldGroups(
                    groupSettingsFields(prependManagementFields(IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS)),
                    selectedBlock.settings,
                    handleBlockSettingChange,
                  )
                ) : (
                  renderFieldGroups(
                    groupSettingsFields(prependManagementFields(blockDef.settingsSchema)),
                    rowSettingsForRender ?? selectedBlock.settings,
                    handleBlockSettingChange,
                    (field: SettingsField): SettingsField =>
                      (selectedBlock.type === "AppEmbed" && field.key === "appId")
                        ? { ...field, options: appEmbedOptions }
                        : (isRowBlock && rowHeightMode === "inherit" && field.key === "height")
                          ? { ...field, disabled: true }
                          : field,
                  )
                )}

                {/* Keep the old "Make background" option for quick conversion (removes the element) */}
                {isGridImageElement && !isInBackgroundMode && (
                  <div className="rounded border border-border/40 bg-gray-900/40 p-3">
                    <div className="text-xs font-semibold text-gray-200">Convert to static background</div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Move this image into the container&apos;s background settings (removes this element).
                    </p>
                    <div className="mt-3 grid gap-2">
                      {selectedParentColumn && (
                        <Button
                          onClick={(): void => handleMakeBackground("column")}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          disabled={!imageBackgroundSrc}
                        >
                          Convert to column background
                        </Button>
                      )}
                      {selectedGridRow && (
                        <Button
                          onClick={(): void => handleMakeBackground("row")}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          disabled={!imageBackgroundSrc}
                        >
                          Convert to row background
                        </Button>
                      )}
                      <Button
                        onClick={(): void => handleMakeBackground("grid")}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        disabled={!imageBackgroundSrc}
                      >
                        Convert to grid background
                      </Button>
                      {!imageBackgroundSrc && (
                        <div className="text-[11px] text-gray-500">
                          Pick an image first to enable background placement.
                        </div>
                      )}
                    </div>
                  </div>
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
          {/* ---- CSS Animation tab ---- */}
          <TabsContent value="cssAnimation" className="flex-1 overflow-y-auto p-4 mt-0">
            <CssAnimationConfigPanel
              value={currentCssAnimationConfig ?? {}}
              onChange={handleCssAnimationChange}
            />
          </TabsContent>
          {/* ---- AI tab ---- */}
          <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 mt-0">
            <div className="space-y-3">
              <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                AI content for <span className="text-gray-200">{selectedLabel}</span>
              </div>
              <SectionPanel variant="subtle-compact" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400">
                    Content AI
                  </Label>
                  <span className="text-[10px] text-gray-500">JSON output</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Provider</Label>
                  <UnifiedSelect
                    value={contentAiProvider}
                    onValueChange={(value: string): void => setContentAiProvider(value as "model" | "agent")}
                    options={providerOptions}
                    placeholder="Select provider"
                  />
                </div>
                {contentAiProvider !== "agent" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Model</Label>
                    <UnifiedSelect
                      value={contentAiModelId}
                      onValueChange={(value: string): void => setContentAiModelId(value)}
                      options={modelOptions.map((model: string) => ({ value: model, label: model }))}
                      placeholder={modelOptions.length ? "Select model" : "No models available"}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Deepthinking agent</Label>
                    <UnifiedSelect
                      value={contentAiAgentId}
                      onValueChange={(value: string): void => setContentAiAgentId(value)}
                      options={agentOptions.length ? agentOptions : [{ label: "No agents configured", value: "" }]}
                      placeholder={agentOptions.length ? "Select agent" : "No agents configured"}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400">Prompt</Label>
                  <Textarea
                    value={contentAiPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                      setContentAiPrompt(e.target.value)
                    }
                    placeholder={`Describe the content you want.\n\nContext:\n${contentAiPlaceholder}`}
                    className="min-h-[120px] text-xs"
                    spellCheck={false}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-gray-500">Context placeholders</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(): void => {
                      const current = contentAiPrompt.trim();
                      const nextPrompt = current.length ? `${current}\n\n${contentAiPlaceholder}` : contentAiPlaceholder;
                      setContentAiPrompt(nextPrompt);
                    }}
                  >
                    Insert placeholders
                  </Button>
                </div>
                <Textarea
                  value={contentAiPlaceholder}
                  readOnly
                  className="min-h-[64px] text-xs font-mono text-gray-300"
                />
                <div className="text-[11px] text-gray-500">
                  <span className="font-mono text-gray-300">allowed_keys</span> = {contentAiAllowedKeys.length ? contentAiAllowedKeys.join(", ") : "No keys available."}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(): void => void handleGenerateContentAi()}
                    disabled={contentAiLoading}
                  >
                    {contentAiLoading ? "Generating…" : "Generate JSON"}
                  </Button>
                  {contentAiLoading && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCancelContentAi}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                {contentAiError && (
                  <div className="text-xs text-red-400">{contentAiError}</div>
                )}
                {contentAiOutput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-400">AI output</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleApplyContentAi}
                      >
                        Apply to settings
                      </Button>
                    </div>
                    <Textarea
                      value={contentAiOutput}
                      readOnly
                      className="min-h-[140px] text-xs font-mono text-gray-300"
                    />
                  </div>
                )}
              </SectionPanel>
            </div>
          </TabsContent>
          {showCustomCssTab && (
            <TabsContent value="customCss" className="flex-1 overflow-y-auto p-4 mt-0">
              <div className="space-y-3">
                <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                  Custom CSS for{" "}
                  <span className="text-gray-200">
                    {selectedSection && (isGridSection || isBlockSection)
                      ? selectedSection.type
                      : selectedColumn
                        ? "Column"
                        : selectedBlock?.type ?? "Item"}
                  </span>
                </div>
                <SectionPanel variant="subtle-compact" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-wider text-gray-400">
                      CSS AI Assistant
                    </Label>
                    <span className="text-[10px] text-gray-500">Optional</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Provider</Label>
                    <UnifiedSelect
                      value={customCssAiConfig.provider ?? "model"}
                      onValueChange={(value: string): void =>
                        handleCustomCssAiChange({ provider: value as CustomCssAiProvider })
                      }
                      options={providerOptions}
                      placeholder="Select provider"
                    />
                  </div>
                  {customCssAiConfig.provider !== "agent" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-400">Model</Label>
                      <UnifiedSelect
                        value={customCssAiConfig.modelId ?? ""}
                        onValueChange={(value: string): void =>
                          handleCustomCssAiChange({ modelId: value })
                        }
                        options={modelOptions.map((model: string) => ({ value: model, label: model }))}
                        placeholder={modelOptions.length ? "Select model" : "No models available"}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-400">Deepthinking agent</Label>
                      <UnifiedSelect
                        value={customCssAiConfig.agentId ?? ""}
                        onValueChange={(value: string): void =>
                          handleCustomCssAiChange({ agentId: value })
                        }
                        options={
                          agentOptions.length
                            ? agentOptions
                            : [{ label: "No agents configured", value: "" }]
                        }
                        placeholder={agentOptions.length ? "Select agent" : "No agents configured"}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Prompt</Label>
                    <Textarea
                      value={customCssAiConfig.prompt ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
                        handleCustomCssAiChange({ prompt: e.target.value })
                      }
                      placeholder={`Describe the CSS you want.\n\nContext:\n${contextPlaceholder}`}
                      className="min-h-[120px] text-xs"
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-gray-500">Context placeholders</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(): void => {
                        const current = (customCssAiConfig.prompt ?? "").trim();
                        const nextPrompt = current.length
                          ? `${current}\n\n${contextPlaceholder}`
                          : contextPlaceholder;
                        handleCustomCssAiChange({ prompt: nextPrompt });
                      }}
                    >
                      Insert placeholders
                    </Button>
                  </div>
                  <Textarea
                    value={contextPlaceholder}
                    readOnly
                    className="min-h-[64px] text-xs font-mono text-gray-300"
                  />
                  <div className="text-[11px] text-gray-500">
                    <span className="font-mono text-gray-300">page_context</span> = full page UI context,{" "}
                    <span className="font-mono text-gray-300">element_context</span> = selected element details.
                  </div>
                  <div className="rounded border border-border/40 bg-gray-900/40 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs text-gray-400">Context preview</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-[11px] text-gray-300">
                          <Switch
                            checked={contextPreviewFull}
                            onCheckedChange={(value: boolean | "indeterminate"): void =>
                              setContextPreviewFull(value === true)
                            }
                          />
                          Full context
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(): void => setContextPreviewNonce((prev: number) => prev + 1)}
                        >
                          Refresh
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(): void => setContextPreviewOpen((prev: boolean) => !prev)}
                        >
                          {contextPreviewOpen ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>
                    {contextPreviewOpen ? (
                      <Tabs
                        value={contextPreviewTab}
                        onValueChange={(value: string): void =>
                          setContextPreviewTab(value as "page" | "element")
                        }
                        className="mt-3"
                      >
                        <TabsList className="w-full">
                          <TabsTrigger value="page" className="flex-1 text-xs">Page</TabsTrigger>
                          <TabsTrigger value="element" className="flex-1 text-xs">Element</TabsTrigger>
                        </TabsList>
                        <TabsContent value="page" className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Full page context</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(): void => void handleCopyContext(pageContextPreview)}
                            >
                              Copy
                            </Button>
                          </div>
                          <Textarea
                            value={pageContextPreview}
                            readOnly
                            className="min-h-[160px] text-xs font-mono text-gray-300"
                          />
                        </TabsContent>
                        <TabsContent value="element" className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-400">Selected element context</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(): void => void handleCopyContext(elementContextPreview)}
                            >
                              Copy
                            </Button>
                          </div>
                          <Textarea
                            value={elementContextPreview}
                            readOnly
                            className="min-h-[160px] text-xs font-mono text-gray-300"
                          />
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="mt-2 text-[11px] text-gray-500">
                        Preview the raw context payloads used for AI prompts.
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <Switch
                        checked={cssAiAutoApply}
                        onCheckedChange={(value: boolean | "indeterminate"): void =>
                          setCssAiAutoApply(value === true)
                        }
                      />
                      Auto-apply on generate
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={(): void => void handleGenerateCss()}
                      disabled={cssAiLoading}
                    >
                      {cssAiLoading ? "Generating…" : "Generate CSS"}
                    </Button>
                    {cssAiLoading && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelCss}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  {cssAiAutoApply && (
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <Switch
                        checked={cssAiAppend}
                        onCheckedChange={(value: boolean | "indeterminate"): void =>
                          setCssAiAppend(value === true)
                        }
                      />
                      Append when auto-applying
                    </label>
                  )}
                  {cssAiError && (
                    <div className="text-xs text-red-400">{cssAiError}</div>
                  )}
                  {cssAiOutput && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-400">Last generated CSS</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(): void => handleApplyGeneratedCss("append")}
                          >
                            Apply append
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(): void => handleApplyGeneratedCss("replace")}
                          >
                            Apply replace
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={cssAiOutput}
                        readOnly
                        className="min-h-[120px] text-xs font-mono text-gray-300"
                      />
                      <div className="rounded border border-border/40 bg-gray-900/40 p-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <div className="flex items-center gap-3">
                            <span>Diff</span>
                            <span className="text-emerald-300">+{cssDiffStats.added}</span>
                            <span className="text-rose-300">-{cssDiffStats.removed}</span>
                            <span className="text-gray-500">={cssDiffStats.same}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(): void => setCssAiDiffOnly((prev: boolean) => !prev)}
                          >
                            {cssAiDiffOnly ? "Changes only" : "Show all"}
                          </Button>
                        </div>
                        <div className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-2 font-mono text-[11px]">
                          {cssDiffLines.length > 0 ? (
                            cssDiffLines.map((line: { type: "add" | "remove" | "same"; text: string }, index: number) => {
                              const prefix = line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  ";
                              const colorClass =
                                line.type === "add"
                                  ? "text-emerald-300"
                                  : line.type === "remove"
                                    ? "text-rose-300"
                                    : "text-gray-300";
                              return (
                                <div key={`${line.type}-${index}`} className={`whitespace-pre ${colorClass}`}>
                                  {prefix}
                                  {line.text}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-gray-500">No differences yet.</div>
                          )}
                          {cssDiff?.truncated ? (
                            <div className="mt-1 text-gray-500">Diff truncated…</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </SectionPanel>
                <div className="text-[11px] text-gray-500">
                  Use <span className="font-mono text-gray-300">parent</span> to target this element and{" "}
                  <span className="font-mono text-gray-300">children</span> to target its direct children.
                </div>
                <Textarea
                  value={customCssValue}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => handleCustomCssChange(e.target.value)}
                  placeholder={`parent {\n  outline: 1px dashed #4ade80;\n}\n\nchildren {\n  gap: 12px;\n}`}
                  className="min-h-[160px] font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            </TabsContent>
          )}
          {showEventsTab && (
            <TabsContent value="events" className="flex-1 overflow-y-auto p-4 mt-0">
              {!eventConfig ? (
                <div className="text-xs text-gray-500">Select a block or section to configure event effects.</div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                    Event effects for{" "}
                    <span className="text-gray-200">
                      {selectedBlock ? blockDef?.label ?? "Block" : sectionDef?.label ?? "Section"}
                    </span>
                  </div>

                  <div className="space-y-3 rounded border border-border/40 bg-gray-900/40 p-3">
                    <div className="text-xs font-semibold text-gray-200">Hover</div>
                    <SelectField
                      label="Hover effect"
                      value={eventConfig.hoverEffect}
                      onChange={(value: string): void => handleEventSettingChange("eventHoverEffect", value)}
                      options={EVENT_HOVER_EFFECT_OPTIONS}
                    />
                    <RangeField
                      label="Hover scale"
                      value={eventConfig.hoverScale}
                      onChange={(value: number): void => handleEventSettingChange("eventHoverScale", value)}
                      min={1}
                      max={1.2}
                      step={0.01}
                      suffix="x"
                      disabled={eventConfig.hoverEffect === "none"}
                    />
                    <p className="text-[11px] text-gray-500">
                      Hover effects preview in the builder; they apply on the live site too.
                    </p>
                  </div>

                  <div className="space-y-3 rounded border border-border/40 bg-gray-900/40 p-3">
                    <div className="text-xs font-semibold text-gray-200">Click</div>
                    <SelectField
                      label="Click action"
                      value={eventConfig.clickAction}
                      onChange={(value: string): void => handleEventSettingChange("eventClickAction", value)}
                      options={EVENT_CLICK_ACTION_OPTIONS}
                    />

                    {eventConfig.clickAction === "navigate" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
                          URL
                        </Label>
                        <Input
                          value={eventConfig.clickUrl}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            handleEventSettingChange("eventClickUrl", e.target.value)
                          }
                          placeholder="https://example.com"
                          className="h-8 text-xs"
                        />
                        <SelectField
                          label="Open link"
                          value={eventConfig.clickTarget}
                          onChange={(value: string): void => handleEventSettingChange("eventClickTarget", value)}
                          options={EVENT_CLICK_TARGET_OPTIONS}
                        />
                      </div>
                    )}

                    {eventConfig.clickAction === "scroll" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-500">
                          Target ID
                        </Label>
                        <Input
                          value={eventConfig.clickScrollTarget}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                            handleEventSettingChange("eventClickScrollTarget", e.target.value)
                          }
                          placeholder="hero-section"
                          className="h-8 text-xs"
                        />
                        <SelectField
                          label="Scroll behavior"
                          value={eventConfig.clickScrollBehavior}
                          onChange={(value: string): void => handleEventSettingChange("eventClickScrollBehavior", value)}
                          options={EVENT_SCROLL_BEHAVIOR_OPTIONS}
                        />
                        <p className="text-[11px] text-gray-500">
                          The target should match an element ID (with or without #).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          )}
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        updateConnectionSetting({ fallback: e.target.value })
                      }
                      placeholder="Optional fallback text"
                      className="h-8 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <Checkbox
                      checked={connectionSettings.enabled}
                      onCheckedChange={(value: boolean | "indeterminate"): void =>
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
  const updateSlug = useUpdateSlug();
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [pageAiProvider, setPageAiProvider] = useState<"model" | "agent">("model");
  const [pageAiModelId, setPageAiModelId] = useState<string>("");
  const [pageAiAgentId, setPageAiAgentId] = useState<string>("");
  const [pageAiPrompt, setPageAiPrompt] = useState<string>("");
  const [pageAiTask, setPageAiTask] = useState<"layout" | "seo">("layout");
  const [pageAiOutput, setPageAiOutput] = useState<string>("");
  const [pageAiError, setPageAiError] = useState<string | null>(null);
  const [pageAiLoading, setPageAiLoading] = useState<boolean>(false);
  const pageAiAbortRef = useRef<AbortController | null>(null);
  const modelsQuery = useChatbotModels();
  const teachingAgentsQuery = useTeachingAgents();

  const allSlugs = useMemo((): Slug[] => allSlugsQuery.data ?? [], [allSlugsQuery.data]);
  const domainSlugs = useMemo((): Slug[] => slugsQuery.data ?? [], [slugsQuery.data]);
  const modelOptions = useMemo((): string[] => {
    const fromApi = (modelsQuery.data ?? []).filter((value: string) => value.trim().length > 0);
    return Array.from(new Set(fromApi));
  }, [modelsQuery.data]);
  const agentOptions = useMemo(
    () => (teachingAgentsQuery.data ?? []).map((agent: AgentTeachingAgentRecord) => ({ label: agent.name, value: agent.id })),
    [teachingAgentsQuery.data]
  );
  const pageAiTaskOptions = useMemo(
    () => [
      { label: "Layout plan", value: "layout" },
      { label: "SEO metadata", value: "seo" },
    ],
    []
  );
  const pageAiProviderOptions = useMemo(
    () => [
      { label: "AI model", value: "model" },
      { label: "Deepthinking agent", value: "agent" },
    ],
    []
  );

  useEffect((): void => {
    if (pageAiProvider !== "model") return;
    if (pageAiModelId.trim().length) return;
    if (!modelOptions.length) return;
    setPageAiModelId(modelOptions[0]!);
  }, [pageAiProvider, pageAiModelId, modelOptions]);

  useEffect((): void => {
    setPageAiOutput("");
    setPageAiError(null);
  }, [pageAiTask]);
  const allSlugByValue = useMemo((): Map<string, Slug> => {
    const map = new Map<string, Slug>();
    allSlugs.forEach((slug: Slug) => map.set(slug.slug, slug));
    return map;
  }, [allSlugs]);

  const selectedSlugIds = useMemo((): string[] => {
    if (!page) return [];
    const pageSlugValues = (page.slugs ?? []).map((s: PageSlugLink) => s.slug.slug);
    return pageSlugValues
      .map((value: string) => allSlugByValue.get(value)?.id)
      .filter((value: string | undefined): value is string => Boolean(value));
  }, [page, allSlugByValue]);

  const domainSlugIds = useMemo((): Set<string> => new Set(domainSlugs.map((slug: Slug) => slug.id)), [domainSlugs]);
  const selectedSlugs = useMemo((): Slug[] => {
    const byId = new Map(allSlugs.map((slug: Slug) => [slug.id, slug]));
    return selectedSlugIds
      .map((idValue: string) => byId.get(idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
  }, [allSlugs, selectedSlugIds]);

  const crossZoneSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => !domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const eligibleHomeSlugs = useMemo(
    (): Slug[] => selectedSlugs.filter((slug: Slug) => domainSlugIds.has(slug.id)),
    [selectedSlugs, domainSlugIds]
  );
  const currentHomeSlug = useMemo(
    (): Slug | null => domainSlugs.find((slug: Slug) => slug.isDefault) ?? null,
    [domainSlugs]
  );
  const pageHomeSlug = useMemo(
    (): Slug | null => (currentHomeSlug ? eligibleHomeSlugs.find((slug: Slug) => slug.id === currentHomeSlug.id) ?? null : null),
    [currentHomeSlug, eligibleHomeSlugs]
  );

  const filteredDomainSlugs = useMemo((): Slug[] => {
    const term = search.trim().toLowerCase();
    if (!term) return domainSlugs;
    return domainSlugs.filter((slug: Slug) => slug.slug.toLowerCase().includes(term));
  }, [domainSlugs, search]);

  const handleStatusChange = (status: PageStatus): void => {
    dispatch({ type: "SET_PAGE_STATUS", status });
  };

  const handleNameChange = (value: string): void => {
    dispatch({ type: "SET_PAGE_NAME", name: value });
  };

  const handleSeoChange = (key: string, value: string): void => {
    dispatch({ type: "UPDATE_SEO", seo: { [key]: value || undefined } });
  };

  const handleMenuVisibilityChange = (checked: boolean): void => {
    dispatch({ type: "SET_PAGE_MENU_VISIBILITY", showMenu: checked });
  };

  const showMenuValue = page ? page.showMenu !== false : false;

  const applySelectedSlugIds = (ids: string[]): void => {
    const selectedSlugsList = ids
      .map((idValue: string) => allSlugs.find((slug: Slug) => slug.id === idValue))
      .filter((value: Slug | undefined): value is Slug => Boolean(value));
    dispatch({
      type: "UPDATE_PAGE_SLUGS",
      slugIds: ids,
      slugValues: selectedSlugsList.map((slug: Slug) => slug.slug),
    });
  };

  const handleToggleSlug = (slug: Slug): void => {
    const nextIds = selectedSlugIds.includes(slug.id)
      ? selectedSlugIds.filter((idValue: string) => idValue !== slug.id)
      : [...selectedSlugIds, slug.id];
    applySelectedSlugIds(nextIds);
  };

  const handleRemoveSlug = (slug: Slug): void => {
    applySelectedSlugIds(selectedSlugIds.filter((idValue: string) => idValue !== slug.id));
  };

  const handleSetHome = async (slug: Slug): Promise<void> => {
    await updateSlug.mutateAsync({
      id: slug.id,
      input: { slug: slug.slug, isDefault: true },
      domainId: activeDomainId,
    });
  };

  useEffect((): (() => void) => {
    return (): void => {
      if (pageAiAbortRef.current) {
        pageAiAbortRef.current.abort();
        pageAiAbortRef.current = null;
      }
    };
  }, []);

  const pageContext = useMemo((): string => {
    if (!page) return "No page loaded.";
    return JSON.stringify(
      {
        page: {
          id: page.id,
          name: page.name,
          status: page.status,
          slugs: page.slugs ?? [],
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          seoCanonical: page.seoCanonical,
          seoOgImage: page.seoOgImage,
          robotsMeta: page.robotsMeta,
        },
        sections: state.sections.map((section: SectionInstance) => ({
          id: section.id,
          type: section.type,
          zone: section.zone,
        })),
      },
      null,
      2
    );
  }, [page, state.sections]);

  const pageAiPlaceholder = "{{page_context}}\n{{available_templates}}";
  const templateCatalog = useMemo(
    () =>
      SECTION_TEMPLATES.map(
        (template: (typeof SECTION_TEMPLATES)[number]) =>
          `- ${template.name} (${template.category}): ${template.description}`
      ).join("\n"),
    []
  );

  const extractPageAiJson = useCallback((raw: string): Record<string, unknown> | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    const jsonText = first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }, []);

  const buildPageAiPrompt = useCallback((): string => {
    const basePrompt = pageAiPrompt.trim();
    const defaultPrompt =
      pageAiTask === "seo"
        ? "Generate SEO metadata for this page. Return JSON with seoTitle, seoDescription, seoCanonical, seoOgImage, robotsMeta."
        : "Create a layout plan using available templates. Return JSON with a sections array using template names.";
    const promptBody = basePrompt.length ? basePrompt : defaultPrompt;
    const resolved = promptBody
      .replace(/{{\s*page_context\s*}}/gi, pageContext)
      .replace(/{{\s*available_templates\s*}}/gi, templateCatalog);
    const usesPlaceholders =
      /{{\s*page_context\s*}}/i.test(promptBody) ||
      /{{\s*available_templates\s*}}/i.test(promptBody);
    if (usesPlaceholders) return resolved;
    return `${resolved}\n\nPage context:\n${pageContext}\n\nAvailable templates:\n${templateCatalog}`;
  }, [pageAiPrompt, pageAiTask, pageContext, templateCatalog]);

  const handleGeneratePageAi = useCallback(async (): Promise<void> => {
    if (pageAiLoading) return;
    setPageAiError(null);
    setPageAiOutput("");
    setPageAiLoading(true);
    try {
      const prompt = buildPageAiPrompt();
      if (!prompt.trim()) throw new Error("Prompt is empty.");

      const provider = pageAiProvider;
      const modelId = provider === "model" ? (pageAiModelId.trim() || modelOptions[0] || "") : "";
      const agentId = provider === "agent" ? pageAiAgentId.trim() : "";
      if (provider === "model" && !modelId) throw new Error("Select an AI model first.");
      if (provider === "agent" && !agentId) throw new Error("Select a Deepthinking agent first.");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a CMS page assistant. Return only JSON with the requested fields. No markdown or explanations.",
        },
        { role: "user", content: prompt },
      ];

      const controller = new AbortController();
      pageAiAbortRef.current = controller;

      const res = await fetch("/api/cms/css-ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ provider, modelId, agentId, messages }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Streaming request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneSignal = false;

      const processEvent = (raw: string): void => {
        const lines = raw.split("\n").map((line: string) => line.trim());
        const dataLine = lines.find((line: string) => line.startsWith("data:"));
        if (!dataLine) return;
        const payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as {
          delta?: string;
          done?: boolean;
          error?: string;
        };
        if (payload.error) {
          throw new Error(payload.error);
        }
        if (payload.delta) {
          accumulated += payload.delta;
          setPageAiOutput(accumulated);
        }
        if (payload.done) {
          doneSignal = true;
        }
      };

      while (!doneSignal) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          processEvent(chunk);
          if (doneSignal) break;
        }
      }
      if (buffer.trim() && !doneSignal) {
        processEvent(buffer);
      }
      if (doneSignal) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      }

      const parsed = extractPageAiJson(accumulated);
      if (!parsed) throw new Error("AI response did not include JSON.");
      setPageAiOutput(JSON.stringify(parsed, null, 2));
      toast(`AI output ready (${provider}).`, { variant: "success" });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        setPageAiError("Generation cancelled.");
        toast("Generation cancelled.", { variant: "info" });
      } else {
        const message = error instanceof Error ? error.message : "Failed to generate AI output.";
        setPageAiError(message);
        toast(message, { variant: "error" });
      }
    } finally {
      setPageAiLoading(false);
      pageAiAbortRef.current = null;
    }
  }, [
    pageAiLoading,
    buildPageAiPrompt,
    pageAiProvider,
    pageAiModelId,
    pageAiAgentId,
    modelOptions,
    extractPageAiJson,
    toast,
  ]);

  const handleApplyPageAi = useCallback((): void => {
    if (!pageAiOutput.trim()) {
      setPageAiError("No AI output to apply.");
      return;
    }
    const parsed = extractPageAiJson(pageAiOutput);
    if (!parsed) {
      setPageAiError("AI output is not valid JSON.");
      return;
    }

    if (pageAiTask === "seo") {
      const source =
        typeof parsed.seo === "object" && parsed.seo
          ? (parsed.seo as Record<string, unknown>)
          : parsed;
      const seoPatch: Record<string, string> = {};
      if (typeof source.seoTitle === "string") seoPatch.seoTitle = source.seoTitle;
      if (typeof source.seoDescription === "string") seoPatch.seoDescription = source.seoDescription;
      if (typeof source.seoCanonical === "string") seoPatch.seoCanonical = source.seoCanonical;
      if (typeof source.seoOgImage === "string") seoPatch.seoOgImage = source.seoOgImage;
      if (typeof source.robotsMeta === "string") seoPatch.robotsMeta = source.robotsMeta;
      if (Object.keys(seoPatch).length === 0) {
        setPageAiError("No SEO fields found in AI output.");
        return;
      }
      dispatch({ type: "UPDATE_SEO", seo: seoPatch });
      toast("SEO metadata applied.", { variant: "success" });
      return;
    }

    const sectionsRaw =
      Array.isArray(parsed)
        ? parsed
        : parsed.sections ?? parsed.layout ?? parsed.plan;
    const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
    if (!sections.length) {
      setPageAiError("No sections found in AI output.");
      return;
    }

    const validZones = new Set<PageZone>(["header", "template", "footer"]);
    let inserted = 0;
    sections.forEach((item: unknown) => {
      const entry = typeof item === "string" ? { template: item } : (item as Record<string, unknown>);
      const templateName = typeof entry.template === "string" ? entry.template : typeof entry.name === "string" ? entry.name : "";
      const typeName = typeof entry.type === "string" ? entry.type : "";
      const zoneCandidate = typeof entry.zone === "string" ? entry.zone : "template";
      const zone = validZones.has(zoneCandidate as PageZone) ? (zoneCandidate as PageZone) : "template";

      if (templateName) {
        const template = SECTION_TEMPLATES.find(
          (tpl: (typeof SECTION_TEMPLATES)[number]) => tpl.name.toLowerCase() === templateName.toLowerCase()
        );
        if (!template) return;
        const section = template.create();
        section.zone = zone;
        dispatch({ type: "INSERT_TEMPLATE_SECTION", section });
        inserted += 1;
        return;
      }

      if (typeName) {
        const def = getSectionDefinition(typeName);
        if (!def) return;
        dispatch({ type: "ADD_SECTION", sectionType: typeName, zone });
        inserted += 1;
      }
    });

    if (inserted === 0) {
      setPageAiError("No valid templates or section types matched.");
      return;
    }
    toast(`Inserted ${inserted} section${inserted === 1 ? "" : "s"}.`, { variant: "success" });
  }, [pageAiOutput, pageAiTask, extractPageAiJson, dispatch, toast]);

  const handleCancelPageAi = useCallback((): void => {
    if (pageAiAbortRef.current) {
      pageAiAbortRef.current.abort();
      pageAiAbortRef.current = null;
    }
  }, []);

  if (!page) return null;

  return (
    <Tabs defaultValue="page" className="flex flex-1 flex-col overflow-hidden">
      <TabsList className="mx-4 mt-3 w-[calc(100%-2rem)]">
        <TabsTrigger value="page" className="flex-1 text-xs">Page</TabsTrigger>
        <TabsTrigger value="seo" className="flex-1 text-xs">SEO</TabsTrigger>
        <TabsTrigger value="ai" className="flex-1 text-xs">AI</TabsTrigger>
      </TabsList>

      {/* ---- Page tab ---- */}
      <TabsContent value="page" className="flex-1 overflow-y-auto p-4 mt-0">
        <div className="space-y-4">
          <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
            <FileText className="mr-1.5 inline size-3" />
            {page.name}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="page-name" className="text-xs text-gray-400">Page name</Label>
            <Input
              id="page-name"
              value={page.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => handleNameChange(e.target.value)}
              placeholder="Page name"
              className="h-8 text-xs"
            />
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
            <Label className="text-xs text-gray-400">Menu</Label>
            <div className="flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-3 py-2">
              <span className="text-xs text-gray-300">Show global menu on this page</span>
              <Switch checked={showMenuValue} onCheckedChange={handleMenuVisibilityChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Slugs for this zone</Label>
            <Input
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearch(e.target.value)}
              placeholder="Search slugs..."
              className="h-8 text-xs"
            />
            <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-border/40 bg-gray-900/40 p-2">
              {filteredDomainSlugs.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">
                  No slugs available for this zone.
                </p>
              ) : (
                filteredDomainSlugs.map((slug: Slug) => {
                  const checked = selectedSlugIds.includes(slug.id);
                  return (
                    <label key={slug.id} className="flex items-center gap-2 text-xs text-gray-200">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(): void => handleToggleSlug(slug)}
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
                {crossZoneSlugs.map((slug: Slug) => (
                  <button
                    key={slug.id}
                    type="button"
                    onClick={(): void => handleRemoveSlug(slug)}
                    className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200"
                  >
                    /{slug.slug} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Home page</Label>
            {eligibleHomeSlugs.length === 0 ? (
              <p className="text-xs text-gray-500">
                Assign at least one slug in this zone to set this page as the home page.
              </p>
            ) : (
              <div className="space-y-2">
                {eligibleHomeSlugs.map((slug: Slug) => {
                  const isHome = currentHomeSlug?.id === slug.id;
                  return (
                    <div
                      key={slug.id}
                      className="flex items-center justify-between rounded border border-border/40 bg-gray-900/40 px-2.5 py-2 text-xs"
                    >
                      <span className="text-gray-200">/{slug.slug}</span>
                      {isHome ? (
                        <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-300">
                          Home
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateSlug.isPending}
                          onClick={(): void => { void handleSetHome(slug); }}
                          className="h-6 px-2 text-[10px]"
                        >
                          Set as home
                        </Button>
                      )}
                    </div>
                  );
                })}
                {currentHomeSlug && !pageHomeSlug ? (
                  <p className="text-[10px] text-gray-500">
                    Current home page: /{currentHomeSlug.slug}
                  </p>
                ) : null}
              </div>
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

      {/* ---- AI tab ---- */}
      <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 mt-0">
        <div className="space-y-4">
          <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
            AI page assistant
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Task</Label>
            <UnifiedSelect
              value={pageAiTask}
              onValueChange={(value: string): void => setPageAiTask(value as "layout" | "seo")}
              options={pageAiTaskOptions}
              placeholder="Select task"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Provider</Label>
            <UnifiedSelect
              value={pageAiProvider}
              onValueChange={(value: string): void => setPageAiProvider(value as "model" | "agent")}
              options={pageAiProviderOptions}
              placeholder="Select provider"
            />
          </div>
          {pageAiProvider !== "agent" ? (
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Model</Label>
              <UnifiedSelect
                value={pageAiModelId}
                onValueChange={(value: string): void => setPageAiModelId(value)}
                options={modelOptions.map((model: string) => ({ value: model, label: model }))}
                placeholder={modelOptions.length ? "Select model" : "No models available"}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Deepthinking agent</Label>
              <UnifiedSelect
                value={pageAiAgentId}
                onValueChange={(value: string): void => setPageAiAgentId(value)}
                options={agentOptions.length ? agentOptions : [{ label: "No agents configured", value: "" }]}
                placeholder={agentOptions.length ? "Select agent" : "No agents configured"}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Prompt</Label>
            <Textarea
              value={pageAiPrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setPageAiPrompt(e.target.value)}
              placeholder={`Describe what you need.\n\nContext:\n${pageAiPlaceholder}`}
              className="min-h-[120px] text-xs"
              spellCheck={false}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-gray-500">Context placeholders</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(): void => {
                const current = pageAiPrompt.trim();
                const nextPrompt = current.length ? `${current}\n\n${pageAiPlaceholder}` : pageAiPlaceholder;
                setPageAiPrompt(nextPrompt);
              }}
            >
              Insert placeholders
            </Button>
          </div>
          <Textarea
            value={pageAiPlaceholder}
            readOnly
            className="min-h-[64px] text-xs font-mono text-gray-300"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              onClick={(): void => void handleGeneratePageAi()}
              disabled={pageAiLoading}
            >
              {pageAiLoading ? "Generating…" : "Generate"}
            </Button>
            {pageAiLoading && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancelPageAi}
              >
                Cancel
              </Button>
            )}
          </div>
          {pageAiError && (
            <div className="text-xs text-red-400">{pageAiError}</div>
          )}
          {pageAiOutput && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-400">AI output</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleApplyPageAi}
                >
                  Apply
                </Button>
              </div>
              <Textarea
                value={pageAiOutput}
                readOnly
                className="min-h-[140px] text-xs font-mono text-gray-300"
              />
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
