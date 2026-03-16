import 'server-only';

import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurKnowledgeGraphPreviewSummary } from '@/features/kangur/shared/contracts/kangur-observability';

import {
  previewKangurAiTutorSemanticGraphContext,
  type KangurKnowledgeGraphRetrievalPreviewResult,
} from './retrieval';

export type KangurKnowledgeGraphPreviewRuntimeResolution = 'live' | 'skipped';

export type KangurKnowledgeGraphPreviewResultEnvelope = {
  learnerId: string;
  locale: string;
  runtimeResolution: KangurKnowledgeGraphPreviewRuntimeResolution;
  requestedRefIds: string[];
  runtimeDocumentIds: string[];
  summary: KangurKnowledgeGraphPreviewSummary;
  retrieval: KangurKnowledgeGraphRetrievalPreviewResult;
};

const buildKangurKnowledgeGraphPreviewSummary = (input: {
  requestedRefIds: string[];
  runtimeDocumentIds: string[];
  retrieval: KangurKnowledgeGraphRetrievalPreviewResult;
}): KangurKnowledgeGraphPreviewSummary => {
  const hit = input.retrieval.status === 'hit' ? input.retrieval : null;

  return {
    requestedRefCount: input.requestedRefIds.length,
    runtimeDocumentCount: input.runtimeDocumentIds.length,
    retrievalStatus: input.retrieval.status,
    queryMode: input.retrieval.queryMode,
    recallStrategy: hit?.recallStrategy ?? null,
    nodeCount: hit?.nodeIds.length ?? 0,
    sourceCount: hit?.sources.length ?? 0,
    lexicalHitCount: hit?.lexicalHitCount ?? 0,
    vectorHitCount: hit?.vectorHitCount ?? 0,
    vectorRecallAttempted: hit?.vectorRecallAttempted ?? false,
    tokenCount: input.retrieval.tokens.length,
    normalizedQuerySeed: input.retrieval.normalizedQuerySeed,
    websiteHelpTargetNodeId: hit?.websiteHelpTarget?.nodeId ?? null,
  };
};

export const buildKangurKnowledgeGraphPreviewResult = async (input: {
  latestUserMessage: string;
  learnerId: string;
  locale: string;
  context?: KangurAiTutorConversationContext;
  runtimeDocuments: ContextRuntimeDocument[];
  runtimeResolution: KangurKnowledgeGraphPreviewRuntimeResolution;
}): Promise<KangurKnowledgeGraphPreviewResultEnvelope> => {
  const requestedRefs = buildKangurAiTutorContextRegistryRefs({
    learnerId: input.learnerId,
    context: input.context,
  });

  const retrieval = await previewKangurAiTutorSemanticGraphContext({
    latestUserMessage: input.latestUserMessage,
    context: input.context,
    locale: input.locale,
    runtimeDocuments: input.runtimeDocuments,
  });
  const requestedRefIds = requestedRefs.map((ref) => ref.id);
  const runtimeDocumentIds = input.runtimeDocuments.map((document) => document.id);

  return {
    learnerId: input.learnerId,
    locale: input.locale,
    runtimeResolution: input.runtimeResolution,
    requestedRefIds,
    runtimeDocumentIds,
    summary: buildKangurKnowledgeGraphPreviewSummary({
      requestedRefIds,
      runtimeDocumentIds,
      retrieval,
    }),
    retrieval,
  };
};
