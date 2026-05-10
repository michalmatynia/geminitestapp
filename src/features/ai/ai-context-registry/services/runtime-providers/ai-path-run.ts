import 'server-only';

import type {
  ContextRegistryRef,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

import type { RuntimeContextProvider } from '../runtime-provider';
import {
  buildAiPathRunRuntimeSections,
  buildAiPathRunRuntimeSummary,
  buildAiPathRunRuntimeTags,
  buildAiPathRunRuntimeTimestamps,
  buildExecutedModels,
  buildFailedNodes,
  buildPreflightItems,
  buildRecentErrorEvents,
  buildSummaryFacts,
  readTrimmedString,
} from './ai-path-run-runtime-builders';

export const AI_PATH_RUN_RUNTIME_PROVIDER_ID = 'ai-path-run';
export const AI_PATH_RUN_CONTEXT_ROOT_IDS = [
  'page:ai-paths',
  'action:run-ai-path',
  'collection:ai-path-runs',
] as const;

const PROVIDER_VERSION = '1';
const AI_PATH_RUN_REF_PREFIX = 'runtime:ai-path-run:';

const createAiPathRunRuntimeRef = (runId: string): ContextRegistryRef => ({
  id: `${AI_PATH_RUN_REF_PREFIX}${runId}`,
  kind: 'runtime_document',
  providerId: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
  entityType: 'ai_path_run',
});

const extractAiPathRunIdFromRef = (ref: ContextRegistryRef): string | null => {
  if (ref.kind !== 'runtime_document') return null;
  if (!ref.id.startsWith(AI_PATH_RUN_REF_PREFIX)) return null;
  return readTrimmedString(ref.id.slice(AI_PATH_RUN_REF_PREFIX.length), 200);
};

const extractLinkedAiPathRunId = (context: Record<string, unknown> | null): string | null => {
  if (context === null) return null;
  const runId = readTrimmedString(context['runId'], 200);
  if (runId !== null) return runId;
  return readTrimmedString(context['jobId'], 200);
};

export const buildAiPathRunRuntimeDocument = async (
  runId: string
): Promise<ContextRuntimeDocument | null> => {
  const normalizedRunId = readTrimmedString(runId, 200);
  if (normalizedRunId === null) return null;

  const repo = await getPathRunRepository();
  const run = await repo.findRunById(normalizedRunId);
  if (run === null) return null;

  const [nodes, events] = await Promise.all([
    repo.listRunNodes(normalizedRunId),
    repo.listRunEvents(normalizedRunId),
  ]);

  const facts = buildSummaryFacts(run, nodes, events);
  const sections = buildAiPathRunRuntimeSections({
    executedModels: buildExecutedModels(run, nodes),
    failedNodes: buildFailedNodes(nodes),
    recentErrorEvents: buildRecentErrorEvents(events),
    preflightItems: buildPreflightItems(run),
  });

  return {
    id: createAiPathRunRuntimeRef(run.id).id,
    kind: 'runtime_document',
    entityType: 'ai_path_run',
    title: readTrimmedString(run.pathName, 160) ?? `AI Path Run ${run.id}`,
    summary: buildAiPathRunRuntimeSummary(run, facts),
    status: run.status,
    tags: buildAiPathRunRuntimeTags(run),
    relatedNodeIds: [...AI_PATH_RUN_CONTEXT_ROOT_IDS],
    timestamps: buildAiPathRunRuntimeTimestamps(run),
    facts,
    sections,
    provenance: {
      providerId: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      source: 'ai_path_runs',
    },
  };
};

export const aiPathRunRuntimeContextProvider: RuntimeContextProvider = {
  id: AI_PATH_RUN_RUNTIME_PROVIDER_ID,
  canInferRefs(input: Record<string, unknown> | null): boolean {
    return extractLinkedAiPathRunId(input) !== null;
  },
  inferRefs(input: Record<string, unknown>): ContextRegistryRef[] {
    const runId = extractLinkedAiPathRunId(input);
    return runId !== null ? [createAiPathRunRuntimeRef(runId)] : [];
  },
  canResolveRef(ref: ContextRegistryRef): boolean {
    return ref.kind === 'runtime_document' && ref.id.startsWith(AI_PATH_RUN_REF_PREFIX);
  },
  async resolveRefs(refs: ContextRegistryRef[]): Promise<ContextRuntimeDocument[]> {
    const documents = await Promise.all(
      refs.map(async (ref) => {
        const runId = extractAiPathRunIdFromRef(ref);
        if (runId === null) return null;
        return buildAiPathRunRuntimeDocument(runId);
      })
    );

    return documents.filter(
      (document): document is ContextRuntimeDocument => document !== null
    );
  },
  getVersion(): string {
    return PROVIDER_VERSION;
  },
};
