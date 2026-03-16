import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorNativeGuideEntry } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';

export type KnowledgeGraphRelation = {
  kind: string | null;
  targetId: string | null;
  targetTitle: string | null;
  targetAnchorId: string | null;
  targetRoute: string | null;
};

export type KnowledgeGraphSourceHit = {
  canonicalTitle: string;
  canonicalSummary: string | null;
  kind: string;
  route: string | null;
  anchorId: string | null;
  canonicalText: string;
  relations: KnowledgeGraphRelation[];
};

export type KnowledgeGraphHitRef = {
  id: string;
  relations: Array<{ targetId: string | null }>;
};

export type KnowledgeGraphContentHitRef = {
  sourcePath: string | null;
  summary: string | null;
  tags: string[];
};

export type RootEntityTypeByNodeId = Partial<
  Record<string, ContextRuntimeDocument['entityType']>
>;

export const formatRelatedLine = (relation: KnowledgeGraphRelation): string | null => {
  if (!relation.targetId || !relation.targetTitle) {
    return null;
  }

  const extras = [relation.targetRoute, relation.targetAnchorId].filter(Boolean).join(' · ');
  return extras
    ? `${relation.kind}: ${relation.targetTitle} (${extras})`
    : `${relation.kind}: ${relation.targetTitle}`;
};

export const buildSourceText = (hit: KnowledgeGraphSourceHit): string => {
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

export const readRuntimeStringFact = (
  document: ContextRuntimeDocument,
  key: string
): string | null => {
  const value = document.facts?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

export const buildRuntimeDocumentCanonicalText = (document: ContextRuntimeDocument): string => {
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

export const resolveRuntimeDocumentForGraphHit = (
  hit: KnowledgeGraphHitRef,
  runtimeDocuments: ContextRuntimeDocument[],
  rootEntityTypeByNodeId: RootEntityTypeByNodeId
): ContextRuntimeDocument | null => {
  const targetIds = new Set<string>([
    hit.id,
    ...hit.relations
      .map((relation) => relation.targetId)
      .filter((value): value is string => Boolean(value)),
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

    if (rootEntityTypeByNodeId[hit.id] === document.entityType) {
      score += 80;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDocument = document;
    }
  }

  return bestScore > 0 ? bestDocument : null;
};

export const formatNativeGuideText = (entry: KangurAiTutorNativeGuideEntry): string => {
  const lines = [entry.fullDescription];
  if (entry.hints.length > 0) {
    lines.push(`Hints: ${entry.hints.join(' | ')}`);
  }
  if (entry.followUpActions.length > 0) {
    lines.push(
      `Suggested actions: ${entry.followUpActions
        .map((action) => `${action.label} -> ${action.page}`)
        .join(' | ')}`
    );
  }
  return lines.join('\n');
};

export const resolveTutorContentCanonicalSection = (
  content: KangurAiTutorContent,
  hit: KnowledgeGraphContentHitRef
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
