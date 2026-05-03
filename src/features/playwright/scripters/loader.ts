import { scripterDefinitionSchema } from './schema';
import type { ScripterDefinition } from './types';

export type LoadScripterResult =
  | { ok: true; definition: ScripterDefinition }
  | { ok: false; errors: string[] };

export const loadScripter = (input: unknown): LoadScripterResult => {
  const parsed = scripterDefinitionSchema.safeParse(input);
  if (parsed.success) return { ok: true, definition: parsed.data };
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { ok: false, errors };
};

export const loadScripterFromJson = (json: string): LoadScripterResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  return loadScripter(parsed);
};
