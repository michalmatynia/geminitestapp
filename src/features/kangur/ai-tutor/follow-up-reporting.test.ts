import { describe, expect, it } from 'vitest';

import { summarizeKangurAiTutorFollowUpActions } from './follow-up-reporting';

describe('summarizeKangurAiTutorFollowUpActions', () => {
  it('reports bridge follow-up metadata for lesson-to-game actions', () => {
    expect(
      summarizeKangurAiTutorFollowUpActions([
        {
          id: 'bridge:lesson-to-game:adding',
          label: 'Uruchom trening',
          page: 'Game',
          query: {
            quickStart: 'operation',
            operation: 'addition',
            difficulty: 'medium',
          },
          reason: 'Po lekcji: Dodawanie',
        },
      ])
    ).toEqual({
      primaryFollowUpActionId: 'bridge:lesson-to-game:adding',
      primaryFollowUpPage: 'Game',
      hasBridgeFollowUpAction: true,
      bridgeFollowUpActionCount: 1,
      bridgeFollowUpDirection: 'lesson_to_game',
    });
  });

  it('reports non-bridge follow-up metadata for regular recommendations', () => {
    expect(
      summarizeKangurAiTutorFollowUpActions([
        {
          id: 'recommendation:strengthen_lesson_mastery',
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: {
            focus: 'adding',
          },
          reason: 'Powtorz lekcje: Dodawanie',
        },
      ])
    ).toEqual({
      primaryFollowUpActionId: 'recommendation:strengthen_lesson_mastery',
      primaryFollowUpPage: 'Lessons',
      hasBridgeFollowUpAction: false,
      bridgeFollowUpActionCount: 0,
      bridgeFollowUpDirection: null,
    });
  });
});
