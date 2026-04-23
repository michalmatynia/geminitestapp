import 'server-only';

import { join } from 'node:path';

import { createDraft } from '@/features/drafter/server';

import { createFilesystemScripterRegistry } from './filesystem-scripter-registry';
import { createSimpleScripterDriverFactory } from './scripter-driver-factory';
import { createScripterServer, type ScripterServer } from './scripter-server';
import type { ScripterRegistry } from './scripter-registry';

const SCRIPTER_DIR_ENV = 'SCRIPTER_REGISTRY_DIR';
const DEFAULT_SCRIPTER_DIR = 'data/scripters';

let cachedServer: ScripterServer | null = null;
let cachedRegistry: ScripterRegistry | null = null;

const resolveRegistryDir = (): string => {
  const fromEnv = process.env[SCRIPTER_DIR_ENV]?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return join(process.cwd(), DEFAULT_SCRIPTER_DIR);
};

export const getDefaultScripterRegistry = (): ScripterRegistry => {
  if (!cachedRegistry) {
    cachedRegistry = createFilesystemScripterRegistry(resolveRegistryDir());
  }
  return cachedRegistry;
};

export const getDefaultScripterServer = (): ScripterServer => {
  if (!cachedServer) {
    cachedServer = createScripterServer({
      registry: getDefaultScripterRegistry(),
      driverFactory: createSimpleScripterDriverFactory({ headless: true }),
      createDraft: async (input) => {
        const draft = await createDraft(input);
        return { id: draft.id };
      },
    });
  }
  return cachedServer;
};

export const __resetDefaultScripterServerForTests = (): void => {
  cachedServer = null;
  cachedRegistry = null;
};
