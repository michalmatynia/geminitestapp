import { describe, expect, it } from 'vitest';

import type { ContextRuntimeDocument } from '@/shared/contracts/ai-context-registry';

import {
  buildKnowledgeGraphResponseSummary,
  buildKangurTutorResponseSources,
  mergeFollowUpActions,
} from './sources';

const createRuntimeDocument = (input: {
  id: string;
  entityType: string;
  title: string;
  summary?: string;
  facts?: Record<string, unknown>;
  sections?: Array<{ kind: 'text'; title: string; text: string }>;
}): ContextRuntimeDocument => ({
  id: input.id,
  kind: 'runtime_document',
  entityType: input.entityType,
  title: input.title,
  summary: input.summary ?? input.title,
  status: 'active',
  tags: ['kangur', 'unit-test'],
  relatedNodeIds: [],
  facts: input.facts ?? {},
  sections: input.sections,
  provenance: {
    providerId: 'kangur',
    source: 'unit-test',
  },
});

describe('source helpers', () => {
  it('merges runtime sources after extra graph sources and deduplicates by collection and document id', () => {
    const surfaceContext = createRuntimeDocument({
      id: 'runtime:surface',
      entityType: 'kangur_lesson_context',
      title: 'Dodawanie',
      summary: 'Lekcja o dodawaniu.',
      facts: {
        currentQuestion: 'Ile to jest 2 + 3?',
      },
      sections: [
        {
          kind: 'text',
          title: 'Intro',
          text: 'Policz dwie grupy kropek i połącz wynik.',
        },
      ],
    });
    const assignmentContext = createRuntimeDocument({
      id: 'runtime:assignment',
      entityType: 'kangur_assignment_context',
      title: 'Zadanie domowe',
      summary: 'Skoncz trzy ćwiczenia z dodawania.',
      facts: {
        assignmentSummary: 'Skoncz trzy ćwiczenia z dodawania.',
      },
    });

    const sources = buildKangurTutorResponseSources({
      learnerSnapshot: null,
      surfaceContext,
      assignmentContext,
      extraSources: [
        {
          documentId: 'runtime:surface',
          collectionId: 'kangur-runtime-context',
          text: 'External source copy should win when duplicate ids exist.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'runtime:surface',
            title: 'Dodawanie',
            description: 'Lekcja o dodawaniu.',
            tags: ['kangur'],
          },
        },
      ],
    });

    expect(sources).toHaveLength(2);
    expect(sources[0]?.text).toBe('External source copy should win when duplicate ids exist.');
    expect(sources[1]).toMatchObject({
      documentId: 'runtime:assignment',
      collectionId: 'kangur-runtime-context',
      metadata: expect.objectContaining({
        title: 'Zadanie domowe',
      }),
    });
  });

  it('falls back to the learner snapshot when no surface or assignment context exists', () => {
    const learnerSnapshot = createRuntimeDocument({
      id: 'runtime:learner',
      entityType: 'kangur_learner_snapshot',
      title: 'Learner snapshot',
      summary: 'Accuracy is trending upward.',
      facts: {
        masterySummary: 'Accuracy is trending upward.',
      },
    });

    const sources = buildKangurTutorResponseSources({
      learnerSnapshot,
      surfaceContext: null,
      assignmentContext: null,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      documentId: 'runtime:learner',
      collectionId: 'kangur-runtime-context',
    });
    expect(sources[0]?.text).toContain('Accuracy is trending upward.');
  });

  it('merges follow-up actions without duplicating pages that already exist', () => {
    expect(
      mergeFollowUpActions(
        [
          {
            id: 'existing-lessons',
            label: 'Wróć do lekcji',
            page: 'Lessons',
          },
        ],
        [
          {
            id: 'duplicate-lessons',
            label: 'Jeszcze jedna lekcja',
            page: 'Lessons',
            reason: 'Should be skipped',
          },
          {
            id: 'profile-action',
            label: 'Sprawdź profil',
            page: 'LearnerProfile',
            reason: 'Show the current streak.',
          },
        ]
      )
    ).toEqual([
      {
        id: 'existing-lessons',
        label: 'Wróć do lekcji',
        page: 'Lessons',
      },
      {
        id: 'profile-action',
        label: 'Sprawdź profil',
        page: 'LearnerProfile',
        reason: 'Show the current streak.',
      },
    ]);
  });

  it('summarizes knowledge graph retrieval metadata into the response payload shape', () => {
    expect(
      buildKnowledgeGraphResponseSummary({
        knowledgeGraphApplied: true,
        knowledgeGraphQueryStatus: 'hit',
        knowledgeGraphQueryMode: 'semantic',
        knowledgeGraphRecallStrategy: 'hybrid_vector',
        knowledgeGraphLexicalHitCount: 2,
        knowledgeGraphVectorHitCount: 4,
        knowledgeGraphVectorRecallAttempted: true,
        websiteHelpGraphApplied: false,
        websiteHelpGraphTargetNodeId: null,
      })
    ).toEqual({
      applied: true,
      queryStatus: 'hit',
      queryMode: 'semantic',
      recallStrategy: 'hybrid_vector',
      lexicalHitCount: 2,
      vectorHitCount: 4,
      vectorRecallAttempted: true,
      websiteHelpApplied: false,
      websiteHelpTargetNodeId: null,
    });
  });
});
