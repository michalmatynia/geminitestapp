import type { KangurGameEngineDefinition } from '@/shared/contracts/kangur-games';

export const KANGUR_ADULT_LEARNING_GAME_ENGINES: readonly KangurGameEngineDefinition[] = [
  {
    id: 'diagram-sketch-engine',
    category: 'adult_learning',
    label: 'Diagram sketch engine',
    title: 'Diagram Sketch Engine',
    description:
      'Drawing engine for sketching missing arrows, boxes, and milestone paths in adult workflow and documentation games.',
    mechanics: ['drawing'],
    interactionModes: ['draw'],
    surfaces: ['lesson', 'library'],
    tags: ['diagram', 'sketch', 'workflow'],
    status: 'active',
    sortOrder: 1700,
  },
  {
    id: 'token-trim-engine',
    category: 'adult_learning',
    label: 'Token trim engine',
    title: 'Token Trim Engine',
    description:
      'Tap-driven engine for removing unnecessary prompt tokens and refining short text contracts in reusable adult training games.',
    mechanics: ['tap_select'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['prompt', 'editing', 'tokens'],
    status: 'active',
    sortOrder: 1800,
  },
];
