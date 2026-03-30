/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';
let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  default: () => <div data-testid='mock-launchable-instance-runtime' />,
}));

import GeometryShapeRecognitionLesson from '@/features/kangur/ui/components/GeometryShapeRecognitionLesson';

describe('GeometryShapeRecognitionLesson instance runtime model', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('routes both practice and draw through shared launchable instances', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometryShapeRecognitionLesson />
      </NextIntlClientProvider>
    );

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        launchableInstance?: { gameId: string; instanceId: string };
      }>) ?? [];

    const practiceGame = games.find((game) => game.sectionId === 'practice');
    const drawGame = games.find((game) => game.sectionId === 'draw');

    expect(practiceGame?.launchableInstance).toEqual({
      gameId: 'geometry_shape_spotter',
      instanceId: 'geometry_shape_spotter:instance:default',
    });
    expect(drawGame?.launchableInstance).toEqual({
      gameId: 'geometry_shape_workshop',
      instanceId: 'geometry_shape_workshop:instance:default',
    });
  });
});
