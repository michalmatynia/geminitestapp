import 'server-only';

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadScripterFromJson } from './loader';
import type { ScripterRegistry, ScripterRegistryListEntry } from './scripter-registry';
import type { ScripterDefinition } from './types';

const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

const safeFileName = (id: string): string => {
  if (!SAFE_ID_RE.test(id)) {
    throw new Error(`Invalid scripter id for filesystem storage: "${id}"`);
  }
  return `${id}.json`;
};

const readDefinition = async (dir: string, file: string): Promise<ScripterDefinition | null> => {
  try {
    const contents = await readFile(join(dir, file), 'utf8');
    const parsed = loadScripterFromJson(contents);
    return parsed.ok ? parsed.definition : null;
  } catch {
    return null;
  }
};

export const createFilesystemScripterRegistry = (dir: string): ScripterRegistry => {
  let ensured = false;
  const ensureDir = async (): Promise<void> => {
    if (ensured) return;
    await mkdir(dir, { recursive: true });
    ensured = true;
  };

  return {
    async list(): Promise<ScripterRegistryListEntry[]> {
      await ensureDir();
      const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
      const entries: ScripterRegistryListEntry[] = [];
      for (const file of files) {
        const def = await readDefinition(dir, file);
        if (!def) continue;
        entries.push({
          id: def.id,
          version: def.version,
          siteHost: def.siteHost,
          description: def.description ?? null,
        });
      }
      return entries.sort((a, b) => a.id.localeCompare(b.id));
    },
    async get(id: string): Promise<ScripterDefinition | null> {
      await ensureDir();
      return readDefinition(dir, safeFileName(id));
    },
    async save(definition: ScripterDefinition): Promise<ScripterDefinition> {
      await ensureDir();
      const file = safeFileName(definition.id);
      const existing = await readDefinition(dir, file);
      if (existing && existing.version > definition.version) {
        throw new Error(
          `Scripter "${definition.id}" version conflict: stored v${existing.version} > incoming v${definition.version}`
        );
      }
      await writeFile(join(dir, file), JSON.stringify(definition, null, 2), 'utf8');
      return definition;
    },
    async delete(id: string): Promise<boolean> {
      await ensureDir();
      try {
        await rm(join(dir, safeFileName(id)));
        return true;
      } catch {
        return false;
      }
    },
  };
};
