/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { DIVISION_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/division-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import DivisionLesson from './DivisionLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string }>>;
  games: Array<{ shell: { title: string } }>;
};

describe('DivisionLesson', () => {
  it('prefers localized template component content over the static fallback', () => {
    const componentContent = structuredClone(DIVISION_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database division lesson';
    componentContent.sections.intro.title = 'Database intro section';
    componentContent.sections.intro.description = 'Database intro description';
    componentContent.slides.intro.meaning.title = 'Database division meaning';
    componentContent.game.stageTitle = 'Database division game';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <DivisionLesson
          lessonTemplate={{
            componentId: 'division',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Division',
            title: 'Division from Mongo',
            description: 'DB description',
            emoji: '➗',
            color: 'kangur-gradient-accent-teal',
            activeBg: 'bg-blue-500',
            sortOrder: 100,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Division from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database intro section',
          description: 'Database intro description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database division meaning' })]),
    );
    expect(props.games[0]?.shell.title).toBe('Database division game');
  });
});
