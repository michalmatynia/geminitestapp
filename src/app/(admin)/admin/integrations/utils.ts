import { TestLogEntry, TestStatus } from "@/types/integrations-ui";

export const coerceStatus = (value: unknown): TestStatus => {
  return value === "pending" || value === "ok" || value === "failed"
    ? value
    : "failed";
};

export const normalizeSteps = (value: unknown): TestLogEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const s =
      raw && typeof raw === "object"
        ? (raw as Record<string, unknown>)
        : {};
    const stepValue = s?.step;
    return {
      step:
        typeof stepValue === "string"
          ? stepValue
          : stepValue == null
            ? ""
            : typeof stepValue === "number" || typeof stepValue === "boolean"
              ? String(stepValue)
              : JSON.stringify(stepValue),
      status: coerceStatus(s?.status),
      timestamp:
        typeof s?.timestamp === "string"
          ? s.timestamp
          : new Date().toISOString(),
      ...(typeof s?.detail === "string" && { detail: s.detail }),
    };
  });
};
