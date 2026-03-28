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
              gameTitle: 'Database repeat game',
              gameDescription: 'Database repeat game description',
            },
            gameFreeplaySection: {
              emoji: '🎛️',
              title: 'Database freeplay',
              description: 'Database freeplay description',
              gameTitle: 'Database freeplay game',
              gameDescription: 'Database freeplay game description',
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
        shell: { title: string; description: string };
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
    expect(props.games[0]?.shell).toEqual({
      title: 'Database repeat game',
      description: 'Database repeat game description',
      accent: 'sky',
      icon: '🎹',
      maxWidthClassName: 'max-w-none',
      shellTestId: MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS.repeat,
      shellVariant: 'plain',
    });
    expect(props.games[1]?.shell).toEqual({
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

  it('keeps backward compatibility with legacy gameStage music copy', () => {
    render(
      <MusicDiatonicScaleLesson
        lessonTemplate={{
          componentId: KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
          subject: 'music',
          ageGroup: 'six_year_old',
          label: 'Music',
          title: 'Legacy scale from Mongo',
          description: 'Legacy DB description',
          emoji: '🎵',
          color: 'kangur-gradient-accent-sky',
          activeBg: 'bg-sky-500',
          sortOrder: 100,
          componentContent: {
            kind: KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
            notesSection: {
              emoji: '🎼',
              title: 'Legacy notes',
              description: 'Legacy note description',
              introSlide: {
                title: 'Legacy intro slide',
                lead: 'Legacy intro lead',
                noteCardLabel: 'Sound',
                noteSequence: ['do', 're', 'mi'],
                caption: 'Legacy intro caption',
              },
              colorsSlide: {
                title: 'Legacy colors slide',
                lead: 'Legacy colors lead',
                noteChips: ['red', 'blue'],
                previewTitle: 'Legacy preview title',
                previewDescription: 'Legacy preview description',
                caption: 'Legacy colors caption',
              },
            },
            melodySection: {
              emoji: '🎶',
              title: 'Legacy melody',
              description: 'Legacy melody description',
              directionSlide: {
                title: 'Legacy direction slide',
                lead: 'Legacy direction lead',
                ascendingTitle: 'Up',
                ascendingSequence: 'do re mi',
                ascendingCaption: 'Legacy ascending caption',
                descendingTitle: 'Down',
                descendingSequence: 'mi re do',
                descendingCaption: 'Legacy descending caption',
              },
              listenSlide: {
                title: 'Legacy listen slide',
                lead: 'Legacy listen lead',
                planTitle: 'Legacy plan',
                planSteps: ['Listen', 'Watch', 'Repeat'],
                caption: 'Legacy listen caption',
              },
            },
            gameRepeatSection: {
              emoji: '🎹',
              title: 'Legacy repeat',
              description: 'Legacy repeat description',
              gameStageTitle: 'Legacy repeat game',
              gameStageDescription: 'Legacy repeat game description',
            },
            gameFreeplaySection: {
              emoji: '🎛️',
              title: 'Legacy freeplay',
              description: 'Legacy freeplay description',
              gameStageTitle: 'Legacy freeplay game',
              gameStageDescription: 'Legacy freeplay game description',
            },
            summarySection: {
              emoji: '⭐',
              title: 'Legacy summary',
              description: 'Legacy summary description',
              summarySlide: {
                title: 'Legacy summary slide',
                lead: 'Legacy summary lead',
                facts: [
                  {
                    title: 'Legacy fact',
                    caption: 'Legacy fact caption',
                  },
                ],
              },
            },
          },
        }}
      />,
    );

    const props = kangurUnifiedLessonMock.mock.calls.at(-1)?.[0] as {
      games: Array<{ shell: { title: string; description: string } }>;
    };

    expect(props.games[0]?.shell).toEqual(
      expect.objectContaining({
        title: 'Legacy repeat game',
        description: 'Legacy repeat game description',
      }),
    );
    expect(props.games[1]?.shell).toEqual(
      expect.objectContaining({
        title: 'Legacy freeplay game',
        description: 'Legacy freeplay game description',
      }),
    );
  });
});
