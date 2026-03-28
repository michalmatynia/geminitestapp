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

import LogicalClassificationLesson from './LogicalClassificationLesson';

describe('LogicalClassificationLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <LogicalClassificationLesson
          lessonTemplate={{
            componentId: 'logical_classification',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Logical',
            title: 'Logical classification from Mongo',
            description: 'DB description',
            emoji: '📦',
            color: 'kangur-gradient-accent-teal',
            activeBg: 'bg-teal-500',
            sortOrder: 100,
            componentContent: {
              kind: 'logical_classification',
              lessonTitle: 'Database logical classification',
              sections: {
                intro: {
                  title: 'Database intro section',
                  description: 'Database intro description',
                },
                diagram: {
                  title: 'Database diagram section',
                  description: 'Database diagram description',
                },
                intruz: {
                  title: 'Database odd one out section',
                  description: 'Database odd one out description',
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
                  basics: {
                    title: 'Database basics slide',
                    lead: 'Database basics lead',
                    caption: 'Database basics caption',
                    criteriaLabel: 'Database criteria label',
                    criteria: {
                      color: 'Database color criterion',
                      shape: 'Database shape criterion',
                      size: 'Database size criterion',
                      category: 'Database category criterion',
                      number: 'Database number criterion',
                    },
                  },
                  grouping: {
                    title: 'Database grouping slide',
                    lead: 'Database grouping lead',
                    caption: 'Database grouping caption',
                    cards: {
                      flyingAnimals: {
                        title: 'Database flying',
                        items: 'A B C',
                        note: 'Database flying note',
                      },
                      waterAnimals: {
                        title: 'Database water',
                        items: 'D E F',
                        note: 'Database water note',
                      },
                      evenNumbers: {
                        title: 'Database even',
                        items: '2 4 6',
                        note: 'Database even note',
                      },
                      oddNumbers: {
                        title: 'Database odd',
                        items: '1 3 5',
                        note: 'Database odd note',
                      },
                    },
                  },
                  shapeSorting: {
                    title: 'Database shape sorting',
                    lead: 'Database shape sorting lead',
                    caption: 'Database shape sorting caption',
                    cards: {
                      circles: {
                        title: 'Database circles',
                        items: '⚪',
                        note: 'Database circles note',
                      },
                      squares: {
                        title: 'Database squares',
                        items: '⬜',
                        note: 'Database squares note',
                      },
                    },
                  },
                  categories: {
                    title: 'Database categories',
                    lead: 'Database categories lead',
                    caption: 'Database categories caption',
                    examplesLabel: 'Database examples label',
                    examples: {
                      fruit: 'Database fruit',
                      vegetables: 'Database vegetables',
                      toys: 'Database toys',
                    },
                  },
                },
                diagram: {
                  multiCriteria: {
                    title: 'Database multi criteria',
                    lead: 'Database multi criteria lead',
                    gridCaption: 'Database grid caption',
                    axesCaption: 'Database axes caption',
                    exampleLabel: 'Database example label',
                    items: {
                      bigRed: { label: 'Database big red', icons: 'RR' },
                      bigBlue: { label: 'Database big blue', icons: 'BB' },
                      smallRed: { label: 'Database small red', icons: 'r' },
                      smallBlue: { label: 'Database small blue', icons: 'b' },
                    },
                    summary: 'Database multi summary',
                  },
                  venn: {
                    title: 'Database venn',
                    lead: 'Database venn lead',
                    overlapCaption: 'Database overlap caption',
                    unionCaption: 'Database union caption',
                    exampleLabel: 'Database venn example',
                    zones: {
                      onlySport: { label: 'Database sport', icons: 'S' },
                      both: { label: 'Database both', icons: 'B' },
                      onlyMusic: { label: 'Database music', icons: 'M' },
                    },
                  },
                  switchCriteria: {
                    title: 'Database switch criteria',
                    lead: 'Database switch lead',
                    caption: 'Database switch caption',
                    pickLabel: 'Database pick label',
                    tips: {
                      first: 'Database first tip',
                      second: 'Database second tip',
                    },
                  },
                },
                intruz: {
                  level1: {
                    title: 'Database level 1',
                    lead: 'Database level 1 lead',
                    caption: 'Database level 1 caption',
                    examples: {
                      fruits: {
                        items: 'fruit items',
                        answer: 'fruit answer',
                      },
                      numbers: {
                        items: 'number items',
                        answer: 'number answer',
                      },
                      animals: {
                        items: 'animal items',
                        answer: 'animal answer',
                      },
                    },
                  },
                  level2: {
                    title: 'Database level 2',
                    lead: 'Database level 2 lead',
                    caption: 'Database level 2 caption',
                    examples: {
                      multiples: {
                        items: 'multiple items',
                        answer: 'multiple answer',
                      },
                      space: {
                        items: 'space items',
                        answer: 'space answer',
                      },
                      shapes: {
                        items: 'shape items',
                        answer: 'shape answer',
                      },
                    },
                  },
                  level3: {
                    title: 'Database level 3',
                    lead: 'Database level 3 lead',
                    caption: 'Database level 3 caption',
                    examples: {
                      shape: {
                        items: 'shape example',
                        answer: 'shape answer 3',
                      },
                      color: {
                        items: 'color example',
                        answer: 'color answer 3',
                      },
                    },
                  },
                },
                podsumowanie: {
                  overview: {
                    title: 'Database overview',
                    caption: 'Database overview caption',
                    items: {
                      classification: 'Database classification item',
                      manyCriteria: 'Database many criteria item',
                      venn: 'Database venn item',
                      oddOneOut1: 'Database odd one out 1',
                      oddOneOut2: 'Database odd one out 2',
                      oddOneOut3: 'Database odd one out 3',
                    },
                    closing: 'Database overview closing',
                  },
                  color: {
                    title: 'Database color summary',
                    caption: 'Database color caption',
                  },
                  shape: {
                    title: 'Database shape summary',
                    caption: 'Database shape caption',
                  },
                  parity: {
                    title: 'Database parity summary',
                    caption: 'Database parity caption',
                  },
                  twoCriteria: {
                    title: 'Database two criteria summary',
                    caption: 'Database two criteria caption',
                  },
                  intersection: {
                    title: 'Database intersection summary',
                    caption: 'Database intersection caption',
                  },
                  oddOneOut: {
                    title: 'Database odd one out summary',
                    caption: 'Database odd one out caption',
                  },
                },
              },
              game: {
                stageTitle: 'Database game stage',
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
      games: Array<{ stage: { title: string } }>;
    };

    expect(props.lessonTitle).toBe('Logical classification from Mongo');
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
        expect.objectContaining({ title: 'Database basics slide' }),
        expect.objectContaining({ title: 'Database grouping slide' }),
      ]),
    );
    expect(props.slides.diagram).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database multi criteria' }),
        expect.objectContaining({ title: 'Database venn' }),
      ]),
    );
    expect(props.games[0]?.stage.title).toBe('Database game stage');
  });
});
