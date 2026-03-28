/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const { kangurUnifiedLessonMock } = vi.hoisted(() => ({
  kangurUnifiedLessonMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import GeometryBasicsLesson from '@/features/kangur/ui/components/GeometryBasicsLesson';

describe('GeometryBasicsLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometryBasicsLesson
          lessonTemplate={{
            componentId: 'geometry_basics',
            subject: 'geometry',
            ageGroup: 'six_year_old',
            label: 'Geometry',
            title: 'Geometry from Mongo',
            description: 'DB description',
            emoji: '📐',
            color: 'kangur-gradient-accent-sky',
            activeBg: 'bg-cyan-500',
            sortOrder: 100,
            componentContent: {
              kind: 'geometry_basics',
              lessonTitle: 'Database geometry basics',
              terms: {
                point: 'Database point',
                segment: 'Database segment',
              },
              sections: {
                punkt: {
                  title: 'Database point section',
                  description: 'Database point description',
                },
                bok: {
                  title: 'Database side section',
                  description: 'Database side description',
                },
                kat: {
                  title: 'Database angle section',
                  description: 'Database angle description',
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
                punkt: {
                  segment: {
                    title: 'Database segment slide',
                    pointLead: 'Database point lead',
                    segmentLead: 'Database segment lead',
                    segmentLabel: 'Database segment label',
                    caption: 'Database segment caption',
                  },
                  pointOnSegment: {
                    title: 'Database point-on-segment slide',
                    lead: 'Database point-on-segment lead',
                    caption: 'Database point-on-segment caption',
                  },
                },
                bok: {
                  sideAndVertex: {
                    title: 'Database side-and-vertex slide',
                    lead: 'Database side-and-vertex lead',
                    caption: 'Database side-and-vertex caption',
                    note: 'Database side-and-vertex note',
                  },
                  countSides: {
                    title: 'Database count-sides slide',
                    lead: 'Database count-sides lead',
                    caption: 'Database count-sides caption',
                  },
                },
                kat: {
                  whatIsAngle: {
                    title: 'Database angle slide',
                    lead: 'Database angle lead',
                    rightAngleCaption: 'Database right angle',
                    chips: {
                      acute: 'Database acute',
                      right: 'Database right',
                      obtuse: 'Database obtuse',
                    },
                  },
                  angleTypes: {
                    title: 'Database angle types slide',
                    lead: 'Database angle types lead',
                    caption: 'Database angle types caption',
                  },
                },
                podsumowanie: {
                  overview: {
                    title: 'Database overview',
                    items: {
                      point: { term: 'Database point term', definition: 'Database point definition' },
                      segment: {
                        term: 'Database segment term',
                        definition: 'Database segment definition',
                      },
                      sideAndVertex: {
                        term: 'Database side term',
                        definition: 'Database side definition',
                      },
                      angle: {
                        term: 'Database angle term',
                        definition: 'Database angle definition',
                      },
                    },
                  },
                  pointAndSegment: {
                    title: 'Database point+segment title',
                    caption: 'Database point+segment caption',
                  },
                  pointOnSegment: {
                    title: 'Database point-on-segment title',
                    caption: 'Database point-on-segment summary caption',
                  },
                  sidesAndVertices: {
                    title: 'Database sides+vertices title',
                    caption: 'Database sides+vertices caption',
                  },
                  countSides: {
                    title: 'Database count-sides title',
                    caption: 'Database count-sides summary caption',
                  },
                  angleTypes: {
                    title: 'Database angle-types title',
                    caption: 'Database angle-types summary caption',
                  },
                  angleKinds: {
                    title: 'Database angle-kinds title',
                    caption: 'Database angle-kinds summary caption',
                  },
                },
              },
              game: {
                stageTitle: 'Database geo mission',
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

    expect(props.lessonTitle).toBe('Geometry from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'punkt',
          title: 'Database point section',
          description: 'Database point description',
        }),
        expect.objectContaining({
          id: 'game',
          title: 'Database game section',
          description: 'Database game description',
        }),
      ]),
    );
    expect(props.slides.punkt).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database segment slide' })]),
    );
    expect(props.games[0]?.shell.title).toBe('Database geo mission');
  });
});
