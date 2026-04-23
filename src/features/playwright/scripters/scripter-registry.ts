import { loadScripter } from './loader';
import type { ScripterDefinition } from './types';

export type ScripterRegistryListEntry = {
  id: string;
  version: number;
  siteHost: string;
  description: string | null;
};

export type ScripterRegistry = {
  list(): Promise<ScripterRegistryListEntry[]>;
  get(id: string): Promise<ScripterDefinition | null>;
  save(definition: ScripterDefinition): Promise<ScripterDefinition>;
  delete(id: string): Promise<boolean>;
};

const toListEntry = (definition: ScripterDefinition): ScripterRegistryListEntry => ({
  id: definition.id,
  version: definition.version,
  siteHost: definition.siteHost,
  description: definition.description ?? null,
});

const validate = (definition: ScripterDefinition): ScripterDefinition => {
  const result = loadScripter(definition);
  if (!result.ok) {
    throw new Error(`Invalid scripter definition: ${result.errors.join('; ')}`);
  }
  return result.definition;
};

export const createInMemoryScripterRegistry = (
  seed: ScripterDefinition[] = []
): ScripterRegistry => {
  const store = new Map<string, ScripterDefinition>();
  for (const definition of seed) store.set(definition.id, validate(definition));

  return {
    async list() {
      return Array.from(store.values())
        .map(toListEntry)
        .sort((a, b) => a.id.localeCompare(b.id));
    },
    async get(id) {
      return store.get(id) ?? null;
    },
    async save(definition) {
      const existing = store.get(definition.id);
      if (existing && existing.version > definition.version) {
        throw new Error(
          `Scripter "${definition.id}" version conflict: stored v${existing.version} > incoming v${definition.version}`
        );
      }
      const validated = validate(definition);
      store.set(validated.id, validated);
      return validated;
    },
    async delete(id) {
      return store.delete(id);
    },
  };
};
