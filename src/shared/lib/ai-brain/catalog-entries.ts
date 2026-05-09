/**
 * AI Brain Catalog Entries
 * 
 * Catalog pool definitions and entry management for AI Brain.
 * Provides:
 * - Catalog pool type definitions
 * - Model preset pools
 * - Paid and Ollama model pools
 * - Agent and persona pools
 * - Deep thinking agent pools
 */

import type { AiBrainCatalogEntry, AiBrainCatalogPool } from '@/shared/contracts/ai-brain';

/**
 * Valid catalog pool values for AI Brain models and agents.
 */
export const BRAIN_CATALOG_POOL_VALUES: readonly AiBrainCatalogPool[] = [
  'modelPresets',
  'paidModels',
  'ollamaModels',
  'agentModels',
  'deepthinkingAgents',
  'playwrightPersonas',
] as const;

/**
 * Human-readable labels for each catalog pool.
 */
export const BRAIN_CATALOG_POOL_LABELS: Record<AiBrainCatalogPool, string> = {
  modelPresets: 'Core model presets',
  paidModels: 'Paid models',
  ollamaModels: 'Ollama models',
  agentModels: 'Agent models',
  deepthinkingAgents: 'Deepthinking agents',
  playwrightPersonas: 'Playwright personas',
};

const BRAIN_CATALOG_POOL_SET = new Set<string>(BRAIN_CATALOG_POOL_VALUES);

/**
 * Type guard to check if a string is a valid AiBrainCatalogPool.
 * 
 * @param value - The string to check.
 * @returns True if the value is a valid catalog pool.
 */
const isBrainCatalogPool = (value: string): value is AiBrainCatalogPool =>
  BRAIN_CATALOG_POOL_SET.has(value);

/**
 * Checks if two catalog entries refer to the same pool and value.
 * 
 * @param left - The first catalog entry.
 * @param right - The second catalog entry.
 * @returns True if both entries match.
 */
export const isSameCatalogEntry = (
  left: Pick<AiBrainCatalogEntry, 'pool' | 'value'>,
  right: Pick<AiBrainCatalogEntry, 'pool' | 'value'>
): boolean => left.pool === right.pool && left.value === right.value;

/**
 * Validates and deduplicates an array of catalog entries.
 * Filters out null/undefined entries and invalid pools.
 * 
 * @param entries - The raw entries to sanitize.
 * @returns A sanitized and deduplicated list of catalog entries.
 */
export const sanitizeCatalogEntries = (
  entries: ReadonlyArray<Pick<AiBrainCatalogEntry, 'pool' | 'value'> | null | undefined>
): AiBrainCatalogEntry[] => {
  const seen = new Set<string>();
  const output: AiBrainCatalogEntry[] = [];

  entries.forEach((entry) => {
    if (!entry) return;
    const pool = String(entry.pool ?? '').trim();
    if (!isBrainCatalogPool(pool)) return;
    const value = String(entry.value ?? '').trim();
    if (!value) return;

    const key = `${pool}::${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({ pool, value });
  });

  return output;
};

/**
 * A record mapping each catalog pool to its list of model IDs or values.
 */
export type BrainCatalogArrays = Record<AiBrainCatalogPool, string[]>;

/**
 * Creates an empty object for catalog arrays.
 * 
 * @returns An empty BrainCatalogArrays record.
 */
const createEmptyCatalogArrays = (): BrainCatalogArrays => ({
  modelPresets: [],
  paidModels: [],
  ollamaModels: [],
  agentModels: [],
  deepthinkingAgents: [],
  playwrightPersonas: [],
});

/**
 * Groups catalog entries into arrays partitioned by their pool.
 * 
 * @param entries - The catalog entries to convert.
 * @returns A record of arrays grouped by pool.
 */
export const entriesToCatalogArrays = (
  entries: ReadonlyArray<AiBrainCatalogEntry>
): BrainCatalogArrays => {
  const arrays = createEmptyCatalogArrays();
  sanitizeCatalogEntries(entries).forEach((entry) => {
    arrays[entry.pool].push(entry.value);
  });
  return arrays;
};

/**
 * Extracts and sanitizes catalog entries from a generic catalog object.
 * 
 * @param catalog - Object containing an optional entries array.
 * @returns A sanitized list of catalog entries.
 */
export const catalogToEntries = (catalog: {
  entries?: ReadonlyArray<AiBrainCatalogEntry> | null | undefined;
}): AiBrainCatalogEntry[] => {
  return sanitizeCatalogEntries(Array.isArray(catalog.entries) ? catalog.entries : []);
};

/**
 * Checks if a specific pool has any entries in the provided list.
 * 
 * @param entries - The list of entries to check.
 * @param pool - The pool to look for.
 * @returns True if the pool has at least one entry.
 */
export const hasCatalogPoolEntries = (
  entries: ReadonlyArray<AiBrainCatalogEntry>,
  pool: AiBrainCatalogPool
): boolean => entries.some((entry) => entry.pool === pool);

/**
 * Appends new values to a specific pool in the catalog.
 * 
 * @param entries - Current list of catalog entries.
 * @param pool - The pool to append to.
 * @param values - The new values to add.
 * @returns A new sanitized list of entries with the appended values.
 */
export const appendCatalogPoolValues = (
  entries: ReadonlyArray<AiBrainCatalogEntry>,
  pool: AiBrainCatalogPool,
  values: ReadonlyArray<string>
): AiBrainCatalogEntry[] =>
  sanitizeCatalogEntries([
    ...entries,
    ...values.map((value) => ({
      pool,
      value,
    })),
  ]);

/**
 * Replaces all values in a specific pool with a new set of values.
 * 
 * @param entries - Current list of catalog entries.
 * @param pool - The pool whose values should be replaced.
 * @param values - The new values for the pool.
 * @returns A new sanitized list of entries with the replaced pool.
 */
export const replaceCatalogPoolValues = (
  entries: ReadonlyArray<AiBrainCatalogEntry>,
  pool: AiBrainCatalogPool,
  values: ReadonlyArray<string>
): AiBrainCatalogEntry[] =>
  sanitizeCatalogEntries([
    ...entries.filter((entry) => entry.pool !== pool),
    ...values.map((value) => ({
      pool,
      value,
    })),
  ]);
