import type {
  AiNode,
  ContextConfig,
  DbQueryConfig,
  Edge,
  RuntimePortValues,
  RuntimeState,
} from "./types";
import {
  DEFAULT_CONTEXT_ROLE,
  DELAY_OUTPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
  appendInputValue,
  cloneValue,
  coerceInput,
  coerceInputArray,
  formatRuntimeValue,
  getValueAtMappingPath,
  normalizeMappingPath,
  omitByPaths,
  parseJsonSafe,
  pickByPaths,
  renderTemplate,
  setValueAtMappingPath,
} from "./helpers";

type ToastFn = (message: string, options?: { variant?: "success" | "error" }) => void;

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
  projection: "",
  single: false,
};

export type EvaluateGraphOptions = {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  triggerNodeId?: string;
  triggerEvent?: string;
  fetchEntityByType: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ) => void;
  toast: ToastFn;
};

const looksLikeImageUrl = (value: string) =>
  /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value);

const extractImageUrls = (value: unknown, seen = new Set<object>()): string[] => {
  if (!value) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractImageUrls(parsed, seen);
      } catch {
        return looksLikeImageUrl(value) ? [value] : [];
      }
    }
    return looksLikeImageUrl(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.flatMap((item) => extractImageUrls(item, seen)))
    );
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return [];
    seen.add(value as object);
    const record = value as Record<string, unknown>;
    const candidates = [
      "url",
      "src",
      "thumbnail",
      "thumb",
      "imageUrl",
      "image",
      "imageFile",
      "filepath",
      "filePath",
      "path",
      "file",
      "previewUrl",
      "preview",
    ];
    const urls = candidates.flatMap((key) => extractImageUrls(record[key], seen));
    if (urls.length) return Array.from(new Set(urls));
    const deepUrls = Object.values(record).flatMap((val) =>
      extractImageUrls(val, seen)
    );
    return Array.from(new Set(deepUrls));
  }
  return [];
};

export async function evaluateGraph({
  nodes,
  edges,
  activePathId,
  triggerNodeId,
  triggerEvent,
  fetchEntityByType,
  reportAiPathsError,
  toast,
}: EvaluateGraphOptions): Promise<RuntimeState> {
  const outputs: Record<string, RuntimePortValues> = {};
  let inputs: Record<string, RuntimePortValues> = {};
  const now = new Date().toISOString();
  const entityCache = new Map<string, Record<string, unknown> | null>();
  const activeNodeIds = new Set<string>();

  if (triggerNodeId) {
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const queue = [triggerNodeId];
    activeNodeIds.add(triggerNodeId);
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (activeNodeIds.has(neighbor)) return;
        activeNodeIds.add(neighbor);
        queue.push(neighbor);
      });
    }
  }
  const isActiveNode = (node: AiNode) =>
    !triggerNodeId || activeNodeIds.has(node.id);

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
      entityType: "auto",
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

  const coercePayloadObject = (value: unknown) => {
    if (!value) return null;
    if (typeof value === "string") {
      const parsed = parseJsonSafe(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };

  const resolveJobProductId = (nodeInputs: RuntimePortValues) => {
    const direct =
      coerceInput(nodeInputs.productId) ?? coerceInput(nodeInputs.entityId);
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number") return String(direct);
    const contextValue = coerceInput(nodeInputs.context) as
      | { entityId?: string; productId?: string }
      | undefined;
    if (contextValue?.productId?.trim()) return contextValue.productId.trim();
    if (contextValue?.entityId?.trim()) return contextValue.entityId.trim();
    const entityJson = coerceInput(nodeInputs.entityJson) as
      | { id?: string | number }
      | undefined;
    if (typeof entityJson?.id === "string" && entityJson.id.trim()) {
      return entityJson.id.trim();
    }
    if (typeof entityJson?.id === "number") return String(entityJson.id);
    if (simulationEntityType === "product" && simulationEntityId) {
      return simulationEntityId;
    }
    return activePathId ?? "ai_paths_graph";
  };

  const resolveEntityIdFromInputs = (
    nodeInputs: RuntimePortValues,
    idField?: string
  ) => {
    const direct =
      (idField ? coerceInput(nodeInputs[idField]) : undefined) ??
      coerceInput(nodeInputs.entityId) ??
      coerceInput(nodeInputs.productId);
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number") return String(direct);
    const contextValue = coerceInput(nodeInputs.context) as
      | { entityId?: string; productId?: string }
      | undefined;
    if (contextValue?.productId?.trim()) return contextValue.productId.trim();
    if (contextValue?.entityId?.trim()) return contextValue.entityId.trim();
    const bundleValue = coerceInput(nodeInputs.bundle) as
      | { entityId?: string; productId?: string; id?: string | number }
      | undefined;
    if (typeof bundleValue?.productId === "string" && bundleValue.productId.trim()) {
      return bundleValue.productId.trim();
    }
    if (typeof bundleValue?.entityId === "string" && bundleValue.entityId.trim()) {
      return bundleValue.entityId.trim();
    }
    if (typeof bundleValue?.id === "string" && bundleValue.id.trim()) {
      return bundleValue.id.trim();
    }
    if (typeof bundleValue?.id === "number") return String(bundleValue.id);
    const entityJson = coerceInput(nodeInputs.entityJson) as
      | { id?: string | number }
      | undefined;
    if (typeof entityJson?.id === "string" && entityJson.id.trim()) {
      return entityJson.id.trim();
    }
    if (typeof entityJson?.id === "number") return String(entityJson.id);
    if (simulationEntityType === "product" && simulationEntityId) {
      return simulationEntityId;
    }
    return "";
  };

  const pollGraphJob = async (
    jobId: string,
    options?: { intervalMs?: number; maxAttempts?: number }
  ) => {
    const maxAttempts = options?.maxAttempts ?? 60;
    const intervalMs = options?.intervalMs ?? 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const statusRes = await fetch(`/api/products/ai-jobs/${jobId}`);
      if (!statusRes.ok) {
        throw new Error("Failed to fetch job status.");
      }
      const payload = (await statusRes.json()) as {
        job?: { status?: string; result?: unknown; errorMessage?: string | null };
      };
      const job = payload.job;
      if (!job) continue;
      if (job.status === "completed") {
        const result = job.result as
          | { result?: string }
          | string
          | null
          | undefined;
        if (result && typeof result === "object" && "result" in result) {
          return (result as { result?: string }).result ?? "";
        }
        return typeof result === "string" ? result : JSON.stringify(result ?? "");
      }
      if (job.status === "failed") {
        throw new Error(job.errorMessage || "AI job failed.");
      }
      if (job.status === "canceled") {
        throw new Error("AI job was canceled.");
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, intervalMs)));
      }
    }
    throw new Error("AI job timed out.");
  };

  const buildDbQueryPayload = (
    nodeInputs: RuntimePortValues,
    queryConfig: DbQueryConfig
  ) => {
    const inputQuery = coerceInput(nodeInputs.query);
    const inputValue = coerceInput(nodeInputs.value) ?? coerceInput(nodeInputs.jobId);
    const entityIdInput = coerceInput(nodeInputs.entityId);
    const productIdInput = coerceInput(nodeInputs.productId);
    let query: Record<string, unknown> = {};
    if (queryConfig.mode === "preset") {
      const presetValue =
        queryConfig.preset === "by_productId"
          ? productIdInput ?? inputValue ?? entityIdInput
          : queryConfig.preset === "by_entityId"
            ? entityIdInput ?? inputValue ?? productIdInput
            : inputValue ?? entityIdInput ?? productIdInput;
      if (presetValue !== undefined) {
        const field =
          queryConfig.preset === "by_productId"
            ? "productId"
            : queryConfig.preset === "by_entityId"
              ? "entityId"
              : queryConfig.preset === "by_field"
                ? queryConfig.field || "id"
                : "_id";
        query = { [field]: presetValue };
      }
    } else if (inputQuery && typeof inputQuery === "object") {
      query = inputQuery as Record<string, unknown>;
    } else {
      const rendered = renderTemplate(
        queryConfig.queryTemplate ?? "{}",
        nodeInputs as Record<string, unknown>,
        inputValue ?? ""
      );
      const parsed = parseJsonSafe(rendered);
      if (parsed && typeof parsed === "object") {
        query = parsed as Record<string, unknown>;
      }
    }
    const projection = parseJsonSafe(queryConfig.projection ?? "") as
      | Record<string, unknown>
      | undefined;
    const sort = parseJsonSafe(queryConfig.sort ?? "") as
      | Record<string, unknown>
      | undefined;
    return {
      query,
      projection,
      sort,
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      limit: queryConfig.limit,
      single: queryConfig.single,
      idType: queryConfig.idType,
    };
  };

  const pollDatabaseQuery = async (
    nodeInputs: RuntimePortValues,
    config: {
      intervalMs: number;
      maxAttempts: number;
      dbQuery: DbQueryConfig;
      successPath: string;
      successOperator: "truthy" | "equals" | "contains" | "notEquals";
      successValue: string;
      resultPath: string;
    }
  ) => {
    const evaluateMatch = (value: unknown) => {
      if (config.successOperator === "truthy") return Boolean(value);
      const compareTarget = config.successValue ?? "";
      if (config.successOperator === "equals") {
        return String(value ?? "") === String(compareTarget);
      }
      if (config.successOperator === "notEquals") {
        return String(value ?? "") !== String(compareTarget);
      }
      if (config.successOperator === "contains") {
        if (Array.isArray(value)) {
          return value.map((entry) => String(entry)).includes(String(compareTarget));
        }
        return String(value ?? "").includes(String(compareTarget));
      }
      return Boolean(value);
    };

    let lastResult: unknown = null;
    let lastBundle: Record<string, unknown> = {};
    for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
      const payload = buildDbQueryPayload(nodeInputs, config.dbQuery);
      const res = await fetch("/api/ai-paths/db-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Database poll query failed.");
      }
      const data = (await res.json()) as {
        items?: unknown[];
        item?: unknown;
        count?: number;
      };
      const result = config.dbQuery.single ? data.item ?? null : data.items ?? [];
      const bundle = {
        count: data.count ?? (Array.isArray(result) ? result.length : result ? 1 : 0),
        query: payload.query,
        collection: payload.collection,
        attempt: attempt + 1,
      };
      lastResult = result;
      lastBundle = bundle;
      const successPath = config.successPath?.trim() ?? "";
      const matchedItem = Array.isArray(result)
        ? result.find((item) =>
            evaluateMatch(getValueAtMappingPath(item, successPath))
          )
        : null;
      const candidate = successPath
        ? Array.isArray(result)
          ? matchedItem
          : getValueAtMappingPath(result, successPath)
        : result;
      const isMatch = Array.isArray(result)
        ? Boolean(matchedItem) ||
          result.some((item) =>
            evaluateMatch(
              successPath ? getValueAtMappingPath(item, successPath) : item
            )
          )
        : evaluateMatch(candidate);
      if (isMatch) {
        let resolvedResult = config.resultPath?.trim()
          ? getValueAtMappingPath(result, config.resultPath)
          : result;
        if (resolvedResult === undefined && Array.isArray(result)) {
          const fallbackSource = matchedItem ?? result[0];
          resolvedResult = config.resultPath?.trim()
            ? getValueAtMappingPath(fallbackSource, config.resultPath)
            : fallbackSource;
        }
        return {
          result: resolvedResult ?? result,
          status: "completed",
          bundle: { ...bundle, status: "completed" },
        };
      }
      if (attempt < config.maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, config.intervalMs)));
      }
    }
    const fallbackResult = config.resultPath?.trim()
      ? getValueAtMappingPath(lastResult, config.resultPath)
      : lastResult;
    return {
      result: fallbackResult ?? lastResult,
      status: "timeout",
      bundle: { ...lastBundle, status: "timeout" },
    };
  };

  const buildFormData = (payload: Record<string, unknown>) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
        return;
      }
      formData.append(key, String(value));
    });
    return formData;
  };

  const resolveContextPayload = async (config?: ContextConfig) => {
    const contextConfig = config ?? defaultContextConfig;
    const role = contextConfig.role ?? DEFAULT_CONTEXT_ROLE;
    const rawEntityType = contextConfig.entityType?.trim() || "auto";
    const entityType =
      rawEntityType === "auto"
        ? simulationEntityType ?? "entity"
        : rawEntityType || simulationEntityType || "entity";
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
    if (!isActiveNode(node)) {
      continue;
    }
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
    for (const node of nodes) {
      if (!isActiveNode(node)) {
        continue;
      }
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
            undefined;
          if (!source) {
            nextOutputs = {};
            break;
          }
          const parserConfig = node.config?.parser;
          const mappings =
            parserConfig?.mappings ?? {};
          const outputMode = parserConfig?.outputMode ?? "individual";
          const parsed: RuntimePortValues = {};
          Object.keys(mappings).forEach((output) => {
            const key = output.trim();
            if (!key) return;
            const mapping = mappings[output]?.trim() ?? "";
            const value = mapping
              ? getValueAtMappingPath(source, mapping)
              : (source as Record<string, unknown>)[key];
            if (value !== undefined) {
              parsed[key] = value;
            }
          });
          if (outputMode === "bundle") {
            const extraOutputs = node.outputs.reduce<Record<string, unknown>>((acc, output) => {
              if (output !== "bundle" && parsed[output] !== undefined) {
                acc[output] = parsed[output];
              }
              return acc;
            }, {});
            nextOutputs = { bundle: parsed, ...extraOutputs };
          } else {
            nextOutputs = parsed;
          }
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
            mappings: {},
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
        case "constant": {
          const constantConfig = node.config?.constant ?? {
            valueType: "string",
            value: "",
          };
          let value: unknown = constantConfig.value ?? "";
          if (constantConfig.valueType === "number") {
            value = Number(constantConfig.value ?? 0);
          } else if (constantConfig.valueType === "boolean") {
            value = String(constantConfig.value ?? "false") === "true";
          } else if (constantConfig.valueType === "json") {
            value = parseJsonSafe(String(constantConfig.value ?? "")) ?? null;
          }
          nextOutputs = { value };
          break;
        }
        case "math": {
          const inputValue = coerceInput(nodeInputs.value);
          const numeric = Number(inputValue);
          const mathConfig = node.config?.math ?? { operation: "add", operand: 0 };
          const operand = mathConfig.operand ?? 0;
          if (!Number.isFinite(numeric)) {
            nextOutputs = { value: inputValue };
            break;
          }
          let result = numeric;
          switch (mathConfig.operation) {
            case "add":
              result = numeric + operand;
              break;
            case "subtract":
              result = numeric - operand;
              break;
            case "multiply":
              result = numeric * operand;
              break;
            case "divide":
              result = operand === 0 ? numeric : numeric / operand;
              break;
            case "round":
              result = Math.round(numeric);
              break;
            case "ceil":
              result = Math.ceil(numeric);
              break;
            case "floor":
              result = Math.floor(numeric);
              break;
            default:
              result = numeric;
          }
          nextOutputs = { value: result };
          break;
        }
        case "compare": {
          const compareConfig = node.config?.compare ?? {
            operator: "eq",
            compareTo: "",
            caseSensitive: false,
          };
          const currentValue = coerceInput(nodeInputs.value);
          const compareTo = compareConfig.compareTo ?? "";
          const base = currentValue === undefined || currentValue === null ? "" : String(currentValue);
          const target = String(compareTo ?? "");
          const value = compareConfig.caseSensitive ? base : base.toLowerCase();
          const targetValue = compareConfig.caseSensitive ? target : target.toLowerCase();
          let valid = false;
          switch (compareConfig.operator) {
            case "eq":
              valid = value === targetValue;
              break;
            case "neq":
              valid = value !== targetValue;
              break;
            case "gt":
              valid = Number(value) > Number(targetValue);
              break;
            case "gte":
              valid = Number(value) >= Number(targetValue);
              break;
            case "lt":
              valid = Number(value) < Number(targetValue);
              break;
            case "lte":
              valid = Number(value) <= Number(targetValue);
              break;
            case "contains":
              valid = value.includes(targetValue);
              break;
            case "startsWith":
              valid = value.startsWith(targetValue);
              break;
            case "endsWith":
              valid = value.endsWith(targetValue);
              break;
            case "isEmpty":
              valid = value.trim() === "";
              break;
            case "notEmpty":
              valid = value.trim() !== "";
              break;
            default:
              valid = false;
          }
          nextOutputs = {
            value: currentValue,
            valid,
            errors: valid ? [] : [compareConfig.message ?? "Comparison failed"],
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
        case "poll": {
          const pollConfig = node.config?.poll ?? {
            intervalMs: 2000,
            maxAttempts: 30,
            mode: "job",
          };
          const pollMode = pollConfig.mode ?? "job";
          const rawJobId = coerceInput(nodeInputs.jobId);
          const jobId =
            typeof rawJobId === "string" || typeof rawJobId === "number"
              ? String(rawJobId).trim()
              : "";
          if (pollMode === "database") {
            const queryConfig = {
              ...DEFAULT_DB_QUERY,
              ...(pollConfig.dbQuery ?? {}),
            };
            try {
              const response = await pollDatabaseQuery(nodeInputs, {
                intervalMs: pollConfig.intervalMs ?? 2000,
                maxAttempts: pollConfig.maxAttempts ?? 30,
                dbQuery: queryConfig,
                successPath: pollConfig.successPath ?? "status",
                successOperator: pollConfig.successOperator ?? "equals",
                successValue: pollConfig.successValue ?? "completed",
                resultPath: pollConfig.resultPath ?? "result",
              });
              nextOutputs = {
                result: response.result,
                status: response.status,
                jobId,
                bundle: {
                  jobId,
                  status: response.status,
                  ...(response.bundle ?? {}),
                },
              };
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "pollDatabase", nodeId: node.id },
                "Database polling failed:"
              );
              nextOutputs = {
                result: null,
                status: "failed",
                jobId,
                bundle: {
                  jobId,
                  status: "failed",
                  error: error instanceof Error ? error.message : "Polling failed",
                },
              };
            }
            break;
          }
          if (!jobId) {
            nextOutputs = prevOutputs;
            break;
          }
          try {
            const result = await pollGraphJob(jobId, {
              intervalMs: pollConfig.intervalMs,
              maxAttempts: pollConfig.maxAttempts,
            });
            nextOutputs = {
              result,
              status: "completed",
              jobId,
              bundle: { jobId, status: "completed", result },
            };
          } catch (error) {
            reportAiPathsError(
              error,
              { action: "pollJob", jobId, nodeId: node.id },
              "AI job polling failed:"
            );
            nextOutputs = {
              result: null,
              status: "failed",
              jobId,
              bundle: {
                jobId,
                status: "failed",
                error: error instanceof Error ? error.message : "Polling failed",
              },
            };
          }
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
          const fetchInit: RequestInit = {
            method: httpConfig.method,
            headers,
          };
          if (body !== undefined) {
            fetchInit.body = body;
          }
          try {
            const res = await fetch(resolvedUrl, fetchInit);
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
        case "database": {
          const defaultQuery = DEFAULT_DB_QUERY;
          const dbConfig = node.config?.database ?? {
            operation: "query",
            entityType: "product",
            idField: "entityId",
            mode: "replace",
            mappings: [],
            query: defaultQuery,
            writeSource: "bundle",
            writeSourcePath: "",
            dryRun: false,
          };
          const operation = dbConfig.operation ?? "query";
          const queryConfig = { ...defaultQuery, ...(dbConfig.query ?? {}) };
          const dryRun = dbConfig.dryRun ?? false;
          const writeSourcePath = dbConfig.writeSourcePath?.trim() ?? "";

          if (operation === "query") {
            const inputQuery = coerceInput(nodeInputs.query);
            const inputValue = coerceInput(nodeInputs.value);
            const entityId = coerceInput(nodeInputs.entityId) ?? inputValue;
            let query: Record<string, unknown> = {};
            if (queryConfig.mode === "preset") {
              const presetValue =
                queryConfig.preset === "by_entityId" ? entityId : inputValue ?? entityId;
              if (presetValue !== undefined) {
                const field =
                  queryConfig.preset === "by_productId"
                    ? "productId"
                    : queryConfig.preset === "by_entityId"
                      ? "entityId"
                      : queryConfig.preset === "by_field"
                        ? queryConfig.field || "id"
                        : "_id";
                query = { [field]: presetValue };
              }
            } else if (inputQuery && typeof inputQuery === "object") {
              query = inputQuery as Record<string, unknown>;
            } else {
              const rendered = renderTemplate(
                queryConfig.queryTemplate ?? "{}",
                nodeInputs as Record<string, unknown>,
                inputValue ?? ""
              );
              const parsed = parseJsonSafe(rendered);
              if (parsed && typeof parsed === "object") {
                query = parsed as Record<string, unknown>;
              }
            }
            const projection = parseJsonSafe(queryConfig.projection ?? "") as
              | Record<string, unknown>
              | undefined;
            const sort = parseJsonSafe(queryConfig.sort ?? "") as
              | Record<string, unknown>
              | undefined;
            if (dryRun) {
              nextOutputs = {
                result: query,
                bundle: {
                  dryRun: true,
                  query,
                  collection: queryConfig.collection,
                  projection,
                  sort,
                  limit: queryConfig.limit,
                  single: queryConfig.single,
                  idType: queryConfig.idType,
                },
              };
              break;
            }
            try {
              const res = await fetch("/api/ai-paths/db-query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: queryConfig.provider,
                  collection: queryConfig.collection,
                  query,
                  projection,
                  sort,
                  limit: queryConfig.limit,
                  single: queryConfig.single,
                  idType: queryConfig.idType,
                }),
              });
              if (!res.ok) {
                throw new Error("Database query failed.");
              }
              const data = (await res.json()) as {
                items?: unknown[];
                item?: unknown;
                count?: number;
              };
              const result = queryConfig.single ? data.item ?? null : data.items ?? [];
              nextOutputs = {
                result,
                bundle: {
                  count:
                    data.count ?? (Array.isArray(result) ? result.length : result ? 1 : 0),
                  query,
                  collection: queryConfig.collection,
                },
              };
            } catch (error) {
              reportAiPathsError(
                error,
                { action: "dbQuery", collection: queryConfig.collection, query },
                "Database query failed:"
              );
              nextOutputs = {
                result: null,
                bundle: {
                  count: 0,
                  query,
                  collection: queryConfig.collection,
                  error: "Query failed",
                },
              };
            }
            break;
          }

          if (operation === "update") {
            const fallbackTarget = dbConfig.mappings?.[0]?.targetPath ?? "content_en";
            const mappings =
              dbConfig.mappings && dbConfig.mappings.length > 0
                ? dbConfig.mappings
                : [
                    {
                      targetPath: fallbackTarget,
                      sourcePort: nodeInputs.result ? "result" : "content_en",
                    },
                  ];
            const updates: Record<string, unknown> = {};
            mappings.forEach((mapping) => {
              const sourcePort = mapping.sourcePort;
              if (!sourcePort) return;
              const sourceValue = nodeInputs[sourcePort];
              if (sourceValue === undefined) return;
              let value = coerceInput(sourceValue);
              if (sourcePort === "bundle") {
                const bundleValue = coerceInput(sourceValue);
                if (
                  bundleValue &&
                  typeof bundleValue === "object" &&
                  mapping.sourcePath
                ) {
                  const resolved = getValueAtMappingPath(bundleValue, mapping.sourcePath);
                  if (resolved !== undefined) {
                    value = resolved;
                  }
                }
              }
              if (mapping.targetPath) {
                updates[mapping.targetPath] = value;
              }
            });
            const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
            const idField = dbConfig.idField ?? "entityId";
            const entityId = resolveEntityIdFromInputs(nodeInputs, idField);
            const hasUpdates = Object.keys(updates).length > 0;
            const needsEntityId = entityType !== "custom";
            let updateResult: unknown = updates;

            if (hasUpdates && needsEntityId && !entityId && !updaterExecuted.has(node.id)) {
              reportAiPathsError(
                new Error("Database update missing entity id"),
                { action: "updateEntity", nodeId: node.id },
                "Database update missing entity id:"
              );
              toast("Database update node needs an entity ID input.", { variant: "error" });
              updaterExecuted.add(node.id);
            }

            if (hasUpdates && (!needsEntityId || entityId) && !updaterExecuted.has(node.id)) {
              if (dryRun) {
                updateResult = {
                  dryRun: true,
                  entityType,
                  entityId: entityId || undefined,
                  updates,
                  mode: dbConfig.mode ?? "replace",
                };
                updaterExecuted.add(node.id);
              } else {
                try {
                  const res = await fetch("/api/ai-paths/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      entityType,
                      entityId: entityId || undefined,
                      updates,
                      mode: dbConfig.mode ?? "replace",
                    }),
                  });
                  if (!res.ok) {
                    throw new Error("Failed to update entity.");
                  }
                  updateResult = await res.json().catch(() => updates);
                  updaterExecuted.add(node.id);
                  const suffix = entityId ? ` ${entityId}` : "";
                  toast(`Updated ${entityType}${suffix}`, { variant: "success" });
                } catch (error) {
                  reportAiPathsError(
                    error,
                    { action: "updateEntity", entityType, entityId, nodeId: node.id },
                    "Database update failed:"
                  );
                  toast(`Failed to update ${entityType}.`, { variant: "error" });
                  updaterExecuted.add(node.id);
                }
              }
            }

            const primaryTarget =
              mappings.find((mapping) => mapping.targetPath)?.targetPath ?? fallbackTarget;
            const primaryValue = updates[primaryTarget];
            nextOutputs = {
              content_en:
                primaryTarget === "content_en"
                  ? (primaryValue as string | undefined) ??
                    (nodeInputs.result
                      ? formatRuntimeValue(coerceInput(nodeInputs.result))
                      : nodeInputs.content_en) ??
                    ""
                  : (nodeInputs.result
                      ? formatRuntimeValue(coerceInput(nodeInputs.result))
                      : nodeInputs.content_en) ?? "",
              bundle: updates,
              result: updateResult,
            };
            break;
          }

          if (operation === "insert") {
            const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
            const writeSource = dbConfig.writeSource ?? "bundle";
            const rawPayload = coerceInput(nodeInputs[writeSource]);
            let payload = coercePayloadObject(rawPayload);
            if (payload && writeSourcePath) {
              const resolved = getValueAtMappingPath(payload, writeSourcePath);
              payload = coercePayloadObject(resolved);
            }
            let insertResult: unknown = payload;

            if (!payload) {
              reportAiPathsError(
                new Error("Database insert missing payload"),
                {
                  action: "insertEntity",
                  nodeId: node.id,
                  writeSource,
                  writeSourcePath,
                },
                "Database insert missing payload:"
              );
              toast("Database insert needs a JSON payload.", { variant: "error" });
              nextOutputs = {
                result: null,
                bundle: { error: "Missing payload" },
              };
              break;
            }

            if (!updaterExecuted.has(node.id)) {
              if (dryRun) {
                insertResult = {
                  dryRun: true,
                  entityType,
                  payload,
                };
                updaterExecuted.add(node.id);
              } else {
                try {
                  let res: Response | null = null;
                  if (entityType === "product") {
                    res = await fetch("/api/products", {
                      method: "POST",
                      body: buildFormData(payload),
                    });
                  } else if (entityType === "note") {
                    res = await fetch("/api/notes", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                  } else {
                    toast("Custom inserts are not supported yet.", { variant: "error" });
                    updaterExecuted.add(node.id);
                    nextOutputs = {
                      result: payload,
                      bundle: payload,
                    };
                    break;
                  }
                  if (!res.ok) {
                    throw new Error("Failed to insert entity.");
                  }
                  insertResult = await res.json().catch(() => payload);
                  updaterExecuted.add(node.id);
                  toast(`Inserted ${entityType}`, { variant: "success" });
                } catch (error) {
                  reportAiPathsError(
                    error,
                    { action: "insertEntity", entityType, nodeId: node.id },
                    "Database insert failed:"
                  );
                  toast(`Failed to insert ${entityType}.`, { variant: "error" });
                  updaterExecuted.add(node.id);
                }
              }
            }

            nextOutputs = {
              result: insertResult,
              bundle: insertResult as Record<string, unknown>,
              content_en:
                typeof (insertResult as Record<string, unknown>)?.content_en === "string"
                  ? ((insertResult as Record<string, unknown>).content_en as string)
                  : undefined,
            };
            break;
          }

          if (operation === "delete") {
            const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
            const idField = dbConfig.idField ?? "entityId";
            const entityId = resolveEntityIdFromInputs(nodeInputs, idField);
            if (!entityId) {
              reportAiPathsError(
                new Error("Database delete missing entity id"),
                { action: "deleteEntity", nodeId: node.id },
                "Database delete missing entity id:"
              );
              toast("Database delete needs an entity ID input.", { variant: "error" });
              nextOutputs = {
                result: null,
                bundle: { error: "Missing entity id" },
              };
              break;
            }

            let deleteResult: unknown = { ok: false };
            if (!updaterExecuted.has(node.id)) {
              if (dryRun) {
                deleteResult = { ok: true, dryRun: true, entityId, entityType };
                updaterExecuted.add(node.id);
              } else {
                try {
                  let res: Response | null = null;
                  if (entityType === "product") {
                    res = await fetch(`/api/products/${encodeURIComponent(entityId)}`, {
                      method: "DELETE",
                    });
                  } else if (entityType === "note") {
                    res = await fetch(`/api/notes/${encodeURIComponent(entityId)}`, {
                      method: "DELETE",
                    });
                  } else {
                    toast("Custom deletes are not supported yet.", { variant: "error" });
                    updaterExecuted.add(node.id);
                    nextOutputs = {
                      result: { ok: false },
                      bundle: { ok: false, entityId },
                    };
                    break;
                  }
                  if (!res.ok && res.status !== 204) {
                    throw new Error("Failed to delete entity.");
                  }
                  deleteResult = { ok: true, entityId };
                  updaterExecuted.add(node.id);
                  toast(`Deleted ${entityType} ${entityId}`, { variant: "success" });
                } catch (error) {
                  reportAiPathsError(
                    error,
                    { action: "deleteEntity", entityType, entityId, nodeId: node.id },
                    "Database delete failed:"
                  );
                  toast(`Failed to delete ${entityType}.`, { variant: "error" });
                  updaterExecuted.add(node.id);
                }
              }
            }

            nextOutputs = {
              result: deleteResult,
              bundle: deleteResult as Record<string, unknown>,
            };
            break;
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
        case "prompt": {
          const promptConfig = node.config?.prompt ?? { template: "" };
          const bundleValue = coerceInput(nodeInputs.bundle);
          const bundleContext =
            bundleValue && typeof bundleValue === "object" && !Array.isArray(bundleValue)
              ? (bundleValue as Record<string, unknown>)
              : {};
          const data = { ...nodeInputs, ...bundleContext };
          const currentValue =
            coerceInput(nodeInputs.result) ?? coerceInput(nodeInputs.value) ?? "";
          const prompt = promptConfig.template
            ? renderTemplate(
                promptConfig.template,
                data as Record<string, unknown>,
                currentValue
              )
            : Object.entries(data)
                .map(([key, value]) => `${key}: ${formatRuntimeValue(value)}`)
                .join("\n");
          const imagesValue =
            nodeInputs.images !== undefined
              ? nodeInputs.images
              : bundleContext.images !== undefined
                ? bundleContext.images
                : undefined;
          const promptOutput = prompt || "Prompt: (no template)";
          nextOutputs =
            imagesValue !== undefined
              ? { prompt: promptOutput, images: imagesValue }
              : { prompt: promptOutput };
          break;
        }
        case "model": {
          const promptInputs = coerceInputArray(nodeInputs.prompt);
          const promptInput = [...promptInputs]
            .reverse()
            .find((value) => {
              if (value === undefined || value === null) return false;
              if (typeof value === "string") return Boolean(value.trim());
              return true;
            });
          if (promptInput === undefined || promptInput === null) {
            nextOutputs = prevOutputs;
            break;
          }
          if (aiExecuted.has(node.id)) break;
          const modelConfig = node.config?.model ?? {
            modelId: "gpt-4o",
            temperature: 0.7,
            maxTokens: 800,
            vision: node.inputs.includes("images"),
            waitForResult: true,
          };
          const hasResultConsumers = edges.some(
            (edge) =>
              edge.from === node.id &&
              (edge.fromPort === "result" ||
                (edge.fromPort === undefined && edge.toPort === "result"))
          );
          const hasPollConsumer = edges.some((edge) => {
            if (edge.from !== node.id) return false;
            if (edge.fromPort && edge.fromPort !== "jobId") return false;
            const targetNode = nodes.find((item) => item.id === edge.to);
            return targetNode?.type === "poll";
          });
          const shouldWait =
            hasResultConsumers ||
            (modelConfig.waitForResult !== false && !hasPollConsumer);
          const prompt =
            typeof promptInput === "string"
              ? promptInput.trim()
              : formatRuntimeValue(promptInput);
          if (!prompt || prompt === "—") {
            nextOutputs = prevOutputs;
            break;
          }
          const imageSource =
            nodeInputs.images ??
            nodeInputs.bundle ??
            nodeInputs.context ??
            nodeInputs.entityJson ??
            nodeInputs.value ??
            nodeInputs.result;
          const imageUrls = extractImageUrls(imageSource);
          const payload = {
            prompt,
            imageUrls,
            modelId: modelConfig.modelId,
            temperature: modelConfig.temperature,
            maxTokens: modelConfig.maxTokens,
            vision: modelConfig.vision,
            source: "ai_paths",
            graph: {
              pathId: activePathId ?? undefined,
              nodeId: node.id,
              nodeTitle: node.title,
            },
          };
          const productId = resolveJobProductId(nodeInputs);
          let enqueuedJobId: string | undefined;
          try {
            const enqueueRes = await fetch("/api/products/ai-jobs/enqueue", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId,
                type: "graph_model",
                payload,
              }),
            });
            const enqueueData = (await enqueueRes.json()) as {
              error?: string;
              jobId?: string;
            };
            if (!enqueueRes.ok || !enqueueData.jobId) {
              throw new Error(enqueueData.error || "Failed to enqueue AI job.");
            }
            enqueuedJobId = enqueueData.jobId;
            toast("AI model job queued.", { variant: "success" });
            if (!shouldWait) {
              nextOutputs = { jobId: enqueueData.jobId, debugPayload: payload };
              aiExecuted.add(node.id);
              break;
            }
            const result = await pollGraphJob(enqueueData.jobId);
            nextOutputs = { result, jobId: enqueueData.jobId, debugPayload: payload };
            aiExecuted.add(node.id);
          } catch (error) {
            reportAiPathsError(
              error,
              { action: "graphModel", nodeId: node.id },
              "AI model job failed:"
            );
            toast("AI model job failed.", { variant: "error" });
            nextOutputs = { result: "", jobId: enqueuedJobId, debugPayload: payload };
            aiExecuted.add(node.id);
          }
          break;
        }
        case "ai_description": {
          if (aiExecuted.has(node.id)) break;
          const entityJson = coerceInput(nodeInputs.entityJson) as
            | Record<string, unknown>
            | undefined;
          if (!entityJson) {
            nextOutputs = {};
            break;
          }
          const rawImages =
            (coerceInput(nodeInputs.images) as unknown[] | undefined) ??
            (entityJson.imageLinks as unknown[] | undefined) ??
            (entityJson.images as unknown[] | undefined) ??
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
            productData: entityJson,
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
    }

    inputs = nextInputs;
    if (!changed) break;
  }

  return { inputs, outputs };
}
