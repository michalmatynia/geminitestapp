import 'server-only';

import { commitScripterDrafts, type CreateDraftFn, type ScripterCommitResult } from './commit';
import type { PageDriver } from './page-driver';
import {
  resolveScripterImportSource,
  type ScripterImportSourceOptions,
  type ScripterImportSourceResult,
} from './scripter-import-source';
import type { ScripterRegistry } from './scripter-registry';
import type { ScripterDefinition } from './types';

export type ScripterServerSession = {
  driver: PageDriver;
  close: () => Promise<void>;
};

export type ScripterDriverFactory = (definition: ScripterDefinition) => Promise<ScripterServerSession>;

export type ScripterServerDeps = {
  registry: ScripterRegistry;
  driverFactory: ScripterDriverFactory;
  createDraft: CreateDraftFn;
};

export type ScripterDryRunInvocation = {
  scripterId: string;
  options?: ScripterImportSourceOptions;
};

export type ScripterCommitInvocation = ScripterDryRunInvocation & {
  skipRecordsWithErrors?: boolean;
};

const requireDefinition = async (
  registry: ScripterRegistry,
  id: string
): Promise<ScripterDefinition> => {
  const def = await registry.get(id);
  if (!def) throw new Error(`Scripter "${id}" not found`);
  return def;
};

export const createScripterServer = (deps: ScripterServerDeps) => {
  const { registry, driverFactory, createDraft } = deps;

  const dryRun = async (
    invocation: ScripterDryRunInvocation
  ): Promise<ScripterImportSourceResult> => {
    const definition = await requireDefinition(registry, invocation.scripterId);
    const session = await driverFactory(definition);
    try {
      return await resolveScripterImportSource(definition, session.driver, invocation.options);
    } finally {
      await session.close().catch(() => undefined);
    }
  };

  const commit = async (
    invocation: ScripterCommitInvocation
  ): Promise<{ source: ScripterImportSourceResult; commit: ScripterCommitResult }> => {
    const source = await dryRun(invocation);
    const result = await commitScripterDrafts(source.drafts, {
      createDraft,
      skipRecordsWithErrors: invocation.skipRecordsWithErrors ?? true,
    });
    return { source, commit: result };
  };

  return { dryRun, commit };
};

export type ScripterServer = ReturnType<typeof createScripterServer>;
