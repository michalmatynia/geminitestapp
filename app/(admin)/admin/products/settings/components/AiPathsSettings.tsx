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
  | "mapper"
  | "mutator"
  | "validator"
  | "constant"
  | "math"
  | "template"
  | "bundle"
  | "gate"
  | "compare"
  | "router"
  | "delay"
  | "http"
  | "prompt"
  | "model"
  | "updater"
  | "viewer"
  | "ai_description"
  | "description_updater";

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
  entityType?: string;
  entityId?: string;
};

type ViewerConfig = {
  outputs: Record<string, string>;
};

type ContextConfig = {
  role: string;
  entityType?: string;
  entityIdSource?: "simulation" | "manual";
  entityId?: string;
  scopeMode?: "full" | "include" | "exclude";
  includePaths?: string[];
  excludePaths?: string[];
};

type DescriptionConfig = {
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
};

type MapperConfig = {
  outputs: string[];
  mappings: Record<string, string>;
};

type MutatorConfig = {
  path: string;
  valueTemplate: string;
};

type ValidatorConfig = {
  requiredPaths: string[];
  mode: "all" | "any";
};

type ConstantConfig = {
  valueType: "string" | "number" | "boolean" | "json";
  value: string;
};

type MathConfig = {
  operation: "add" | "subtract" | "multiply" | "divide" | "round" | "ceil" | "floor";
  operand: number;
};

type TemplateConfig = {
  template: string;
};

type BundleConfig = {
  includePorts?: string[];
};

type GateConfig = {
  mode: "block" | "pass";
  failMessage?: string;
};

type CompareConfig = {
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "isEmpty"
    | "notEmpty";
  compareTo: string;
  caseSensitive?: boolean;
  message?: string;
};

type RouterConfig = {
  mode: "valid" | "value";
  matchMode: "truthy" | "falsy" | "equals" | "contains";
  compareTo: string;
};

type DelayConfig = {
  ms: number;
};

type HttpConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: string;
  bodyTemplate: string;
  responseMode: "json" | "text" | "status";
  responsePath: string;
};

type NodeConfig = {
  trigger?: TriggerConfig;
  simulation?: SimulationConfig;
  viewer?: ViewerConfig;
  context?: ContextConfig;
  mapper?: MapperConfig;
  mutator?: MutatorConfig;
  validator?: ValidatorConfig;
  constant?: ConstantConfig;
  math?: MathConfig;
  template?: TemplateConfig;
  bundle?: BundleConfig;
  gate?: GateConfig;
  compare?: CompareConfig;
  router?: RouterConfig;
  delay?: DelayConfig;
  http?: HttpConfig;
  description?: DescriptionConfig;
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

type RuntimePortValues = Record<string, unknown>;
type RuntimeState = {
  inputs: Record<string, RuntimePortValues>;
  outputs: Record<string, RuntimePortValues>;
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
const TRIGGER_OUTPUT_PORTS = ["trigger", "context", "meta", "entityId", "entityType"];
const CONTEXT_OUTPUT_PORTS = ["role", "context", "entityId", "entityType", "entityJson"];
const SIMULATION_OUTPUT_PORTS = ["simulation", "entityId", "entityType", "productId"];
const DESCRIPTION_OUTPUT_PORTS = ["description_en"];
const BUNDLE_INPUT_PORTS = [
  "context",
  "meta",
  "trigger",
  "result",
  "entityJson",
  "entityId",
  "entityType",
  "value",
  "errors",
  "valid",
  "description_en",
  "prompt",
];
const TEMPLATE_INPUT_PORTS = [
  "context",
  "meta",
  "trigger",
  "result",
  "entityJson",
  "entityId",
  "entityType",
  "value",
  "bundle",
  "description_en",
  "prompt",
];
const ROUTER_INPUT_PORTS = [
  "context",
  "bundle",
  "prompt",
  "result",
  "value",
  "valid",
  "errors",
];
const ROUTER_OUTPUT_PORTS = [
  "context",
  "bundle",
  "prompt",
  "result",
  "value",
  "valid",
  "errors",
];
const DELAY_INPUT_PORTS = ["context", "bundle", "prompt", "result", "value"];
const DELAY_OUTPUT_PORTS = ["context", "bundle", "prompt", "result", "value"];
const HTTP_INPUT_PORTS = [
  "context",
  "bundle",
  "prompt",
  "result",
  "value",
  "entityId",
  "entityType",
];
const VIEWER_INPUT_PORTS = [
  "result",
  "analysis",
  "description",
  "description_en",
  "prompt",
  "context",
  "meta",
  "trigger",
  "entityId",
  "entityType",
  "entityJson",
  "bundle",
  "valid",
  "errors",
  "value",
];

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
    title: "Simulation: Entity Modal",
    description: "Simulate a modal action by Entity ID.",
    inputs: [],
    outputs: SIMULATION_OUTPUT_PORTS,
  },
  {
    type: "viewer",
    title: "Result Viewer",
    description: "Preview outputs connected from other nodes.",
    inputs: VIEWER_INPUT_PORTS,
    outputs: [],
  },
  {
    type: "ai_description",
    title: "AI Description Generator",
    description: "Runs the AI Description pipeline to produce description_en.",
    inputs: ["productJson", "images", "title"],
    outputs: DESCRIPTION_OUTPUT_PORTS,
  },
  {
    type: "description_updater",
    title: "Description Updater",
    description: "Writes description_en back to the product.",
    inputs: ["productId", "description_en"],
    outputs: ["description_en"],
  },
  {
    type: "context",
    title: "Context Grabber",
    description: "Collects live context (Product, Note, Chat, Log).",
    inputs: [],
    outputs: ["role", "context", "entityId", "entityType", "entityJson", "productJson"],
  },
  {
    type: "parser",
    title: "JSON Parser",
    description: "Extracts fields into typed outputs.",
    inputs: ["productJson", "entityJson"],
    outputs: ["productId", "title", "images", "content_en"],
  },
  {
    type: "mapper",
    title: "JSON Mapper",
    description: "Map context to custom outputs.",
    inputs: ["context"],
    outputs: ["value"],
  },
  {
    type: "mutator",
    title: "Mutator",
    description: "Mutate context values with templates.",
    inputs: ["context"],
    outputs: ["context"],
  },
  {
    type: "validator",
    title: "Validator",
    description: "Validate required fields.",
    inputs: ["context"],
    outputs: ["context", "valid", "errors"],
  },
  {
    type: "compare",
    title: "Compare",
    description: "Compare a value and emit valid/errors.",
    inputs: ["value"],
    outputs: ["value", "valid", "errors"],
  },
  {
    type: "router",
    title: "Router",
    description: "Route payloads based on a condition.",
    inputs: ROUTER_INPUT_PORTS,
    outputs: ROUTER_OUTPUT_PORTS,
  },
  {
    type: "delay",
    title: "Delay",
    description: "Delay signals to sequence flows.",
    inputs: DELAY_INPUT_PORTS,
    outputs: DELAY_OUTPUT_PORTS,
  },
  {
    type: "http",
    title: "HTTP Fetch",
    description: "Call external APIs with templated inputs.",
    inputs: HTTP_INPUT_PORTS,
    outputs: ["value", "bundle"],
  },
  {
    type: "constant",
    title: "Constant",
    description: "Emit a constant value as a signal.",
    inputs: [],
    outputs: ["value"],
  },
  {
    type: "math",
    title: "Math",
    description: "Apply numeric transformation to a value.",
    inputs: ["value"],
    outputs: ["value"],
  },
  {
    type: "gate",
    title: "Gate",
    description: "Allow context through when valid is true.",
    inputs: ["context", "valid", "errors"],
    outputs: ["context", "valid", "errors"],
  },
  {
    type: "bundle",
    title: "Bundle",
    description: "Cluster inputs into a single bundle output.",
    inputs: BUNDLE_INPUT_PORTS,
    outputs: ["bundle"],
  },
  {
    type: "template",
    title: "Template",
    description: "Create prompts from template strings.",
    inputs: TEMPLATE_INPUT_PORTS,
    outputs: ["prompt"],
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
const CLUSTER_PRESETS_KEY = "ai_paths_cluster_presets";
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

type ClusterPreset = {
  id: string;
  name: string;
  description: string;
  bundlePorts: string[];
  template: string;
  createdAt: string;
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
      const contextConfig = node.config?.context;
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, [
          ...CONTEXT_OUTPUT_PORTS,
          "productJson",
        ]),
        config: {
          ...node.config,
          context: {
            role: contextConfig?.role ?? DEFAULT_CONTEXT_ROLE,
            entityType: contextConfig?.entityType ?? "product",
            entityIdSource: contextConfig?.entityIdSource ?? "simulation",
            entityId: contextConfig?.entityId ?? "",
            scopeMode: contextConfig?.scopeMode ?? "full",
            includePaths: contextConfig?.includePaths ?? [],
            excludePaths: contextConfig?.excludePaths ?? [],
          },
        },
      };
    }
    if (node.type === "mapper") {
      const mapperConfig = node.config?.mapper;
      const outputs =
        mapperConfig?.outputs && mapperConfig.outputs.length > 0
          ? mapperConfig.outputs
          : node.outputs.length > 0
            ? node.outputs
            : ["value"];
      return {
        ...node,
        outputs,
        config: {
          ...node.config,
          mapper: {
            outputs,
            mappings: mapperConfig?.mappings ?? createParserMappings(outputs),
          },
        },
      };
    }
    if (node.type === "parser") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ["productJson", "entityJson"]),
        config: {
          ...node.config,
          parser: {
            mappings: node.config?.parser?.mappings ?? createParserMappings(node.outputs),
          },
        },
      };
    }
    if (node.type === "mutator") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, ["context"]),
        config: {
          ...node.config,
          mutator: {
            path: node.config?.mutator?.path ?? "entity.title",
            valueTemplate: node.config?.mutator?.valueTemplate ?? "{{value}}",
          },
        },
      };
    }
    if (node.type === "validator") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, ["context", "valid", "errors"]),
        config: {
          ...node.config,
          validator: {
            requiredPaths: node.config?.validator?.requiredPaths ?? ["entity.id"],
            mode: node.config?.validator?.mode ?? "all",
          },
        },
      };
    }
    if (node.type === "constant") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, ["value"]),
        config: {
          ...node.config,
          constant: {
            valueType: node.config?.constant?.valueType ?? "string",
            value: node.config?.constant?.value ?? "",
          },
        },
      };
    }
    if (node.type === "math") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ["value"]),
        outputs: ensureUniquePorts(node.outputs, ["value"]),
        config: {
          ...node.config,
          math: {
            operation: node.config?.math?.operation ?? "add",
            operand: node.config?.math?.operand ?? 0,
          },
        },
      };
    }
    if (node.type === "template") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, TEMPLATE_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["prompt"]),
        config: {
          ...node.config,
          template: {
            template: node.config?.template?.template ?? "Write a summary for {{context.entity.title}}",
          },
        },
      };
    }
    if (node.type === "bundle") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, BUNDLE_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["bundle"]),
        config: {
          ...node.config,
          bundle: {
            includePorts: node.config?.bundle?.includePorts ?? [],
          },
        },
      };
    }
    if (node.type === "gate") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ["context", "valid", "errors"]),
        outputs: ensureUniquePorts(node.outputs, ["context", "valid", "errors"]),
        config: {
          ...node.config,
          gate: {
            mode: node.config?.gate?.mode ?? "block",
            failMessage: node.config?.gate?.failMessage ?? "Gate blocked",
          },
        },
      };
    }
    if (node.type === "compare") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ["value"]),
        outputs: ensureUniquePorts(node.outputs, ["value", "valid", "errors"]),
        config: {
          ...node.config,
          compare: {
            operator: node.config?.compare?.operator ?? "eq",
            compareTo: node.config?.compare?.compareTo ?? "",
            caseSensitive: node.config?.compare?.caseSensitive ?? false,
            message: node.config?.compare?.message ?? "Comparison failed",
          },
        },
      };
    }
    if (node.type === "router") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ROUTER_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ROUTER_OUTPUT_PORTS),
        config: {
          ...node.config,
          router: {
            mode: node.config?.router?.mode ?? "valid",
            matchMode: node.config?.router?.matchMode ?? "truthy",
            compareTo: node.config?.router?.compareTo ?? "",
          },
        },
      };
    }
    if (node.type === "delay") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, DELAY_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, DELAY_OUTPUT_PORTS),
        config: {
          ...node.config,
          delay: {
            ms: node.config?.delay?.ms ?? 300,
          },
        },
      };
    }
    if (node.type === "http") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, HTTP_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["value", "bundle"]),
        config: {
          ...node.config,
          http: {
            url: node.config?.http?.url ?? "https://api.example.com",
            method: node.config?.http?.method ?? "GET",
            headers: node.config?.http?.headers ?? "{\n  \"Content-Type\": \"application/json\"\n}",
            bodyTemplate: node.config?.http?.bodyTemplate ?? "",
            responseMode: node.config?.http?.responseMode ?? "json",
            responsePath: node.config?.http?.responsePath ?? "",
          },
        },
      };
    }
    if (node.type === "ai_description") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, DESCRIPTION_OUTPUT_PORTS),
        config: {
          ...node.config,
          description: {
            visionOutputEnabled: node.config?.description?.visionOutputEnabled ?? true,
            generationOutputEnabled: node.config?.description?.generationOutputEnabled ?? true,
          },
        },
      };
    }
    if (node.type === "description_updater") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, ["description_en"]),
      };
    }
      if (node.type === "viewer") {
        const normalizedInputs = ensureUniquePorts(node.inputs, VIEWER_INPUT_PORTS);
        const existingOutputs = node.config?.viewer?.outputs;
        const legacyOutput =
          (node.config as { viewer?: { sampleOutput?: string } } | undefined)?.viewer
          ?.sampleOutput ?? "";
      const outputs = existingOutputs ?? {
        ...createViewerOutputs(normalizedInputs),
        ...(legacyOutput ? { result: legacyOutput } : {}),
      };
      return {
        ...node,
        inputs: normalizedInputs,
        config: {
          ...node.config,
          viewer: {
            outputs: {
              ...createViewerOutputs(normalizedInputs),
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
        config: {
          ...node.config,
          simulation: {
            productId: node.config?.simulation?.productId ?? "",
            entityType: node.config?.simulation?.entityType ?? "product",
            entityId: node.config?.simulation?.entityId ?? "",
          },
        },
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
    return { simulation: { productId: "", entityType: "product", entityId: "" } };
  }
  if (type === "viewer") {
    return { viewer: { outputs: createViewerOutputs(inputs) } };
  }
  if (type === "context") {
    return {
      context: {
        role: DEFAULT_CONTEXT_ROLE,
        entityType: "product",
        entityIdSource: "simulation",
        entityId: "",
        scopeMode: "full",
        includePaths: [],
        excludePaths: [],
      },
    };
  }
  if (type === "mapper") {
    return {
      mapper: {
        outputs: outputs.length ? outputs : ["value"],
        mappings: createParserMappings(outputs.length ? outputs : ["value"]),
      },
    };
  }
  if (type === "mutator") {
    return {
      mutator: {
        path: "entity.title",
        valueTemplate: "{{value}}",
      },
    };
  }
  if (type === "validator") {
    return {
      validator: {
        requiredPaths: ["entity.id"],
        mode: "all",
      },
    };
  }
  if (type === "constant") {
    return {
      constant: {
        valueType: "string",
        value: "",
      },
    };
  }
  if (type === "math") {
    return {
      math: {
        operation: "add",
        operand: 0,
      },
    };
  }
  if (type === "template") {
    return {
      template: {
        template: "Write a summary for {{context.entity.title}}",
      },
    };
  }
  if (type === "bundle") {
    return {
      bundle: {
        includePorts: [],
      },
    };
  }
  if (type === "gate") {
    return {
      gate: {
        mode: "block",
        failMessage: "Gate blocked",
      },
    };
  }
  if (type === "compare") {
    return {
      compare: {
        operator: "eq",
        compareTo: "",
        caseSensitive: false,
        message: "Comparison failed",
      },
    };
  }
  if (type === "router") {
    return {
      router: {
        mode: "valid",
        matchMode: "truthy",
        compareTo: "",
      },
    };
  }
  if (type === "delay") {
    return {
      delay: {
        ms: 300,
      },
    };
  }
  if (type === "http") {
    return {
      http: {
        url: "https://api.example.com",
        method: "GET",
        headers: "{\n  \"Content-Type\": \"application/json\"\n}",
        bodyTemplate: "",
        responseMode: "json",
        responsePath: "",
      },
    };
  }
  if (type === "ai_description") {
    return {
      description: {
        visionOutputEnabled: true,
        generationOutputEnabled: true,
      },
    };
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

const formatRuntimeValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value, null, 2);
    if (json.length > 400) return `${json.slice(0, 400)}…`;
    return json;
  } catch {
    return String(value);
  }
};

const parsePathList = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const getValueAtPath = (obj: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
};

const normalizeMappingPath = (path: string, root?: unknown) => {
  if (!path) return "";
  let next = path.trim();
  if (next.startsWith("$.") ) {
    next = next.slice(2);
  } else if (next.startsWith("$")) {
    next = next.slice(1);
  }
  if (next.startsWith("context.")) {
    const hasContext =
      root && typeof root === "object" && "context" in (root as Record<string, unknown>);
    if (!hasContext) {
      next = next.slice("context.".length);
    }
  }
  return next;
};

const parsePathTokens = (path: string) => {
  const tokens: Array<string | number> = [];
  const regex = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path))) {
    if (match[1]) {
      tokens.push(match[1]);
    } else if (match[2]) {
      tokens.push(Number(match[2]));
    }
  }
  return tokens;
};

const getValueAtMappingPath = (obj: unknown, path: string) => {
  const normalized = normalizeMappingPath(path, obj);
  if (!normalized) return undefined;
  const tokens = parsePathTokens(normalized);
  let current: unknown = obj;
  for (const token of tokens) {
    if (current === null || current === undefined) return undefined;
    if (typeof token === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[token];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return current;
};

const coerceInput = <T,>(value: T | T[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const coerceInputArray = <T,>(value: T | T[] | undefined) =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

const appendInputValue = (current: unknown, value: unknown) => {
  if (current === undefined) return value;
  if (Array.isArray(current)) return [...current, value];
  return [current, value];
};

const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
  currentValue: unknown
) =>
  template.replace(/{{\s*([^}]+)\s*}}/g, (_match, token) => {
    const key = String(token).trim();
    if (key === "value" || key === "current") {
      return currentValue === undefined || currentValue === null
        ? ""
        : String(currentValue);
    }
    const resolved = getValueAtMappingPath(context, key);
    if (resolved === undefined || resolved === null) return "";
    return String(resolved);
  });

const setValueAtPath = (obj: Record<string, unknown>, path: string, value: unknown) => {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });
};

const setValueAtMappingPath = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
) => {
  const normalized = normalizeMappingPath(path, obj);
  if (!normalized) return;
  const tokens = parsePathTokens(normalized);
  let current: any = obj;
  let parent: any = null;
  let parentKey: string | number | null = null;
  tokens.forEach((token, index) => {
    const isLast = index === tokens.length - 1;
    if (isLast) {
      if (typeof token === "number") {
        if (!Array.isArray(current)) {
          const nextArray: unknown[] = [];
          if (parent && parentKey !== null) parent[parentKey] = nextArray;
          current = nextArray;
        }
        current[token] = value;
      } else {
        current[token] = value;
      }
      return;
    }
    const nextToken = tokens[index + 1];
    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        const nextArray: unknown[] = [];
        if (parent && parentKey !== null) parent[parentKey] = nextArray;
        current = nextArray;
      }
      if (current[token] == null || typeof current[token] !== "object") {
        current[token] = typeof nextToken === "number" ? [] : {};
      }
      parent = current;
      parentKey = token;
      current = current[token];
      return;
    }
    if (current[token] == null || typeof current[token] !== "object") {
      current[token] = typeof nextToken === "number" ? [] : {};
    }
    parent = current;
    parentKey = token;
    current = current[token];
  });
};

const pickByPaths = (obj: Record<string, unknown>, paths: string[]) => {
  const result: Record<string, unknown> = {};
  paths.forEach((path) => {
    const value = getValueAtPath(obj, path);
    if (value !== undefined) {
      setValueAtPath(result, path, value);
    }
  });
  return result;
};

const deletePath = (obj: Record<string, unknown>, path: string) => {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  keys.forEach((key, index) => {
    if (!current || typeof current !== "object") return;
    if (index === keys.length - 1) {
      delete current[key];
      return;
    }
    current = current[key] as Record<string, unknown>;
  });
};

const omitByPaths = (obj: Record<string, unknown>, paths: string[]) => {
  const clone = cloneValue(obj);
  paths.forEach((path) => deletePath(clone as Record<string, unknown>, path));
  return clone;
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
  entityJson: ["entityJson"],
  productId: ["productId"],
  entityId: ["entityId"],
  entityType: ["entityType"],
  trigger: ["trigger"],
  prompt: ["prompt"],
  result: ["result"],
  images: ["images"],
  title: ["title"],
  content_en: ["content_en"],
  context: ["context"],
  simulation: ["simulation"],
  meta: ["meta"],
  bundle: ["bundle"],
  value: ["value"],
  description_en: ["description_en"],
  valid: ["valid"],
  errors: ["errors"],
};

// Define which node types can connect to which node types
const NODE_TYPE_COMPATIBILITY: Record<NodeType, NodeType[]> = {
  context: [
    "trigger",
    "parser",
    "viewer",
    "ai_description",
    "mapper",
    "mutator",
    "validator",
    "bundle",
    "template",
    "router",
    "delay",
    "http",
  ],
  trigger: ["viewer", "mapper", "mutator", "validator", "bundle", "template", "router", "delay"],
  simulation: ["trigger"],
  parser: [
    "prompt",
    "updater",
    "viewer",
    "ai_description",
    "description_updater",
    "mapper",
    "mutator",
    "validator",
    "bundle",
    "template",
    "router",
    "delay",
  ],
  mapper: [
    "prompt",
    "mutator",
    "validator",
    "viewer",
    "ai_description",
    "description_updater",
    "bundle",
    "template",
    "router",
    "delay",
  ],
  mutator: [
    "validator",
    "viewer",
    "prompt",
    "ai_description",
    "description_updater",
    "bundle",
    "template",
    "router",
    "delay",
  ],
  validator: [
    "viewer",
    "prompt",
    "ai_description",
    "description_updater",
    "gate",
    "bundle",
    "template",
    "router",
    "delay",
  ],
  constant: ["math", "template", "viewer", "bundle", "compare", "router", "delay", "http"],
  math: ["template", "viewer", "bundle", "compare", "router", "delay", "http"],
  compare: ["gate", "router", "viewer", "bundle", "template"],
  gate: ["validator", "viewer", "prompt", "ai_description", "description_updater", "bundle", "template", "router", "delay"],
  router: ["viewer", "bundle", "template", "prompt", "model", "delay"],
  delay: ["viewer", "bundle", "template", "prompt", "model", "validator", "gate"],
  http: ["viewer", "bundle", "template", "prompt", "math", "compare"],
  bundle: ["viewer", "template", "prompt"],
  template: ["model", "viewer", "bundle", "prompt"],
  prompt: ["model", "viewer", "bundle", "template"],
  model: ["prompt", "updater", "viewer", "description_updater", "bundle"],
  updater: ["viewer", "bundle"],
  viewer: [],
  ai_description: ["viewer", "description_updater", "bundle", "delay"],
  description_updater: ["viewer", "bundle", "delay"],
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
  if (toNode.type === "parser" && toPort === "entityJson") {
    if (fromNode.type !== "context" || fromPort !== "entityJson") {
      return {
        valid: false,
        message: "Parser 'entityJson' must connect from Context 'entityJson'.",
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

  // Rule 13: AI Description inputs must come from Context/Parser
  if (toNode.type === "ai_description" && toPort === "productJson") {
    if (fromNode.type !== "context" || fromPort !== "productJson") {
      return {
        valid: false,
        message: "AI Description 'productJson' must connect from Context 'productJson'.",
      };
    }
  }
  if (toNode.type === "ai_description" && (toPort === "title" || toPort === "images")) {
    if (fromNode.type !== "parser") {
      return {
        valid: false,
        message: "AI Description title/images must connect from Parser.",
      };
    }
  }

  // Rule 14: Description updater must receive description_en from AI Description or Model
  if (toNode.type === "description_updater" && toPort === "description_en") {
    if (
      !(
        (fromNode.type === "ai_description" && fromPort === "description_en") ||
        (fromNode.type === "model" && fromPort === "result")
      )
    ) {
      return {
        valid: false,
        message:
          "Description updater must connect description_en from AI Description or Model result.",
      };
    }
  }

  if (toNode.type === "description_updater" && toPort === "productId") {
    if (fromNode.type !== "parser" || fromPort !== "productId") {
      return {
        valid: false,
        message: "Description updater productId must connect from Parser productId.",
      };
    }
  }

  // Rule 15: Updater productId/content_en must come from Parser
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

  // Rule 16: Updater result must come from Model
  if (toNode.type === "updater" && toPort === "result") {
    if (fromNode.type !== "model" || fromPort !== "result") {
      return {
        valid: false,
        message: "Updater 'result' must connect from Model 'result'.",
      };
    }
  }

  // Rule 17: Gate valid input must come from Validator.valid
  if (toNode.type === "gate" && toPort === "valid") {
    if (fromNode.type !== "validator" || fromPort !== "valid") {
      return {
        valid: false,
        message: "Gate 'valid' must connect from Validator 'valid'.",
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

const createPresetId = () =>
  `preset_${Math.random().toString(36).slice(2, 8)}`;

const createAiDescriptionPath = (id: string): PathConfig => {
  const now = new Date().toISOString();
  const nodes: AiNode[] = [
    {
      id: "node-context",
      type: "context",
      title: "Context Grabber",
      description: "Collect product context.",
      inputs: [],
      outputs: ["role", "context", "productJson"],
      position: { x: 80, y: 140 },
      config: {
        context: {
          role: DEFAULT_CONTEXT_ROLE,
          scopeMode: "full",
          includePaths: [],
          excludePaths: [],
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
      position: { x: 380, y: 140 },
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
      id: "node-ai-desc",
      type: "ai_description",
      title: "AI Description Generator",
      description: "Generate description_en from product context.",
      inputs: ["productJson", "images", "title"],
      outputs: ["description_en"],
      position: { x: 700, y: 120 },
      config: {
        description: {
          visionOutputEnabled: true,
          generationOutputEnabled: true,
        },
      },
    },
    {
      id: "node-desc-updater",
      type: "description_updater",
      title: "Description Updater",
      description: "Write description_en to the product.",
      inputs: ["productId", "description_en"],
      outputs: ["description_en"],
      position: { x: 1020, y: 140 },
    },
    {
      id: "node-viewer",
      type: "viewer",
      title: "Result Viewer",
      description: "Preview description + runtime outputs.",
      inputs: ["description", "description_en", "context", "meta", "trigger"],
      outputs: [],
      position: { x: 1340, y: 120 },
      config: {
        viewer: {
          outputs: {
            description_en: "",
            context: "",
            meta: "",
            trigger: "",
            description: "",
          },
        },
      },
    },
  ];

  const edges: Edge[] = [
    {
      id: "edge-1",
      from: "node-context",
      to: "node-parser",
      fromPort: "productJson",
      toPort: "productJson",
    },
    {
      id: "edge-2",
      from: "node-parser",
      to: "node-ai-desc",
      fromPort: "title",
      toPort: "title",
    },
    {
      id: "edge-3",
      from: "node-parser",
      to: "node-ai-desc",
      fromPort: "images",
      toPort: "images",
    },
    {
      id: "edge-4",
      from: "node-context",
      to: "node-ai-desc",
      fromPort: "productJson",
      toPort: "productJson",
    },
    {
      id: "edge-5",
      from: "node-ai-desc",
      to: "node-desc-updater",
      fromPort: "description_en",
      toPort: "description_en",
    },
    {
      id: "edge-6",
      from: "node-parser",
      to: "node-desc-updater",
      fromPort: "productId",
      toPort: "productId",
    },
    {
      id: "edge-7",
      from: "node-desc-updater",
      to: "node-viewer",
      fromPort: "description_en",
      toPort: "description_en",
    },
  ];

  return {
    id,
    version: STORAGE_VERSION,
    name: "AI Description Path",
    description: "Generates product descriptions via AI and updates the product.",
    trigger: triggers[0] ?? "Product Modal - Context Grabber",
    nodes,
    edges,
    updatedAt: now,
  };
};

const typeStyles: Record<NodeType, { border: string; glow: string }> = {
  trigger: { border: "border-lime-500/40", glow: "shadow-lime-500/20" },
  simulation: { border: "border-cyan-500/40", glow: "shadow-cyan-500/20" },
  context: { border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
  parser: { border: "border-sky-500/40", glow: "shadow-sky-500/20" },
  mapper: { border: "border-blue-500/40", glow: "shadow-blue-500/20" },
  mutator: { border: "border-teal-500/40", glow: "shadow-teal-500/20" },
  validator: { border: "border-orange-500/40", glow: "shadow-orange-500/20" },
  constant: { border: "border-slate-400/40", glow: "shadow-slate-500/20" },
  math: { border: "border-yellow-500/40", glow: "shadow-yellow-500/20" },
  gate: { border: "border-red-500/40", glow: "shadow-red-500/20" },
  bundle: { border: "border-cyan-400/40", glow: "shadow-cyan-500/20" },
  template: { border: "border-lime-500/40", glow: "shadow-lime-500/20" },
  compare: { border: "border-amber-300/40", glow: "shadow-amber-300/20" },
  router: { border: "border-pink-500/40", glow: "shadow-pink-500/20" },
  delay: { border: "border-indigo-400/40", glow: "shadow-indigo-400/20" },
  http: { border: "border-sky-400/40", glow: "shadow-sky-400/20" },
  prompt: { border: "border-amber-500/40", glow: "shadow-amber-500/20" },
  model: { border: "border-fuchsia-500/40", glow: "shadow-fuchsia-500/20" },
  updater: { border: "border-rose-500/40", glow: "shadow-rose-500/20" },
  viewer: { border: "border-violet-500/40", glow: "shadow-violet-500/20" },
  ai_description: { border: "border-indigo-500/40", glow: "shadow-indigo-500/20" },
  description_updater: { border: "border-rose-400/40", glow: "shadow-rose-400/20" },
};

const triggers = [
  "Product Modal - Context Grabber",
  "Bulk Action - Generate Descriptions",
  "On Product Save",
];

type AiPathsSettingsProps = {
  activeTab: "canvas" | "paths" | "docs";
  renderActions?: (actions: React.ReactNode) => React.ReactNode;
  onTabChange?: (tab: "canvas" | "paths" | "docs") => void;
};

export function AiPathsSettings({ activeTab, renderActions, onTabChange }: AiPathsSettingsProps) {
  const { toast } = useToast();
  const docsWiringSnippet = [
    "Simulation.simulation → Trigger.simulation",
    "Context.role → Trigger.role",
    "Trigger.context → ResultViewer.context",
    "Trigger.meta → ResultViewer.meta",
    "Trigger.trigger → ResultViewer.trigger",
  ].join("\n");
  const docsDescriptionSnippet = [
    "Context.productJson → Parser.productJson",
    "Parser.title → AI Description Generator.title",
    "Parser.images → AI Description Generator.images",
    "AI Description Generator.description_en → Description Updater.description_en",
    "Parser.productId → Description Updater.productId",
    "Description Updater.description_en → Result Viewer.description_en",
  ].join("\n");
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
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    inputs: {},
    outputs: {},
  });
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<{
    message: string;
    time: string;
    pathId?: string | null;
  } | null>(null);
  const [clusterPresets, setClusterPresets] = useState<ClusterPreset[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetDraft, setPresetDraft] = useState({
    name: "",
    description: "",
    bundlePorts: "context\nmeta\ntrigger\nentityJson\nentityId\nentityType\nresult",
    template: "Write a summary for {{context.entity.title}}",
  });
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

  const saveClusterPresets = async (nextPresets: ClusterPreset[]) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: CLUSTER_PRESETS_KEY,
          value: JSON.stringify(nextPresets),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to save cluster presets.");
      }
    } catch (error) {
      reportAiPathsError(error, { action: "saveClusterPresets" }, "Failed to save presets:");
      toast("Failed to save cluster presets.", { variant: "error" });
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
        const presetsRaw = map.get(CLUSTER_PRESETS_KEY);
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
        if (presetsRaw) {
          try {
            const parsed = JSON.parse(presetsRaw) as ClusterPreset[];
            if (Array.isArray(parsed)) {
              setClusterPresets(parsed);
            }
          } catch (error) {
            reportAiPathsError(error, { action: "parsePresets" }, "Failed to parse presets:");
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

  const fetchProductById = async (productId: string) => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      reportAiPathsError(error, { action: "fetchProduct", productId }, "Failed to fetch product:");
      return null;
    }
  };

  const fetchNoteById = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as Record<string, unknown>;
    } catch (error) {
      reportAiPathsError(error, { action: "fetchNote", noteId }, "Failed to fetch note:");
      return null;
    }
  };

  const fetchEntityByType = async (entityType: string, entityId: string) => {
    if (!entityType || !entityId) return null;
    const normalized = entityType.toLowerCase();
    if (normalized === "product") {
      return fetchProductById(entityId);
    }
    if (normalized === "note") {
      return fetchNoteById(entityId);
    }
    return null;
  };

  const evaluateGraph = async (
    triggerNodeId?: string,
    triggerEvent?: string
  ): Promise<RuntimeState> => {
    const outputs: Record<string, RuntimePortValues> = {};
    let inputs: Record<string, RuntimePortValues> = {};
    const now = new Date().toISOString();
    const entityCache = new Map<string, Record<string, unknown> | null>();

    const fetchEntityCached = async (entityType: string, entityId: string) => {
      if (!entityType || !entityId) return null;
      const key = `${entityType}:${entityId}`;
      if (entityCache.has(key)) return entityCache.get(key) ?? null;
      const data = await fetchEntityByType(entityType, entityId);
      entityCache.set(key, data);
      return data;
    };

    let simulationEntityId: string | null = null;
    let simulationEntityType: string | null = null;

    if (triggerNodeId) {
      const simulationEdge = edges.find(
        (edge) => edge.to === triggerNodeId && edge.toPort === "simulation"
      );
      if (simulationEdge) {
        const simNode = nodes.find(
          (node) => node.id === simulationEdge.from && node.type === "simulation"
        );
        simulationEntityType =
          simNode?.config?.simulation?.entityType?.trim() ?? "product";
        simulationEntityId =
          simNode?.config?.simulation?.entityId?.trim() ||
          simNode?.config?.simulation?.productId?.trim() ||
          null;
      }
    }

    const resolvedEntity =
      simulationEntityId && simulationEntityType
        ? await fetchEntityCached(simulationEntityType, simulationEntityId)
        : null;

    const defaultContextConfig =
      nodes.find((node) => node.type === "context")?.config?.context ?? {
        role: DEFAULT_CONTEXT_ROLE,
        entityType: "product",
        entityIdSource: "simulation",
        entityId: "",
        scopeMode: "full",
        includePaths: [],
        excludePaths: [],
      };

    const applyContextScope = (payload: Record<string, unknown>, config?: ContextConfig) => {
      const scopeMode = config?.scopeMode ?? "full";
      const includePaths = config?.includePaths ?? [];
      const excludePaths = config?.excludePaths ?? [];
      if (scopeMode === "include" && includePaths.length > 0) {
        return pickByPaths(payload, includePaths);
      }
      if (scopeMode === "exclude" && excludePaths.length > 0) {
        return omitByPaths(payload, excludePaths);
      }
      return payload;
    };

    const buildFallbackEntity = (entityId?: string | null) => ({
      id: entityId ?? "demo-entity",
      title: "Sample entity",
      images: [],
      content_en: "Sample content",
    });

    const resolveContextPayload = async (config?: ContextConfig) => {
      const contextConfig = config ?? defaultContextConfig;
      const role = contextConfig.role ?? DEFAULT_CONTEXT_ROLE;
      const entityType =
        contextConfig.entityType?.trim() || simulationEntityType || "product";
      const manualId = contextConfig.entityId?.trim() || null;
      const entityId =
        contextConfig.entityIdSource === "manual"
          ? manualId
          : simulationEntityId ?? manualId ?? null;
      const fetched =
        entityId && entityType ? await fetchEntityCached(entityType, entityId) : null;
      const rawEntity = fetched ?? buildFallbackEntity(entityId);
      const scopedEntity = applyContextScope(rawEntity, contextConfig);
      return { role, entityType, entityId, rawEntity, scopedEntity };
    };

    for (const node of nodes) {
      if (node.type === "context") {
        const payload = await resolveContextPayload(node.config?.context);
        outputs[node.id] = {
          role: payload.role,
          context: {
            role: payload.role,
            entityType: payload.entityType,
            entityId: payload.entityId,
            source: node.title,
            timestamp: now,
            entity: payload.scopedEntity,
            productId: payload.entityType === "product" ? payload.entityId : undefined,
            product: payload.entityType === "product" ? payload.scopedEntity : undefined,
          },
          entityId: payload.entityId,
          entityType: payload.entityType,
          entityJson: payload.scopedEntity,
          productJson: payload.entityType === "product" ? payload.rawEntity : undefined,
        };
      }
      if (node.type === "simulation") {
        const entityType =
          node.config?.simulation?.entityType?.trim() || "product";
        const entityId =
          node.config?.simulation?.entityId?.trim() ||
          node.config?.simulation?.productId?.trim() ||
          null;
        const entity =
          entityId && entityType ? await fetchEntityCached(entityType, entityId) : null;
        outputs[node.id] = {
          simulation: {
            entityType,
            entityId,
            source: node.title,
            timestamp: now,
            entity,
          },
          entityId,
          entityType,
          productId: entityType === "product" ? entityId : undefined,
        };
      }
    }

    const maxIterations = Math.max(2, nodes.length + 2);
    const aiExecuted = new Set<string>();
    const updaterExecuted = new Set<string>();
    const httpExecuted = new Set<string>();
    const delayExecuted = new Set<string>();
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const nextInputs: Record<string, RuntimePortValues> = {};
      edges.forEach((edge) => {
        const fromOutput = outputs[edge.from];
        if (!fromOutput || !edge.fromPort || !edge.toPort) return;
        const value = fromOutput[edge.fromPort];
        if (value === undefined) return;
        const existing = nextInputs[edge.to]?.[edge.toPort];
        const mergedValue = appendInputValue(existing, value);
        nextInputs[edge.to] = {
          ...(nextInputs[edge.to] ?? {}),
          [edge.toPort]: mergedValue,
        };
      });

      let changed = false;
      nodes.forEach((node) => {
        const nodeInputs = nextInputs[node.id] ?? {};
        const prevOutputs = outputs[node.id] ?? {};
        let nextOutputs: RuntimePortValues = prevOutputs;

        switch (node.type) {
          case "trigger": {
            if (triggerNodeId && node.id !== triggerNodeId) {
              nextOutputs = {};
              break;
            }
            const eventName =
              triggerEvent ?? node.config?.trigger?.event ?? "path_generate_description";
            const role = coerceInput(nodeInputs.role) ?? null;
            const simulation = coerceInput(nodeInputs.simulation) as
              | { entityId?: string; entityType?: string; productId?: string }
              | undefined;
            const simulationInputId =
              simulation?.entityId ?? simulation?.productId ?? null;
            const simulationInputType =
              simulation?.entityType ?? simulationEntityType ?? null;
            const contextEdge = edges.find(
              (edge) => edge.to === node.id && edge.toPort === "role"
            );
            const contextNode = contextEdge
              ? nodes.find((item) => item.id === contextEdge.from)
              : null;
            const contextOutput = contextNode ? outputs[contextNode.id] : null;
            const resolvedEntityId =
              (contextOutput?.entityId as string | undefined) ??
              simulationInputId ??
              null;
            const resolvedEntityType =
              (contextOutput?.entityType as string | undefined) ??
              simulationInputType ??
              null;
            const resolvedContext =
              (contextOutput?.context as Record<string, unknown> | undefined) ?? {
                role,
                entityType: resolvedEntityType,
                entityId: resolvedEntityId,
                source: node.title,
                timestamp: now,
                entity:
                  (contextOutput?.entityJson as Record<string, unknown> | undefined) ??
                  resolvedEntity ??
                  buildFallbackEntity(resolvedEntityId),
              };
            nextOutputs = {
              trigger: eventName,
              meta: {
                firedAt: now,
                trigger: eventName,
                pathId: activePathId,
                role,
                entityId: resolvedEntityId,
                entityType: resolvedEntityType,
              },
              context: resolvedContext,
              entityId: resolvedEntityId,
              entityType: resolvedEntityType,
            };
            break;
          }
          case "parser": {
            const source =
              (coerceInput(nodeInputs.entityJson) as Record<string, unknown> | undefined) ??
              (coerceInput(nodeInputs.productJson) as Record<string, unknown> | undefined);
            if (!source) {
              nextOutputs = {};
              break;
            }
            const mappings =
              node.config?.parser?.mappings ?? createParserMappings(node.outputs);
            const parsed: RuntimePortValues = {};
            node.outputs.forEach((output) => {
              const mapping = mappings[output]?.trim() ?? "";
              const value = mapping
                ? getValueAtMappingPath(source, mapping)
                : (source as Record<string, unknown>)[output];
              if (value !== undefined) {
                parsed[output] = value;
              }
            });
            nextOutputs = parsed;
            break;
          }
          case "mapper": {
            const contextValue = coerceInput(nodeInputs.context) as
              | Record<string, unknown>
              | undefined;
            if (!contextValue) {
              nextOutputs = {};
              break;
            }
            const mapperConfig = node.config?.mapper ?? {
              outputs: node.outputs,
              mappings: createParserMappings(node.outputs),
            };
            const mapped: RuntimePortValues = {};
            mapperConfig.outputs.forEach((output) => {
              const mapping = mapperConfig.mappings?.[output]?.trim() ?? "";
              const value = mapping
                ? getValueAtMappingPath(contextValue, mapping)
                : getValueAtMappingPath(contextValue, output);
              if (value !== undefined) {
                mapped[output] = value;
              }
            });
            nextOutputs = mapped;
            break;
          }
          case "mutator": {
            const contextValue = coerceInput(nodeInputs.context) as
              | Record<string, unknown>
              | undefined;
            if (!contextValue) {
              nextOutputs = {};
              break;
            }
            const mutatorConfig = node.config?.mutator ?? {
              path: "entity.title",
              valueTemplate: "{{value}}",
            };
            const targetPath = normalizeMappingPath(mutatorConfig.path ?? "", contextValue);
            if (!targetPath) {
              nextOutputs = { context: contextValue };
              break;
            }
            const currentValue = getValueAtMappingPath(contextValue, targetPath);
            const rendered = renderTemplate(
              mutatorConfig.valueTemplate ?? "{{value}}",
              contextValue,
              currentValue
            );
            const updated = cloneValue(contextValue) as Record<string, unknown>;
            setValueAtMappingPath(updated, targetPath, rendered);
            nextOutputs = { context: updated };
            break;
          }
          case "validator": {
            const contextValue = coerceInput(nodeInputs.context) as
              | Record<string, unknown>
              | undefined;
            if (!contextValue) {
              nextOutputs = {};
              break;
            }
            const validatorConfig = node.config?.validator ?? {
              requiredPaths: ["entity.id"],
              mode: "all",
            };
            const required = (validatorConfig.requiredPaths ?? []).map((path) =>
              normalizeMappingPath(path, contextValue)
            );
            const missing = required.filter((path) => {
              if (!path) return false;
              const value = getValueAtMappingPath(contextValue, path);
              if (value === undefined || value === null) return true;
              if (typeof value === "string" && value.trim() === "") return true;
              return false;
            });
            const valid =
              validatorConfig.mode === "any"
                ? missing.length < required.length
                : missing.length === 0;
            nextOutputs = {
              context: contextValue,
              valid,
              errors: missing,
            };
            break;
          }
          case "prompt": {
            const entries = Object.entries(nodeInputs)
              .map(([key, value]) => `${key}: ${formatRuntimeValue(value)}`)
              .join("\n");
            nextOutputs = {
              prompt: entries ? `Prompt:\n${entries}` : "Prompt: (no inputs)",
            };
            break;
          }
          case "model": {
            const prompt = nodeInputs.prompt
              ? formatRuntimeValue(coerceInput(nodeInputs.prompt))
              : "No prompt";
            nextOutputs = {
              result: `Result for ${prompt}`,
            };
            break;
          }
          case "constant": {
            const config = node.config?.constant ?? {
              valueType: "string",
              value: "",
            };
            let constantValue: unknown = config.value;
            if (config.valueType === "number") {
              const parsed = Number(config.value);
              constantValue = Number.isFinite(parsed) ? parsed : 0;
            } else if (config.valueType === "boolean") {
              constantValue =
                config.value.trim().toLowerCase() === "true" ||
                config.value.trim() === "1";
            } else if (config.valueType === "json") {
              try {
                constantValue = JSON.parse(config.value);
              } catch {
                constantValue = config.value;
              }
            }
            nextOutputs = { value: constantValue };
            break;
          }
          case "math": {
            const config = node.config?.math ?? {
              operation: "add",
              operand: 0,
            };
            const values = coerceInputArray(nodeInputs.value)
              .map((item) => {
                if (typeof item === "number") return item;
                if (typeof item === "string") {
                  const parsed = Number(item);
                  return Number.isFinite(parsed) ? parsed : null;
                }
                return null;
              })
              .filter((item): item is number => item !== null);
            if (values.length === 0) {
              nextOutputs = { value: undefined };
              break;
            }
            const op = config.operation;
            const operand = config.operand ?? 0;
            const applyOp = (value: number) => {
              switch (op) {
                case "add":
                  return value + operand;
                case "subtract":
                  return value - operand;
                case "multiply":
                  return value * operand;
                case "divide":
                  return operand === 0 ? value : value / operand;
                case "round":
                  return Math.round(value);
                case "ceil":
                  return Math.ceil(value);
                case "floor":
                  return Math.floor(value);
                default:
                  return value;
              }
            };
            const nextValue = values.length === 1 ? applyOp(values[0]) : values.map(applyOp);
            nextOutputs = { value: nextValue };
            break;
          }
          case "compare": {
            const config = node.config?.compare ?? {
              operator: "eq",
              compareTo: "",
              caseSensitive: false,
              message: "Comparison failed",
            };
            const rawValue = coerceInput(nodeInputs.value);
            const compareTarget = config.compareTo ?? "";
            const normalizeString = (value: string) =>
              config.caseSensitive ? value : value.toLowerCase();
            let valid = false;
            const valueString =
              rawValue === undefined || rawValue === null ? "" : String(rawValue);
            const targetString = String(compareTarget);
            const valueNumber = typeof rawValue === "number" ? rawValue : Number(valueString);
            const targetNumber = Number(targetString);
            switch (config.operator) {
              case "eq":
                valid = valueString === targetString;
                break;
              case "neq":
                valid = valueString !== targetString;
                break;
              case "gt":
                valid = Number.isFinite(valueNumber) && Number.isFinite(targetNumber)
                  ? valueNumber > targetNumber
                  : false;
                break;
              case "gte":
                valid = Number.isFinite(valueNumber) && Number.isFinite(targetNumber)
                  ? valueNumber >= targetNumber
                  : false;
                break;
              case "lt":
                valid = Number.isFinite(valueNumber) && Number.isFinite(targetNumber)
                  ? valueNumber < targetNumber
                  : false;
                break;
              case "lte":
                valid = Number.isFinite(valueNumber) && Number.isFinite(targetNumber)
                  ? valueNumber <= targetNumber
                  : false;
                break;
              case "contains": {
                if (Array.isArray(rawValue)) {
                  valid = rawValue.includes(compareTarget);
                } else {
                  valid =
                    normalizeString(valueString).includes(
                      normalizeString(targetString)
                    );
                }
                break;
              }
              case "startsWith":
                valid =
                  normalizeString(valueString).startsWith(
                    normalizeString(targetString)
                  );
                break;
              case "endsWith":
                valid =
                  normalizeString(valueString).endsWith(
                    normalizeString(targetString)
                  );
                break;
              case "isEmpty":
                valid =
                  rawValue === undefined ||
                  rawValue === null ||
                  (typeof rawValue === "string" && rawValue.trim() === "") ||
                  (Array.isArray(rawValue) && rawValue.length === 0);
                break;
              case "notEmpty":
                valid =
                  !(
                    rawValue === undefined ||
                    rawValue === null ||
                    (typeof rawValue === "string" && rawValue.trim() === "") ||
                    (Array.isArray(rawValue) && rawValue.length === 0)
                  );
                break;
              default:
                valid = false;
            }
            nextOutputs = {
              value: rawValue,
              valid,
              errors: valid ? [] : [config.message ?? "Comparison failed"],
            };
            break;
          }
          case "router": {
            const config = node.config?.router ?? {
              mode: "valid",
              matchMode: "truthy",
              compareTo: "",
            };
            const valueCandidate =
              config.mode === "valid" ? coerceInput(nodeInputs.valid) : coerceInput(nodeInputs.value);
            const compareTarget = config.compareTo ?? "";
            const asString = valueCandidate === undefined || valueCandidate === null
              ? ""
              : String(valueCandidate);
            let shouldPass = false;
            switch (config.matchMode) {
              case "truthy":
                shouldPass = Boolean(valueCandidate);
                break;
              case "falsy":
                shouldPass = !valueCandidate;
                break;
              case "equals":
                shouldPass = asString === String(compareTarget);
                break;
              case "contains":
                shouldPass = asString.includes(String(compareTarget));
                break;
              default:
                shouldPass = Boolean(valueCandidate);
            }
            const next: RuntimePortValues = {
              valid: shouldPass,
              errors: shouldPass ? [] : ["Router blocked"],
            };
            if (shouldPass) {
              ROUTER_OUTPUT_PORTS.forEach((port) => {
                if (port === "valid" || port === "errors") return;
                if (nodeInputs[port] !== undefined) {
                  next[port] = nodeInputs[port];
                }
              });
            }
            nextOutputs = next;
            break;
          }
          case "delay": {
            if (!delayExecuted.has(node.id)) {
              const delayMs = node.config?.delay?.ms ?? 300;
              await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
              delayExecuted.add(node.id);
            }
            const delayed: RuntimePortValues = {};
            DELAY_OUTPUT_PORTS.forEach((port) => {
              if (nodeInputs[port] !== undefined) {
                delayed[port] = nodeInputs[port];
              }
            });
            nextOutputs = delayed;
            break;
          }
          case "http": {
            if (httpExecuted.has(node.id)) break;
            const httpConfig = node.config?.http ?? {
              url: "",
              method: "GET",
              headers: "{}",
              bodyTemplate: "",
              responseMode: "json",
              responsePath: "",
            };
            const resolvedUrl = renderTemplate(
              httpConfig.url ?? "",
              nodeInputs as Record<string, unknown>,
              ""
            );
            if (!resolvedUrl) {
              nextOutputs = { value: null, bundle: { ok: false, status: 0, error: "Missing URL" } };
              break;
            }
            let headers: Record<string, string> = {};
            try {
              headers = httpConfig.headers ? (JSON.parse(httpConfig.headers) as Record<string, string>) : {};
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "parseHeaders", nodeId: node.id },
                "Invalid HTTP headers JSON:"
              );
            }
            let body: BodyInit | undefined = undefined;
            if (httpConfig.method !== "GET" && httpConfig.method !== "DELETE") {
              const renderedBody = httpConfig.bodyTemplate
                ? renderTemplate(
                    httpConfig.bodyTemplate,
                    nodeInputs as Record<string, unknown>,
                    ""
                  )
                : "";
              if (renderedBody) {
                const trimmed = renderedBody.trim();
                if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                    (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                  body = trimmed;
                  if (!headers["Content-Type"]) {
                    headers["Content-Type"] = "application/json";
                  }
                } else {
                  body = renderedBody;
                  if (!headers["Content-Type"]) {
                    headers["Content-Type"] = "text/plain";
                  }
                }
              }
            }
            try {
              const res = await fetch(resolvedUrl, {
                method: httpConfig.method,
                headers,
                body,
              });
              let data: unknown = null;
              if (httpConfig.responseMode === "status") {
                data = res.status;
              } else if (httpConfig.responseMode === "text") {
                data = await res.text();
              } else {
                try {
                  data = await res.json();
                } catch {
                  data = await res.text();
                }
              }
              let resolvedValue = data;
              if (httpConfig.responsePath) {
                const pathValue = getValueAtMappingPath(data, httpConfig.responsePath);
                resolvedValue = pathValue === undefined ? data : pathValue;
              }
              nextOutputs = {
                value: resolvedValue,
                bundle: {
                  ok: res.ok,
                  status: res.status,
                  url: resolvedUrl,
                  data: resolvedValue,
                },
              };
              httpExecuted.add(node.id);
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "httpFetch", url: resolvedUrl, nodeId: node.id },
                "HTTP fetch failed:"
              );
              nextOutputs = {
                value: null,
                bundle: {
                  ok: false,
                  status: 0,
                  url: resolvedUrl,
                  error: "Fetch failed",
                },
              };
            }
            break;
          }
          case "gate": {
            const contextValue = coerceInput(nodeInputs.context) as
              | Record<string, unknown>
              | undefined;
            const validInput = coerceInput(nodeInputs.valid);
            const errorsInput = coerceInputArray(nodeInputs.errors);
            const config = node.config?.gate ?? { mode: "block", failMessage: "Gate blocked" };
            const isValid = typeof validInput === "boolean" ? validInput : Boolean(validInput);
            if (!isValid && config.mode === "block") {
              nextOutputs = {
                context: null,
                valid: false,
                errors: errorsInput.length ? errorsInput : [config.failMessage ?? "Gate blocked"],
              };
            } else {
              nextOutputs = {
                context: contextValue,
                valid: isValid,
                errors: errorsInput,
              };
            }
            break;
          }
          case "bundle": {
            const config = node.config?.bundle ?? { includePorts: [] };
            const includePorts = config.includePorts?.length
              ? config.includePorts
              : node.inputs;
            const bundle = includePorts.reduce<Record<string, unknown>>((acc, port) => {
              if (nodeInputs[port] !== undefined) {
                acc[port] = nodeInputs[port];
              }
              return acc;
            }, {});
            nextOutputs = { bundle };
            break;
          }
          case "template": {
            const templateConfig = node.config?.template ?? { template: "" };
            const data = { ...nodeInputs };
            const currentValue = coerceInput(nodeInputs.value) ?? "";
            const prompt = templateConfig.template
              ? renderTemplate(
                  templateConfig.template,
                  data as Record<string, unknown>,
                  currentValue
                )
              : Object.entries(nodeInputs)
                  .map(([key, value]) => `${key}: ${formatRuntimeValue(value)}`)
                  .join("\n");
            nextOutputs = { prompt: prompt || "Prompt: (no template)" };
            break;
          }
          case "updater": {
            nextOutputs = {
              content_en:
                (nodeInputs.result
                  ? formatRuntimeValue(coerceInput(nodeInputs.result))
                  : nodeInputs.content_en) ?? "",
            };
            break;
          }
          case "ai_description": {
            if (aiExecuted.has(node.id)) break;
            const productJson = coerceInput(nodeInputs.productJson) as
              | Record<string, unknown>
              | undefined;
            if (!productJson) {
              nextOutputs = {};
              break;
            }
            const rawImages =
              (coerceInput(nodeInputs.images) as unknown[] | undefined) ??
              (productJson.imageLinks as unknown[] | undefined) ??
              (productJson.images as unknown[] | undefined) ??
              [];
            const imageUrls = rawImages
              .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object") {
                  const url = (item as { url?: string }).url;
                  if (typeof url === "string") return url;
                }
                return null;
              })
              .filter((item): item is string => Boolean(item));
            const body = {
              productData: productJson,
              imageUrls,
              visionOutputEnabled: node.config?.description?.visionOutputEnabled,
              generationOutputEnabled: node.config?.description?.generationOutputEnabled,
            };
            try {
              const res = await fetch("/api/generate-description", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                throw new Error("AI description generation failed.");
              }
              const data = (await res.json()) as { description?: string };
              nextOutputs = {
                description_en: data.description ?? "",
              };
              aiExecuted.add(node.id);
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "aiDescription", nodeId: node.id },
                "AI description failed:"
              );
              nextOutputs = { description_en: "" };
            }
            break;
          }
          case "description_updater": {
            if (updaterExecuted.has(node.id)) break;
            const productId = nodeInputs.productId as string | undefined;
            const description = nodeInputs.description_en as string | undefined;
            if (!productId || !description) {
              nextOutputs = {};
              break;
            }
            try {
              const formData = new FormData();
              formData.append("description_en", description);
              const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
                method: "PUT",
                body: formData,
              });
              if (!res.ok) {
                throw new Error("Failed to update product description.");
              }
              nextOutputs = { description_en: description };
              updaterExecuted.add(node.id);
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "updateDescription", productId, nodeId: node.id },
                "Failed to update description:"
              );
              nextOutputs = { description_en: description };
            }
            break;
          }
          default:
            if (!outputs[node.id]) {
              nextOutputs = prevOutputs;
            }
            break;
        }

        if (JSON.stringify(prevOutputs) !== JSON.stringify(nextOutputs)) {
          outputs[node.id] = nextOutputs;
          changed = true;
        }
      });

      inputs = nextInputs;
      if (!changed) break;
    }

    return { inputs, outputs };
  };

  const runGraphForTrigger = async (triggerNode: AiNode) => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const result = await evaluateGraph(triggerNode.id, triggerEvent);
    setRuntimeState(result);
    setLastRunAt(new Date().toISOString());
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
    entityId: string,
    contextNodeIds: string[] = [],
    roles: string[] = [],
    entityType?: string
  ) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ai-path-trigger", {
        detail: {
          trigger: eventName,
          productId: entityId,
          entityId,
          entityType: entityType ?? "product",
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
    const entityId =
      simulationNode.config?.simulation?.entityId?.trim() ||
      simulationNode.config?.simulation?.productId?.trim();
    const entityType = simulationNode.config?.simulation?.entityType ?? "product";
    if (!entityId) {
      toast("Enter an Entity ID in the simulation node.", { variant: "error" });
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
        void runGraphForTrigger(triggerNode);
      }
    }
    dispatchTrigger(eventName, entityId, resolvedContextIds, resolvedRoles, entityType);
    toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
      variant: "success",
    });
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
    void runGraphForTrigger(triggerNode);
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

  const handleCreateAiDescriptionPath = () => {
    const id = createPathId();
    const config = createAiDescriptionPath(id);
    const now = new Date().toISOString();
    const meta: PathMeta = {
      id,
      name: config.name,
      createdAt: now,
      updatedAt: now,
    };
    setPaths((prev) => [...prev, meta]);
    setPathConfigs((prev) => ({ ...prev, [id]: config }));
    setActivePathId(id);
    const normalizedNodes = normalizeNodes(config.nodes);
    setNodes(normalizedNodes);
    setEdges(sanitizeEdges(normalizedNodes, config.edges));
    setPathName(config.name);
    setPathDescription(config.description);
    setActiveTrigger(config.trigger);
    setSelectedNodeId(normalizedNodes[0]?.id ?? null);
    toast("AI Description Path created.", { variant: "success" });
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

  const handleCopyDocsWiring = async () => {
    try {
      await navigator.clipboard.writeText(docsWiringSnippet);
      toast("Wiring copied to clipboard.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsWiring" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
    }
  };

  const handleCopyDocsDescription = async () => {
    try {
      await navigator.clipboard.writeText(docsDescriptionSnippet);
      toast("AI Description wiring copied.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(error, { action: "copyDocsDescription" }, "Failed to copy wiring:");
      toast("Failed to copy wiring.", { variant: "error" });
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
                      className="rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10"
                      type="button"
                      onClick={handleCreateAiDescriptionPath}
                    >
                      Create AI Description Path
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
                    {lastRunAt && (
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-200">
                        Last run: {new Date(lastRunAt).toLocaleTimeString()}
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
                { title: "Transforms", types: ["mapper", "mutator", "validator"], icon: "🧭" },
                {
                  title: "Signals + Logic",
                  types: ["constant", "math", "compare", "gate", "router", "delay"],
                  icon: "🧪",
                },
                { title: "Bundles + Templates", types: ["bundle", "template"], icon: "🧩" },
                { title: "IO + Fetch", types: ["http"], icon: "🌐" },
                { title: "Prompts + Models", types: ["prompt", "model", "ai_description"], icon: "🤖" },
                { title: "Updaters", types: ["updater"], icon: "💾" },
                { title: "Description", types: ["description_updater"], icon: "✍️" },
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
              const runtimeInputs = runtimeState.inputs[node.id] ?? {};
              const viewerOutputs =
                node.type === "viewer"
                  ? {
                      ...createViewerOutputs(node.inputs),
                      ...(node.config?.viewer?.outputs ?? {}),
                      ...runtimeInputs,
                    }
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
                              <div className="flex items-center justify-between text-[9px] uppercase text-gray-500">
                                <span>{input}</span>
                                {runtimeInputs[input] !== undefined && (
                                  <span className="text-[9px] text-emerald-300">runtime</span>
                                )}
                              </div>
                              <div className="line-clamp-3 rounded border border-gray-800 bg-gray-900/60 px-2 py-1 text-[10px] text-gray-200">
                                {formatRuntimeValue(viewerOutputs[input]) || "No data yet"}
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
                className="rounded-md border border-indigo-500/40 text-sm text-indigo-200 hover:bg-indigo-500/10"
                type="button"
                onClick={handleCreateAiDescriptionPath}
              >
                Create AI Description Path
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

      {activeTab === "docs" && (
        <div className="space-y-6 text-sm text-gray-300">
          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <h2 className="text-lg font-semibold text-white">AI Paths Docs</h2>
            <p className="mt-2 text-gray-400">
              Modular workflows are built by connecting node outputs (right) to matching
              node inputs (left). Connections are strict: port names must match.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
              <h3 className="text-base font-semibold text-white">Core Flow</h3>
              <ul className="mt-3 space-y-2 text-gray-400">
                <li>
                  <span className="text-white">Context → Trigger:</span> Connect
                  <span className="text-emerald-200"> role</span> from Context to Trigger
                  <span className="text-emerald-200"> role</span>.
                </li>
                <li>
                  <span className="text-white">Simulation → Trigger:</span> Connect
                  <span className="text-cyan-200"> simulation</span> from Simulation to Trigger
                  <span className="text-cyan-200"> simulation</span>.
                </li>
                <li>
                  <span className="text-white">Trigger → Viewer:</span> Connect
                  <span className="text-amber-200"> context</span>,
                  <span className="text-amber-200"> meta</span>, or
                  <span className="text-amber-200"> trigger</span> into Result Viewer.
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
              <h3 className="text-base font-semibold text-white">Port Rules</h3>
              <ul className="mt-3 space-y-2 text-gray-400">
                <li>Ports must match exactly (e.g. result → result).</li>
                <li>Context and Simulation nodes are sources (no inputs).</li>
                <li>Viewer is terminal (no outputs).</li>
                <li>Trigger inputs only accept role from Context and simulation from Simulation.</li>
                <li>Multiple wires into the same input are collected as arrays.</li>
                <li>Gate expects valid from a Validator node.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <h3 className="text-base font-semibold text-white">AI Description Flow</h3>
            <ol className="mt-3 space-y-2 text-gray-400">
              <li>Context.productJson → Parser.productJson</li>
              <li>Parser.title/images → AI Description Generator</li>
              <li>AI Description Generator.description_en → Description Updater.description_en</li>
              <li>Parser.productId → Description Updater.productId</li>
              <li>(Optional) Description Updater → Result Viewer</li>
            </ol>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Quick Wiring</h3>
              <Button
                type="button"
                className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={() => void handleCopyDocsWiring()}
              >
                Copy Wiring
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900/60 p-3 text-[11px] text-gray-200">
              {docsWiringSnippet}
            </pre>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                AI Description Wiring
              </h3>
              <Button
                type="button"
                className="rounded-md border border-gray-700 text-xs text-white hover:bg-gray-900/80"
                onClick={() => void handleCopyDocsDescription()}
              >
                Copy AI Description Wiring
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-gray-800 bg-gray-900/60 p-3 text-[11px] text-gray-200">
              {docsDescriptionSnippet}
            </pre>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <h3 className="text-base font-semibold text-white">Node Reference</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Context Grabber</h4>
                <p className="mt-2 text-gray-400">
                  Outputs live context for the selected role. Use its{" "}
                  <span className="text-emerald-200">role</span> output to tell the Trigger what
                  to execute.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Trigger</h4>
                <p className="mt-2 text-gray-400">
                  The execution hub. Accepts role + simulation inputs and emits trigger,
                  context, and meta outputs.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Simulation Modal</h4>
                <p className="mt-2 text-gray-400">
                  Emits a simulation payload (e.g. productId) used to emulate a trigger run.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Result Viewer</h4>
                <p className="mt-2 text-gray-400">
                  Terminal node to inspect outputs. Connect context/meta/trigger or model
                  results to review data.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">JSON Mapper</h4>
                <p className="mt-2 text-gray-400">
                  Maps context fields into custom outputs. Outputs must match the port
                  names of downstream nodes.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Mutator</h4>
                <p className="mt-2 text-gray-400">
                  Updates a context path using a template. Use it to normalize or enrich
                  data before running prompts or models.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Validator</h4>
                <p className="mt-2 text-gray-400">
                  Checks required context paths and emits valid/errors outputs for
                  gating downstream actions.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Gate</h4>
                <p className="mt-2 text-gray-400">
                  Allows context through only when a validator emits valid. Useful for
                  stopping incomplete flows.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Compare</h4>
                <p className="mt-2 text-gray-400">
                  Compares a value and emits valid/errors so you can branch with Gate or Router.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Router</h4>
                <p className="mt-2 text-gray-400">
                  Routes payloads when a condition is met. Outputs context/value when passing.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Delay</h4>
                <p className="mt-2 text-gray-400">
                  Introduces a pause between steps to sequence signal flows.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">HTTP Fetch</h4>
                <p className="mt-2 text-gray-400">
                  Calls external APIs with templated inputs and returns response data.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Bundle</h4>
                <p className="mt-2 text-gray-400">
                  Clusters multiple inputs into a single bundle object for downstream
                  prompts or viewers.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Template</h4>
                <p className="mt-2 text-gray-400">
                  Converts bundled data into a custom prompt using placeholders.
                </p>
              </div>
              <div className="rounded-md border border-gray-800 bg-gray-900/50 p-4">
                <h4 className="text-sm font-semibold text-white">Constant + Math</h4>
                <p className="mt-2 text-gray-400">
                  Emit reusable signals and perform numeric transformations for scoring
                  or routing.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-5">
            <h3 className="text-base font-semibold text-white">Saving & Debugging</h3>
            <ul className="mt-3 space-y-2 text-gray-400">
              <li>Use “Save Path” to persist the canvas.</li>
              <li>Errors are logged to System Logs with an AI Paths badge.</li>
              <li>The “Last error” badge links directly to filtered logs.</li>
            </ul>
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

            {selectedNode.type === "mapper" && (() => {
              const mapperConfig = selectedNode.config?.mapper ?? {
                outputs: selectedNode.outputs.length ? selectedNode.outputs : ["value"],
                mappings: createParserMappings(
                  selectedNode.outputs.length ? selectedNode.outputs : ["value"]
                ),
              };
              const outputs = mapperConfig.outputs.length
                ? mapperConfig.outputs
                : selectedNode.outputs.length
                  ? selectedNode.outputs
                  : ["value"];
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">
                      Outputs (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={outputs.join("\n")}
                      onChange={(event) => {
                        const list = parsePathList(event.target.value);
                        const nextOutputs = list.length ? list : ["value"];
                        const nextMappings = createParserMappings(nextOutputs);
                        nextOutputs.forEach((output) => {
                          if (mapperConfig.mappings?.[output]) {
                            nextMappings[output] = mapperConfig.mappings[output];
                          }
                        });
                        updateSelectedNode({
                          outputs: nextOutputs,
                          config: {
                            ...selectedNode.config,
                            mapper: {
                              outputs: nextOutputs,
                              mappings: nextMappings,
                            },
                          },
                        });
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Outputs must match downstream input ports exactly.
                    </p>
                  </div>
                  {outputs.map((output) => (
                    <div key={output}>
                      <Label className="text-xs text-gray-400">
                        {output} Mapping Path
                      </Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={mapperConfig.mappings?.[output] ?? ""}
                        onChange={(event) => {
                          const nextMappings = {
                            ...mapperConfig.mappings,
                            [output]: event.target.value,
                          };
                          updateSelectedNodeConfig({
                            mapper: { outputs, mappings: nextMappings },
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {selectedNode.type === "mutator" && (() => {
              const mutatorConfig = selectedNode.config?.mutator ?? {
                path: "entity.title",
                valueTemplate: "{{value}}",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Target Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.path}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: { ...mutatorConfig, path: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value Template</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mutatorConfig.valueTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          mutator: {
                            ...mutatorConfig,
                            valueTemplate: event.target.value,
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use <span className="text-gray-300">{`{{value}}`}</span> for
                      the current value or dot paths like{" "}
                      <span className="text-gray-300">{`{{entity.title}}`}</span>.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "validator" && (() => {
              const validatorConfig = selectedNode.config?.validator ?? {
                requiredPaths: ["entity.id"],
                mode: "all",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Validation Mode</Label>
                    <Select
                      value={validatorConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            mode: value as "all" | "any",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="all">All paths required</SelectItem>
                        <SelectItem value="any">Any path required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      Required Paths (one per line)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[100px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={(validatorConfig.requiredPaths ?? []).join("\n")}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          validator: {
                            ...validatorConfig,
                            requiredPaths: parsePathList(event.target.value),
                          },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Paths are relative to the incoming context object.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "constant" && (() => {
              const constantConfig = selectedNode.config?.constant ?? {
                valueType: "string",
                value: "",
              };
              const isJson = constantConfig.valueType === "json";
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Value Type</Label>
                    <Select
                      value={constantConfig.valueType}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          constant: {
                            ...constantConfig,
                            valueType: value as ConstantConfig["valueType"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Value</Label>
                    {isJson ? (
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    ) : (
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={constantConfig.value}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            constant: { ...constantConfig, value: event.target.value },
                          })
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "math" && (() => {
              const mathConfig = selectedNode.config?.math ?? {
                operation: "add",
                operand: 0,
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operation</Label>
                    <Select
                      value={mathConfig.operation}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operation: value as MathConfig["operation"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="add">Add</SelectItem>
                        <SelectItem value="subtract">Subtract</SelectItem>
                        <SelectItem value="multiply">Multiply</SelectItem>
                        <SelectItem value="divide">Divide</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="ceil">Ceil</SelectItem>
                        <SelectItem value="floor">Floor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Operand</Label>
                    <Input
                      type="number"
                      step="0.1"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={mathConfig.operand}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          math: {
                            ...mathConfig,
                            operand: toNumber(event.target.value, mathConfig.operand),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "compare" && (() => {
              const compareConfig = selectedNode.config?.compare ?? {
                operator: "eq",
                compareTo: "",
                caseSensitive: false,
                message: "Comparison failed",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Operator</Label>
                    <Select
                      value={compareConfig.operator}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            operator: value as CompareConfig["operator"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="eq">Equals</SelectItem>
                        <SelectItem value="neq">Not equals</SelectItem>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="startsWith">Starts with</SelectItem>
                        <SelectItem value="endsWith">Ends with</SelectItem>
                        <SelectItem value="isEmpty">Is empty</SelectItem>
                        <SelectItem value="notEmpty">Not empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Case Sensitive</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        compareConfig.caseSensitive
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            caseSensitive: !compareConfig.caseSensitive,
                          },
                        })
                      }
                    >
                      {compareConfig.caseSensitive ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Error Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={compareConfig.message ?? "Comparison failed"}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          compare: {
                            ...compareConfig,
                            message: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "router" && (() => {
              const routerConfig = selectedNode.config?.router ?? {
                mode: "valid",
                matchMode: "truthy",
                compareTo: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Match Source</Label>
                    <Select
                      value={routerConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            mode: value as RouterConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="valid">Validator valid</SelectItem>
                        <SelectItem value="value">Value input</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Match Mode</Label>
                    <Select
                      value={routerConfig.matchMode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            matchMode: value as RouterConfig["matchMode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select match mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="truthy">Truthy</SelectItem>
                        <SelectItem value="falsy">Falsy</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Compare To</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={routerConfig.compareTo}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          router: {
                            ...routerConfig,
                            compareTo: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "delay" && (() => {
              const delayConfig = selectedNode.config?.delay ?? { ms: 300 };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Delay (ms)</Label>
                    <Input
                      type="number"
                      step="50"
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={delayConfig.ms}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          delay: {
                            ms: toNumber(event.target.value, delayConfig.ms),
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Adds a pause before passing inputs downstream.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "http" && (() => {
              const httpConfig = selectedNode.config?.http ?? {
                url: "",
                method: "GET",
                headers: "{\n  \"Content-Type\": \"application/json\"\n}",
                bodyTemplate: "",
                responseMode: "json",
                responsePath: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">URL</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.url}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, url: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Method</Label>
                      <Select
                        value={httpConfig.method}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: { ...httpConfig, method: value as HttpConfig["method"] },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Response Mode</Label>
                      <Select
                        value={httpConfig.responseMode}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            http: {
                              ...httpConfig,
                              responseMode: value as HttpConfig["responseMode"],
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="status">Status only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Headers (JSON)</Label>
                    <Textarea
                      className="mt-2 min-h-[90px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.headers}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, headers: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Body Template</Label>
                    <Textarea
                      className="mt-2 min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.bodyTemplate}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, bodyTemplate: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Response Path</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={httpConfig.responsePath}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          http: { ...httpConfig, responsePath: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Optional JSON path to extract a field from the response.
                    </p>
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "gate" && (() => {
              const gateConfig = selectedNode.config?.gate ?? {
                mode: "block",
                failMessage: "Gate blocked",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Mode</Label>
                    <Select
                      value={gateConfig.mode}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          gate: {
                            ...gateConfig,
                            mode: value as GateConfig["mode"],
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="block">Block on invalid</SelectItem>
                        <SelectItem value="pass">Pass-through</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Fail Message</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={gateConfig.failMessage ?? ""}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          gate: { ...gateConfig, failMessage: event.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {selectedNode.type === "bundle" && (() => {
              const bundleConfig = selectedNode.config?.bundle ?? {
                includePorts: [],
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-400">
                      Included Ports (one per line)
                    </Label>
                    <Button
                      type="button"
                      className="rounded-md border border-gray-700 text-[10px] text-gray-200 hover:bg-gray-900/80"
                      onClick={() =>
                        updateSelectedNodeConfig({
                          bundle: { includePorts: selectedNode.inputs },
                        })
                      }
                    >
                      Use all inputs
                    </Button>
                  </div>
                  <Textarea
                    className="min-h-[110px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                    value={(bundleConfig.includePorts ?? []).join("\n")}
                    onChange={(event) =>
                      updateSelectedNodeConfig({
                        bundle: { includePorts: parsePathList(event.target.value) },
                      })
                    }
                  />
                  <p className="text-[11px] text-gray-500">
                    Bundle outputs a single object with the selected ports as keys.
                  </p>
                </div>
              );
            })()}

            {selectedNode.type === "template" && (() => {
              const templateConfig = selectedNode.config?.template ?? {
                template: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Template</Label>
                    <Textarea
                      className="mt-2 min-h-[140px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={templateConfig.template}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          template: { template: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use placeholders like{" "}
                      <span className="text-gray-300">{`{{context.entity.title}}`}</span>{" "}
                      or{" "}
                      <span className="text-gray-300">{`{{result}}`}</span>.
                    </p>
                  </div>
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
                entityType: "product",
                entityIdSource: "simulation",
                entityId: "",
                scopeMode: "full",
                includePaths: [],
                excludePaths: [],
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
                          context: { ...contextConfig, role: event.target.value },
                        })
                      }
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Connect this role output into a Trigger input to define what the
                      trigger should execute.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-gray-400">Entity Type</Label>
                      <Select
                        value={contextConfig.entityType ?? "product"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityType: value },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="chat">Chat</SelectItem>
                          <SelectItem value="log">Log Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID Source</Label>
                      <Select
                        value={contextConfig.entityIdSource ?? "simulation"}
                        onValueChange={(value) =>
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              entityIdSource: value as ContextConfig["entityIdSource"],
                            },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-800 bg-gray-900">
                          <SelectItem value="simulation">Simulation node</SelectItem>
                          <SelectItem value="manual">Manual ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {contextConfig.entityIdSource === "manual" && (
                    <div>
                      <Label className="text-xs text-gray-400">Entity ID</Label>
                      <Input
                        className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={contextConfig.entityId ?? ""}
                        onChange={(event) =>
                          updateSelectedNodeConfig({
                            context: { ...contextConfig, entityId: event.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-400">Context Scope</Label>
                    <Select
                      value={contextConfig.scopeMode ?? "full"}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          context: { ...contextConfig, scopeMode: value as ContextConfig["scopeMode"] },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="full">Full entity payload</SelectItem>
                        <SelectItem value="include">Include only listed paths</SelectItem>
                        <SelectItem value="exclude">Exclude listed paths</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Use dot paths (e.g. <span className="text-gray-300">priceGroups.default</span>).
                    </p>
                  </div>
                  {(contextConfig.scopeMode === "include" ||
                    contextConfig.scopeMode === "exclude") && (
                    <div>
                      <Label className="text-xs text-gray-400">
                        {contextConfig.scopeMode === "include"
                          ? "Include paths (one per line)"
                          : "Exclude paths (one per line)"}
                      </Label>
                      <Textarea
                        className="mt-2 min-h-[120px] w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                        value={
                          contextConfig.scopeMode === "include"
                            ? (contextConfig.includePaths ?? []).join("\n")
                            : (contextConfig.excludePaths ?? []).join("\n")
                        }
                        onChange={(event) => {
                          const list = parsePathList(event.target.value);
                          updateSelectedNodeConfig({
                            context: {
                              ...contextConfig,
                              includePaths:
                                contextConfig.scopeMode === "include"
                                  ? list
                                  : contextConfig.includePaths ?? [],
                              excludePaths:
                                contextConfig.scopeMode === "exclude"
                                  ? list
                                  : contextConfig.excludePaths ?? [],
                            },
                          });
                        }}
                      />
                    </div>
                  )}
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
                entityType: "product",
                entityId: "",
              };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Entity Type</Label>
                    <Select
                      value={simulationConfig.entityType ?? "product"}
                      onValueChange={(value) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityType: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="mt-2 w-full border-gray-800 bg-gray-950/70 text-sm text-white">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="border-gray-800 bg-gray-900">
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="log">Log Entry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">
                      {simulationConfig.entityType === "product"
                        ? "Product ID"
                        : "Entity ID"}
                    </Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.entityId ?? simulationConfig.productId}
                      onChange={(event) =>
                        updateSelectedNodeConfig({
                          simulation: {
                            ...simulationConfig,
                            entityId: event.target.value,
                            productId: event.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Used to simulate {simulationConfig.entityType ?? "product"} context.
                  </p>
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
              const runtimeInputs = runtimeState.inputs[selectedNode.id] ?? {};
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
                    const runtimeValue = runtimeInputs[input];
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
                        {runtimeValue !== undefined && (
                          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-100">
                            <div className="mb-1 text-[9px] uppercase text-emerald-300">
                              Runtime
                            </div>
                            <pre className="whitespace-pre-wrap">
                              {formatRuntimeValue(runtimeValue)}
                            </pre>
                          </div>
                        )}
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

            {selectedNode.type === "ai_description" && (() => {
              const descriptionConfig = selectedNode.config?.description ?? {
                visionOutputEnabled: true,
                generationOutputEnabled: true,
              };
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include vision analysis</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.visionOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            visionOutputEnabled: !descriptionConfig.visionOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.visionOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-3 py-2 text-xs text-gray-300">
                    <span>Include generation output</span>
                    <Button
                      type="button"
                      className={`rounded border border-gray-700 px-3 py-1 text-xs ${
                        descriptionConfig.generationOutputEnabled
                          ? "text-emerald-200 hover:bg-emerald-500/10"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={() =>
                        updateSelectedNodeConfig({
                          description: {
                            ...descriptionConfig,
                            generationOutputEnabled:
                              !descriptionConfig.generationOutputEnabled,
                          },
                        })
                      }
                    >
                      {descriptionConfig.generationOutputEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
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
              selectedNode.type !== "mapper" &&
              selectedNode.type !== "mutator" &&
              selectedNode.type !== "validator" &&
              selectedNode.type !== "constant" &&
              selectedNode.type !== "math" &&
              selectedNode.type !== "template" &&
              selectedNode.type !== "bundle" &&
              selectedNode.type !== "gate" &&
              selectedNode.type !== "compare" &&
              selectedNode.type !== "router" &&
              selectedNode.type !== "delay" &&
              selectedNode.type !== "http" &&
              selectedNode.type !== "viewer" &&
              selectedNode.type !== "ai_description" &&
              selectedNode.type !== "description_updater" && (
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
              <DialogTitle className="text-lg">Simulation Modal</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">
                Set an Entity ID and simulate the connected trigger action.
              </DialogDescription>
            </DialogHeader>
            {(() => {
              const simulationNode = nodes.find((node) => node.id === simulationOpenNodeId);
              if (!simulationNode) return null;
              const simulationConfig = simulationNode.config?.simulation ?? { productId: "" };
              return (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400">Entity ID</Label>
                    <Input
                      className="mt-2 w-full rounded-md border border-gray-800 bg-gray-950/70 text-sm text-white"
                      value={simulationConfig.entityId ?? simulationConfig.productId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setNodes((prev) =>
                          prev.map((node) =>
                            node.id === simulationNode.id
                              ? {
                                  ...node,
                                  config: {
                                    ...node.config,
                                    simulation: {
                                      productId: value,
                                      entityId: value,
                                      entityType: simulationConfig.entityType ?? "product",
                                    },
                                  },
                                }
                              : node
                          )
                        );
                      }}
                    />
                    <p className="mt-2 text-[11px] text-gray-500">
                      Current entity type: {simulationConfig.entityType ?? "product"}
                    </p>
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
