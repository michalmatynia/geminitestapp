/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
import { LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT } from '@/features/kangur/ui/components/logical-analogies-lesson-content';

const kangurUnifiedLessonMock = vi.fn();

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    kangurUnifiedLessonMock(props);
    return <div data-testid='kangur-unified-lesson' />;
  },
}));

import LogicalAnalogiesLesson from './LogicalAnalogiesLesson';

type CapturedLessonProps = {
  lessonTitle: string;
  sections: Array<{ id: string; title: string; description: string }>;
  slides: Record<string, Array<{ title: string; content: React.ReactNode }>>;
  games: Array<{ shell: { title: string } }>;
};

describe('LogicalAnalogiesLesson', () => {
  it('prefers localized template component content over the static translation fallback', () => {
    const componentContent = structuredClone(LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT);
    componentContent.lessonTitle = 'Database analogies lesson';
    componentContent.sections.intro.title = 'Database intro section';
    componentContent.sections.intro.description = 'Database intro description';
    componentContent.sections.game_relacje.title = 'Database relations bridge';
    componentContent.sections.game_relacje.description = 'Database relations description';
    componentContent.slides.intro.introQuestion.title = 'Database analogy question';
    componentContent.slides.intro.relationBridge.title = 'Database relation bridge';
    componentContent.slides.podsumowanie.map.caption = 'Database map caption';
    componentContent.game.stageTitle = 'Database relations game';
    componentContent.animations.analogyBridge = 'Database bridge animation';

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <LogicalAnalogiesLesson
          lessonTemplate={{
            componentId: 'logical_analogies',
            subject: 'maths',
            ageGroup: 'seven_year_old',
            label: 'Analogies',
            title: 'Logical analogies from Mongo',
            description: 'DB description',
            emoji: '🔗',
            color: 'kangur-gradient-accent-rose-reverse',
            activeBg: 'bg-pink-500',
            sortOrder: 100,
            componentContent,
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(kangurUnifiedLessonMock).toHaveBeenCalledTimes(1);

    const props = kangurUnifiedLessonMock.mock.calls[0]?.[0] as CapturedLessonProps;

    expect(props.lessonTitle).toBe('Logical analogies from Mongo');
    expect(props.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'intro',
          title: 'Database intro section',
          description: 'Database intro description',
        }),
        expect.objectContaining({
          id: 'game_relacje',
          title: 'Database relations bridge',
          description: 'Database relations description',
        }),
      ]),
    );
    expect(props.slides.intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Database analogy question' }),
        expect.objectContaining({ title: 'Database relation bridge' }),
      ]),
    );
    expect(props.games[0]?.shell.title).toBe('Database relations game');

    render(<>{props.slides.intro?.[1]?.content}</>);

    expect(screen.getByRole('img', { name: 'Database bridge animation' })).toBeInTheDocument();
  });
});
