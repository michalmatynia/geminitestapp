/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { SUBTRACTING_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/subtracting-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import SubtractingLesson from './SubtractingLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string }>>;
  games: Array<{ shell: { title: string } }>;
};

describe('SubtractingLesson', () => {
  it('prefers localized template component content over the translated fallback', () => {
    const componentContent = structuredClone(SUBTRACTING_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database subtracting lesson';
    componentContent.sections.podstawy.title = 'Database subtracting basics';
    componentContent.sections.podstawy.description = 'Database subtracting basics description';
    componentContent.slides.basics.meaning.title = 'Database subtracting meaning';
    componentContent.game.gameTitle = 'Database subtracting game';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <SubtractingLesson
          lessonTemplate={{
            componentId: 'subtracting',
            subject: 'maths',
            ageGroup: 'six_year_old',
            label: 'Subtracting',
            title: 'Subtracting from Mongo',
            description: 'DB description',
            emoji: '➖',
            color: 'kangur-gradient-accent-rose',
            activeBg: 'bg-rose-500',
            sortOrder: 81,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Subtracting from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'podstawy',
          title: 'Database subtracting basics',
          description: 'Database subtracting basics description',
        }),
      ]),
    );
    expect(props.slides.podstawy).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database subtracting meaning' })]),
    );
    expect(props.games[0]?.shell.title).toBe('Database subtracting game');
  });
});
