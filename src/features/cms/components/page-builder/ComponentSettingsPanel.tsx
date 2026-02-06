"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, MousePointer2, Monitor, Smartphone, PanelRightClose, Paintbrush } from "lucide-react";
import { Button, PanelHeader, Tabs, TabsList, TabsTrigger, TabsContent, Input, Checkbox, Textarea, useToast } from "@/shared/ui";
import type { SettingsField, InspectorSettings, BlockInstance, SectionInstance } from "../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { getSectionDefinition, getBlockDefinition, IMAGE_ELEMENT_BACKGROUND_MODE_SETTINGS, getImageBackgroundTargetOptions, type ImageBackgroundTarget } from "./section-registry";
import { AnimationConfigPanel } from "./AnimationConfigPanel";
import { CssAnimationConfigPanel } from "./CssAnimationConfigPanel";
import type { CssAnimationConfig } from "@/features/cms/types/css-animations";
import type { CustomCssAiConfig } from "@/features/cms/types/custom-css-ai";
import { DEFAULT_CUSTOM_CSS_AI_CONFIG } from "@/features/cms/types/custom-css-ai";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import { useSettingsStore } from "@/shared/providers/SettingsStoreProvider";
import { parseJsonSetting, serializeSetting } from "@/shared/utils/settings-json";
import { APP_EMBED_SETTING_KEY, type AppEmbedId, APP_EMBED_OPTIONS } from "@/features/app-embeds/lib/constants";
import { GRID_TEMPLATE_SETTINGS_KEY, normalizeGridTemplates, type GridTemplateRecord } from "./grid-templates";
import { SECTION_TEMPLATE_SETTINGS_KEY, normalizeSectionTemplates, type SectionTemplateRecord } from "./section-template-store";
import { logClientError } from "@/features/observability";
import {
  getEventEffectsConfig,
} from "@/features/cms/utils/event-effects";
import { useChatbotModels } from "@/features/ai/chatbot/hooks/useChatbotQueries";
import { useTeachingAgents } from "@/features/ai/agentcreator/teaching/hooks/useAgentTeaching";
import type { AgentTeachingAgentRecord } from "@/shared/types/agent-teaching";
import type { ChatMessage } from "@/shared/types/chatbot";

import { prependManagementFields, groupSettingsFields, renderFieldGroups } from "./settings/field-group-helpers";
import { PageSettingsTab } from "./settings/PageSettingsTab";
import { CssAiSection, extractCssFromResponse, extractJsonFromResponse } from "./settings/CssAiSection";
import { ContentAiSection } from "./settings/ContentAiSection";
import { EventEffectsTab } from "./settings/EventEffectsTab";
import { ConnectionsTab } from "./settings/ConnectionsTab";

type AppEmbedOption = (typeof APP_EMBED_OPTIONS)[number];

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
  const [sectionTemplateName, setSectionTemplateName] = useState<string>("");
  const [sectionTemplateCategory, setSectionTemplateCategory] = useState<string>("");
  const [cssAiAppend, setCssAiAppend] = useState<boolean>(true);
  const [cssAiAutoApply, setCssAiAutoApply] = useState<boolean>(false);
  const [cssAiLoading, setCssAiLoading] = useState<boolean>(false);
  const [cssAiError, setCssAiError] = useState<string | null>(null);
  const [cssAiOutput, setCssAiOutput] = useState<string>("");
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

  const sectionTemplatesRaw = settingsStore.get(SECTION_TEMPLATE_SETTINGS_KEY);
  const sectionTemplates = useMemo<SectionTemplateRecord[]>(() => {
    const stored = parseJsonSetting<unknown>(
      sectionTemplatesRaw,
      []
    );
    return normalizeSectionTemplates(stored);
  }, [sectionTemplatesRaw]);

  const handleSaveSectionTemplate = useCallback(async (): Promise<void> => {
    if (!selectedSection) return;
    const trimmedName = sectionTemplateName.trim();
    const name = trimmedName.length > 0 ? trimmedName : `${selectedSection.type} template ${sectionTemplates.length + 1}`;
    const category = sectionTemplateCategory.trim().length > 0 ? sectionTemplateCategory.trim() : "Saved sections";
    const sectionClone: SectionInstance = structuredClone({
      ...selectedSection,
      zone: "template",
    });
    const nextRecord: SectionTemplateRecord = {
      id: `section-${Date.now()}`,
      name,
      description: "",
      category,
      sectionType: selectedSection.type,
      createdAt: new Date().toISOString(),
      section: sectionClone,
    };
    const nextTemplates = [...sectionTemplates, nextRecord];
    try {
      const promises: Promise<unknown>[] = [
        updateSetting.mutateAsync({
          key: SECTION_TEMPLATE_SETTINGS_KEY,
          value: serializeSetting(nextTemplates),
        }),
      ];
      // For Grid sections, also save to grid templates for backward compat
      if (selectedSection.type === "Grid") {
        const gridRecord: GridTemplateRecord = {
          id: `grid-${Date.now()}`,
          name,
          description: "",
          createdAt: new Date().toISOString(),
          section: sectionClone,
        };
        const nextGridTemplates = [...gridTemplates, gridRecord];
        promises.push(
          updateSetting.mutateAsync({
            key: GRID_TEMPLATE_SETTINGS_KEY,
            value: serializeSetting(nextGridTemplates),
          })
        );
      }
      await Promise.all(promises);
      setSectionTemplateName("");
      setSectionTemplateCategory("");
      toast("Section saved as template.", { variant: "success" });
    } catch (error) {
      logClientError(error, { context: { source: "ComponentSettingsPanel", action: "saveSectionTemplate", templateName: sectionTemplateName } });
      toast("Failed to save section template.", { variant: "error" });
    }
  }, [selectedSection, sectionTemplateName, sectionTemplateCategory, sectionTemplates, gridTemplates, updateSetting, toast]);

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
  }, [contentAiOutput, applyContentAiSettings]);

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

  const selectedTitle = useMemo((): string => {
    if (selectedSection) return `Section: ${selectedLabel}`;
    if (selectedBlock) return `Block: ${selectedLabel}`;
    if (selectedColumn) return "Column";
    return "Settings";
  }, [selectedSection, selectedBlock, selectedColumn, selectedLabel]);

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
        title={selectedTitle}
        className="flex-row-reverse"
        titleClassName="text-right"
        actionsClassName="justify-start"
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
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(): void => updateInspectorSetting({ showEditorChrome: !inspectorSettings.showEditorChrome })}
              title={inspectorSettings.showEditorChrome ? "Hide edit chrome" : "Show edit chrome"}
              aria-label="Toggle edit chrome"
              className={`h-6 w-6 p-0 ${
                inspectorSettings.showEditorChrome
                  ? "text-blue-300 bg-blue-500/10"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Paintbrush className="size-3.5" />
            </Button>
          </div>
        )}
      />

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

                <div className="rounded border border-border/40 bg-gray-900/40 p-3">
                  <div className="text-xs font-semibold text-gray-200">Save section as template</div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Saved sections appear under Templates when adding sections.
                  </p>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={sectionTemplateName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSectionTemplateName(e.target.value)}
                        placeholder="Template name"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={sectionTemplateCategory}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSectionTemplateCategory(e.target.value)}
                        placeholder="Category"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      onClick={() => void handleSaveSectionTemplate()}
                      size="sm"
                      className="h-8 w-full"
                      disabled={updateSetting.isPending || !selectedSection}
                    >
                      Save as template
                    </Button>
                  </div>
                </div>

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
            <ContentAiSection
              selectedLabel={selectedLabel}
              contentAiProvider={contentAiProvider}
              setContentAiProvider={setContentAiProvider}
              contentAiModelId={contentAiModelId}
              setContentAiModelId={setContentAiModelId}
              contentAiAgentId={contentAiAgentId}
              setContentAiAgentId={setContentAiAgentId}
              contentAiPrompt={contentAiPrompt}
              setContentAiPrompt={setContentAiPrompt}
              contentAiLoading={contentAiLoading}
              contentAiError={contentAiError}
              contentAiOutput={contentAiOutput}
              contentAiAllowedKeys={contentAiAllowedKeys}
              contentAiPlaceholder={contentAiPlaceholder}
              providerOptions={providerOptions}
              modelOptions={modelOptions}
              agentOptions={agentOptions}
              onGenerateContentAi={(): void => void handleGenerateContentAi()}
              onCancelContentAi={handleCancelContentAi}
              onApplyContentAi={handleApplyContentAi}
            />
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
                <CssAiSection
                  customCssValue={customCssValue}
                  cssAiOutput={cssAiOutput}
                  cssAiError={cssAiError}
                  cssAiLoading={cssAiLoading}
                  cssAiAutoApply={cssAiAutoApply}
                  setCssAiAutoApply={setCssAiAutoApply}
                  cssAiAppend={cssAiAppend}
                  setCssAiAppend={setCssAiAppend}
                  onGenerateCss={(): void => void handleGenerateCss()}
                  onCancelCss={handleCancelCss}
                  onApplyGeneratedCss={handleApplyGeneratedCss}
                  customCssAiConfig={customCssAiConfig}
                  onCustomCssAiChange={handleCustomCssAiChange}
                  providerOptions={providerOptions}
                  modelOptions={modelOptions}
                  agentOptions={agentOptions}
                  contextPreviewOpen={contextPreviewOpen}
                  setContextPreviewOpen={setContextPreviewOpen}
                  contextPreviewTab={contextPreviewTab}
                  setContextPreviewTab={setContextPreviewTab}
                  contextPreviewFull={contextPreviewFull}
                  setContextPreviewFull={setContextPreviewFull}
                  setContextPreviewNonce={setContextPreviewNonce}
                  pageContextPreview={pageContextPreview}
                  elementContextPreview={elementContextPreview}
                  onCopyContext={(value: string): void => void handleCopyContext(value)}
                />
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
              <EventEffectsTab
                eventConfig={eventConfig}
                selectedBlockLabel={selectedBlock ? blockDef?.label ?? "Block" : null}
                selectedSectionLabel={selectedSection ? sectionDef?.label ?? "Section" : null}
                onEventSettingChange={handleEventSettingChange}
              />
            </TabsContent>
          )}
          {showConnectionsTab && (
            <TabsContent value="connections" className="flex-1 overflow-y-auto p-4 mt-0">
              <ConnectionsTab
                hasSelection={hasSelection}
                selectedLabel={selectedLabel}
                connectionSettings={connectionSettings}
                updateConnectionSetting={updateConnectionSetting}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </aside>
  );
}
