import type { KangurGameEngineDefinition } from '@/shared/contracts/kangur-games';
import { KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS } from '../music-piano-roll-contract';

export const KANGUR_EARLY_LEARNING_GAME_ENGINES: readonly KangurGameEngineDefinition[] = [
  {
    id: 'color-harmony-engine',
    category: 'early_learning',
    label: 'Color harmony engine',
    title: 'Color Harmony Engine',
    description:
      'Shared early-learning engine for warm-cool color grouping, harmony matching, and future palette-based art games in the library.',
    mechanics: ['tap_select'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['art', 'colors', 'matching'],
    status: 'active',
    sortOrder: 1150,
  },
  {
    id: 'symbol-tracing-engine',
    category: 'early_learning',
    label: 'Symbol tracing engine',
    title: 'Symbol Tracing Engine',
    description:
      'Shared tracing engine for early handwriting, letter copying, and other follow-the-line activities exposed in the games library.',
    mechanics: ['drawing'],
    interactionModes: ['draw'],
    surfaces: ['lesson', 'library'],
    tags: ['tracing', 'letters', 'handwriting'],
    status: 'active',
    sortOrder: 1200,
  },
  {
    id: 'letter-match-engine',
    category: 'early_learning',
    label: 'Letter match engine',
    title: 'Letter Match Engine',
    description:
      'Tap-based matching engine for first-word recognition, uppercase-lowercase pairs, and other early literacy variants.',
    mechanics: ['tap_select'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['alphabet', 'matching', 'literacy'],
    status: 'active',
    sortOrder: 1300,
  },
  ...KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS,
  {
    id: 'shape-recognition-engine',
    category: 'early_learning',
    label: 'Shape recognition engine',
    title: 'Shape Recognition Engine',
    description:
      'Shared shape-spotting engine for recognising, rotating, and comparing geometric forms across early art and geometry games.',
    mechanics: ['tap_select'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['shapes', 'spatial', 'geometry'],
    status: 'active',
    sortOrder: 1600,
  },
];
