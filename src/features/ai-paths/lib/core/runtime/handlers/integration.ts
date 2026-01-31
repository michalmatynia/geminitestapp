import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
  renderJsonTemplate,
  renderTemplate,
  safeStringify,
} from "../../utils";
import { DEFAULT_DB_QUERY } from "../../constants";
import type {
  DbSchemaConfig,
  DatabaseConfig,
  DbQueryConfig,
  HttpConfig,
  PollConfig,
  UpdaterMapping,
  RuntimePortValues,
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseOperation
} from "@/shared/types/ai-paths";
import {
  buildDbQueryPayload,
  buildFallbackEntity,
  buildFormData,
  buildPromptOutput,
  looksLikeObjectId,
  pollDatabaseQuery,
  pollGraphJob,
  resolveEntityIdFromInputs,
} from "../utils";
import type { NodeHandler, NodeHandlerContext } from "@/shared/types/ai-paths-runtime";
import type { AiNode, Edge } from "@/shared/types/ai-paths";
import { dbApi, entityApi, ApiResponse } from "../../../api";

interface PromptCandidate {
  edge: Edge;
  fromNode: AiNode | undefined;
}

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
}

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
}

export const handleTrigger: NodeHandler = ({ 
  node,
  nodeInputs,
  triggerNodeId,
  triggerEvent,
  simulationEntityType,
  triggerContext,
  activePathId,
  resolvedEntity,
  fallbackEntityId,
  now,
}: NodeHandlerContext): RuntimePortValues => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }
  const eventName: string =
    triggerEvent ?? node.config?.trigger?.event ?? "path_generate_description";
  const simulation = coerceInput(nodeInputs.simulation) as
    | { entityId?: string; entityType?: string; productId?: string }
    | undefined;
  const simulationInputId: string | null =
    simulation?.entityId ?? simulation?.productId ?? null;
  const simulationInputType: string | null =
    simulation?.entityType ?? simulationEntityType ?? null;
  const resolvedEntityId: string | null = simulationInputId ?? null;
  const resolvedEntityType: string | null = simulationInputType ?? null;
  const triggerExtras: Record<string, unknown> = (triggerContext as Record<string, unknown>) ?? {};
  const triggerEntityId: string | null =
    typeof triggerExtras.entityId === "string"
      ? (triggerExtras.entityId)
      : typeof triggerExtras.productId === "string"
        ? (triggerExtras.productId)
        : null;
  const triggerEntityType: string | null =
    typeof triggerExtras.entityType === "string"
      ? (triggerExtras.entityType)
      : null;
  const effectiveEntityId: string | null = resolvedEntityId ?? triggerEntityId ?? null;
  const effectiveEntityType: string | null = resolvedEntityType ?? triggerEntityType ?? null;
  const resolvedContext: Record<string, unknown> = {
    entityType: resolvedEntityType ?? triggerEntityType,
    entityId: resolvedEntityId ?? triggerEntityId,
    source: node.title,
    timestamp: now,
    entity:
      resolvedEntity ??
      buildFallbackEntity(effectiveEntityId ?? fallbackEntityId),
  };
  return {
    trigger: eventName,
    meta: {
      firedAt: now,
      trigger: eventName,
      pathId: activePathId,
      entityId: effectiveEntityId,
      entityType: effectiveEntityType,
      ui: triggerExtras.ui ?? null,
      location: triggerExtras.location ?? null,
      source: triggerExtras.source ?? null,
      user: triggerExtras.user ?? null,
      event: triggerExtras.event ?? null,
      extras: triggerExtras.extras ?? null,
    },
    context: {
      ...resolvedContext,
      entityId:
        effectiveEntityId ?? (resolvedContext.entityId as string | null),
      entityType:
        effectiveEntityType ?? (resolvedContext.entityType as string | null),
      ui: triggerExtras.ui ?? resolvedContext.ui,
      location: triggerExtras.location ?? resolvedContext.location,
      source:
        triggerExtras.source ??
        (resolvedContext.source as string | null) ??
        node.title,
      user: triggerExtras.user ?? resolvedContext.user,
      event: triggerExtras.event ?? resolvedContext.event,
      extras: triggerExtras.extras ?? resolvedContext.extras,
      trigger: eventName,
      pathId: activePathId,
    },
    entityId: effectiveEntityId,
    entityType: effectiveEntityType,
  };
};

export const handleNotification: NodeHandler = ({ 
  node,
  nodeInputs,
  prevOutputs,
  allInputs,
  edges,
  nodes,
  executed,
  toast,
}: NodeHandlerContext): RuntimePortValues => {
  if (executed.notification.has(node.id)) return prevOutputs;
  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return (value).trim().length > 0;
    if (Array.isArray(value)) return (value as unknown[]).length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  };
  const promptCandidates: PromptCandidate[] = edges
    .filter((edge: Edge): boolean => edge.to === node.id && edge.toPort === "prompt")
    .map((edge: Edge): PromptCandidate => ({
      edge,
      fromNode: nodes.find((item: AiNode): boolean => item.id === edge.from),
    }))
    .filter((entry: PromptCandidate): boolean => entry.fromNode?.type === "prompt");
  const promptSourceNode: AiNode | null = promptCandidates[0]?.fromNode ?? null;
  let derivedPromptMessage: string | null = null;
  if (promptSourceNode) {
    const upstreamEdges: Edge[] = edges.filter(
      (edge: Edge): boolean => edge.to === promptSourceNode.id,
    );
    const promptSourceInputs: RuntimePortValues = (allInputs[promptSourceNode.id] ?? {});
    if (upstreamEdges.length > 0) {
      const hasInputValue: boolean =
        Object.values(promptSourceInputs as Record<string, unknown>).some(hasMeaningfulValue);
      if (!hasInputValue) {
        return prevOutputs;
      }
    }
    const derivedPrompt: { promptOutput: string; imagesValue: unknown } = buildPromptOutput(
      promptSourceNode.config?.prompt,
      promptSourceInputs,
    );
    if (derivedPrompt.promptOutput?.trim()) {
      derivedPromptMessage = derivedPrompt.promptOutput;
    }
  }
  const messageSource: unknown =
    derivedPromptMessage ??
    coerceInput(nodeInputs.result) ??
    coerceInput(nodeInputs.prompt) ??
    coerceInput(nodeInputs.value) ??
    coerceInput(nodeInputs.bundle) ??
    coerceInput(nodeInputs.context) ??
    coerceInput(nodeInputs.trigger) ??
    coerceInput(nodeInputs.meta) ??
    coerceInput(nodeInputs.entityId) ??
    coerceInput(nodeInputs.entityType);
  if (messageSource === undefined) {
    return prevOutputs;
  }
  const message: string = safeStringify(messageSource); // Was formatRuntimeValue, but safeStringify might be better for generic
  const trimmed: string = message.trim();
  if (!trimmed) {
    return prevOutputs;
  }
  toast(trimmed, { variant: "success" });
  executed.notification.add(node.id);
  return prevOutputs;
};

export const handlePoll: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  deferPoll,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (deferPoll) {
    const existingStatus: string | null =
      typeof prevOutputs.status === "string" ? (prevOutputs.status) : null;
    if (existingStatus === "completed" || existingStatus === "failed") {
      return prevOutputs;
    }
    const rawJobId: unknown = coerceInput(nodeInputs.jobId);
    const jobId: string =
      typeof rawJobId === "string" || typeof rawJobId === "number"
        ? String(rawJobId).trim()
        : "";
    if (!jobId) {
      return prevOutputs;
    }
    const existingResult: unknown =
      prevOutputs.result !== undefined ? prevOutputs.result : null;
    executed.poll.add(node.id);
    return {
      result: existingResult,
      status: "polling",
      jobId,
      bundle: {
        jobId,
        status: "polling",
        result: existingResult,
      },
    };
  }
  const pollConfig: PollConfig = node.config?.poll ?? {
    intervalMs: 2000,
    maxAttempts: 30,
    mode: "job",
  };
  const pollMode: "job" | "database" = pollConfig.mode ?? "job";
  const rawJobId: unknown = coerceInput(nodeInputs.jobId);
  const jobId: string =
    typeof rawJobId === "string" || typeof rawJobId === "number"
      ? String(rawJobId).trim()
      : "";
  if (pollMode === "database") {
    const queryConfig: DbQueryConfig =
      { ...DEFAULT_DB_QUERY, ...(pollConfig.dbQuery ?? {}) };
    try {
      const response: { result: unknown; status: string; bundle: Record<string, unknown> } = await pollDatabaseQuery(nodeInputs, {
        intervalMs: pollConfig.intervalMs ?? 2000,
        maxAttempts: pollConfig.maxAttempts ?? 30,
        dbQuery: queryConfig,
        successPath: pollConfig.successPath ?? "status",
        successOperator: pollConfig.successOperator ?? "equals",
        successValue: pollConfig.successValue ?? "completed",
        resultPath: pollConfig.resultPath ?? "result",
      });
      return {
        result: response.result,
        status: response.status,
        jobId,
        bundle: {
          ...(response.bundle ?? {}),
          jobId,
          status: response.status,
        },
      };
    } catch (error: unknown) {
      reportAiPathsError(
        error,
        { action: "pollDatabase", nodeId: node.id },
        "Database polling failed:",
      );
      return {
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
  }
  if (!jobId) {
    return prevOutputs;
  }
  try {
    const result: unknown = await pollGraphJob(jobId, {
      intervalMs: pollConfig.intervalMs,
      maxAttempts: pollConfig.maxAttempts,
    });
    return {
      result,
      status: "completed",
      jobId,
      bundle: { jobId, status: "completed", result },
    };
  } catch (error: unknown) {
    reportAiPathsError(
      error,
      { action: "pollJob", jobId, nodeId: node.id },
      "AI job polling failed:",
    );
    return {
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
};

export const handleHttp: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.http.has(node.id)) return prevOutputs;

  const httpConfig: HttpConfig = node.config?.http ?? {
    url: "",
    method: "GET",
    headers: "{}",
    bodyTemplate: "",
    responseMode: "json",
    responsePath: "",
  };
  const resolvedUrl: string = renderTemplate(
    httpConfig.url ?? "",
    nodeInputs as Record<string, unknown>,
    "",
  );
  if (!resolvedUrl) {
    return {
      value: null,
      bundle: { ok: false, status: 0, error: "Missing URL" },
    };
  }
  let headers: Record<string, string> = {};
  try {
    headers = httpConfig.headers
      ? (JSON.parse(httpConfig.headers) as Record<string, string>)
      : {};
  } catch (error: unknown) {
    reportAiPathsError(
      error,
      { action: "parseHeaders", nodeId: node.id },
      "Invalid HTTP headers JSON:",
    );
  }
  let body: BodyInit | undefined = undefined;
  if (httpConfig.method !== "GET" && httpConfig.method !== "DELETE") {
    const renderedBody: string = httpConfig.bodyTemplate
      ? renderTemplate(
          httpConfig.bodyTemplate,
          nodeInputs as Record<string, unknown>,
          "",
        )
      : "";
    if (renderedBody) {
      const trimmed: string = renderedBody.trim();
            if (
              (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
              (trimmed.startsWith("[") && trimmed.endsWith("]"))
            ) {
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
    const res: Response = await fetch(resolvedUrl, fetchInit);
    let data: unknown = null;
    if (httpConfig.responseMode === "status") {
      data = res.status;
    } else if (httpConfig.responseMode === "text") {
      data = await res.text();
    } else {
      try {
        data = (await res.json()) as unknown;
      } catch {
        data = await res.text();
      }
    }
    let resolvedValue: unknown = data;
    if (httpConfig.responsePath) {
      const pathValue: unknown = getValueAtMappingPath(data, httpConfig.responsePath);
      resolvedValue = pathValue === undefined ? data : pathValue;
    }
    executed.http.add(node.id);
    return {
      value: resolvedValue,
      bundle: {
        ok: res.ok,
        status: res.status,
        url: resolvedUrl,
        data: resolvedValue,
      },
    };
  } catch (error: unknown) {
    reportAiPathsError(
      error,
      { action: "httpFetch", url: resolvedUrl, nodeId: node.id },
      "HTTP fetch failed:",
    );
    return {
      value: null,
      bundle: {
        ok: false,
        status: 0,
        url: resolvedUrl,
        error: "Fetch failed",
      },
    };
  }
};

export const handleDatabase: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
  triggerContext,
  fallbackEntityId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const resolveDatabaseInputs = (inputs: Record<string, unknown>): Record<string, unknown> => {
    const next: Record<string, unknown> = { ...inputs };
    const pickString = (value: unknown): string | undefined =>
      typeof value === "string" && (value).trim().length > 0
        ? (value).trim()
        : undefined;
    const pickFromContext = (
      ctx: Record<string, unknown> | null | undefined,
    ): void => {
      if (!ctx || typeof ctx !== "object") return;
      const entityId: string | undefined =
        pickString(ctx.entityId) ??
        pickString(ctx.productId) ??
        pickString(ctx.id) ??
        pickString(ctx._id);
      const productId: string | undefined =
        pickString(ctx.productId) ??
        pickString(ctx.entityId) ??
        pickString(ctx.id) ??
        pickString(ctx._id);
      const entityType: string | undefined = pickString(ctx.entityType);
      if (next.entityId === undefined && entityId) next.entityId = entityId;
      if (next.productId === undefined && productId) next.productId = productId;
      if (next.entityType === undefined && entityType)
        next.entityType = entityType;
    };
    const applyFromObject = (record: Record<string, unknown>): void => {
      const entityId: string | undefined =
        pickString(record.entityId) ??
        pickString(record.productId) ??
        pickString(record.id) ??
        pickString(record._id);
      const productId: string | undefined =
        pickString(record.productId) ??
        pickString(record.entityId) ??
        pickString(record.id) ??
        pickString(record._id);
      const entityType: string | undefined = pickString(record.entityType);
      if (next.entityId === undefined && entityId) next.entityId = entityId;
      if (next.productId === undefined && productId) next.productId = productId;
      if (next.entityType === undefined && entityType)
        next.entityType = entityType;
    };
    const contextValue: unknown = coerceInput(inputs.context);
    if (contextValue && typeof contextValue === "object") {
      applyFromObject(contextValue as Record<string, unknown>);
    }
    const metaValue: unknown = coerceInput(inputs.meta);
    if (metaValue && typeof metaValue === "object") {
      applyFromObject(metaValue as Record<string, unknown>);
    }
    const bundleValue: unknown = coerceInput(inputs.bundle);
    if (bundleValue && typeof bundleValue === "object") {
      applyFromObject(bundleValue as Record<string, unknown>);
    }
    pickFromContext(triggerContext as Record<string, unknown>);
    if (next.entityId === undefined && fallbackEntityId) {
      next.entityId = fallbackEntityId;
    }
    if (next.productId === undefined && next.entityId) {
      next.productId = next.entityId;
    }
    if (next.entityType === undefined && simulationEntityType) {
      next.entityType = simulationEntityType;
    }
    return next;
  };
  const resolvedInputs: Record<string, unknown> = resolveDatabaseInputs(
    nodeInputs as Record<string, unknown>,
  );
  const defaultQuery: DbQueryConfig = DEFAULT_DB_QUERY;
  const dbConfig: DatabaseConfig = (node.config?.database as DatabaseConfig) ?? {
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
  const operation: DatabaseOperation = dbConfig.operation ?? "query";
  const queryConfig: DbQueryConfig = { ...defaultQuery, ...(dbConfig.query ?? {}) };
  const dryRun: boolean = dbConfig.dryRun ?? false;
  const writeSourcePath: string = dbConfig.writeSourcePath?.trim() ?? "";
  const aiPrompt: string = dbConfig.aiPrompt ?? "";
  const useMongoActions: boolean = Boolean(
    dbConfig.useMongoActions && dbConfig.actionCategory && dbConfig.action,
  );

  if (useMongoActions) {
    const actionCategory: DatabaseActionCategory = dbConfig.actionCategory ?? "read";
    const action: DatabaseAction = dbConfig.action ?? "find";
    const inputValue: unknown =
      coerceInput(resolvedInputs.value) ?? coerceInput(resolvedInputs.jobId);
    const queryPayload = buildDbQueryPayload(resolvedInputs as RuntimePortValues, queryConfig);
    const filter = (queryPayload.query) ?? {};
    const projection = queryPayload.projection;
    const sort = queryPayload.sort;
    const limit = queryPayload.limit;
    const idType = queryPayload.idType;
    const collection = queryPayload.collection;
    const distinctField: string | undefined = dbConfig.distinctField?.trim() || undefined;
    const updateTemplate: string = dbConfig.updateTemplate?.trim() ?? "";

    const parseJsonTemplate = (template: string): unknown =>
      parseJsonSafe(
        renderJsonTemplate(
          template,
          resolvedInputs,
          inputValue ?? "",
        ),
      );

    if (actionCategory === "read" || actionCategory === "aggregate") {
      if (action === "distinct" && !distinctField) {
        toast("Distinct requires a field name.", { variant: "error" });
        return {
          result: null,
          bundle: { error: "Missing distinct field" },
          aiPrompt,
        };
      }
      if (action === "aggregate") {
        const parsedPipeline: unknown = parseJsonTemplate(
          queryConfig.queryTemplate ?? "[]",
        );
        if (!Array.isArray(parsedPipeline)) {
          toast("Aggregation pipeline must be a JSON array.", {
            variant: "error",
          });
          return {
            result: null,
            bundle: { error: "Invalid pipeline" },
            aiPrompt,
          };
        }
        if (dryRun) {
          return {
            result: parsedPipeline,
            bundle: {
              dryRun: true,
              action,
              collection,
              pipeline: parsedPipeline,
            },
            aiPrompt,
          };
        }
        const aggResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
          action,
          collection,
          pipeline: parsedPipeline,
        });
        if (!aggResult.ok) {
          toast("Aggregation failed.", { variant: "error" });
          return {
            result: null,
            bundle: { error: "Aggregation failed" },
            aiPrompt,
          };
        }
        return {
          result: aggResult.data.items ?? [],
          bundle: {
            count:
              aggResult.data.count ??
              (Array.isArray(aggResult.data.items)
                ? aggResult.data.items.length
                : 0),
            collection,
          },
          aiPrompt,
        };
      }

      if (dryRun) {
        return {
          result: filter,
          bundle: {
            dryRun: true,
            action,
            collection,
            filter,
            projection,
            sort,
            limit,
          },
          aiPrompt,
        };
      }
      const readResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
        action,
        collection,
        filter,
        ...(projection !== undefined ? { projection } : {}),
        ...(sort !== undefined ? { sort } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(idType !== undefined ? { idType } : {}),
      });
      if (!readResult.ok) {
        toast("Database read failed.", { variant: "error" });
        return { result: null, bundle: { error: "Read failed" }, aiPrompt };
      }
      const data: DbActionResult = readResult.data;
      const result: unknown = data.item ?? data.items ?? data.values ?? data.count ?? [];
      const count: number =
        data.count ??
        (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
      return {
        result,
        bundle: {
          count,
          collection,
          filter,
        },
        aiPrompt,
      };
    }

    if (actionCategory === "create") {
      const payloadTemplate: string = queryConfig.queryTemplate?.trim() ?? "";
      const parsedPayload: unknown = payloadTemplate
        ? parseJsonTemplate(payloadTemplate)
        : null;
      if (
        payloadTemplate &&
        (!parsedPayload ||
          (typeof parsedPayload !== "object" && !Array.isArray(parsedPayload)))
      ) {
        toast("Insert template must be valid JSON.", {
          variant: "error",
        });
        return {
          result: null,
          bundle: { error: "Invalid insert template" },
          aiPrompt,
        };
      }
      const payloadFromTemplate: unknown =
        parsedPayload && typeof parsedPayload === "object"
          ? parsedPayload
          : null;
      const rawPayload: unknown =
        payloadFromTemplate ??
        coerceInput(resolvedInputs[dbConfig.writeSource ?? "bundle"]);
      const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
        if (!value) return null;
        if (typeof value === "string") {
          const parsed: unknown = parseJsonSafe(value);
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
      const payloadObject: Record<string, unknown> | null = coercePayloadObject(rawPayload);
      const payloadArray: unknown[] | null = Array.isArray(rawPayload)
        ? (rawPayload as unknown[])
        : null;
      const payload: unknown[] | Record<string, unknown> | null = payloadArray ?? payloadObject;
      if (!payload) {
        toast("Insert requires a JSON payload.", { variant: "error" });
        return { result: null, bundle: { error: "Missing payload" }, aiPrompt };
      }
      if (action === "insertOne" && !payloadObject) {
        toast("insertOne requires a single JSON object.", { variant: "error" });
        return { result: null, bundle: { error: "Invalid payload" }, aiPrompt };
      }
      if (executed.updater.has(node.id)) {
        return prevOutputs;
      }
      if (dryRun) {
        executed.updater.add(node.id);
        return {
          result: payload,
          bundle: { dryRun: true, action, collection, payload } as RuntimePortValues,
          aiPrompt,
        };
      }
      const insertResult: ApiResponse<unknown> = await dbApi.action({
        action,
        collection,
        ...(action === "insertOne" && payloadObject
          ? { document: payloadObject }
          : {}),
        ...(action === "insertMany"
          ? { documents: Array.isArray(payload) ? (payload) : [payload] }
          : {}),
      });
      executed.updater.add(node.id);
      if (!insertResult.ok) {
        reportAiPathsError(
          new Error(insertResult.error),
          { action: "dbInsert", collection, nodeId: node.id },
          "Database insert failed:",
        );
        toast("Database insert failed.", { variant: "error" });
        return { result: null, bundle: { error: "Insert failed" }, aiPrompt };
      }
      toast("Insert completed.", { variant: "success" });
      return {
        result: insertResult.data,
        bundle: insertResult.data as Record<string, unknown>,
        aiPrompt,
      };
    }

    if (actionCategory === "update") {
      let resolvedFilter: Record<string, unknown> = filter;
      if (queryConfig.queryTemplate?.trim()) {
        const parsedFilter: unknown = parseJsonTemplate(queryConfig.queryTemplate);
        if (
          parsedFilter &&
          typeof parsedFilter === "object" &&
          !Array.isArray(parsedFilter)
        ) {
          resolvedFilter = parsedFilter as Record<string, unknown>;
        }
      }
      const debugPayload: Record<string, unknown> = {
        mode: "mongo",
        actionCategory,
        action,
        collection,
        filter: resolvedFilter,
        updateTemplate: updateTemplate || undefined,
        idType,
        entityId: resolvedInputs.entityId,
        productId: resolvedInputs.productId,
        entityType: resolvedInputs.entityType,
      };
      const buildUpdatesFromMappings = (): { updates: Record<string, unknown>; primaryTarget: string } => {
        const fallbackTarget: string =
          dbConfig.mappings?.[0]?.targetPath ?? "content_en";
        const mappings: UpdaterMapping[] =
          dbConfig.mappings && dbConfig.mappings.length > 0
            ? dbConfig.mappings
            :
              [
                {
                  targetPath: fallbackTarget,
                  sourcePort: resolvedInputs.result ? "result" : "content_en",
                },
              ];
        const trimStrings: boolean = dbConfig.trimStrings ?? false;
        const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
        const isEmptyValue = (value: unknown): boolean =>
          value === undefined ||
          value === null ||
          (typeof value === "string" && (value).trim() === "") ||
          (Array.isArray(value) && (value as unknown[]).length === 0);
        const updates: Record<string, unknown> = {};
        mappings.forEach((mapping: UpdaterMapping): void => {
          const sourcePort: string = mapping.sourcePort;
          if (!sourcePort) return;
          const sourceValue: unknown = resolvedInputs[sourcePort];
          if (sourceValue === undefined) return;
          let value: unknown = coerceInput(sourceValue);
          if (value && typeof value === "object" && mapping.sourcePath) {
            const resolved: unknown = getValueAtMappingPath(value, mapping.sourcePath);
            if (resolved !== undefined) {
              value = resolved;
            }
          }
          if (
            sourcePort === "result" &&
            value &&
            typeof value === "object" &&
            !mapping.sourcePath
          ) {
            const resultValue: unknown = (value as Record<string, unknown>).result;
            const descriptionValue: unknown = (value as Record<string, unknown>)
              .description;
            const contentValue: unknown = (value as Record<string, unknown>).content_en;
            value = resultValue ?? descriptionValue ?? contentValue ?? value;
          }
          if (typeof value === "string" && trimStrings) {
            value = (value).trim();
          }
          if (skipEmpty && isEmptyValue(value)) {
            return;
          }
          if (mapping.targetPath) {
            updates[mapping.targetPath] = value;
          }
        });
        return {
          updates,
          primaryTarget:
            mappings.find((m: UpdaterMapping): boolean => !!m.targetPath)?.targetPath ?? fallbackTarget,
        };
      };

      const parsedUpdate: unknown = updateTemplate
        ? parseJsonTemplate(updateTemplate)
        : null;
      if (
        updateTemplate &&
        (!parsedUpdate ||
          (typeof parsedUpdate !== "object" && !Array.isArray(parsedUpdate)))
      ) {
        toast("Update template must be valid JSON.", { variant: "error" });
        return {
          result: null,
          bundle: { error: "Invalid update template" },
          debugPayload,
          aiPrompt,
        };
      }
      const { updates, primaryTarget } = buildUpdatesFromMappings();
      const updateDoc: unknown = parsedUpdate ?? updates;
      if (
        !updateDoc ||
        (typeof updateDoc !== "object" && !Array.isArray(updateDoc))
      ) {
        toast("Update document is missing or invalid.", { variant: "error" });
        return {
          result: null,
          bundle: { error: "Invalid update" },
          debugPayload,
          aiPrompt,
        };
      }
      if (
        !Array.isArray(updateDoc) &&
        typeof updateDoc === "object" &&
        Object.keys(updateDoc as Record<string, unknown>).length === 0
      ) {
        toast("Update document is empty.", { variant: "error" });
        return {
          result: null,
          bundle: { error: "Empty update" },
          debugPayload,
          aiPrompt,
        };
      }
      if (executed.updater.has(node.id)) {
        return prevOutputs;
      }
      if (dryRun) {
        executed.updater.add(node.id);
        return {
          result: updateDoc as Record<string, unknown>,
          bundle: {
            dryRun: true,
            action,
            collection,
            filter: resolvedFilter,
            update: updateDoc,
          } as RuntimePortValues,
          debugPayload,
          aiPrompt,
        };
      }
      const updateResult: ApiResponse<unknown> = await dbApi.action({
        action,
        collection,
        filter: resolvedFilter,
        update: updateDoc,
        ...(idType !== undefined ? { idType } : {}),
      });
      executed.updater.add(node.id);
      if (!updateResult.ok) {
        reportAiPathsError(
          new Error(updateResult.error),
          { action: "dbUpdate", collection, nodeId: node.id },
          "Database update failed:",
        );
        toast("Database update failed.", { variant: "error" });
        return {
          result: null,
          bundle: { error: "Update failed" },
          debugPayload,
          aiPrompt,
        };
      }
      toast("Update completed.", { variant: "success" });
      const primaryValue: unknown = updates[primaryTarget];
      return {
        content_en:
          primaryTarget === "content_en"
            ? ((primaryValue as string | undefined) ??
              (nodeInputs.content_en as string | undefined))
            : (nodeInputs.content_en as string | undefined),
        result: updateResult.data,
        bundle: updateResult.data as Record<string, unknown>,
        debugPayload,
        aiPrompt,
      };
    }

    if (actionCategory === "delete") {
      if (executed.updater.has(node.id)) {
        return prevOutputs;
      }
      if (dryRun) {
        executed.updater.add(node.id);
        return {
          result: { dryRun: true, action, collection, filter },
          bundle: { dryRun: true } as RuntimePortValues,
          aiPrompt,
        };
      }
      const deleteResult: ApiResponse<unknown> = await dbApi.action({
        action,
        collection,
        filter,
        ...(idType !== undefined ? { idType } : {}),
      });
      executed.updater.add(node.id);
      if (!deleteResult.ok) {
        reportAiPathsError(
          new Error(deleteResult.error),
          { action: "dbDelete", collection, nodeId: node.id },
          "Database delete failed:",
        );
        toast("Database delete failed.", { variant: "error" });
        return { result: null, bundle: { error: "Delete failed" }, aiPrompt };
      }
      toast("Delete completed.", { variant: "success" });
      return {
        result: deleteResult.data,
        bundle: deleteResult.data as Record<string, unknown>,
        aiPrompt,
      };
    }
  }

  if (operation === "query") {
    const inputQuery: unknown = coerceInput(nodeInputs.query);
    const callbackInput: unknown = coerceInput(nodeInputs.queryCallback);
    const aiQueryInput: unknown = coerceInput(nodeInputs.aiQuery);
    const resolvedEntityId: string | null = resolveEntityIdFromInputs(
      resolvedInputs as RuntimePortValues,
      undefined,
      simulationEntityType,
      simulationEntityId,
    );
    const inputValue: unknown = coerceInput(resolvedInputs.value);
    const entityIdInput: unknown = coerceInput(resolvedInputs.entityId);
    const productIdInput: unknown = coerceInput(resolvedInputs.productId);
    const parseQueryInput = (value: unknown): Record<string, unknown> | null => {
      if (!value) return null;
      if (typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
      if (typeof value === "string") {
        const parsed: unknown = parseJsonSafe(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      }
      return null;
    };
    const callbackTemplate: string | null =
      typeof callbackInput === "string" && (callbackInput).trim()
        ? (callbackInput)
        : null;
    let query: Record<string, unknown> = {};

    // Priority 1: AI-generated query from model output
    if (aiQueryInput !== undefined && aiQueryInput !== null) {
      let parsedAiQuery: Record<string, unknown> | null = null;

      if (typeof aiQueryInput === "string") {
        // Try to extract JSON from AI response (may have markdown code blocks)
        const jsonMatch: RegExpMatchArray | null = (aiQueryInput).match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr: string = jsonMatch ? jsonMatch[1]!.trim() : (aiQueryInput).trim();
        parsedAiQuery = parseJsonSafe(jsonStr) as Record<
          string,
          unknown
        > | null;
      } else if (
        typeof aiQueryInput === "object" &&
        !Array.isArray(aiQueryInput)
      ) {
        parsedAiQuery = aiQueryInput as Record<string, unknown>;
      }

      if (parsedAiQuery && typeof parsedAiQuery === "object") {
        // Handle nested query structure (AI might return {query: {...}, collection: "..."})
        if (parsedAiQuery.query && typeof parsedAiQuery.query === "object") {
          query = parsedAiQuery.query as Record<string, unknown>;
          // Override collection if AI specified one
          if (typeof parsedAiQuery.collection === "string") {
            queryConfig.collection = parsedAiQuery.collection;
          }
        } else {
          query = parsedAiQuery;
        }
      } else {
        toast("AI query could not be parsed as valid JSON.", {
          variant: "error",
        });
        return {
          result: null,
          bundle: {
            count: 0,
            query: {},
            collection: queryConfig.collection,
            error: "Invalid AI query format",
            rawAiQuery: aiQueryInput,
          },
          aiPrompt,
        };
      }
    } else {
      const inlineQuery = parseQueryInput(inputQuery ?? callbackInput);
      if (inlineQuery) {
        query = inlineQuery;
      } else if (callbackTemplate) {
        const parsed: unknown = parseJsonSafe(
          renderJsonTemplate(
            callbackTemplate,
            resolvedInputs,
            inputValue ?? "",
          ),
        );
        if (parsed && typeof parsed === "object") {
          query = parsed as Record<string, unknown>;
        }
      } else if (queryConfig.mode === "preset") {
        const presetValue: unknown =
          queryConfig.preset === "by_productId"
            ? (productIdInput ?? inputValue)
            : queryConfig.preset === "by_entityId"
              ? (entityIdInput ?? inputValue ?? resolvedEntityId)
              : (inputValue ??
                resolvedEntityId ??
                entityIdInput ??
                productIdInput);
        if (presetValue !== undefined) {
          let field: string =
            queryConfig.preset === "by_productId"
              ? "productId"
              : queryConfig.preset === "by_entityId"
                ? "entityId"
                : queryConfig.preset === "by_field"
                  ? queryConfig.field || "id"
                  : "_id";
          if (
            queryConfig.preset === "by_id" &&
            field === "_id" &&
            !looksLikeObjectId(presetValue as string)
          ) {
            field = "id";
          }
          query = { [field]: presetValue };
        } else {
          toast("Database query needs an ID/value input.", {
            variant: "error",
          });
          return {
            result: null,
            bundle: {
              count: 0,
              query: {},
              collection: queryConfig.collection,
              error: "Missing query value",
            },
            aiPrompt,
          };
        }
      } else {
        const parsed: unknown = parseJsonSafe(
          renderJsonTemplate(
            queryConfig.queryTemplate ?? "{}",
            resolvedInputs,
            inputValue ?? "",
          ),
        );
        if (parsed && typeof parsed === "object") {
          query = parsed as Record<string, unknown>;
        }
      }
    }
    const projection: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.projection ?? "") as
      | Record<string, unknown>
      | undefined;
    const sort: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.sort ?? "") as
      | Record<string, unknown>
      | undefined;
    if (dryRun) {
      return {
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
        } as RuntimePortValues,
        aiPrompt,
      };
    }
    const queryResult: ApiResponse<DbQueryResult> = await dbApi.query<DbQueryResult>({ 
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      query,
      projection,
      sort,
      limit: queryConfig.limit,
      single: queryConfig.single,
      idType: queryConfig.idType,
    });
    if (!queryResult.ok) {
      reportAiPathsError(
        new Error(queryResult.error),
        { action: "dbQuery", collection: queryConfig.collection, query },
        "Database query failed:",
      );
      return {
        result: null,
        bundle: {
          count: 0,
          query,
          collection: queryConfig.collection,
          error: "Query failed",
        },
        aiPrompt,
      };
    }
    const result: unknown = queryConfig.single
      ? (queryResult.data.item ?? null)
      : (queryResult.data.items ?? []);
    return {
      result,
      bundle: {
        count:
          queryResult.data.count ??
          (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0),
        query,
        collection: queryConfig.collection,
      },
      aiPrompt,
    };
  }

  if (operation === "update") {
    const fallbackTarget: string = dbConfig.mappings?.[0]?.targetPath ?? "content_en";
    const mappings: UpdaterMapping[] =
      dbConfig.mappings && dbConfig.mappings.length > 0
        ? dbConfig.mappings
        : [
            {
              targetPath: fallbackTarget,
              sourcePort: resolvedInputs.result ? "result" : "content_en",
            },
          ];
    const trimStrings: boolean = dbConfig.trimStrings ?? false;
    const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
    const isEmptyValue = (value: unknown): boolean =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && (value).trim() === "") ||
      (Array.isArray(value) && (value as unknown[]).length === 0);
    const updates: Record<string, unknown> = {};
    mappings.forEach((mapping: UpdaterMapping) => {
      const sourcePort = mapping.sourcePort;
      if (!sourcePort) return;
      const sourceValue = resolvedInputs[sourcePort];
      if (sourceValue === undefined) return;
      let value: unknown = coerceInput(sourceValue);
      if (value && typeof value === "object" && mapping.sourcePath) {
        const resolved = getValueAtMappingPath(value, mapping.sourcePath);
        if (resolved !== undefined) {
          value = resolved;
        }
      }
      if (
        sourcePort === "result" &&
        value &&
        typeof value === "object" &&
        !mapping.sourcePath
      ) {
        const resultValue: unknown = (value as Record<string, unknown>).result;
        const descriptionValue: unknown = (value as Record<string, unknown>).description;
        const contentValue: unknown = (value as Record<string, unknown>).content_en;
        value = resultValue ?? descriptionValue ?? contentValue ?? value;
      }
      if (typeof value === "string" && trimStrings) {
        value = (value).trim();
      }
      if (skipEmpty && isEmptyValue(value)) {
        return;
      }
      if (mapping.targetPath) {
        updates[mapping.targetPath] = value;
      }
    });
    const updateStrategy = dbConfig.updateStrategy ?? "one";
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const idField = dbConfig.idField ?? "entityId";
    const entityId = resolveEntityIdFromInputs(
      resolvedInputs as RuntimePortValues,
      idField,
      simulationEntityType,
      simulationEntityId,
    );
    const debugPayload = {
      mode: "legacy",
      updateStrategy,
      entityType,
      idField,
      entityId,
      updates,
      mappings,
    };
    const hasUpdates = Object.keys(updates).length > 0;
    const needsEntityId = entityType !== "custom";
    let updateResult: unknown = updates;

    if (updateStrategy === "many") {
      const queryPayload = buildDbQueryPayload(resolvedInputs as RuntimePortValues, queryConfig);
      const query = (queryPayload.query) ?? {};
      const hasQuery =
        query && typeof query === "object" && Object.keys(query).length > 0;

      if (
        hasUpdates &&
        dbConfig.mode === "append" &&
        !executed.updater.has(node.id)
      ) {
        reportAiPathsError(
          new Error("Append mode is not supported for update many"),
          { action: "updateMany", nodeId: node.id },
          "Database update many failed:",
        );
        toast("Update many does not support append mode.", {
          variant: "error",
        });
        updateResult = {
          error: "append_not_supported",
          updates,
          query,
          collection: queryPayload.collection,
        };
        executed.updater.add(node.id);
      } else if (hasUpdates && !hasQuery && !executed.updater.has(node.id)) {
        reportAiPathsError(
          new Error("Database update many missing query"),
          { action: "updateMany", nodeId: node.id },
          "Database update many missing query:",
        );
        toast("Update many requires a query filter.", { variant: "error" });
        updateResult = {
          error: "missing_query",
          updates,
          query,
          collection: queryPayload.collection,
        };
        executed.updater.add(node.id);
      } else if (hasUpdates && hasQuery && !executed.updater.has(node.id)) {
        if (dryRun) {
          updateResult = {
            dryRun: true,
            updateMany: true,
            collection: queryPayload.collection,
            query,
            updates,
            mode: dbConfig.mode ?? "replace",
          };
          executed.updater.add(node.id);
        } else {
          const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({ 
            provider: queryPayload.provider,
            collection: queryPayload.collection,
            query,
            updates,
            single: false,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          });
          executed.updater.add(node.id);
          if (!dbUpdateResult.ok) {
            reportAiPathsError(
              new Error(dbUpdateResult.error),
              {
                action: "updateMany",
                collection: queryPayload.collection,
                nodeId: node.id,
              },
              "Database update many failed:",
            );
            toast(`Failed to update ${queryPayload.collection}.`, {
              variant: "error",
            });
          } else {
            updateResult = dbUpdateResult.data;
            const modified: number = dbUpdateResult.data?.modifiedCount ?? 0;
            const matched: number = dbUpdateResult.data?.matchedCount ?? 0;
            const countLabel = modified || matched;
            toast(
              `Updated ${countLabel} document${countLabel === 1 ? "" : "s"} in ${queryPayload.collection}.`,
              { variant: "success" },
            );
          }
        }
      }
    } else {
      if (
        hasUpdates &&
        needsEntityId &&
        !entityId &&
        !executed.updater.has(node.id)
      ) {
        reportAiPathsError(
          new Error("Database update missing entity id"),
          { action: "updateEntity", nodeId: node.id },
          "Database update missing entity id:",
        );
        toast("Database update node needs an entity ID input.", {
          variant: "error",
        });
        executed.updater.add(node.id);
      }

      if (
        hasUpdates &&
        (!needsEntityId || entityId) &&
        !executed.updater.has(node.id)
      ) {
        if (dryRun) {
          updateResult = {
            dryRun: true,
            entityType,
            entityId: entityId || undefined,
            updates,
            mode: dbConfig.mode ?? "replace",
          };
          executed.updater.add(node.id);
        } else {
          try {
            const entityUpdateResult = await entityApi.update({
              entityType,
              ...(entityId ? { entityId } : {}),
              updates,
              mode: dbConfig.mode ?? "replace",
            });
            if (!entityUpdateResult.ok) {
              throw new Error(entityUpdateResult.error);
            }
            updateResult = entityUpdateResult.data ?? updates;
            executed.updater.add(node.id);
            const suffix = entityId ? ` ${entityId}` : "";
            toast(`Updated ${entityType}${suffix}`, { variant: "success" });
          } catch (error: unknown) {
            reportAiPathsError(
              error,
              { action: "updateEntity", entityType, entityId, nodeId: node.id },
              "Database update failed:",
            );
            toast(`Failed to update ${entityType}.`, { variant: "error" });
            executed.updater.add(node.id);
          }
        }
      }
    }

    const primaryTarget =
      mappings.find((mapping: UpdaterMapping) => mapping.targetPath)?.targetPath ??
      fallbackTarget;
    const primaryValue = updates[primaryTarget];
    return {
      content_en:
        primaryTarget === "content_en"
          ? ((primaryValue as string | undefined) ??
            (nodeInputs.content_en as string | undefined) ??
            "")
          : (nodeInputs.content_en as string | undefined),
      bundle: updates,
      result: updateResult,
      debugPayload,
      aiPrompt,
    };
  }

  if (operation === "insert") {
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const writeSource = dbConfig.writeSource ?? "bundle";
    const rawPayload = coerceInput(nodeInputs[writeSource]);
    const callbackInput = coerceInput(nodeInputs.queryCallback);
    
    const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
      if (!value) return null;
      if (typeof value === "string") {
        const parsed: unknown = parseJsonSafe(value);
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

    let payload = coercePayloadObject(rawPayload);
    if (payload && writeSourcePath) {
      const resolved = getValueAtMappingPath(payload, writeSourcePath);
      payload = coercePayloadObject(resolved);
    }

    // Callback injection for insert: if callback is an object, merge it or use it as payload
    if (
      callbackInput &&
      typeof callbackInput === "object" &&
      !Array.isArray(callbackInput)
    ) {
      payload = {
        ...(payload ?? {}),
        ...(callbackInput as Record<string, unknown>),
      };
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
        "Database insert missing payload:",
      );
      toast("Database insert needs a JSON payload.", { variant: "error" });
      return {
        result: null,
        bundle: { error: "Missing payload" },
        aiPrompt,
      };
    }

    if (!executed.updater.has(node.id)) {
      if (dryRun) {
        insertResult = {
          dryRun: true,
          entityType,
          payload,
        };
        executed.updater.add(node.id);
      } else {
        if (entityType === "product") {
          const productResult: ApiResponse<unknown> = await entityApi.createProduct(
            buildFormData(payload),
          );
          executed.updater.add(node.id);
          if (!productResult.ok) {
            reportAiPathsError(
              new Error(productResult.error),
              { action: "insertEntity", entityType, nodeId: node.id },
              "Database insert failed:",
            );
            toast(`Failed to insert ${entityType}.`, { variant: "error" });
          } else {
            insertResult = productResult.data;
            toast(`Inserted ${entityType}`, { variant: "success" });
          }
        } else if (entityType === "note") {
          const noteResult: ApiResponse<unknown> = await entityApi.createNote(payload);
          executed.updater.add(node.id);
          if (!noteResult.ok) {
            reportAiPathsError(
              new Error(noteResult.error),
              { action: "insertEntity", entityType, nodeId: node.id },
              "Database insert failed:",
            );
            toast(`Failed to insert ${entityType}.`, { variant: "error" });
          } else {
            insertResult = noteResult.data;
            toast(`Inserted ${entityType}`, { variant: "success" });
          }
        } else {
          toast("Custom inserts are not supported yet.", { variant: "error" });
          executed.updater.add(node.id);
          return {
            result: payload,
            bundle: payload,
            aiPrompt,
          };
        }
      }
    }

    return {
      result: insertResult,
      bundle: insertResult as Record<string, unknown>,
      content_en:
        typeof (insertResult as Record<string, unknown>)?.content_en ===
        "string"
          ? ((insertResult as Record<string, unknown>).content_en as string)
          : undefined,
      aiPrompt,
    };
  }

  if (operation === "delete") {
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const idField = dbConfig.idField ?? "entityId";
    const entityId = resolveEntityIdFromInputs(
      nodeInputs,
      idField,
      simulationEntityType,
      simulationEntityId,
    );
    if (!entityId) {
      reportAiPathsError(
        new Error("Database delete missing entity id"),
        { action: "deleteEntity", nodeId: node.id },
        "Database delete missing entity id:",
      );
      toast("Database delete needs an entity ID input.", { variant: "error" });
      return {
        result: null,
        bundle: { error: "Missing entity id" },
        aiPrompt,
      };
    }

    let deleteResult: unknown = { ok: false };
    if (!executed.updater.has(node.id)) {
      if (dryRun) {
        deleteResult = { ok: true, dryRun: true, entityId, entityType };
        executed.updater.add(node.id);
      } else {
        if (entityType === "product") {
          const productDeleteResult: { ok: boolean; error?: string } = await entityApi.deleteProduct(entityId);
          executed.updater.add(node.id);
          if (!productDeleteResult.ok) {
            reportAiPathsError(
              new Error(productDeleteResult.error),
              { action: "deleteEntity", entityType, entityId, nodeId: node.id },
              "Database delete failed:",
            );
            toast(`Failed to delete ${entityType}.`, { variant: "error" });
          } else {
            deleteResult = { ok: true, entityId };
            toast(`Deleted ${entityType} ${entityId}`, { variant: "success" });
          }
        } else if (entityType === "note") {
          const noteDeleteResult: { ok: boolean; error?: string } = await entityApi.deleteNote(entityId);
          executed.updater.add(node.id);
          if (!noteDeleteResult.ok) {
            reportAiPathsError(
              new Error(noteDeleteResult.error),
              { action: "deleteEntity", entityType, entityId, nodeId: node.id },
              "Database delete failed:",
            );
            toast(`Failed to delete ${entityType}.`, { variant: "error" });
          } else {
            deleteResult = { ok: true, entityId };
            toast(`Deleted ${entityType} ${entityId}`, { variant: "success" });
          }
        } else {
          toast("Custom deletes are not supported yet.", { variant: "error" });
          executed.updater.add(node.id);
          return {
            result: { ok: false },
            bundle: { ok: false, entityId },
            aiPrompt,
          };
        }
      }
    }

    return {
      result: deleteResult,
      bundle: deleteResult as Record<string, unknown>,
      aiPrompt,
    };
  }

  return { aiPrompt };
};

type FieldInfo = {
  name: string;
  type: string;
  isRequired?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  hasDefault?: boolean;
  relationTo?: string;
};

type CollectionSchema = {
  name: string;
  fields?: FieldInfo[];
  relations?: string[];
};

type SchemaResponse = {
  provider: "mongodb" | "prisma";
  collections: CollectionSchema[];
};

function formatSchemaAsText(schema: SchemaResponse): string {
  const lines: string[] = [
    "DATABASE SCHEMA",
    "===============",
    `Provider: ${schema.provider}`,
    "",
  ];

  for (const collection of schema.collections) {
    lines.push(`Collection: ${collection.name}`);
    lines.push("Fields:");
    for (const field of collection.fields ?? []) {
      const markers: string[] = [];
      if (field.isId) markers.push("ID");
      if (field.isRequired) markers.push("required");
      if (field.isUnique) markers.push("unique");
      if (field.hasDefault) markers.push("has default");
      const markerStr = markers.length > 0 ? ` [${markers.join(", ")}]` : "";
      lines.push(`  - ${field.name} (${field.type})${markerStr}`);
    }
    if (collection.relations && collection.relations.length > 0) {
      lines.push(`Relations: ${collection.relations.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function filterCollections(
  schema: SchemaResponse,
  selectedCollections: string[],
): SchemaResponse {
  if (!selectedCollections || selectedCollections.length === 0) {
    return schema;
  }
  const selectedSet = new Set(selectedCollections.map((c: string): string => c.toLowerCase()));
  return {
    ...schema,
    collections: schema.collections.filter((c: CollectionSchema): boolean =>
      selectedSet.has(c.name.toLowerCase()),
    ),
  };
}

export const handleDbSchema: NodeHandler = async ({ 
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.schema?.has(node.id)) return prevOutputs;

  const defaultConfig: DbSchemaConfig = {
    mode: "all",
    collections: [],
    includeFields: true,
    includeRelations: true,
    formatAs: "text",
  };

  const config: DbSchemaConfig = {
    ...defaultConfig,
    ...(node.config?.db_schema ?? {}),
  };

  const schemaResult = await dbApi.schema();
  if (!schemaResult.ok) {
    reportAiPathsError(
      new Error(schemaResult.error),
      { action: "fetchDbSchema", nodeId: node.id },
      "Database schema fetch failed:",
    );
    return {
      schema: null,
      context: null,
    };
  }

  const fullSchema = schemaResult.data as SchemaResponse;

  // Filter collections if mode is "selected"
  const schema =
    config.mode === "selected"
      ? filterCollections(fullSchema, config.collections ?? [])
      : fullSchema;

  // Optionally filter out fields or relations
  if (!config.includeFields || !config.includeRelations) {
    schema.collections = schema.collections.map((c: CollectionSchema): CollectionSchema => {
      const result: CollectionSchema = {
        name: c.name,
        fields: config.includeFields ? (c.fields ?? []) : [],
      };
      if (config.includeRelations && c.relations) {
        result.relations = c.relations;
      }
      return result;
    });
  }

  // Format for AI consumption
  const formatted =
    config.formatAs === "text"
      ? formatSchemaAsText(schema)
      : JSON.stringify(schema, null, 2);

  executed.schema?.add(node.id);

  return {
    schema: formatted,
    context: formatted,
  };
};