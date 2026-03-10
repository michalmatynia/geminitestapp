import 'server-only';

import { getKangurProgressRepository } from '@/features/kangur/services/kangur-progress-repository';
import { getKangurScoreRepository } from '@/features/kangur/services/kangur-score-repository';
import { buildKangurLearnerProfileSnapshot } from '@/features/kangur/ui/services/profile';
import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { KangurProgressState } from '@/shared/contracts/kangur';
import type {
  KangurAiTutorChatMessage,
  KangurAiTutorConversationContext,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/shared/contracts/kangur-ai-tutor-mood';

const RECENT_SCORE_LIMIT = 24;
const DAILY_GOAL_GAMES = 3;

const PERSONA_TO_TUTOR_MOOD: Record<AgentPersonaMoodId, KangurTutorMoodId> = {
  neutral: 'calm',
  thinking: 'reflective',
  encouraging: 'supportive',
  happy: 'happy',
  celebrating: 'celebrating',
};

const FRUSTRATION_KEYWORDS = [
  'nie umiem',
  'nie moge',
  'to trudne',
  'trudne',
  'boje',
  'stresuje',
  'zle',
  'wkurza',
  'frustruje',
  'nie wychodzi',
];
const CONFUSION_KEYWORDS = [
  'nie wiem',
  'nie rozumiem',
  'pogubilem',
  'pogubilam',
  'jak',
  'co dalej',
  'pomocy',
];
const POSITIVE_KEYWORDS = [
  'udalo',
  'umiem',
  'super',
  'dzieki',
  'latwe',
  'fajnie',
  'mam to',
];
const CHALLENGE_KEYWORDS = [
  'sam',
  'sprobuje',
  'trudniejsze',
  'kolejne',
  'dalej',
  'nastepne',
];
const PLAYFUL_KEYWORDS = [
  'zabawa',
  'gra',
  'smieszne',
  'fajne',
  'co jesli',
  'dlaczego',
  'czemu',
];

type KangurAiTutorMoodSignalInput = {
  averageAccuracy: number;
  dailyGoalPercent: number;
  todayXpEarned: number;
  weeklyXpEarned: number;
  averageXpPerSession: number;
  perfectGames: number;
  currentStreakDays: number;
  currentLessonMasteryPercent: number | null;
  context?: KangurAiTutorConversationContext;
  messages: KangurAiTutorChatMessage[];
  latestUserMessage: string | null;
  personaSuggestedMoodId: AgentPersonaMoodId | null;
  previousMood: KangurAiTutorLearnerMood | null;
  computedAt: string;
};

type KangurAiTutorLearnerMoodBuildInput = {
  learnerId: string;
  context?: KangurAiTutorConversationContext;
  messages: KangurAiTutorChatMessage[];
  latestUserMessage: string | null;
  personaSuggestedMoodId: AgentPersonaMoodId | null;
  previousMood: KangurAiTutorLearnerMood | null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const includesAnyKeyword = (text: string, keywords: string[]): boolean =>
  keywords.some((keyword) => text.includes(keyword));

const addScore = (
  scores: Map<KangurTutorMoodId, number>,
  moodId: KangurTutorMoodId,
  amount: number
): void => {
  scores.set(moodId, (scores.get(moodId) ?? 0) + amount);
};

const chooseBaselineMood = (averageAccuracy: number): KangurTutorMoodId => {
  if (averageAccuracy < 55) return 'patient';
  if (averageAccuracy < 70) return 'supportive';
  if (averageAccuracy < 85) return 'encouraging';
  if (averageAccuracy < 95) return 'confident';
  return 'proud';
};

const resolveCurrentLessonMasteryPercent = (
  progress: KangurProgressState,
  context: KangurAiTutorConversationContext | undefined
): number | null => {
  if (context?.surface !== 'lesson' || !context.contentId) {
    return null;
  }

  const entry = progress.lessonMastery[context.contentId];
  return typeof entry?.masteryPercent === 'number' ? entry.masteryPercent : null;
};

const computeConfidence = (
  topScore: number,
  secondScore: number | undefined
): number => {
  if (!Number.isFinite(topScore) || topScore <= 0) {
    return 0.25;
  }
  if (!Number.isFinite(secondScore) || !secondScore || secondScore <= 0) {
    return clamp(0.55 + topScore / 20, 0.55, 0.92);
  }
  return clamp(0.35 + (topScore - secondScore) / 10, 0.35, 0.92);
};

export const resolveKangurAiTutorMoodFromSignals = (
  input: KangurAiTutorMoodSignalInput
): KangurAiTutorLearnerMood => {
  const scores = new Map<KangurTutorMoodId, number>();
  const baselineMoodId = chooseBaselineMood(input.averageAccuracy);
  addScore(scores, baselineMoodId, 2);

  let primaryReasonCode: string | null = null;
  let primaryReasonWeight = 0;
  const setPrimaryReason = (reasonCode: string, weight: number): void => {
    if (weight > primaryReasonWeight) {
      primaryReasonWeight = weight;
      primaryReasonCode = reasonCode;
    }
  };

  if (input.previousMood?.currentMoodId) {
    addScore(scores, input.previousMood.currentMoodId, 1.5);
  }

  if (input.averageAccuracy < 55) {
    addScore(scores, 'patient', 3);
    addScore(scores, 'gentle', 2);
    addScore(scores, 'reassuring', 2);
    addScore(scores, 'empathetic', 1);
    setPrimaryReason('low_accuracy_support', 3);
  } else if (input.averageAccuracy < 70) {
    addScore(scores, 'supportive', 2.5);
    addScore(scores, 'calm', 2);
    addScore(scores, 'encouraging', 2);
    setPrimaryReason('developing_accuracy', 2.5);
  } else if (input.averageAccuracy >= 85) {
    addScore(scores, 'confident', 3);
    addScore(scores, 'motivating', 2);
    addScore(scores, 'proud', 2);
    setPrimaryReason('high_accuracy', 3);
  } else {
    addScore(scores, 'encouraging', 2);
    addScore(scores, 'focused', 1);
  }

  if (input.currentLessonMasteryPercent !== null) {
    if (input.currentLessonMasteryPercent < 50) {
      addScore(scores, 'careful', 2);
      addScore(scores, 'patient', 1.5);
      setPrimaryReason('weak_current_lesson', 2.4);
    } else if (input.currentLessonMasteryPercent >= 85) {
      addScore(scores, 'confident', 1.5);
      addScore(scores, 'curious', 1);
    }
  }

  if (input.dailyGoalPercent >= 100) {
    addScore(scores, 'proud', 1.5);
    addScore(scores, 'happy', 1.5);
  }
  const xpMomentumTarget = Math.max(18, input.averageXpPerSession || 0);
  const allowXpMomentumToneBoost =
    input.context?.surface !== 'test' && input.context?.surface !== 'game';
  if (allowXpMomentumToneBoost && input.todayXpEarned >= xpMomentumTarget) {
    addScore(scores, 'proud', 4.5);
    addScore(scores, 'happy', 2.5);
    addScore(scores, 'celebrating', 2.5);
    setPrimaryReason('xp_momentum_today', 4.6);
  }
  if (allowXpMomentumToneBoost && input.weeklyXpEarned >= Math.max(80, xpMomentumTarget * 4)) {
    addScore(scores, 'determined', 1.5);
    addScore(scores, 'motivating', 1.5);
    addScore(scores, 'confident', 1);
  }
  if (input.perfectGames > 0) {
    addScore(scores, 'celebrating', 1 + Math.min(input.perfectGames, 3) * 0.5);
    addScore(scores, 'proud', 1);
  }
  if (input.currentStreakDays >= 5) {
    addScore(scores, 'determined', 2);
    addScore(scores, 'motivating', 1);
  }

  if (input.context?.surface === 'test' || input.context?.surface === 'game') {
    if (input.context.answerRevealed) {
      addScore(scores, 'reflective', 6);
      addScore(scores, 'supportive', 1);
      setPrimaryReason('post_answer_review', 6);
    } else {
      addScore(scores, 'focused', 6);
      addScore(scores, 'careful', 4);
      addScore(scores, 'calm', 1);
      setPrimaryReason('active_test_focus', 6.2);
    }
  }

  if (input.context?.promptMode === 'hint') {
    addScore(scores, 'encouraging', 2);
    addScore(scores, 'supportive', 1);
  }
  if (
    input.context?.promptMode === 'explain' ||
    input.context?.promptMode === 'selected_text'
  ) {
    addScore(scores, 'focused', 2);
    addScore(scores, 'careful', 1);
    addScore(scores, 'curious', 1);
  }
  if (input.context?.interactionIntent === 'review') {
    addScore(scores, 'reflective', 5);
    addScore(scores, 'calm', 1);
    setPrimaryReason('review_mode', 5.1);
  }
  if (input.context?.interactionIntent === 'next_step') {
    addScore(scores, 'determined', 5);
    addScore(scores, 'motivating', 3);
    addScore(scores, 'focused', 1);
    setPrimaryReason('next_step_mode', 5);
  }
  if (input.context?.selectedText) {
    addScore(scores, 'focused', 1);
    addScore(scores, 'curious', 1);
  }

  const normalizedLatestUserMessage = normalizeText(input.latestUserMessage);
  if (normalizedLatestUserMessage) {
    if (includesAnyKeyword(normalizedLatestUserMessage, FRUSTRATION_KEYWORDS)) {
      addScore(scores, 'empathetic', 4);
      addScore(scores, 'reassuring', 3);
      addScore(scores, 'calm', 2);
      addScore(scores, 'patient', 2);
      setPrimaryReason('learner_frustration', 4.2);
    }
    if (includesAnyKeyword(normalizedLatestUserMessage, CONFUSION_KEYWORDS)) {
      addScore(scores, 'patient', 3);
      addScore(scores, 'careful', 2);
      addScore(scores, 'supportive', 2);
      setPrimaryReason('learner_confusion', 3.4);
    }
    if (includesAnyKeyword(normalizedLatestUserMessage, POSITIVE_KEYWORDS)) {
      addScore(scores, 'happy', 2);
      addScore(scores, 'proud', 2);
      addScore(scores, 'celebrating', 1);
    }
    if (includesAnyKeyword(normalizedLatestUserMessage, CHALLENGE_KEYWORDS)) {
      addScore(scores, 'determined', 2);
      addScore(scores, 'confident', 2);
      addScore(scores, 'motivating', 1);
    }
    if (includesAnyKeyword(normalizedLatestUserMessage, PLAYFUL_KEYWORDS)) {
      addScore(scores, 'curious', 2);
      addScore(scores, 'playful', 2);
    }
  }

  const recentUserMessages = input.messages
    .filter((message) => message.role === 'user')
    .slice(-4)
    .map((message) => normalizeText(message.content))
    .filter(Boolean);

  if (recentUserMessages.length >= 3) {
    const repeatedNeedForHelp = recentUserMessages.filter((message) =>
      includesAnyKeyword(message, CONFUSION_KEYWORDS)
    ).length;
    if (repeatedNeedForHelp >= 2) {
      addScore(scores, 'patient', 2);
      addScore(scores, 'supportive', 1.5);
      setPrimaryReason('repeated_help_requests', 2.8);
    }
  }

  if (input.personaSuggestedMoodId) {
    const personaMappedMood = PERSONA_TO_TUTOR_MOOD[input.personaSuggestedMoodId];
    addScore(scores, personaMappedMood, 2);
  }

  const orderedScores = Array.from(scores.entries()).sort((left, right) => right[1] - left[1]);
  const topCandidate = orderedScores[0]?.[0] ?? baselineMoodId;
  const topScore = orderedScores[0]?.[1] ?? 0;
  const secondScore = orderedScores[1]?.[1];
  const previousMoodId = input.previousMood?.currentMoodId ?? null;
  const previousMoodScore = previousMoodId ? scores.get(previousMoodId) ?? 0 : 0;
  const currentMoodId =
    previousMoodId && previousMoodScore >= topScore - 1.25 ? previousMoodId : topCandidate;

  return {
    ...createDefaultKangurAiTutorLearnerMood(),
    currentMoodId,
    baselineMoodId,
    confidence: computeConfidence(topScore, secondScore),
    lastComputedAt: input.computedAt,
    lastReasonCode: primaryReasonCode,
  };
};

export const buildKangurAiTutorLearnerMood = async (
  input: KangurAiTutorLearnerMoodBuildInput
): Promise<KangurAiTutorLearnerMood> => {
  const [progressRepository, scoreRepository] = await Promise.all([
    getKangurProgressRepository(),
    getKangurScoreRepository(),
  ]);
  const [progress, scores] = await Promise.all([
    progressRepository.getProgress(input.learnerId),
    scoreRepository.listScores({
      sort: '-created_date',
      limit: RECENT_SCORE_LIMIT,
      filters: {
        learner_id: input.learnerId,
      },
    }),
  ]);
  const snapshot = buildKangurLearnerProfileSnapshot({
    progress,
    scores,
    dailyGoalGames: DAILY_GOAL_GAMES,
  });

  return resolveKangurAiTutorMoodFromSignals({
    averageAccuracy: snapshot.averageAccuracy,
    dailyGoalPercent: snapshot.dailyGoalPercent,
    todayXpEarned: snapshot.todayXpEarned,
    weeklyXpEarned: snapshot.weeklyXpEarned,
    averageXpPerSession: snapshot.averageXpPerSession,
    perfectGames: progress.perfectGames,
    currentStreakDays: snapshot.currentStreakDays,
    currentLessonMasteryPercent: resolveCurrentLessonMasteryPercent(progress, input.context),
    context: input.context,
    messages: input.messages,
    latestUserMessage: input.latestUserMessage,
    personaSuggestedMoodId: input.personaSuggestedMoodId,
    previousMood: input.previousMood,
    computedAt: new Date().toISOString(),
  });
};
