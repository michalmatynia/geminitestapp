import {
  cloneValue,
  coerceInput,
  coerceInputArray,
  getValueAtMappingPath,
  hashRuntimeValue,
  normalizeMappingPath,
  parseJsonSafe,
  renderTemplate,
  safeStringify,
  setValueAtMappingPath,
} from "../../utils";
import { buildFallbackEntity, resolveContextPayload } from "../utils";
import type { NodeHandler, NodeHandlerContext } from "@/shared/types/ai-paths-runtime";
import type { RegexConfig, RuntimePortValues } from "@/shared/types/ai-paths";

export const handleContext: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  now,
  simulationEntityId,
  simulationEntityType,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const rawContext = coerceInput(nodeInputs.context);
  const inputContext =
    rawContext && typeof rawContext === "object"
      ? (rawContext as Record<string, unknown>)
      : null;
  const payload = await resolveContextPayload(
    node.config?.context ?? { role: "entity" },
    inputContext,
    simulationEntityType,
    simulationEntityId,
    now,
    fetchEntityCached
  );
  const resolvedContext = {
    ...payload.context,
    source: (payload.context?.source as string | undefined) ?? node.title,
  };
  return {
    context: resolvedContext,
    entityId: payload.entityId,
    entityType: payload.entityType,
    entityJson: payload.scopedEntity,
  };
};

export const handleParser: NodeHandler = ({
  node,
  nodeInputs,
  resolvedEntity,
  fallbackEntityId,
}: NodeHandlerContext): RuntimePortValues => {
  const contextInput = coerceInput(nodeInputs.context);
  const contextEntity =
    contextInput && typeof contextInput === "object"
      ? ((contextInput as Record<string, unknown>).entity as
          | Record<string, unknown>
          | undefined) ??
        ((contextInput as Record<string, unknown>).entityJson as
          | Record<string, unknown>
          | undefined) ??
        ((contextInput as Record<string, unknown>).product as
          | Record<string, unknown>
          | undefined)
      : undefined;
  const source =
    (coerceInput(nodeInputs.entityJson) as Record<string, unknown> | undefined) ??
    contextEntity ??
    (resolvedEntity ?? undefined) ??
    (fallbackEntityId ? buildFallbackEntity(fallbackEntityId) : undefined);

  if (!source) {
    return {};
  }
  const parserConfig = node.config?.parser;
  const mappings = parserConfig?.mappings ?? {};
  const outputMode = parserConfig?.outputMode ?? "individual";
  const hasMappings = Object.keys(mappings).some((key: string): boolean => !!key.trim());
  const isEmptyValue = (value: unknown): boolean =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  
  const fallbackForKey = (key: string): unknown => {
    const normalized = key.trim().toLowerCase();
    if (normalized === "title" || normalized === "name") {
      return (
        source["title"] ??
        source["name"] ??
        source["name_en"] ??
        source["name_pl"] ??
        source["label"] ??
        source["productName"]
      );
    }
    if (normalized === "images" || normalized === "imageurls") {
      return (
        source["images"] ??
        source["imageLinks"] ??
        source["media"] ??
        source["gallery"] ??
        source["imageFiles"] ??
        source["photos"]
      );
    }
    if (
      normalized === "productid" ||
      normalized === "entityid" ||
      normalized === "id"
    ) {
      return (
        source["id"] ??
        source["_id"] ??
        source["productId"] ??
        source["entityId"]
      );
    }
    if (normalized === "content_en" || normalized === "description_en") {
      return (
        source["content_en"] ??
        source["description_en"] ??
        source["description"] ??
        source["content"]
      );
    }
    return undefined;
  };

  const parsed: RuntimePortValues = {};
  Object.keys(mappings).forEach((output: string): void => {
    const key = output.trim();
    if (!key) return;
    const mapping = mappings[output]?.trim() ?? "";
    const value = mapping
      ? getValueAtMappingPath(source, mapping)
      : source[key];
    const resolved =
      isEmptyValue(value) ? fallbackForKey(key) ?? value : value;
    if (resolved !== undefined) {
      parsed[key] = resolved;
    }
  });

  if (outputMode === "bundle") {
    if (!hasMappings || Object.keys(parsed).length === 0) {
      const fullBundle =
        typeof source === "object" && source !== null ? source : {};
      return { bundle: fullBundle };
    }
    const extraOutputs = node.outputs.reduce<Record<string, unknown>>((acc: Record<string, unknown>, output: string): Record<string, unknown> => {
      if (output !== "bundle" && parsed[output] !== undefined) {
        acc[output] = parsed[output];
      }
      return acc;
    }, {});
    return { bundle: parsed, ...extraOutputs };
  } else {
    return parsed;
  }
};

export const handleMapper: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context ?? nodeInputs.result) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const mapperConfig = node.config?.mapper ?? {
    outputs: node.outputs,
    mappings: {},
  };
  const mapped: RuntimePortValues = {};
  mapperConfig.outputs.forEach((output: string): void => {
    const mapping = mapperConfig.mappings?.[output]?.trim() ?? "";
    const value = mapping
      ? getValueAtMappingPath(contextValue, mapping)
      : getValueAtMappingPath(contextValue, output);
    if (value !== undefined) {
      mapped[output] = value;
    }
  });
  return mapped;
};

export const handleMutator: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const mutatorConfig = node.config?.mutator ?? {
    path: "entity.title",
    valueTemplate: "{{value}}",
  };
  const targetPath = normalizeMappingPath(mutatorConfig.path ?? "", contextValue);
  if (!targetPath) {
    return { context: contextValue };
  }
  const currentValue = getValueAtMappingPath(contextValue, targetPath);
  const rendered = renderTemplate(
    mutatorConfig.valueTemplate ?? "{{value}}",
    { ...contextValue, ...nodeInputs } as Record<string, unknown>,
    currentValue
  );
  const updated = cloneValue(contextValue);
  setValueAtMappingPath(updated, targetPath, rendered);
  return { context: updated };
};

export const handleValidator: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const contextValue = coerceInput(nodeInputs.context) as
    | Record<string, unknown>
    | undefined;
  if (!contextValue) {
    return {};
  }
  const validatorConfig = node.config?.validator ?? {
    requiredPaths: ["entity.id"],
    mode: "all",
  };
  const required = (validatorConfig.requiredPaths ?? []).map((path: string): string | null =>
    normalizeMappingPath(path, contextValue)
  );
  const missing = required.filter((path: string | null): boolean => {
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
  return {
    context: contextValue,
    valid,
    errors: missing as string[],
  };
};

type RegexMatchRecord = {
  input: string;
  match: string | null;
  index: number | null;
  captures: string[];
  groups: Record<string, string> | null;
  key: string;
  extracted: unknown;
};

const normalizeRegexFlags = (flags: string | undefined): string => {
  if (!flags) return "";
  const allowed = new Set(["d", "g", "i", "m", "s", "u", "v", "y"]);
  const seen = new Set<string>();
  const normalized = Array.from(flags)
    .filter((ch: string) => allowed.has(ch))
    .filter((ch: string) => {
      if (seen.has(ch)) return false;
      seen.add(ch);
      return true;
    });
  // Stable-ish ordering to avoid churn.
  const order = ["d", "g", "i", "m", "s", "u", "v", "y"];
  normalized.sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b));
  return normalized.join("");
};

const buildRegexItems = (value: unknown, splitLines: boolean): string[] => {
  const rawValues = coerceInputArray(value);
  const strings = rawValues.flatMap((item: unknown): string[] => {
    if (item === undefined || item === null) return [];
    const asString = typeof item === "string" ? item : safeStringify(item);
    if (!asString) return [];
    if (!splitLines) return [asString];
    return asString
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  });
  return strings;
};

const resolveRegexSelection = (
  match: RegExpExecArray,
  selector: string | undefined
): unknown => {
  const key = (selector ?? "match").trim();
  if (!key || key === "match" || key === "0") {
    return match[0] ?? null;
  }
  if (key === "captures") {
    return match.slice(1).map((value: string | undefined) => value ?? "");
  }
  const rawGroups =
    match.groups && typeof match.groups === "object"
      ? (match.groups as Record<string, unknown>)
      : null;
  const groups =
    rawGroups
      ? (Object.fromEntries(
          Object.entries(rawGroups).map(([name, value]: [string, unknown]) => [
            name,
            typeof value === "string" ? value : value === undefined || value === null ? "" : safeStringify(value),
          ])
        ) as Record<string, string>)
      : null;
  if (key === "groups") {
    return groups;
  }
  const asIndex = Number(key);
  if (Number.isInteger(asIndex)) {
    return match[asIndex] ?? null;
  }
  const candidate = rawGroups ? rawGroups[key] : undefined;
  if (typeof candidate === "string") return candidate;
  if (candidate === undefined || candidate === null) return null;
  return safeStringify(candidate);
};

const parseRegexExtractedJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(parseRegexExtractedJson);
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const parsed = parseJsonSafe(trimmed);
  return parsed === undefined ? value : parsed;
};

const resolveGroupKey = (
  match: RegExpExecArray,
  groupBy: string | undefined
): string | null => {
  const selected = resolveRegexSelection(match, groupBy);
  if (selected === undefined || selected === null) return null;
  if (typeof selected === "string") return selected;
  return safeStringify(selected);
};

export const handleRegex: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const regexConfig: RegexConfig = node.config?.regex ?? {
    pattern: "",
    flags: "g",
    mode: "group",
    matchMode: "first",
    groupBy: "match",
    outputMode: "object",
    includeUnmatched: true,
    unmatchedKey: "__unmatched__",
    splitLines: true,
    sampleText: "",
    aiPrompt: "",
  };

  const rawInput = nodeInputs.value ?? nodeInputs.prompt;
  const splitLines = regexConfig.splitLines ?? true;
  const items = buildRegexItems(rawInput, splitLines);

  const pattern = (regexConfig.pattern ?? "").trim();
  const flags = normalizeRegexFlags(regexConfig.flags);
  const mode = regexConfig.mode ?? "group";
  const isExtractMode = mode === "extract" || mode === "extract_json";
  const matchMode = regexConfig.matchMode ?? "first";
  const groupBy = regexConfig.groupBy ?? "match";
  const includeUnmatched = regexConfig.includeUnmatched ?? true;
  const unmatchedKey = (regexConfig.unmatchedKey ?? "__unmatched__").trim() || "__unmatched__";

  const textForPrompt =
    typeof rawInput === "string" ? rawInput : items.join("\n");
  const aiPromptTemplate = regexConfig.aiPrompt ?? "";
  const aiPrompt = aiPromptTemplate.trim()
    ? renderTemplate(
        aiPromptTemplate,
        { ...nodeInputs, text: textForPrompt, lines: items } as Record<string, unknown>,
        textForPrompt
      )
    : "";
  const aiAutoRun = regexConfig.aiAutoRun ?? false;

  if (!pattern) {
    const emptyGrouped = regexConfig.outputMode === "array" ? [] : {};
    return {
      grouped: emptyGrouped,
      matches: [],
      value: isExtractMode ? null : emptyGrouped,
      ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
    };
  }

  let compiled: RegExp;
  try {
    compiled = new RegExp(pattern, flags);
  } catch {
    const emptyGrouped = regexConfig.outputMode === "array" ? [] : {};
    return {
      grouped: emptyGrouped,
      matches: [],
      value: isExtractMode ? null : emptyGrouped,
      ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
    };
  }

  const matches: RegexMatchRecord[] = [];
  const groupedMap = new Map<string, RegexMatchRecord[]>();

  const pushGrouped = (key: string, record: RegexMatchRecord): void => {
    const current = groupedMap.get(key) ?? [];
    current.push(record);
    groupedMap.set(key, current);
  };

  items.forEach((input: string) => {
    if (matchMode === "all") {
      const flagsWithG = compiled.flags.includes("g") ? compiled.flags : `${compiled.flags}g`;
      const regexAll = new RegExp(compiled.source, flagsWithG);
      let found = false;
      let match: RegExpExecArray | null;
      while ((match = regexAll.exec(input)) !== null) {
        found = true;
        const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
        const groups =
          match.groups && typeof match.groups === "object"
            ? (Object.fromEntries(
                Object.entries(match.groups).map(([k, v]: [string, unknown]) => [k, safeStringify(v)])
              ) as Record<string, string>)
            : null;
        const extracted =
          mode === "extract_json"
            ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy))
            : resolveRegexSelection(match, groupBy);
        const record: RegexMatchRecord = {
          input,
          match: match[0] ?? null,
          index: typeof match.index === "number" ? match.index : null,
          captures: match.slice(1).map((value: string | undefined) => value ?? ""),
          groups,
          key,
          extracted,
        };
        matches.push(record);
        pushGrouped(key, record);
        // Avoid infinite loops on zero-length matches.
        if (match[0] === "") {
          regexAll.lastIndex = Math.min(input.length, regexAll.lastIndex + 1);
        }
      }
      if (!found && includeUnmatched) {
        const record: RegexMatchRecord = {
          input,
          match: null,
          index: null,
          captures: [],
          groups: null,
          key: unmatchedKey,
          extracted: null,
        };
        matches.push(record);
        pushGrouped(unmatchedKey, record);
      }
      return;
    }

    // matchMode === "first"
    compiled.lastIndex = 0;
    const match = compiled.exec(input);
    if (!match) {
      if (!includeUnmatched) return;
      const record: RegexMatchRecord = {
        input,
        match: null,
        index: null,
        captures: [],
        groups: null,
        key: unmatchedKey,
        extracted: null,
      };
      matches.push(record);
      pushGrouped(unmatchedKey, record);
      return;
    }
    const key = resolveGroupKey(match, groupBy) ?? unmatchedKey;
    const groups =
      match.groups && typeof match.groups === "object"
        ? (Object.fromEntries(
            Object.entries(match.groups).map(([k, v]: [string, unknown]) => [k, safeStringify(v)])
          ) as Record<string, string>)
        : null;
    const extracted =
      mode === "extract_json"
        ? parseRegexExtractedJson(resolveRegexSelection(match, groupBy))
        : resolveRegexSelection(match, groupBy);
    const record: RegexMatchRecord = {
      input,
      match: match[0] ?? null,
      index: typeof match.index === "number" ? match.index : null,
      captures: match.slice(1).map((value: string | undefined) => value ?? ""),
      groups,
      key,
      extracted,
    };
    matches.push(record);
    pushGrouped(key, record);
  });

  const groupedObject = Object.fromEntries(groupedMap.entries());
  const grouped =
    regexConfig.outputMode === "array"
      ? Object.entries(groupedObject).map(([key, items]: [string, RegexMatchRecord[]]) => ({ key, items }))
      : groupedObject;
  const extractedValues = matches
    .filter((record: RegexMatchRecord): boolean => record.match !== null)
    .map((record: RegexMatchRecord): unknown => cloneValue(record.extracted));
  const extractedValue =
    extractedValues.length <= 1 ? (extractedValues[0] ?? null) : extractedValues;

  return {
    grouped,
    matches,
    value: isExtractMode ? extractedValue : grouped,
    ...(aiAutoRun && aiPrompt ? { aiPrompt } : {}),
  };
};

const coerceIteratorItems = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value as unknown[];

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const parsed = parseJsonSafe(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      const nested = record.items ?? record.values ?? record.rows ?? record.results;
      if (Array.isArray(nested)) return nested as unknown[];
    }
    // Fallback: treat as newline-delimited list.
    return trimmed
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested = record.items ?? record.values ?? record.rows ?? record.results;
    if (Array.isArray(nested)) return nested as unknown[];
  }

  return [value];
};

export const handleIterator: NodeHandler = ({ nodeInputs, prevOutputs, now }: NodeHandlerContext): RuntimePortValues => {
  const iterableInput = nodeInputs.value;
  const callbackInput = coerceInput(nodeInputs.callback);

  const items = coerceIteratorItems(iterableInput);
  const total = items.length;
  const itemsHash = hashRuntimeValue(items);

  const prevItemsHash = typeof prevOutputs.itemsHash === "string" ? prevOutputs.itemsHash : "";
  const prevIndex = typeof prevOutputs.index === "number" && Number.isFinite(prevOutputs.index) ? prevOutputs.index : 0;
  const prevLastAckHash = typeof prevOutputs.lastAckHash === "string" ? prevOutputs.lastAckHash : "";
  const prevAdvanceStamp = typeof prevOutputs.advanceStamp === "string" ? prevOutputs.advanceStamp : "";

  let index = prevItemsHash && prevItemsHash === itemsHash ? prevIndex : 0;
  const lastAckHash = prevItemsHash && prevItemsHash === itemsHash ? prevLastAckHash : "";
  const advanceStamp = prevItemsHash && prevItemsHash === itemsHash ? prevAdvanceStamp : "";

  // Clamp to sane bounds.
  if (!Number.isFinite(index) || index < 0) index = 0;
  if (index > total) index = total;

  const hasCallback = callbackInput !== undefined && callbackInput !== null;
  const callbackHash = hasCallback ? hashRuntimeValue(callbackInput) : "";
  const isNewAck = Boolean(callbackHash) && callbackHash !== lastAckHash;

  // Nothing to iterate.
  if (total === 0) {
    return {
      value: null,
      index: 0,
      total: 0,
      done: true,
      status: "idle",
      itemsHash,
      lastAckHash,
      advanceStamp: "",
    };
  }

  // Completed.
  if (index >= total) {
    return {
      value: null,
      index,
      total,
      done: true,
      status: "completed",
      itemsHash,
      lastAckHash,
      advanceStamp: "",
    };
  }

  // Advance when callback is observed (and changed vs lastAckHash).
  if (isNewAck) {
    const nextIndex = index + 1;
    const done = nextIndex >= total;
    return {
      value: null,
      index: nextIndex,
      total,
      done,
      status: done ? "completed" : "advance_pending",
      itemsHash,
      lastAckHash: callbackHash,
      // Prevent stepping multiple times in a single evaluateGraph call (engine has inner iterations).
      advanceStamp: now,
    };
  }

  // If we advanced earlier in this evaluateGraph call, hold "advance_pending" until the next call.
  // This prevents the engine's inner iteration loop from emitting the next item without downstream
  // nodes being able to re-run (they're tracked via `executed.*` sets per evaluateGraph call).
  if (prevOutputs.status === "advance_pending" && advanceStamp === now) {
    return {
      value: null,
      index,
      total,
      done: false,
      status: "advance_pending",
      itemsHash,
      lastAckHash,
      advanceStamp,
    };
  }

  // Emit current item and wait for callback.
  return {
    value: items[index],
    index,
    total,
    done: false,
    status: "waiting_callback",
    itemsHash,
    lastAckHash,
    advanceStamp: "",
  };
};
