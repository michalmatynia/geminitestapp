import { describe, expect, it } from 'vitest';

import {
  createGeometryDrawingGameInitialState,
  geometryDrawingGameReducer,
} from '@/features/kangur/ui/components/geometry-drawing/GeometryDrawingGame.logic';

describe('GeometryDrawingGame.logic', () => {
  it('creates the default initial state', () => {
    expect(createGeometryDrawingGameInitialState()).toEqual({
      difficulty: 'starter',
      roundIndex: 0,
      score: 0,
      done: false,
      xpEarned: 0,
      xpBreakdown: [],
      feedback: null,
    });
  });

  it('switches difficulty and resets session progress', () => {
    const state = {
      ...createGeometryDrawingGameInitialState(),
      roundIndex: 3,
      score: 2,
      done: true,
      xpEarned: 18,
      xpBreakdown: [{ label: 'XP', value: '+18 XP' }],
      feedback: { kind: 'info' as const, text: 'Keep going' },
    };

    expect(
      geometryDrawingGameReducer(state, {
        type: 'select_difficulty',
        difficulty: 'pro',
      })
    ).toEqual({
      difficulty: 'pro',
      roundIndex: 0,
      score: 0,
      done: false,
      xpEarned: 0,
      xpBreakdown: [],
      feedback: null,
    });
  });

  it('stores and clears feedback', () => {
    const initialState = createGeometryDrawingGameInitialState();
    const withFeedback = geometryDrawingGameReducer(initialState, {
      type: 'set_feedback',
      feedback: { kind: 'success', text: 'Nice work' },
    });

    expect(withFeedback.feedback).toEqual({ kind: 'success', text: 'Nice work' });
    expect(geometryDrawingGameReducer(withFeedback, { type: 'clear_feedback' }).feedback).toBeNull();
    expect(geometryDrawingGameReducer(initialState, { type: 'clear_feedback' })).toBe(initialState);
  });

  it('advances rounds and increments score only on accepted answers', () => {
    const accepted = geometryDrawingGameReducer(createGeometryDrawingGameInitialState(), {
      type: 'advance_round',
      accepted: true,
    });
    expect(accepted.roundIndex).toBe(1);
    expect(accepted.score).toBe(1);

    const rejected = geometryDrawingGameReducer(accepted, {
      type: 'advance_round',
      accepted: false,
    });
    expect(rejected.roundIndex).toBe(2);
    expect(rejected.score).toBe(1);
  });

  it('stores completion payloads', () => {
    const completed = geometryDrawingGameReducer(createGeometryDrawingGameInitialState('pro'), {
      type: 'finish',
      finalScore: 5,
      xpEarned: 24,
      xpBreakdown: [{ label: 'Perfect', value: '+24 XP' }],
    });

    expect(completed).toEqual({
      difficulty: 'pro',
      roundIndex: 0,
      score: 5,
      done: true,
      xpEarned: 24,
      xpBreakdown: [{ label: 'Perfect', value: '+24 XP' }],
      feedback: null,
    });
  });

  it('resets a finished run while preserving the selected difficulty', () => {
    const finished = geometryDrawingGameReducer(createGeometryDrawingGameInitialState('pro'), {
      type: 'finish',
      finalScore: 4,
      xpEarned: 20,
      xpBreakdown: [{ label: 'Reward', value: '+20 XP' }],
    });

    expect(geometryDrawingGameReducer(finished, { type: 'reset_run' })).toEqual({
      difficulty: 'pro',
      roundIndex: 0,
      score: 0,
      done: false,
      xpEarned: 0,
      xpBreakdown: [],
      feedback: null,
    });
  });
});
