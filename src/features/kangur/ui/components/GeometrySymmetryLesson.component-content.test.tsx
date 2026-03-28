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

import GeometrySymmetryLesson from './GeometrySymmetryLesson';

describe('GeometrySymmetryLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometrySymmetryLesson
          lessonTemplate={{
            componentId: 'geometry_symmetry',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Geometry',
            title: 'Geometry symmetry from Mongo',
            description: 'DB description',
            emoji: '🪞',
            color: 'kangur-gradient-accent-emerald',
            activeBg: 'bg-emerald-500',
            sortOrder: 100,
            componentContent: {
              kind: 'geometry_symmetry',
              lessonTitle: 'Database geometry symmetry',
              sections: {
                intro: {
                  title: 'Database intro section',
                  description: 'Database intro description',
                },
                os: {
                  title: 'Database axis section',
                  description: 'Database axis description',
                },
                figury: {
                  title: 'Database figures section',
                  description: 'Database figures description',
                },
                podsumowanie: {
                  title: 'Database summary section',
                  description: 'Database summary description',
                },
                game: {
                  title: 'Database game section',
                  description: 'Database game description',
                },
              },
              slides: {
                intro: {
                  whatIsSymmetry: {
                    title: 'Database symmetry slide',
                    lead: 'Database symmetry lead',
                    callout: 'Database symmetry callout',
                    note: 'Database symmetry note',
                  },
                  mirrorSymmetry: {
                    title: 'Database mirror slide',
                    lead: 'Database mirror lead',
                    caption: 'Database mirror caption',
                  },
                },
                os: {
                  axisOfSymmetry: {
                    title: 'Database axis slide',
                    lead: 'Database axis lead',
                    caption: 'Database axis caption',
                    note: 'Database axis note',
                  },
                  axisInPractice: {
                    title: 'Database axis practice slide',
                    lead: 'Database axis practice lead',
                    caption: 'Database axis practice caption',
                  },
                },
                figury: {
                  symmetricShapes: {
                    title: 'Database shapes slide',
                    circleNote: 'Database circle note',
                    cards: {
                      square: 'Database square',
                      rectangle: 'Database rectangle',
                      circle: 'Database circle',
                      isoscelesTriangle: 'Database isosceles triangle',
                      zigzag: 'Database zigzag',
                      irregularPolygon: 'Database irregular polygon',
                    },
                  },
                  symmetricOrNot: {
                    title: 'Database symmetric or not',
                    caption: 'Database symmetric caption',
                  },
                  rotational: {
                    title: 'Database rotational',
                    caption: 'Database rotational caption',
                  },
                },
                podsumowanie: {
                  overview: {
                    title: 'Database overview',
                    items: {
                      item1: 'Database item 1',
                      item2: 'Database item 2',
                      item3: 'Database item 3',
                      item4: 'Database item 4',
                    },
                  },
                  axis: {
                    title: 'Database summary axis',
                    caption: 'Database summary axis caption',
                  },
                  manyAxes: {
                    title: 'Database summary many axes',
                    caption: 'Database summary many axes caption',
                  },
                  mirror: {
                    title: 'Database summary mirror',
                    caption: 'Database summary mirror caption',
                  },
                  rotation: {
                    title: 'Database summary rotation',
                    caption: 'Database summary rotation caption',
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

    expect(props.lessonTitle).toBe('Geometry symmetry from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database intro section',
          description: 'Database intro description',
        }),
        expect.objectContaining({
          id: 'game',
          title: 'Database game section',
          description: 'Database game description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database symmetry slide' }),
        expect.objectContaining({ title: 'Database mirror slide' }),
      ]),
    );
    expect(props.slides.os).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database axis slide' }),
        expect.objectContaining({ title: 'Database axis practice slide' }),
      ]),
    );
    expect(props.games[0]?.shell.title).toBe('Database game title');
  });
});
