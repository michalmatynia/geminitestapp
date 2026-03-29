import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import deMessages from '@/i18n/messages/de.json';

let buildLessonMasteryUpdate: typeof import('./progress').buildLessonMasteryUpdate;
let addXp: typeof import('./progress').addXp;
let createGameSessionReward: typeof import('./progress').createGameSessionReward;
let createLessonPracticeReward: typeof import('./progress').createLessonPracticeReward;
let createLessonCompletionReward: typeof import('./progress').createLessonCompletionReward;
let createTrainingReward: typeof import('./progress').createTrainingReward;
let formatKangurProgressActivityLabel: typeof import('./progress').formatKangurProgressActivityLabel;
let getNextLockedBadge: typeof import('./progress').getNextLockedBadge;
let getKangurProgressServerSnapshot: typeof import('./progress').getKangurProgressServerSnapshot;
let getProgressBadges: typeof import('./progress').getProgressBadges;
let getProgressBadgeTrackSummaries: typeof import('./progress').getProgressBadgeTrackSummaries;
let getRecommendedSessionMomentum: typeof import('./progress').getRecommendedSessionMomentum;
let getRecommendedSessionProjection: typeof import('./progress').getRecommendedSessionProjection;
let getProgressTopActivities: typeof import('./progress').getProgressTopActivities;
let getVisibleProgressBadges: typeof import('./progress').getVisibleProgressBadges;
let getMasteredLessonCount: typeof import('./progress').getMasteredLessonCount;
let loadProgress: typeof import('./progress').loadProgress;
let mergeProgressStates: typeof import('./progress').mergeProgressStates;
let recordKangurLessonPanelProgress: typeof import('./progress').recordKangurLessonPanelProgress;
let recordKangurLessonPanelTime: typeof import('./progress').recordKangurLessonPanelTime;
let saveProgress: typeof import('./progress').saveProgress;
let setProgressOwnerKey: typeof import('./progress').setProgressOwnerKey;

const resolveNestedMessage = (root: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, root);

const interpolateMessage = (
  template: string,
  values?: Record<string, string | number>
): string =>
  template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values?.[key];
    return value === undefined ? match : String(value);
  });

const translateDeProgressMessage = (
  key: string,
  values?: Record<string, string | number>
): string => {
  const resolved = resolveNestedMessage(deMessages.KangurProgressRuntime, key);
  return typeof resolved === 'string' ? interpolateMessage(resolved, values) : key;
};

describe('kangur progress mastery helpers', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({
      addXp,
      buildLessonMasteryUpdate,
      createGameSessionReward,
      createLessonPracticeReward,
      createLessonCompletionReward,
      createTrainingReward,
      formatKangurProgressActivityLabel,
      getNextLockedBadge,
      getKangurProgressServerSnapshot,
      getProgressBadges,
      getProgressBadgeTrackSummaries,
      getRecommendedSessionMomentum,
      getRecommendedSessionProjection,
      getProgressTopActivities,
      getVisibleProgressBadges,
      getMasteredLessonCount,
      loadProgress,
      mergeProgressStates,
      recordKangurLessonPanelProgress,
      recordKangurLessonPanelTime,
      saveProgress,
      setProgressOwnerKey,
    } = await vi.importActual<typeof import('./progress')>('./progress'));
  });

  it('reuses a stable server snapshot for sync external store hydration', () => {
    const firstSnapshot = getKangurProgressServerSnapshot();
    const secondSnapshot = getKangurProgressServerSnapshot();

    expect(firstSnapshot).toBe(secondSnapshot);
    expect(firstSnapshot).toEqual(createDefaultKangurProgressState());
  });

  it('applies xp to the active owner scoped snapshot by default', () => {
    saveProgress(
      createDefaultKangurProgressState(),
      { ownerKey: 'learner-1' }
    );
    saveProgress(
      createDefaultKangurProgressState(),
      { ownerKey: 'learner-2' }
    );

    setProgressOwnerKey('learner-1');
    addXp(12);

    setProgressOwnerKey('learner-2');
    addXp(5);

    expect(loadProgress({ ownerKey: 'learner-1' }).totalXp).toBe(12);
    expect(loadProgress({ ownerKey: 'learner-2' }).totalXp).toBe(5);
  });

  it('records lesson panel progress without reducing prior progress', () => {
    saveProgress(createDefaultKangurProgressState());

    recordKangurLessonPanelProgress({
      lessonKey: 'clock',
      sectionId: 'hours',
      viewedCount: 2,
      totalCount: 5,
      label: 'Hours',
      viewedAt: '2026-03-20T10:00:00.000Z',
    });
    recordKangurLessonPanelProgress({
      lessonKey: 'clock',
      sectionId: 'hours',
      viewedCount: 1,
      totalCount: 4,
      viewedAt: '2026-03-20T11:00:00.000Z',
    });

    expect(loadProgress().lessonPanelProgress?.clock?.hours).toEqual({
      viewedCount: 2,
      totalCount: 5,
      label: 'Hours',
      lastViewedAt: '2026-03-20T10:00:00.000Z',
      sessionStartedAt: null,
      sessionUpdatedAt: null,
    });
  });

  it('records lesson panel time per session and preserves session start for the same session', () => {
    saveProgress(createDefaultKangurProgressState());

    recordKangurLessonPanelTime({
      lessonKey: 'clock',
      sectionId: 'hours',
      panelId: 'panel-a',
      seconds: 12,
      panelTitle: 'Panel A',
      sessionId: 'session-1',
      sessionStartedAt: '2026-03-20T10:00:00.000Z',
      sessionUpdatedAt: '2026-03-20T10:00:12.000Z',
    });
    recordKangurLessonPanelTime({
      lessonKey: 'clock',
      sectionId: 'hours',
      panelId: 'panel-a',
      seconds: 9,
      sessionId: 'session-1',
      sessionStartedAt: '2026-03-20T10:00:05.000Z',
      sessionUpdatedAt: '2026-03-20T10:00:20.000Z',
    });

    expect(loadProgress().lessonPanelProgress?.clock?.hours).toEqual({
      viewedCount: 0,
      totalCount: 0,
      lastViewedAt: null,
      panelTimes: {
        'panel-a': {
          seconds: 12,
          title: 'Panel A',
        },
      },
      sessionId: 'session-1',
      sessionStartedAt: '2026-03-20T10:00:00.000Z',
      sessionUpdatedAt: '2026-03-20T10:00:20.000Z',
    });
  });

  it('builds a lesson mastery entry from a completed lesson attempt', () => {
    const progress = createDefaultKangurProgressState();

    const updated = buildLessonMasteryUpdate(progress, 'clock', 60, '2026-03-06T10:00:00.000Z');

    expect(updated['clock']).toEqual({
      attempts: 1,
      completions: 0,
      masteryPercent: 60,
      bestScorePercent: 60,
      lastScorePercent: 60,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
  });

  it('localizes geometry activity labels through the progress runtime translator', () => {
    expect(
      formatKangurProgressActivityLabel('game:geometry', {
        translate: translateDeProgressMessage,
      })
    ).toBe('Spiel: Geometrie');
  });

  it('localizes music lesson activity labels through the progress runtime translator', () => {
    expect(
      formatKangurProgressActivityLabel('lesson_completion:music_diatonic_scale', {
        translate: translateDeProgressMessage,
      })
    ).toBe('Lektion: Diatonische Tonleiter');
  });

  it('localizes clock training activity labels through the progress runtime translator', () => {
    expect(
      formatKangurProgressActivityLabel('training:clock:hours', {
        translate: translateDeProgressMessage,
      })
    ).toBe('Uhrtraining: Stunden');
  });

  it('creates a standard lesson practice reward with mastery and lesson completion updates', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'adding', 4, 6);

    expect(reward.xp).toBe(18);
    expect(reward.scorePercent).toBe(67);
    expect(reward.progressUpdates.gamesPlayed).toBe(1);
    expect(reward.progressUpdates.perfectGames).toBeUndefined();
    expect(reward.progressUpdates.operationsPlayed).toEqual([]);
    expect(reward.progressUpdates.lessonsCompleted).toBeUndefined();
    expect(reward.progressUpdates.totalCorrectAnswers).toBe(4);
    expect(reward.progressUpdates.totalQuestionsAnswered).toBe(6);
    expect(reward.progressUpdates.currentWinStreak).toBe(0);
    expect(reward.progressUpdates.bestWinStreak).toBe(0);
    expect(reward.progressUpdates.currentActivityRepeatStreak).toBe(1);
    expect(reward.progressUpdates.lastRewardedActivityKey).toBe('lesson_practice:adding');
    expect(reward.progressUpdates.activityStats?.['lesson_practice:adding']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 0,
      totalCorrectAnswers: 4,
      totalQuestionsAnswered: 6,
      totalXpEarned: 18,
      bestScorePercent: 67,
      lastScorePercent: 67,
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedAt: expect.any(String),
    });
    expect(reward.progressUpdates.lessonMastery?.['adding']).toEqual({
      attempts: 1,
      completions: 0,
      masteryPercent: 67,
      bestScorePercent: 67,
      lastScorePercent: 67,
      lastCompletedAt: expect.any(String),
    });
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'base', xp: 12 }),
        expect.objectContaining({ kind: 'accuracy', xp: 6 }),
      ])
    );
  });

  it('uses the perfect-game reward when lesson practice finishes with a full score', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'division', 7, 7);

    expect(reward.xp).toBe(53);
    expect(reward.scorePercent).toBe(100);
    expect(reward.progressUpdates.gamesPlayed).toBe(1);
    expect(reward.progressUpdates.perfectGames).toBe(1);
    expect(reward.progressUpdates.operationsPlayed).toEqual(['division']);
    expect(reward.progressUpdates.lessonMastery?.['division']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 100,
      bestScorePercent: 100,
      lastScorePercent: 100,
      lastCompletedAt: expect.any(String),
    });
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'base', xp: 12 }),
        expect.objectContaining({ kind: 'accuracy', xp: 18 }),
        expect.objectContaining({ kind: 'first_activity', xp: 4 }),
        expect.objectContaining({ kind: 'mastery', xp: 4 }),
        expect.objectContaining({ kind: 'variety', xp: 3 }),
        expect.objectContaining({ kind: 'perfect', xp: 12 }),
      ])
    );
  });

  it('falls back to the baseline reward when lesson practice stays below the mastery threshold', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'subtracting', 2, 6);

    expect(reward.xp).toBe(12);
    expect(reward.scorePercent).toBe(33);
    expect(reward.progressUpdates.lessonMastery?.['subtracting']?.masteryPercent).toBe(33);
    expect(reward.progressUpdates.currentWinStreak).toBe(0);
  });

  it('creates a main game reward with operation tracking, streaks, and speed bonus', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createGameSessionReward(progress, {
      operation: 'addition',
      difficulty: 'hard',
      correctAnswers: 9,
      totalQuestions: 10,
      durationSeconds: 48,
    });

    expect(reward.xp).toBe(44);
    expect(reward.scorePercent).toBe(90);
    expect(reward.progressUpdates.gamesPlayed).toBe(1);
    expect(reward.progressUpdates.perfectGames).toBeUndefined();
    expect(reward.progressUpdates.operationsPlayed).toEqual(['addition']);
    expect(reward.progressUpdates.currentWinStreak).toBe(1);
    expect(reward.progressUpdates.bestWinStreak).toBe(1);
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'base', xp: 10 }),
        expect.objectContaining({ kind: 'accuracy', xp: 14 }),
        expect.objectContaining({ kind: 'difficulty', xp: 8 }),
        expect.objectContaining({ kind: 'speed', xp: 5 }),
        expect.objectContaining({ kind: 'first_activity', xp: 4 }),
        expect.objectContaining({ kind: 'variety', xp: 3 }),
      ])
    );
    expect(reward.progressUpdates.activityStats?.['game:addition']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 0,
      totalCorrectAnswers: 9,
      totalQuestionsAnswered: 10,
      totalXpEarned: 44,
      bestScorePercent: 90,
      lastScorePercent: 90,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: expect.any(String),
    });
  });

  it('adds a guided-focus bonus when a recommended game session finishes strongly', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createGameSessionReward(progress, {
      operation: 'division',
      difficulty: 'medium',
      correctAnswers: 8,
      followsRecommendation: true,
      totalQuestions: 10,
      durationSeconds: 80,
    });

    expect(reward.xp).toBe(37);
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'guided_focus', label: 'Polecony kierunek', xp: 3 }),
      ])
    );
  });

  it('creates a training reward with the dedicated perfect counter', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createTrainingReward(progress, {
      activityKey: 'training:calendar',
      lessonKey: 'calendar',
      correctAnswers: 6,
      totalQuestions: 6,
      strongThresholdPercent: 65,
      perfectCounterKey: 'calendarPerfect',
    });

    expect(reward.xp).toBe(55);
    expect(reward.progressUpdates.gamesPlayed).toBe(1);
    expect(reward.progressUpdates.perfectGames).toBe(1);
    expect(reward.progressUpdates.operationsPlayed).toEqual(['calendar']);
    expect(reward.progressUpdates.calendarPerfect).toBe(1);
    expect(reward.progressUpdates.activityStats?.['training:calendar']?.perfectSessions).toBe(1);
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'mastery', xp: 4 }),
        expect.objectContaining({ kind: 'variety', xp: 3 }),
      ])
    );
  });

  it('creates a lesson completion reward without counting solved questions', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonCompletionReward(progress, 'clock', 100);

    expect(reward.xp).toBe(56);
    expect(reward.scorePercent).toBe(100);
    expect(reward.progressUpdates.lessonsCompleted).toBe(1);
    expect(reward.progressUpdates.totalQuestionsAnswered).toBe(0);
    expect(reward.progressUpdates.activityStats?.['lesson_completion:clock']).toEqual({
      sessionsPlayed: 1,
      perfectSessions: 1,
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
      totalXpEarned: 56,
      bestScorePercent: 100,
      lastScorePercent: 100,
      currentStreak: 1,
      bestStreak: 1,
      lastPlayedAt: expect.any(String),
    });
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'mastery', xp: 4 })])
    );
  });

  it('adds mastery and variety progression toward the new mastery badge track', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'clock', 5, 5);
    const nextProgress = {
      ...createDefaultKangurProgressState(),
      ...reward.progressUpdates,
      totalXp: reward.xp,
    };

    expect(getMasteredLessonCount(nextProgress, 75)).toBe(1);
    expect(getProgressBadges(nextProgress).find((badge) => badge.id === 'mastery_builder')).toMatchObject({
      isUnlocked: false,
      summary: '1/3 lekcje',
    });
  });

  it('unlocks quest badges from completed daily quests and exposes the next quest milestone', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      dailyQuestsCompleted: 1,
    };

    const badges = getProgressBadges(progress);

    expect(badges.find((badge) => badge.id === 'quest_starter')).toMatchObject({
      isUnlocked: true,
      summary: '1/1 misja',
    });
    expect(badges.find((badge) => badge.id === 'quest_keeper')).toMatchObject({
      isUnlocked: false,
      summary: '1/3 misje',
      progressPercent: 33,
    });
  });

  it('unlocks guided recommendation badges from completed recommended sessions', () => {
    const badges = getProgressBadges({
      ...createDefaultKangurProgressState(),
      recommendedSessionsCompleted: 1,
    });

    expect(badges.find((badge) => badge.id === 'guided_step')).toMatchObject({
      isUnlocked: true,
      summary: '1/1 runda',
    });
    expect(badges.find((badge) => badge.id === 'guided_keeper')).toMatchObject({
      isUnlocked: false,
      summary: '1/3 rundy',
      progressPercent: 33,
    });
  });

  it('summarizes guided-session momentum toward the next recommendation badge', () => {
    const momentum = getRecommendedSessionMomentum({
      ...createDefaultKangurProgressState(),
      recommendedSessionsCompleted: 2,
    });

    expect(momentum).toEqual({
      completedSessions: 2,
      progressPercent: 67,
      summary: '2/3 rundy',
      nextBadgeName: 'Trzymam kierunek',
    });
  });

  it('localizes runtime badge and momentum summaries when a translator is provided', () => {
    const translate = (key: string, values?: Record<string, string | number>) => {
      switch (key) {
        case 'badges.guided_keeper.name':
          return 'Staying on course';
        case 'badgeSummaries.round':
          return `${values?.['current']}/${values?.['target']} rounds`;
        case 'momentum.allGoalsCompleted':
          return 'All goals completed!';
        case 'activityLabels.clock':
          return 'Clock';
        case 'clockSections.hours':
          return 'Hours';
        case 'activityKinds.clockTraining':
          return `Clock training: ${values?.['label']}`;
        case 'badgeTracks.xp':
          return 'XP';
        default:
          return key;
      }
    };

    const momentum = getRecommendedSessionMomentum(
      {
        ...createDefaultKangurProgressState(),
        recommendedSessionsCompleted: 2,
      },
      { translate }
    );
    const projected = getRecommendedSessionProjection(
      {
        ...createDefaultKangurProgressState(),
        recommendedSessionsCompleted: 2,
      },
      true,
      { translate }
    );
    const topActivity = getProgressTopActivities(
      {
        ...createDefaultKangurProgressState(),
        activityStats: {
          'training:clock:hours': {
            sessionsPlayed: 2,
            perfectSessions: 0,
            totalCorrectAnswers: 7,
            totalQuestionsAnswered: 10,
            totalXpEarned: 42,
            bestScorePercent: 80,
            lastScorePercent: 70,
            currentStreak: 1,
            bestStreak: 1,
            lastPlayedAt: '2026-03-08T10:00:00.000Z',
          },
        },
      },
      1,
      { translate }
    )[0];
    const tracks = getProgressBadgeTrackSummaries(
      {
        ...createDefaultKangurProgressState(),
        totalXp: 480,
        gamesPlayed: 4,
      },
      { maxTracks: 1 },
      { translate }
    );

    expect(momentum).toEqual({
      completedSessions: 2,
      progressPercent: 67,
      summary: '2/3 rounds',
      nextBadgeName: 'Staying on course',
    });
    expect(projected.projected.summary).toBe('All goals completed!');
    expect(topActivity?.label).toBe('Clock training: Hours');
    expect(tracks[0]?.label).toBe('XP');
  });

  it('uses polished German locale copy for English badge labels and descriptions', () => {
    const badges = getProgressBadges(createDefaultKangurProgressState(), {
      translate: translateDeProgressMessage,
    });

    expect(badges.find((badge) => badge.id === 'english_pronoun_pro')).toMatchObject({
      name: 'Pronomen-Profi',
      desc: 'Erreiche 2 perfekte Ergebnisse bei Pronomen',
    });
    expect(badges.find((badge) => badge.id === 'english_sentence_builder')).toMatchObject({
      name: 'Satzarchitekt',
      desc: 'Erreiche 80%+ und spiele 3 Sitzungen zu Satzbau',
    });
    expect(badges.find((badge) => badge.id === 'english_agreement_guardian')).toMatchObject({
      name: 'Übereinstimmungs-Wächter',
      desc: 'Erreiche ein perfektes Ergebnis bei der Subjekt-Verb-Ubereinstimmung',
    });
    expect(badges.find((badge) => badge.id === 'english_mastery_builder')).toMatchObject({
      name: 'Englisch-Baumeister',
      desc: 'Bringe 3 Englisch-Lektionen auf mindestens 75% Meisterschaft',
    });
  });

  it('projects guided-session momentum for the active recommended round', () => {
    const projection = getRecommendedSessionProjection(
      {
        ...createDefaultKangurProgressState(),
        recommendedSessionsCompleted: 2,
      },
      1
    );

    expect(projection.current).toEqual({
      completedSessions: 2,
      progressPercent: 67,
      summary: '2/3 rundy',
      nextBadgeName: 'Trzymam kierunek',
    });
    expect(projection.projected).toEqual({
      completedSessions: 3,
      progressPercent: 100,
      summary: 'Wszystkie cele osiągnięte!',
      nextBadgeName: null,
    });
  });

  it('reduces repeated farming rewards after the same activity is played too many times in a row', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      operationsPlayed: ['addition'],
      currentWinStreak: 1,
      bestWinStreak: 2,
      currentActivityRepeatStreak: 2,
      lastRewardedActivityKey: 'game:addition',
      activityStats: {
        'game:addition': {
          sessionsPlayed: 2,
          perfectSessions: 0,
          totalCorrectAnswers: 15,
          totalQuestionsAnswered: 20,
          totalXpEarned: 42,
          bestScorePercent: 80,
          lastScorePercent: 80,
          currentStreak: 2,
          bestStreak: 2,
          lastPlayedAt: '2026-03-09T10:00:00.000Z',
        },
      },
    };

    const reward = createGameSessionReward(progress, {
      operation: 'addition',
      difficulty: 'medium',
      correctAnswers: 8,
      totalQuestions: 10,
      durationSeconds: 90,
    });

    expect(reward.xp).toBe(27);
    expect(reward.progressUpdates.currentActivityRepeatStreak).toBe(3);
    expect(reward.progressUpdates.lastRewardedActivityKey).toBe('game:addition');
    expect(reward.breakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'anti_repeat', xp: -2 })])
    );
  });

  it('exposes badge progress metadata for locked and unlocked badges', () => {
    const badges = getProgressBadges({
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
      totalXp: 620,
      badges: ['first_game'],
    });

    expect(badges.find((badge) => badge.id === 'first_game')).toMatchObject({
      isUnlocked: true,
      summary: '1/1 gra',
    });
    expect(badges.find((badge) => badge.id === 'ten_games')).toMatchObject({
      isUnlocked: false,
      summary: '4/10 gier',
    });
    expect(badges.find((badge) => badge.id === 'xp_500')).toMatchObject({
      isUnlocked: true,
      summary: '500/500 XP',
    });
  });

  it('picks the most advanced locked badge as the next learner-profile milestone', () => {
    const nextBadge = getNextLockedBadge({
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
      totalXp: 480,
      badges: ['first_game'],
    });

    expect(nextBadge).toMatchObject({
      id: 'xp_500',
      summary: '480/500 XP',
      progressPercent: 96,
    });
  });

  it('lets a training-only learner unlock the first-game badge path', () => {
    const reward = createTrainingReward(createDefaultKangurProgressState(), {
      activityKey: 'training:clock:hours',
      lessonKey: 'clock',
      correctAnswers: 5,
      totalQuestions: 5,
      strongThresholdPercent: 60,
      perfectCounterKey: 'clockPerfect',
    });

    const badges = getProgressBadges({
      ...createDefaultKangurProgressState(),
      ...reward.progressUpdates,
      totalXp: reward.xp,
    });

    expect(badges.find((badge) => badge.id === 'first_game')).toMatchObject({
      isUnlocked: true,
    });
    expect(badges.find((badge) => badge.id === 'variety')).toMatchObject({
      summary: '1/5 typów',
    });
  });

  it('shows only unlocked badges plus the top locked badges already in progress', () => {
    const badges = getVisibleProgressBadges({
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
      totalXp: 480,
      dailyQuestsCompleted: 1,
      operationsPlayed: ['addition', 'clock'],
      totalCorrectAnswers: 32,
      totalQuestionsAnswered: 40,
      currentWinStreak: 2,
      bestWinStreak: 2,
      badges: ['first_game'],
    });

    expect(badges.map((badge) => badge.id)).toEqual([
      'first_game',
      'streak_3',
      'accuracy_ace',
      'xp_500',
      'quest_starter',
    ]);
    expect(badges).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'ten_games' })])
    );
    expect(badges).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'variety' })])
    );
    expect(badges).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'xp_1000' })])
    );
  });

  it('hides locked badges entirely when there is no real badge progress yet', () => {
    expect(getVisibleProgressBadges(createDefaultKangurProgressState())).toEqual([]);
  });

  it('groups badge progress into themed track summaries', () => {
    const tracks = getProgressBadgeTrackSummaries({
      ...createDefaultKangurProgressState(),
      gamesPlayed: 4,
      lessonsCompleted: 2,
      clockPerfect: 1,
      totalXp: 480,
      bestWinStreak: 2,
      operationsPlayed: ['addition', 'clock'],
      dailyQuestsCompleted: 1,
    });

    expect(tracks.map((track) => track.key)).toEqual([
      'onboarding',
      'xp',
      'consistency',
      'variety',
    ]);
    expect(tracks.find((track) => track.key === 'consistency')).toMatchObject({
      nextBadge: expect.objectContaining({
        id: 'streak_3',
        summary: '2/3 w serii',
      }),
    });
    expect(tracks.find((track) => track.key === 'xp')).toMatchObject({
      progressPercent: 72,
      nextBadge: expect.objectContaining({
        id: 'xp_500',
      }),
    });
  });

  it('merges lesson mastery by keeping the latest mastery snapshot and the best score', () => {
    const remote = {
      ...createDefaultKangurProgressState(),
      totalCorrectAnswers: 12,
      totalQuestionsAnswered: 18,
      bestWinStreak: 2,
      activityStats: {
        'lesson_practice:clock': {
          sessionsPlayed: 2,
          perfectSessions: 0,
          totalCorrectAnswers: 12,
          totalQuestionsAnswered: 18,
          totalXpEarned: 44,
          bestScorePercent: 80,
          lastScorePercent: 67,
          currentStreak: 1,
          bestStreak: 1,
          lastPlayedAt: '2026-03-05T10:00:00.000Z',
        },
      },
      lessonMastery: {
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 68,
          bestScorePercent: 90,
          lastScorePercent: 70,
          lastCompletedAt: '2026-03-05T10:00:00.000Z',
        },
      },
    };
    const local = {
      ...createDefaultKangurProgressState(),
      totalCorrectAnswers: 15,
      totalQuestionsAnswered: 18,
      currentWinStreak: 3,
      bestWinStreak: 3,
      activityStats: {
        'lesson_practice:clock': {
          sessionsPlayed: 3,
          perfectSessions: 1,
          totalCorrectAnswers: 15,
          totalQuestionsAnswered: 18,
          totalXpEarned: 78,
          bestScorePercent: 100,
          lastScorePercent: 100,
          currentStreak: 3,
          bestStreak: 3,
          lastPlayedAt: '2026-03-06T10:00:00.000Z',
        },
      },
      lessonMastery: {
        clock: {
          attempts: 3,
          completions: 3,
          masteryPercent: 82,
          bestScorePercent: 82,
          lastScorePercent: 82,
          lastCompletedAt: '2026-03-06T10:00:00.000Z',
        },
        geometry_shapes: {
          attempts: 1,
          completions: 1,
          masteryPercent: 60,
          bestScorePercent: 60,
          lastScorePercent: 60,
          lastCompletedAt: '2026-03-06T11:00:00.000Z',
        },
      },
    };

    const merged = mergeProgressStates(remote, local);

    expect(merged.lessonMastery['clock']).toEqual({
      attempts: 3,
      completions: 3,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 82,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
    expect(merged.lessonMastery['geometry_shapes']).toEqual(local.lessonMastery['geometry_shapes']);
    expect(merged.totalCorrectAnswers).toBe(15);
    expect(merged.totalQuestionsAnswered).toBe(18);
    expect(merged.bestWinStreak).toBe(3);
    expect(merged.dailyQuestsCompleted).toBe(0);
    expect(merged.activityStats?.['lesson_practice:clock']).toEqual({
      sessionsPlayed: 3,
      perfectSessions: 1,
      totalCorrectAnswers: 15,
      totalQuestionsAnswered: 18,
      totalXpEarned: 78,
      bestScorePercent: 100,
      lastScorePercent: 100,
      currentStreak: 3,
      bestStreak: 3,
      lastPlayedAt: '2026-03-06T10:00:00.000Z',
    });
    expect(merged.lastRewardedActivityKey).toBeNull();
    expect(merged.currentActivityRepeatStreak).toBe(0);
  });

  it('exposes XP pace in top activity summaries', () => {
    const topActivity = getProgressTopActivities({
      ...createDefaultKangurProgressState(),
      activityStats: {
        'training:clock:hours': {
          sessionsPlayed: 4,
          perfectSessions: 1,
          totalCorrectAnswers: 18,
          totalQuestionsAnswered: 20,
          totalXpEarned: 112,
          bestScorePercent: 100,
          lastScorePercent: 80,
          currentStreak: 2,
          bestStreak: 2,
          lastPlayedAt: '2026-03-08T10:00:00.000Z',
        },
      },
    })[0];

    expect(topActivity).toMatchObject({
      key: 'training:clock:hours',
      totalXpEarned: 112,
      averageXpPerSession: 28,
    });
  });
});
