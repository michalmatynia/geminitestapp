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

import LogicalClassificationLesson from '@/features/kangur/ui/components/LogicalClassificationLesson';
import deMessages from '@/i18n/messages/de.json';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('LogicalClassificationLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the logical classification lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <LogicalClassificationLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Klassifikation');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Klassifikation - Einstieg',
      description: 'Was ist Klassifikation? Gruppieren nach Merkmalen',
    });
    expect(sections.find((section) => section.id === 'diagram')).toMatchObject({
      title: 'Mehrere Merkmale und das Venn-Diagramm',
      description: 'Gruppieren nach mehreren Kriterien und Schnittmengen',
    });
    expect(games.find((game) => game.sectionId === 'game')?.stage).toMatchObject({
      title: 'Klassifikationslabor',
    });
    expect(games.find((game) => game.sectionId === 'game')?.runtime).toMatchObject({
      runtimeId: 'logical_classification_lab_lesson_stage',
      rendererId: 'logical_classification_game',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Was ist Klassifikation?');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(screen.getByText('Wir klassifizieren nach:')).toBeInTheDocument();
    expect(screen.getByText('🎨 Farbe - rot vs. blau')).toBeInTheDocument();
  });
});
