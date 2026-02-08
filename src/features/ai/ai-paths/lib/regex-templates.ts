import type { RegexTemplate } from '@/shared/types/ai-paths';

export const AI_PATHS_REGEX_TEMPLATES_KEY = 'ai_paths_regex_templates';

export type RegexTemplatesStore = {
  version: 1;
  templates: RegexTemplate[];
};

const defaultStore: RegexTemplatesStore = {
  version: 1,
  templates: [],
};

export const createRegexTemplateId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return `regex-template-${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  }
  return `regex-template-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeTemplate = (value: unknown): RegexTemplate | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw['name'] === 'string' ? (raw['name'] as string).trim() : '';
  const pattern = typeof raw['pattern'] === 'string' ? (raw['pattern'] as string) : '';
  if (!name || !pattern.trim()) return null;
  const id = typeof raw['id'] === 'string' && (raw['id'] as string).trim().length > 0 ? (raw['id'] as string).trim() : createRegexTemplateId();
  return {
    id,
    name,
    pattern,
    flags: typeof raw['flags'] === 'string' ? (raw['flags'] as string) : undefined,
    mode: typeof raw['mode'] === 'string' ? (raw['mode'] as RegexTemplate['mode']) : undefined,
    matchMode: typeof raw['matchMode'] === 'string' ? (raw['matchMode'] as RegexTemplate['matchMode']) : undefined,
    groupBy: typeof raw['groupBy'] === 'string' ? (raw['groupBy'] as string) : undefined,
    outputMode: typeof raw['outputMode'] === 'string' ? (raw['outputMode'] as RegexTemplate['outputMode']) : undefined,
    includeUnmatched: typeof raw['includeUnmatched'] === 'boolean' ? (raw['includeUnmatched'] as boolean) : undefined,
    unmatchedKey: typeof raw['unmatchedKey'] === 'string' ? (raw['unmatchedKey'] as string) : undefined,
    splitLines: typeof raw['splitLines'] === 'boolean' ? (raw['splitLines'] as boolean) : undefined,
    createdAt: typeof raw['createdAt'] === 'string' ? (raw['createdAt'] as string) : undefined,
    updatedAt: typeof raw['updatedAt'] === 'string' ? (raw['updatedAt'] as string) : undefined,
  };
};

const normalizeTemplates = (value: unknown): RegexTemplate[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => normalizeTemplate(entry))
    .filter((entry: RegexTemplate | null): entry is RegexTemplate => Boolean(entry));
};

export const parseRegexTemplatesStore = (raw?: string | null): RegexTemplatesStore => {
  if (!raw) return defaultStore;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return { version: 1, templates: normalizeTemplates(parsed) };
    }
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).templates)) {
      return { version: 1, templates: normalizeTemplates((parsed as Record<string, unknown>).templates) };
    }
    return defaultStore;
  } catch {
    return defaultStore;
  }
};

export const buildRegexTemplatesStore = (templates: RegexTemplate[]): RegexTemplatesStore => ({
  version: 1,
  templates,
});
