import type {
  AiNode,
  ConnectionValidation,
  ContextConfig,
  DbQueryConfig,
  Edge,
  JsonPathEntry,
  NodeConfig,
  NodeDefinition,
  NodeType,
  PathConfig,
  PathMeta,
} from "@/shared/types/ai-paths";

type LegacyUpdaterConfig = {
  targetField?: string;
  mappings?: Array<{
    targetPath: string;
    sourcePort: string;
    sourcePath?: string;
  }>;
  entityType?: string;
  idField?: string;
  mode?: "replace" | "append";
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
const DEFAULT_CONTEXT_ROLE = "entity";
const TRIGGER_INPUT_PORTS = ["simulation"];
const TRIGGER_OUTPUT_PORTS = ["trigger", "context", "meta", "entityId", "entityType"];
const CONTEXT_INPUT_PORTS = ["context"];
const CONTEXT_OUTPUT_PORTS = ["context", "entityId", "entityType", "entityJson"];
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
const DATABASE_INPUT_PORTS = [
  "entityId",
  "entityType",
  "productId",
  "context",
  "query",
  "value",
  "bundle",
  "result",
  "content_en",
];
const DEFAULT_DB_QUERY: DbQueryConfig = {
  provider: "auto",
  collection: "products",
  mode: "preset",
  preset: "by_id",
  field: "_id",
  idType: "string",
  queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
  limit: 20,
  sort: "",
  sortPresetId: "custom",
  projection: "",
  projectionPresetId: "custom",
  single: false,
};

const DB_COLLECTION_OPTIONS = [
  { value: "products", label: "Products" },
  { value: "product_drafts", label: "Product Drafts" },
  { value: "product_categories", label: "Product Categories" },
  { value: "product_tags", label: "Product Tags" },
  { value: "catalogs", label: "Catalogs" },
  { value: "image_files", label: "Image Files" },
  { value: "product_listings", label: "Product Listings" },
  { value: "product_ai_jobs", label: "Product AI Jobs" },
  { value: "integrations", label: "Integrations" },
  { value: "integration_connections", label: "Integration Connections" },
  { value: "settings", label: "Settings" },
  { value: "users", label: "Users" },
  { value: "user_preferences", label: "User Preferences" },
  { value: "languages", label: "Languages" },
  { value: "system_logs", label: "System Logs" },
  { value: "notes", label: "Notes" },
  { value: "tags", label: "Note Tags" },
  { value: "categories", label: "Note Categories" },
  { value: "notebooks", label: "Note Notebooks" },
  { value: "noteFiles", label: "Note Files" },
  { value: "themes", label: "Note Themes" },
  { value: "chatbot_sessions", label: "Chatbot Sessions" },
  { value: "auth_security_attempts", label: "Auth Security Attempts" },
  { value: "auth_security_profiles", label: "Auth Security Profiles" },
  { value: "auth_login_challenges", label: "Auth Login Challenges" },
  { value: "custom", label: "Custom (allowlisted only)" },
];

const CONTEXT_PRESET_FIELDS: Record<
  string,
  { light: string[]; medium: string[]; full: string[]; suggested: string[] }
> = {
  product: {
    light: ["id", "sku", "name_en", "name_pl", "name_de", "price", "stock", "imageLinks"],
    medium: [
      "id",
      "sku",
      "name_en",
      "name_pl",
      "name_de",
      "price",
      "stock",
      "imageLinks",
      "description_en",
      "description_pl",
      "description_de",
      "catalogs",
      "parameters",
      "supplierName",
      "supplierLink",
      "createdAt",
      "updatedAt",
    ],
    full: [],
    suggested: [
      "id",
      "sku",
      "name_en",
      "name_pl",
      "name_de",
      "description_en",
      "price",
      "stock",
      "imageLinks",
      "catalogs",
      "parameters",
      "supplierName",
      "supplierLink",
      "createdAt",
      "updatedAt",
    ],
  },
  note: {
    light: ["id", "title", "content", "notebookId", "isPinned", "isFavorite", "updatedAt"],
    medium: [
      "id",
      "title",
      "content",
      "notebookId",
      "isPinned",
      "isFavorite",
      "isArchived",
      "editorType",
      "color",
      "tags",
      "categories",
      "createdAt",
      "updatedAt",
    ],
    full: [],
    suggested: [
      "id",
      "title",
      "content",
      "notebookId",
      "tags",
      "categories",
      "relationsFrom",
      "relationsTo",
      "isPinned",
      "isFavorite",
      "isArchived",
      "editorType",
      "color",
      "createdAt",
      "updatedAt",
    ],
  },
  default: {
    light: ["id", "name", "title", "status", "updatedAt"],
    medium: ["id", "name", "title", "status", "createdAt", "updatedAt", "meta"],
    full: [],
    suggested: ["id", "name", "title", "status", "createdAt", "updatedAt", "meta"],
  },
};

const PARSER_PRESETS = [
  {
    id: "product_core",
    label: "Product: Core",
    description: "id, title, images, content_en, sku, price, stock",
    mappings: {
      productId: "$.id",
      title: "$.title",
      images: "$.images",
      content_en: "$.content_en",
      sku: "$.sku",
      price: "$.price",
      stock: "$.stock",
    },
  },
  {
    id: "product_media",
    label: "Product: Media",
    description: "imageLinks, gallery, videos",
    mappings: {
      images: "$.imageLinks",
      gallery: "$.gallery",
      videos: "$.videos",
    },
  },
  {
    id: "note_core",
    label: "Note: Core",
    description: "id, title, content, tags, updatedAt",
    mappings: {
      noteId: "$.id",
      title: "$.title",
      content: "$.content",
      tags: "$.tags",
      updatedAt: "$.updatedAt",
    },
  },
  {
    id: "chat_message",
    label: "Chat: Message",
    description: "id, role, content, createdAt",
    mappings: {
      messageId: "$.id",
      role: "$.role",
      content: "$.content",
      createdAt: "$.createdAt",
    },
  },
  {
    id: "generic_audit",
    label: "Generic: Audit",
    description: "id, name, title, status, createdAt, updatedAt",
    mappings: {
      id: "$.id",
      name: "$.name",
      title: "$.title",
      status: "$.status",
      createdAt: "$.createdAt",
      updatedAt: "$.updatedAt",
    },
  },
];

const PARSER_PATH_OPTIONS = [
  { label: "Common: id", value: "$.id" },
  { label: "Common: title", value: "$.title" },
  { label: "Common: name", value: "$.name" },
  { label: "Common: status", value: "$.status" },
  { label: "Common: createdAt", value: "$.createdAt" },
  { label: "Common: updatedAt", value: "$.updatedAt" },
  { label: "Product: sku", value: "$.sku" },
  { label: "Product: price", value: "$.price" },
  { label: "Product: stock", value: "$.stock" },
  { label: "Product: content_en", value: "$.content_en" },
  { label: "Product: name_en", value: "$.name_en" },
  { label: "Product: name_pl", value: "$.name_pl" },
  { label: "Product: imageLinks", value: "$.imageLinks" },
  { label: "Product: images", value: "$.images" },
  { label: "Product: media", value: "$.media" },
  { label: "Product: gallery", value: "$.gallery" },
  { label: "Product: supplierName", value: "$.supplierName" },
  { label: "Product: catalogs", value: "$.catalogs" },
  { label: "Note: content", value: "$.content" },
  { label: "Note: tags", value: "$.tags" },
  { label: "Note: notebookId", value: "$.notebookId" },
  { label: "Chat: role", value: "$.role" },
  { label: "Chat: messages[0].content", value: "$.messages[0].content" },
];

const VIEWER_INPUT_PORTS = [
  "result",
  "analysis",
  "description",
  "description_en",
  "prompt",
  "images",
  "title",
  "productId",
  "content_en",
  "context",
  "meta",
  "trigger",
  "jobId",
  "status",
  "entityId",
  "entityType",
  "entityJson",
  "bundle",
  "valid",
  "errors",
  "value",
];
const PROMPT_INPUT_PORTS = ["bundle", "title", "images", "result"];
const PROMPT_OUTPUT_PORTS = ["prompt", "images"];
const POLL_INPUT_PORTS = ["jobId", "query", "value", "entityId", "productId", "bundle"];
const POLL_OUTPUT_PORTS = ["result", "status", "jobId", "bundle"];
const MODEL_OUTPUT_PORTS = ["result", "jobId"];
const NOTIFICATION_INPUT_PORTS = [
  "result",
  "prompt",
  "value",
  "bundle",
  "context",
  "meta",
  "trigger",
  "entityId",
];

const palette: NodeDefinition[] = [
  {
    type: "trigger",
    title: "Trigger: Product Modal",
    description: "Runs when Context Filter is clicked inside Product modal.",
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
    type: "notification",
    title: "Toast Notification",
    description: "Display an instant toast from incoming results.",
    inputs: NOTIFICATION_INPUT_PORTS,
    outputs: [],
  },
  {
    type: "ai_description",
    title: "AI Description Generator",
    description: "Runs the AI Description pipeline to produce description_en.",
    inputs: ["entityJson", "images", "title"],
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
    title: "Context Filter",
    description: "Filter incoming context payloads into scoped entity data.",
    inputs: CONTEXT_INPUT_PORTS,
    outputs: ["context", "entityId", "entityType", "entityJson"],
  },
  {
    type: "parser",
    title: "JSON Parser",
    description: "Extract fields into outputs or a single bundle.",
    inputs: ["entityJson", "context"],
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
    type: "poll",
    title: "Poll Job",
    description: "Poll an AI job or database query until it completes.",
    inputs: POLL_INPUT_PORTS,
    outputs: POLL_OUTPUT_PORTS,
  },
  {
    type: "http",
    title: "HTTP Fetch",
    description: "Call external APIs with templated inputs.",
    inputs: HTTP_INPUT_PORTS,
    outputs: ["value", "bundle"],
  },
  {
    type: "database",
    title: "Database",
    description: "Query, update, insert, or delete records.",
    inputs: DATABASE_INPUT_PORTS,
    outputs: ["result", "bundle", "content_en"],
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
    inputs: PROMPT_INPUT_PORTS,
    outputs: PROMPT_OUTPUT_PORTS,
  },
  {
    type: "model",
    title: "Model",
    description: "Runs a selected model.",
    inputs: ["prompt", "images"],
    outputs: MODEL_OUTPUT_PORTS,
  },
];

const PATH_INDEX_KEY = "ai_paths_index";
const AI_PATHS_LAST_ERROR_KEY = "ai_paths_last_error";
const PATH_CONFIG_PREFIX = "ai_paths_config_";
const CLUSTER_PRESETS_KEY = "ai_paths_cluster_presets";
const DB_QUERY_PRESETS_KEY = "ai_paths_db_query_presets";
const DB_NODE_PRESETS_KEY = "ai_paths_db_node_presets";
const STORAGE_VERSION = 1;
const DEFAULT_MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
const TRIGGER_EVENTS = [
  { id: "path_generate_description", label: "Path Generate Description" },
];

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

const normalizePortName = (port: string) =>
  port === "productJson" ? "entityJson" : port;

const ensureUniquePorts = (ports: string[], add: string[]) => {
  const set = new Set(ports.map(normalizePortName));
  add.forEach((port) => set.add(normalizePortName(port)));
  return Array.from(set);
};

const normalizeNodes = (items: AiNode[]) =>
  items.map((node) => {
    const nodeType = node.type as string;
    if (node.type === "context") {
      const contextConfig = node.config?.context;
      const cleanedOutputs = (node.outputs ?? []).filter(
        (port) => normalizePortName(port) !== "role"
      );
      return {
        ...node,
        title: node.title === "Context Grabber" ? "Context Filter" : node.title,
        inputs: ensureUniquePorts(node.inputs ?? [], CONTEXT_INPUT_PORTS),
        outputs: ensureUniquePorts(cleanedOutputs, CONTEXT_OUTPUT_PORTS),
        config: {
          ...node.config,
          context: {
            role: contextConfig?.role ?? DEFAULT_CONTEXT_ROLE,
            entityType: contextConfig?.entityType ?? "auto",
            entityIdSource: contextConfig?.entityIdSource ?? "simulation",
            entityId: contextConfig?.entityId ?? "",
            scopeMode: contextConfig?.scopeMode ?? "full",
            scopeTarget: contextConfig?.scopeTarget ?? "entity",
            includePaths: contextConfig?.includePaths ?? [],
            excludePaths: contextConfig?.excludePaths ?? [],
          },
        },
      };
    }
    if (node.type === "trigger") {
      return {
        ...node,
        inputs: TRIGGER_INPUT_PORTS,
        outputs: TRIGGER_OUTPUT_PORTS,
        config: {
          ...node.config,
          trigger: {
            event: node.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description",
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
      const parserConfig = node.config?.parser;
      const baseMappings =
        parserConfig?.mappings ??
        (node.outputs.length > 0 ? createParserMappings(node.outputs) : {});
      const mappingKeys = Object.keys(baseMappings)
        .map((key) => key.trim())
        .filter(Boolean);
      const outputsFromMappings = mappingKeys.length > 0 ? mappingKeys : node.outputs;
      const outputMode = parserConfig?.outputMode ?? "individual";
      const hasImagesOutput = outputsFromMappings.some(
        (key) => key.toLowerCase() === "images"
      );
      const outputs =
        outputMode === "bundle"
          ? ["bundle", ...(hasImagesOutput ? ["images"] : [])]
          : outputsFromMappings;
      return {
        ...node,
        outputs,
        config: {
          ...node.config,
          parser: {
            mappings: baseMappings,
            outputMode,
            presetId: parserConfig?.presetId ?? PARSER_PRESETS[0]?.id ?? "custom",
          },
        },
      };
    }
    if (node.type === "mutator") {
      return {
        ...node,
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
        config: {
          ...node.config,
          template: {
            template:
              node.config?.template?.template ??
              "Write a summary for {{context.entity.title}}",
          },
        },
      };
    }
    if (node.type === "bundle") {
      return {
        ...node,
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
    if (node.type === "poll") {
      const pollConfig = node.config?.poll;
      const pollQuery = {
        ...DEFAULT_DB_QUERY,
        ...(pollConfig?.dbQuery ?? {}),
      };
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, POLL_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, POLL_OUTPUT_PORTS),
        config: {
          ...node.config,
          poll: {
            intervalMs: pollConfig?.intervalMs ?? 2000,
            maxAttempts: pollConfig?.maxAttempts ?? 30,
            mode: pollConfig?.mode ?? "job",
            dbQuery: pollQuery,
            successPath: pollConfig?.successPath ?? "status",
            successOperator: pollConfig?.successOperator ?? "equals",
            successValue: pollConfig?.successValue ?? "completed",
            resultPath: pollConfig?.resultPath ?? "result",
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
            headers:
              node.config?.http?.headers ?? "{\n  \"Content-Type\": \"application/json\"\n}",
            bodyTemplate: node.config?.http?.bodyTemplate ?? "",
            responseMode: node.config?.http?.responseMode ?? "json",
            responsePath: node.config?.http?.responsePath ?? "",
          },
        },
      };
    }
    if (node.type === "database") {
      const defaultQuery = {
        provider: "auto" as const,
        collection: "products",
        mode: "preset" as const,
        preset: "by_id" as const,
        field: "_id",
        idType: "string" as const,
        queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
        limit: 20,
        sort: "",
        projection: "",
        single: false,
      };
      const queryConfig = {
        ...defaultQuery,
        ...(node.config?.database?.query ?? node.config?.dbQuery ?? {}),
      };
      const mappings =
        node.config?.database?.mappings && node.config.database.mappings.length > 0
          ? node.config.database.mappings
          : [
              {
                targetPath: "content_en",
                sourcePort: node.inputs.includes("result") ? "result" : "content_en",
              },
            ];
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, DATABASE_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["result", "bundle", "content_en"]),
        config: {
          ...node.config,
          database: {
            operation: node.config?.database?.operation ?? "query",
            entityType: node.config?.database?.entityType ?? "product",
            idField: node.config?.database?.idField ?? "entityId",
            mode: node.config?.database?.mode ?? "replace",
            mappings,
            query: queryConfig,
            writeSource: node.config?.database?.writeSource ?? "bundle",
            writeSourcePath: node.config?.database?.writeSourcePath ?? "",
            dryRun: node.config?.database?.dryRun ?? false,
            skipEmpty: node.config?.database?.skipEmpty ?? false,
            trimStrings: node.config?.database?.trimStrings ?? false,
          },
        },
      };
    }
    if (nodeType === "db_query") {
      const dbQuery = {
        provider: node.config?.dbQuery?.provider ?? "auto",
        collection: node.config?.dbQuery?.collection ?? "products",
        mode: node.config?.dbQuery?.mode ?? "preset",
        preset: node.config?.dbQuery?.preset ?? "by_id",
        field: node.config?.dbQuery?.field ?? "_id",
        idType: node.config?.dbQuery?.idType ?? "string",
        queryTemplate:
          node.config?.dbQuery?.queryTemplate ?? "{\n  \"_id\": \"{{value}}\"\n}",
        limit: node.config?.dbQuery?.limit ?? 20,
        sort: node.config?.dbQuery?.sort ?? "",
        projection: node.config?.dbQuery?.projection ?? "",
        single: node.config?.dbQuery?.single ?? false,
      };
      return {
        ...node,
        type: "database",
        inputs: ensureUniquePorts(node.inputs, DATABASE_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["result", "bundle", "content_en"]),
        config: {
          ...node.config,
          database: {
            operation: "query",
            entityType: node.config?.database?.entityType ?? "product",
            idField: node.config?.database?.idField ?? "entityId",
            mode: node.config?.database?.mode ?? "replace",
            mappings: node.config?.database?.mappings ?? [],
            query: dbQuery,
            writeSource: node.config?.database?.writeSource ?? "bundle",
            writeSourcePath: node.config?.database?.writeSourcePath ?? "",
            dryRun: node.config?.database?.dryRun ?? false,
            skipEmpty: node.config?.database?.skipEmpty ?? false,
            trimStrings: node.config?.database?.trimStrings ?? false,
          },
        },
      };
    }
    if (node.type === "ai_description") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, ["entityJson", "images", "title"]),
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
    if (node.type === "prompt") {
      return {
        ...node,
        inputs: ensureUniquePorts(node.inputs, PROMPT_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, PROMPT_OUTPUT_PORTS),
      };
    }
    if (node.type === "model") {
      return {
        ...node,
        outputs: ensureUniquePorts(node.outputs, MODEL_OUTPUT_PORTS),
        config: {
          ...node.config,
          model: {
            modelId: node.config?.model?.modelId ?? DEFAULT_MODELS[0] ?? "gpt-4o",
            temperature: node.config?.model?.temperature ?? 0.7,
            maxTokens: node.config?.model?.maxTokens ?? 800,
            vision:
              node.config?.model?.vision ??
              node.inputs.includes("images"),
            waitForResult: node.config?.model?.waitForResult,
          },
        },
      };
    }
    if (nodeType === "updater") {
      const updaterConfig =
        (node.config as { updater?: LegacyUpdaterConfig } | undefined)?.updater ?? {};
      const legacyTarget = updaterConfig.targetField ?? node.outputs[0] ?? "content_en";
      const legacyMappings =
        updaterConfig.mappings && updaterConfig.mappings.length > 0
          ? updaterConfig.mappings
          : [
              {
                targetPath: legacyTarget,
                sourcePort: node.inputs.includes("result") ? "result" : legacyTarget,
              },
            ];
      const defaultQuery = {
        provider: "auto" as const,
        collection: "products",
        mode: "preset" as const,
        preset: "by_id" as const,
        field: "_id",
        idType: "string" as const,
        queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
        limit: 20,
        sort: "",
        projection: "",
        single: false,
      };
      return {
        ...node,
        type: "database",
        inputs: ensureUniquePorts(node.inputs, DATABASE_INPUT_PORTS),
        outputs: ensureUniquePorts(node.outputs, ["result", "bundle", "content_en"]),
        config: {
          ...node.config,
          database: {
            operation: "update",
            entityType: updaterConfig.entityType ?? "product",
            idField: updaterConfig.idField ?? "productId",
            mode: updaterConfig.mode ?? "replace",
            mappings: legacyMappings,
            query: {
              ...defaultQuery,
              ...(node.config?.database?.query ?? {}),
            },
            writeSource: node.config?.database?.writeSource ?? "bundle",
            writeSourcePath: node.config?.database?.writeSourcePath ?? "",
            dryRun: node.config?.database?.dryRun ?? false,
          },
        },
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
            showImagesAsJson: node.config?.viewer?.showImagesAsJson ?? false,
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
    return { viewer: { outputs: createViewerOutputs(inputs), showImagesAsJson: false } };
  }
  if (type === "context") {
    return {
      context: {
        role: DEFAULT_CONTEXT_ROLE,
        entityType: "auto",
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
  if (type === "poll") {
    return {
      poll: {
        intervalMs: 2000,
        maxAttempts: 30,
        mode: "job",
        dbQuery: { ...DEFAULT_DB_QUERY },
        successPath: "status",
        successOperator: "equals",
        successValue: "completed",
        resultPath: "result",
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
    return {
      parser: {
        mappings: createParserMappings(outputs),
        outputMode: "individual",
        presetId: PARSER_PRESETS[0]?.id ?? "custom",
      },
    };
  }
  if (type === "prompt") {
    return { prompt: { template: "" } };
  }
  if (type === "model") {
    return {
      model: {
        modelId: DEFAULT_MODELS[0] ?? "gpt-4o",
        temperature: 0.7,
        maxTokens: 800,
        vision: inputs.includes("images"),
        waitForResult: false,
      },
    };
  }
  if (type === "database") {
    return {
      database: {
        operation: "query",
        entityType: "product",
        idField: "entityId",
        mode: "replace",
        mappings: [
          {
            targetPath: "content_en",
            sourcePort: inputs.includes("result") ? "result" : "content_en",
          },
        ],
        query: {
          provider: "auto",
          collection: "products",
          mode: "preset",
          preset: "by_id",
          field: "_id",
          idType: "string",
          queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
          limit: 20,
          sort: "",
          projection: "",
          single: false,
        },
        writeSource: "bundle",
        writeSourcePath: "",
        dryRun: false,
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

function safeStringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Complex Object]";
    }
  }
  if (typeof value === "symbol" || typeof value === "function") {
    return value.toString();
  }
  return String(value as string);
};

const formatRuntimeValue = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const json = JSON.stringify(value, null, 2);
    if (json.length > 400) return `${json.slice(0, 400)}…`;
    return json;
  } catch {
    return "[Complex Object]";
  }
};

const parsePathList = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const safeParseJson = (value: string) => {
  if (!value.trim()) return { value: null as unknown, error: "" };
  try {
    return { value: JSON.parse(value) as unknown, error: "" };
  } catch {
    return { value: null as unknown, error: "Invalid JSON" };
  }
};

const extractJsonPathEntries = (value: unknown, maxDepth = 2) => {
  const entries: JsonPathEntry[] = [];
  const walk = (node: unknown, prefix: string, depth: number) => {
    if (node === null || node === undefined || depth < 0) return;
    const isArray = Array.isArray(node);
    const isObject = !isArray && typeof node === "object";
    if (prefix) {
      entries.push({
        path: prefix,
        type: isArray ? "array" : isObject ? "object" : "value",
      });
    }
    if (isArray) {
      if ((node as unknown[]).length === 0) return;
      const arrayPrefix = prefix ? `${prefix}[0]` : "[0]";
      walk((node as unknown[])[0], arrayPrefix, depth - 1);
      return;
    }
    if (!isObject) return;
    Object.entries(node as Record<string, unknown>).forEach(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      walk(child, nextPrefix, depth - 1);
    });
  };
  walk(value, "", maxDepth);
  return entries;
};

const extractJsonPaths = (value: unknown, maxDepth = 2) => {
  return extractJsonPathEntries(value, maxDepth).map((entry) => entry.path);
};

const buildTopLevelMappings = (value: unknown) => {
  if (!value) return {} as Record<string, string>;
  let root: unknown = value;
  let prefix = "$.";
  if (Array.isArray(value)) {
    root = value[0];
    prefix = "$[0].";
  }
  if (!root || typeof root !== "object") return {} as Record<string, string>;
  return Object.keys(root as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, key) => {
      acc[key] = `${prefix}${key}`;
      return acc;
    },
    {}
  );
};

const buildFlattenedMappings = (
  value: unknown,
  depth: number,
  keyStyle: "path" | "leaf",
  includeContainers: boolean
) => {
  const entries = extractJsonPathEntries(value, depth).filter((entry) => {
    if (includeContainers) return true;
    return entry.type === "value" || entry.type === "array";
  });
  const mappings: Record<string, string> = {};
  const used = new Set<string>();
  entries.forEach((entry) => {
    const path = entry.path;
    const jsonPath = path.startsWith("[") ? `$${path}` : `$.${path}`;
    const tokens = parsePathTokens(path);
    if (tokens.length === 0) return;
    const pathKey = tokens
      .map((token) => (typeof token === "number" ? String(token) : token))
      .join("_");
    let leafKey = "";
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (typeof token === "string") {
        leafKey = token;
        break;
      }
    }
    const lastToken = tokens[tokens.length - 1];
    if (leafKey && typeof lastToken === "number") {
      leafKey = `${leafKey}_${lastToken}`;
    }
    let keyBase = keyStyle === "leaf" ? leafKey || pathKey : pathKey;
    keyBase = keyBase.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!keyBase) keyBase = "field";
    if (/^\d/.test(keyBase)) {
      keyBase = `field_${keyBase}`;
    }
    let uniqueKey = keyBase;
    let counter = 1;
    while (used.has(uniqueKey)) {
      counter += 1;
      uniqueKey = `${keyBase}_${counter}`;
    }
    used.add(uniqueKey);
    mappings[uniqueKey] = jsonPath;
  });
  return mappings;
};

const looksLikeImageUrl = (value: string) =>
  /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value);

const isImageLikeValue = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === "string") {
    return looksLikeImageUrl(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => isImageLikeValue(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      "url",
      "src",
      "thumbnail",
      "thumb",
      "imageUrl",
      "image",
      "filepath",
      "filePath",
      "path",
      "file",
      "previewUrl",
      "preview",
      "imageFile",
      "image_file",
      "media",
      "gallery",
    ];
    if (
      candidates.some((key) => {
        const val = record[key];
        return typeof val === "string" ? looksLikeImageUrl(val) : isImageLikeValue(val);
      })
    ) {
      return true;
    }
    return Object.entries(record).some(([key, val]) => {
      if (typeof val === "string") {
        if (!looksLikeImageUrl(val)) return false;
        return /(url|path|file|image|media|photo|thumb|preview)/i.test(key);
      }
      if (val && typeof val === "object" && /(image|file|media|photo)/i.test(key)) {
        return isImageLikeValue(val);
      }
      return false;
    });
  }
  return false;
};

const inferImageMappingPath = (value: unknown, depth: number) => {
  if (!value) return null;
  const keyword = /(image|img|photo|picture|media|gallery)/i;
  const searchIn = (root: unknown, prefix: string) => {
    if (!root) return null;
    const entries = extractJsonPathEntries(root, depth);
    const candidates = entries.filter((entry) => keyword.test(entry.path));
    const resolveFullPath = (match: string) => {
      if (!prefix) return match;
      const prefixPath = prefix.startsWith("$") ? prefix : `$.${prefix}`;
      return `${prefixPath}${match.slice(1)}`;
    };
    const checkEntry = (entry: JsonPathEntry) => {
      const jsonPath = entry.path.startsWith("[") ? `$${entry.path}` : `$.${entry.path}`;
      const resolved = getValueAtMappingPath(root, jsonPath);
      if (isImageLikeValue(resolved)) return resolveFullPath(jsonPath);
      return null;
    };
    for (const entry of candidates) {
      const match = checkEntry(entry);
      if (match) return match;
    }
    for (const entry of entries) {
      const match = checkEntry(entry);
      if (match) return match;
    }
    return null;
  };
  const direct = searchIn(value, "");
  if (direct) return direct;
  const wrapperPaths = [
    "context.entity",
    "context.product",
    "simulation.entity",
    "simulation.product",
    "entity",
    "product",
    "item",
    "data",
  ];
  for (const path of wrapperPaths) {
    const wrapped = getValueAtMappingPath(value, path.startsWith("$") ? path : `$.${path}`);
    const match = searchIn(wrapped, path);
    if (match) return match;
  }
  return null;
};

const getContextPresetSet = (entityType?: string) => {
  const key = entityType === "auto" ? "" : entityType ?? "";
  return CONTEXT_PRESET_FIELDS[key] ?? CONTEXT_PRESET_FIELDS.default;
};

const applyContextPreset = (
  current: ContextConfig,
  preset: "light" | "medium" | "full" | "suggested"
): ContextConfig => {
  const set = getContextPresetSet(current.entityType);
  const paths = set ? set[preset] ?? [] : [];
  if (paths.length === 0) return { ...current, scopeMode: "full" };
  return {
    ...current,
    scopeMode: "include",
    includePaths: paths,
    excludePaths: [],
  };
};

const toggleContextTarget = (current: ContextConfig, field: string) => {
  const isIncluded = (current.includePaths ?? []).includes(field);
  if (current.scopeMode === "include") {
    const includePaths = current.includePaths ?? [];
    return {
      ...current,
      includePaths: isIncluded
        ? includePaths.filter((p: string) => p !== field)
        : [...includePaths, field],
    };
  }
  const excludePaths = current.excludePaths ?? [];
  const isExcluded = excludePaths.includes(field);
  return {
    ...current,
    excludePaths: isExcluded
      ? excludePaths.filter((p) => p !== field)
      : [...excludePaths, field],
  };
};

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

const getValueAtMappingPath = (obj: unknown, path: string): unknown => {
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

const parseJsonSafe = (value: string): unknown => {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const coerceInput = <T,>(value: T | T[] | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value;

const coerceInputArray = <T,>(value: T | T[] | undefined): T[] =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

const appendInputValue = (current: unknown, value: unknown): unknown => {
  if (current === undefined) return value;
  if (Array.isArray(current)) return [...(current as unknown[]), value];
  return [current, value];
};

const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
  currentValue: unknown
) =>
  template
    .replace(/{{\s*([^}]+)\s*}}/g, (_match, token) => {
      const key = String(token).trim();
      if (key === "value" || key === "current") {
        return safeStringify(currentValue);
      }
      const resolved = getValueAtMappingPath(context, key);
      return safeStringify(resolved);
    })
    .replace(/\[\s*([^\]]+)\s*\]/g, (_match, token) => {
      const key = String(token).trim();
      if (key === "value" || key === "current") {
        return safeStringify(currentValue);
      }
      const resolved = getValueAtMappingPath(context, key);
      return safeStringify(resolved);
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
  let current: Record<string, unknown> | unknown[] = obj;
  let parent: Record<string, unknown> | unknown[] | null = null;
  let parentKey: string | number | null = null;
  tokens.forEach((token, index) => {
    const isLast = index === tokens.length - 1;
    if (isLast) {
      if (typeof token === "number") {
        if (!Array.isArray(current)) {
          const nextArray: unknown[] = [];
          if (parent && parentKey !== null) {
            if (Array.isArray(parent)) {
              (parent)[Number(parentKey)] = nextArray;
            } else {
              (parent)[String(parentKey)] = nextArray;
            }
          }
          current = nextArray;
        }
        (current)[token] = value;
      } else {
        (current as Record<string, unknown>)[token] = value;
      }
      return;
    }
    const nextToken = tokens[index + 1];
    if (typeof token === "number") {
      if (!Array.isArray(current)) {
        const nextArray: unknown[] = [];
        if (parent && parentKey !== null) {
          if (Array.isArray(parent)) {
            (parent)[Number(parentKey)] = nextArray;
          } else {
            (parent)[String(parentKey)] = nextArray;
          }
        }
        current = nextArray;
      }
      const curArr = current;
      if (curArr[token] == null || typeof curArr[token] !== "object") {
        curArr[token] = typeof nextToken === "number" ? [] : {};
      }
      parent = current;
      parentKey = token;
      current = curArr[token] as Record<string, unknown> | unknown[];
      return;
    }
    const curObj = current as Record<string, unknown>;
    if (curObj[token] == null || typeof curObj[token] !== "object") {
      curObj[token] = typeof nextToken === "number" ? [] : {};
    }
    parent = current;
    parentKey = token;
    current = curObj[token] as Record<string, unknown> | unknown[];
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
  paths.forEach((path) => deletePath(clone, path));
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

const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return edges.flatMap((edge) => {
    if (!edge.from || !edge.to) return [];
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return [];
    const fromPort = edge.fromPort ? normalizePortName(edge.fromPort) : undefined;
    const toPort = edge.toPort ? normalizePortName(edge.toPort) : undefined;
    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(toPort) && to.inputs.includes(toPort)) {
        return [
          {
            ...edge,
            fromPort: toPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(fromPort) && to.inputs.includes(fromPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort: fromPort,
          },
        ];
      }
      return [];
    }
    const matches = from.outputs.filter((output) => to.inputs.includes(output));
    if (matches.length !== 1) return [];
    const port = matches[0];
    if (!port) return [];
    return [
      {
        ...edge,
        fromPort: port,
        toPort: port,
      },
    ];
  });
};

// Strict port compatibility: output port must match input port
const PORT_COMPATIBILITY: Record<string, string[]> = {
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
  query: ["query"],
  jobId: ["jobId"],
  status: ["status"],
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
    "notification",
    "ai_description",
    "mapper",
    "mutator",
    "validator",
    "bundle",
    "template",
    "router",
    "delay",
    "poll",
    "http",
    "database",
  ],
  trigger: [
    "context",
    "parser",
    "viewer",
    "notification",
    "mapper",
    "mutator",
    "validator",
    "bundle",
    "template",
    "router",
    "delay",
    "poll",
    "database",
  ],
  simulation: ["trigger", "notification"],
  parser: [
    "prompt",
    "database",
    "viewer",
    "notification",
    "ai_description",
    "description_updater",
    "mapper",
    "mutator",
    "validator",
    "bundle",
    "template",
    "router",
    "delay",
    "poll",
    "database",
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
    "poll",
    "database",
    "trigger",
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
    "poll",
    "database",
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
    "poll",
    "database",
  ],
  constant: ["math", "template", "viewer", "bundle", "compare", "router", "delay", "poll", "http", "database"],
  math: ["template", "viewer", "bundle", "compare", "router", "delay", "poll", "http", "database"],
  compare: ["gate", "router", "viewer", "bundle", "template", "poll", "database"],
  gate: ["validator", "viewer", "prompt", "ai_description", "description_updater", "bundle", "template", "router", "delay", "poll"],
  router: ["viewer", "bundle", "template", "prompt", "model", "delay", "poll", "database"],
  delay: ["viewer", "bundle", "template", "prompt", "model", "validator", "gate", "poll", "database"],
  poll: ["viewer", "notification", "bundle", "template", "prompt", "model", "delay", "database"],
  http: ["viewer", "bundle", "template", "prompt", "math", "compare", "poll", "database"],
  database: ["viewer", "bundle", "template", "prompt", "mapper", "validator", "poll", "notification"],
  db_schema: ["prompt", "template", "model", "bundle", "viewer", "database"],
  bundle: ["viewer", "template", "prompt", "poll", "database"],
  template: ["model", "viewer", "bundle", "prompt", "poll", "database"],
  prompt: ["model", "viewer", "bundle", "template", "poll", "notification"],
  model: ["prompt", "database", "viewer", "description_updater", "bundle", "poll", "notification"],
  viewer: [],
  ai_description: ["viewer", "description_updater", "bundle", "delay", "poll"],
  description_updater: ["viewer", "bundle", "delay", "poll"],
  notification: ["viewer", "bundle", "delay", "poll"],
};

const validateConnection = (
  fromNode: AiNode,
  toNode: AiNode,
  fromPort: string,
  toPort: string
): ConnectionValidation => {
  // Basic compatibility checks
  if (!fromNode.outputs.includes(fromPort)) {
    return { valid: false, message: "Invalid output port." };
  }
  if (!toNode.inputs.includes(toPort)) {
    return { valid: false, message: "Invalid input port." };
  }

  // Check port compatibility
  const allowedPorts = PORT_COMPATIBILITY[fromPort];
  if (!allowedPorts || !allowedPorts.includes(toPort)) {
    return {
      valid: false,
      message: `Port ${fromPort} cannot connect to ${toPort}.`,
    };
  }

  // Check node type compatibility
  const allowedTypes = NODE_TYPE_COMPATIBILITY[fromNode.type] || [];
  if (!allowedTypes.includes(toNode.type)) {
    return {
      valid: false,
      message: `${fromNode.type} cannot connect to ${toNode.type}.`,
    };
  }

  // Rule 9: Trigger simulation input must come from Simulation simulation
  if (toNode.type === "trigger" && toPort === "simulation") {
    if (fromNode.type !== "simulation" || fromPort !== "simulation") {
      return {
        valid: false,
        message: "Trigger 'simulation' input must connect from Simulation 'simulation'.",
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
  if (toNode.type === "ai_description" && toPort === "entityJson") {
    if (fromNode.type !== "context" || fromPort !== "entityJson") {
      return {
        valid: false,
        message: "AI Description 'entityJson' must connect from Context 'entityJson'.",
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

  // Rule 15: Gate valid input must come from Validator.valid
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
  _viewport: DOMRect | null
) => {
  // Use fixed bounds based on canvas size for predictable panning
  // min: allows panning to see the right/bottom of canvas (negative values)
  // max: allows panning to see the left/top of canvas (positive values)
  const minX = -CANVAS_WIDTH * scale + 200;
  const minY = -CANVAS_HEIGHT * scale + 200;
  const maxX = 300;
  const maxY = 300;

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};

const initialNodes: AiNode[] = [
  {
    id: "node-context",
    type: "context",
    title: "Context Filter",
    description: "Filter Product modal context into scoped fields.",
    inputs: CONTEXT_INPUT_PORTS,
    outputs: CONTEXT_OUTPUT_PORTS,
    position: { x: 520, y: 590 },
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
    inputs: ["entityJson"],
    outputs: ["images", "title", "productId", "content_en"],
    position: { x: 820, y: 590 },
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
    outputs: PROMPT_OUTPUT_PORTS,
    position: { x: 1120, y: 510 },
  },
  {
    id: "node-vision-model",
    type: "model",
    title: "Gemma Vision",
    description: "Image analysis.",
    inputs: ["prompt", "images"],
    outputs: MODEL_OUTPUT_PORTS,
    position: { x: 1400, y: 510 },
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
    outputs: PROMPT_OUTPUT_PORTS,
    position: { x: 1120, y: 690 },
  },
  {
    id: "node-desc-model",
    type: "model",
    title: "GPT-4o",
    description: "Generate description.",
    inputs: ["prompt"],
    outputs: MODEL_OUTPUT_PORTS,
    position: { x: 1400, y: 690 },
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
    type: "database",
    title: "Database Update",
    description: "Update product fields from AI results.",
    inputs: DATABASE_INPUT_PORTS,
    outputs: ["result", "bundle", "content_en"],
    position: { x: 1680, y: 600 },
    config: {
      database: {
        operation: "update",
        entityType: "product",
        idField: "productId",
        mode: "replace",
        mappings: [
          {
            targetPath: "content_en",
            sourcePort: "result",
          },
        ],
        query: {
          provider: "auto",
          collection: "products",
          mode: "preset",
          preset: "by_id",
          field: "_id",
          idType: "string",
          queryTemplate: "{\n  \"_id\": \"{{value}}\"\n}",
          limit: 20,
          sort: "",
          projection: "",
          single: false,
        },
        writeSource: "bundle",
      },
    },
  },
];

const initialEdges: Edge[] = [
  { id: "edge-1", from: "node-context", to: "node-parser", fromPort: "entityJson", toPort: "entityJson" },
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
    trigger: triggers[0] ?? "Product Modal - Context Filter",
    nodes: initialNodes,
    edges: initialEdges,
    updatedAt: now,
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
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
      title: "Context Filter",
      description: "Filter product context.",
      inputs: CONTEXT_INPUT_PORTS,
      outputs: CONTEXT_OUTPUT_PORTS,
      position: { x: 470, y: 600 },
      config: {
        context: {
          role: DEFAULT_CONTEXT_ROLE,
          scopeMode: "full",
          scopeTarget: "entity",
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
      inputs: ["entityJson"],
      outputs: ["images", "title", "productId", "content_en"],
      position: { x: 770, y: 600 },
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
      inputs: ["entityJson", "images", "title"],
      outputs: ["description_en"],
      position: { x: 1090, y: 600 },
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
      position: { x: 1410, y: 600 },
    },
    {
      id: "node-viewer",
      type: "viewer",
      title: "Result Viewer",
      description: "Preview description + runtime outputs.",
      inputs: ["description", "description_en", "context", "meta", "trigger"],
      outputs: [],
      position: { x: 1730, y: 600 },
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
      fromPort: "entityJson",
      toPort: "entityJson",
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
      fromPort: "entityJson",
      toPort: "entityJson",
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
    trigger: triggers[0] ?? "Product Modal - Context Filter",
    nodes,
    edges,
    updatedAt: now,
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
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
  poll: { border: "border-cyan-300/40", glow: "shadow-cyan-300/20" },
  http: { border: "border-sky-400/40", glow: "shadow-sky-400/20" },
  database: { border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
  db_schema: { border: "border-purple-500/40", glow: "shadow-purple-500/20" },
  prompt: { border: "border-amber-500/40", glow: "shadow-amber-500/20" },
  model: { border: "border-fuchsia-500/40", glow: "shadow-fuchsia-500/20" },
  viewer: { border: "border-violet-500/40", glow: "shadow-violet-500/20" },
  notification: { border: "border-amber-400/40", glow: "shadow-amber-500/20" },
  ai_description: { border: "border-indigo-500/40", glow: "shadow-indigo-500/20" },
  description_updater: { border: "border-rose-400/40", glow: "shadow-rose-400/20" },
};

const triggers = [
  "Product Modal - Context Filter",
  "Bulk Action - Generate Descriptions",
  "On Product Save",
];

export {
  AI_PATHS_LAST_ERROR_KEY,
  BUNDLE_INPUT_PORTS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLUSTER_PRESETS_KEY,
  DB_QUERY_PRESETS_KEY,
  DB_NODE_PRESETS_KEY,
  CONTEXT_INPUT_PORTS,
  CONTEXT_OUTPUT_PORTS,
  DB_COLLECTION_OPTIONS,
  DEFAULT_CONTEXT_ROLE,
  DEFAULT_MODELS,
  DELAY_INPUT_PORTS,
  DELAY_OUTPUT_PORTS,
  DESCRIPTION_OUTPUT_PORTS,
  HTTP_INPUT_PORTS,
  MAX_SCALE,
  MIN_SCALE,
  NODE_MIN_HEIGHT,
  NODE_TYPE_COMPATIBILITY,
  NODE_WIDTH,
  NOTIFICATION_INPUT_PORTS,
  PARSER_PATH_OPTIONS,
  PARSER_PRESETS,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  PORT_COMPATIBILITY,
  PORT_GAP,
  PORT_SIZE,
  ROUTER_INPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
  SIMULATION_OUTPUT_PORTS,
  STORAGE_VERSION,
  TEMPLATE_INPUT_PORTS,
  TRIGGER_EVENTS,
  TRIGGER_INPUT_PORTS,
  TRIGGER_OUTPUT_PORTS,
  VIEWER_INPUT_PORTS,
  VIEW_MARGIN,
  appendInputValue,
  applyContextPreset,
  buildFlattenedMappings,
  buildTopLevelMappings,
  clampScale,
  clampTranslate,
  cloneValue,
  coerceInput,
  coerceInputArray,
  createAiDescriptionPath,
  createDefaultPathConfig,
  createParserMappings,
  createPathId,
  createPathMeta,
  createPresetId,
  createViewerOutputs,
  deletePath,
  ensureUniquePorts,
  extractJsonPathEntries,
  extractJsonPaths,
  formatRuntimeValue,
  getContextPresetSet,
  getDefaultConfigForType,
  getPortOffsetY,
  getValueAtMappingPath,
  getValueAtPath,
  inferImageMappingPath,
  initialEdges,
  initialNodes,
  isImageLikeValue,
  isValidConnection,
  looksLikeImageUrl,
  normalizeMappingPath,
  normalizeNodes,
  normalizePortName,
  omitByPaths,
  palette,
  parseJsonSafe,
  parsePathList,
  parsePathTokens,
  pickByPaths,
  renderTemplate,
  safeParseJson,
  safeStringify,
  sanitizeEdges,
  setValueAtMappingPath,
  setValueAtPath,
  toNumber,
  toggleContextTarget,
  triggers,
  typeStyles,
  validateConnection,
};
