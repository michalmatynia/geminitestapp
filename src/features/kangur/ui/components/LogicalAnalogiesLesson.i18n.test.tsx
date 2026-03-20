/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import LogicalAnalogiesLesson from '@/features/kangur/ui/components/LogicalAnalogiesLesson';
import deMessages from '@/i18n/messages/de.json';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('LogicalAnalogiesLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the logical analogies lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <LogicalAnalogiesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Analogien');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{ sectionId: string; stage: Record<string, unknown> }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Analogie - Einstieg und Woerter',
      description: 'Was ist eine Analogie? Beziehungen zwischen Woertern',
    });
    expect(sections.find((section) => section.id === 'relacje')).toMatchObject({
      title: 'Teil-Ganzes und Ursache-Wirkung',
      description: 'Zwei wichtige Typen relationaler Analogien',
    });
    expect(games.find((game) => game.sectionId === 'game_relacje')?.stage).toMatchObject({
      title: 'Beziehungsbruecke',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Was ist eine Analogie?');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(screen.getByText('Schreibweise der Analogie:')).toBeInTheDocument();
    expect(screen.getByText('Vogel : fliegen = Fisch : ❓')).toBeInTheDocument();
  });
});
