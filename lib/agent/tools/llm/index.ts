import prisma from "@/lib/prisma";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

type LLMContext = {
  model: string;
  runId: string;
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>;
  activeStepId?: string | null;
  stepLabel?: string | null;
};

const extractMessageContent = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  const message = (payload as { message?: { content?: unknown } }).message;
  return typeof message?.content === "string" ? message.content : "";
};

const parseJsonObject = (raw: string): unknown => {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch {
    return null;
  }
};

export const validateExtractionWithLLM = async (
  context: LLMContext,
  params: {
    prompt: string;
    url: string;
    extractionType: "product_names" | "emails";
    requiredCount: number;
    items: string[];
    domTextSample: string;
    targetHostname: string | null;
    evidence: Array<{ item: string; snippet: string }>;
  }
) => {
  const { model } = context;
  const {
    prompt,
    url,
    extractionType,
    requiredCount,
    items,
    domTextSample,
    targetHostname,
    evidence,
  } = params;

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You validate extraction results against the user goal. Return only JSON with keys: valid (boolean), acceptedItems (array), rejectedItems (array), issues (array of strings), missingCount (number), evidence (array of {item, snippet, reason}). Each accepted item must cite evidence from the provided snippets. If the URL hostname does not match targetHostname (when provided), mark valid=false. If stepLabel is provided, ensure accepted items align with that step context. For product_names, reject non-product UI text (cookies, headings, nav labels).",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              url,
              extractionType,
              requiredCount,
              items,
              domTextSample,
              targetHostname,
              evidence,
              stepId: context.activeStepId,
              stepLabel: context.stepLabel,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Extraction validation failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload);
    const parsed = parseJsonObject(content) as {
      acceptedItems?: unknown;
      rejectedItems?: unknown;
      issues?: unknown;
      missingCount?: unknown;
      valid?: unknown;
      evidence?: unknown;
    } | null;
    const acceptedItems = Array.isArray(parsed?.acceptedItems)
      ? parsed.acceptedItems.filter((item: unknown) => typeof item === "string")
      : [];
    const rejectedItems = Array.isArray(parsed?.rejectedItems)
      ? parsed.rejectedItems.filter((item: unknown) => typeof item === "string")
      : [];
    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.filter((item: unknown) => typeof item === "string")
      : [];
    const missingCount =
      typeof parsed?.missingCount === "number"
        ? parsed.missingCount
        : Math.max(0, requiredCount - acceptedItems.length);
    const valid =
      typeof parsed?.valid === "boolean"
        ? parsed.valid
        : acceptedItems.length >= requiredCount;
    return {
      valid,
      acceptedItems,
      rejectedItems,
      issues,
      missingCount,
      evidence: Array.isArray(parsed?.evidence) ? parsed.evidence : [],
    };
  } catch (error) {
    const fallbackAccepted = evidence.map((entry) => entry.item);
    return {
      valid: fallbackAccepted.length >= requiredCount,
      acceptedItems: fallbackAccepted,
      rejectedItems: items.filter((item) => !fallbackAccepted.includes(item)),
      issues: [
        `LLM validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
      missingCount: Math.max(0, requiredCount - fallbackAccepted.length),
      evidence,
    };
  }
};

export const normalizeExtractionItemsWithLLM = async (
  context: LLMContext,
  params: {
    prompt: string;
    extractionType: "product_names" | "emails";
    items: string[];
    normalizationModel?: string | null;
  }
) => {
  const { prompt, extractionType, items, normalizationModel } = params;
  if (!normalizationModel || items.length === 0) {
    return items;
  }
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: normalizationModel,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You clean extracted outputs. Return only JSON with key 'items' as an array of cleaned strings. Remove hashes, IDs, boilerplate, and duplicates. Keep original ordering where possible. For emails, return lowercase valid emails only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              extractionType,
              items,
            }),
          },
        ],
        options: { temperature: 0.1 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Output normalization failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload).trim();
    const parsed = parseJsonObject(content) as { items?: unknown } | null;
    const cleaned = Array.isArray(parsed?.items)
      ? parsed.items.filter((item: unknown) => typeof item === "string")
      : [];
    return cleaned.length > 0 ? cleaned : items;
  } catch {
    return items;
  }
};

export const inferSelectorsFromLLM = async (
  context: LLMContext,
  uiInventory: unknown,
  domTextSample: string,
  task: string,
  label: string,
  inferenceModel?: string | null
) => {
  const { runId, model, log, activeStepId } = context;
  if (!uiInventory) return [];
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: inferenceModel ?? model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a DOM selector expert. Return only JSON with a 'selectors' array. Use concise, robust CSS selectors.",
          },
          {
            role: "user",
            content: JSON.stringify({
              task,
              domTextSample,
              uiInventory,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`LLM selector inference failed (${response.status}).`);
    }
    const json = await response.json();
    const content = extractMessageContent(json);
    const parsed = parseJsonObject(content) as { selectors?: unknown } | null;
    const selectors = Array.isArray(parsed?.selectors)
      ? parsed.selectors.filter((selector: unknown) => typeof selector === "string")
      : [];
    if (log) {
      await log("info", "LLM selector inference completed.", {
        stepId: activeStepId ?? null,
        label,
        task,
        selectors,
      });
    }
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level: "info",
        message: "LLM selector inference completed.",
        metadata: {
          label,
          task,
          selectors,
          model: inferenceModel ?? model,
          stepId: activeStepId ?? null,
        },
      },
    });
    return selectors;
  } catch (error) {
    if (log) {
      await log("warning", "LLM selector inference failed.", {
        stepId: activeStepId ?? null,
        label,
        task,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return [];
  }
};

export const buildExtractionPlan = async (
  context: LLMContext,
  request: {
    type: "product_names" | "emails";
    domTextSample: string;
    uiInventory: unknown;
  },
  inferenceModel?: string | null
) => {
  const { runId, model, log, activeStepId } = context;
  if (!request.uiInventory) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: inferenceModel ?? model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are an extraction planner. Return only JSON with keys: target, fields, primarySelectors, fallbackSelectors, notes. target is the data entity. fields is an array of field names. primarySelectors/fallbackSelectors are arrays of CSS selectors.",
          },
          {
            role: "user",
            content: JSON.stringify({
              request: request.type,
              domTextSample: request.domTextSample,
              uiInventory: request.uiInventory,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Extraction planner failed (${response.status}).`);
    }
    const json = await response.json();
    const content = extractMessageContent(json);
    const parsed = parseJsonObject(content) as Record<string, unknown> | null;
    const primarySelectors = Array.isArray(parsed?.primarySelectors)
      ? parsed.primarySelectors.filter(
          (selector: unknown) => typeof selector === "string"
        )
      : [];
    const fallbackSelectors = Array.isArray(parsed?.fallbackSelectors)
      ? parsed.fallbackSelectors.filter(
          (selector: unknown) => typeof selector === "string"
        )
      : [];
    const plan = {
      target: typeof parsed?.target === "string" ? parsed.target : null,
      fields: Array.isArray(parsed?.fields)
        ? parsed.fields.filter((field: unknown) => typeof field === "string")
        : [],
      primarySelectors,
      fallbackSelectors,
      notes: typeof parsed?.notes === "string" ? parsed.notes : null,
    };
    if (log) {
      await log("info", "LLM extraction plan created.", {
        stepId: activeStepId ?? null,
        plan,
      });
    }
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level: "info",
        message: "LLM extraction plan created.",
        metadata: {
          plan,
          model: inferenceModel ?? model,
          stepId: activeStepId ?? null,
        },
      },
    });
    return plan;
  } catch (error) {
    if (log) {
      await log("warning", "LLM extraction plan failed.", {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const buildFailureRecoveryPlan = async (
  context: LLMContext,
  request: {
    type: "bad_selectors" | "login_stuck" | "missing_extraction";
    prompt: string;
    url: string;
    domTextSample: string;
    uiInventory: unknown;
    extractionPlan?: unknown;
    loginCandidates?: unknown;
  },
  inferenceModel?: string | null
) => {
  const { runId, model, log, activeStepId } = context;
  if (!request.uiInventory) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: inferenceModel ?? model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You recover failed web automation. Return only JSON with keys: reason, selectors, listingUrls, clickSelector, loginUrl, usernameSelector, passwordSelector, submitSelector, notes. Provide only fields relevant to the failure type.",
          },
          {
            role: "user",
            content: JSON.stringify({
              failureType: request.type,
              prompt: request.prompt,
              url: request.url,
              domTextSample: request.domTextSample,
              uiInventory: request.uiInventory,
              extractionPlan: request.extractionPlan ?? null,
              loginCandidates: request.loginCandidates ?? null,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Failure recovery planner failed (${response.status}).`);
    }
    const json = await response.json();
    const content = extractMessageContent(json);
    const parsed = parseJsonObject(content) as Record<string, unknown> | null;
    const selectors = Array.isArray(parsed?.selectors)
      ? parsed.selectors.filter((selector: unknown) => typeof selector === "string")
      : [];
    const listingUrls = Array.isArray(parsed?.listingUrls)
      ? parsed.listingUrls.filter((item: unknown) => typeof item === "string")
      : [];
    const plan = {
      reason: typeof parsed?.reason === "string" ? parsed.reason : null,
      selectors,
      listingUrls,
      clickSelector:
        typeof parsed?.clickSelector === "string" ? parsed.clickSelector : null,
      loginUrl: typeof parsed?.loginUrl === "string" ? parsed.loginUrl : null,
      usernameSelector:
        typeof parsed?.usernameSelector === "string"
          ? parsed.usernameSelector
          : null,
      passwordSelector:
        typeof parsed?.passwordSelector === "string"
          ? parsed.passwordSelector
          : null,
      submitSelector:
        typeof parsed?.submitSelector === "string" ? parsed.submitSelector : null,
      notes: typeof parsed?.notes === "string" ? parsed.notes : null,
    };
    if (log) {
      await log("info", "LLM failure recovery plan created.", {
        stepId: activeStepId ?? null,
        failureType: request.type,
        plan,
      });
    }
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level: "info",
        message: "LLM failure recovery plan created.",
        metadata: {
          failureType: request.type,
          plan,
          model: inferenceModel ?? model,
          stepId: activeStepId ?? null,
        },
      },
    });
    return plan;
  } catch (error) {
    if (log) {
      await log("warning", "LLM failure recovery plan failed.", {
        stepId: activeStepId ?? null,
        failureType: request.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const buildSearchQueryWithLLM = async (
  context: LLMContext,
  prompt: string
) => {
  const { model, log, activeStepId } = context;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You craft concise web search queries. Return only JSON with keys: query, intent.",
          },
          {
            role: "user",
            content: JSON.stringify({ prompt }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Search query inference failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload);
    const parsed = parseJsonObject(content) as Record<string, unknown> | null;
    const query =
      typeof parsed?.query === "string" ? parsed.query.trim() : "";
    return query || null;
  } catch (error) {
    if (log) {
      await log("warning", "LLM search query inference failed.", {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const pickSearchResultWithLLM = async (
  context: LLMContext,
  query: string,
  prompt: string,
  results: Array<{ title: string; url: string }>
) => {
  const { model, log, activeStepId } = context;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You select the best URL for the user task. Return only JSON with key: url.",
          },
          {
            role: "user",
            content: JSON.stringify({ query, prompt, results }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Search result selection failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload);
    const parsed = parseJsonObject(content) as Record<string, unknown> | null;
    const url = typeof parsed?.url === "string" ? parsed.url.trim() : "";
    return url || null;
  } catch (error) {
    if (log) {
      await log("warning", "LLM search result selection failed.", {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const decideSearchFirstWithLLM = async (
  context: LLMContext,
  prompt: string,
  targetUrl: string | null,
  hasExplicitUrl: boolean,
  memoryKey?: string | null,
  memoryValidationModel?: string | null,
  memorySummarizationModel?: string | null
) => {
  const { runId, model, log, activeStepId } = context;
  if (!prompt || hasExplicitUrl) return null;
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You decide whether to use web search before direct navigation. Return only JSON with keys: useSearchFirst (boolean), reason, query.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt,
              inferredUrl: targetUrl,
              hasExplicitUrl,
            }),
          },
        ],
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) {
      throw new Error(`Tool selection failed (${response.status}).`);
    }
    const payload = await response.json();
    const content = extractMessageContent(payload);
    const parsed = parseJsonObject(content) as Record<string, unknown> | null;
    const useSearchFirst = Boolean(parsed?.useSearchFirst);
    const query = typeof parsed?.query === "string" ? parsed.query.trim() : "";
    if (log) {
      await log("info", "Tool selection decision.", {
        stepId: activeStepId ?? null,
        decision: useSearchFirst ? "search-first" : "direct-navigation",
        reason: typeof parsed?.reason === "string" ? parsed.reason : null,
        query: query || null,
      });
    }
    
    // Note: Long-term memory logic from original file omitted here for simplicity
    // and to avoid circular dependencies if possible.
    // The calling function should handle long-term memory persistence if needed
    // or we can move the memory logic here if we import validateAndAddAgentLongTermMemory.
    
    await prisma.agentAuditLog.create({
      data: {
        runId,
        level: "info",
        message: "Tool selection decision.",
        metadata: {
          decision: useSearchFirst ? "search-first" : "direct-navigation",
          reason: typeof parsed?.reason === "string" ? parsed.reason : null,
          query: query || null,
          inferredUrl: targetUrl,
        },
      },
    });
    return { useSearchFirst, query: query || null, reason: parsed?.reason };
  } catch (error) {
    if (log) {
      await log("warning", "Tool selection decision failed.", {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};
