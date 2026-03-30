/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }),
}));

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import deMessages from '@/i18n/messages/de.json';
import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('CalendarLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the calendar lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <CalendarLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Kalender lernen');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games = (capturedProps?.games as Array<{ sectionId: string; shell: Record<string, unknown> }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Was ist ein Kalender?',
      description: 'Jahr, Monate und Tage',
    });
    expect(sections.find((section) => section.id === 'miesiace')).toMatchObject({
      title: 'Monate und Jahreszeiten',
      description: '12 Monate und vier Jahreszeiten',
    });
    expect(
      sections.find((section) => section.id === 'game_dates')
    ).toMatchObject({
      title: 'Übung: Daten finden',
      description: 'Finde das richtige Datum im Kalender',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'game_months')?.shell).toMatchObject({
      title: 'Übung: Monate',
      description: 'Monate, Reihenfolge und Jahreszeiten',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.data?.[0]?.title).toBe('Wie liest man ein Datum?');
    render(<>{slides.data?.[0]?.content}</>);

    expect(screen.getByText('Wie schreibt man das Datum?')).toBeInTheDocument();
    expect(screen.getByText('Tag / Monat / Jahr')).toBeInTheDocument();
    expect(screen.getByText('15. März 2025')).toBeInTheDocument();
  });
});
