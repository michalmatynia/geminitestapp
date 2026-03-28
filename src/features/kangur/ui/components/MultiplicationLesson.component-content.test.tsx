/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MULTIPLICATION_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/multiplication-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import MultiplicationLesson from './MultiplicationLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string }>>;
  games: Array<{ shell: { title: string } }>;
};

describe('MultiplicationLesson', () => {
  it('prefers localized template component content over the static fallback', () => {
    const componentContent = structuredClone(MULTIPLICATION_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database multiplication lesson';
    componentContent.sections.intro.title = 'Database multiplication intro';
    componentContent.sections.intro.description = 'Database multiplication description';
    componentContent.slides.intro.meaning.title = 'Database multiplication meaning';
    componentContent.game.gameTitle = 'Database multiplication game';

    render(
      <MultiplicationLesson
        lessonTemplate={{
          componentId: 'multiplication',
          subject: 'maths',
          ageGroup: 'seven_year_old',
          label: 'Multiplication',
          title: 'Multiplication from Mongo',
          description: 'DB description',
          emoji: '✖️',
          color: 'kangur-gradient-accent-indigo',
          activeBg: 'bg-violet-500',
          sortOrder: 90,
          componentContent,
        }}
      />,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Multiplication from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database multiplication intro',
          description: 'Database multiplication description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database multiplication meaning' }),
      ]),
    );
    expect(props.games[0]?.shell.title).toBe('Database multiplication game');
  });
});
