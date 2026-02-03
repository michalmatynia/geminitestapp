import { getValueAtMappingPath } from "./json";
import { safeStringify } from "./runtime";

export const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
  currentValue: unknown
): string =>
  // Single-pass replacement prevents an inserted value (e.g. JSON arrays like `[{...}]`) from being
  // re-interpreted as another placeholder by a second `.replace()` call.
  //
  // Square-bracket placeholders are intentionally conservative so we don't accidentally treat
  // JSON arrays (or other bracketed text) as placeholders.
  template.replace(
    /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g,
    (_match: string, curlyToken: string | undefined, bracketToken: string | undefined) => {
      const raw = curlyToken ?? bracketToken ?? "";
      const key = String(raw).trim();
      if (!key) return "";
      if (key === "value" || key === "current") {
        return safeStringify(currentValue);
      }
      const resolved = getValueAtMappingPath(context, key);
      return safeStringify(resolved);
    }
  );

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
