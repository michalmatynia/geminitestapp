import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { forbiddenError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  resolveKangurActorMock,
  contextRegistryResolveRefsMock,
  previewKangurWebsiteHelpGraphContextMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  contextRegistryResolveRefsMock: vi.fn(),
  previewKangurWebsiteHelpGraphContextMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: resolveKangurActorMock,
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

vi.mock('@/features/kangur/server/knowledge-graph/retrieval', () => ({
  previewKangurAiTutorSemanticGraphContext: previewKangurWebsiteHelpGraphContextMock,
  previewKangurWebsiteHelpGraphContext: previewKangurWebsiteHelpGraphContextMock,
}));

import { postKangurAiTutorKnowledgeGraphPreviewHandler } from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-knowledge-graph-preview-1',
    traceId: 'trace-kangur-ai-tutor-knowledge-graph-preview-1',
    correlationId: 'corr-kangur-ai-tutor-knowledge-graph-preview-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('kangur ai tutor knowledge graph preview handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'admin',
      ownerUserId: 'admin-1',
      ownerEmail: 'admin@example.com',
      ownerName: 'Admin',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'admin-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'admin@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });
    contextRegistryResolveRefsMock.mockResolvedValue({
      refs: [],
      nodes: [],
      documents: [
        {
          id: 'runtime:kangur:learner:learner-1',
          kind: 'runtime_document',
          entityType: 'kangur_learner_snapshot',
          title: 'Learner snapshot',
          summary: 'Average accuracy 74%.',
          status: 'active',
          tags: ['kangur', 'learner'],
          relatedNodeIds: ['root:kangur:learnerSnapshot'],
          facts: {
            learnerSummary: 'Average accuracy 74%.',
          },
          sections: [],
          provenance: {
            providerId: 'kangur',
            source: 'kangur-runtime-context',
          },
        },
      ],
      truncated: false,
      engineVersion: 'test-engine',
    });
    previewKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      querySeed: 'Jak się zalogować do Kangura?',
      normalizedQuerySeed: 'jak się zalogować do kangura',
      tokens: ['zalogowac', 'kangura'],
      instructions: 'Kangur website-help graph context:\n- Sign in flow [flow]',
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Sign in flow',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      sourceCollections: ['kangur_ai_tutor_content'],
      hydrationSources: ['kangur_ai_tutor_content'],
      sources: [
        {
          documentId: 'flow:kangur:sign-in',
          collectionId: 'kangur_ai_tutor_content',
          text: 'Kliknij Zaloguj się.',
          score: 0.94,
          metadata: {
            source: 'manual-text',
            sourceId: 'flow:kangur:sign-in',
            title: 'Sign in flow',
            tags: ['kangur-knowledge-graph', 'flow', 'auth'],
          },
        },
      ],
      nodeIds: ['flow:kangur:sign-in'],
      hits: [
        {
          id: 'flow:kangur:sign-in',
          kind: 'flow',
          title: 'Sign in flow',
          summary: 'Fallback graph summary.',
          route: '/',
          anchorId: 'kangur-primary-nav-login',
          sourceCollection: 'kangur_ai_tutor_content',
          sourceRecordId: 'pl',
          sourcePath: 'guidedCallout.auth.signInNav',
          tokenHits: 2,
          relatedTargetIds: ['anchor:kangur:login'],
          canonicalTitle: 'Sign in flow',
          canonicalSummary: 'Canonical sign-in explanation.',
          canonicalSourceCollection: 'kangur_ai_tutor_content',
          hydrationSource: 'kangur_ai_tutor_content',
        },
      ],
    });
  });

  it('returns a knowledge-graph retrieval preview for admins', async () => {
    const response = await postKangurAiTutorKnowledgeGraphPreviewHandler(
      new NextRequest('http://localhost/api/kangur/ai-tutor/knowledge-graph/preview', {
        method: 'POST',
      }),
      createRequestContext({
        latestUserMessage: 'Jak się zalogować do Kangura?',
        locale: 'pl',
        context: {
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'chat',
        },
      })
    );

    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 1,
        maxNodes: 24,
        refs: expect.arrayContaining([
          expect.objectContaining({ entityType: 'kangur_learner_snapshot' }),
          expect.objectContaining({ entityType: 'kangur_login_activity' }),
          expect.objectContaining({ entityType: 'kangur_lesson_context' }),
        ]),
      })
    );
    expect(previewKangurWebsiteHelpGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Jak się zalogować do Kangura?',
        locale: 'pl',
        runtimeDocuments: expect.arrayContaining([
          expect.objectContaining({ entityType: 'kangur_learner_snapshot' }),
        ]),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        learnerId: 'learner-1',
        locale: 'pl',
        requestedRefIds: expect.arrayContaining([
          expect.stringContaining('runtime:kangur:learner:'),
          expect.stringContaining('runtime:kangur:login-activity:'),
          expect.stringContaining('runtime:kangur:lesson:'),
        ]),
        runtimeDocumentIds: ['runtime:kangur:learner:learner-1'],
        summary: {
          requestedRefCount: 3,
          runtimeDocumentCount: 1,
          retrievalStatus: 'hit',
          queryMode: 'website_help',
          recallStrategy: 'metadata_only',
          nodeCount: 1,
          sourceCount: 1,
          lexicalHitCount: 1,
          vectorHitCount: 0,
          vectorRecallAttempted: false,
          tokenCount: 2,
          normalizedQuerySeed: 'jak się zalogować do kangura',
          websiteHelpTargetNodeId: 'flow:kangur:sign-in',
        },
        retrieval: expect.objectContaining({
          status: 'hit',
          queryMode: 'website_help',
          recallStrategy: 'metadata_only',
          lexicalHitCount: 1,
          vectorHitCount: 0,
          vectorRecallAttempted: false,
          querySeed: 'Jak się zalogować do Kangura?',
          normalizedQuerySeed: 'jak się zalogować do kangura',
          nodeIds: ['flow:kangur:sign-in'],
          tokens: ['zalogowac', 'kangura'],
          websiteHelpTarget: {
            nodeId: 'flow:kangur:sign-in',
            label: 'Sign in flow',
            route: '/',
            anchorId: 'kangur-primary-nav-login',
          },
          sourceCollections: ['kangur_ai_tutor_content'],
          hydrationSources: ['kangur_ai_tutor_content'],
          hits: expect.arrayContaining([
            expect.objectContaining({
              id: 'flow:kangur:sign-in',
              hydrationSource: 'kangur_ai_tutor_content',
            }),
          ]),
        }),
      })
    );
  });

  it('rejects non-admin actors', async () => {
    resolveKangurActorMock.mockResolvedValueOnce({
      actorId: 'parent-1',
      actorType: 'parent',
      canManageLearners: true,
      role: 'user',
      ownerUserId: 'parent-1',
      ownerEmail: 'parent@example.com',
      ownerName: 'Parent',
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        ownerUserId: 'parent-1',
        displayName: 'Ada',
        loginName: 'ada-child',
        status: 'active',
        legacyUserKey: 'parent@example.com',
        createdAt: '2026-03-10T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z',
      },
      learners: [],
    });

    await expect(
      postKangurAiTutorKnowledgeGraphPreviewHandler(
        new NextRequest('http://localhost/api/kangur/ai-tutor/knowledge-graph/preview', {
          method: 'POST',
        }),
        createRequestContext({
          latestUserMessage: 'Jak się zalogować do Kangura?',
        })
      )
    ).rejects.toMatchObject(
      forbiddenError('Only admins can preview Kangur AI Tutor knowledge graph retrieval.')
    );
  });
});
