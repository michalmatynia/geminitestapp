import { DEFAULT_DB_QUERY } from "../../constants";
import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
  renderTemplate,
  safeStringify,
} from "../../utils";
import type { DbSchemaConfig } from "@/shared/types/ai-paths";
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
import type { NodeHandler } from "@/shared/types/ai-paths-runtime";
import type { DbQueryConfig } from "@/shared/types/ai-paths";

export const handleTrigger: NodeHandler = ({
  node,
  nodeInputs,
  triggerNodeId,
  triggerEvent,
  simulationEntityType,
  simulationEntityId,
  triggerContext,
  activePathId,
  resolvedEntity,
  fallbackEntityId,
  now,
}) => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }
  const eventName =
    triggerEvent ?? node.config?.trigger?.event ?? "path_generate_description";
  const simulation = coerceInput(nodeInputs.simulation) as
    | { entityId?: string; entityType?: string; productId?: string }
    | undefined;
  const simulationInputId =
    simulation?.entityId ?? simulation?.productId ?? null;
  const simulationInputType =
    simulation?.entityType ?? simulationEntityType ?? null;
  const resolvedEntityId = simulationInputId ?? null;
  const resolvedEntityType = simulationInputType ?? null;
  const triggerExtras = (triggerContext ?? {});
  const triggerEntityId =
    typeof triggerExtras.entityId === "string"
      ? triggerExtras.entityId
      : typeof triggerExtras.productId === "string"
        ? triggerExtras.productId
        : null;
  const triggerEntityType =
    typeof triggerExtras.entityType === "string"
      ? triggerExtras.entityType
      : null;
  const effectiveEntityId = resolvedEntityId ?? triggerEntityId ?? null;
  const effectiveEntityType = resolvedEntityType ?? triggerEntityType ?? null;
  const resolvedContext: Record<string, unknown> = {
    entityType: resolvedEntityType ?? triggerEntityType,
    entityId: resolvedEntityId ?? triggerEntityId,
    source: node.title,
    timestamp: now,
    entity: resolvedEntity ?? buildFallbackEntity(effectiveEntityId ?? fallbackEntityId),
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
      entityId: effectiveEntityId ?? (resolvedContext.entityId as string | null),
      entityType: effectiveEntityType ?? (resolvedContext.entityType as string | null),
      ui: triggerExtras.ui ?? (resolvedContext.ui),
      location: triggerExtras.location ?? (resolvedContext.location),
      source: triggerExtras.source ?? (resolvedContext.source as string | null) ?? node.title,
      user: triggerExtras.user ?? (resolvedContext.user),
      event: triggerExtras.event ?? (resolvedContext.event),
      extras: triggerExtras.extras ?? (resolvedContext.extras),
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
}) => {
  if (executed.notification.has(node.id)) return prevOutputs;
  const hasMeaningfulValue = (value: unknown) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  };
  const promptCandidates = edges
    .filter((edge) => edge.to === node.id && edge.toPort === "prompt")
    .map((edge) => ({
      edge,
      fromNode: nodes.find((item) => item.id === edge.from),
    }))
    .filter((entry) => entry.fromNode?.type === "prompt");
  const promptSourceNode = promptCandidates[0]?.fromNode ?? null;
  let derivedPromptMessage: string | null = null;
  if (promptSourceNode) {
    const upstreamEdges = edges.filter(
      (edge) => edge.to === promptSourceNode.id
    );
    const promptSourceInputs = allInputs[promptSourceNode.id] ?? {};
    if (upstreamEdges.length > 0) {
      const hasInputValue = Object.values(promptSourceInputs).some(
        hasMeaningfulValue
      );
      if (!hasInputValue) {
        return prevOutputs;
      }
    }
    const derivedPrompt = buildPromptOutput(
      promptSourceNode.config?.prompt,
      promptSourceInputs
    );
    if (derivedPrompt.promptOutput?.trim()) {
      derivedPromptMessage = derivedPrompt.promptOutput;
    }
  }
  const messageSource =
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
  const message = safeStringify(messageSource); // Was formatRuntimeValue, but safeStringify might be better for generic
  const trimmed = message.trim();
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
}) => {
  if (deferPoll) {
    const existingStatus =
      typeof prevOutputs.status === "string" ? prevOutputs.status : null;
    if (existingStatus === "completed" || existingStatus === "failed") {
      return prevOutputs;
    }
    const rawJobId = coerceInput(nodeInputs.jobId);
    const jobId =
      typeof rawJobId === "string" || typeof rawJobId === "number"
        ? String(rawJobId).trim()
        : "";
    if (!jobId) {
      return prevOutputs;
    }
    const existingResult =
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
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "pollDatabase", nodeId: node.id },
        "Database polling failed:"
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
    const result = await pollGraphJob(jobId, {
      intervalMs: pollConfig.intervalMs,
      maxAttempts: pollConfig.maxAttempts,
    });
    return {
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
  executed,
  reportAiPathsError,
}) => {
  if (executed.http.has(node.id)) return {}; // Http should run only once usually in the loop or should it?
  // Logic says: if (httpExecuted.has(node.id)) break;
  // But wait, the loop runs multiple times for propagation. If HTTP node runs once, its outputs are set.
  // Next iterations should keep the outputs.
  // My return here `return {}` would clear outputs if I am not careful.
  // NodeHandler should return `prevOutputs` if it doesn't want to change anything.
  // Wait, `httpExecuted` check in original code:
  /*
    case "http": {
      if (httpExecuted.has(node.id)) break;
      // ... logic ...
      httpExecuted.add(node.id);
    }
  */
  // So if executed, it breaks, meaning nextOutputs remains prevOutputs.
  // So I should return prevOutputs (which I need to access from context).
  // But wait, `NodeHandler` receives `prevOutputs`.
  // So if I return `prevOutputs`, it's correct.
  // However, I need to check `executed.http.has(node.id)`.

  // Correction: I need to return prevOutputs.
  // I'll update the logic below.
  
  // Actually, I can check executed set at start of function.
  // If executed, return prevOutputs.
  
  // Let's implement that.
  
  // Same for other "once" nodes like notification, updater.
  
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
    return { value: null, bundle: { ok: false, status: 0, error: "Missing URL" } };
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
        data = await res.json() as unknown;
      } catch {
        data = await res.text();
      }
    }
    let resolvedValue = data;
    if (httpConfig.responsePath) {
      const pathValue = getValueAtMappingPath(data, httpConfig.responsePath);
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
  } catch (error) {
    reportAiPathsError(
      error,
      { action: "httpFetch", url: resolvedUrl, nodeId: node.id },
      "HTTP fetch failed:"
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
  executed,
  reportAiPathsError,
  toast,
  simulationEntityType,
  simulationEntityId,
}) => {
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
  const aiPrompt = dbConfig.aiPrompt ?? "";

  if (operation === "query") {
    const inputQuery = coerceInput(nodeInputs.query);
    const callbackInput = coerceInput(nodeInputs.callback);
    const aiQueryInput = coerceInput(nodeInputs.aiQuery);
    const resolvedEntityId = resolveEntityIdFromInputs(nodeInputs, undefined, simulationEntityType, simulationEntityId);
    const inputValue = coerceInput(nodeInputs.value);
    const entityIdInput = coerceInput(nodeInputs.entityId);
    const productIdInput = coerceInput(nodeInputs.productId);
    const _entityId = entityIdInput ?? resolvedEntityId;
    let query: Record<string, unknown> = {};

    // Priority 1: AI-generated query from model output
    if (aiQueryInput !== undefined && aiQueryInput !== null) {
      let parsedAiQuery: Record<string, unknown> | null = null;

      if (typeof aiQueryInput === "string") {
        // Try to extract JSON from AI response (may have markdown code blocks)
        const jsonMatch = aiQueryInput.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1]!.trim() : aiQueryInput.trim();
        parsedAiQuery = parseJsonSafe(jsonStr) as Record<string, unknown> | null;
      } else if (typeof aiQueryInput === "object" && !Array.isArray(aiQueryInput)) {
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
        toast("AI query could not be parsed as valid JSON.", { variant: "error" });
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
    } else if (queryConfig.mode === "preset") {
      const presetValue =
        queryConfig.preset === "by_productId"
          ? productIdInput ?? inputValue
          : queryConfig.preset === "by_entityId"
            ? entityIdInput ?? inputValue ?? resolvedEntityId
            : inputValue ?? resolvedEntityId ?? entityIdInput ?? productIdInput;
      if (presetValue !== undefined) {
        let field =
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
          !looksLikeObjectId(presetValue)
        ) {
          field = "id";
        }
        query = { [field]: presetValue };
      } else {
        toast("Database query needs an ID/value input.", { variant: "error" });
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
    } else if (inputQuery && typeof inputQuery === "object") {
      query = inputQuery as Record<string, unknown>;
    } else {
      const templateToUse = (typeof callbackInput === "string" && callbackInput.trim())
        ? callbackInput
        : (queryConfig.queryTemplate ?? "{}");
        
      const rendered = renderTemplate(
        templateToUse,
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
        },
        aiPrompt,
      };
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
      const data = (await res.json() as unknown) as {
        items?: unknown[];
        item?: unknown;
        count?: number;
      };
      const result = queryConfig.single ? data.item ?? null : data.items ?? [];
      return {
        result,
        bundle: {
          count:
            data.count ?? (Array.isArray(result) ? result.length : result ? 1 : 0),
          query,
          collection: queryConfig.collection,
        },
        aiPrompt,
      };
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "dbQuery", collection: queryConfig.collection, query },
        "Database query failed:"
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
    const trimStrings = dbConfig.trimStrings ?? false;
    const skipEmpty = dbConfig.skipEmpty ?? false;
    const isEmptyValue = (value: unknown) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);
    const updates: Record<string, unknown> = {};
    mappings.forEach((mapping) => {
      const sourcePort = mapping.sourcePort;
      if (!sourcePort) return;
      const sourceValue = nodeInputs[sourcePort];
      if (sourceValue === undefined) return;
      let value = coerceInput(sourceValue);
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
        const resultValue = (value as Record<string, unknown>).result;
        const descriptionValue = (value as Record<string, unknown>).description;
        const contentValue = (value as Record<string, unknown>).content_en;
        value =
          resultValue ??
          descriptionValue ??
          contentValue ??
          value;
      }
      if (typeof value === "string" && trimStrings) {
        value = value.trim();
      }
      if (skipEmpty && isEmptyValue(value)) {
        return;
      }
      if (mapping.targetPath) {
        updates[mapping.targetPath] = value;
      }
    });
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const idField = dbConfig.idField ?? "entityId";
    const entityId = resolveEntityIdFromInputs(nodeInputs, idField, simulationEntityType, simulationEntityId);
    const hasUpdates = Object.keys(updates).length > 0;
    const needsEntityId = entityType !== "custom";
    let updateResult: unknown = updates;

    if (hasUpdates && needsEntityId && !entityId && !executed.updater.has(node.id)) {
      reportAiPathsError(
        new Error("Database update missing entity id"),
        { action: "updateEntity", nodeId: node.id },
        "Database update missing entity id:"
      );
      toast("Database update node needs an entity ID input.", { variant: "error" });
      executed.updater.add(node.id);
    }

    if (hasUpdates && (!needsEntityId || entityId) && !executed.updater.has(node.id)) {
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
          updateResult = await (res.json() as Promise<unknown>).catch(() => updates);
          executed.updater.add(node.id);
          const suffix = entityId ? ` ${entityId}` : "";
          toast(`Updated ${entityType}${suffix}`, { variant: "success" });
        } catch (error) {
          reportAiPathsError(
            error,
            { action: "updateEntity", entityType, entityId, nodeId: node.id },
            "Database update failed:"
          );
          toast(`Failed to update ${entityType}.`, { variant: "error" });
          executed.updater.add(node.id);
        }
      }
    }

    const primaryTarget =
      mappings.find((mapping) => mapping.targetPath)?.targetPath ?? fallbackTarget;
    const primaryValue = updates[primaryTarget];
    return {
      content_en:
        primaryTarget === "content_en"
          ? (primaryValue as string | undefined) ??
            (nodeInputs.result
              ? safeStringify(coerceInput(nodeInputs.result)) // using safeStringify instead of formatRuntimeValue for consistency with imports
              : nodeInputs.content_en) ??
            ""
          : (nodeInputs.result
              ? safeStringify(coerceInput(nodeInputs.result))
              : nodeInputs.content_en) ?? "",
      bundle: updates,
      result: updateResult,
      aiPrompt,
    };
  }

  if (operation === "insert") {
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const writeSource = dbConfig.writeSource ?? "bundle";
    const rawPayload = coerceInput(nodeInputs[writeSource]);
    const callbackInput = coerceInput(nodeInputs.queryCallback);
    // I need coercePayloadObject from runtime/utils
    // I need to import it. I'll add it to imports.
    // For now I'll use a local helper or assume I added it.
    // Wait, I missed importing coercePayloadObject in the file header.
    // I'll fix imports after this.
    // Assuming it's available as imported.
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
    
    let payload = coercePayloadObject(rawPayload);
    if (payload && writeSourcePath) {
      const resolved = getValueAtMappingPath(payload, writeSourcePath);
      payload = coercePayloadObject(resolved);
    }
    
    // Callback injection for insert: if callback is an object, merge it or use it as payload
    if (callbackInput && typeof callbackInput === "object" && !Array.isArray(callbackInput)) {
      payload = { ...(payload ?? {}), ...(callbackInput as Record<string, unknown>) };
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
            executed.updater.add(node.id);
            return {
              result: payload,
              bundle: payload,
              aiPrompt,
            };
          }
          if (!res.ok) {
            throw new Error("Failed to insert entity.");
          }
          insertResult = await (res.json() as Promise<unknown>).catch(() => payload);
          executed.updater.add(node.id);
          toast(`Inserted ${entityType}`, { variant: "success" });
        } catch (error) {
          reportAiPathsError(
            error,
            { action: "insertEntity", entityType, nodeId: node.id },
            "Database insert failed:"
          );
          toast(`Failed to insert ${entityType}.`, { variant: "error" });
          executed.updater.add(node.id);
        }
      }
    }

    return {
      result: insertResult,
      bundle: insertResult as Record<string, unknown>,
      content_en:
        typeof (insertResult as Record<string, unknown>)?.content_en === "string"
          ? ((insertResult as Record<string, unknown>).content_en as string)
          : undefined,
      aiPrompt,
    };
  }

  if (operation === "delete") {
    const entityType = (dbConfig.entityType ?? "product").trim().toLowerCase();
    const idField = dbConfig.idField ?? "entityId";
    const entityId = resolveEntityIdFromInputs(nodeInputs, idField, simulationEntityType, simulationEntityId);
    if (!entityId) {
      reportAiPathsError(
        new Error("Database delete missing entity id"),
        { action: "deleteEntity", nodeId: node.id },
        "Database delete missing entity id:"
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
            executed.updater.add(node.id);
            return {
              result: { ok: false },
              bundle: { ok: false, entityId },
              aiPrompt,
            };
          }
          if (!res.ok && res.status !== 204) {
            throw new Error("Failed to delete entity.");
          }
          deleteResult = { ok: true, entityId };
          executed.updater.add(node.id);
          toast(`Deleted ${entityType} ${entityId}`, { variant: "success" });
        } catch (error) {
          reportAiPathsError(
            error,
            { action: "deleteEntity", entityType, entityId, nodeId: node.id },
            "Database delete failed:"
          );
          toast(`Failed to delete ${entityType}.`, { variant: "error" });
          executed.updater.add(node.id);
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
  fields: FieldInfo[];
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
    for (const field of collection.fields) {
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
  selectedCollections: string[]
): SchemaResponse {
  if (!selectedCollections || selectedCollections.length === 0) {
    return schema;
  }
  const selectedSet = new Set(selectedCollections.map((c) => c.toLowerCase()));
  return {
    ...schema,
    collections: schema.collections.filter((c) =>
      selectedSet.has(c.name.toLowerCase())
    ),
  };
}

export const handleDbSchema: NodeHandler = async ({
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
}) => {
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

  try {
    const res = await fetch("/api/databases/schema");
    if (!res.ok) {
      throw new Error(`Schema API returned ${res.status}`);
    }

    const fullSchema = (await res.json()) as SchemaResponse;

    // Filter collections if mode is "selected"
    const schema =
      config.mode === "selected"
        ? filterCollections(fullSchema, config.collections)
        : fullSchema;

    // Optionally filter out fields or relations
    if (!config.includeFields || !config.includeRelations) {
      schema.collections = schema.collections.map((c) => {
        const result: CollectionSchema = {
          name: c.name,
          fields: config.includeFields ? c.fields : [],
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
  } catch (error) {
    reportAiPathsError(
      error,
      { action: "fetchDbSchema", nodeId: node.id },
      "Database schema fetch failed:"
    );
    return {
      schema: null,
      context: null,
    };
  }
};
