/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import GeometryShapesLesson from './GeometryShapesLesson';

describe('GeometryShapesLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometryShapesLesson
          lessonTemplate={{
            componentId: 'geometry_shapes',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Geometry',
            title: 'Geometry shapes from Mongo',
            description: 'DB description',
            emoji: '🔷',
            color: 'kangur-gradient-accent-violet-reverse',
            activeBg: 'bg-fuchsia-500',
            sortOrder: 100,
            componentContent: {
              kind: 'geometry_shapes',
              lessonTitle: 'Database geometry shapes',
              shapeCards: {
                circle: {
                  name: 'Database circle',
                  details: 'Database circle details',
                },
                triangle: {
                  name: 'Database triangle',
                  details: 'Database triangle details',
                },
                square: {
                  name: 'Database square',
                  details: 'Database square details',
                },
                rectangle: {
                  name: 'Database rectangle',
                  details: 'Database rectangle details',
                },
                pentagon: {
                  name: 'Database pentagon',
                  details: 'Database pentagon details',
                },
                hexagon: {
                  name: 'Database hexagon',
                  details: 'Database hexagon details',
                },
              },
              sections: {
                podstawowe: {
                  title: 'Database shapes',
                  description: 'Database shapes description',
                },
                ileBokow: {
                  title: 'Database count',
                  description: 'Database count description',
                },
                podsumowanie: {
                  title: 'Database summary',
                  description: 'Database summary description',
                },
                game: {
                  title: 'Database game',
                  description: 'Database game description',
                },
              },
              slides: {
                podstawowe: {
                  intro: {
                    title: 'Database intro slide',
                    orbitCaption: 'Database orbit caption',
                  },
                  outline: {
                    title: 'Database outline slide',
                    caption: 'Database outline caption',
                  },
                  build: {
                    title: 'Database build slide',
                    caption: 'Database build caption',
                  },
                },
                ileBokow: {
                  count: {
                    title: 'Database count slide',
                  },
                  countSides: {
                    title: 'Database sides slide',
                    caption: 'Database sides caption',
                  },
                  corners: {
                    title: 'Database corners slide',
                    caption: 'Database corners caption',
                  },
                  segmentSide: {
                    title: 'Database segment slide',
                    caption: 'Database segment caption',
                  },
                  drawSide: {
                    title: 'Database draw slide',
                    caption: 'Database draw caption',
                  },
                },
                podsumowanie: {
                  rotate: {
                    title: 'Database rotate slide',
                    caption: 'Database rotate caption',
                  },
                  sides: {
                    title: 'Database summary sides',
                    caption: 'Database summary sides caption',
                  },
                  interior: {
                    title: 'Database interior slide',
                    caption: 'Database interior caption',
                  },
                  build: {
                    title: 'Database summary build',
                    caption: 'Database summary build caption',
                  },
                },
              },
              game: {
                stageTitle: 'Database game title',
              },
            },
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as {
      lessonTitle: string;
      sections: Array<{ id: string; title: string; description: string }>;
      slides: Record<string, Array<{ title: string }>>;
      games: Array<{ shell: { title: string } }>;
    };

    expect(props.lessonTitle).toBe('Geometry shapes from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'podstawowe',
          title: 'Database shapes',
          description: 'Database shapes description',
        }),
        expect.objectContaining({
          id: 'game',
          title: 'Database game',
          description: 'Database game description',
        }),
      ]),
    );
    expect(props.slides.podstawowe).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database intro slide' }),
        expect.objectContaining({ title: 'Database outline slide' }),
      ]),
    );
    expect(props.slides.ile_bokow).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database count slide' }),
        expect.objectContaining({ title: 'Database sides slide' }),
      ]),
    );
    expect(props.games[0]?.shell.title).toBe('Database game title');
  });
});
