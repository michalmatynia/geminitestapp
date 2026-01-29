import { getValueAtMappingPath } from "./json";
import { safeStringify } from "./runtime";

export const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
  currentValue: unknown
): string =>
  template
    .replace(/{{\s*([^}]+)\s*}}/g, (_match: string, token: string) => {
      const key = String(token).trim();
      if (key === "value" || key === "current") {
        return safeStringify(currentValue);
      }
      const resolved = getValueAtMappingPath(context, key);
      return safeStringify(resolved);
    })
    .replace(/\[\s*([^\]]+)\s*\]/g, (_match: string, token: string) => {
      const key = String(token).trim();
      if (key === "value" || key === "current") {
        return safeStringify(currentValue);
      }
      const resolved = getValueAtMappingPath(context, key);
      return safeStringify(resolved);
    });

export const renderJsonTemplate = (
  template: string,
  context: Record<string, unknown>,
  currentValue: unknown
): string => {
  const resolveToken = (token: string): unknown => {
    const key = String(token).trim();
    if (key === "value" || key === "current") {
      return currentValue;
    }
    return getValueAtMappingPath(context, key);
  };
  const escapeQuoted = (input: string): string => {
    const replaceQuoted = (text: string, pattern: RegExp): string =>
      text.replace(pattern, (_match: string, token: string) => {
        const value: unknown = resolveToken(token);
        const asString: string =
          value === undefined || value === null
            ? ""
            : typeof value === "string"
              ? value
              : JSON.stringify(value);
        return JSON.stringify(asString);
      });
    let next = replaceQuoted(input, /"{{\s*([^}]+)\s*}}"/g);
    next = replaceQuoted(next, /"\[\s*([^\]]+)\s*\]"/g);
    return next;
  };
  return renderTemplate(escapeQuoted(template), context, currentValue);
};
