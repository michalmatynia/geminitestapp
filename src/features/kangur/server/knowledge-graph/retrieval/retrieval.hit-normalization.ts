import 'server-only';

import type { KangurKnowledgeGraphHit } from './retrieval.contracts';

export const normalizeKnowledgeGraphHit = (hit: Partial<KangurKnowledgeGraphHit>): KangurKnowledgeGraphHit => ({
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

export const mergeKnowledgeGraphHits = (
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
