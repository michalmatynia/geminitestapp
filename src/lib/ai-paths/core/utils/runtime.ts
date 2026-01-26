export const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function safeStringify(value: unknown): string {
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
}

export const formatRuntimeValue = (value: unknown): string => {
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

export const parsePathList = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const safeParseJson = (value: string) => {
  if (!value.trim()) return { value: null as unknown, error: "" };
  try {
    return { value: JSON.parse(value) as unknown, error: "" };
  } catch {
    return { value: null as unknown, error: "Invalid JSON" };
  }
};

export const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

export const parseJsonSafe = (value: string): unknown => {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

export const coerceInput = <T>(value: T | T[] | undefined): T | undefined =>
  Array.isArray(value) ? value[0] : value;

export const coerceInputArray = <T>(value: T | T[] | undefined): T[] =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

export const appendInputValue = (current: unknown, value: unknown): unknown => {
  if (current === undefined) return value;
  if (Array.isArray(current)) return [...(current as unknown[]), value];
  return [current, value];
};
