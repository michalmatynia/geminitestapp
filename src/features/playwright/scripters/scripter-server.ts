import 'server-only';

import { commitScripterDrafts, type CreateDraftFn, type ScripterCommitResult } from './commit';
import {
  buildScripterCommitDiff,
  type LookupExistingFn,
  type ScripterCommitDiff,
} from './commit-diff';
import type { PageDriver } from './page-driver';
import type { RobotsCheckResult } from './robots-fetcher';
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
  robotsCheck?: (url: string) => Promise<RobotsCheckResult>;
  lookupExisting?: LookupExistingFn;
};

export type ScripterDryRunInvocation = {
  scripterId: string;
  options?: ScripterImportSourceOptions;
  enforceRobots?: boolean;
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
  const { registry, driverFactory, createDraft, robotsCheck, lookupExisting } = deps;

  const dryRun = async (
    invocation: ScripterDryRunInvocation
  ): Promise<ScripterImportSourceResult> => {
    const definition = await requireDefinition(registry, invocation.scripterId);
    const enforceRobots = invocation.enforceRobots ?? false;
    if (enforceRobots && robotsCheck) {
      const targetUrl = invocation.options?.entryUrl ?? definition.entryUrl;
      const verdict = await robotsCheck(targetUrl);
      if (!verdict.allowed) {
        throw new Error(verdict.reason ?? `Disallowed by robots.txt for ${targetUrl}`);
      }
    }
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

  const diff = async (
    invocation: ScripterDryRunInvocation
  ): Promise<{ source: ScripterImportSourceResult; diff: ScripterCommitDiff }> => {
    if (!lookupExisting) {
      throw new Error('Diff requires a lookupExisting dependency to be configured');
    }
    const source = await dryRun(invocation);
    const result = await buildScripterCommitDiff(source.drafts, lookupExisting);
    return { source, diff: result };
  };

  return { dryRun, commit, diff };
};

export type ScripterServer = ReturnType<typeof createScripterServer>;
