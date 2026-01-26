import { getValueAtMappingPath } from "./json";
import { safeStringify } from "./runtime";

export const renderTemplate = (
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
