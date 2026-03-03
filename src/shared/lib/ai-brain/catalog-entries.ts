import type {
  AiBrainCatalogEntry,
  AiBrainCatalogPool,
  AiBrainProviderCatalog,
} from '@/shared/contracts/ai-brain';

export const BRAIN_CATALOG_POOL_VALUES: readonly AiBrainCatalogPool[] = [
  'modelPresets',
  'paidModels',
  'ollamaModels',
  'agentModels',
  'deepthinkingAgents',
  'playwrightPersonas',
] as const;

export const BRAIN_CATALOG_POOL_LABELS: Record<AiBrainCatalogPool, string> = {
  modelPresets: 'Core model presets',
  paidModels: 'Paid models',
  ollamaModels: 'Ollama models',
  agentModels: 'Agent models',
  deepthinkingAgents: 'Deepthinking agents',
  playwrightPersonas: 'Playwright personas',
};

const BRAIN_CATALOG_POOL_SET = new Set<string>(BRAIN_CATALOG_POOL_VALUES);

const isBrainCatalogPool = (value: string): value is AiBrainCatalogPool =>
  BRAIN_CATALOG_POOL_SET.has(value);

export const isSameCatalogEntry = (
  left: Pick<AiBrainCatalogEntry, 'pool' | 'value'>,
  right: Pick<AiBrainCatalogEntry, 'pool' | 'value'>
): boolean => left.pool === right.pool && left.value === right.value;

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

type BrainCatalogArrays = Pick<
  AiBrainProviderCatalog,
  | 'modelPresets'
  | 'paidModels'
  | 'ollamaModels'
  | 'agentModels'
  | 'deepthinkingAgents'
  | 'playwrightPersonas'
>;

const createEmptyCatalogArrays = (): BrainCatalogArrays => ({
  modelPresets: [],
  paidModels: [],
  ollamaModels: [],
  agentModels: [],
  deepthinkingAgents: [],
  playwrightPersonas: [],
});

export const entriesToCatalogArrays = (entries: ReadonlyArray<AiBrainCatalogEntry>): BrainCatalogArrays => {
  const arrays = createEmptyCatalogArrays();
  sanitizeCatalogEntries(entries).forEach((entry) => {
    arrays[entry.pool].push(entry.value);
  });
  return arrays;
};

export const catalogToEntries = (
  catalog: Pick<
    AiBrainProviderCatalog,
    'entries' | keyof BrainCatalogArrays
  >
): AiBrainCatalogEntry[] => {
  return sanitizeCatalogEntries(Array.isArray(catalog.entries) ? catalog.entries : []);
};

export const hasCatalogPoolEntries = (
  entries: ReadonlyArray<AiBrainCatalogEntry>,
  pool: AiBrainCatalogPool
): boolean => entries.some((entry) => entry.pool === pool);

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
