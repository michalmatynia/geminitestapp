import 'server-only';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import { KANGUR_KNOWLEDGE_GRAPH_KEY } from '@/shared/contracts/kangur-knowledge-graph';
import { isNeo4jEnabled } from '@/shared/lib/neo4j/config';
import { runNeo4jStatements } from '@/shared/lib/neo4j/client';

type KangurKnowledgeGraphHit = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  route: string | null;
  anchorId: string | null;
  tags: string[];
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

export type KangurKnowledgeGraphRetrievalResult =
  | {
      status: 'disabled' | 'skipped' | 'miss';
      instructions: null;
      sources: [];
      nodeIds: [];
    }
  | {
      status: 'hit';
      instructions: string;
      sources: AgentTeachingChatSource[];
      nodeIds: string[];
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

const GRAPH_QUERY = `
  UNWIND $tokens AS token
  MATCH (n:KangurKnowledgeNode {graphKey: $graphKey})
  WHERE toLower(coalesce(n.title, '')) CONTAINS token
     OR toLower(coalesce(n.summary, '')) CONTAINS token
     OR toLower(coalesce(n.id, '')) CONTAINS token
     OR toLower(coalesce(n.anchorId, '')) CONTAINS token
     OR toLower(coalesce(n.route, '')) CONTAINS token
     OR ANY(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS token)
  WITH n, count(DISTINCT token) AS tokenHits
  OPTIONAL MATCH (n)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: $graphKey})
  RETURN
    n.id AS id,
    n.kind AS kind,
    n.title AS title,
    n.summary AS summary,
    n.route AS route,
    n.anchorId AS anchorId,
    coalesce(n.tags, []) AS tags,
    tokenHits AS tokenHits,
    collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route
    })[0..4] AS relations
  ORDER BY tokenHits DESC, n.title ASC
  LIMIT $limit
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

const buildSourceText = (hit: KangurKnowledgeGraphHit): string => {
  const lines = [`${hit.title} (${hit.kind})`];
  if (hit.summary) {
    lines.push(hit.summary);
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

  return lines.join('\n');
};

const toChatSource = (hit: KangurKnowledgeGraphHit, index: number): AgentTeachingChatSource => ({
  documentId: hit.id,
  collectionId: 'kangur-knowledge-graph',
  text: buildSourceText(hit),
  score: Math.max(0.55, 0.94 - index * 0.07),
  metadata: {
    source: 'manual-text',
    sourceId: hit.id,
    title: hit.title,
    description: hit.summary ?? undefined,
    tags: ['kangur-knowledge-graph', hit.kind, ...(hit.tags ?? [])],
  },
});

const buildInstructions = (hits: KangurKnowledgeGraphHit[]): string => {
  const sections = hits.map((hit) => {
    const parts = [`- ${hit.title} [${hit.kind}]`];
    if (hit.summary) {
      parts.push(`  ${hit.summary}`);
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

  return [
    'Kangur website-help graph context:',
    ...sections,
    'Use this only for website and navigation guidance. When the learner asks where to click or where to find something, name the page, flow, route, or anchor explicitly.',
  ].join('\n');
};

export async function resolveKangurWebsiteHelpGraphContext(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): Promise<KangurKnowledgeGraphRetrievalResult> {
  if (!isNeo4jEnabled()) {
    return {
      status: 'disabled',
      instructions: null,
      sources: [],
      nodeIds: [],
    };
  }

  if (!shouldQueryWebsiteHelpGraph(input)) {
    return {
      status: 'skipped',
      instructions: null,
      sources: [],
      nodeIds: [],
    };
  }

  const tokens = tokenizeQuery(normalizeText(input.latestUserMessage));
  if (tokens.length === 0) {
    return {
      status: 'skipped',
      instructions: null,
      sources: [],
      nodeIds: [],
    };
  }

  const [result] = await runNeo4jStatements([
    {
      statement: GRAPH_QUERY,
      parameters: {
        graphKey: KANGUR_KNOWLEDGE_GRAPH_KEY,
        tokens,
        limit: 3,
      },
    },
  ]);

  const hits = (result?.records ?? []) as KangurKnowledgeGraphHit[];
  if (hits.length === 0) {
    return {
      status: 'miss',
      instructions: null,
      sources: [],
      nodeIds: [],
    };
  }

  return {
    status: 'hit',
    instructions: buildInstructions(hits),
    sources: hits.map(toChatSource),
    nodeIds: hits.map((hit) => hit.id),
  };
}
