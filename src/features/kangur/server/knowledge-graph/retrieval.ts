import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorWebsiteHelpTarget,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  KANGUR_KNOWLEDGE_GRAPH_KEY,
  type KangurKnowledgeCanonicalSourceCollection,
} from '@/shared/contracts/kangur-knowledge-graph';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { cmsService } from '@/features/cms/services/cms-service';
import type { Page } from '@/shared/contracts/cms';
import {
  extractCmsPageTextContent,
  buildCmsPageCanonicalText,
  buildCmsPageSemanticText,
  hasMeaningfulTextContent,
} from '@/features/cms/utils/cms-text-extractor';
import { KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { runNeo4jStatements } from '@/shared/lib/neo4j/client';

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

export type GraphFollowUpAction = {
  id: string;
  label: string;
  page: string;
  reason: string | null;
};

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  '/game': 'Game',
  '/lessons': 'Lessons',
  '/profile': 'LearnerProfile',
  '/parent': 'ParentDashboard',
};

const resolvePageKeyFromRoute = (route: string): string | null => {
  const normalized = route.toLowerCase().replace(/\/+$/, '');
  for (const [routePrefix, pageKey] of Object.entries(ROUTE_TO_PAGE_KEY)) {
    if (normalized === routePrefix || normalized.endsWith(routePrefix)) {
      return pageKey;
    }
  }
  return null;
};

type KangurKnowledgeGraphHit = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  surface: string | null;
  focusKind: string | null;
  route: string | null;
  anchorId: string | null;
  semanticText: string | null;
  embedding: number[];
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  focusIdPrefixes: string[];
  contentIdPrefixes: string[];
  triggerPhrases: string[];
  sourceCollection: KangurKnowledgeCanonicalSourceCollection | null;
  sourceRecordId: string | null;
  sourcePath: string | null;
  tags: string[];
  semanticScore: number;
  relations: Array<{
    kind: string | null;
    targetId: string | null;
    targetTitle: string | null;
    targetKind: string | null;
    targetAnchorId: string | null;
    targetRoute: string | null;
    hop?: number;
  }>;
  tokenHits: number;
};

type HydratedKnowledgeGraphHit = KangurKnowledgeGraphHit & {
  canonicalTitle: string;
  canonicalSummary: string | null;
  canonicalText: string;
  canonicalTags: string[];
  canonicalSourceCollection: string;
  hydrationSource:
    | 'kangur_page_content'
    | 'kangur_ai_tutor_content'
    | 'kangur_ai_tutor_native_guides'
    | 'cms_pages'
    | 'kangur-runtime-context'
    | 'graph_fallback';
};

const ROOT_ENTITY_TYPE_BY_NODE_ID: Partial<Record<string, ContextRuntimeDocument['entityType']>> = {
  'root:kangur:learnerSnapshot': 'kangur_learner_snapshot',
  'root:kangur:loginActivity': 'kangur_login_activity',
  'root:kangur:lessonContext': 'kangur_lesson_context',
  'root:kangur:testContext': 'kangur_test_context',
  'root:kangur:assignmentContext': 'kangur_assignment_context',
};

export type KangurKnowledgeGraphRetrievalResult =
  | {
      status: 'disabled' | 'skipped' | 'miss';
      queryMode: null;
      instructions: null;
      sources: [];
      nodeIds: [];
    }
  | {
      status: 'hit';
      queryMode: KangurKnowledgeGraphQueryMode;
      recallStrategy: KangurKnowledgeGraphRecallStrategy;
      lexicalHitCount: number;
      vectorHitCount: number;
      vectorRecallAttempted: boolean;
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
      websiteHelpTarget: KangurAiTutorWebsiteHelpTarget | null;
      graphFollowUpActions: GraphFollowUpAction[];
      sourceCollections: string[];
      hydrationSources: HydratedKnowledgeGraphHit['hydrationSource'][];
    };

export type KangurKnowledgeGraphDebugHit = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  surface: string | null;
  focusKind: string | null;
  route: string | null;
  anchorId: string | null;
  sourceCollection: KangurKnowledgeCanonicalSourceCollection | null;
  sourceRecordId: string | null;
  sourcePath: string | null;
  semanticScore: number;
  tokenHits: number;
  relatedTargetIds: string[];
  canonicalTitle: string;
  canonicalSummary: string | null;
  canonicalSourceCollection: string;
  hydrationSource: HydratedKnowledgeGraphHit['hydrationSource'];
};

export type KangurKnowledgeGraphRetrievalPreviewResult =
  | {
      status: 'disabled' | 'skipped' | 'miss';
      queryMode: null;
      querySeed: string;
      normalizedQuerySeed: string;
      tokens: string[];
      instructions: null;
      sources: [];
      nodeIds: [];
      hits: [];
    }
  | {
      status: 'hit';
      queryMode: KangurKnowledgeGraphQueryMode;
      recallStrategy: KangurKnowledgeGraphRecallStrategy;
      lexicalHitCount: number;
      vectorHitCount: number;
      vectorRecallAttempted: boolean;
      querySeed: string;
      normalizedQuerySeed: string;
      tokens: string[];
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
      websiteHelpTarget: KangurAiTutorWebsiteHelpTarget | null;
      graphFollowUpActions: GraphFollowUpAction[];
      hits: KangurKnowledgeGraphDebugHit[];
      sourceCollections: string[];
      hydrationSources: HydratedKnowledgeGraphHit['hydrationSource'][];
    };

export type KangurKnowledgeGraphQueryMode = 'website_help' | 'semantic';
export type KangurKnowledgeGraphRecallStrategy =
  | 'metadata_only'
  | 'vector_only'
  | 'hybrid_vector';

type KangurKnowledgeGraphQueryIntent = {
  preferredSurfaces: string[];
  preferredRoutes: string[];
  preferredFocusKinds: string[];
  isLocationLookup: boolean;
};

const WEBSITE_HELP_PATTERNS = [
  /co to jest/u,
  /co robi/u,
  /jak dzia[łl]a/u,
  /jak korzysta[ćc]/u,
  /gdzie znajd[ęe]/u,
  /jak wej[śs]c/u,
  /jak si[eę] zalogowa[ćc]/u,
  /jak za[łl]o[żz]y[ćc] konto/u,
  /zaloguj/u,
  /login/u,
  /konto/u,
  /lekcj/u,
  /test/u,
  /zadani/u,
  /profil/u,
  /panel rodzica/u,
  /gdzie jest/u,
  /jak otw[oó]rzy[ćc]/u,
  /jak przej[śs]c/u,
  /stron/u,
  /witryn/u,
  /podstron/u,
  /informacj/u,
  /o nas/u,
  /kontakt/u,
  /regulamin/u,
  /cennik/u,
  /ofert/u,
];

const SEMANTIC_HELP_PATTERNS = [
  ...WEBSITE_HELP_PATTERNS,
  /wyja[śs]nij/u,
  /opisz/u,
  /sekcj/u,
  /panel/u,
  /widok/u,
  /ekran/u,
  /plansz/u,
  /co widze/u,
  /co oznacza/u,
  /co dalej/u,
  /na czym polega/u,
  /powiedz o/u,
  /zapytaj o to/u,
];

const normalizeText = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const tokenizeQuery = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[^a-z0-9]+/i)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length >= 3)
    )
  ).slice(0, 12);

const buildKnowledgeGraphQueryIntent = (value: string): KangurKnowledgeGraphQueryIntent => {
  const normalized = normalizeText(value);
  const preferredSurfaces = new Set<string>();
  const preferredRoutes = new Set<string>();
  const preferredFocusKinds = new Set<string>();

  if (/(zalog|login|konto|ucz[ęe]n|rodzic)/u.test(normalized)) {
    preferredSurfaces.add('auth');
    preferredRoutes.add('/');
    preferredFocusKinds.add('login_action');
    preferredFocusKinds.add('login_form');
    preferredFocusKinds.add('create_account_action');
  }

  if (/(lekcj)/u.test(normalized)) {
    preferredSurfaces.add('lesson');
    preferredRoutes.add('/lessons');
  }

  if (/(test)/u.test(normalized)) {
    preferredSurfaces.add('test');
    preferredRoutes.add('/tests');
    if (/(pytan|pyta[ńn]|pytanie|zadanie testowe)/u.test(normalized)) {
      preferredFocusKinds.add('question');
    }
    if (/(om[oó]w|om[oó]wienie|b[łl][ea]d|po te[śs]cie)/u.test(normalized)) {
      preferredFocusKinds.add('review');
    }
    if (/(podsumow|wynik|rezultat|rezultaty)/u.test(normalized)) {
      preferredFocusKinds.add('summary');
    }
    if (/(pusty zestaw|brak pytan|brak pyta[ńn]|empty)/u.test(normalized)) {
      preferredFocusKinds.add('empty_state');
    }
  }

  if (/(zadani)/u.test(normalized)) {
    preferredSurfaces.add('assignment');
    preferredRoutes.add('/assignments');
  }

  if (/(profil)/u.test(normalized)) {
    preferredSurfaces.add('profile');
    preferredRoutes.add('/profile');
  }

  if (/(gra|grze|misja)/u.test(normalized)) {
    preferredSurfaces.add('game');
    preferredRoutes.add('/game');
    preferredFocusKinds.add('home_quest');
  }

  if (/(panel rodzica|rodzic)/u.test(normalized)) {
    preferredSurfaces.add('parent_dashboard');
    preferredRoutes.add('/parent-dashboard');
  }

  return {
    preferredSurfaces: Array.from(preferredSurfaces),
    preferredRoutes: Array.from(preferredRoutes),
    preferredFocusKinds: Array.from(preferredFocusKinds),
    isLocationLookup:
      /(gdzie|znajd|wrocic|wrócic|wroc|wróc|przejsc|przejść|otworzyc|otworzyć|wejsc|wejść)/u.test(
        normalized
      ),
  };
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

const shouldQueryWebsiteHelpGraph = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): boolean => {
  const normalized = normalizeText(input.latestUserMessage);
  if (!normalized) {
    return false;
  }

  if (WEBSITE_HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  return (
    input.context?.focusKind === 'navigation' ||
    input.context?.focusKind === 'home_actions' ||
    input.context?.focusKind === 'library'
  );
};

const hasSemanticContext = (context: KangurAiTutorConversationContext | undefined): boolean =>
  Boolean(
    context?.surface ||
      context?.focusKind ||
    context?.focusId ||
    context?.contentId ||
    context?.focusLabel ||
    context?.selectedText ||
    context?.title ||
    context?.interactionIntent ||
    context?.promptMode
  );

const resolveGraphQueryMode = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): KangurKnowledgeGraphQueryMode | null => {
  if (shouldQueryWebsiteHelpGraph(input)) {
    return 'website_help';
  }

  const normalized = normalizeText(input.latestUserMessage);
  if (!normalized && !hasSemanticContext(input.context)) {
    return null;
  }

  if (SEMANTIC_HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return 'semantic';
  }

  if (hasSemanticContext(input.context)) {
    return 'semantic';
  }

  return tokenizeQuery(buildNormalizedSemanticQuerySeed(input)).length > 0 ? 'semantic' : null;
};

const GRAPH_QUERY = `
  WITH
    $graphKey AS graphKey,
    $tokens AS tokens,
    toLower(coalesce($surface, '')) AS querySurface,
    toLower(coalesce($focusKind, '')) AS queryFocusKind,
    toLower(coalesce($focusId, '')) AS queryFocusId,
    toLower(coalesce($contentId, '')) AS queryContentId,
    toLower(coalesce($focusLabel, '')) AS queryFocusLabel,
    toLower(coalesce($title, '')) AS queryTitle
  MATCH (n:KangurKnowledgeNode {graphKey: graphKey})
  WITH
    n,
    graphKey,
    tokens,
    querySurface,
    queryFocusKind,
    queryFocusId,
    queryContentId,
    queryFocusLabel,
    queryTitle,
    size([
      token IN tokens
      WHERE toLower(coalesce(n.title, '')) CONTAINS token
         OR toLower(coalesce(n.summary, '')) CONTAINS token
         OR toLower(coalesce(n.semanticText, '')) CONTAINS token
         OR toLower(coalesce(n.id, '')) CONTAINS token
         OR toLower(coalesce(n.anchorId, '')) CONTAINS token
         OR toLower(coalesce(n.route, '')) CONTAINS token
         OR ANY(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS token)
         OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE toLower(phrase) CONTAINS token)
    ]) AS tokenHits,
    reduce(tokenScore = 0, token IN tokens |
      tokenScore +
        CASE
          WHEN toLower(coalesce(n.title, '')) CONTAINS token THEN 18
          WHEN toLower(coalesce(n.summary, '')) CONTAINS token THEN 10
          WHEN toLower(coalesce(n.semanticText, '')) CONTAINS token THEN 12
          WHEN toLower(coalesce(n.id, '')) CONTAINS token THEN 8
          WHEN toLower(coalesce(n.anchorId, '')) CONTAINS token THEN 8
          WHEN toLower(coalesce(n.route, '')) CONTAINS token THEN 6
          WHEN ANY(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS token) THEN 6
          WHEN ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE toLower(phrase) CONTAINS token) THEN 12
          ELSE 0
        END
    ) AS tokenScore,
    CASE
      WHEN querySurface <> '' AND toLower(coalesce(n.surface, '')) = querySurface THEN 45
      ELSE 0
    END AS surfaceScore,
    CASE
      WHEN queryFocusKind <> '' AND toLower(coalesce(n.focusKind, '')) = queryFocusKind THEN 65
      ELSE 0
    END AS focusKindScore,
    CASE
      WHEN queryFocusId <> '' AND ANY(prefix IN coalesce(n.focusIdPrefixes, []) WHERE toLower(prefix) = queryFocusId) THEN 85
      WHEN queryFocusId <> '' AND ANY(prefix IN coalesce(n.focusIdPrefixes, []) WHERE queryFocusId STARTS WITH toLower(prefix)) THEN 48
      ELSE 0
    END AS focusIdScore,
    CASE
      WHEN queryContentId <> '' AND ANY(prefix IN coalesce(n.contentIdPrefixes, []) WHERE toLower(prefix) = queryContentId) THEN 70
      WHEN queryContentId <> '' AND ANY(prefix IN coalesce(n.contentIdPrefixes, []) WHERE queryContentId STARTS WITH toLower(prefix)) THEN 38
      ELSE 0
    END AS contentIdScore,
    CASE
      WHEN queryFocusLabel <> '' AND (
        toLower(coalesce(n.title, '')) CONTAINS queryFocusLabel
        OR queryFocusLabel CONTAINS toLower(coalesce(n.title, ''))
        OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE queryFocusLabel CONTAINS toLower(phrase))
      ) THEN 26
      ELSE 0
    END AS focusLabelScore,
    CASE
      WHEN queryTitle <> '' AND (
        toLower(coalesce(n.title, '')) CONTAINS queryTitle
        OR queryTitle CONTAINS toLower(coalesce(n.title, ''))
        OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE queryTitle CONTAINS toLower(phrase))
      ) THEN 24
      ELSE 0
    END AS titleScore
  WITH
    n,
    tokenHits,
    tokenScore,
    surfaceScore,
    focusKindScore,
    focusIdScore,
    contentIdScore,
    focusLabelScore,
    titleScore,
    (
      tokenScore +
      surfaceScore +
      focusKindScore +
      focusIdScore +
      contentIdScore +
      focusLabelScore +
      titleScore
    ) AS semanticScore,
    graphKey
  WHERE semanticScore > 0 OR tokenHits > 0
  OPTIONAL MATCH (n)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: graphKey})
  OPTIONAL MATCH (m)-[r2:KANGUR_RELATION]->(m2:KangurKnowledgeNode {graphKey: graphKey})
  WHERE m2.id <> n.id
  RETURN
    n.id AS id,
    n.kind AS kind,
    n.title AS title,
    n.summary AS summary,
    n.surface AS surface,
    n.focusKind AS focusKind,
    n.route AS route,
    n.anchorId AS anchorId,
    n.semanticText AS semanticText,
    coalesce(n.embedding, []) AS embedding,
    n.embeddingModel AS embeddingModel,
    n.embeddingDimensions AS embeddingDimensions,
    coalesce(n.focusIdPrefixes, []) AS focusIdPrefixes,
    coalesce(n.contentIdPrefixes, []) AS contentIdPrefixes,
    coalesce(n.triggerPhrases, []) AS triggerPhrases,
    n.sourceCollection AS sourceCollection,
    n.sourceRecordId AS sourceRecordId,
    n.sourcePath AS sourcePath,
    coalesce(n.tags, []) AS tags,
    semanticScore AS semanticScore,
    tokenHits AS tokenHits,
    (collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route,
      hop: 1
    })[0..4] + collect({
      kind: r2.kind,
      targetId: m2.id,
      targetTitle: m2.title,
      targetKind: m2.kind,
      targetAnchorId: m2.anchorId,
      targetRoute: m2.route,
      hop: 2
    })[0..3]) AS relations
  ORDER BY semanticScore DESC, tokenHits DESC, n.title ASC
  LIMIT $limit
`;

const VECTOR_GRAPH_QUERY = `
  CALL db.index.vector.queryNodes($indexName, $limit, $embedding)
  YIELD node, score
  WHERE node.graphKey = $graphKey
  OPTIONAL MATCH (node)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: $graphKey})
  OPTIONAL MATCH (m)-[r2:KANGUR_RELATION]->(m2:KangurKnowledgeNode {graphKey: $graphKey})
  WHERE m2.id <> node.id
  RETURN
    node.id AS id,
    node.kind AS kind,
    node.title AS title,
    node.summary AS summary,
    node.surface AS surface,
    node.focusKind AS focusKind,
    node.route AS route,
    node.anchorId AS anchorId,
    node.semanticText AS semanticText,
    coalesce(node.embedding, []) AS embedding,
    node.embeddingModel AS embeddingModel,
    node.embeddingDimensions AS embeddingDimensions,
    coalesce(node.focusIdPrefixes, []) AS focusIdPrefixes,
    coalesce(node.contentIdPrefixes, []) AS contentIdPrefixes,
    coalesce(node.triggerPhrases, []) AS triggerPhrases,
    node.sourceCollection AS sourceCollection,
    node.sourceRecordId AS sourceRecordId,
    node.sourcePath AS sourcePath,
    coalesce(node.tags, []) AS tags,
    toInteger(round(score * 1000.0)) AS semanticScore,
    0 AS tokenHits,
    (collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route,
      hop: 1
    })[0..4] + collect({
      kind: r2.kind,
      targetId: m2.id,
      targetTitle: m2.title,
      targetKind: m2.kind,
      targetAnchorId: m2.anchorId,
      targetRoute: m2.route,
      hop: 2
    })[0..3]) AS relations
  ORDER BY semanticScore DESC, node.title ASC
`;

const normalizeKnowledgeGraphHit = (hit: Partial<KangurKnowledgeGraphHit>): KangurKnowledgeGraphHit => ({
  id: typeof hit.id === 'string' ? hit.id : '',
  kind: typeof hit.kind === 'string' ? hit.kind : 'unknown',
  title: typeof hit.title === 'string' ? hit.title : '',
  summary: typeof hit.summary === 'string' ? hit.summary : null,
  surface: typeof hit.surface === 'string' ? hit.surface : null,
  focusKind: typeof hit.focusKind === 'string' ? hit.focusKind : null,
  route: typeof hit.route === 'string' ? hit.route : null,
  anchorId: typeof hit.anchorId === 'string' ? hit.anchorId : null,
  semanticText: typeof hit.semanticText === 'string' ? hit.semanticText : null,
  embedding: Array.isArray(hit.embedding)
    ? hit.embedding.filter((value): value is number => typeof value === 'number')
    : [],
  embeddingModel: typeof hit.embeddingModel === 'string' ? hit.embeddingModel : null,
  embeddingDimensions: typeof hit.embeddingDimensions === 'number' ? hit.embeddingDimensions : null,
  focusIdPrefixes: Array.isArray(hit.focusIdPrefixes)
    ? hit.focusIdPrefixes.filter((value): value is string => typeof value === 'string')
    : [],
  contentIdPrefixes: Array.isArray(hit.contentIdPrefixes)
    ? hit.contentIdPrefixes.filter((value): value is string => typeof value === 'string')
    : [],
  triggerPhrases: Array.isArray(hit.triggerPhrases)
    ? hit.triggerPhrases.filter((value): value is string => typeof value === 'string')
    : [],
  sourceCollection: hit.sourceCollection ?? null,
  sourceRecordId: typeof hit.sourceRecordId === 'string' ? hit.sourceRecordId : null,
  sourcePath: typeof hit.sourcePath === 'string' ? hit.sourcePath : null,
  tags: Array.isArray(hit.tags) ? hit.tags.filter((value): value is string => typeof value === 'string') : [],
  relations: Array.isArray(hit.relations)
    ? hit.relations.map((relation) => ({
        kind: typeof relation?.kind === 'string' ? relation.kind : null,
        targetId: typeof relation?.targetId === 'string' ? relation.targetId : null,
        targetTitle: typeof relation?.targetTitle === 'string' ? relation.targetTitle : null,
        targetKind: typeof relation?.targetKind === 'string' ? relation.targetKind : null,
        targetAnchorId:
          typeof relation?.targetAnchorId === 'string' ? relation.targetAnchorId : null,
        targetRoute: typeof relation?.targetRoute === 'string' ? relation.targetRoute : null,
      }))
    : [],
  semanticScore: typeof hit.semanticScore === 'number' ? hit.semanticScore : 0,
  tokenHits: typeof hit.tokenHits === 'number' ? hit.tokenHits : 0,
});

const mergeKnowledgeGraphHits = (
  primaryHits: KangurKnowledgeGraphHit[],
  secondaryHits: KangurKnowledgeGraphHit[]
): KangurKnowledgeGraphHit[] => {
  const merged = new Map<string, KangurKnowledgeGraphHit>();

  for (const hit of [...primaryHits, ...secondaryHits]) {
    const existing = merged.get(hit.id);
    if (!existing) {
      merged.set(hit.id, hit);
      continue;
    }

    merged.set(hit.id, {
      ...existing,
      ...hit,
      semanticScore: Math.max(existing.semanticScore, hit.semanticScore),
      tokenHits: Math.max(existing.tokenHits, hit.tokenHits),
      tags: Array.from(new Set([...existing.tags, ...hit.tags])),
      focusIdPrefixes: Array.from(new Set([...existing.focusIdPrefixes, ...hit.focusIdPrefixes])),
      contentIdPrefixes: Array.from(
        new Set([...existing.contentIdPrefixes, ...hit.contentIdPrefixes])
      ),
      triggerPhrases: Array.from(new Set([...existing.triggerPhrases, ...hit.triggerPhrases])),
      relations: [...existing.relations, ...hit.relations].filter(
        (relation, index, relations) =>
          relations.findIndex(
            (candidate) =>
              candidate.targetId === relation.targetId &&
              candidate.targetAnchorId === relation.targetAnchorId &&
              candidate.targetRoute === relation.targetRoute &&
              candidate.kind === relation.kind
          ) === index
      ),
    });
  }

  return Array.from(merged.values());
};

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
  } catch {
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
  const needsTutorContent = hits.some(
    (hit) => hit.sourceCollection === 'kangur_ai_tutor_content'
  );
  const needsNativeGuideStore = hits.some(
    (hit) => hit.sourceCollection === 'kangur_ai_tutor_native_guides'
  );
  const needsPageContentStore = hits.some(
    (hit) => hit.sourceCollection === 'kangur_page_content'
  );
  const needsCmsPages = hits.some(
    (hit) => hit.sourceCollection === 'cms_pages'
  );

  const [tutorContent, nativeGuideStore, pageContentStore, cmsPages] = await Promise.all([
    needsTutorContent ? getKangurAiTutorContent(locale).catch(() => null) : Promise.resolve(null),
    needsNativeGuideStore
      ? getKangurAiTutorNativeGuideStore(locale).catch(() => null)
      : Promise.resolve(null),
    needsPageContentStore ? getKangurPageContentStore(locale).catch(() => null) : Promise.resolve(null),
    needsCmsPages ? cmsService.getPages().catch(() => [] as Page[]) : Promise.resolve([] as Page[]),
  ]);

  const nativeGuideEntriesById = new Map(
    (nativeGuideStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const pageContentEntriesById = new Map(
    (pageContentStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const cmsPagesById = new Map(
    cmsPages.map((page) => [page.id, page] as const)
  );

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

    if (
      hit.sourceCollection === 'kangur_ai_tutor_content' &&
      tutorContent
    ) {
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
  _normalizedQuery: string,
  tokens: string[],
  _locale: string
): Promise<HydratedKnowledgeGraphHit[]> => {
  if (tokens.length === 0) {
    return [];
  }

  const pages = await cmsService.getPages().catch(() => [] as Page[]);
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

    const defaultSlug = page.slugs?.[0]?.slug;
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
    .sort((a, b) => b.semanticScore - a.semanticScore || b.tokenHits - a.tokenHits)
    .slice(0, 4);
};

const rerankKnowledgeGraphHits = (input: {
  hits: HydratedKnowledgeGraphHit[];
  queryEmbedding: number[] | null;
  queryMode: KangurKnowledgeGraphQueryMode;
  intent: KangurKnowledgeGraphQueryIntent;
}): HydratedKnowledgeGraphHit[] => {
  return input.hits
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
        semanticScore:
          hit.semanticScore + Math.round(Math.max(0, vectorScore) * 140) + intentScore,
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
};

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
        Boolean(relation.targetId) && Boolean(relation.targetTitle) &&
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
  sourceCollections: Array.from(
    new Set(hydratedHits.map((hit) => hit.canonicalSourceCollection))
  ).sort(),
  hydrationSources: Array.from(new Set(hydratedHits.map((hit) => hit.hydrationSource))).sort(),
});

async function resolveKangurAiTutorSemanticGraphContextInternal(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  const querySeed = buildRawSemanticQuerySeed(input);
  const normalizedQuerySeed = buildNormalizedSemanticQuerySeed(input);

  if (!isNeo4jEnabled()) {
    const fallbackTokens = tokenizeQuery(normalizedQuerySeed);
    if (fallbackTokens.length > 0) {
      const cmsFallbackHits = await resolveCmsPagesFallback(
        normalizedQuerySeed,
        fallbackTokens,
        input.locale?.trim() || 'pl'
      );
      if (cmsFallbackHits.length > 0) {
        return finalizeResolvedGraphContext(
          cmsFallbackHits,
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

    return {
      status: 'disabled',
      queryMode: null,
      querySeed,
      normalizedQuerySeed,
      tokens: [],
      instructions: null,
      sources: [],
      nodeIds: [],
      hits: [],
    };
  }

  const queryMode = resolveGraphQueryMode(input);
  if (!queryMode) {
    return {
      status: 'skipped',
      queryMode: null,
      querySeed,
      normalizedQuerySeed,
      tokens: [],
      instructions: null,
      sources: [],
      nodeIds: [],
      hits: [],
    };
  }

  const tokens = tokenizeQuery(normalizedQuerySeed);
  const queryIntent = buildKnowledgeGraphQueryIntent(normalizedQuerySeed);
  if (tokens.length === 0 && !hasSemanticContext(input.context)) {
    return {
      status: 'skipped',
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

  const queryEmbedding =
    queryMode === 'semantic'
      ? await generateKangurKnowledgeGraphQueryEmbedding(normalizedQuerySeed).catch(() => null)
      : null;

  const lexicalLimit = queryMode === 'website_help' ? 8 : 8;
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
          limit: 8,
        })
      : Promise.resolve([]),
  ]);

  const lexicalHits = ((lexicalResults[0]?.records ?? []) as Partial<KangurKnowledgeGraphHit>[]).map(
    normalizeKnowledgeGraphHit
  );
  const hits = mergeKnowledgeGraphHits(lexicalHits, vectorHits);
  if (hits.length === 0) {
    return {
      status: 'miss',
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

  const hydratedHits = await hydrateKnowledgeGraphHits(
    hits,
    input.locale?.trim() || 'pl',
    input.runtimeDocuments ?? []
  );
  const rerankedHits = rerankKnowledgeGraphHits({
    hits: hydratedHits,
    queryEmbedding,
    queryMode,
    intent: queryIntent,
  }).slice(0, queryMode === 'website_help' ? 3 : 4);

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

export async function resolveKangurAiTutorSemanticGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
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
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  return resolveKangurAiTutorSemanticGraphContextInternal(input);
}

export async function resolveKangurWebsiteHelpGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
}): Promise<KangurKnowledgeGraphRetrievalResult> {
  return resolveKangurAiTutorSemanticGraphContext(input);
}

export async function previewKangurWebsiteHelpGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string;
  runtimeDocuments?: ContextRuntimeDocument[];
}): Promise<KangurKnowledgeGraphRetrievalPreviewResult> {
  return previewKangurAiTutorSemanticGraphContext(input);
}
