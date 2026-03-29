import 'server-only';

import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import type {
  KangurKnowledgeGraphRetrievalPreviewResult,
  KangurKnowledgeGraphRetrievalResult,
} from './retrieval/retrieval.contracts';
import {
  normalizeText,
  tokenizeQuery,
} from './retrieval/retrieval.utils';

export type {
  GraphFollowUpAction,
  HydratedKnowledgeGraphHit,
  KangurKnowledgeGraphDebugHit,
  KangurKnowledgeGraphHit,
  KangurKnowledgeGraphQueryMode,
  KangurKnowledgeGraphRecallStrategy,
  KangurKnowledgeGraphRetrievalPreviewResult,
  KangurKnowledgeGraphRetrievalResult,
} from './retrieval/retrieval.contracts';

const readQuerySeedPart = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const buildRawSemanticQuerySeed = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): string =>
  [
    readQuerySeedPart(input.latestUserMessage),
    readQuerySeedPart(input.context?.selectedText),
    readQuerySeedPart(input.context?.focusLabel),
    readQuerySeedPart(input.context?.title),
    readQuerySeedPart(input.context?.description),
  ]
    .filter(Boolean)
    .join(' ');

const buildNormalizedSemanticQuerySeed = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): string =>
  [
    normalizeText(input.latestUserMessage),
    normalizeText(input.context?.selectedText),
    normalizeText(input.context?.focusLabel),
    normalizeText(input.context?.title),
    normalizeText(input.context?.description),
  ]
    .filter(Boolean)
    .join(' ');

export const resolveKangurKnowledgeGraphContext = async (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalResult> => {
  void input;

  return {
    status: 'miss',
    queryMode: null,
    instructions: null,
    sources: [],
    nodeIds: [],
  };
};

export const previewKangurAiTutorSemanticGraphContext = async (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> => {
  void input.locale;
  void input.runtimeDocuments;

  const querySeed = buildRawSemanticQuerySeed({
    latestUserMessage: input.latestUserMessage,
    context: input.context,
  });
  const normalizedQuerySeed = buildNormalizedSemanticQuerySeed({
    latestUserMessage: input.latestUserMessage,
    context: input.context,
  });
  const tokens = tokenizeQuery(normalizedQuerySeed);

  const retrieval = await resolveKangurKnowledgeGraphContext({
    latestUserMessage: input.latestUserMessage,
    context: input.context,
    limit: input.limit,
  });

  if (retrieval.status !== 'hit') {
    return {
      status: retrieval.status,
      queryMode: null,
      querySeed,
      normalizedQuerySeed,
      tokens,
      instructions: null,
      sources: [],
      nodeIds: [],
      hits: [],
    };
  }

  return {
    ...retrieval,
    querySeed,
    normalizedQuerySeed,
    tokens,
    hits: [],
  };
};
