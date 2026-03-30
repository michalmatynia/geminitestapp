/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { ADDING_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/adding-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import AddingLesson from './AddingLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string }>>;
  games: Array<{ shell: { title: string } }>;
};

describe('AddingLesson', () => {
  it('prefers localized template component content over the static fallback', () => {
    const componentContent = structuredClone(ADDING_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database adding lesson';
    componentContent.sections.podstawy.title = 'Database adding basics';
    componentContent.sections.podstawy.description = 'Database adding basics description';
    componentContent.slides.podstawy.meaning.title = 'Database adding meaning';
    componentContent.game.gameTitle = 'Database adding game';
    componentContent.synthesis.gameTitle = 'Database adding synthesis';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <AddingLesson
          lessonTemplate={{
            componentId: 'adding',
            subject: 'maths',
            ageGroup: 'six_year_old',
            label: 'Adding',
            title: 'Adding from Mongo',
            description: 'DB description',
            emoji: '➕',
            color: 'kangur-gradient-accent-amber',
            activeBg: 'bg-orange-500',
            sortOrder: 80,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Adding from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'podstawy',
          title: 'Database adding basics',
          description: 'Database adding basics description',
        }),
      ]),
    );
    expect(props.slides.podstawy).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Database adding meaning' })]),
    );
    expect(props.games[0]?.shell.title).toBe('Database adding game');
    expect(props.games[1]?.shell.title).toBe('Database adding synthesis');
  });
});
