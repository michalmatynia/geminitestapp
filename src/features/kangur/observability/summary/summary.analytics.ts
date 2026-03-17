import type {
  KangurAiTutorAnalyticsSnapshot,
  KangurAnalyticsSnapshot,
  KangurDuelLobbyAnalyticsSnapshot,
} from '@/shared/contracts';
import { getKangurAiTutorBridgeFollowUpDirection } from '@/features/kangur/ai-tutor/follow-up-reporting';
import { AnalyticsEventMongoDoc, LobbyMetricRecord } from './summary.contracts';
import {
  KANGUR_ANALYTICS_EVENT_NAMES,
  LOBBY_EVENT_KEY_MAP,
} from './summary.constants';

export const createLobbyCounts = (): LobbyMetricRecord => ({
  viewed: 0,
  refreshClicked: 0,
  filterChanged: 0,
  sortChanged: 0,
  joinClicked: 0,
  createClicked: 0,
  loginClicked: 0,
});

export const createLobbyAnalyticsSnapshot = (): KangurDuelLobbyAnalyticsSnapshot => ({
  totals: createLobbyCounts(),
  byUser: {
    guest: createLobbyCounts(),
    authenticated: createLobbyCounts(),
  },
  byFilterMode: {
    all: 0,
    challenge: 0,
    quick_match: 0,
  },
  bySort: {
    recent: 0,
    time_fast: 0,
    time_slow: 0,
    questions_low: 0,
    questions_high: 0,
  },
  loginBySource: {},
});

export const toPercent = (numerator: number, denominator: number): number | null => {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
};

export const summarizeKangurDuelLobbyAnalytics = (
  events: Array<Pick<AnalyticsEventMongoDoc, 'name' | 'meta'>>
): KangurDuelLobbyAnalyticsSnapshot => {
  const snapshot = createLobbyAnalyticsSnapshot();

  events.forEach((event) => {
    const name = event.name;
    if (!name) return;
    const key = LOBBY_EVENT_KEY_MAP[name];
    if (!key) return;

    snapshot.totals[key] += 1;
    const meta = event.meta ?? null;
    const isGuest = meta?.['isGuest'] === true;
    const userBucket = isGuest ? 'guest' : 'authenticated';
    snapshot.byUser[userBucket][key] += 1;

    if (name === 'kangur_duels_lobby_filter_changed') {
      const mode = typeof meta?.['modeFilter'] === 'string' ? meta['modeFilter'] : null;
      if (mode === 'all' || mode === 'challenge' || mode === 'quick_match') {
        snapshot.byFilterMode[mode] += 1;
      }
    }

    if (name === 'kangur_duels_lobby_sort_changed') {
      const sort = typeof meta?.['sort'] === 'string' ? meta['sort'] : null;
      if (
        sort === 'recent' ||
        sort === 'time_fast' ||
        sort === 'time_slow' ||
        sort === 'questions_low' ||
        sort === 'questions_high'
      ) {
        snapshot.bySort[sort] += 1;
      }
    }

    if (name === 'kangur_duels_lobby_login_clicked') {
      const source = typeof meta?.['source'] === 'string' ? meta['source'].trim() : '';
      const keySource = source.length > 0 ? source : 'unknown';
      snapshot.loginBySource[keySource] = (snapshot.loginBySource[keySource] ?? 0) + 1;
    }
  });

  return snapshot;
};

export const summarizeKangurAiTutorAnalytics = (
  docs: AnalyticsEventMongoDoc[]
): KangurAiTutorAnalyticsSnapshot => {
  const summary = docs.reduce<KangurAiTutorAnalyticsSnapshot>(
    (summary, doc) => {
      const name = doc.name;
      const meta = doc.meta;
      const answerResolutionMode =
        meta?.['answerResolutionMode'] === 'page_content' ||
        meta?.['answerResolutionMode'] === 'native_guide' ||
        meta?.['answerResolutionMode'] === 'brain'
          ? meta['answerResolutionMode']
          : null;
      const actionId =
        meta && typeof meta['actionId'] === 'string' && meta['actionId'].trim().length > 0
          ? meta['actionId']
          : null;
      const bridgeDirectionFromAction = getKangurAiTutorBridgeFollowUpDirection(actionId);
      if (name === 'kangur_ai_tutor_message_succeeded') {
        summary.messageSucceededCount += 1;
        if (answerResolutionMode === 'page_content') {
          summary.pageContentAnswerCount += 1;
        }
        if (answerResolutionMode === 'native_guide') {
          summary.nativeGuideAnswerCount += 1;
        }
        if (answerResolutionMode === 'brain') {
          summary.brainAnswerCount += 1;
        }
        if (meta?.['knowledgeGraphApplied'] === true) {
          summary.knowledgeGraphAppliedCount += 1;
        }
        if (meta?.['knowledgeGraphQueryMode'] === 'semantic') {
          summary.knowledgeGraphSemanticCount += 1;
        }
        if (meta?.['knowledgeGraphQueryMode'] === 'website_help') {
          summary.knowledgeGraphWebsiteHelpCount += 1;
        }
        if (meta?.['knowledgeGraphRecallStrategy'] === 'metadata_only') {
          summary.knowledgeGraphMetadataOnlyRecallCount += 1;
        }
        if (meta?.['knowledgeGraphRecallStrategy'] === 'hybrid_vector') {
          summary.knowledgeGraphHybridRecallCount += 1;
        }
        if (meta?.['knowledgeGraphRecallStrategy'] === 'vector_only') {
          summary.knowledgeGraphVectorOnlyRecallCount += 1;
        }
        if (meta?.['knowledgeGraphVectorRecallAttempted'] === true) {
          summary.knowledgeGraphVectorRecallAttemptedCount += 1;
        }
        if (meta?.['hasBridgeFollowUpAction'] === true) {
          summary.bridgeSuggestionCount += 1;
        }
        if (meta?.['bridgeFollowUpDirection'] === 'lesson_to_game') {
          summary.lessonToGameBridgeSuggestionCount += 1;
        }
        if (meta?.['bridgeFollowUpDirection'] === 'game_to_lesson') {
          summary.gameToLessonBridgeSuggestionCount += 1;
        }
      }
      if (name === 'kangur_ai_tutor_quick_action_clicked' && meta?.['isBridgeAction'] === true) {
        summary.bridgeQuickActionClickCount += 1;
      }
      if (name === 'kangur_ai_tutor_follow_up_clicked' && bridgeDirectionFromAction) {
        summary.bridgeFollowUpClickCount += 1;
      }
      if (name === 'kangur_ai_tutor_follow_up_completed' && bridgeDirectionFromAction) {
        summary.bridgeFollowUpCompletionCount += 1;
      }
      return summary;
    },
    {
      messageSucceededCount: 0,
      pageContentAnswerCount: 0,
      nativeGuideAnswerCount: 0,
      brainAnswerCount: 0,
      knowledgeGraphAppliedCount: 0,
      knowledgeGraphSemanticCount: 0,
      knowledgeGraphWebsiteHelpCount: 0,
      knowledgeGraphMetadataOnlyRecallCount: 0,
      knowledgeGraphHybridRecallCount: 0,
      knowledgeGraphVectorOnlyRecallCount: 0,
      knowledgeGraphVectorRecallAttemptedCount: 0,
      bridgeSuggestionCount: 0,
      lessonToGameBridgeSuggestionCount: 0,
      gameToLessonBridgeSuggestionCount: 0,
      bridgeQuickActionClickCount: 0,
      bridgeFollowUpClickCount: 0,
      bridgeFollowUpCompletionCount: 0,
      directAnswerRatePercent: null,
      brainFallbackRatePercent: null,
      bridgeCompletionRatePercent: null,
      knowledgeGraphCoverageRatePercent: null,
      knowledgeGraphVectorAssistRatePercent: null,
    }
  );

  const vectorAssistCount =
    summary.knowledgeGraphHybridRecallCount + summary.knowledgeGraphVectorOnlyRecallCount;
  const directAnswerCount = summary.pageContentAnswerCount + summary.nativeGuideAnswerCount;

  return {
    ...summary,
    directAnswerRatePercent: toPercent(directAnswerCount, summary.messageSucceededCount),
    brainFallbackRatePercent: toPercent(summary.brainAnswerCount, summary.messageSucceededCount),
    bridgeCompletionRatePercent: toPercent(
      summary.bridgeFollowUpCompletionCount,
      summary.bridgeSuggestionCount
    ),
    knowledgeGraphCoverageRatePercent: toPercent(
      summary.knowledgeGraphAppliedCount,
      summary.messageSucceededCount
    ),
    knowledgeGraphVectorAssistRatePercent: toPercent(
      vectorAssistCount,
      summary.knowledgeGraphSemanticCount
    ),
  };
};

export const emptyAnalyticsSnapshot = (): KangurAnalyticsSnapshot => ({
  totals: {
    events: 0,
    pageviews: 0,
  },
  visitors: 0,
  sessions: 0,
  topPaths: [],
  topEventNames: [],
  importantEvents: KANGUR_ANALYTICS_EVENT_NAMES.map((name: string) => ({
    name,
    count: 0,
  })),
  aiTutor: {
    messageSucceededCount: 0,
    pageContentAnswerCount: 0,
    nativeGuideAnswerCount: 0,
    brainAnswerCount: 0,
    knowledgeGraphAppliedCount: 0,
    knowledgeGraphSemanticCount: 0,
    knowledgeGraphWebsiteHelpCount: 0,
    knowledgeGraphMetadataOnlyRecallCount: 0,
    knowledgeGraphHybridRecallCount: 0,
    knowledgeGraphVectorOnlyRecallCount: 0,
    knowledgeGraphVectorRecallAttemptedCount: 0,
    bridgeSuggestionCount: 0,
    lessonToGameBridgeSuggestionCount: 0,
    gameToLessonBridgeSuggestionCount: 0,
    bridgeQuickActionClickCount: 0,
    bridgeFollowUpClickCount: 0,
    bridgeFollowUpCompletionCount: 0,
    directAnswerRatePercent: null,
    brainFallbackRatePercent: null,
    bridgeCompletionRatePercent: null,
    knowledgeGraphCoverageRatePercent: null,
    knowledgeGraphVectorAssistRatePercent: null,
  },
  duelsLobby: createLobbyAnalyticsSnapshot(),
  recent: [],
});
