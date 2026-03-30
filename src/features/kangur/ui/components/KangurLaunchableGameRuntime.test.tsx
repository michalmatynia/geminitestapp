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
        finishLabelVariant,
        literacyMatchSetId,
        onFinish,
      }: {
        finishLabel?: string;
        finishLabelVariant?: string;
        literacyMatchSetId?: string;
        onFinish?: () => void;
      }) => (
        <button
          data-finish-label={finishLabel ?? ''}
          data-finish-label-variant={finishLabelVariant ?? ''}
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

    if (signature.includes('AddingSynthesisGame')) {
      return createRuntimeRendererStub('adding-synthesis-game');
    }

    if (signature.includes('AddingBallGame')) {
      return createRuntimeRendererStub('adding-ball-game');
    }

    if (signature.includes('DivisionGame')) {
      return createRuntimeRendererStub('division-game');
    }

    if (signature.includes('MultiplicationArrayGame')) {
      return createRuntimeRendererStub('multiplication-array-game');
    }

    if (signature.includes('ColorHarmonyGame')) {
      return createRuntimeRendererStub('color-harmony-game');
    }

    if (signature.includes('EnglishAdverbsActionStudioGame')) {
      return createRuntimeRendererStub('english-adverbs-action-studio-game');
    }

    if (signature.includes('EnglishComparativesSuperlativesCrownGame')) {
      return createRuntimeRendererStub('english-comparatives-crown-game');
    }

    if (signature.includes('ShapeRecognitionGame')) {
      return createRuntimeRendererStub('shape-recognition-game');
    }

    if (signature.includes('SubtractingGame')) {
      return createRuntimeRendererStub('subtracting-game');
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

  it('renders the adding synthesis launchable runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'adding_synthesis_quiz',
      rendererId: 'adding_synthesis_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'amber',
        icon: '🎵',
        shellTestId: 'adding-synthesis-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('adding-synthesis-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });

  it('renders the addition launchable runtime with the play finish variant', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'addition_quiz',
      rendererId: 'adding_ball_game',
      finishMode: 'play_variant',
      finishLabelProp: 'finishLabelVariant',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'amber',
        icon: '➕',
        shellTestId: 'addition-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('adding-ball-game')).toHaveAttribute(
      'data-finish-label-variant',
      'play'
    );
  });

  it('renders the multiplication array launchable runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'multiplication_array_quiz',
      rendererId: 'multiplication_array_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: '🧱',
        shellTestId: 'multiplication-array-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('multiplication-array-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });

  it('renders the subtraction launchable runtime with the play finish variant', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'subtraction_quiz',
      rendererId: 'subtracting_game',
      finishMode: 'play_variant',
      finishLabelProp: 'finishLabelVariant',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'rose',
        icon: '➖',
        shellTestId: 'subtraction-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('subtracting-game')).toHaveAttribute(
      'data-finish-label-variant',
      'play'
    );
  });

  it('renders the division launchable runtime with the play finish variant', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'division_quiz',
      rendererId: 'division_game',
      finishMode: 'play_variant',
      finishLabelProp: 'finishLabelVariant',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'emerald',
        icon: '➗',
        shellTestId: 'division-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('division-game')).toHaveAttribute(
      'data-finish-label-variant',
      'play'
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

  it('renders the general adverbs launchable runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'english_adverbs_quiz',
      rendererId: 'english_adverbs_action_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: '✨',
        shellTestId: 'english-adverbs-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('english-adverbs-action-studio-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });

  it('renders the comparatives launchable runtime', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'english_compare_and_crown_quiz',
      rendererId: 'english_compare_and_crown_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'violet',
        icon: '👑',
        shellTestId: 'english-compare-and-crown-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('english-comparatives-crown-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });
});
