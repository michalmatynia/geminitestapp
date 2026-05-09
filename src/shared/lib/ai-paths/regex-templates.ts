/**
 * AI Paths Regex Templates
 * 
 * This module manages the storage, normalization, and parsing of regex templates
 * used within AI Paths. It provides utilities for building a persistent store
 * of regex patterns that can be applied to AI-generated text or other inputs.
 */

import type { RegexTemplate, RegexTemplatesStore } from '@/shared/contracts/ai-paths';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

/**
 * The settings key used to store regex templates in the database or local storage.
 */
export const AI_PATHS_REGEX_TEMPLATES_KEY = 'ai_paths_regex_templates';

/**
 * Default empty store for regex templates.
 */
const defaultStore: RegexTemplatesStore = {
  version: 1,
  templates: [],
};

/**
 * Generates a unique, prefixed ID for a new regex template.
 * Prefers crypto.randomUUID if available, falling back to Math.random.
 * 
 * @returns {string} A unique ID string.
 */
export const createRegexTemplateId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return `regex-template-${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  }
  return `regex-template-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Normalizes a raw object into a validated RegexTemplate.
 * Ensures that both 'name' and 'pattern' are present and non-empty.
 * 
 * @param {unknown} value - The raw input to normalize.
 * @returns {RegexTemplate | null} The normalized template or null if invalid.
 */
const normalizeTemplate = (value: unknown): RegexTemplate | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : '';
  const pattern = typeof raw['pattern'] === 'string' ? raw['pattern'] : '';
  
  // Basic validation: name and pattern are required.
  if (!name || !pattern.trim()) return null;
  
  const id =
    typeof raw['id'] === 'string' && raw['id'].trim().length > 0
      ? raw['id'].trim()
      : createRegexTemplateId();
      
  return {
    id,
    name,
    pattern,
    flags: typeof raw['flags'] === 'string' ? raw['flags'] : undefined,
    mode: typeof raw['mode'] === 'string' ? (raw['mode'] as RegexTemplate['mode']) : undefined,
    matchMode:
      typeof raw['matchMode'] === 'string'
        ? (raw['matchMode'] as RegexTemplate['matchMode'])
        : undefined,
    groupBy: typeof raw['groupBy'] === 'string' ? raw['groupBy'] : undefined,
    outputMode:
      typeof raw['outputMode'] === 'string'
        ? (raw['outputMode'] as RegexTemplate['outputMode'])
        : undefined,
    includeUnmatched:
      typeof raw['includeUnmatched'] === 'boolean' ? raw['includeUnmatched'] : undefined,
    unmatchedKey: typeof raw['unmatchedKey'] === 'string' ? raw['unmatchedKey'] : undefined,
    splitLines: typeof raw['splitLines'] === 'boolean' ? raw['splitLines'] : undefined,
    createdAt: typeof raw['createdAt'] === 'string' ? raw['createdAt'] : undefined,
    updatedAt: typeof raw['updatedAt'] === 'string' ? raw['updatedAt'] : undefined,
  };
};

/**
 * Normalizes an array of raw template objects.
 * 
 * @param {unknown} value - The raw input array.
 * @returns {RegexTemplate[]} An array of normalized templates.
 */
const normalizeTemplates = (value: unknown): RegexTemplate[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown) => normalizeTemplate(entry))
    .filter((entry: RegexTemplate | null): entry is RegexTemplate => Boolean(entry));
};

/**
 * Parses a raw JSON string into a validated RegexTemplatesStore.
 * Handles both legacy array formats and the modern versioned store format.
 * 
 * @param {string | null} raw - The raw JSON string from storage.
 * @returns {RegexTemplatesStore} The parsed and normalized store.
 */
export const parseRegexTemplatesStore = (raw?: string | null): RegexTemplatesStore => {
  if (!raw) return defaultStore;
  try {
    const parsed = JSON.parse(raw) as unknown;
    
    // Support legacy format where the store was a simple array of templates.
    if (Array.isArray(parsed)) {
      return { version: 1, templates: normalizeTemplates(parsed) };
    }
    
    // Modern format: { version: number, templates: RegexTemplate[] }
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>)['templates'])
    ) {
      return {
        version: 1,
        templates: normalizeTemplates(
          (parsed as Record<string, unknown>)['templates'] as unknown[]
        ),
      };
    }
    return defaultStore;
  } catch (error) {
    logClientCatch(error, {
      source: 'ai-paths.regex-templates',
      action: 'parseStore',
      storageKey: AI_PATHS_REGEX_TEMPLATES_KEY,
    });
    return defaultStore;
  }
};

/**
 * Builds a versioned RegexTemplatesStore from an array of templates.
 * 
 * @param {RegexTemplate[]} templates - The templates to include in the store.
 * @returns {RegexTemplatesStore} The built store.
 */
export const buildRegexTemplatesStore = (templates: RegexTemplate[]): RegexTemplatesStore => ({
  version: 1,
  templates,
});
