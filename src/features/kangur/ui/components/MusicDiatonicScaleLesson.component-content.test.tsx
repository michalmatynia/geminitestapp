/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID } from '@/features/kangur/games/music-piano-roll-contract';
import { MUSIC_DIATONIC_SCALE_SECTION_IDS } from '@/features/kangur/ui/components/music-diatonic-scale-lesson-content';

const {
  kangurUnifiedLessonMock,
} = vi.hoisted(() => ({
  kangurUnifiedLessonMock: vi.fn(),
}));

vi.mock('../lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import MusicDiatonicScaleLesson, {
  MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS,
  MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS,
  MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS,
} from './MusicDiatonicScaleLesson';

describe('MusicDiatonicScaleLesson', () => {
  it('prefers localized template component content over the static fallback payload', () => {
    render(
      <MusicDiatonicScaleLesson
        lessonTemplate={{
          componentId: KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
          subject: 'music',
          ageGroup: 'six_year_old',
          label: 'Music',
          title: 'Scale from Mongo',
          description: 'DB description',
          emoji: '🎵',
          color: 'kangur-gradient-accent-sky',
          activeBg: 'bg-sky-500',
          sortOrder: 100,
          componentContent: {
            kind: KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
            notesSection: {
              emoji: '🎼',
              title: 'Database notes',
              description: 'Database note description',
              introSlide: {
                title: 'Database intro slide',
                lead: 'Database intro lead',
                noteCardLabel: 'Sound',
                noteSequence: ['do', 're', 'mi'],
                caption: 'Database intro caption',
              },
              colorsSlide: {
                title: 'Database colors slide',
                lead: 'Database colors lead',
                noteChips: ['red', 'blue'],
                previewTitle: 'Database preview title',
                previewDescription: 'Database preview description',
                caption: 'Database colors caption',
              },
            },
            melodySection: {
              emoji: '🎶',
              title: 'Database melody',
              description: 'Database melody description',
              directionSlide: {
                title: 'Database direction slide',
                lead: 'Database direction lead',
                ascendingTitle: 'Up',
                ascendingSequence: 'do re mi',
                ascendingCaption: 'Database ascending caption',
                descendingTitle: 'Down',
                descendingSequence: 'mi re do',
                descendingCaption: 'Database descending caption',
              },
              listenSlide: {
                title: 'Database listen slide',
                lead: 'Database listen lead',
                planTitle: 'Database plan',
                planSteps: ['Listen', 'Watch', 'Repeat'],
                caption: 'Database listen caption',
              },
            },
            gameRepeatSection: {
              emoji: '🎹',
              title: 'Database repeat',
              description: 'Database repeat description',
              gameStageTitle: 'Database repeat game',
              gameStageDescription: 'Database repeat game description',
            },
            gameFreeplaySection: {
              emoji: '🎛️',
              title: 'Database freeplay',
              description: 'Database freeplay description',
              gameStageTitle: 'Database freeplay game',
              gameStageDescription: 'Database freeplay game description',
            },
            summarySection: {
              emoji: '⭐',
              title: 'Database summary',
              description: 'Database summary description',
              summarySlide: {
                title: 'Database summary slide',
                lead: 'Database summary lead',
                facts: [
                  {
                    title: 'Fact one',
                    caption: 'Fact one caption',
                  },
                ],
              },
            },
          },
        }}
      />,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as {
      lessonTitle: string;
      sections: Array<{ id: string; title: string; description: string }>;
      slides: Record<string, Array<{ title: string }>>;
      games: Array<{
        stage: { title: string; description: string };
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>;
    };

    expect(props.lessonTitle).toBe('Scale from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: MUSIC_DIATONIC_SCALE_SECTION_IDS.notes,
          title: 'Database notes',
          description: 'Database note description',
        }),
        expect.objectContaining({
          id: MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame,
          title: 'Database repeat',
          description: 'Database repeat description',
        }),
      ]),
    );
    expect(props.slides.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database intro slide' }),
        expect.objectContaining({ title: 'Database colors slide' }),
      ]),
    );
    expect(props.games[0]?.stage).toEqual({
      title: 'Database repeat game',
      description: 'Database repeat game description',
      accent: 'sky',
      icon: '🎹',
      maxWidthClassName: 'max-w-none',
      shellTestId: MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS.repeat,
      shellVariant: 'plain',
    });
    expect(props.games[1]?.stage).toEqual({
      title: 'Database freeplay game',
      description: 'Database freeplay game description',
      accent: 'sky',
      icon: '🎛️',
      maxWidthClassName: 'max-w-none',
      shellTestId: MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS.freePlay,
      shellVariant: 'plain',
    });
    expect(props.games[0]?.launchableInstance).toEqual({
      ...MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.launchableInstance,
    });
    expect(props.games[1]?.launchableInstance).toEqual({
      ...MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.launchableInstance,
    });
  });
});
