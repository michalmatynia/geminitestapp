import type { JsonPathEntry } from "@/types/ai-paths";
import { cloneValue } from "./runtime";

export const extractJsonPathEntries = (value: unknown, maxDepth = 2) => {
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

export const extractJsonPaths = (value: unknown, maxDepth = 2) => {
  return extractJsonPathEntries(value, maxDepth).map((entry) => entry.path);
};

export const buildTopLevelMappings = (value: unknown) => {
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

export const normalizeMappingPath = (path: string, root?: unknown) => {
  if (!path) return "";
  let next = path.trim();
  if (next.startsWith("$.")) {
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

export const parsePathTokens = (path: string) => {
  const tokens: Array<string | number> = [];
  const regex = /([^[.]]+)|[[](\d+)]/g;
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

export const getValueAtMappingPath = (obj: unknown, path: string): unknown => {
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

export const buildFlattenedMappings = (
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

export const getValueAtPath = (obj: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
};

export const setValueAtPath = (obj: Record<string, unknown>, path: string, value: unknown) => {
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

export const setValueAtMappingPath = (
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

export const pickByPaths = (obj: Record<string, unknown>, paths: string[]) => {
  const result: Record<string, unknown> = {};
  paths.forEach((path) => {
    const value = getValueAtPath(obj, path);
    if (value !== undefined) {
      setValueAtPath(result, path, value);
    }
  });
  return result;
};

export const deletePath = (obj: Record<string, unknown>, path: string) => {
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

export const omitByPaths = (obj: Record<string, unknown>, paths: string[]) => {
  const clone = cloneValue(obj);
  paths.forEach((path) => deletePath(clone, path));
  return clone;
};
