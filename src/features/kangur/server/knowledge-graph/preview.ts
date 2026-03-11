import 'server-only';

import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';

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
  retrieval: KangurKnowledgeGraphRetrievalPreviewResult;
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

  return {
    learnerId: input.learnerId,
    locale: input.locale,
    runtimeResolution: input.runtimeResolution,
    requestedRefIds: requestedRefs.map((ref) => ref.id),
    runtimeDocumentIds: input.runtimeDocuments.map((document) => document.id),
    retrieval,
  };
};
