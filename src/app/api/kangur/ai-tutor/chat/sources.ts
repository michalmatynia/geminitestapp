import 'server-only';

import type { GraphFollowUpAction } from '@/features/kangur/server/knowledge-graph/retrieval';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';
import type { KangurAiTutorChatResponse } from '@/shared/contracts/kangur-ai-tutor';

import { readStringFact } from './build-system-prompt';

// ---------------------------------------------------------------------------
// Source text extraction
// ---------------------------------------------------------------------------

const buildRuntimeDocumentSourceText = (
  document: ContextRuntimeDocument | null | undefined
): string | null => {
  if (!document) {
    return null;
  }

  const sectionText =
    document.sections
      ?.map((section) => (typeof section.text === 'string' ? section.text.trim() : ''))
      .find(Boolean) ?? null;
  const summary = document.summary.trim();
  const currentQuestion = readStringFact(document, 'currentQuestion');
  const assignmentSummary = readStringFact(document, 'assignmentSummary');
  const masterySummary = readStringFact(document, 'masterySummary');
  const text = [summary, sectionText, currentQuestion, assignmentSummary, masterySummary]
    .filter(
      (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index
    )
    .join('\n')
    .trim();

  if (!text) {
    return null;
  }

  return text.length > 320 ? `${text.slice(0, 317).trimEnd()}...` : text;
};

const toKangurTutorChatSource = (
  document: ContextRuntimeDocument,
  score: number
): AgentTeachingChatSource | null => {
  const text = buildRuntimeDocumentSourceText(document);
  if (!text) {
    return null;
  }

  return {
    documentId: document.id,
    collectionId: 'kangur-runtime-context',
    text,
    score,
    metadata: {
      source: 'manual-text',
      sourceId: document.id,
      title: document.title,
      description: document.summary,
      tags: document.tags,
    },
  };
};

export const buildKangurTutorResponseSources = (input: {
  learnerSnapshot: ContextRuntimeDocument | null;
  surfaceContext: ContextRuntimeDocument | null;
  assignmentContext: ContextRuntimeDocument | null;
  extraSources?: AgentTeachingChatSource[];
}): AgentTeachingChatSource[] => {
  const candidates = [input.surfaceContext, input.assignmentContext];
  if (!candidates.some(Boolean) && input.learnerSnapshot) {
    candidates.push(input.learnerSnapshot);
  }

  const seen = new Set<string>();

  const runtimeSources = candidates.reduce<AgentTeachingChatSource[]>(
    (acc, document, index) => {
      if (!document || seen.has(document.id)) {
        return acc;
      }

      const source = toKangurTutorChatSource(document, Math.max(0.5, 0.98 - index * 0.06));
      if (!source) {
        return acc;
      }

      seen.add(document.id);
      acc.push(source);
      return acc;
    },
    []
  );

  const mergedSeen = new Set<string>();
  return [...(input.extraSources ?? []), ...runtimeSources].filter((source) => {
    const key = `${source.collectionId}:${source.documentId}`;
    if (mergedSeen.has(key)) {
      return false;
    }
    mergedSeen.add(key);
    return true;
  });
};

// ---------------------------------------------------------------------------
// Follow-up action merging
// ---------------------------------------------------------------------------

export const mergeFollowUpActions = (
  primary: KangurAiTutorChatResponse['followUpActions'],
  graphActions?: GraphFollowUpAction[] | null
): KangurAiTutorChatResponse['followUpActions'] => {
  const primaryActions = primary ?? [];
  const graphActionList = graphActions ?? [];

  if (graphActionList.length === 0) {
    return primaryActions;
  }

  const existingPages = new Set<string>(primaryActions.map((a) => a.page));
  const additions = graphActionList
    .filter((ga) => !existingPages.has(ga.page))
    .map((ga) => ({
      id: ga.id,
      label: ga.label,
      page: ga.page as 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile',
      ...(ga.reason ? { reason: ga.reason } : {}),
    }));

  return [...primaryActions, ...additions];
};

// ---------------------------------------------------------------------------
// Knowledge graph response summary
// ---------------------------------------------------------------------------

export const buildKnowledgeGraphResponseSummary = (input: {
  knowledgeGraphApplied: boolean;
  knowledgeGraphQueryStatus: 'hit' | 'miss' | 'skipped' | 'disabled';
  knowledgeGraphQueryMode: 'website_help' | 'semantic' | null;
  knowledgeGraphRecallStrategy: 'metadata_only' | 'vector_only' | 'hybrid_vector' | null;
  knowledgeGraphLexicalHitCount: number;
  knowledgeGraphVectorHitCount: number;
  knowledgeGraphVectorRecallAttempted: boolean;
  websiteHelpGraphApplied: boolean;
  websiteHelpGraphTargetNodeId: string | null;
}) => ({
  applied: input.knowledgeGraphApplied,
  queryStatus: input.knowledgeGraphQueryStatus,
  queryMode: input.knowledgeGraphQueryMode,
  recallStrategy: input.knowledgeGraphRecallStrategy,
  lexicalHitCount: input.knowledgeGraphLexicalHitCount,
  vectorHitCount: input.knowledgeGraphVectorHitCount,
  vectorRecallAttempted: input.knowledgeGraphVectorRecallAttempted,
  websiteHelpApplied: input.websiteHelpGraphApplied,
  websiteHelpTargetNodeId: input.websiteHelpGraphTargetNodeId,
});
