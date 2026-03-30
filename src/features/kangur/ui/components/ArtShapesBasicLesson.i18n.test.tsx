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

import plMessages from '@/i18n/messages/pl.json';
import ArtShapesBasicLesson from '@/features/kangur/ui/components/ArtShapesBasicLesson';
import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';

describe('ArtShapesBasicLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the art shapes lesson into Polish', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <ArtShapesBasicLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Podstawowe kształty');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(sections.find((section) => section.id === 'rotationPuzzle')).toMatchObject({
      title: 'Uzupełnij wirujący wzór',
      description: 'Wybierz animowany kafelek, który pasuje do brakującej jednej szóstej wzoru.',
      isGame: true,
    });
    expect(games.find((game) => game.sectionId === 'rotationPuzzle')?.shell).toMatchObject({
      title: 'Uzupełnij wirujący wzór',
      shellTestId: 'art-shapes-rotation-gap-game-shell',
    });
    expect(
      games.find((game) => game.sectionId === 'rotationPuzzle')?.launchableInstance
    ).toMatchObject({
      gameId: 'art_shape_rotation_puzzle',
      instanceId: getKangurBuiltInGameInstanceId('art_shape_rotation_puzzle'),
    });
  });

  it('prefers the gameTitle locale key for the launched puzzle shell title', () => {
    const customMessages = structuredClone(plMessages) as Record<string, any>;
    customMessages.KangurStaticLessons.artShapesBasic.game.gameTitle =
      'Niestandardowy wirujacy wzor';

    render(
      <NextIntlClientProvider locale='pl' messages={customMessages}>
        <ArtShapesBasicLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        shell: Record<string, unknown>;
      }>) ?? [];

    expect(games.find((game) => game.sectionId === 'rotationPuzzle')?.shell).toMatchObject({
      title: 'Niestandardowy wirujacy wzor',
    });
  });
});
