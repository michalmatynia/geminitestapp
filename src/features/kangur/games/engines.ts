import type {
  KangurGameEngineDefinition,
  KangurGameEngineId,
} from '@/shared/contracts/kangur-games';

const KANGUR_DEFAULT_GAME_ENGINES: readonly KangurGameEngineDefinition[] = [
  {
    id: 'clock-dial-engine',
    label: 'Clock dial engine',
    title: 'Clock Dial Engine',
    description:
      'Shared analogue clock engine for reading hours, minutes, and time relationships across lesson and fullscreen surfaces.',
    mechanics: ['clock_training'],
    interactionModes: ['mixed'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['time', 'clock', 'analogue'],
    status: 'active',
    sortOrder: 100,
  },
  {
    id: 'calendar-grid-engine',
    label: 'Calendar grid engine',
    title: 'Calendar Grid Engine',
    description:
      'Reusable calendar engine for dates, weekdays, and month navigation in lessons, previews, and standalone play.',
    mechanics: ['calendar_interactive'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['calendar', 'dates', 'time'],
    status: 'active',
    sortOrder: 200,
  },
  {
    id: 'quantity-drag-engine',
    label: 'Quantity drag engine',
    title: 'Quantity Drag Engine',
    description:
      'Drag-and-drop quantity engine for early arithmetic variants such as adding ball and subtracting garden.',
    mechanics: ['drag_drop'],
    interactionModes: ['drag'],
    surfaces: ['lesson', 'library'],
    tags: ['quantity', 'drag', 'arithmetic'],
    status: 'active',
    sortOrder: 300,
  },
  {
    id: 'rhythm-answer-engine',
    label: 'Rhythm answer engine',
    title: 'Rhythm Answer Engine',
    description:
      'Tap-driven fluency engine for rhythm-based answer rounds and future music-like arithmetic practice variants.',
    mechanics: ['rhythm'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['rhythm', 'fluency', 'answers'],
    status: 'active',
    sortOrder: 400,
  },
  {
    id: 'array-builder-engine',
    label: 'Array builder engine',
    title: 'Array Builder Engine',
    description:
      'Visual array engine for repeated groups and multiplication structure, designed for lesson embedding and catalog reuse.',
    mechanics: ['tap_select'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library'],
    tags: ['arrays', 'multiplication', 'visual'],
    status: 'active',
    sortOrder: 500,
  },
  {
    id: 'choice-quiz-engine',
    label: 'Choice quiz engine',
    title: 'Choice Quiz Engine',
    description:
      'Reusable multiple-choice quiz engine for arithmetic recall, with fullscreen runtime support already wired.',
    mechanics: ['multiple_choice'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['quiz', 'choice', 'arithmetic'],
    status: 'active',
    sortOrder: 600,
  },
  {
    id: 'shape-drawing-engine',
    label: 'Shape drawing engine',
    title: 'Shape Drawing Engine',
    description:
      'Shared drawing engine for geometry activities that need sketching, symmetry, and perimeter-oriented tasks.',
    mechanics: ['drawing'],
    interactionModes: ['draw'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['geometry', 'drawing', 'shapes'],
    status: 'active',
    sortOrder: 700,
  },
  {
    id: 'pattern-sequence-engine',
    label: 'Pattern sequence engine',
    title: 'Pattern Sequence Engine',
    description:
      'Sequence-focused logic engine for pattern continuation, rule detection, and structured lesson-stage flows.',
    mechanics: ['logic_pattern'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['logic', 'patterns', 'sequence'],
    status: 'active',
    sortOrder: 800,
  },
  {
    id: 'classification-engine',
    label: 'Classification engine',
    title: 'Classification Engine',
    description:
      'Cross-subject grouping engine shared by logical classification and English parts-of-speech sorting.',
    mechanics: ['logic_classification'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['classification', 'sorting', 'cross-subject'],
    status: 'active',
    sortOrder: 900,
  },
  {
    id: 'relation-match-engine',
    label: 'Relation match engine',
    title: 'Relation Match Engine',
    description:
      'Shared engine for analogy matching and relationship reasoning across lesson-stage and fullscreen surfaces.',
    mechanics: ['logic_relation'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['relations', 'analogies', 'logic'],
    status: 'active',
    sortOrder: 1000,
  },
  {
    id: 'sentence-builder-engine',
    label: 'Sentence builder engine',
    title: 'Sentence Builder Engine',
    description:
      'English sentence construction engine prepared for lesson staging, previews, and standalone grammar rounds.',
    mechanics: ['sentence_building'],
    interactionModes: ['tap'],
    surfaces: ['lesson', 'library', 'game'],
    tags: ['english', 'grammar', 'sentences'],
    status: 'active',
    sortOrder: 1100,
  },
] as const;

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const createDefaultKangurGameEngines = (): KangurGameEngineDefinition[] =>
  KANGUR_DEFAULT_GAME_ENGINES.map((engine) => ({
    ...engine,
    mechanics: [...engine.mechanics],
    interactionModes: [...engine.interactionModes],
    surfaces: [...engine.surfaces],
    tags: [...engine.tags],
  }));

export const KANGUR_GAME_ENGINE_LIBRARY = Object.freeze(
  createDefaultKangurGameEngines().reduce<
    Record<KangurGameEngineId, KangurGameEngineDefinition>
  >((acc, engine) => {
    acc[engine.id] = engine;
    return acc;
  }, {} as Record<KangurGameEngineId, KangurGameEngineDefinition>)
);

export const KANGUR_GAME_ENGINE_ORDER = Object.freeze(
  Object.values(KANGUR_GAME_ENGINE_LIBRARY)
    .slice()
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)
    )
    .map((engine) => engine.id)
);

export const KANGUR_GAME_ENGINE_LIBRARY_LIST = Object.freeze(
  KANGUR_GAME_ENGINE_ORDER.map((engineId) => KANGUR_GAME_ENGINE_LIBRARY[engineId]).filter(
    isDefined
  )
);

export const getKangurGameEngineDefinition = (
  engineId: KangurGameEngineId
): KangurGameEngineDefinition => {
  const engine = KANGUR_GAME_ENGINE_LIBRARY[engineId];
  if (!engine) {
    throw new Error(`Missing Kangur game engine definition for "${engineId}".`);
  }

  return engine;
};

export const getOptionalKangurGameEngineDefinition = (
  engineId: string
): KangurGameEngineDefinition | null => KANGUR_GAME_ENGINE_LIBRARY[engineId] ?? null;
