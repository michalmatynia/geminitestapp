import { describe, expect, it } from 'vitest';

import type { KangurGameContentSet } from '@/shared/contracts/kangur-game-instances';

import { getKangurGameBuiltInInstancesForGame } from '../instances';
import {
  resolveKangurLaunchableGameRuntimeForInstance,
  resolveKangurLaunchableGameRuntimeForPersistedInstance,
} from '../launchable-runtime-resolution';
import { getKangurGameDefinition } from '../registry';

describe('launchable runtime resolution', () => {
  it('resolves the built-in addition instance to the shared play-variant runtime contract', () => {
    const game = getKangurGameDefinition('adding_ball');
    const [instance] = getKangurGameBuiltInInstancesForGame(game);

    const runtime = instance
      ? resolveKangurLaunchableGameRuntimeForInstance(game, instance)
      : null;

    expect(runtime).toEqual(
      expect.objectContaining({
        screen: 'addition_quiz',
        finishMode: 'play_variant',
        finishLabelProp: 'finishLabelVariant',
        shell: expect.objectContaining({
          maxWidthClassName: 'max-w-2xl',
        }),
      })
    );
  });

  it('resolves the built-in synthesis instance to the shared return-to-home runtime contract', () => {
    const game = getKangurGameDefinition('adding_synthesis');
    const [instance] = getKangurGameBuiltInInstancesForGame(game);

    const runtime = instance
      ? resolveKangurLaunchableGameRuntimeForInstance(game, instance)
      : null;

    expect(runtime).toEqual(
      expect.objectContaining({
        screen: 'adding_synthesis_quiz',
        finishMode: 'return_to_game_home',
        finishLabelProp: 'finishLabel',
        shell: expect.objectContaining({
          maxWidthClassName: 'max-w-[1120px]',
        }),
      })
    );
  });

  it('merges persisted synthesis content props and instance overrides without dropping the finish contract', () => {
    const game = getKangurGameDefinition('adding_synthesis');
    const persistedContentSets: KangurGameContentSet[] = [
      {
        id: 'adding_synthesis:custom:focus-pack',
        gameId: 'adding_synthesis',
        engineId: 'rhythm-answer-engine',
        launchableRuntimeId: 'adding_synthesis_quiz',
        label: 'Focus pack',
        description: 'Custom persisted rhythm pack for synthesis practice.',
        contentKind: 'default_content',
        rendererProps: {
          activityKey: 'content-pack-a',
          finishLabel: 'Content finish label',
        },
        sortOrder: 2,
      },
    ];

    const runtime = resolveKangurLaunchableGameRuntimeForPersistedInstance(
      game,
      {
        gameId: 'adding_synthesis',
        contentSetId: 'adding_synthesis:custom:focus-pack',
        launchableRuntimeId: 'adding_synthesis_quiz',
        engineOverrides: {
          activityKey: 'instance-pack-b',
          finishLabel: 'Instance finish label',
        },
      },
      persistedContentSets
    );

    expect(runtime).toEqual(
      expect.objectContaining({
        screen: 'adding_synthesis_quiz',
        finishMode: 'return_to_game_home',
        finishLabelProp: 'finishLabel',
        rendererProps: expect.objectContaining({
          activityKey: 'instance-pack-b',
          finishLabel: 'Instance finish label',
        }),
      })
    );
  });
});
