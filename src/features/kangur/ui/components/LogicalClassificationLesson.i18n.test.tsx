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
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';

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
        shell: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Klassifikation - Einstieg',
      description: 'Was ist Klassifikation? Gruppieren nach Merkmalen',
    });
    expect(sections.find((section) => section.id === 'diagram')).toMatchObject({
      title: 'Mehrere Merkmale und das Venn-Diagramm',
      description: 'Gruppieren nach mehreren Kriterien und Schnittmengen',
    });
    expect(games.find((game) => game.sectionId === 'game')?.shell).toMatchObject({
      title: 'Klassifikationslabor',
    });
    expect(games.find((game) => game.sectionId === 'game')?.launchableInstance).toMatchObject({
      gameId: 'logical_classification_lab',
      instanceId: getKangurBuiltInGameInstanceId('logical_classification_lab'),
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Was ist Klassifikation?');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(screen.getByText('Wir klassifizieren nach:')).toBeInTheDocument();
    expect(screen.getByText('🎨 Farbe - rot vs. blau')).toBeInTheDocument();
  });

  it('prefers the gameTitle locale key for the game shell title', () => {
    const customMessages = structuredClone(deMessages) as Record<string, any>;
    customMessages.KangurStaticLessons.logicalClassification.game.gameTitle =
      'Benutzerdefiniertes Klassifikationslabor';

    render(
      <NextIntlClientProvider locale='de' messages={customMessages}>
        <LogicalClassificationLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
      }>) ?? [];

    expect(games.find((game) => game.sectionId === 'game')?.shell).toMatchObject({
      title: 'Benutzerdefiniertes Klassifikationslabor',
    });
  });
});
