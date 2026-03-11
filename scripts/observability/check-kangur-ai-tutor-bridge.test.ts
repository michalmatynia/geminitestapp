import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, toArrayMock, findMock, collectionMock } = vi.hoisted(() => ({
  toArrayMock: vi.fn(),
  findMock: vi.fn(),
  collectionMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import {
  loadKangurAiTutorBridgeEvents,
  parseKangurAiTutorBridgeArgs,
  runKangurAiTutorBridgeCheck,
  summarizeKangurAiTutorBridgeEvents,
} from './check-kangur-ai-tutor-bridge';

describe('check-kangur-ai-tutor-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMongoDbMock.mockResolvedValue({
      collection: collectionMock,
    });
    collectionMock.mockReturnValue({
      find: findMock,
    });
    findMock.mockReturnValue({
      toArray: toArrayMock,
    });
    toArrayMock.mockResolvedValue([]);
  });

  it('parses supported ranges and falls back to 7d for unsupported values', () => {
    expect(parseKangurAiTutorBridgeArgs(['--range=24h'])).toEqual({ range: '24h' });
    expect(parseKangurAiTutorBridgeArgs(['--range=30d'])).toEqual({ range: '30d' });
    expect(parseKangurAiTutorBridgeArgs(['--range=invalid'])).toEqual({ range: '7d' });
  });

  it('summarizes bridge suggestions, clicks, and completions from analytics events', () => {
    expect(
      summarizeKangurAiTutorBridgeEvents(
        [
          {
            name: 'kangur_ai_tutor_message_succeeded',
            meta: {
              knowledgeGraphApplied: true,
              knowledgeGraphQueryMode: 'website_help',
              knowledgeGraphRecallStrategy: 'metadata_only',
              knowledgeGraphVectorRecallAttempted: false,
              hasBridgeFollowUpAction: true,
              bridgeFollowUpDirection: 'lesson_to_game',
            },
          },
          {
            name: 'kangur_ai_tutor_message_succeeded',
            meta: {
              knowledgeGraphApplied: true,
              knowledgeGraphQueryMode: 'semantic',
              knowledgeGraphRecallStrategy: 'hybrid_vector',
              knowledgeGraphVectorRecallAttempted: true,
              hasBridgeFollowUpAction: true,
              bridgeFollowUpDirection: 'game_to_lesson',
            },
          },
          {
            name: 'kangur_ai_tutor_quick_action_clicked',
            meta: {
              isBridgeAction: true,
            },
          },
          {
            name: 'kangur_ai_tutor_follow_up_clicked',
            meta: {
              actionId: 'bridge:lesson-to-game:adding',
            },
          },
          {
            name: 'kangur_ai_tutor_follow_up_completed',
            meta: {
              actionId: 'bridge:game-to-lesson:adding',
            },
          },
        ],
        '7d'
      )
    ).toEqual({
      range: '7d',
      overallStatus: 'insufficient_data',
      messageSucceededCount: 2,
      knowledgeGraphAppliedCount: 2,
      knowledgeGraphSemanticCount: 1,
      knowledgeGraphWebsiteHelpCount: 1,
      knowledgeGraphMetadataOnlyRecallCount: 1,
      knowledgeGraphHybridRecallCount: 1,
      knowledgeGraphVectorOnlyRecallCount: 0,
      knowledgeGraphVectorRecallAttemptedCount: 1,
      bridgeSuggestionCount: 2,
      lessonToGameBridgeSuggestionCount: 1,
      gameToLessonBridgeSuggestionCount: 1,
      bridgeQuickActionClickCount: 1,
      bridgeFollowUpClickCount: 1,
      bridgeFollowUpCompletionCount: 1,
      knowledgeGraphCoverageRatePercent: 100,
      knowledgeGraphVectorAssistRatePercent: 100,
      bridgeCompletionRatePercent: 50,
      alertStatus: 'insufficient_data',
    });
  });

  it('loads bridge events from mongo and returns the weekly snapshot payload', async () => {
    toArrayMock.mockResolvedValue([
      {
        name: 'kangur_ai_tutor_message_succeeded',
        meta: {
          knowledgeGraphApplied: true,
          knowledgeGraphQueryMode: 'semantic',
          knowledgeGraphRecallStrategy: 'vector_only',
          knowledgeGraphVectorRecallAttempted: true,
          hasBridgeFollowUpAction: true,
          bridgeFollowUpDirection: 'lesson_to_game',
        },
      },
      {
        name: 'kangur_ai_tutor_quick_action_clicked',
        meta: {
          isBridgeAction: true,
        },
      },
      {
        name: 'kangur_ai_tutor_follow_up_completed',
        meta: {
          actionId: 'bridge:lesson-to-game:adding',
        },
      },
    ]);

    const loaded = await loadKangurAiTutorBridgeEvents('7d');
    expect(collectionMock).toHaveBeenCalledWith('analytics_events');
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(loaded.window.from).toMatch(/^20/);
    expect(loaded.window.to).toMatch(/^20/);
    expect(loaded.docs).toHaveLength(3);

    const result = await runKangurAiTutorBridgeCheck({ range: '7d' });
    expect(result.snapshot).toEqual({
      range: '7d',
      overallStatus: 'insufficient_data',
      messageSucceededCount: 1,
      knowledgeGraphAppliedCount: 1,
      knowledgeGraphSemanticCount: 1,
      knowledgeGraphWebsiteHelpCount: 0,
      knowledgeGraphMetadataOnlyRecallCount: 0,
      knowledgeGraphHybridRecallCount: 0,
      knowledgeGraphVectorOnlyRecallCount: 1,
      knowledgeGraphVectorRecallAttemptedCount: 1,
      bridgeSuggestionCount: 1,
      lessonToGameBridgeSuggestionCount: 1,
      gameToLessonBridgeSuggestionCount: 0,
      bridgeQuickActionClickCount: 1,
      bridgeFollowUpClickCount: 0,
      bridgeFollowUpCompletionCount: 1,
      knowledgeGraphCoverageRatePercent: 100,
      knowledgeGraphVectorAssistRatePercent: 100,
      bridgeCompletionRatePercent: 100,
      alertStatus: 'insufficient_data',
    });
  });
});
