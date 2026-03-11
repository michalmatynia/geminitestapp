import { beforeEach, describe, expect, it, vi } from 'vitest';

const { previewKangurAiTutorSemanticGraphContextMock } = vi.hoisted(() => ({
  previewKangurAiTutorSemanticGraphContextMock: vi.fn(),
}));

vi.mock('./retrieval', () => ({
  previewKangurAiTutorSemanticGraphContext: previewKangurAiTutorSemanticGraphContextMock,
}));

import { buildKangurKnowledgeGraphPreviewResult } from './preview';

describe('buildKangurKnowledgeGraphPreviewResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewKangurAiTutorSemanticGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      tokens: ['zalogowac'],
      instructions: 'Kangur website-help graph context',
      sources: [],
      nodeIds: ['flow:kangur:sign-in'],
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Zaloguj się',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      sourceCollections: ['kangur_ai_tutor_content'],
      hydrationSources: ['kangur_ai_tutor_content'],
      hits: [],
    });
  });

  it('formats a live preview envelope with requested refs and runtime document ids', async () => {
    await expect(
      buildKangurKnowledgeGraphPreviewResult({
        latestUserMessage: 'Jak się zalogować?',
        learnerId: 'learner-1',
        locale: 'pl',
        context: {
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'chat',
        },
        runtimeDocuments: [
          {
            id: 'runtime:kangur:learner:learner-1',
            kind: 'runtime_document',
            entityType: 'kangur_learner_snapshot',
            title: 'Learner snapshot',
            summary: 'Average accuracy 74%.',
            status: 'active',
            tags: ['kangur', 'learner'],
            relatedNodeIds: ['root:kangur:learnerSnapshot'],
            facts: {},
            sections: [],
            provenance: {
              providerId: 'kangur',
              source: 'kangur-runtime-context',
            },
          },
        ],
        runtimeResolution: 'live',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        learnerId: 'learner-1',
        locale: 'pl',
        runtimeResolution: 'live',
        requestedRefIds: expect.arrayContaining([
          expect.stringContaining('runtime:kangur:learner:'),
          expect.stringContaining('runtime:kangur:login-activity:'),
          expect.stringContaining('runtime:kangur:lesson:'),
        ]),
        runtimeDocumentIds: ['runtime:kangur:learner:learner-1'],
        summary: expect.objectContaining({
          requestedRefCount: 3,
          runtimeDocumentCount: 1,
          retrievalStatus: 'hit',
          queryMode: 'website_help',
          recallStrategy: 'metadata_only',
          nodeCount: 1,
          sourceCount: 0,
          lexicalHitCount: 1,
          vectorHitCount: 0,
          vectorRecallAttempted: false,
          websiteHelpTargetNodeId: 'flow:kangur:sign-in',
        }),
        retrieval: expect.objectContaining({
          status: 'hit',
          websiteHelpTarget: expect.objectContaining({
            nodeId: 'flow:kangur:sign-in',
          }),
        }),
      })
    );
    expect(previewKangurAiTutorSemanticGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Jak się zalogować?',
        locale: 'pl',
        runtimeDocuments: expect.arrayContaining([
          expect.objectContaining({ entityType: 'kangur_learner_snapshot' }),
        ]),
      })
    );
  });

  it('formats a skipped-runtime preview envelope for CLI usage', async () => {
    await expect(
      buildKangurKnowledgeGraphPreviewResult({
        latestUserMessage: 'Jak się zalogować?',
        learnerId: 'preview-learner',
        locale: 'pl',
        runtimeDocuments: [],
        runtimeResolution: 'skipped',
      })
    ).resolves.toMatchObject({
      learnerId: 'preview-learner',
      runtimeResolution: 'skipped',
      requestedRefIds: [
        'runtime:kangur:learner:preview-learner',
        'runtime:kangur:login-activity:preview-learner',
      ],
      runtimeDocumentIds: [],
      summary: {
        requestedRefCount: 2,
        runtimeDocumentCount: 0,
        retrievalStatus: 'hit',
        queryMode: 'website_help',
        recallStrategy: 'metadata_only',
        nodeCount: 1,
        sourceCount: 0,
        lexicalHitCount: 1,
        vectorHitCount: 0,
        vectorRecallAttempted: false,
        websiteHelpTargetNodeId: 'flow:kangur:sign-in',
      },
    });
  });
});
