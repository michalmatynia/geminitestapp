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

import deMessages from '@/i18n/messages/de.json';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import LogicalPatternsLesson from '@/features/kangur/ui/components/LogicalPatternsLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('LogicalPatternsLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the logical patterns lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <LogicalPatternsLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Muster und Folgen');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
        runtime?: { runtimeId?: string; rendererId?: string };
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Muster - Einstieg',
      description: 'Was ist ein Muster? Farben und Formen',
    });
    expect(sections.find((section) => section.id === 'ciagi_geom')).toMatchObject({
      title: 'Geometrische Folgen und Fibonacci',
      description: 'Multiplikation und besondere Folgen',
    });
    expect(games.find((game) => game.sectionId === 'game_warsztat')?.shell).toMatchObject({
      title: 'Musterwerkstatt',
    });
    expect(
      games.find((game) => game.sectionId === 'game_warsztat')?.launchableInstance,
    ).toMatchObject({
      gameId: 'logical_patterns_workshop',
      instanceId: getKangurBuiltInGameInstanceId('logical_patterns_workshop'),
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Was ist ein Muster?');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(screen.getByText('Muster sind ueberall:')).toBeInTheDocument();
    expect(screen.getByText('1, 2, 3, 4, 5 - jede Zahl ist um 1 groesser')).toBeInTheDocument();
  });

  it('prefers the gameTitle locale key for the workshop shell title', () => {
    const customMessages = structuredClone(deMessages) as Record<string, any>;
    customMessages.KangurStaticLessons.logicalPatterns.game.gameTitle =
      'Benutzerdefinierte Musterwerkstatt';

    render(
      <NextIntlClientProvider locale='de' messages={customMessages}>
        <LogicalPatternsLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
      }>) ?? [];

    expect(games.find((game) => game.sectionId === 'game_warsztat')?.shell).toMatchObject({
      title: 'Benutzerdefinierte Musterwerkstatt',
    });
  });
});
