/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { LOGICAL_THINKING_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/logical-thinking-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import LogicalThinkingLesson from './LogicalThinkingLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string; content: React.ReactNode }>>;
};

describe('LogicalThinkingLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    const componentContent = structuredClone(LOGICAL_THINKING_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database logical thinking lesson';
    componentContent.sections.wprowadzenie.title = 'Database intro section';
    componentContent.sections.wprowadzenie.description = 'Database intro description';
    componentContent.slides.wprowadzenie.basics.title = 'Database intro slide';
    componentContent.games.ifThen.ui.header.stepTemplate = 'Mongo krok {current} / {total}';
    componentContent.games.lab.ui.header.stageTemplate = 'Mongo etap {current} / {total}';
    componentContent.animations.intro = 'Database intro animation';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <LogicalThinkingLesson
          lessonTemplate={{
            componentId: 'logical_thinking',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Logical thinking',
            title: 'Logical thinking from Mongo',
            description: 'DB description',
            emoji: '🧠',
            color: 'kangur-gradient-accent-indigo',
            activeBg: 'bg-violet-500',
            sortOrder: 100,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Logical thinking from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'wprowadzenie',
          title: 'Database intro section',
          description: 'Database intro description',
        }),
      ]),
    );
    expect(props.slides.wprowadzenie).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database intro slide' })]),
    );

    render(<>{props.slides.wprowadzenie?.[0]?.content}</>);
    expect(screen.getByRole('img', { name: 'Database intro animation' })).toBeInTheDocument();

    render(<>{props.slides.wnioskowanie_gra?.[0]?.content}</>);
    expect(screen.getByText('Mongo krok 1 / 3')).toBeInTheDocument();

    render(<>{props.slides.laboratorium_gra?.[0]?.content}</>);
    expect(screen.getByText('Mongo etap 1 / 3')).toBeInTheDocument();
  });
});
