/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import AddingLesson from '@/features/kangur/ui/components/AddingLesson';
import DivisionLesson from '@/features/kangur/ui/components/DivisionLesson';
import MultiplicationLesson from '@/features/kangur/ui/components/MultiplicationLesson';
import SubtractingLesson from '@/features/kangur/ui/components/SubtractingLesson';

describe('arithmetic stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      lessonTitle: 'Dodawanie',
      Component: AddingLesson,
      sectionId: 'game',
      launchableGameId: 'adding_ball',
      launchableInstanceId: 'adding_ball:instance:default',
      shellTestId: 'adding-lesson-game-shell',
    },
    {
      lessonTitle: 'Dodawanie',
      Component: AddingLesson,
      sectionId: 'synthesis',
      launchableGameId: 'adding_synthesis',
      launchableInstanceId: 'adding_synthesis:instance:default',
      shellTestId: 'adding-lesson-synthesis-shell',
    },
    {
      lessonTitle: 'Odejmowanie',
      Component: SubtractingLesson,
      sectionId: 'game',
      launchableGameId: 'subtracting_garden',
      launchableInstanceId: 'subtracting_garden:instance:default',
      shellTestId: 'subtracting-lesson-game-shell',
    },
    {
      lessonTitle: 'Dzielenie',
      Component: DivisionLesson,
      sectionId: 'game',
      launchableGameId: 'division_groups',
      launchableInstanceId: 'division_groups:instance:default',
      shellTestId: 'division-lesson-game-shell',
    },
    {
      lessonTitle: 'Mnożenie',
      Component: MultiplicationLesson,
      sectionId: 'game_array',
      launchableGameId: 'multiplication_array',
      launchableInstanceId: 'multiplication_array:instance:default',
      shellTestId: 'multiplication-lesson-game-array-shell',
      hasBodyPrelude: true,
    },
  ])(
    'passes a shared launchable instance into KangurUnifiedLesson for $sectionId',
    ({
      Component,
      lessonTitle,
      sectionId,
      launchableGameId,
      launchableInstanceId,
      shellTestId,
      hasBodyPrelude,
    }) => {
      render(
        <NextIntlClientProvider locale='pl' messages={plMessages}>
          <Component />
        </NextIntlClientProvider>
      );

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          stage: Record<string, unknown>;
          launchableInstance?: {
            gameId?: string;
            instanceId?: string;
          };
          render?: unknown;
        }>) ?? [];
      const game = games.find((candidate) => candidate.sectionId === sectionId);

      expect(game?.stage).toMatchObject({
        shellTestId,
      });
      expect(game?.launchableInstance).toMatchObject({
        gameId: launchableGameId,
        instanceId: launchableInstanceId,
      });
      if (hasBodyPrelude) {
        expect(game?.stage).toHaveProperty('bodyPrelude');
      }
      expect(game).not.toHaveProperty('runtime');
      expect(game).not.toHaveProperty('render');
    }
  );
});
