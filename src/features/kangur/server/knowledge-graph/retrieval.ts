import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorWebsiteHelpTarget,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  KANGUR_KNOWLEDGE_GRAPH_KEY,
} from '@/features/kangur/shared/contracts/kangur-knowledge-graph';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { cmsService } from '@/features/cms/server';
import type { Page } from '@/shared/contracts/cms';
import {
  extractCmsPageTextContent,
  buildCmsPageCanonicalText,
  buildCmsPageSemanticText,
  hasMeaningfulTextContent,
} from '@/features/cms/server';
import { KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { runNeo4jStatements } from '@/shared/lib/neo4j/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import {
  cosineSimilarity,
  generateKangurKnowledgeGraphQueryEmbedding,
} from './semantic';
import {
  buildRuntimeDocumentCanonicalText,
  buildSourceText,
  formatNativeGuideText,
  formatRelatedLine,
  resolveRuntimeDocumentForGraphHit,
  resolveTutorContentCanonicalSection,
} from './retrieval-helpers';

import {
  type GraphFollowUpAction,
  type KangurKnowledgeGraphHit,
  type HydratedKnowledgeGraphHit,
  type KangurKnowledgeGraphRetrievalResult,
  type KangurKnowledgeGraphDebugHit,
  type KangurKnowledgeGraphRetrievalPreviewResult,
  type KangurKnowledgeGraphQueryMode,
  type KangurKnowledgeGraphRecallStrategy,
  type KangurKnowledgeGraphQueryIntent,
  ROOT_ENTITY_TYPE_BY_NODE_ID,
} from './retrieval/retrieval.contracts';
import {
  normalizeText,
  tokenizeQuery,
  resolvePageKeyFromRoute,
} from './retrieval/retrieval.utils';
import {
  buildKnowledgeGraphQueryIntent,
  hasSemanticContext,
  resolveGraphQueryMode,
} from './retrieval/retrieval.logic';
import { GRAPH_QUERY, VECTOR_GRAPH_QUERY } from './retrieval/retrieval.queries';
import {
  mergeKnowledgeGraphHits,
  normalizeKnowledgeGraphHit,
} from './retrieval/retrieval.hit-normalization';

export type {
  GraphFollowUpAction,
  KangurKnowledgeGraphHit,
  HydratedKnowledgeGraphHit,
  KangurKnowledgeGraphRetrievalResult,
  KangurKnowledgeGraphDebugHit,
  KangurKnowledgeGraphRetrievalPreviewResult,
  KangurKnowledgeGraphQueryMode,
  KangurKnowledgeGraphRecallStrategy,
};

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

const fetchVectorKnowledgeGraphHits = async (input: {
  graphKey: string;
  queryEmbedding: number[] | null;
  limit: number;
}): Promise<KangurKnowledgeGraphHit[]> => {
  if (!input.queryEmbedding || input.queryEmbedding.length === 0) {
    return [];
  }

  try {
    const [result] = await runNeo4jStatements([
      {
        statement: VECTOR_GRAPH_QUERY,
        parameters: {
          graphKey: input.graphKey,
          indexName: KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX,
          embedding: input.queryEmbedding,
          limit: input.limit,
        },
      },
    ]);

    return ((result?.records ?? []) as Partial<KangurKnowledgeGraphHit>[]).map(
      normalizeKnowledgeGraphHit
    );
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};

const toChatSource = (hit: HydratedKnowledgeGraphHit, index: number): AgentTeachingChatSource => ({
  documentId: hit.id,
  collectionId: hit.canonicalSourceCollection,
  text: buildSourceText(hit),
  score: Math.max(0.55, 0.94 - index * 0.07),
  metadata: {
    source: 'manual-text',
    sourceId: hit.id,
    title: hit.canonicalTitle,
    description: hit.canonicalSummary ?? undefined,
    tags: ['kangur-knowledge-graph', hit.kind, ...(hit.canonicalTags ?? [])],
  },
});

const buildInstructions = (
  hits: HydratedKnowledgeGraphHit[],
  queryMode: KangurKnowledgeGraphQueryMode
): string => {
  const sections = hits.map((hit) => {
    const parts = [`- ${hit.canonicalTitle} [${hit.kind}]`];
    if (hit.canonicalSummary) {
      parts.push(`  ${hit.canonicalSummary}`);
    }
    if (hit.route || hit.anchorId) {
      parts.push(
        `  Website target: ${[hit.route, hit.anchorId ? `anchor=${hit.anchorId}` : null].filter(Boolean).join(' · ')}`
      );
    }
    const related = hit.relations.map(formatRelatedLine).filter(Boolean);
    if (related.length > 0) {
      parts.push(`  Related: ${related.join(' | ')}`);
    }
    return parts.join('\n');
  });

  if (queryMode === 'website_help') {
    const navigationPaths = hits
      .filter((hit) => hit.route || hit.anchorId)
      .map((hit) => {
        const routeLabel = hit.route ?? '/';
        const anchorLabel = hit.anchorId ? `#${hit.anchorId}` : '';
        const relatedTarget = hit.relations.find((r) => r.targetRoute || r.targetAnchorId);
        const pathParts = [hit.canonicalTitle];
        if (relatedTarget) {
          pathParts.push(relatedTarget.targetTitle ?? relatedTarget.targetId ?? 'related');
        }
        return `Navigation: ${pathParts.join(' → ')} [${routeLabel}${anchorLabel}]`;
      });

    return [
      'Kangur website-help graph context:',
      ...sections,
      ...(navigationPaths.length > 0 ? ['', 'Resolved navigation targets:', ...navigationPaths] : []),
      '',
      'Use Mongo-backed Kangur tutor knowledge as the canonical explanation source when available. Use Neo4j only to resolve the best related page, flow, route, or anchor.',
      'When the learner asks where something is or how to find a feature, reference the specific page name and section. The system will generate a clickable navigation card from the resolved target that can physically navigate the learner to the right place.',
      'Be specific: mention the exact page or section name, do not use vague directions.',
    ].join('\n');
  }

  return [
    'Kangur semantic graph context:',
    ...sections,
    'Use Mongo-backed Kangur tutor knowledge as the canonical explanation source when available. Use Neo4j to resolve the best matching Kangur surface, panel, section, or flow for the current conversation.',
    'Prioritize hits that match the current surface, focus kind, focus id, content id, or visible section label before falling back to generic overviews.',
    'Keep the answer grounded in what the learner currently sees on the Kangur page. Do not invent UI elements that are not present in the matched graph context.',
  ].join('\n');
};

export const resolveKangurKnowledgeGraphContext = async (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalResult> => {
  void input;
  // Knowledge graph retrieval orchestration
  return { status: 'miss', queryMode: null, instructions: null, sources: [], nodeIds: [] };
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
