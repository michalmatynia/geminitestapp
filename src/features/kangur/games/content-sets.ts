import type {
  KangurGameContentSet,
  KangurGameContentSetId,
} from '@/shared/contracts/kangur-game-instances';
import { kangurGameContentSetSchema } from '@/shared/contracts/kangur-game-instances';
import type {
  KangurGameDefinition,
  KangurLaunchableGameRuntimeSpec,
} from '@/shared/contracts/kangur-games';

import { getKangurLaunchableGameRuntimeSpecForGame } from './catalog';

const createContentSet = (
  game: KangurGameDefinition,
  runtime: KangurLaunchableGameRuntimeSpec,
  input: Omit<KangurGameContentSet, 'gameId' | 'launchableRuntimeId' | 'engineId'>
): KangurGameContentSet =>
  kangurGameContentSetSchema.parse({
    ...input,
    gameId: game.id,
    engineId: runtime.engineId,
    launchableRuntimeId: runtime.screen,
  });

const createDefaultContentSet = (
  game: KangurGameDefinition,
  runtime: KangurLaunchableGameRuntimeSpec,
  input?: Partial<Pick<KangurGameContentSet, 'description' | 'label' | 'rendererProps'>>
): KangurGameContentSet =>
  createContentSet(game, runtime, {
    id: `${game.id}:default`,
    label: input?.label ?? 'Default content',
    description:
      input?.description ??
      'Uses the default content payload bundled with this launchable game runtime.',
    contentKind: 'default_content',
    rendererProps: input?.rendererProps ?? {},
    sortOrder: 1,
  });

export const getKangurGameContentSetsForGame = (
  game: KangurGameDefinition
): KangurGameContentSet[] => {
  const runtime = getKangurLaunchableGameRuntimeSpecForGame(game);
  if (!runtime) {
    return [];
  }

  switch (runtime.rendererId) {
    case 'clock_training_game':
      return [
        createDefaultContentSet(game, runtime, {
          label: 'Combined clock drills',
          description: 'Feeds mixed hours-and-minutes exercises into the clock engine.',
          rendererProps: { clockSection: 'combined' },
        }),
        createContentSet(game, runtime, {
          id: `${game.id}:clock-hours`,
          label: 'Hours only',
          description: 'Feeds only hour-reading tasks into the clock engine.',
          contentKind: 'clock_section',
          rendererProps: { clockSection: 'hours' },
          sortOrder: 2,
        }),
        createContentSet(game, runtime, {
          id: `${game.id}:clock-minutes`,
          label: 'Minutes only',
          description: 'Feeds only minute-reading tasks into the clock engine.',
          contentKind: 'clock_section',
          rendererProps: { clockSection: 'minutes' },
          sortOrder: 3,
        }),
      ];
    case 'logical_patterns_workshop_game':
      return [
        createDefaultContentSet(game, runtime, {
          label: 'Logical patterns workshop',
          description: 'Uses the core logical pattern-sequencing round set.',
          rendererProps: { patternSetId: 'logical_patterns_workshop' },
        }),
        createContentSet(game, runtime, {
          id: `${game.id}:alphabet-order`,
          label: 'Alphabet order set',
          description: 'Feeds alphabet letter ordering rounds into the same pattern engine.',
          contentKind: 'logical_pattern_set',
          rendererProps: { patternSetId: 'alphabet_letter_order' },
          sortOrder: 2,
        }),
      ];
    case 'geometry_drawing_game':
      return [
        createDefaultContentSet(game, runtime, {
          label: 'Starter shape pack',
          description: 'Feeds beginner-friendly shape tracing rounds into the drawing engine.',
          rendererProps: { shapeIds: ['circle', 'triangle', 'square'] },
        }),
        createContentSet(game, runtime, {
          id: `${game.id}:geometry-polygons`,
          label: 'Polygon pack',
          description: 'Feeds polygon-heavy rounds into the same drawing engine.',
          contentKind: 'geometry_shape_pack',
          rendererProps: { shapeIds: ['triangle', 'square', 'pentagon', 'hexagon'] },
          sortOrder: 2,
        }),
        createContentSet(game, runtime, {
          id: `${game.id}:geometry-curves`,
          label: 'Curves pack',
          description: 'Feeds rounded and mixed-shape rounds into the drawing engine.',
          contentKind: 'geometry_shape_pack',
          rendererProps: { shapeIds: ['circle', 'oval', 'rectangle', 'diamond'] },
          sortOrder: 3,
        }),
      ];
    default:
      return [createDefaultContentSet(game, runtime)];
  }
};

export const getKangurGameContentSetForGame = (
  game: KangurGameDefinition,
  contentSetId: KangurGameContentSetId | null | undefined
): KangurGameContentSet | null => {
  const contentSets = getKangurGameContentSetsForGame(game);
  if (contentSets.length === 0) {
    return null;
  }

  if (!contentSetId) {
    return contentSets[0] ?? null;
  }

  return contentSets.find((contentSet) => contentSet.id === contentSetId) ?? contentSets[0] ?? null;
};
