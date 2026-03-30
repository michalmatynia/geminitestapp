/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { KangurLaunchableGameRuntimeSpec } from '@/shared/contracts/kangur-games';

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    const testIdsByRendererId: Record<string, string> = {
      adding_ball_game: 'adding-ball-game',
      adding_synthesis_game: 'adding-synthesis-game',
      agentic_prompt_trim_game: 'agentic-prompt-trim-game',
      alphabet_literacy_game: 'alphabet-literacy-game',
      color_harmony_game: 'color-harmony-game',
      division_game: 'division-game',
      english_adverbs_action_game: 'english-adverbs-action-studio-game',
      english_compare_and_crown_game: 'english-comparatives-crown-game',
      multiplication_array_game: 'multiplication-array-game',
      shape_recognition_game: 'shape-recognition-game',
      subtracting_game: 'subtracting-game',
    };
    const createRuntimeCategoryStub = (supportedRendererIds: Set<string>) => {
      const Stub = ({
        rendererId,
        rendererProps,
      }: {
        rendererId: string;
        rendererProps?: {
          completionPrimaryActionLabel?: string;
          finishLabel?: string;
          finishLabelVariant?: string;
          onFinish?: () => void;
          rendererProps?: {
            literacyMatchSetId?: string;
          };
        };
      }) => {
        if (!supportedRendererIds.has(rendererId)) {
          return null;
        }

        const testId = testIdsByRendererId[rendererId] ?? rendererId;

        return (
          <button
            data-completion-primary-action-label={rendererProps?.completionPrimaryActionLabel ?? ''}
            data-finish-label={rendererProps?.finishLabel ?? ''}
            data-finish-label-variant={rendererProps?.finishLabelVariant ?? ''}
            data-literacy-match-set-id={rendererProps?.rendererProps?.literacyMatchSetId ?? ''}
            data-testid={testId}
            onClick={rendererProps?.onFinish}
            type='button'
          >
            {testId}
          </button>
        );
      };

      Stub.displayName = 'RuntimeCategoryStub';
      return Stub;
    };
    const signature = typeof loader === 'function' ? loader.toString() : '';

    if (signature.includes('KangurLaunchableGameRuntime.foundational')) {
      return createRuntimeCategoryStub(
        new Set<string>([
          'adding_ball_game',
          'adding_synthesis_game',
          'division_game',
          'english_adverbs_action_game',
          'english_compare_and_crown_game',
          'multiplication_array_game',
          'subtracting_game',
        ])
      );
    }

    if (signature.includes('KangurLaunchableGameRuntime.early-learning')) {
      return createRuntimeCategoryStub(
        new Set<string>(['alphabet_literacy_game', 'color_harmony_game', 'shape_recognition_game'])
      );
    }

    if (signature.includes('KangurLaunchableGameRuntime.adult-learning')) {
      return createRuntimeCategoryStub(new Set<string>(['agentic_prompt_trim_game']));
    }

    return () => null;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    key === 'returnToGameHome' ? 'Return to game home' : key,
}));

import { KangurLaunchableGameRuntime } from './KangurLaunchableGameRuntime';

describe('KangurLaunchableGameRuntime', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the renamed alphabet literacy runtime and forwards finish label plus renderer props', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'alphabet_letter_matching_quiz',
      engineId: 'letter-match-engine',
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
      screen: 'art_color_harmony_quiz',
      engineId: 'color-harmony-engine',
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
      engineId: 'rhythm-answer-engine',
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
      engineId: 'quantity-drag-engine',
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
      engineId: 'array-builder-engine',
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
      engineId: 'quantity-drag-engine',
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
      engineId: 'choice-quiz-engine',
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
      screen: 'geometry_shape_spotter_quiz',
      engineId: 'shape-recognition-engine',
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
      engineId: 'sentence-builder-engine',
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
      engineId: 'sentence-builder-engine',
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

  it('renders the adult-learning prompt trim runtime through its category chunk', () => {
    const runtime: KangurLaunchableGameRuntimeSpec = {
      kind: 'launchable_game_screen',
      screen: 'agentic_prompt_trim_quiz',
      engineId: 'token-trim-engine',
      rendererId: 'agentic_prompt_trim_game',
      finishMode: 'return_to_game_home',
      finishLabelProp: 'finishLabel',
      className: 'w-full flex flex-col items-center',
      shell: {
        accent: 'rose',
        icon: '✂️',
        shellTestId: 'agentic-prompt-trim-runtime-shell',
      },
    };

    render(<KangurLaunchableGameRuntime onFinish={vi.fn()} runtime={runtime} />);

    expect(screen.getByTestId('agentic-prompt-trim-game')).toHaveAttribute(
      'data-finish-label',
      'Return to game home'
    );
  });
});
