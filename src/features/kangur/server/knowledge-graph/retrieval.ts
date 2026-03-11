import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorWebsiteHelpTarget,
} from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import type {
  KangurAiTutorNativeGuideEntry,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import {
  KANGUR_KNOWLEDGE_GRAPH_KEY,
  type KangurKnowledgeCanonicalSourceCollection,
} from '@/shared/contracts/kangur-knowledge-graph';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurAiTutorNativeGuideStore } from '@/features/kangur/server/ai-tutor-native-guide-repository';
import { KANGUR_KNOWLEDGE_GRAPH_VECTOR_INDEX } from '@/features/kangur/server/knowledge-graph/neo4j-repository';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { runNeo4jStatements } from '@/shared/lib/neo4j/client';

import {
  cosineSimilarity,
  generateKangurKnowledgeGraphQueryEmbedding,
} from './semantic';

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
    | 'kangur_ai_tutor_content'
    | 'kangur_ai_tutor_native_guides'
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
      tokens: string[];
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
      websiteHelpTarget: KangurAiTutorWebsiteHelpTarget | null;
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
  /jak dziala/u,
  /jak korzystac/u,
  /gdzie znajde/u,
  /jak wejsc/u,
  /jak sie zalogowac/u,
  /jak zalozyc konto/u,
  /zaloguj/u,
  /login/u,
  /konto/u,
  /lekcj/u,
  /test/u,
  /zadani/u,
  /profil/u,
  /panel rodzica/u,
  /gdzie jest/u,
  /jak otworzyc/u,
  /jak przejsc/u,
];

const SEMANTIC_HELP_PATTERNS = [
  ...WEBSITE_HELP_PATTERNS,
  /wyjasnij/u,
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

  if (/(zalog|login|konto|uczen|rodzic)/u.test(normalized)) {
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
    if (/(pytan|pytanie|zadanie testowe)/u.test(normalized)) {
      preferredFocusKinds.add('question');
    }
    if (/(omow|omowienie|bled|błąd|po tescie)/u.test(normalized)) {
      preferredFocusKinds.add('review');
    }
    if (/(podsumow|wynik|rezultat|rezultaty)/u.test(normalized)) {
      preferredFocusKinds.add('summary');
    }
    if (/(pusty zestaw|brak pytan|brak pytań|empty)/u.test(normalized)) {
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

const buildSemanticQuerySeed = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): string =>
  [
    normalizeText(input.latestUserMessage),
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

  return tokenizeQuery(buildSemanticQuerySeed(input)).length > 0 ? 'semantic' : null;
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
    collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route
    })[0..4] AS relations
  ORDER BY semanticScore DESC, tokenHits DESC, n.title ASC
  LIMIT $limit
`;

const VECTOR_GRAPH_QUERY = `
  CALL db.index.vector.queryNodes($indexName, $limit, $embedding)
  YIELD node, score
  WHERE node.graphKey = $graphKey
  OPTIONAL MATCH (node)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: $graphKey})
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
    collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route
    })[0..4] AS relations
  ORDER BY semanticScore DESC, node.title ASC
`;

const formatRelatedLine = (relation: KangurKnowledgeGraphHit['relations'][number]): string | null => {
  if (!relation.targetId || !relation.targetTitle) {
    return null;
  }

  const extras = [relation.targetRoute, relation.targetAnchorId].filter(Boolean).join(' · ');
  return extras
    ? `${relation.kind}: ${relation.targetTitle} (${extras})`
    : `${relation.kind}: ${relation.targetTitle}`;
};

const buildSourceText = (hit: HydratedKnowledgeGraphHit): string => {
  const lines = [`${hit.canonicalTitle} (${hit.kind})`];
  if (hit.canonicalSummary) {
    lines.push(hit.canonicalSummary);
  }
  if (hit.route || hit.anchorId) {
    lines.push(
      ['Website target:', hit.route, hit.anchorId ? `anchor=${hit.anchorId}` : null]
        .filter(Boolean)
        .join(' ')
    );
  }

  const related = hit.relations.map(formatRelatedLine).filter(Boolean);
  if (related.length > 0) {
    lines.push(`Related: ${related.join(' | ')}`);
  }

  lines.push(hit.canonicalText);

  return lines.join('\n');
};

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
    return [
      'Kangur website-help graph context:',
      ...sections,
      'Use Mongo-backed Kangur tutor knowledge as the canonical explanation source when available. Use Neo4j only to resolve the best related page, flow, route, or anchor.',
      'Use this only for website and navigation guidance. When the learner asks where to click or where to find something, name the page, flow, route, or anchor explicitly.',
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

const readRuntimeStringFact = (
  document: ContextRuntimeDocument,
  key: string
): string | null => {
  const value = document.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const buildRuntimeDocumentCanonicalText = (document: ContextRuntimeDocument): string => {
  const sectionText =
    document.sections
      ?.map((section) => (typeof section.text === 'string' ? section.text.trim() : ''))
      .find(Boolean) ?? null;
  const parts = [
    document.summary.trim(),
    sectionText,
    readRuntimeStringFact(document, 'learnerSummary'),
    readRuntimeStringFact(document, 'recentLoginActivitySummary'),
    readRuntimeStringFact(document, 'currentQuestion'),
    readRuntimeStringFact(document, 'assignmentSummary'),
    readRuntimeStringFact(document, 'masterySummary'),
    readRuntimeStringFact(document, 'description'),
    readRuntimeStringFact(document, 'documentSummary'),
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  return parts.join('\n');
};

const resolveRuntimeDocumentForGraphHit = (
  hit: KangurKnowledgeGraphHit,
  runtimeDocuments: ContextRuntimeDocument[]
): ContextRuntimeDocument | null => {
  const targetIds = new Set<string>([
    hit.id,
    ...hit.relations.map((relation) => relation.targetId).filter((value): value is string => Boolean(value)),
  ]);

  let bestDocument: ContextRuntimeDocument | null = null;
  let bestScore = -1;

  for (const document of runtimeDocuments) {
    let score = 0;
    if (document.relatedNodeIds.includes(hit.id)) {
      score += 100;
    }

    const relatedMatches = document.relatedNodeIds.filter((nodeId) => targetIds.has(nodeId)).length;
    score += relatedMatches * 30;

    if (ROOT_ENTITY_TYPE_BY_NODE_ID[hit.id] === document.entityType) {
      score += 80;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDocument = document;
    }
  }

  return bestScore > 0 ? bestDocument : null;
};

const formatNativeGuideText = (entry: KangurAiTutorNativeGuideEntry): string => {
  const lines = [entry.fullDescription];
  if (entry.hints.length > 0) {
    lines.push(`Hints: ${entry.hints.join(' | ')}`);
  }
  if (entry.followUpActions.length > 0) {
    lines.push(
      `Suggested actions: ${entry.followUpActions.map((action) => `${action.label} -> ${action.page}`).join(' | ')}`
    );
  }
  return lines.join('\n');
};

const resolveTutorContentCanonicalSection = (
  content: KangurAiTutorContent,
  hit: KangurKnowledgeGraphHit
): { title: string; summary: string | null; text: string; tags: string[] } | null => {
  switch (hit.sourcePath) {
    case 'common.signInLabel':
      return {
        title: content.common.signInLabel,
        summary: hit.summary,
        text: [
          content.guestIntro.help.headline,
          content.guestIntro.help.description,
          `Primary action label: ${content.common.signInLabel}`,
        ].join('\n'),
        tags: [...hit.tags, 'mongo-canonical'],
      };
    case 'common.createAccountLabel':
      return {
        title: content.common.createAccountLabel,
        summary: hit.summary,
        text: [
          content.guestIntro.help.headline,
          content.guestIntro.help.description,
          `Primary action label: ${content.common.createAccountLabel}`,
        ].join('\n'),
        tags: [...hit.tags, 'mongo-canonical'],
      };
    case 'guidedCallout.auth.signInNav':
      return {
        title: content.guidedCallout.authTitles.signInNav,
        summary: content.guidedCallout.authDetails.signInNav,
        text: [
          content.guidedCallout.authTitles.signInNav,
          content.guidedCallout.authDetails.signInNav,
          `Use the navigation action labeled "${content.common.signInLabel}".`,
        ].join('\n'),
        tags: [...hit.tags, 'mongo-canonical'],
      };
    case 'guidedCallout.auth.createAccountNav':
      return {
        title: content.guidedCallout.authTitles.createAccountNav,
        summary: content.guidedCallout.authDetails.createAccountNav,
        text: [
          content.guidedCallout.authTitles.createAccountNav,
          content.guidedCallout.authDetails.createAccountNav,
          `Use the navigation action labeled "${content.common.createAccountLabel}".`,
        ].join('\n'),
        tags: [...hit.tags, 'mongo-canonical'],
      };
    case 'guestIntro.initial':
      return {
        title: content.guestIntro.initial.headline,
        summary: content.guestIntro.initial.description,
        text: [
          content.guestIntro.initial.headline,
          content.guestIntro.initial.description,
          `Available actions: ${content.guestIntro.acceptLabel}, ${content.guestIntro.dismissLabel}, ${content.guestIntro.showLoginLabel}, ${content.guestIntro.showCreateAccountLabel}.`,
        ].join('\n'),
        tags: [...hit.tags, 'mongo-canonical'],
      };
    default:
      return null;
  }
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

  const [tutorContent, nativeGuideStore] = await Promise.all([
    needsTutorContent ? getKangurAiTutorContent(locale).catch(() => null) : Promise.resolve(null),
    needsNativeGuideStore
      ? getKangurAiTutorNativeGuideStore(locale).catch(() => null)
      : Promise.resolve(null),
  ]);

  const nativeGuideEntriesById = new Map(
    (nativeGuideStore?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );

  return hits.map((hit) => {
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
      const runtimeDocument = resolveRuntimeDocumentForGraphHit(hit, runtimeDocuments);
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
  tokens,
  instructions: buildInstructions(hydratedHits, queryMode),
  sources: hydratedHits.map(toChatSource),
  nodeIds: hydratedHits.map((hit) => hit.id),
  websiteHelpTarget: resolveWebsiteHelpTargetFromHits(hydratedHits),
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
  if (!isNeo4jEnabled()) {
    return {
      status: 'disabled',
      queryMode: null,
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
      tokens: [],
      instructions: null,
      sources: [],
      nodeIds: [],
      hits: [],
    };
  }

  const tokens = tokenizeQuery(buildSemanticQuerySeed(input));
  const queryIntent = buildKnowledgeGraphQueryIntent(buildSemanticQuerySeed(input));
  if (tokens.length === 0 && !hasSemanticContext(input.context)) {
    return {
      status: 'skipped',
      queryMode: null,
      tokens,
      instructions: null,
      sources: [],
      nodeIds: [],
      hits: [],
    };
  }

  const queryEmbedding =
    queryMode === 'semantic'
      ? await generateKangurKnowledgeGraphQueryEmbedding(buildSemanticQuerySeed(input)).catch(() => null)
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

  return finalizeResolvedGraphContext(rerankedHits, tokens, queryMode, {
    lexicalHitCount: lexicalHits.length,
    vectorHitCount: vectorHits.length,
    vectorRecallAttempted: queryMode === 'semantic' && Boolean(queryEmbedding),
  });
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
