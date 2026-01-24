"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logClientError } from "@/lib/client/error-logger";

type NodeType =
  | "trigger"
  | "simulation"
  | "context"
  | "parser"
  | "prompt"
  | "model"
  | "updater"
  | "viewer";

type ParserConfig = {
  mappings: Record<string, string>;
};

type ModelConfig = {
  modelId: string;
  temperature: number;
  maxTokens: number;
  vision: boolean;
};

type UpdaterConfig = {
  targetField: string;
  idField: string;
  mode: "replace" | "append";
};

type TriggerConfig = {
  event: string;
};

type SimulationConfig = {
  productId: string;
};

type ViewerConfig = {
  outputs: Record<string, string>;
};

type ContextConfig = {
  role: string;
};

type NodeConfig = {
  trigger?: TriggerConfig;
  simulation?: SimulationConfig;
  viewer?: ViewerConfig;
  context?: ContextConfig;
  parser?: ParserConfig;
  model?: ModelConfig;
  updater?: UpdaterConfig;
};

type NodeDefinition = {
  type: NodeType;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

type AiNode = NodeDefinition & {
  id: string;
  position: { x: number; y: number };
  config?: NodeConfig;
};

type Edge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromPort?: string;
  toPort?: string;
};

const NODE_WIDTH = 280;
const NODE_MIN_HEIGHT = 160;
const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1400;
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.6;
const VIEW_MARGIN = 40;
const PORT_GAP = 18;
const PORT_SIZE = 10;
const DEFAULT_CONTEXT_ROLE = "product";
const TRIGGER_INPUT_PORTS = ["role", "simulation"];
const TRIGGER_OUTPUT_PORTS = ["trigger", "context", "meta"];
const CONTEXT_OUTPUT_PORTS = ["role", "context"];
const SIMULATION_OUTPUT_PORTS = ["simulation", "productId"];

const palette: NodeDefinition[] = [
  {
    type: "trigger",
    title: "Trigger: Product Modal",
    description: "Runs when Context Grabber is clicked inside Product modal.",
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
  },
  {
    type: "trigger",
    title: "Trigger: Bulk Generate",
    description: "Runs from bulk action in Product list.",
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
  },
  {
    type: "trigger",
    title: "Trigger: On Product Save",
    description: "Runs automatically after a product is saved.",
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
  },
  {
    type: "trigger",
    title: "Trigger: Path Generate Description",
    description: "Runs when the Path Generate Description button is clicked.",
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
  },
  {
    type: "simulation",
    title: "Simulation: Product Modal",
    description: "Simulate a Product modal action by Product ID.",
    inputs: [],
    outputs: SIMULATION_OUTPUT_PORTS,
  },
  {
    type: "viewer",
    title: "Result Viewer",
    description: "Preview outputs connected from other nodes.",
    inputs: ["result", "analysis", "description", "context", "meta", "trigger"],
    outputs: [],
  },
  {
    type: "context",
    title: "Context Grabber",
    description: "Collects live context (Product, Order, User).",
    inputs: [],
    outputs: ["role", "context", "productJson"],
  },
  {
    type: "parser",
    title: "JSON Parser",
    description: "Extracts fields into typed outputs.",
    inputs: ["productJson"],
    outputs: ["productId", "title", "images", "content_en"],
  },
  {
    type: "prompt",
    title: "Prompt",
    description: "Formats text with placeholders.",
    inputs: ["title", "images", "result"],
    outputs: ["prompt"],
  },
  {
    type: "model",
    title: "Model",
    description: "Runs a selected model.",
    inputs: ["prompt", "images"],
    outputs: ["result"],
  },
  {
    type: "updater",
    title: "Updater",
    description: "Writes result to target field.",
    inputs: ["productId", "content_en", "result"],
    outputs: ["content_en"],
  },
];

const PATH_INDEX_KEY = "ai_paths_index";
const AI_PATHS_LAST_ERROR_KEY = "ai_paths_last_error";
const PATH_CONFIG_PREFIX = "ai_paths_config_";
const STORAGE_VERSION = 1;
const DEFAULT_MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
const TRIGGER_EVENTS = [
  { id: "path_generate_description", label: "Path Generate Description" },
];

type PathMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type PathConfig = {
  id: string;
  version: number;
  name: string;
  description: string;
  trigger: string;
  nodes: AiNode[];
  edges: Edge[];
  updatedAt: string;
};

const createParserMappings = (outputs: string[]) =>
  outputs.reduce<Record<string, string>>((acc, output) => {
    acc[output] = "";
    return acc;
  }, {});

const createViewerOutputs = (inputs: string[]) =>
  inputs.reduce<Record<string, string>>((acc, input) => {
    acc[input] = "";
    return acc;
  }, {});

const ensureUniquePorts = (ports: string[], add: string[]) => {
  const set = new Set(ports);
  add.forEach((port) => set.add(port));
  return Array.from(set);
};

const normalizeNodes = (items: AiNode[]) =>
  items.map((node) => {
    if (node.type === "context") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, [
          ...CONTEXT_OUTPUT_PORTS,
          "productJson",
        ]),
        config: {
          ...node.config,
          context: {
            role: node.config?.context?.role ?? DEFAULT_CONTEXT_ROLE,
          },
        },
      };
    }
    if (node.type === "viewer") {
      const existingOutputs = node.config?.viewer?.outputs;
      const legacyOutput =
        (node.config as { viewer?: { sampleOutput?: string } } | undefined)?.viewer
          ?.sampleOutput ?? "";
      const outputs = existingOutputs ?? {
        ...createViewerOutputs(node.inputs),
        ...(legacyOutput ? { result: legacyOutput } : {}),
      };
      return {
        ...node,
        config: {
          ...node.config,
          viewer: {
            outputs: {
              ...createViewerOutputs(node.inputs),
              ...outputs,
            },
          },
        },
      };
    }
    if (node.type === "trigger") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, TRIGGER_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, TRIGGER_OUTPUT_PORTS),
      };
    }
    if (node.type === "simulation") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, SIMULATION_OUTPUT_PORTS),
      };
    }
    return node;
  });

const getDefaultConfigForType = (
  type: NodeType,
  outputs: string[],
  inputs: string[]
): NodeConfig | undefined => {
  if (type === "trigger") {
    return { trigger: { event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description" } };
  }
  if (type === "simulation") {
    return { simulation: { productId: "" } };
  }
  if (type === "viewer") {
    return { viewer: { outputs: createViewerOutputs(inputs) } };
  }
  if (type === "context") {
    return { context: { role: DEFAULT_CONTEXT_ROLE } };
  }
  if (type === "parser") {
    return { parser: { mappings: createParserMappings(outputs) } };
  }
  if (type === "model") {
    return {
      model: {
        modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
        temperature: 0.7,
        maxTokens: 800,
        vision: inputs.includes("images"),
      },
    };
  }
  if (type === "updater") {
    return {
      updater: {
        targetField: outputs[0] ?? "content_en",
        idField: "productId",
        mode: "replace",
      },
    };
  }
  return undefined;
};

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPortOffsetY = (index: number, totalPorts: number) => {
  const totalHeight = (totalPorts - 1) * PORT_GAP;
  const startY = NODE_MIN_HEIGHT / 2 - totalHeight / 2;
  return startY + index * PORT_GAP;
};

const isValidConnection = (
  from: AiNode,
  to: AiNode,
  fromPort?: string,
  toPort?: string
) => {
  if (!fromPort || !toPort) return false;
  if (!from.outputs.includes(fromPort)) return false;
  if (!to.inputs.includes(toPort)) return false;
  return fromPort === toPort;
};

const sanitizeEdges = (nodes: AiNode[], edges: Edge[]) => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge) => {
    if (!edge.from || !edge.to) return [];
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return [];
    if (edge.fromPort && edge.toPort) {
      if (!isValidConnection(from, to, edge.fromPort, edge.toPort)) return [];
      return [edge];
    }
    const matches = from.outputs.filter((output) => to.inputs.includes(output));
    if (matches.length !== 1) return [];
    const port = matches[0];
    return [
      {
        ...edge,
        fromPort: port,
        toPort: port,
      },
    ];
  });
};

type ConnectionValidation = {
  valid: boolean;
  message?: string;
};

// Strict port compatibility: output port must match input port
const PORT_COMPATIBILITY: Record<string, string[]> = {
  role: ["role"],
  productJson: ["productJson"],
  productId: ["productId"],
  trigger: ["trigger"],
  prompt: ["prompt"],
  result: ["result"],
  images: ["images"],
  title: ["title"],
  content_en: ["content_en"],
  context: ["context"],
  simulation: ["simulation"],
  meta: ["meta"],
};

// Define which node types can connect to which node types
const NODE_TYPE_COMPATIBILITY: Record<NodeType, NodeType[]> = {
  context: ["trigger", "parser", "viewer"],
  trigger: ["viewer"],
  simulation: ["trigger"],
  parser: ["prompt", "updater", "viewer"],
  prompt: ["model"],
  model: ["prompt", "updater", "viewer"],
  updater: ["viewer"],
  viewer: [],
};

const validateConnection = (
  fromNode: AiNode,
  toNode: AiNode,
  fromPort: string,
  toPort: string,
  existingEdges: Edge[]
): ConnectionValidation => {
  // Rule 1: No self-connections
  if (fromNode.id === toNode.id) {
    return { valid: false, message: "Cannot connect a node to itself." };
  }

  // Rule 2: Ports must match
  if (!isValidConnection(fromNode, toNode, fromPort, toPort)) {
    return { valid: false, message: "Ports must match (e.g. result → result)." };
  }

  // Rule 3: No duplicate connections
  const duplicate = existingEdges.some(
    (edge) =>
      edge.from === fromNode.id &&
      edge.to === toNode.id &&
      edge.fromPort === fromPort &&
      edge.toPort === toPort
  );
  if (duplicate) {
    return { valid: false, message: "This connection already exists." };
  }

  // Rule 4: Viewer nodes cannot output (they are terminal)
  if (fromNode.type === "viewer") {
    return { valid: false, message: "Viewer nodes are terminal and cannot have outputs." };
  }

  // Rule 5: Context nodes cannot receive inputs (they are sources)
  if (toNode.type === "context") {
    return { valid: false, message: "Context nodes are sources and cannot receive inputs." };
  }

  // Rule 6: Simulation nodes cannot receive inputs (they are sources)
  if (toNode.type === "simulation") {
    return { valid: false, message: "Simulation nodes are sources and cannot receive inputs." };
  }

  // Rule 7: Check node type compatibility
  const allowedTargets = NODE_TYPE_COMPATIBILITY[fromNode.type];
  if (!allowedTargets.includes(toNode.type)) {
    return {
      valid: false,
      message: `Cannot connect ${fromNode.type} to ${toNode.type}. Allowed targets: ${allowedTargets.join(", ") || "none"}.`,
    };
  }

  // Rule 8: Check port compatibility
  const allowedInputPorts = PORT_COMPATIBILITY[fromPort];
  if (allowedInputPorts && !allowedInputPorts.includes(toPort)) {
    return {
      valid: false,
      message: `Port '${fromPort}' cannot connect to '${toPort}'. Allowed: ${allowedInputPorts.join(", ")}.`,
    };
  }

  // Rule 9: Trigger role input must come from Context role
  if (toNode.type === "trigger" && toPort === "role") {
    if (fromNode.type !== "context" || fromPort !== "role") {
      return {
        valid: false,
        message: "Trigger 'role' input must connect from Context 'role'.",
      };
    }
  }

  // Rule 10: Trigger simulation input must come from Simulation simulation
  if (toNode.type === "trigger" && toPort === "simulation") {
    if (fromNode.type !== "simulation" || fromPort !== "simulation") {
      return {
        valid: false,
        message: "Trigger 'simulation' input must connect from Simulation 'simulation'.",
      };
    }
  }

  // Rule 11: Parser productJson must come from Context productJson
  if (toNode.type === "parser" && toPort === "productJson") {
    if (fromNode.type !== "context" || fromPort !== "productJson") {
      return {
        valid: false,
        message: "Parser 'productJson' must connect from Context 'productJson'.",
      };
    }
  }

  // Rule 12: Model prompt must come from Prompt
  if (toNode.type === "model" && toPort === "prompt") {
    if (fromNode.type !== "prompt" || fromPort !== "prompt") {
      return {
        valid: false,
        message: "Model 'prompt' must connect from Prompt 'prompt'.",
      };
    }
  }

  // Rule 13: Updater productId/content_en must come from Parser
  if (toNode.type === "updater" && toPort === "productId") {
    if (fromNode.type !== "parser" || fromPort !== "productId") {
      return {
        valid: false,
        message: "Updater 'productId' must connect from Parser 'productId'.",
      };
    }
  }
  if (toNode.type === "updater" && toPort === "content_en") {
    if (fromNode.type !== "parser" || fromPort !== "content_en") {
      return {
        valid: false,
        message: "Updater 'content_en' must connect from Parser 'content_en'.",
      };
    }
  }

  // Rule 14: Updater result must come from Model
  if (toNode.type === "updater" && toPort === "result") {
    if (fromNode.type !== "model" || fromPort !== "result") {
      return {
        valid: false,
        message: "Updater 'result' must connect from Model 'result'.",
      };
    }
  }

  return { valid: true };
};

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const clampTranslate = (
  x: number,
  y: number,
  scale: number,
  viewport: DOMRect | null
) => {
  if (!viewport) return { x, y };
  const scaledWidth = CANVAS_WIDTH * scale;
  const scaledHeight = CANVAS_HEIGHT * scale;
  const minX = Math.min(VIEW_MARGIN, viewport.width - scaledWidth - VIEW_MARGIN);
  const minY = Math.min(VIEW_MARGIN, viewport.height - scaledHeight - VIEW_MARGIN);
  const maxX = VIEW_MARGIN;
  const maxY = VIEW_MARGIN;
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};

const initialNodes: AiNode[] = [
  {
    id: "node-context",
    type: "context",
    title: "Context Grabber",
    description: "Active on Product modal button.",
    inputs: [],
    outputs: ["role", "context", "productJson"],
    position: { x: 48, y: 120 },
    config: {
      context: {
        role: DEFAULT_CONTEXT_ROLE,
      },
    },
  },
  {
    id: "node-parser",
    type: "parser",
    title: "JSON Parser",
    description: "Extract [images], [title], [productId], [content_en].",
    inputs: ["productJson"],
    outputs: ["images", "title", "productId", "content_en"],
    position: { x: 340, y: 120 },
    config: {
      parser: {
        mappings: {
          images: "$.images",
          title: "$.title",
          productId: "$.id",
          content_en: "$.content_en",
        },
      },
    },
  },
  {
    id: "node-vision-prompt",
    type: "prompt",
    title: "Vision Prompt",
    description: "Prompt: Analyze [images] and [title].",
    inputs: ["images", "title"],
    outputs: ["prompt"],
    position: { x: 640, y: 40 },
  },
  {
    id: "node-vision-model",
    type: "model",
    title: "Gemma Vision",
    description: "Image analysis.",
    inputs: ["prompt", "images"],
    outputs: ["result"],
    position: { x: 920, y: 40 },
    config: {
      model: {
        modelId: "gemma",
        temperature: 0.4,
        maxTokens: 512,
        vision: true,
      },
    },
  },
  {
    id: "node-desc-prompt",
    type: "prompt",
    title: "Description Prompt",
    description: "Prompt: Use [result] and [title].",
    inputs: ["result", "title"],
    outputs: ["prompt"],
    position: { x: 640, y: 220 },
  },
  {
    id: "node-desc-model",
    type: "model",
    title: "GPT-4o",
    description: "Generate description.",
    inputs: ["prompt"],
    outputs: ["result"],
    position: { x: 920, y: 220 },
    config: {
      model: {
        modelId: "gpt-4o",
        temperature: 0.6,
        maxTokens: 900,
        vision: false,
      },
    },
  },
  {
    id: "node-updater",
    type: "updater",
    title: "Updater",
    description: "Write to [content_en].",
    inputs: ["productId", "content_en", "result"],
    outputs: ["content_en"],
    position: { x: 1200, y: 130 },
    config: {
      updater: {
        targetField: "content_en",
        idField: "productId",
        mode: "replace",
      },
    },
  },
];

const initialEdges: Edge[] = [
  { id: "edge-1", from: "node-context", to: "node-parser", fromPort: "productJson", toPort: "productJson" },
  { id: "edge-2", from: "node-parser", to: "node-vision-prompt", fromPort: "images", toPort: "images" },
  { id: "edge-3", from: "node-parser", to: "node-vision-prompt", fromPort: "title", toPort: "title" },
  { id: "edge-4", from: "node-vision-prompt", to: "node-vision-model", fromPort: "prompt", toPort: "prompt" },
  { id: "edge-5", from: "node-vision-model", to: "node-desc-prompt", fromPort: "result", toPort: "result" },
  { id: "edge-6", from: "node-desc-prompt", to: "node-desc-model", fromPort: "prompt", toPort: "prompt" },
  { id: "edge-7", from: "node-desc-model", to: "node-updater", fromPort: "result", toPort: "result" },
  { id: "edge-8", from: "node-parser", to: "node-updater", fromPort: "productId", toPort: "productId" },
  { id: "edge-9", from: "node-parser", to: "node-updater", fromPort: "content_en", toPort: "content_en" },
];

const createDefaultPathConfig = (id: string): PathConfig => {
  const now = new Date().toISOString();
  return {
    id,
    version: STORAGE_VERSION,
    name: "AI Description Path",
    description: "Visual analysis + description generation with structured updates.",
    trigger: triggers[0] ?? "Product Modal - Context Grabber",
    nodes: initialNodes,
    edges: initialEdges,
    updatedAt: now,
  };
};

const createPathMeta = (config: PathConfig): PathMeta => ({
  id: config.id,
  name: config.name,
  createdAt: config.updatedAt,
  updatedAt: config.updatedAt,
});

const createPathId = () =>
  `path_${Math.random().toString(36).slice(2, 8)}`;

const typeStyles: Record<NodeType, { border: string; glow: string }> = {
  trigger: { border: "border-lime-500/40", glow: "shadow-lime-500/20" },
  simulation: { border: "border-cyan-500/40", glow: "shadow-cyan-500/20" },
  context: { border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
  parser: { border: "border-sky-500/40", glow: "shadow-sky-500/20" },
  prompt: { border: "border-amber-500/40", glow: "shadow-amber-500/20" },
  model: { border: "border-fuchsia-500/40", glow: "shadow-fuchsia-500/20" },
  updater: { border: "border-rose-500/40", glow: "shadow-rose-500/20" },
  viewer: { border: "border-violet-500/40", glow: "shadow-violet-500/20" },
};

const triggers = [
  "Product Modal - Context Grabber",
  "Bulk Action - Generate Descriptions",
  "On Product Save",
];

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths") => void;
};

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps) {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<AiNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [paths, setPaths] = useState<PathMeta[]>([]);
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>({});
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodes[0]?.id ?? null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>(DEFAULT_MODELS);
  const [view, setView] = useState({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    fromPort: string;
    start: { x: number; y: number };
  } | null>(null);
  const [connectingPos, setConnectingPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [lastDrop, setLastDrop] = useState<{ x: number; y: number } | null>(null);
  const [simulationOpenNodeId, setSimulationOpenNodeId] = useState<string | null>(
    null
  );
  const [pathName, setPathName] = useState("AI Description Path");
  const [pathDescription, setPathDescription] = useState(
    "Visual analysis + description generation with structured updates."
  );
  const [activeTrigger, setActiveTrigger] = useState(triggers[0] ?? "");
  const [dragState, setDragState] = useState<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);
  const [expandedPaletteGroups, setExpandedPaletteGroups] = useState<Set<string>>(
    new Set(["Triggers"])
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const persistLastError = async (
    payload: { message: string; time: string; pathId?: string | null } | null
  ) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: AI_PATHS_LAST_ERROR_KEY,
          value: payload ? JSON.stringify(payload) : "",
        }),
      });
    } catch (error) {
      console.warn("[AI Paths] Failed to persist last error.", error);
    }
  };

  const togglePaletteGroup = (title: string) => {
    setExpandedPaletteGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const reportAiPathsError = (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => {
    const rawMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    const summary = (fallbackMessage ?? rawMessage).replace(/:$/, "");
    const logMessage = `[AI Paths] ${summary}`;
    const logError = new Error(logMessage);
    if (error instanceof Error && error.stack) {
      logError.stack = error.stack;
      logError.name = error.name;
    }
    console.error(fallbackMessage ?? "AI Paths error:", error);
    const payload = {
      message: summary,
      time: new Date().toISOString(),
      pathId: activePathId,
    };
    setLastError(payload);
    void persistLastError(payload);
    logClientError(logError, {
      context: {
        feature: "ai-paths",
        pathId: activePathId,
        pathName,
        tab: activeTab,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        errorSummary: summary,
        rawMessage,
        ...context,
      },
    });
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          throw new Error("Failed to load AI Paths settings.");
        }
        const data = (await res.json()) as Array<{ key: string; value: string }>;
        const map = new Map(data.map((item) => [item.key, item.value]));
        const indexRaw = map.get(PATH_INDEX_KEY);
        const lastErrorRaw = map.get(AI_PATHS_LAST_ERROR_KEY);
        const configs: Record<string, PathConfig> = {};
        let metas: PathMeta[] = [];
        if (lastErrorRaw) {
          try {
            const parsed = JSON.parse(lastErrorRaw) as {
              message?: string;
              time?: string;
              pathId?: string | null;
            };
            if (parsed?.message && parsed?.time) {
              setLastError({
                message: parsed.message,
                time: parsed.time,
                pathId: parsed.pathId ?? null,
              });
            }
          } catch {
            setLastError(null);
          }
        }
        if (indexRaw) {
          const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
          if (Array.isArray(parsedIndex)) {
            metas = parsedIndex;
          }
        }

        if (metas.length > 0) {
          metas.forEach((meta) => {
            const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
            if (configRaw) {
              try {
                const parsedConfig = JSON.parse(configRaw) as PathConfig;
                configs[meta.id] = {
                  ...parsedConfig,
                  id: meta.id,
                  name: parsedConfig.name || meta.name,
                };
              } catch {
                configs[meta.id] = createDefaultPathConfig(meta.id);
              }
            } else {
              configs[meta.id] = createDefaultPathConfig(meta.id);
            }
          });
        } else {
          const legacyRaw = map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get("ai_paths_config");
          if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw) as {
              version?: number;
              pathName?: string;
              description?: string;
              trigger?: string;
              nodes?: AiNode[];
              edges?: Edge[];
            };
            const legacyConfig: PathConfig = {
              id: "default",
              version: parsed.version ?? STORAGE_VERSION,
              name: parsed.pathName ?? "AI Description Path",
              description: parsed.description ?? "",
              trigger: parsed.trigger ?? (triggers[0] ?? "Product Modal - Context Grabber"),
              nodes: Array.isArray(parsed.nodes) ? parsed.nodes : initialNodes,
              edges: Array.isArray(parsed.edges) ? parsed.edges : initialEdges,
              updatedAt: new Date().toISOString(),
            };
            configs[legacyConfig.id] = legacyConfig;
            metas = [createPathMeta(legacyConfig)];
          } else {
            const fallback = createDefaultPathConfig("default");
            configs[fallback.id] = fallback;
            metas = [createPathMeta(fallback)];
          }
        }

        setPaths(metas);
        setPathConfigs(configs);
        const firstPath = metas[0]?.id ?? Object.keys(configs)[0] ?? "default";
        setActivePathId(firstPath);
        const activeConfig = configs[firstPath] ?? createDefaultPathConfig(firstPath);
        const normalizedNodes = normalizeNodes(activeConfig.nodes);
        setNodes(normalizedNodes);
        setEdges(sanitizeEdges(normalizedNodes, activeConfig.edges));
        setPathName(activeConfig.name);
        setPathDescription(activeConfig.description);
        setActiveTrigger(activeConfig.trigger);
        setSelectedNodeId(normalizedNodes[0]?.id ?? null);
      } catch (error) {
        reportAiPathsError(error, { action: "loadConfig" }, "Failed to load AI Paths settings:");
        toast("Failed to load AI Paths settings.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    };
    void loadConfig();
  }, [toast]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch("/api/chatbot");
        if (!res.ok) return;
        const data = (await res.json()) as { models?: string[] };
        if (Array.isArray(data.models)) {
          const merged = Array.from(new Set([...DEFAULT_MODELS, ...data.models]));
          setModelOptions(merged);
        }
      } catch (error) {
        // Ignore model loading errors and fallback to defaults
        reportAiPathsError(error, { action: "loadModels" }, "Failed to load models:");
      }
    };
    void loadModels();
  }, []);

  useEffect(() => {
    const handlePointerUp = () => {
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-port]")) return;
      setConnecting(null);
      setConnectingPos(null);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnecting(null);
        setConnectingPos(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setEdges((prev) => sanitizeEdges(nodes, prev));
  }, [nodes]);

  const setViewClamped = (next: { x: number; y: number; scale: number }) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const clampedScale = clampScale(next.scale);
    const clamped = clampTranslate(next.x, next.y, clampedScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: clampedScale });
  };

  const zoomTo = (targetScale: number) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) {
      setViewClamped({ ...view, scale: targetScale });
      return;
    }
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    const nextScale = clampScale(targetScale);
    const canvasX = (centerX - view.x) / view.scale;
    const canvasY = (centerY - view.y) / view.scale;
    const nextX = centerX - canvasX * nextScale;
    const nextY = centerY - canvasY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodesWith = (items: AiNode[]) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport || items.length === 0) {
      resetView();
      return;
    }
    const padding = 120;
    const bounds = items.reduce(
      (acc, node) => {
        const x1 = node.position.x;
        const y1 = node.position.y;
        const x2 = node.position.x + NODE_WIDTH;
        const y2 = node.position.y + NODE_MIN_HEIGHT;
        return {
          minX: Math.min(acc.minX, x1),
          minY: Math.min(acc.minY, y1),
          maxX: Math.max(acc.maxX, x2),
          maxY: Math.max(acc.maxY, y2),
        };
      },
      {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const scaleX = viewport.width / width;
    const scaleY = viewport.height / height;
    const nextScale = clampScale(Math.min(scaleX, scaleY));
    const centerX = bounds.minX + (bounds.maxX - bounds.minX) / 2;
    const centerY = bounds.minY + (bounds.maxY - bounds.minY) / 2;
    const nextX = viewport.width / 2 - centerX * nextScale;
    const nextY = viewport.height / 2 - centerY * nextScale;
    const clamped = clampTranslate(nextX, nextY, nextScale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: nextScale });
  };

  const fitToNodes = () => {
    fitToNodesWith(nodes);
  };

  const resetView = () => {
    setViewClamped({ x: VIEW_MARGIN, y: VIEW_MARGIN, scale: 1 });
  };

  const centerOnPoint = (x: number, y: number) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nextX = viewport.width / 2 - x * view.scale;
    const nextY = viewport.height / 2 - y * view.scale;
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const ensureNodeVisible = (node: AiNode) => {
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    if (!viewport) return;
    const nodeLeft = node.position.x * view.scale + view.x;
    const nodeTop = node.position.y * view.scale + view.y;
    const nodeRight = nodeLeft + NODE_WIDTH * view.scale;
    const nodeBottom = nodeTop + NODE_MIN_HEIGHT * view.scale;
    let nextX = view.x;
    let nextY = view.y;
    if (nodeLeft < VIEW_MARGIN) {
      nextX += VIEW_MARGIN - nodeLeft;
    } else if (nodeRight > viewport.width - VIEW_MARGIN) {
      nextX -= nodeRight - (viewport.width - VIEW_MARGIN);
    }
    if (nodeTop < VIEW_MARGIN) {
      nextY += VIEW_MARGIN - nodeTop;
    } else if (nodeBottom > viewport.height - VIEW_MARGIN) {
      nextY -= nodeBottom - (viewport.height - VIEW_MARGIN);
    }
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const getPortPosition = (
    node: AiNode,
    portName: string | undefined,
    side: "input" | "output"
  ) => {
    const ports = side === "input" ? node.inputs : node.outputs;
    const index = portName ? ports.indexOf(portName) : -1;
    const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
    const x = node.position.x + (side === "output" ? NODE_WIDTH : 0);
    const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
    return { x, y };
  };

  const edgePaths = useMemo(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return edges
      .map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const fromPort =
          edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
        const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
        const fromPos = getPortPosition(from, fromPort, "output");
        const toPos = getPortPosition(to, toPort, "input");
        const fromX = fromPos.x;
        const fromY = fromPos.y;
        const toX = toPos.x;
        const toY = toPos.y;
        const midX = fromX + (toX - fromX) * 0.5;
        const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        return { id: edge.id, path, label: edge.label };
      })
      .filter(Boolean) as { id: string; path: string; label?: string }[];
  }, [edges, nodes]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;
    const canvasX = (event.clientX - viewport.left - view.x) / view.scale;
    const canvasY = (event.clientY - viewport.top - view.y) / view.scale;
    setDragState({
      nodeId,
      offsetX: canvasX - node.position.x,
      offsetY: canvasY - node.position.y,
    });
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    if (!dragState || dragState.nodeId !== nodeId) return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const nextX = Math.min(
      Math.max((event.clientX - viewport.left - view.x) / view.scale - dragState.offsetX, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max((event.clientY - viewport.top - view.y) / view.scale - dragState.offsetY, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, position: { x: nextX, y: nextY } } : node
      )
    );
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    nodeId: string
  ) => {
    if (dragState?.nodeId !== nodeId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: NodeDefinition
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    const payload = JSON.stringify(node);
    event.dataTransfer.setData("application/x-ai-node", payload);
    event.dataTransfer.setData("text/plain", payload);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!viewport) return;
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
    const data =
      event.dataTransfer.getData("application/x-ai-node") ||
      event.dataTransfer.getData("text/plain");
    if (!data) return;
    let payload: NodeDefinition | null = null;
    try {
      payload = JSON.parse(data) as NodeDefinition;
    } catch (error) {
      reportAiPathsError(error, { action: "dropNode", dataPreview: data.slice(0, 120) });
      toast("Failed to add node. Drag again.", { variant: "error" });
      return;
    }
    if (!payload) return;
    const localX = canvasRect
      ? (event.clientX - canvasRect.left) / view.scale
      : (event.clientX - viewport.left - view.x) / view.scale;
    const localY = canvasRect
      ? (event.clientY - canvasRect.top) / view.scale
      : (event.clientY - viewport.top - view.y) / view.scale;
    const nextX = Math.min(
      Math.max(localX - NODE_WIDTH / 2, 16),
      CANVAS_WIDTH - NODE_WIDTH - 16
    );
    const nextY = Math.min(
      Math.max(localY - NODE_MIN_HEIGHT / 2, 16),
      CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16
    );
    const newNode: AiNode = {
      ...payload,
      id: `node-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: nextX, y: nextY },
      config: getDefaultConfigForType(payload.type, payload.outputs, payload.inputs),
    };
    setSelectedNodeId(newNode.id);
    setNodes((prev) => [...prev, newNode]);
    ensureNodeVisible(newNode);
    setLastDrop({ x: nextX, y: nextY });
    toast(`Node added: ${payload.title}`, { variant: "success" });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleClearWires = async () => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    const config: PathConfig = {
      id: activePathId,
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges: [],
      updatedAt,
    };
    setEdges([]);
    setPathConfigs((prev) => ({ ...prev, [activePathId]: config }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `${PATH_CONFIG_PREFIX}${activePathId}`,
          value: JSON.stringify(config),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to clear wires.");
      }
      toast("Wires cleared.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "clearWires" }, "Failed to clear wires:");
      toast("Failed to clear wires.", { variant: "error" });
    }
  };

  const handleStartConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => {
    event.stopPropagation();
    const start = getPortPosition(node, port, "output");
    setConnecting({ fromNodeId: node.id, fromPort: port, start });
    setConnectingPos(start);
  };

  const handleCompleteConnection = (
    event: React.PointerEvent<HTMLButtonElement>,
    node: AiNode,
    port: string
  ) => {
    event.stopPropagation();
    if (!connecting) return;
    if (connecting.fromNodeId === node.id && connecting.fromPort === port) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const fromNode = nodes.find((n) => n.id === connecting.fromNodeId);
    if (!fromNode) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    const validation = validateConnection(
      fromNode,
      node,
      connecting.fromPort,
      port,
      edges
    );

    if (!validation.valid) {
      toast(validation.message ?? "Invalid connection.", { variant: "error" });
      setConnecting(null);
      setConnectingPos(null);
      return;
    }

    setEdges((prev) => [
      ...prev,
      {
        id: `edge-${Math.random().toString(36).slice(2, 8)}`,
        from: connecting.fromNodeId,
        to: node.id,
        fromPort: connecting.fromPort,
        toPort: port,
      },
    ]);
    toast("Connection created.", { variant: "success" });
    setConnecting(null);
    setConnectingPos(null);
  };

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const canvasEl = canvasRef.current;
    if (event.target !== event.currentTarget && event.target !== canvasEl) return;
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
      return;
    }
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setPanState({
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    });
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (connecting) {
      const viewport = viewportRef.current?.getBoundingClientRect();
      if (!viewport) return;
      const x = (event.clientX - viewport.left - view.x) / view.scale;
      const y = (event.clientY - viewport.top - view.y) / view.scale;
      setConnectingPos({ x, y });
      return;
    }
    if (!panState) return;
    const viewport = viewportRef.current?.getBoundingClientRect() ?? null;
    const nextX = panState.originX + (event.clientX - panState.startX);
    const nextY = panState.originY + (event.clientY - panState.startY);
    const clamped = clampTranslate(nextX, nextY, view.scale, viewport);
    setView({ x: clamped.x, y: clamped.y, scale: view.scale });
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setPanState(null);
    }
    if (connecting) {
      setConnecting(null);
      setConnectingPos(null);
    }
  };

  const updateSelectedNode = (patch: Partial<AiNode>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((node) =>
        node.id === selectedNodeId ? { ...node, ...patch } : node
      )
    );
  };

  const updateSelectedNodeConfig = (patch: NodeConfig) => {
    if (!selectedNode) return;
    updateSelectedNode({
      config: {
        ...selectedNode.config,
        ...patch,
      },
    });
  };

  const getTriggerContextInfo = (triggerId: string) => {
    const contextNodes = edges
      .filter((edge) => edge.to === triggerId)
      .filter(
        (edge) =>
          (!edge.toPort || edge.toPort === "role") &&
          (!edge.fromPort || edge.fromPort === "role")
      )
      .map((edge) => nodes.find((node) => node.id === edge.from && node.type === "context"))
      .filter(Boolean) as AiNode[];
    const contextNodeIds = contextNodes.map((node) => node.id);
    const roles = Array.from(
      new Set(
        contextNodes
          .map((node) => node.config?.context?.role?.trim() || node.title)
          .filter(Boolean)
      )
    );
    return { contextNodeIds, roles };
  };

  const dispatchTrigger = (
    eventName: string,
    productId: string,
    contextNodeIds: string[] = [],
    roles: string[] = []
  ) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ai-path-trigger", {
        detail: {
          trigger: eventName,
          productId,
          contextNodeIds,
          roles,
        },
      })
    );
  };

  const handleRunSimulation = (
    simulationNode: AiNode,
    triggerEvent?: string,
    contextNodeIds?: string[],
    roles?: string[]
  ) => {
    const productId = simulationNode.config?.simulation?.productId?.trim();
    if (!productId) {
      toast("Enter a Product ID in the simulation node.", { variant: "error" });
      return;
    }
    let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
    let resolvedContextIds = contextNodeIds ?? [];
    let resolvedRoles = roles ?? [];
    if (!triggerEvent) {
      const connectedTriggerIds = edges
        .filter(
          (edge) =>
            edge.from === simulationNode.id &&
            (!edge.fromPort || edge.fromPort === "simulation")
        )
        .map((edge) => edge.to);
      const triggerNode = nodes.find(
        (node) => node.type === "trigger" && connectedTriggerIds.includes(node.id)
      );
      if (triggerNode) {
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        const triggerContext = getTriggerContextInfo(triggerNode.id);
        resolvedContextIds = triggerContext.contextNodeIds;
        resolvedRoles = triggerContext.roles;
      }
    }
    dispatchTrigger(eventName, productId, resolvedContextIds, resolvedRoles);
    toast(`Simulated ${eventName} for product ${productId}`, { variant: "success" });
  };

  const handleFireTrigger = (triggerNode: AiNode) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const { contextNodeIds, roles } = getTriggerContextInfo(triggerNode.id);
    const connectedSimulationIds = edges
      .filter((edge) => edge.to === triggerNode.id)
      .filter(
        (edge) =>
          (!edge.toPort || edge.toPort === "simulation") &&
          (!edge.fromPort || edge.fromPort === "simulation")
      )
      .map((edge) => edge.from);
    const simulationNodes = nodes.filter(
      (node) => node.type === "simulation" && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      toast("Connect a Simulation node to the Trigger simulation input.", { variant: "error" });
      return;
    }
    simulationNodes.forEach((node) =>
      handleRunSimulation(node, triggerEvent, contextNodeIds, roles)
    );
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find((node) => node.id === selectedNodeId);
    const label = targetNode?.title || "this node";
    const confirmed = window.confirm(`Remove ${label}? This will delete connected wires.`);
    if (!confirmed) return;
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId)
    );
    setSelectedNodeId(null);
  };

  const updateActivePathMeta = (name: string) => {
    if (!activePathId) return;
    const updatedAt = new Date().toISOString();
    setPaths((prev) =>
      prev.map((path) =>
        path.id === activePathId ? { ...path, name, updatedAt } : path
      )
    );
  };

  const handleSave = async () => {
    if (!activePathId) return;
    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const config: PathConfig = {
        id: activePathId,
        version: STORAGE_VERSION,
        name: pathName,
        description: pathDescription,
        trigger: activeTrigger,
        nodes,
        edges,
        updatedAt,
      };
      const nextPaths = paths.map((path) =>
        path.id === activePathId ? { ...path, name: pathName, updatedAt } : path
      );
      setPathConfigs((prev) => ({ ...prev, [activePathId]: config }));
      setPaths(nextPaths);
      const [configRes, indexRes] = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: `${PATH_CONFIG_PREFIX}${activePathId}`,
            value: JSON.stringify(config),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: PATH_INDEX_KEY,
            value: JSON.stringify(nextPaths),
          }),
        }),
      ]);
      if (!configRes.ok || !indexRes.ok) {
        throw new Error("Failed to save AI Path settings.");
      }
      setLastError(null);
      void persistLastError(null);
      toast("AI Paths saved.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "savePath", pathId: activePathId }, "Failed to save AI Paths settings:");
      toast("Failed to save AI Paths settings.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!activePathId) return;
    const resetConfig = createDefaultPathConfig(activePathId);
    const normalizedNodes = normalizeNodes(resetConfig.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, resetConfig.edges));
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    setPathName(resetConfig.name);
    setPathDescription(resetConfig.description);
    setActiveTrigger(resetConfig.trigger);
    setPathConfigs((prev) => ({ ...prev, [activePathId]: resetConfig }));
    updateActivePathMeta(resetConfig.name);
  };

  const handleCreatePath = () => {
    const id = createPathId();
    const now = new Date().toISOString();
    const name = `New Path ${paths.length + 1}`;
    const config: PathConfig = {
      id,
      version: STORAGE_VERSION,
      name,
      description: "",
      trigger: triggers[0] ?? "Product Modal - Context Grabber",
      nodes: [],
      edges: [],
      updatedAt: now,
    };
    const meta: PathMeta = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev) => [...prev, meta]);
    setPathConfigs((prev) => ({ ...prev, [id]: config }));
    setActivePathId(id);
    setNodes([]);
    setEdges([]);
    setPathName(name);
    setPathDescription("");
    setActiveTrigger(config.trigger);
    setSelectedNodeId(null);
  };

  const handleDeletePath = async (pathId?: string) => {
    const targetId = pathId ?? activePathId;
    if (!targetId) return;
    const nextPaths = paths.filter((path) => path.id !== targetId);
    if (nextPaths.length === 0) {
      const fallbackId = "default";
      const fallback = createDefaultPathConfig(fallbackId);
      const fallbackMeta = createPathMeta(fallback);
      setPaths([fallbackMeta]);
      setPathConfigs({ [fallbackId]: fallback });
      setActivePathId(fallbackId);
      const normalizedNodes = normalizeNodes(fallback.nodes);
      setNodes(normalizedNodes);
      setEdges(sanitizeEdges(normalizedNodes, fallback.edges));
      setPathName(fallback.name);
      setPathDescription(fallback.description);
      setActiveTrigger(fallback.trigger);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
      toast("Cannot delete the last path. Reset to default instead.", {
        variant: "info",
      });
      return;
    }
    const nextId = nextPaths[0]?.id ?? null;
    setPaths(nextPaths);
    setPathConfigs((prev) => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
    if (nextId) {
      const nextConfig = pathConfigs[nextId] ?? createDefaultPathConfig(nextId);
      setActivePathId(nextId);
      const normalizedNodes = normalizeNodes(nextConfig.nodes);
      setNodes(normalizedNodes);
      setEdges(sanitizeEdges(normalizedNodes, nextConfig.edges));
      setPathName(nextConfig.name);
      setPathDescription(nextConfig.description);
      setActiveTrigger(nextConfig.trigger);
      setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    } else {
      setActivePathId(null);
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPaths),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update path index.");
      }
      toast("Path removed from the index.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "deletePath", pathId: targetId }, "Failed to update path index:");
      toast("Failed to update path index.", { variant: "error" });
    }
  };

  const handleSwitchPath = (value: string) => {
    if (!value) return;
    const config = pathConfigs[value] ?? createDefaultPathConfig(value);
    setActivePathId(value);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(config.trigger);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
  };

  const savePathIndex = async (nextPaths: PathMeta[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPaths),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save path index.");
      }
      toast("Path list saved.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "savePathIndex" }, "Failed to save path list:");
      toast("Failed to save path list.", { variant: "error" });
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400">Loading AI Paths...</div>;
  }

  return (
    <div className="space-y-6">
      {activeTab === "canvas" && (
        <div className="space-y-6">
          {typeof document !== "undefined" && renderActions
            ? createPortal(
                renderActions(
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
                      type="button"
                      onClick={handleCreatePath}
                    >
                      New Path
                    </Button>
                    <Button
                      className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Path"}
                    </Button>
                    <Button
                      className="rounded-md border border-gray-800 text-sm text-gray-300 hover:bg-gray-900/60"
                      onClick={handleReset}
                      type="button"
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      className="rounded-md border border-gray-800 text-sm text-rose-200 hover:bg-rose-500/10"
                      onClick={() => void handleDeletePath()}
                      type="button"
                      disabled={!activePathId}
                    >
                      Delete Path
                    </Button>
                    {lastError && (
                      <div className="flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200">
                        <span className="max-w-[220px] truncate">
                          Last error: {lastError.message}
                        </span>
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() => {
                            setLastError(null);
                            void persistLastError(null);
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          className="rounded-md border border-rose-400/50 px-2 py-1 text-[10px] text-rose-100 hover:bg-rose-500/20"
                          onClick={() =>
                            window.location.assign(
                              `/admin/system/logs?level=error&source=client&query=${encodeURIComponent(
                                "AI Paths"
                              )}`
                            )
                          }
                        >
                          View logs
                        </Button>
                      </div>
                    )}
                  </div>
                ),
                document.getElementById("ai-paths-actions") ?? document.body
              )
            : null}
          {typeof document !== "undefined" && activePathId
            ? createPortal(
                <Input
                  className="h-9 w-[260px] rounded-md border border-gray-800 bg-gray-950/60 px-3 text-sm text-white"
                  value={pathName}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPathName(value);
                    updateActivePathMeta(value);
                  }}
                  placeholder="Path name"
                />,
                document.getElementById("ai-paths-name") ?? document.body
              )
            : null}

          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-[240px] flex-1 space-y-4" />
            <div className="min-w-[220px] space-y-4" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Node Palette</div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
              {[
                { title: "Triggers", types: ["trigger"], icon: "⚡" },
                { title: "Simulation", types: ["simulation"], icon: "🧪" },
                { title: "Context + Parsing", types: ["context", "parser"], icon: "📦" },
                { title: "Prompts + Models", types: ["prompt", "model"], icon: "🤖" },
                { title: "Updaters", types: ["updater"], icon: "💾" },
                { title: "Viewers", types: ["viewer"], icon: "👁" },
              ].map((group) => {
                const items = palette.filter((node) => group.types.includes(node.type));
                if (items.length === 0) return null;
                const isExpanded = expandedPaletteGroups.has(group.title);
                return (
                  <div key={group.title} className="rounded-md border border-gray-800/50">
                    <button
                      type="button"
                      onClick={() => togglePaletteGroup(group.title)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-gray-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{group.icon}</span>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
                          {group.title}
                        </span>
                        <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {items.length}
                        </span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="space-y-2 px-3 pb-3">
                        {items.map((node) => (
                          <div
                            key={node.title}
                            draggable
                            onDragStart={(event) => handleDragStart(event, node)}
                            className="cursor-grab rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300 transition hover:border-gray-600 hover:bg-gray-900 active:cursor-grabbing"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {node.title}
                              </span>
                              <span className="text-[10px] uppercase text-gray-500">
                                {node.type}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">
                              {node.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Inspector</div>
            {selectedNode ? (
              <div className="space-y-3 text-xs text-gray-300">
                {selectedNode.type === "trigger" && (
                  <Button
                    className="w-full rounded-md border border-emerald-500/40 text-xs text-emerald-200 hover:bg-emerald-500/10"
                    type="button"
                    onClick={() => handleFireTrigger(selectedNode)}
                  >
                    Fire Trigger
                  </Button>
                )}
                {selectedNode.type === "simulation" && (
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-xs text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => setSimulationOpenNodeId(selectedNode.id)}
                  >
                    Open Simulation
                  </Button>
                )}
                <div>
                  <Label className="text-[10px] uppercase text-gray-500">Title</Label>
                  <Input
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-xs text-white"
                    value={selectedNode.title}
                    onChange={(event) =>
                      updateSelectedNode({ title: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500">
                    Description
                  </Label>
                  <Textarea
                    className="mt-2 min-h-[64px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-xs text-white"
                    value={selectedNode.description}
                    onChange={(event) =>
                      updateSelectedNode({ description: event.target.value })
                    }
                  />
                </div>
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-3 text-[11px] text-gray-400">
                  Inputs: {selectedNode.inputs.join(", ") || "None"} <br />
                  Outputs: {selectedNode.outputs.join(", ") || "None"}
                </div>
                <Button
                  className="w-full rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                  onClick={() => setConfigOpen(true)}
                >
                  Open Node Config
                </Button>
                <Button
                  className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                  type="button"
                  onClick={handleDeleteSelectedNode}
                >
                  Remove Node
                </Button>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Select a node to inspect inputs, outputs, and configuration.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Connections</div>
            <div className="space-y-2 text-xs text-gray-400">
              <div>Active wires: {edges.length}</div>
              <Button
                className="w-full rounded-md border border-rose-500/40 text-xs text-rose-200 hover:bg-rose-500/10"
                type="button"
                onClick={() => void handleClearWires()}
              >
                Clear All Wires
              </Button>
            </div>
          </div>
        </div>
        <div
          ref={viewportRef}
          className="relative min-h-[560px] rounded-lg border border-gray-800 bg-gray-950/70 overflow-hidden"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={handlePanEnd}
          onPointerLeave={handlePanEnd}
        >
          <div className="absolute bottom-3 left-3 z-10 rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-[11px] text-gray-400">
            Nodes: {nodes.length}
            {lastDrop ? ` • Last drop: ${Math.round(lastDrop.x)}, ${Math.round(lastDrop.y)}` : ""}
            {` • View: ${Math.round(view.x)}, ${Math.round(view.y)} @ ${Math.round(view.scale * 100)}%`}
          </div>
          <div className="absolute bottom-4 right-4 z-10 rounded-md border border-gray-800 bg-gray-950/70 p-2 text-xs text-gray-300">
            <div className="mb-2 text-[11px] uppercase text-gray-500">
              View Controls
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                type="button"
                onClick={() => zoomTo(view.scale - 0.1)}
              >
                -
              </Button>
              <span className="min-w-[56px] text-center text-[11px] text-gray-300">
                {Math.round(view.scale * 100)}%
              </span>
              <Button
                className="h-7 w-7 rounded-full border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                type="button"
                onClick={() => zoomTo(view.scale + 0.1)}
              >
                +
              </Button>
              <Button
                className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
                type="button"
                onClick={fitToNodes}
              >
                Fit
              </Button>
              <Button
                className="h-7 rounded-full border border-gray-700 px-2 text-[11px] text-white hover:bg-gray-900/80"
                type="button"
                onClick={resetView}
              >
                Reset
              </Button>
            </div>
          </div>
          <div
            ref={canvasRef}
            className="absolute left-0 top-0"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.18) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          >
            {lastDrop ? (
              <div
                className="absolute rounded-full border border-red-400 bg-red-500/30"
                style={{
                  width: 10,
                  height: 10,
                  transform: `translate(${lastDrop.x}px, ${lastDrop.y}px)`,
                }}
              />
            ) : null}
            <svg
              className="absolute inset-0"
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={{ pointerEvents: "none" }}
            >
              {edgePaths.map((edge) => (
                <path
                  key={edge.id}
                  d={edge.path}
                  stroke="rgba(148,163,184,0.45)"
                  strokeWidth="1.6"
                  fill="none"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setEdges((prev) => prev.filter((item) => item.id !== edge.id));
                  }}
                  style={{ pointerEvents: "stroke" }}
                />
              ))}
              {connecting && connectingPos ? (() => {
                const fromX = connecting.start.x;
                const fromY = connecting.start.y;
                const toX = connectingPos.x;
                const toY = connectingPos.y;
                const midX = fromX + (toX - fromX) * 0.5;
                const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
                return (
                  <path
                    d={path}
                    stroke="rgba(148,163,184,0.7)"
                    strokeWidth="1.6"
                    fill="none"
                    strokeDasharray="4 3"
                  />
                );
              })() : null}
            </svg>

            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const style = typeStyles[node.type];
              const viewerOutputs =
                node.type === "viewer"
                  ? node.config?.viewer?.outputs ?? createViewerOutputs(node.inputs)
                  : null;
              return (
                <div
                  key={node.id}
                  className={`absolute ${dragState?.nodeId === node.id ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{
                    width: NODE_WIDTH,
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                  }}
                  onPointerDown={(event) => handlePointerDown(event, node.id)}
                  onPointerMove={(event) => handlePointerMove(event, node.id)}
                  onPointerUp={(event) => handlePointerUp(event, node.id)}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div
                    className={`relative flex flex-col gap-2 rounded-xl border bg-gray-950/80 p-3 text-xs text-gray-200 shadow-lg backdrop-blur ${
                      style.border
                    } ${style.glow} ${isSelected ? "ring-2 ring-white/20" : ""}`}
                  >
                    {node.inputs.map((input, index) => (
                      <div
                        key={`input-${node.id}-${input}`}
                        className="absolute flex items-center"
                        style={{
                          left: -(PORT_SIZE / 2) - 4,
                          top: getPortOffsetY(index, node.inputs.length) - PORT_SIZE / 2,
                        }}
                      >
                        <button
                          type="button"
                          data-port="input"
                          className="rounded-full border border-sky-400/60 bg-sky-500/20 shadow-[0_0_8px_rgba(56,189,248,0.35)] hover:border-sky-200"
                          style={{
                            width: PORT_SIZE + 2,
                            height: PORT_SIZE + 2,
                          }}
                          onPointerUp={(event) => handleCompleteConnection(event, node, input)}
                          aria-label={`Connect to ${input}`}
                          title={`Input: ${input}`}
                        />
                        <span className="ml-1.5 rounded bg-sky-500/10 px-1 py-0.5 text-[8px] font-medium text-sky-300">
                          {input}
                        </span>
                      </div>
                    ))}
                    {node.outputs.map((output, index) => (
                      <div
                        key={`output-${node.id}-${output}`}
                        className="absolute flex items-center"
                        style={{
                          right: -(PORT_SIZE / 2) - 4,
                          top: getPortOffsetY(index, node.outputs.length) - PORT_SIZE / 2,
                        }}
                      >
                        <span className="mr-1.5 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-medium text-amber-300">
                          {output}
                        </span>
                        <button
                          type="button"
                          data-port="output"
                          className="rounded-full border border-amber-400/60 bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.35)] hover:border-amber-200"
                          style={{
                            width: PORT_SIZE + 2,
                            height: PORT_SIZE + 2,
                          }}
                          onPointerDown={(event) => handleStartConnection(event, node, output)}
                          aria-label={`Start connection from ${output}`}
                          title={`Output: ${output}`}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{node.title}</span>
                      <span className="rounded-full border border-gray-700 px-2 py-[1px] text-[10px] uppercase text-gray-400">
                        {node.type}
                      </span>
                    </div>
                    {node.type === "trigger" && (
                      <Button
                        className="self-start rounded-md border border-emerald-500/40 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/10"
                        type="button"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => handleFireTrigger(node)}
                      >
                        Fire Trigger
                      </Button>
                    )}
                    <p className="text-[11px] text-gray-400">{node.description}</p>
                    {node.type === "context" && (
                      <span className="text-[10px] uppercase text-emerald-300/80">
                        Connect role → Trigger
                      </span>
                    )}
                    {node.type === "simulation" && (
                      <span className="text-[10px] uppercase text-cyan-300/80">
                        Connect simulation → Trigger
                      </span>
                    )}
                    {node.type === "trigger" && (
                      <span className="text-[10px] uppercase text-lime-200/80">
                        Accepts role + simulation inputs
                      </span>
                    )}
                    {node.type === "viewer" && viewerOutputs && (
                      <div className="space-y-2 rounded-md border border-gray-800 bg-gray-950/60 p-2 text-[10px] text-gray-300">
                        <div className="flex items-center justify-between text-[9px] uppercase text-gray-500">
                          <span>Results</span>
                          <span>{node.inputs.length} inputs</span>
                        </div>
                        <div className="space-y-1">
                          {node.inputs.map((input) => (
                            <div key={input} className="space-y-1">
                              <div className="text-[9px] uppercase text-gray-500">
                                {input}
                              </div>
                              <div className="line-clamp-3 rounded border border-gray-800 bg-gray-900/60 px-2 py-1 text-[10px] text-gray-200">
                                {viewerOutputs[input]?.trim() || "No data yet"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </div>
      )}

      {activeTab === "paths" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-300">
              Manage and rename your AI paths, then open them for editing.
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
                type="button"
                onClick={handleCreatePath}
              >
                New Path
              </Button>
              <Button
                className="rounded-md border border-gray-700 text-sm text-white hover:bg-gray-900/80"
                type="button"
                onClick={() => savePathIndex(paths)}
              >
                Save List
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {paths.map((path) => (
              <div
                key={path.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-800 bg-gray-950/60 p-4"
              >
                <div className="min-w-[220px] flex-1">
                  <Label className="text-xs text-gray-500">Path Name</Label>
                  <Input
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm text-white"
                    value={path.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPaths((prev) =>
                        prev.map((item) =>
                          item.id === path.id
                            ? {
                                ...item,
                                name: value,
                                updatedAt: new Date().toISOString(),
                              }
                            : item
                        )
                      );
                      if (activePathId === path.id) {
                        setPathName(value);
                      }
                    }}
                  />
                  <div className="mt-2 text-[11px] text-gray-500">
                    Updated: {new Date(path.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                    type="button"
                    onClick={() => {
                      handleSwitchPath(path.id);
                      onTabChange?.("canvas");
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    className="rounded-md border border-gray-800 text-xs text-rose-200 hover:bg-rose-500/10"
                    type="button"
                    onClick={() => void handleDeletePath(path.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {paths.length === 0 && (
              <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-6 text-sm text-gray-400">
                No paths yet. Create a new path to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedNode ? (
        <Dialog open={configOpen} onOpenChange={setConfigOpen}>
          <DialogContent className="max-w-2xl border border-gray-800 bg-gray-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Configure {selectedNode.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Adjust parser mappings, model selection, or updater fields for
                this node.
              </DialogDescription>
            </DialogHeader>

            {selectedNode.type === "parser" && (() => {
              const mappings =
                selectedNode.config?.parser?.mappings ??
                createParserMappings(selectedNode.outputs);
              return (
                <div className="space-y-4">
                  {selectedNode.outputs.map((output) => (
                    <div key={output}>
                      <Label className="text-xs text-gray-400">
                        {output} JSON Path
                      </Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={mappings[output] ?? ""}
                        onChange={(event) => {
                          const nextMappings = {
                            ...mappings,
                            [output]: event.target.value,
                          };
                          updateSelectedNodeConfig({
                            parser: { mappings: nextMappings },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedNode.type === "model" && (() => {
              const modelConfig =
                selectedNode.config?.model ?? {
                  modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
                  temperature: 0.7,
                  maxTokens: 800,
                  vision: selectedNode.inputs.includes("images"),
                };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Model</Label>
                    <Select
                      value={modelConfig.modelId}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, modelId: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {modelOptions.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Temperature</Label>
                      <Input
                        type="number"
                        step="0.1"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.temperature}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              temperature: toNumber(
                                event.target.value,
                                modelConfig.temperature
                              ),
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Max Tokens</Label>
                      <Input
                        type="number"
                        step="50"
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={modelConfig.maxTokens}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            model: {
                              ...modelConfig,
                              maxTokens: toNumber(
                                event.target.value,
                                modelConfig.maxTokens
                              ),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Accepts Images</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        modelConfig.vision
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          model: { ...modelConfig, vision: !modelConfig.vision },
                        })
                      }
                    >
                      {modelConfig.vision ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "context" && (() => {
              const contextConfig = selectedNode.config?.context ?? {
                role: DEFAULT_CONTEXT_ROLE,
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Context Role</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={contextConfig.role}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          context: { role: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Connect this role output into a Trigger input to define what the
                      trigger should execute.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "trigger" && (() => {
              const triggerConfig = selectedNode.config?.trigger ?? {
                event: TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Trigger Action</Label>
                    <Select
                      value={triggerConfig.event}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          trigger: { event: value },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        {TRIGGER_EVENTS.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "simulation" && (() => {
              const simulationConfig = selectedNode.config?.simulation ?? {
                productId: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Product ID</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.productId}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          simulation: { productId: event.target.value },
                        })
                      }
                    />
                  </div>
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => handleRunSimulation(selectedNode)}
                  >
                    Run Simulation
                  </Button>
                </div>
              );
            })()}

            {selectedNode.type === "viewer" && (() => {
              const viewerConfig = selectedNode.config?.viewer ?? {
                outputs: createViewerOutputs(selectedNode.inputs),
              };
              const connections = edges.filter((edge) => edge.to === selectedNode.id);
              const outputValues = {
                ...createViewerOutputs(selectedNode.inputs),
                ...viewerConfig.outputs,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      Store and review outputs that flow into this node.
                    </div>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-xs text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          viewer: { outputs: createViewerOutputs(selectedNode.inputs) },
                        })
                      }
                    >
                      Clear
                    </Button>
                  </div>
                  {selectedNode.inputs.map((input) => {
                    const connectedSources = connections
                      .filter((edge) => !edge.toPort || edge.toPort === input)
                      .map((edge) => {
                        const fromNode = nodes.find((node) => node.id === edge.from);
                        if (!fromNode) return null;
                        const portLabel = edge.fromPort ? `:${edge.fromPort}` : "";
                        return `${fromNode.title}${portLabel}`;
                      })
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <div key={input} className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <Label className="text-xs text-gray-400">{input}</Label>
                          {connectedSources && (
                            <span className="text-[10px] text-gray-500">
                              Connected: {connectedSources}
                            </span>
                          )}
                        </div>
                        <Textarea
                          className="min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                          value={outputValues[input] ?? ""}
                          onChange={(event) =>
                            updateSelectedNodeConfig({
                              viewer: {
                                outputs: {
                                  ...outputValues,
                                  [input]: event.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {selectedNode.type === "updater" && (() => {
              const updaterConfig =
                selectedNode.config?.updater ?? {
                  targetField: selectedNode.outputs[0] ?? "content_en",
                  idField: "productId",
                  mode: "replace" as const,
                };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Target Field</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={updaterConfig.targetField}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          updater: {
                            ...updaterConfig,
                            targetField: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">ID Field</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={updaterConfig.idField}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          updater: {
                            ...updaterConfig,
                            idField: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Write Mode</Label>
                    <Select
                      value={updaterConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          updater: {
                            ...updaterConfig,
                            mode: value as "replace" | "append",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="replace">Replace</SelectItem>
                        <SelectItem value="append">Append</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type !== "parser" &&
              selectedNode.type !== "model" &&
              selectedNode.type !== "updater" &&
              selectedNode.type !== "trigger" &&
              selectedNode.type !== "simulation" &&
              selectedNode.type !== "context" &&
              selectedNode.type !== "viewer" && (
                <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4 text-sm text-gray-400">
                  No configuration is available for this node yet.
                </div>
              )}
          </DialogContent>
        </Dialog>
      ) : null}

      {simulationOpenNodeId ? (
        <Dialog
          open={Boolean(simulationOpenNodeId)}
          onOpenChange={(open) => {
            if (!open) setSimulationOpenNodeId(null);
          }}
        >
          <DialogContent className="max-w-md border border-gray-800 bg-gray-950 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg">Simulation: Product Modal</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Set a Product ID and simulate the connected trigger action.
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const simulationNode = nodes.find((node) => node.id === simulationOpenNodeId);
              if (!simulationNode) return null;
              const simulationConfig = simulationNode.config?.simulation ?? { productId: "" };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Product ID</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.productId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === simulationNode.id
                              ? {
                                  ...node,
                                  config: {
                                    ...node.config,
                                    simulation: { productId: value },
                                  },
                                }
                              : node
                          )
                        );
                      }}
                    />
                  </div>
                  <Button
                    className="w-full rounded-md border border-cyan-500/40 text-sm text-cyan-200 hover:bg-cyan-500/10"
                    type="button"
                    onClick={() => handleRunSimulation(simulationNode)}
                  >
                    Simulate Trigger
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
