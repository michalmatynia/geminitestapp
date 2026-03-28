/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/logical-patterns-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import LogicalPatternsLesson from './LogicalPatternsLesson';

describe('LogicalPatternsLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    const componentContent = structuredClone(LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database patterns lesson';
    componentContent.sections.intro.title = 'Database intro section';
    componentContent.sections.intro.description = 'Database intro description';
    componentContent.sections.game_warsztat.title = 'Database workshop section';
    componentContent.sections.game_warsztat.description = 'Database workshop description';
    componentContent.slides.intro.whatIsPattern.title = 'Database pattern slide';
    componentContent.slides.intro.colorsAndShapes.title = 'Database colors slide';
    componentContent.slides.ciagi_arytm.addition.title = 'Database addition slide';
    componentContent.game.stageTitle = 'Database workshop game';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <LogicalPatternsLesson
          lessonTemplate={{
            componentId: 'logical_patterns',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Patterns',
            title: 'Logical patterns from Mongo',
            description: 'DB description',
            emoji: '🔢',
            color: 'kangur-gradient-accent-violet',
            activeBg: 'bg-violet-500',
            sortOrder: 100,
            componentContent,
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

    expect(props.lessonTitle).toBe('Logical patterns from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database intro section',
          description: 'Database intro description',
        }),
        expect.objectContaining({
          id: 'game_warsztat',
          title: 'Database workshop section',
          description: 'Database workshop description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database pattern slide' }),
        expect.objectContaining({ title: 'Database colors slide' }),
      ]),
    );
    expect(props.slides.ciagi_arytm).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database addition slide' })]),
    );
    expect(props.games[0]?.shell.title).toBe('Database workshop game');
  });
});
