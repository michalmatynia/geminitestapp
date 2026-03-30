import { describe, expect, it } from 'vitest';

import {
  createPostRequest,
  createRequestContext,
  logKangurServerEventMock,
  postKangurAiTutorChatHandler,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurWebsiteHelpGraphContextMock,
  runBrainChatCompletionMock,
} from './handler.test-support';

describe('kangur ai tutor chat handler knowledge-graph integration', () => {
  registerKangurAiTutorChatHandlerTestHooks();

  it('passes explicit knowledge references through to the native-guide resolver', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: 'Ranking pokazuje wyniki i pozycje na tle innych prób.',
      followUpActions: [],
      entryId: 'shared-leaderboard',
      matchedSignals: ['knowledge_reference'],
      coverageLevel: 'specific',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Powiedz mi o tej sekcji.' }],
          context: {
            surface: 'game',
            contentId: 'game:home',
            promptMode: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-leaderboard',
            focusLabel: 'Ranking',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_ai_tutor_native_guides',
              sourceRecordId: 'shared-leaderboard',
              sourcePath: 'entry:shared-leaderboard',
            },
          },
        }),
      ),
      createRequestContext(),
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorNativeGuideResolutionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Powiedz mi o tej sekcji.',
        context: expect.objectContaining({
          knowledgeReference: {
            sourceCollection: 'kangur_ai_tutor_native_guides',
            sourceRecordId: 'shared-leaderboard',
            sourcePath: 'entry:shared-leaderboard',
          },
        }),
      }),
    );
  });

  it('adds website-help graph context and sources when Neo4j retrieval resolves a Kangur website query', async () => {
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      instructions:
        'Kangur website-help graph context:\n- Sign in flow [flow]\n  Website target: / · anchor=kangur-primary-nav-login',
      nodeIds: ['flow:kangur:sign-in'],
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
          collectionId: 'kangur-knowledge-graph',
          text: 'Sign in flow (flow)\nHow anonymous learners sign in from the Kangur website shell.',
          score: 0.94,
          metadata: {
            source: 'manual-text',
            sourceId: 'flow:kangur:sign-in',
            title: 'Sign in flow',
            description: 'How anonymous learners sign in from the Kangur website shell.',
            tags: ['kangur-knowledge-graph', 'flow', 'auth'],
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Jak się zalogować do Kangura?' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            promptMode: 'chat',
          },
        }),
      ),
      createRequestContext(),
    );
    const body = await response.json();

    expect(resolveKangurWebsiteHelpGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Jak się zalogować do Kangura?',
        locale: 'pl',
        runtimeDocuments: expect.arrayContaining([
          expect.objectContaining({ entityType: 'kangur_learner_snapshot' }),
          expect.objectContaining({ entityType: 'kangur_lesson_context' }),
        ]),
      }),
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Kangur website-help graph context:'),
          }),
        ]),
      }),
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'flow:kangur:sign-in',
          collectionId: 'kangur-knowledge-graph',
        }),
      ]),
    );
    expect(body.websiteHelpTarget).toEqual({
      nodeId: 'flow:kangur:sign-in',
      label: 'Sign in flow',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'website_help',
      queryStatus: 'hit',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: true,
      websiteHelpTargetNodeId: 'flow:kangur:sign-in',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          knowledgeGraphRecallStrategy: 'metadata_only',
          knowledgeGraphLexicalHitCount: 1,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
          websiteHelpGraphApplied: true,
          websiteHelpGraphSourceCollections: ['kangur_ai_tutor_content'],
          websiteHelpGraphHydrationSources: ['kangur_ai_tutor_content'],
          websiteHelpGraphTargetNodeId: 'flow:kangur:sign-in',
          websiteHelpGraphTargetRoute: '/',
          websiteHelpGraphTargetAnchorId: 'kangur-primary-nav-login',
        }),
      }),
    );
  });

  it('adds semantic graph context for section-level Tutor-AI prompts and records the query mode', async () => {
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'semantic',
      recallStrategy: 'hybrid_vector',
      lexicalHitCount: 2,
      vectorHitCount: 3,
      vectorRecallAttempted: true,
      instructions: `Kangur semantic graph context:
- Ranking wyników [guide]
  Tutaj widać porownanie ostatnich wyników i pozycje ucznia.`,
      nodeIds: ['guide:native:game-leaderboard'],
      sourceCollections: ['kangur_ai_tutor_native_guides'],
      hydrationSources: ['kangur_ai_tutor_native_guides'],
      sources: [
        {
          documentId: 'guide:native:game-leaderboard',
          collectionId: 'kangur_ai_tutor_native_guides',
          text: `Ranking wyników (guide)
Sekcja rankingu pokazuje wyniki i pozycje ucznia.`,
          score: 0.94,
          metadata: {
            source: 'manual-text',
            sourceId: 'guide:native:game-leaderboard',
            title: 'Ranking wyników',
            description: 'Tutaj widać porownanie ostatnich wyników i pozycje ucznia.',
            tags: ['kangur-knowledge-graph', 'guide', 'game', 'leaderboard'],
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten panel' }],
          context: {
            surface: 'game',
            contentId: 'game:practice:addition',
            title: 'Podsumowanie gry',
            promptMode: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-result-leaderboard',
            focusLabel: 'Ranking wyników',
          },
        }),
      ),
      createRequestContext(),
    );
    const body = await response.json();

    expect(resolveKangurWebsiteHelpGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Wyjaśnij ten panel',
        context: expect.objectContaining({
          surface: 'game',
          focusKind: 'leaderboard',
          focusId: 'kangur-game-result-leaderboard',
        }),
      }),
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Kangur semantic graph context:'),
          }),
        ]),
      }),
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'guide:native:game-leaderboard',
          collectionId: 'kangur_ai_tutor_native_guides',
        }),
      ]),
    );
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'semantic',
      queryStatus: 'hit',
      recallStrategy: 'hybrid_vector',
      lexicalHitCount: 2,
      vectorHitCount: 3,
      vectorRecallAttempted: true,
      websiteHelpApplied: false,
      websiteHelpTargetNodeId: null,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          knowledgeGraphApplied: true,
          knowledgeGraphQueryMode: 'semantic',
          knowledgeGraphRecallStrategy: 'hybrid_vector',
          knowledgeGraphLexicalHitCount: 2,
          knowledgeGraphVectorHitCount: 3,
          knowledgeGraphVectorRecallAttempted: true,
          knowledgeGraphSourceCollections: ['kangur_ai_tutor_native_guides'],
          knowledgeGraphHydrationSources: ['kangur_ai_tutor_native_guides'],
          websiteHelpGraphApplied: false,
          websiteHelpGraphSourceCollections: [],
          websiteHelpGraphHydrationSources: [],
          websiteHelpGraphTargetNodeId: null,
          websiteHelpGraphTargetRoute: null,
          websiteHelpGraphTargetAnchorId: null,
        }),
      }),
    );
  });
});
