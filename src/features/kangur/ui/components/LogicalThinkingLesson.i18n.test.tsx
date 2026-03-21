/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
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

import LogicalThinkingLesson from '@/features/kangur/ui/components/LogicalThinkingLesson';
import deMessages from '@/i18n/messages/de.json';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('LogicalThinkingLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the logical thinking lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <LogicalThinkingLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Logisches Denken');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(sections.find((section) => section.id === 'wprowadzenie')).toMatchObject({
      title: 'Einführung',
      description: 'Was ist logisches Denken?',
    });
    expect(sections.find((section) => section.id === 'laboratorium_gra')).toMatchObject({
      title: 'Spiel: Logiklabor 🧪',
      description: 'Muster, Klassifikation und Analogie',
    });

    expect(slides.wprowadzenie?.[0]?.title).toBe('Was ist logisches Denken? 🧠');
    render(<>{slides.wprowadzenie?.[0]?.content}</>);

    expect(screen.getByText('Logisches Denken hilft dir:')).toBeInTheDocument();
    expect(screen.getByText('🔍 Muster und Reihen zu finden')).toBeInTheDocument();

    render(<>{slides.wnioskowanie_gra?.[0]?.content}</>);

    expect(
      screen.getByText('Ordne Tatsache, Regel und Schlussfolgerung in die richtige Reihenfolge.')
    ).toBeInTheDocument();
    expect(screen.getByText('Schritt 1 / 3')).toBeInTheDocument();
    expect(screen.getByText('Tatsache')).toBeInTheDocument();

    render(<>{slides.laboratorium_gra?.[0]?.content}</>);

    expect(
      screen.getByText('Erledige drei Missionen: Muster, Klassifikation und Analogie. Ziehe und klicke!')
    ).toBeInTheDocument();
    expect(screen.getByText('Etappe 1 / 3')).toBeInTheDocument();
    expect(
      screen.getByText('Ergänze das Muster: finde die nächsten zwei Formen.')
    ).toBeInTheDocument();
  });
});
