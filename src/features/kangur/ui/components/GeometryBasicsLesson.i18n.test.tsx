/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';

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
import GeometryBasicsLesson from '@/features/kangur/ui/components/GeometryBasicsLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('GeometryBasicsLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the geometry basics lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <GeometryBasicsLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Geometrische Grundlagen'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        stage: Record<string, unknown>;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'punkt')).toMatchObject({
      title: 'Punkt und Strecke',
      description: 'Die einfachsten Elemente der Geometrie',
    });
    expect(sections.find((section) => section.id === 'kat')).toMatchObject({
      title: 'Winkel',
      description: 'Spitz, recht und stumpf',
    });
    expect(games.find((game) => game.sectionId === 'game')?.stage).toMatchObject({
      title: 'Geo-Mission',
    });
    expect(games.find((game) => game.sectionId === 'game')?.launchableInstance).toMatchObject({
      gameId: 'geometry_shape_workshop',
      instanceId: getKangurBuiltInGameInstanceId('geometry_shape_workshop'),
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.punkt?.[0]?.title).toBe('Punkt und Strecke');
    render(<>{slides.punkt?.[0]?.content}</>);

    expect(screen.getByText('Strecke AB')).toBeInTheDocument();
    expect(
      screen.getByText('Eine Strecke hat einen Anfang und ein Ende — zwei Punkte.')
    ).toBeInTheDocument();
  });
});
