import type {
  DbQueryConfig,
  PathConfig,
  RuntimePortValues,
  RuntimeState,
  AiNode,
} from "@/features/ai-paths/lib";
import {
  safeParseJson,
  parseJsonSafe,
  coerceInput,
  renderTemplate,
  dbApi,
  aiJobsApi,
  getValueAtMappingPath,
  safeStringify,
} from "@/features/ai-paths/lib";

export const DEFAULT_DB_QUERY: DbQueryConfig = {
  provider: "mongodb",
  collection: "products",
  mode: "preset",
  preset: "by_id",
  field: "_id",
  idType: "string",
  queryTemplate: `{
  "_id": "{{value}}"
}`,
  limit: 20,
  sort: "",
  projection: "",
  single: false,
};

export const toJsonSafe = (value: unknown): unknown => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown) => {
    if (typeof val === "bigint") return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === "function" || typeof val === "symbol") return undefined;
          if (val && typeof val === "object") {
            if (seen.has(val)) return undefined;
            seen.add(val);
          }
    
    return val;
  };
  try {
    return JSON.parse(JSON.stringify(value, replacer)) as unknown;
  } catch {
    return null;
  }
};

export const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown) => {
    if (typeof val === "bigint") return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === "function" || typeof val === "symbol") return undefined;
          if (val && typeof val === "object") {
            if (seen.has(val)) return undefined;
            seen.add(val);
          }
    
    return val;
  };
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return "";
  }
};

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return { inputs: {}, outputs: {} };
  if (typeof value === "string") {
    const parsed = safeParseJson(value).value;
    if (parsed && typeof parsed === "object") {
      return parsed as RuntimeState;
    }
    return { inputs: {}, outputs: {} };
  }
  if (typeof value === "object") {
    return value as RuntimeState;
  }
  return { inputs: {}, outputs: {} };
};

export const buildPersistedRuntimeState = (
  state: RuntimeState,
  graphNodes: AiNode[]
): string => {
  const nodeIds = new Set(graphNodes.map((node) => node.id));
  const inputs: Record<string, RuntimePortValues> = {};
  const outputs: Record<string, RuntimePortValues> = {};
  Object.entries(state.inputs ?? {}).forEach(([key, value]) => {
    if (nodeIds.has(key)) {
      inputs[key] = value;
    }
  });
  Object.entries(state.outputs ?? {}).forEach(([key, value]) => {
    if (nodeIds.has(key)) {
      outputs[key] = value;
    }
  });
  const safe = toJsonSafe({ inputs, outputs });
  return safe ? JSON.stringify(safe) : "";
};

export const sanitizePathConfig = (config: PathConfig): PathConfig => ({
  ...config,
  runtimeState: buildPersistedRuntimeState(
    parseRuntimeState(config.runtimeState),
    config.nodes
  ),
});

export const sanitizePathConfigs = (configs: Record<string, PathConfig>) =>
  Object.fromEntries(
    Object.entries(configs).map(([key, value]) => [key, sanitizePathConfig(value)])
  );

export const serializePathConfigs = (configs: Record<string, PathConfig>) =>
  JSON.stringify(sanitizePathConfigs(configs));

export const buildDbQueryPayload = (
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

export const pollDatabaseQuery = async (
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
): Promise<{ result: unknown; status: string; bundle: Record<string, unknown> }> => {
  const maxAttempts = config.maxAttempts;
  const intervalMs = config.intervalMs;
  const successPath = config.successPath || "status";
  const successOperator = config.successOperator || "equals";
  const successValue = config.successValue ?? "completed";
  const resultPath = config.resultPath || "";
  let lastBundle: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const payload = buildDbQueryPayload(nodeInputs, config.dbQuery);
    const queryResult = await dbApi.query<{ item?: unknown; items?: unknown[] }>(payload);
    if (!queryResult.ok) {
      throw new Error("Failed to execute database query.");
    }
    const data = queryResult.data;
    const resultCandidate = payload.single ? data.item : data.items;
    lastBundle = {
      ...(payload.single ? { item: data.item } : { items: data.items }),
    };
    const resolvedStatus = successPath
      ? getValueAtMappingPath(resultCandidate, successPath)
      : resultCandidate;
    const asString = safeStringify(resolvedStatus);
    let success = false;
    switch (successOperator) {
      case "truthy":
        success = Boolean(resolvedStatus);
        break;
      case "notEquals":
        success = asString !== String(successValue);
        break;
      case "contains":
        success = asString.includes(String(successValue));
        break;
      case "equals":
      default:
        success = asString === String(successValue);
    }
    if (success) {
      const result = resultPath
        ? getValueAtMappingPath(resultCandidate, resultPath)
        : resultCandidate;
      return {
        result,
        status: "completed",
        bundle: lastBundle ?? {},
      };
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, intervalMs)));
    }
  }
  return {
    result: null,
    status: "timeout",
    bundle: lastBundle ?? {},
  };
};

export const pollGraphJob = async (
  jobId: string,
  options?: { intervalMs?: number; maxAttempts?: number }
) => {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pollResult = await aiJobsApi.poll(jobId);
    if (!pollResult.ok) {
      throw new Error("Failed to fetch job status.");
    }
    const { status, result: jobResult, error: jobError } = pollResult.data;
    if (!status) continue;
    if (status === "completed") {
      const result = jobResult as
        | { result?: string }
        | string
        | null
        | undefined;
      if (result && typeof result === "object" && "result" in result) {
        return (result as { result?: string }).result ?? "";
      }
      return typeof result === "string" ? result : JSON.stringify(result ?? "");
    }
    if (status === "failed") {
      throw new Error(jobError || "AI job failed.");
    }
    if (status === "canceled") {
      throw new Error("AI job was canceled.");
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, intervalMs)));
    }
  }
  throw new Error("AI job timed out.");
};

