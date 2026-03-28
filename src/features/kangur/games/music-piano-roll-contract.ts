import type {
  KangurGameDefinition,
  KangurGameEngineDefinition,
  KangurGameEngineImplementation,
  KangurGameVariant,
} from '@/shared/contracts/kangur-games';

export {
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_GAME_RUNTIME_RENDERER_IDS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_GAME_SCREENS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
} from '@/shared/contracts/kangur-music-piano-roll';

import {
  KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS,
  KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS,
} from '@/shared/contracts/kangur-music-piano-roll';

export const KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS = ['repeat', 'freePlay'] as const;
export const KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID = 'music_diatonic_scale' as const;

type KangurMusicPianoRollVariantKey =
  (typeof KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS)[number];

type KangurMusicPianoRollWrapperTestIds = {
  audioStatus?: string;
  finishButton?: string;
  modeStatus?: string;
  pianoRoll: {
    keyPrefix: string;
    shell: string;
    stepPrefix: string;
  };
  root?: string;
  stage?: string;
};

type KangurMusicPianoRollDerivedConfig = {
  builtInInstanceDescription: string;
  builtInInstanceTitle: string;
  engineDefinition: Omit<KangurGameEngineDefinition, 'id'>;
  engineId: (typeof KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS)[KangurMusicPianoRollVariantKey];
  engineImplementationSummary: string;
  gameId: (typeof KANGUR_MUSIC_PIANO_ROLL_GAME_IDS)[KangurMusicPianoRollVariantKey];
  launchableRuntimeId: (typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS)[KangurMusicPianoRollVariantKey];
  lessonVariantGame: Pick<
    KangurGameDefinition,
    | 'emoji'
    | 'interactionMode'
    | 'label'
    | 'lessonComponentIds'
    | 'mechanic'
    | 'sortOrder'
    | 'subject'
    | 'tags'
    | 'title'
  >;
  rendererId: (typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS)[KangurMusicPianoRollVariantKey];
  runtimeComponentId: string;
  runtimeIcon: string;
  topSectionTestId: string;
  wrapperTestIds: KangurMusicPianoRollWrapperTestIds;
};

type KangurMusicPianoRollLessonVariantGameConfig = Pick<
  KangurGameDefinition,
  | 'emoji'
  | 'engineId'
  | 'id'
  | 'interactionMode'
  | 'label'
  | 'lessonComponentIds'
  | 'mechanic'
  | 'sortOrder'
  | 'subject'
  | 'tags'
  | 'title'
> & {
  launchableRuntimeId: KangurGameVariant['launchableRuntimeId'];
};

export const KANGUR_MUSIC_PIANO_ROLL_CONFIGS = {
  repeat: {
    builtInInstanceDescription:
      'Default melody-repeat lesson/library instance backed by the shared music engine.',
    builtInInstanceTitle: 'Melody repeat default',
    engineDefinition: {
      category: 'early_learning',
      description:
        'Call-and-response music engine for repeating short melodies and developing pitch memory in shared lesson and library surfaces.',
      interactionModes: ['tap'],
      label: 'Melody repeat engine',
      mechanics: ['rhythm'],
      sortOrder: 1400,
      status: 'active',
      surfaces: ['lesson', 'library'],
      tags: ['music', 'melody', 'memory'],
      title: 'Melody Repeat Engine',
    },
    engineId: KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.repeat,
    engineImplementationSummary:
      'Melody repetition is implemented as a reusable shared music game component reused by launchable instances.',
    gameId: KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.repeat,
    lessonVariantGame: {
      emoji: '🎵',
      interactionMode: 'tap',
      label: 'Melody repeat',
      lessonComponentIds: [KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID],
      mechanic: 'rhythm',
      sortOrder: 90,
      subject: 'music',
      tags: ['music', 'melody', 'memory'],
      title: 'Melody Repeat',
    },
    launchableRuntimeId: KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.repeat,
    rendererId: KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.repeat,
    runtimeComponentId: 'MusicMelodyRepeatGame',
    runtimeIcon: '🎵',
    topSectionTestId: 'kangur-music-melody-repeat-top-section',
    wrapperTestIds: {
      pianoRoll: {
        keyPrefix: 'music-melody-repeat-key',
        shell: 'music-melody-repeat-piano-roll',
        stepPrefix: 'music-melody-repeat-step',
      },
      stage: 'music-melody-repeat-stage',
    },
  },
  freePlay: {
    builtInInstanceDescription:
      'Default piano-roll free-play instance backed by the shared music engine.',
    builtInInstanceTitle: 'Piano roll free play default',
    engineDefinition: {
      category: 'early_learning',
      description:
        'Exploratory piano-roll engine for free play, keyboard discovery, and music interaction variants that stay outside lesson-specific code.',
      interactionModes: ['tap'],
      label: 'Piano roll engine',
      mechanics: ['tap_select'],
      sortOrder: 1500,
      status: 'active',
      surfaces: ['lesson', 'library'],
      tags: ['music', 'piano', 'free-play'],
      title: 'Piano Roll Engine',
    },
    engineId: KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS.freePlay,
    engineImplementationSummary:
      'Piano exploration uses a shared runtime component that now flows through launchable instances instead of lesson-specific engine code.',
    gameId: KANGUR_MUSIC_PIANO_ROLL_GAME_IDS.freePlay,
    lessonVariantGame: {
      emoji: '🎹',
      interactionMode: 'tap',
      label: 'Piano roll free play',
      lessonComponentIds: [KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID],
      mechanic: 'tap_select',
      sortOrder: 95,
      subject: 'music',
      tags: ['music', 'keyboard', 'free-play'],
      title: 'Piano Roll Free Play',
    },
    launchableRuntimeId: KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS.freePlay,
    rendererId: KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS.freePlay,
    runtimeComponentId: 'MusicPianoRollFreePlayGame',
    runtimeIcon: '🎹',
    topSectionTestId: 'kangur-music-piano-roll-free-play-top-section',
    wrapperTestIds: {
      audioStatus: 'music-piano-roll-freeplay-audio',
      finishButton: 'music-piano-roll-freeplay-finish',
      modeStatus: 'music-piano-roll-freeplay-mode',
      pianoRoll: {
        keyPrefix: 'music-piano-roll-freeplay-key',
        shell: 'music-piano-roll-freeplay-shell',
        stepPrefix: 'music-piano-roll-freeplay-step',
      },
      root: 'music-piano-roll-freeplay-game',
    },
  },
} as const satisfies Record<KangurMusicPianoRollVariantKey, KangurMusicPianoRollDerivedConfig>;

const createVariantKeyRecord = <T,>(
  mapValue: (key: KangurMusicPianoRollVariantKey) => T
): Record<KangurMusicPianoRollVariantKey, T> =>
  Object.fromEntries(
    KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [key, mapValue(key)])
  ) as Record<KangurMusicPianoRollVariantKey, T>;

export const KANGUR_MUSIC_PIANO_ROLL_RUNTIME_COMPONENT_IDS = createVariantKeyRecord(
  (key) => KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].runtimeComponentId
);

export const KANGUR_MUSIC_PIANO_ROLL_WRAPPER_TEST_IDS = {
  freePlay: KANGUR_MUSIC_PIANO_ROLL_CONFIGS.freePlay.wrapperTestIds,
  repeat: KANGUR_MUSIC_PIANO_ROLL_CONFIGS.repeat.wrapperTestIds,
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_TOP_SECTION_TEST_IDS = createVariantKeyRecord(
  (key) => KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].topSectionTestId
);

export const KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_CONFIGS = Object.fromEntries(
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => {
    const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];
    return [
      config.launchableRuntimeId,
      {
        engineId: config.engineId,
        rendererId: config.rendererId,
        screen: config.launchableRuntimeId,
        shell: {
          icon: config.runtimeIcon,
          shellTestId: config.topSectionTestId,
        },
      },
    ];
  })
) as Record<
  (typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS)[KangurMusicPianoRollVariantKey],
  {
    engineId: (typeof KANGUR_MUSIC_PIANO_ROLL_ENGINE_IDS)[KangurMusicPianoRollVariantKey];
    rendererId: (typeof KANGUR_MUSIC_PIANO_ROLL_RENDERER_IDS)[KangurMusicPianoRollVariantKey];
    screen: (typeof KANGUR_MUSIC_PIANO_ROLL_LAUNCHABLE_RUNTIME_IDS)[KangurMusicPianoRollVariantKey];
    shell: {
      icon: string;
      shellTestId: string;
    };
  }
>;

export const KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS = createVariantKeyRecord(
  (key) => `${KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].gameId}:default`
);

export const KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS = createVariantKeyRecord(
  (key) => `${KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].gameId}:instance:default`
);

export const KANGUR_MUSIC_PIANO_ROLL_BUILT_IN_INSTANCE_CONFIGS = Object.fromEntries(
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => {
    const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];

    return [
      config.gameId,
      {
        contentSetId: KANGUR_MUSIC_PIANO_ROLL_DEFAULT_CONTENT_SET_IDS[key],
        description: config.builtInInstanceDescription,
        id: KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS[key],
        title: config.builtInInstanceTitle,
      },
    ];
  })
) as Record<
  (typeof KANGUR_MUSIC_PIANO_ROLL_GAME_IDS)[KangurMusicPianoRollVariantKey],
  {
    contentSetId: string;
    description: string;
    id: string;
    title: string;
  }
>;

export const KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS = createVariantKeyRecord((key) => ({
  gameScreen: `${KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].gameId}.game-screen`,
  lessonVariant: `${KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key].gameId}.lesson-stage`,
}));

export const KANGUR_MUSIC_PIANO_ROLL_VARIANT_IDS = {
  freePlayGameScreen: KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS.freePlay.gameScreen,
  freePlayLessonVariant: KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS.freePlay.lessonVariant,
  repeatGameScreen: KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS.repeat.gameScreen,
  repeatLessonVariant: KANGUR_MUSIC_PIANO_ROLL_VARIANT_ID_SETS.repeat.lessonVariant,
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_ENGINE_DEFINITIONS =
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => {
    const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];
    return {
      id: config.engineId,
      ...config.engineDefinition,
    };
  }) satisfies readonly KangurGameEngineDefinition[];

export const KANGUR_MUSIC_PIANO_ROLL_ENGINE_IMPLEMENTATIONS =
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => {
    const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];
    return {
      engineId: config.engineId,
      ownership: 'shared_runtime',
      runtimeIds: [config.runtimeComponentId],
      summary: config.engineImplementationSummary,
    };
  }) satisfies readonly KangurGameEngineImplementation[];

export const KANGUR_MUSIC_PIANO_ROLL_LESSON_VARIANT_GAME_CONFIGS =
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => {
    const config = KANGUR_MUSIC_PIANO_ROLL_CONFIGS[key];
    return {
      id: config.gameId,
      engineId: config.engineId,
      launchableRuntimeId: config.launchableRuntimeId,
      ...config.lessonVariantGame,
    };
  }) satisfies readonly KangurMusicPianoRollLessonVariantGameConfig[];
