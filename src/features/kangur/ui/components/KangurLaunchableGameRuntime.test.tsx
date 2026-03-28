/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KangurLaunchableGameRuntimeSpec } from '@/shared/contracts/kangur-games';

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    const createRuntimeRendererStub = (testId: string) => {
      const Stub = ({
        finishLabel,
        literacyMatchSetId,
        onFinish,
      }: {
        finishLabel?: string;
        literacyMatchSetId?: string;
        onFinish?: () => void;
      }) => (
        <button
          data-finish-label={finishLabel ?? ''}
          data-literacy-match-set-id={literacyMatchSetId ?? ''}
          data-testid={testId}
          onClick={onFinish}
          type='button'
        >
          {testId}
        </button>
      );

      Stub.displayName = testId;
      return Stub;
    };

    const signature = typeof loader === 'function' ? loader.toString() : '';

    if (signature.includes('AlphabetLiteracyGame')) {
      return createRuntimeRendererStub('alphabet-literacy-game');
    }

    if (signature.includes('ColorHarmonyGame')) {
      return createRuntimeRendererStub('color-harmony-game');
    }

    if (signature.includes('ShapeRecognitionGame')) {
      return createRuntimeRendererStub('shape-recognition-game');
    }

    return () => null;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    key === 'returnToGameHome' ? 'Return to game home' : key,
}));

vi.mock('@/features/kangur/ui/components/music/music-piano-roll-launchable-runtime', () => ({
  createKangurMusicPianoRollLaunchableOnFinishRendererMap: () => ({}),
}));

import { KangurLaunchableGameRuntime } from './KangurLaunchableGameRuntime';

describe('KangurLaunchableGameRuntime', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the renamed alphabet literacy runtime and forwards finish label plus renderer props', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'alphabet_literacy',
      rendererId: 'alphabet_literacy_game',
      rendererProps: {
        literacyMatchSetId: 'alphabet-match-set',
      },
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: 'A',
        shellTestId: 'alphabet-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('alphabet-literacy-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
    expect(screen.getByTestId('alphabet-literacy-game')).toHaveAttribute(
      'data-literacy-match-set-id',
      'alphabet-match-set'
    );
  });

  it('renders the renamed color harmony runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'color_harmony',
      rendererId: 'color_harmony_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: 'C',
        shellTestId: 'color-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('color-harmony-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });

  it('renders the renamed shape recognition runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'geometry_shape_recognition',
      rendererId: 'shape_recognition_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: 'S',
        shellTestId: 'shape-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('shape-recognition-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });
});
