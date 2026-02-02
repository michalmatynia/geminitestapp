"use client";

import React, { useState } from "react";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import type { ClusterPresetDraft } from "../cluster-presets-panel";
import type { AiNode, ClusterPreset, DbNodePreset, DbQueryPreset, Edge } from "@/features/ai-paths/lib";
import {
  BUNDLE_INPUT_PORTS,
  CLUSTER_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  TEMPLATE_INPUT_PORTS,
  createPresetId,
  parsePathList,
} from "@/features/ai-paths/lib";

type ToastFn = (message: string, options?: Partial<{ variant: "success" | "error" | "info"; duration: number }>) => void;

type UseAiPathsPresetsArgs = {
  nodes: AiNode[];
  edges: Edge[];
  selectedNode: AiNode | null;
  setNodes: React.Dispatch<React.SetStateAction<AiNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setSelectedNodeId: (value: string | null) => void;
  ensureNodeVisible: (node: AiNode) => void;
  getCanvasCenterPosition: () => { x: number; y: number };
  toast: ToastFn;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

const DEFAULT_PRESET_DRAFT: ClusterPresetDraft = {
  name: "",
  description: "",
  bundlePorts: "context\nmeta\ntrigger\ntriggerName\nentityJson\nentityId\nentityType\nresult",
  template: "Write a summary for {{context.entity.title}}",
};

export interface AiPathsPresets {
  clusterPresets: ClusterPreset[];
  setClusterPresets: React.Dispatch<React.SetStateAction<ClusterPreset[]>>;
  saveClusterPresets: (nextPresets: ClusterPreset[]) => Promise<void>;
  dbQueryPresets: DbQueryPreset[];
  setDbQueryPresets: React.Dispatch<React.SetStateAction<DbQueryPreset[]>>;
  saveDbQueryPresets: (nextPresets: DbQueryPreset[]) => Promise<void>;
  dbNodePresets: DbNodePreset[];
  setDbNodePresets: React.Dispatch<React.SetStateAction<DbNodePreset[]>>;
  saveDbNodePresets: (nextPresets: DbNodePreset[]) => Promise<void>;
  editingPresetId: string | null;
  presetDraft: ClusterPresetDraft;
  setPresetDraft: React.Dispatch<React.SetStateAction<ClusterPresetDraft>>;
  handleSavePreset: () => Promise<void>;
  handleLoadPreset: (preset: ClusterPreset) => void;
  handleDeletePreset: (presetId: string) => Promise<void>;
  handleApplyPreset: (preset: ClusterPreset) => void;
  handleExportPresets: () => void;
  handleImportPresets: (mode: "merge" | "replace") => Promise<void>;
  handlePresetFromSelection: () => void;
  handleResetPresetDraft: () => void;
  presetsModalOpen: boolean;
  setPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  presetsJson: string;
  setPresetsJson: React.Dispatch<React.SetStateAction<string>>;
  expandedPaletteGroups: Set<string>;
  setExpandedPaletteGroups: React.Dispatch<React.SetStateAction<Set<string>>>;
  paletteCollapsed: boolean;
  setPaletteCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  togglePaletteGroup: (title: string) => void;
  normalizeDbQueryPreset: (raw: Partial<DbQueryPreset>) => DbQueryPreset;
  normalizeDbNodePreset: (raw: Partial<DbNodePreset>) => DbNodePreset;
}

export function useAiPathsPresets({
  nodes,
  edges,
  selectedNode,
  setNodes,
  setEdges,
  setSelectedNodeId,
  ensureNodeVisible,
  getCanvasCenterPosition,
  toast,
  reportAiPathsError,
}: UseAiPathsPresetsArgs): AiPathsPresets {
  const [clusterPresets, setClusterPresets] = useState<ClusterPreset[]>([]);
  const [dbQueryPresets, setDbQueryPresets] = useState<DbQueryPreset[]>([]);
  const [dbNodePresets, setDbNodePresets] = useState<DbNodePreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraft, setPresetDraft] = useState<ClusterPresetDraft>(DEFAULT_PRESET_DRAFT);
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);
  const [presetsJson, setPresetsJson] = useState("");
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(["Triggers"])
  );
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  const updateSettingMutation = useUpdateSetting();

  const saveClusterPresets = async (nextPresets: ClusterPreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: CLUSTER_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveClusterPresets" }, "Failed to save presets:");
      toast("Failed to save cluster presets.", { variant: "error" });
    }
  };

  const saveDbQueryPresets = async (nextPresets: DbQueryPreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: DB_QUERY_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveDbQueryPresets" }, "Failed to save query presets:");
      toast("Failed to save query presets.", { variant: "error" });
    }
  };

  const saveDbNodePresets = async (nextPresets: DbNodePreset[]): Promise<void> => {
    try {
      await updateSettingMutation.mutateAsync({
        key: DB_NODE_PRESETS_KEY,
        value: JSON.stringify(nextPresets),
      });
    } catch (error: unknown) {
      reportAiPathsError(error, { action: "saveDbNodePresets" }, "Failed to save database presets:");
      toast("Failed to save database presets.", { variant: "error" });
    }
  };

  const normalizePreset = (raw: Partial<ClusterPreset>): ClusterPreset => {
    const now = new Date().toISOString();
    const bundlePorts = Array.isArray(raw.bundlePorts) ? raw.bundlePorts : [];
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Cluster Preset",
      description: typeof raw.description === "string" ? raw.description : "",
      bundlePorts,
      template: typeof raw.template === "string" ? raw.template : "",
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const normalizeDbQueryPreset = (raw: Partial<DbQueryPreset>): DbQueryPreset => {
    const now = new Date().toISOString();
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Query Preset",
      queryTemplate:
        typeof raw.queryTemplate === "string" && raw.queryTemplate.trim()
          ? raw.queryTemplate
          : "{\n  \"_id\": \"{{value}}\"\n}",
      updateTemplate: typeof raw.updateTemplate === "string" ? raw.updateTemplate : "",
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const normalizeDbNodePreset = (raw: Partial<DbNodePreset>): DbNodePreset => {
    const now = new Date().toISOString();
    return {
      id: raw.id && typeof raw.id === "string" ? raw.id : createPresetId(),
      name:
        typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Database Preset",
      description: typeof raw.description === "string" ? raw.description : "",
      config:
        raw.config && typeof raw.config === "object"
          ? raw.config
          : ({ operation: "query" } as DbNodePreset["config"]),
      createdAt: raw.createdAt ?? now,
      updatedAt: raw.updatedAt ?? now,
    };
  };

  const togglePaletteGroup = (title: string): void => {
    setExpandedPaletteGroups((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const handleSavePreset = async (): Promise<void> => {
    const name = presetDraft.name.trim();
    if (!name) {
      toast("Preset name is required.", { variant: "error" });
      return;
    }
    const now = new Date().toISOString();
    const bundlePorts = parsePathList(presetDraft.bundlePorts);
    const template = presetDraft.template.trim();
    const nextPresets = [...clusterPresets];
    if (editingPresetId) {
      const index = nextPresets.findIndex(
        (preset: ClusterPreset): boolean => preset.id === editingPresetId
      );
      const existing = nextPresets[index];
      if (index >= 0 && existing) {
        nextPresets[index] = {
          ...existing,
          name,
          description: presetDraft.description.trim(),
          bundlePorts,
          template,
          updatedAt: now,
        };
      }
    } else {
      nextPresets.push({
        id: createPresetId(),
        name,
        description: presetDraft.description.trim(),
        bundlePorts,
        template,
        createdAt: now,
        updatedAt: now,
      });
    }
    setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    setEditingPresetId(null);
    toast("Cluster preset saved.", { variant: "success" });
  };

  const handleLoadPreset = (preset: ClusterPreset): void => {
    setEditingPresetId(preset.id);
    setPresetDraft({
      name: preset.name,
      description: preset.description ?? "",
      bundlePorts: preset.bundlePorts.join("\n"),
      template: preset.template ?? "",
    });
  };

  const handleDeletePreset = async (presetId: string): Promise<void> => {
    const target = clusterPresets.find(
      (preset: ClusterPreset): boolean => preset.id === presetId
    );
    if (!target) return;
    const confirmed = window.confirm(`Delete preset "${target.name}"?`);
    if (!confirmed) return;
    const nextPresets = clusterPresets.filter(
      (preset: ClusterPreset): boolean => preset.id !== presetId
    );
    setClusterPresets(nextPresets);
    await saveClusterPresets(nextPresets);
    if (editingPresetId === presetId) {
      setEditingPresetId(null);
      setPresetDraft(DEFAULT_PRESET_DRAFT);
    }
  };

  const handleApplyPreset = (preset: ClusterPreset): void => {
    const base = getCanvasCenterPosition();
    const bundleNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      type: "bundle",
      title: `${preset.name} Bundle`,
      description: preset.description || "Cluster preset bundle.",
      inputs: BUNDLE_INPUT_PORTS,
      outputs: ["bundle"],
      position: { x: base.x, y: base.y },
      config: {
        bundle: {
          includePorts: preset.bundlePorts ?? [],
        },
      },
    };
    const templateNode: AiNode = {
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      type: "template",
      title: `${preset.name} Template`,
      description: "Preset template prompt.",
      inputs: TEMPLATE_INPUT_PORTS,
      outputs: ["prompt"],
      position: { x: base.x + 320, y: base.y },
      config: {
        template: {
          template: preset.template ?? "",
        },
      },
    };
    const edge: Edge = {
      id: `edge-${Math.random().toString(36).slice(2, 8)}`,
      from: bundleNode.id,
      to: templateNode.id,
      fromPort: "bundle",
      toPort: "bundle",
    };
    setNodes((prev: AiNode[]): AiNode[] => [...prev, bundleNode, templateNode]);
    setEdges((prev: Edge[]): Edge[] => [...prev, edge]);
    setSelectedNodeId(templateNode.id);
    ensureNodeVisible(templateNode);
    toast(`Preset applied: ${preset.name}`, { variant: "success" });
  };

  const handleExportPresets = (): void => {
    const payload = JSON.stringify(clusterPresets, null, 2);
    setPresetsJson(payload);
    setPresetsModalOpen(true);
  };

  const handleImportPresets = async (mode: "merge" | "replace"): Promise<void> => {
    if (!presetsJson.trim()) {
      toast("Paste presets JSON to import.", { variant: "error" });
      return;
    }
    if (mode === "replace") {
      const confirmed = window.confirm("Replace existing presets? This cannot be undone.");
      if (!confirmed) return;
    }
    try {
      const parsed = JSON.parse(presetsJson) as unknown;
      const list = (Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && "presets" in (parsed as Record<string, unknown>)
          ? (parsed as Record<string, unknown>).presets
          : null) as unknown[] | null;
      if (!list) {
        toast("Invalid presets JSON. Expected an array.", { variant: "error" });
        return;
      }
      const normalized = list.map((item: unknown): ClusterPreset =>
        normalizePreset(item as Partial<ClusterPreset>)
      );
      let nextPresets = mode === "replace" ? [] : [...clusterPresets];
      const existingIds = new Set(nextPresets.map((preset: ClusterPreset): string => preset.id));
      const merged = normalized.map((preset: ClusterPreset): ClusterPreset => {
        if (existingIds.has(preset.id)) {
          return { ...preset, id: createPresetId(), updatedAt: new Date().toISOString() };
        }
        return preset;
      });
      nextPresets = [...nextPresets, ...merged];
      setClusterPresets(nextPresets);
      await saveClusterPresets(nextPresets);
      toast("Presets imported.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "importPresets" }, "Failed to import presets:");
      toast("Failed to import presets. Check JSON format.", { variant: "error" });
    }
  };

  const handlePresetFromSelection = (): void => {
    const selectedTemplate = selectedNode?.type === "template" ? selectedNode : null;
    const selectedBundle = selectedNode?.type === "bundle" ? selectedNode : null;

    const findBundleForTemplate = (template: AiNode): AiNode[] => {
      const bundleEdges = edges.filter(
        (edge: Edge): boolean => edge.to === template.id && edge.toPort === "bundle"
      );
      const bundleNodes = bundleEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.from)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node && node.type === "bundle"));
      return bundleNodes;
    };

    const findTemplateForBundle = (bundle: AiNode): AiNode[] => {
      const templateEdges = edges.filter(
        (edge: Edge): boolean => edge.from === bundle.id && edge.fromPort === "bundle"
      );
      const templateNodes = templateEdges
        .map((edge: Edge): AiNode | undefined =>
          nodes.find((node: AiNode): boolean => node.id === edge.to)
        )
        .filter((node: AiNode | undefined): node is AiNode => Boolean(node && node.type === "template"));
      return templateNodes;
    };

    let templateNode: AiNode | null = selectedTemplate;
    let bundleNode: AiNode | null = selectedBundle;

    if (selectedTemplate && !bundleNode) {
      const bundles = findBundleForTemplate(selectedTemplate);
      if (bundles.length > 1) {
        toast("Multiple bundles connected. Using the first one.", { variant: "info" });
      }
      bundleNode = bundles[0] ?? null;
    }

    if (selectedBundle && !templateNode) {
      const templates = findTemplateForBundle(selectedBundle);
      if (templates.length > 1) {
        toast("Multiple templates connected. Using the first one.", { variant: "info" });
      }
      templateNode = templates[0] ?? null;
    }

    if (!templateNode || !bundleNode) {
      toast("Select a connected Bundle + Template pair.", { variant: "error" });
      return;
    }

    const presetName = templateNode.title.replace(/template/i, "").trim() || "Cluster Preset";
    setEditingPresetId(null);
    setPresetDraft({
      name: presetName,
      description: bundleNode.description ?? "",
      bundlePorts: (bundleNode.config?.bundle?.includePorts ?? bundleNode.inputs).join("\n"),
      template: templateNode.config?.template?.template ?? "",
    });
    toast("Preset draft loaded from selection.", { variant: "success" });
  };

  const handleResetPresetDraft = (): void => {
    setEditingPresetId(null);
    setPresetDraft(DEFAULT_PRESET_DRAFT);
  };

  return {
    clusterPresets,
    setClusterPresets,
    saveClusterPresets,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    dbNodePresets,
    setDbNodePresets,
    saveDbNodePresets,
    editingPresetId,
    presetDraft,
    setPresetDraft,
    handleSavePreset,
    handleLoadPreset,
    handleDeletePreset,
    handleApplyPreset,
    handleExportPresets,
    handleImportPresets,
    handlePresetFromSelection,
    handleResetPresetDraft,
    presetsModalOpen,
    setPresetsModalOpen,
    presetsJson,
    setPresetsJson,
    expandedPaletteGroups,
    setExpandedPaletteGroups,
    paletteCollapsed,
    setPaletteCollapsed,
    togglePaletteGroup,
    normalizeDbQueryPreset,
    normalizeDbNodePreset,
  };
}
