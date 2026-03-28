/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { LOGICAL_REASONING_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/logical-reasoning-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

vi.mock('@/features/kangur/ui/components/LogicalReasoningIfThenGame', () => ({
  __esModule: true,
  default: ({
    cases,
    copy,
  }: {
    cases: Array<{ conclusion: string }>;
    copy: { header: { title: string }; actions: { check: string } };
  }) => (
    <div data-testid='logical-reasoning-if-then-game'>
      <span>{copy.header.title}</span>
      <span>{copy.actions.check}</span>
      <span>{cases[0]?.conclusion ?? ''}</span>
    </div>
  ),
}));

import LogicalReasoningLesson from './LogicalReasoningLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string; content: React.ReactNode }>>;
};

describe('LogicalReasoningLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    const componentContent = structuredClone(LOGICAL_REASONING_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database reasoning lesson';
    componentContent.sections.wnioskowanie.title = 'Database reasoning section';
    componentContent.sections.wnioskowanie.description = 'Database reasoning description';
    componentContent.sections.gra.title = 'Database game section';
    componentContent.sections.gra.description = 'Database game description';
    componentContent.slides.wnioskowanie.basics.title = 'Database basics slide';
    componentContent.slides.gra.interactive.title = 'Database interactive slide';
    componentContent.slides.gra.interactive.lead = 'Database interactive lead';
    componentContent.game.ui.header.title = 'Database if then game';
    componentContent.game.ui.actions.check = 'Database check';
    componentContent.game.cases[0]!.conclusion = 'Database conclusion';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <LogicalReasoningLesson
          lessonTemplate={{
            componentId: 'logical_reasoning',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Reasoning',
            title: 'Logical reasoning from Mongo',
            description: 'DB description',
            emoji: '💡',
            color: 'kangur-gradient-accent-indigo',
            activeBg: 'bg-indigo-500',
            sortOrder: 100,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Logical reasoning from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'wnioskowanie',
          title: 'Database reasoning section',
          description: 'Database reasoning description',
        }),
        expect.objectContaining({
          id: 'gra',
          title: 'Database game section',
          description: 'Database game description',
        }),
      ]),
    );
    expect(props.slides.wnioskowanie).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database basics slide' })]),
    );
    expect(props.slides.gra).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database interactive slide' })]),
    );

    render(<>{props.slides.gra?.[0]?.content}</>);

    expect(screen.getByText('Database interactive lead')).toBeInTheDocument();
    expect(screen.getByText('Database if then game')).toBeInTheDocument();
    expect(screen.getByText('Database check')).toBeInTheDocument();
    expect(screen.getByText('Database conclusion')).toBeInTheDocument();
  });
});
