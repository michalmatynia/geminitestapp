import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { Page } from '@/shared/contracts/cms';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorWebsiteHelpTarget,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/features/kangur/shared/contracts/kangur-knowledge-graph';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { cmsService } from '@/features/cms/services/cms-service';
import {
  buildCmsPageCanonicalText,
  buildCmsPageSemanticText,
  extractCmsPageTextContent,
  hasMeaningfulTextContent,
} from '@/features/cms/utils/cms-text-extractor';
import { KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { runNeo4jStatements } from '@/shared/lib/neo4j/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

import { cosineSimilarity, generateKangurKnowledgeGraphQueryEmbedding } from './semantic';
import {
  buildRuntimeDocumentCanonicalText,
  buildSourceText,
  formatNativeGuideText,
  formatRelatedLine,
  resolveRuntimeDocumentForGraphHit,
  resolveTutorContentCanonicalSection,
} from './retrieval-helpers';
import type {
  GraphFollowUpAction,
  HydratedKnowledgeGraphHit,
  KangurKnowledgeGraphDebugHit,
  KangurKnowledgeGraphHit,
  KangurKnowledgeGraphQueryIntent,
  KangurKnowledgeGraphQueryMode,
  KangurKnowledgeGraphRecallStrategy,
  KangurKnowledgeGraphRetrievalPreviewResult,
  KangurKnowledgeGraphRetrievalResult,
} from './retrieval/retrieval.contracts';
import { ROOT_ENTITY_TYPE_BY_NODE_ID } from './retrieval/retrieval.contracts';
import {
  mergeKnowledgeGraphHits,
  normalizeKnowledgeGraphHit,
} from './retrieval/retrieval.hit-normalization';
import {
  buildKnowledgeGraphQueryIntent,
  hasSemanticContext,
  resolveGraphQueryMode,
} from './retrieval/retrieval.logic';
import { GRAPH_QUERY, VECTOR_GRAPH_QUERY } from './retrieval/retrieval.queries';
import {
  normalizeText,
  resolvePageKeyFromRoute,
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
        const relatedTarget = hit.relations.find((relation) => relation.targetRoute || relation.targetAnchorId);
        const pathParts = [hit.canonicalTitle];
        if (relatedTarget) {
          pathParts.push(relatedTarget.targetTitle ?? relatedTarget.targetId ?? 'related');
        }
        return `Navigation: ${pathParts.join(' → ')} [${routeLabel}${anchorLabel}]`;
      });

    const hasCmsPageHits = hits.some((hit) => hit.hydrationSource === 'cms_pages');

    return [
      'Kangur website-help graph context:',
      ...sections,
      ...(navigationPaths.length > 0 ? ['', 'Resolved navigation targets:', ...navigationPaths] : []),
      '',
      'Use Mongo-backed Kangur tutor knowledge as the canonical explanation source when available. Use Neo4j only to resolve the best related page, flow, route, or anchor.',
      'When the learner asks where something is or how to find a feature, reference the specific page name and section. The system will generate a clickable navigation card from the resolved target that can physically navigate the learner to the right place.',
      'Be specific: mention the exact page or section name, do not use vague directions.',
      ...(hasCmsPageHits
        ? ['When referencing CMS website pages, mention the page name and URL so the learner can navigate directly.']
        : []),
    ].join('\n');
  }

  const hasCmsPageHits = hits.some((hit) => hit.hydrationSource === 'cms_pages');

  return [
    'Kangur semantic graph context:',
    ...sections,
    'Use Mongo-backed Kangur tutor knowledge as the canonical explanation source when available. Use Neo4j to resolve the best matching Kangur surface, panel, section, or flow for the current conversation.',
    'Prioritize hits that match the current surface, focus kind, focus id, content id, or visible section label before falling back to generic overviews.',
    'Keep the answer grounded in what the learner currently sees on the Kangur page. Do not invent UI elements that are not present in the matched graph context.',
    ...(hasCmsPageHits
      ? ['When referencing CMS website pages, mention the page name and URL so the learner can navigate directly.']
      : []),
  ].join('\n');
};

const resolveGraphFollowUpActions = (
  hits: HydratedKnowledgeGraphHit[]
): GraphFollowUpAction[] => {
  const actions: GraphFollowUpAction[] = [];
  const seenPageKeys = new Set<string>();

  for (const hit of hits) {
    if (hit.route) {
      const pageKey = resolvePageKeyFromRoute(hit.route);
      if (pageKey && !seenPageKeys.has(pageKey)) {
        seenPageKeys.add(pageKey);
        actions.push({
          id: `graph:${hit.id}`,
          label: hit.canonicalTitle,
          page: pageKey,
          reason: hit.canonicalSummary,
        });
      }
    }

    for (const relation of hit.relations) {
      if (relation.targetRoute) {
        const pageKey = resolvePageKeyFromRoute(relation.targetRoute);
        if (pageKey && !seenPageKeys.has(pageKey)) {
          seenPageKeys.add(pageKey);
          actions.push({
            id: `graph:${relation.targetId ?? hit.id}`,
            label: relation.targetTitle ?? hit.canonicalTitle,
            page: pageKey,
            reason: hit.canonicalSummary,
          });
        }
      }
    }

    if (actions.length >= 3) {
      break;
    }
  }

  return actions.slice(0, 3);
};

const hydrateKnowledgeGraphHits = async (
  hits: KangurKnowledgeGraphHit[],
  locale: string,
  runtimeDocuments: ContextRuntimeDocument[]
): Promise<HydratedKnowledgeGraphHit[]> => {
  const needsTutorContent = hits.some((hit) => hit.sourceCollection === 'kangur_ai_tutor_content');
  const needsNativeGuideStore = hits.some(
    (hit) => hit.sourceCollection === 'kangur_ai_tutor_native_guides'
  );
  const needsPageContentStore = hits.some((hit) => hit.sourceCollection === 'kangur_page_content');
  const needsCmsPages = hits.some((hit) => hit.sourceCollection === 'cms_pages');

  const [tutorContent, nativeGuideStore, pageContentStore, cmsPages] = await Promise.all([
    needsTutorContent
      ? getKangurAiTutorContent(locale).catch((error) => {
          void ErrorSystem.captureException(error);
          return null;
        })
      : Promise.resolve(null),
    needsNativeGuideStore
      ? getKangurAiTutorNativeGuideStore(locale).catch((error) => {
          void ErrorSystem.captureException(error);
          return null;
        })
      : Promise.resolve(null),
    needsPageContentStore
      ? getKangurPageContentStore(locale).catch((error) => {
          void ErrorSystem.captureException(error);
          return null;
        })
      : Promise.resolve(null),
    needsCmsPages
      ? cmsService.getPages().catch((error) => {
          void ErrorSystem.captureException(error);
          return [] as Page[];
        })
      : Promise.resolve([] as Page[]),
  ]);

  const nativeGuideEntriesById = new Map(
    (nativeGuideStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const pageContentEntriesById = new Map(
    (pageContentStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const cmsPagesById = new Map(cmsPages.map((page) => [page.id, page] as const));

  return hits.map((hit) => {
    if (hit.sourceCollection === 'kangur_page_content' && hit.sourceRecordId) {
      const entry = pageContentEntriesById.get(hit.sourceRecordId);
      if (entry) {
        return {
          ...hit,
          canonicalTitle: entry.title,
          canonicalSummary: entry.summary,
          canonicalText: [
            entry.title,
            entry.summary,
            entry.body,
            entry.anchorIdPrefix ? `Anchor prefix: ${entry.anchorIdPrefix}` : null,
            entry.contentIdPrefixes.length > 0
              ? `Content ids: ${entry.contentIdPrefixes.join(', ')}`
              : null,
            entry.nativeGuideIds.length > 0
              ? `Linked native guides: ${entry.nativeGuideIds.join(', ')}`
              : null,
          ]
            .filter((value): value is string => Boolean(value))
            .join('\n'),
          canonicalTags: [...new Set([...hit.tags, ...entry.tags, 'mongo-canonical'])],
          canonicalSourceCollection: 'kangur_page_content',
          hydrationSource: 'kangur_page_content',
        };
      }
    }

    if (hit.sourceCollection === 'cms_pages' && hit.sourceRecordId) {
      const cmsPage = cmsPagesById.get(hit.sourceRecordId);
      if (cmsPage) {
        const textContent = extractCmsPageTextContent(cmsPage);
        return {
          ...hit,
          canonicalTitle: cmsPage.seoTitle ?? cmsPage.name,
          canonicalSummary: cmsPage.seoDescription ?? null,
          canonicalText: buildCmsPageCanonicalText(textContent),
          canonicalTags: [...new Set([...hit.tags, 'cms', 'cms-page', 'mongo-canonical'])],
          canonicalSourceCollection: 'cms_pages',
          hydrationSource: 'cms_pages',
        };
      }
    }

    if (hit.sourceCollection === 'kangur_ai_tutor_native_guides' && hit.sourceRecordId) {
      const entry = nativeGuideEntriesById.get(hit.sourceRecordId);
      if (entry) {
        return {
          ...hit,
          canonicalTitle: entry.title,
          canonicalSummary: entry.shortDescription,
          canonicalText: formatNativeGuideText(entry),
          canonicalTags: [...hit.tags, 'mongo-canonical'],
          canonicalSourceCollection: 'kangur_ai_tutor_native_guides',
          hydrationSource: 'kangur_ai_tutor_native_guides',
        };
      }
    }

    if (hit.sourceCollection === 'kangur_ai_tutor_content' && tutorContent) {
      const section = resolveTutorContentCanonicalSection(tutorContent, hit);
      if (section) {
        return {
          ...hit,
          canonicalTitle: section.title,
          canonicalSummary: section.summary,
          canonicalText: section.text,
          canonicalTags: section.tags,
          canonicalSourceCollection: 'kangur_ai_tutor_content',
          hydrationSource: 'kangur_ai_tutor_content',
        };
      }
    }

    if (hit.sourceCollection === 'kangur_context_registry') {
      const runtimeDocument = resolveRuntimeDocumentForGraphHit(
        hit,
        runtimeDocuments,
        ROOT_ENTITY_TYPE_BY_NODE_ID
      );
      if (runtimeDocument) {
        return {
          ...hit,
          canonicalTitle: runtimeDocument.title,
          canonicalSummary: runtimeDocument.summary,
          canonicalText: buildRuntimeDocumentCanonicalText(runtimeDocument),
          canonicalTags: [...new Set([...hit.tags, ...runtimeDocument.tags, 'mongo-canonical'])],
          canonicalSourceCollection: 'kangur-runtime-context',
          hydrationSource: 'kangur-runtime-context',
        };
      }
    }

    return {
      ...hit,
      canonicalTitle: hit.title,
      canonicalSummary: hit.summary,
      canonicalText: hit.summary ?? hit.title,
      canonicalTags: hit.tags,
      canonicalSourceCollection: hit.sourceCollection ?? 'kangur-knowledge-graph',
      hydrationSource: 'graph_fallback',
    };
  });
};

const resolveCmsPagesFallback = async (
  tokens: string[]
): Promise<HydratedKnowledgeGraphHit[]> => {
  if (tokens.length === 0) {
    return [];
  }

  const pages = await cmsService.getPages().catch((error) => {
    void ErrorSystem.captureException(error);
    return [] as Page[];
  });
  const hits: HydratedKnowledgeGraphHit[] = [];

  for (const page of pages) {
    if (page.status !== 'published') {
      continue;
    }

    const textContent = extractCmsPageTextContent(page);
    if (!hasMeaningfulTextContent(textContent)) {
      continue;
    }

    const semanticText = buildCmsPageSemanticText(textContent);
    const searchable = normalizeText(
      [page.name, page.seoTitle, page.seoDescription, semanticText].filter(Boolean).join(' ')
    );

    const tokenHits = tokens.filter((token) => searchable.includes(token)).length;
    if (tokenHits === 0) {
      continue;
    }

    const defaultSlug =
      page.slugs?.find((slug) => slug.isDefault)?.slug ??
      page.slugs?.[0]?.slug ??
      null;
    const route = defaultSlug ? `/${defaultSlug}` : null;
    const title = page.seoTitle ?? page.name;

    hits.push({
      id: `cms-page:${page.id}`,
      kind: 'page',
      title,
      summary: page.seoDescription ?? null,
      surface: null,
      focusKind: null,
      route,
      anchorId: null,
      semanticText,
      embedding: [],
      embeddingModel: null,
      embeddingDimensions: null,
      focusIdPrefixes: [],
      contentIdPrefixes: [],
      triggerPhrases: [],
      sourceCollection: 'cms_pages',
      sourceRecordId: page.id,
      sourcePath: `cms-page:${page.id}`,
      tags: ['cms', 'cms-page', 'website'],
      semanticScore: tokenHits * 18,
      tokenHits,
      relations: [],
      canonicalTitle: title,
      canonicalSummary: page.seoDescription ?? null,
      canonicalText: buildCmsPageCanonicalText(textContent),
      canonicalTags: ['cms', 'cms-page', 'mongo-canonical'],
      canonicalSourceCollection: 'cms_pages',
      hydrationSource: 'cms_pages',
    });
  }

  return hits
    .sort((left, right) => right.semanticScore - left.semanticScore || right.tokenHits - left.tokenHits)
    .slice(0, 4);
};

const rerankKnowledgeGraphHits = (input: {
  hits: HydratedKnowledgeGraphHit[];
  queryEmbedding: number[] | null;
  queryMode: KangurKnowledgeGraphQueryMode;
  intent: KangurKnowledgeGraphQueryIntent;
}): HydratedKnowledgeGraphHit[] =>
  input.hits
    .map((hit) => {
      const vectorScore =
        input.queryMode === 'semantic' &&
        input.queryEmbedding &&
        input.queryEmbedding.length > 0 &&
        hit.embedding.length > 0 &&
        (hit.embeddingDimensions === null || hit.embeddingDimensions === input.queryEmbedding.length)
          ? cosineSimilarity(input.queryEmbedding, hit.embedding)
          : 0;

      const routeMatchesDirectly =
        hit.route !== null && input.intent.preferredRoutes.includes(hit.route);
      const routeMatchesRelation = hit.relations.some(
        (relation) => relation.targetRoute && input.intent.preferredRoutes.includes(relation.targetRoute)
      );
      const surfaceMatches =
        hit.surface !== null && input.intent.preferredSurfaces.includes(hit.surface);
      const focusKindMatches =
        hit.focusKind !== null && input.intent.preferredFocusKinds.includes(hit.focusKind);
      const isGenericFocusedGuide =
        input.intent.isLocationLookup &&
        Boolean(hit.focusKind) &&
        !focusKindMatches;

      let intentScore = 0;
      if (surfaceMatches) {
        intentScore += 42;
      }
      if (routeMatchesDirectly) {
        intentScore += 38;
      }
      if (routeMatchesRelation) {
        intentScore += 18;
      }
      if (focusKindMatches) {
        intentScore += 26;
      }
      if (
        input.intent.isLocationLookup &&
        !hit.focusKind &&
        (hit.kind === 'page' || hit.kind === 'flow' || hit.kind === 'action' || hit.kind === 'guide') &&
        (surfaceMatches || routeMatchesDirectly)
      ) {
        intentScore += 24;
      }
      if (input.intent.isLocationLookup && hit.kind === 'page' && routeMatchesDirectly) {
        intentScore += 34;
      }
      if (input.intent.isLocationLookup && hit.kind === 'flow' && routeMatchesDirectly) {
        intentScore += 18;
      }
      if (isGenericFocusedGuide) {
        intentScore -= 28;
      }
      if (hit.sourceCollection === 'cms_pages' && hit.tokenHits > 0) {
        intentScore += 20;
        if (input.intent.isLocationLookup) {
          intentScore += 16;
        }
      }

      return {
        ...hit,
        semanticScore: hit.semanticScore + Math.round(Math.max(0, vectorScore) * 140) + intentScore,
      };
    })
    .sort((left, right) => {
      if (right.semanticScore !== left.semanticScore) {
        return right.semanticScore - left.semanticScore;
      }
      if (right.tokenHits !== left.tokenHits) {
        return right.tokenHits - left.tokenHits;
      }
      return left.canonicalTitle.localeCompare(right.canonicalTitle);
    });

const toDebugHit = (hit: HydratedKnowledgeGraphHit): KangurKnowledgeGraphDebugHit => ({
  id: hit.id,
  kind: hit.kind,
  title: hit.title,
  summary: hit.summary,
  surface: hit.surface,
  focusKind: hit.focusKind,
  route: hit.route,
  anchorId: hit.anchorId,
  sourceCollection: hit.sourceCollection,
  sourceRecordId: hit.sourceRecordId,
  sourcePath: hit.sourcePath,
  semanticScore: hit.semanticScore,
  tokenHits: hit.tokenHits,
  relatedTargetIds: hit.relations
    .map((relation) => relation.targetId)
    .filter((value): value is string => Boolean(value)),
  canonicalTitle: hit.canonicalTitle,
  canonicalSummary: hit.canonicalSummary,
  canonicalSourceCollection: hit.canonicalSourceCollection,
  hydrationSource: hit.hydrationSource,
});

const resolveWebsiteHelpTargetFromHits = (
  hydratedHits: HydratedKnowledgeGraphHit[]
): KangurAiTutorWebsiteHelpTarget | null => {
  for (const hit of hydratedHits) {
    if (hit.route || hit.anchorId) {
      return {
        nodeId: hit.id,
        label: hit.canonicalTitle,
        route: hit.route,
        anchorId: hit.anchorId,
      };
    }

    const relatedTarget = hit.relations.find(
      (relation) =>
        Boolean(relation.targetId) &&
        Boolean(relation.targetTitle) &&
        (Boolean(relation.targetRoute) || Boolean(relation.targetAnchorId))
    );
    if (relatedTarget?.targetId && relatedTarget.targetTitle) {
      return {
        nodeId: relatedTarget.targetId,
        label: relatedTarget.targetTitle,
        route: relatedTarget.targetRoute,
        anchorId: relatedTarget.targetAnchorId,
      };
    }
  }

  return null;
};

const resolveRecallStrategy = (input: {
  lexicalHitCount: number;
  vectorHitCount: number;
}): KangurKnowledgeGraphRecallStrategy => {
  if (input.lexicalHitCount > 0 && input.vectorHitCount > 0) {
    return 'hybrid_vector';
  }
  if (input.vectorHitCount > 0) {
    return 'vector_only';
  }
  return 'metadata_only';
};

const finalizeResolvedGraphContext = (
  hydratedHits: HydratedKnowledgeGraphHit[],
  querySeed: string,
  normalizedQuerySeed: string,
  tokens: string[],
  queryMode: KangurKnowledgeGraphQueryMode,
  diagnostics: {
    lexicalHitCount: number;
    vectorHitCount: number;
    vectorRecallAttempted: boolean;
  }
): KangurKnowledgeGraphRetrievalPreviewResult => ({
  status: 'hit',
  queryMode,
  recallStrategy: resolveRecallStrategy(diagnostics),
  lexicalHitCount: diagnostics.lexicalHitCount,
  vectorHitCount: diagnostics.vectorHitCount,
  vectorRecallAttempted: diagnostics.vectorRecallAttempted,
  querySeed,
  normalizedQuerySeed,
  tokens,
  instructions: buildInstructions(hydratedHits, queryMode),
  sources: hydratedHits.map(toChatSource),
  nodeIds: hydratedHits.map((hit) => hit.id),
  websiteHelpTarget: resolveWebsiteHelpTargetFromHits(hydratedHits),
  graphFollowUpActions: resolveGraphFollowUpActions(hydratedHits),
  hits: hydratedHits.map(toDebugHit),
  sourceCollections: Array.from(new Set(hydratedHits.map((hit) => hit.canonicalSourceCollection))).sort(),
  hydrationSources: Array.from(new Set(hydratedHits.map((hit) => hit.hydrationSource))).sort(),
});

const buildMissPreviewResult = (input: {
  status: 'disabled' | 'skipped' | 'miss';
  querySeed: string;
  normalizedQuerySeed: string;
  tokens: string[];
}): KangurKnowledgeGraphRetrievalPreviewResult => ({
  status: input.status,
  queryMode: null,
  querySeed: input.querySeed,
  normalizedQuerySeed: input.normalizedQuerySeed,
  tokens: input.tokens,
  instructions: null,
  sources: [],
  nodeIds: [],
  hits: [],
});

async function resolveKangurAiTutorSemanticGraphContextInternal(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  const querySeed = buildRawSemanticQuerySeed(input);
  const normalizedQuerySeed = buildNormalizedSemanticQuerySeed(input);

  if (!isNeo4jEnabled()) {
    const fallbackTokens = tokenizeQuery(normalizedQuerySeed);
    if (fallbackTokens.length > 0) {
      const cmsFallbackHits = await resolveCmsPagesFallback(fallbackTokens);
      if (cmsFallbackHits.length > 0) {
        return finalizeResolvedGraphContext(
          cmsFallbackHits.slice(0, input.limit ?? 4),
          querySeed,
          normalizedQuerySeed,
          fallbackTokens,
          'semantic',
          {
            lexicalHitCount: cmsFallbackHits.length,
            vectorHitCount: 0,
            vectorRecallAttempted: false,
          }
        );
      }
    }

    return buildMissPreviewResult({
      status: 'disabled',
      querySeed,
      normalizedQuerySeed,
      tokens: [],
    });
  }

  const queryMode = resolveGraphQueryMode(input);
  if (!queryMode) {
    return buildMissPreviewResult({
      status: 'skipped',
      querySeed,
      normalizedQuerySeed,
      tokens: [],
    });
  }

  const tokens = tokenizeQuery(normalizedQuerySeed);
  const queryIntent = buildKnowledgeGraphQueryIntent(normalizedQuerySeed);
  if (tokens.length === 0 && !hasSemanticContext(input.context)) {
    return buildMissPreviewResult({
      status: 'skipped',
      querySeed,
      normalizedQuerySeed,
      tokens,
    });
  }

  const queryEmbedding =
    queryMode === 'semantic'
      ? await generateKangurKnowledgeGraphQueryEmbedding(normalizedQuerySeed).catch((error) => {
          void ErrorSystem.captureException(error);
          return null;
        })
      : null;

  const lexicalLimit = input.limit ?? 8;
  const [lexicalResults, vectorHits] = await Promise.all([
    runNeo4jStatements([
      {
        statement: GRAPH_QUERY,
        parameters: {
          graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY,
          tokens,
          surface: input.context?.surface ?? null,
          focusKind: input.context?.focusKind ?? null,
          focusId: input.context?.focusId ?? null,
          contentId: input.context?.contentId ?? null,
          focusLabel: normalizeText(input.context?.focusLabel),
          title: normalizeText(input.context?.title),
          limit: lexicalLimit,
        },
      },
    ]),
    queryMode === 'semantic'
      ? fetchVectorKnowledgeGraphHits({
          graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY,
          queryEmbedding,
          limit: input.limit ?? 8,
        })
      : Promise.resolve([]),
  ]);

  const lexicalHits = ((lexicalResults[0]?.records ?? []) as Partial<KangurKnowledgeGraphHit>[]).map(
    normalizeKnowledgeGraphHit
  );
  const hits = mergeKnowledgeGraphHits(lexicalHits, vectorHits);
  if (hits.length === 0) {
    return buildMissPreviewResult({
      status: 'miss',
      querySeed,
      normalizedQuerySeed,
      tokens,
    });
  }

  const hydratedHits = await hydrateKnowledgeGraphHits(
    hits,
    input.locale?.trim() || 'pl',
    input.runtimeDocuments ?? []
  );
  const resultLimit = input.limit ?? (queryMode === 'website_help' ? 3 : 4);
  const rerankedHits = rerankKnowledgeGraphHits({
    hits: hydratedHits,
    queryEmbedding,
    queryMode,
    intent: queryIntent,
  }).slice(0, resultLimit);

  return finalizeResolvedGraphContext(
    rerankedHits,
    querySeed,
    normalizedQuerySeed,
    tokens,
    queryMode,
    {
      lexicalHitCount: lexicalHits.length,
      vectorHitCount: vectorHits.length,
      vectorRecallAttempted: queryMode === 'semantic' && Boolean(queryEmbedding),
    }
  );
}

export const resolveKangurKnowledgeGraphContext = async (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalResult> =>
  resolveKangurAiTutorSemanticGraphContext(input);

export async function resolveKangurAiTutorSemanticGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalResult> {
  const result = await resolveKangurAiTutorSemanticGraphContextInternal(input);
  if (result.status !== 'hit') {
    return {
      status: result.status,
      queryMode: null,
      instructions: null,
      sources: [],
      nodeIds: [],
    };
  }

  return {
    status: 'hit',
    queryMode: result.queryMode,
    recallStrategy: result.recallStrategy,
    lexicalHitCount: result.lexicalHitCount,
    vectorHitCount: result.vectorHitCount,
    vectorRecallAttempted: result.vectorRecallAttempted,
    instructions: result.instructions,
    sources: result.sources,
    nodeIds: result.nodeIds,
    websiteHelpTarget: result.websiteHelpTarget,
    graphFollowUpActions: result.graphFollowUpActions,
    sourceCollections: result.sourceCollections,
    hydrationSources: result.hydrationSources,
  };
}

export async function previewKangurAiTutorSemanticGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  return resolveKangurAiTutorSemanticGraphContextInternal(input);
}

export async function resolveKangurWebsiteHelpGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalResult> {
  return resolveKangurAiTutorSemanticGraphContext(input);
}

export async function previewKangurWebsiteHelpGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
  limit?: number;
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  return previewKangurAiTutorSemanticGraphContext(input);
}
