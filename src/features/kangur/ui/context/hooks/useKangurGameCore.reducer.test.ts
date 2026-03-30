import { describe, expect, it } from 'vitest';

import type { KangurQuestion, KangurSessionRecommendationHint } from '../../types';
import {
  initialKangurGameCoreState,
  kangurGameCoreReducer,
} from './useKangurGameCore.reducer';

const sampleQuestion: KangurQuestion = {
  question: '6 + 1',
  choices: [7, 8, 9, 10],
  answer: 7,
};

const sampleRecommendation: KangurSessionRecommendationHint = {
  label: 'Try addition',
  source: 'operation_selector',
  title: 'Recommended session',
};

describe('kangurGameCoreReducer', () => {
  it('starts a session with a single atomic transition', () => {
    const state = kangurGameCoreReducer(
      {
        ...initialKangurGameCoreState,
        screen: 'operation',
        score: 5,
        currentQuestionIndex: 4,
        timeTaken: 12,
      },
      {
        type: 'START_SESSION',
        payload: {
          difficulty: 'hard',
          operation: 'addition',
          questions: [sampleQuestion],
          startTime: 1234,
          recommendation: sampleRecommendation,
        },
      }
    );

    expect(state.screen).toBe('playing');
    expect(state.operation).toBe('addition');
    expect(state.difficulty).toBe('hard');
    expect(state.questions).toEqual([sampleQuestion]);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(state.timeTaken).toBe(0);
    expect(state.startTime).toBe(1234);
    expect(state.activeSessionRecommendation).toEqual(sampleRecommendation);
    expect(state.launchableGameInstanceId).toBeNull();
  });

  it('supports updater-style setter actions and question advancement', () => {
    const withScore = kangurGameCoreReducer(initialKangurGameCoreState, {
      type: 'SET_SCORE',
      value: (current) => current + 2,
    });
    const next = kangurGameCoreReducer(
      {
        ...withScore,
        currentQuestionIndex: 1,
      },
      { type: 'ADVANCE_QUESTION' }
    );

    expect(withScore.score).toBe(2);
    expect(next.currentQuestionIndex).toBe(2);
  });

  it('completes a session atomically', () => {
    const state = kangurGameCoreReducer(
      {
        ...initialKangurGameCoreState,
        score: 3,
        timeTaken: 9,
      },
      {
        type: 'COMPLETE_SESSION',
        payload: {
          score: 7,
          timeTaken: 42,
        },
      }
    );

    expect(state.score).toBe(7);
    expect(state.timeTaken).toBe(42);
  });

  it('resets navigation state and dismisses xp toasts without clobbering the rest', () => {
    const resetState = kangurGameCoreReducer(
      {
        ...initialKangurGameCoreState,
        screen: 'playing',
        launchableGameInstanceId: 'instance-1',
        activeSessionRecommendation: sampleRecommendation,
        xpToast: {
          visible: true,
          xpGained: 40,
          newBadges: ['badge-1'],
          breakdown: [],
          nextBadge: null,
          dailyQuest: null,
          recommendation: null,
        },
      },
      {
        type: 'RESET_GAME',
        payload: {
          screen: 'home',
          recommendation: null,
          launchableGameInstanceId: null,
        },
      }
    );
    const dismissedState = kangurGameCoreReducer(resetState, { type: 'DISMISS_XP_TOAST' });

    expect(resetState.screen).toBe('home');
    expect(resetState.launchableGameInstanceId).toBeNull();
    expect(resetState.activeSessionRecommendation).toBeNull();
    expect(dismissedState.xpToast.visible).toBe(false);
    expect(dismissedState.xpToast.xpGained).toBe(40);
  });
});
