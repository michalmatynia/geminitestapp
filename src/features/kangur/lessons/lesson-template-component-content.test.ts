import { describe, expect, it } from 'vitest';

import {
  ADDING_LESSON_COMPONENT_CONTENT,
  ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
  DIVISION_LESSON_COMPONENT_CONTENT,
  GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
  GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
  LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
  LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
  LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
  LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
  LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
  MULTIPLICATION_LESSON_COMPONENT_CONTENT,
  MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
  SUBTRACTING_LESSON_COMPONENT_CONTENT,
  getDefaultKangurLessonTemplateComponentContent,
  resolveKangurLessonTemplateComponentContent,
  parseKangurLessonTemplateComponentContentJson,
  serializeKangurLessonTemplateComponentContent,
  supportsKangurLessonTemplateComponentContent,
} from './lesson-template-component-content';
import {
  withLegacyLessonShellTitle,
  withLegacyAlphabetWordsGameCopy,
  withLegacyMusicDiatonicScaleGameCopy,
} from './legacy-component-content.test-helpers';

type LegacyShellKey = 'game' | 'draw' | 'synthesis';

type LegacyShellContent = Record<string, unknown> &
  Partial<Record<LegacyShellKey, Record<string, unknown>>>;

const legacyShellNormalizationCases = [
  {
    label: 'art shapes',
    componentId: 'art_shapes_basic',
    kind: 'art_shapes_basic',
    content: ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy art shapes game title',
    serializedLegacyTitle: 'Legacy serialized art shapes title',
  },
  {
    label: 'geometry',
    componentId: 'geometry_basics',
    kind: 'geometry_basics',
    content: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy geometry game title',
    serializedLegacyTitle: 'Legacy serialized geometry title',
  },
  {
    label: 'geometry shapes',
    componentId: 'geometry_shapes',
    kind: 'geometry_shapes',
    content: GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy geometry shapes game title',
    serializedLegacyTitle: 'Legacy serialized geometry shapes title',
  },
  {
    label: 'geometry shape recognition draw',
    componentId: 'geometry_shape_recognition',
    kind: 'geometry_shape_recognition',
    content: GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
    shellKey: 'draw',
    resolveLegacyTitle: 'Legacy geometry draw game title',
    serializedLegacyTitle: 'Legacy serialized geometry draw title',
  },
  {
    label: 'geometry symmetry',
    componentId: 'geometry_symmetry',
    kind: 'geometry_symmetry',
    content: GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy geometry symmetry game title',
    serializedLegacyTitle: 'Legacy serialized geometry symmetry title',
  },
  {
    label: 'logical classification',
    componentId: 'logical_classification',
    kind: 'logical_classification',
    content: LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy logical classification game title',
    serializedLegacyTitle: 'Legacy serialized logical classification title',
  },
  {
    label: 'logical patterns',
    componentId: 'logical_patterns',
    kind: 'logical_patterns',
    content: LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy logical patterns game title',
    serializedLegacyTitle: 'Legacy serialized logical patterns title',
  },
  {
    label: 'logical analogies',
    componentId: 'logical_analogies',
    kind: 'logical_analogies',
    content: LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy logical analogies game title',
    serializedLegacyTitle: 'Legacy serialized logical analogies title',
  },
  {
    label: 'adding',
    componentId: 'adding',
    kind: 'adding',
    content: ADDING_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy adding game title',
    serializedLegacyTitle: 'Legacy serialized adding title',
  },
  {
    label: 'adding synthesis',
    componentId: 'adding',
    kind: 'adding',
    content: ADDING_LESSON_COMPONENT_CONTENT,
    shellKey: 'synthesis',
    resolveLegacyTitle: 'Legacy adding synthesis title',
    serializedLegacyTitle: 'Legacy serialized adding synthesis title',
  },
  {
    label: 'multiplication',
    componentId: 'multiplication',
    kind: 'multiplication',
    content: MULTIPLICATION_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy multiplication game title',
    serializedLegacyTitle: 'Legacy serialized multiplication title',
  },
  {
    label: 'subtracting',
    componentId: 'subtracting',
    kind: 'subtracting',
    content: SUBTRACTING_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy subtracting game title',
    serializedLegacyTitle: 'Legacy serialized subtracting title',
  },
  {
    label: 'division',
    componentId: 'division',
    kind: 'division',
    content: DIVISION_LESSON_COMPONENT_CONTENT,
    shellKey: 'game',
    resolveLegacyTitle: 'Legacy division game title',
    serializedLegacyTitle: 'Legacy serialized division title',
  },
] as const satisfies ReadonlyArray<{
  label: string;
  componentId: string;
  kind: string;
  content: LegacyShellContent;
  shellKey: LegacyShellKey;
  resolveLegacyTitle: string;
  serializedLegacyTitle: string;
}>;

describe('lesson-template-component-content', () => {
  it('returns default component content for supported alphabet lessons', () => {
    expect(supportsKangurLessonTemplateComponentContent('alphabet_words')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('art_shapes_basic')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('adding')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('subtracting')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('multiplication')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('division')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('geometry_basics')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('geometry_shape_recognition')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('geometry_shapes')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('geometry_symmetry')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('logical_analogies')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('logical_classification')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('logical_patterns')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('logical_reasoning')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('logical_thinking')).toBe(true);
    expect(supportsKangurLessonTemplateComponentContent('music_diatonic_scale')).toBe(true);
    expect(getDefaultKangurLessonTemplateComponentContent('alphabet_words')).toEqual(
      ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('art_shapes_basic')).toEqual(
      ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('adding')).toEqual(
      ADDING_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('subtracting')).toEqual(
      SUBTRACTING_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('multiplication')).toEqual(
      MULTIPLICATION_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('division')).toEqual(
      DIVISION_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('geometry_basics')).toEqual(
      GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('geometry_shape_recognition')).toEqual(
      GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('geometry_shapes')).toEqual(
      GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('geometry_symmetry')).toEqual(
      GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('logical_analogies')).toEqual(
      LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('logical_classification')).toEqual(
      LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('logical_patterns')).toEqual(
      LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('logical_reasoning')).toEqual(
      LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('logical_thinking')).toEqual(
      LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('music_diatonic_scale')).toEqual(
      MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
    );
    expect(getDefaultKangurLessonTemplateComponentContent('clock')).toBeNull();
  });

  it('serializes and parses component content JSON for supported lessons', () => {
    const serialized = serializeKangurLessonTemplateComponentContent(
      'alphabet_words',
      ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
    );

    expect(parseKangurLessonTemplateComponentContentJson('alphabet_words', serialized)).toEqual(
      ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
    );

    const musicSerialized = serializeKangurLessonTemplateComponentContent(
      'music_diatonic_scale',
      MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson('music_diatonic_scale', musicSerialized),
    ).toEqual(MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT);

    const artSerialized = serializeKangurLessonTemplateComponentContent(
      'art_shapes_basic',
      ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
    );

    expect(parseKangurLessonTemplateComponentContentJson('art_shapes_basic', artSerialized)).toEqual(
      ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
    );

    const multiplicationSerialized = serializeKangurLessonTemplateComponentContent(
      'multiplication',
      MULTIPLICATION_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson('multiplication', multiplicationSerialized),
    ).toEqual(MULTIPLICATION_LESSON_COMPONENT_CONTENT);

    const addingSerialized = serializeKangurLessonTemplateComponentContent(
      'adding',
      ADDING_LESSON_COMPONENT_CONTENT,
    );

    expect(parseKangurLessonTemplateComponentContentJson('adding', addingSerialized)).toEqual(
      ADDING_LESSON_COMPONENT_CONTENT,
    );

    const subtractingSerialized = serializeKangurLessonTemplateComponentContent(
      'subtracting',
      SUBTRACTING_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson('subtracting', subtractingSerialized),
    ).toEqual(SUBTRACTING_LESSON_COMPONENT_CONTENT);

    const divisionSerialized = serializeKangurLessonTemplateComponentContent(
      'division',
      DIVISION_LESSON_COMPONENT_CONTENT,
    );

    expect(parseKangurLessonTemplateComponentContentJson('division', divisionSerialized)).toEqual(
      DIVISION_LESSON_COMPONENT_CONTENT,
    );

    const geometrySerialized = serializeKangurLessonTemplateComponentContent(
      'geometry_basics',
      GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson('geometry_basics', geometrySerialized),
    ).toEqual(GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT);

    const geometryShapeRecognitionSerialized = serializeKangurLessonTemplateComponentContent(
      'geometry_shape_recognition',
      GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'geometry_shape_recognition',
        geometryShapeRecognitionSerialized,
      ),
    ).toEqual(GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT);

    const geometryShapesSerialized = serializeKangurLessonTemplateComponentContent(
      'geometry_shapes',
      GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson('geometry_shapes', geometryShapesSerialized),
    ).toEqual(GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT);

    const geometrySymmetrySerialized = serializeKangurLessonTemplateComponentContent(
      'geometry_symmetry',
      GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'geometry_symmetry',
        geometrySymmetrySerialized,
      ),
    ).toEqual(GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT);

    const logicalAnalogiesSerialized = serializeKangurLessonTemplateComponentContent(
      'logical_analogies',
      LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'logical_analogies',
        logicalAnalogiesSerialized,
      ),
    ).toEqual(LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT);

    const logicalClassificationSerialized = serializeKangurLessonTemplateComponentContent(
      'logical_classification',
      LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'logical_classification',
        logicalClassificationSerialized,
      ),
    ).toEqual(LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT);

    const logicalPatternsSerialized = serializeKangurLessonTemplateComponentContent(
      'logical_patterns',
      LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'logical_patterns',
        logicalPatternsSerialized,
      ),
    ).toEqual(LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT);

    const logicalReasoningSerialized = serializeKangurLessonTemplateComponentContent(
      'logical_reasoning',
      LOGICAL_REASONING_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'logical_reasoning',
        logicalReasoningSerialized,
      ),
    ).toEqual(LOGICAL_REASONING_LESSON_COMPONENT_CONTENT);

    const logicalThinkingSerialized = serializeKangurLessonTemplateComponentContent(
      'logical_thinking',
      LOGICAL_THINKING_LESSON_COMPONENT_CONTENT,
    );

    expect(
      parseKangurLessonTemplateComponentContentJson(
        'logical_thinking',
        logicalThinkingSerialized,
      ),
    ).toEqual(LOGICAL_THINKING_LESSON_COMPONENT_CONTENT);
  });

  it('rejects alphabet unified payloads with mismatched section ids', () => {
    const invalidJson = JSON.stringify({
      ...ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
      sections: [
        ...ALPHABET_WORDS_LESSON_COMPONENT_CONTENT.sections.slice(0, -1),
        {
          id: 'unexpected',
          emoji: '📋',
          title: 'Bad section',
          description: 'Wrong shape',
          slides: [],
        },
      ],
    });

    expect(() =>
      parseKangurLessonTemplateComponentContentJson('alphabet_words', invalidJson),
    ).toThrow('Section ids must match the lesson family template.');
  });

  it('normalizes legacy alphabet gameStage fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent(
      'alphabet_words',
      withLegacyAlphabetWordsGameCopy('Legacy game title', 'Legacy game description'),
    );

    expect(resolved).toMatchObject({
      kind: 'alphabet_unified',
      sections: expect.arrayContaining([
        expect.objectContaining({
          id: 'game_words',
          gameTitle: 'Legacy game title',
          gameDescription: 'Legacy game description',
        }),
      ]),
    });

    const normalizedGameSection =
      resolved?.kind === 'alphabet_unified'
        ? resolved.sections.find((section) => section.id === 'game_words')
        : null;

    expect(normalizedGameSection).not.toHaveProperty('gameStageTitle');
    expect(normalizedGameSection).not.toHaveProperty('gameStageDescription');
  });

  it('normalizes legacy music gameStage fields during JSON parsing', () => {
    const parsed = parseKangurLessonTemplateComponentContentJson(
      'music_diatonic_scale',
      JSON.stringify(
        withLegacyMusicDiatonicScaleGameCopy(
          'Legacy repeat game',
          'Legacy repeat description',
          'Legacy freeplay game',
          'Legacy freeplay description',
        ),
      ),
    );

    expect(parsed).toMatchObject({
      kind: 'music_diatonic_scale',
      gameRepeatSection: {
        gameTitle: 'Legacy repeat game',
        gameDescription: 'Legacy repeat description',
      },
      gameFreeplaySection: {
        gameTitle: 'Legacy freeplay game',
        gameDescription: 'Legacy freeplay description',
      },
    });

    expect(parsed?.gameRepeatSection).not.toHaveProperty('gameStageTitle');
    expect(parsed?.gameRepeatSection).not.toHaveProperty('gameStageDescription');
    expect(parsed?.gameFreeplaySection).not.toHaveProperty('gameStageTitle');
    expect(parsed?.gameFreeplaySection).not.toHaveProperty('gameStageDescription');
  });

  legacyShellNormalizationCases.forEach(
    ({ componentId, kind, content, label, shellKey, resolveLegacyTitle }) => {
      it(`normalizes legacy ${label} stageTitle fields when resolving template content`, () => {
        const resolved = resolveKangurLessonTemplateComponentContent(
          componentId,
          withLegacyLessonShellTitle(content, shellKey, resolveLegacyTitle) as never,
        );

        expect(resolved).toMatchObject({
          kind,
          [shellKey]: {
            gameTitle: resolveLegacyTitle,
          },
        });
        expect((resolved as Record<string, unknown> | null)?.[shellKey]).not.toHaveProperty(
          'stageTitle',
        );
      });
    },
  );

  it('serializes legacy gameStage fields as normalized gameTitle fields', () => {
    const serializedAlphabet = serializeKangurLessonTemplateComponentContent(
      'alphabet_words',
      withLegacyAlphabetWordsGameCopy(
        'Legacy serialized game title',
        'Legacy serialized game description',
      ),
    );
    const serializedAlphabetJson = JSON.parse(serializedAlphabet) as {
      sections: Array<Record<string, unknown>>;
    };
    const serializedAlphabetGameSection = serializedAlphabetJson.sections.find(
      (section) => section.id === 'game_words',
    );

    expect(serializedAlphabetGameSection).toMatchObject({
      gameTitle: 'Legacy serialized game title',
      gameDescription: 'Legacy serialized game description',
    });
    expect(serializedAlphabetGameSection).not.toHaveProperty('gameStageTitle');
    expect(serializedAlphabetGameSection).not.toHaveProperty('gameStageDescription');

    const serializedMusic = serializeKangurLessonTemplateComponentContent(
      'music_diatonic_scale',
      withLegacyMusicDiatonicScaleGameCopy(
        'Legacy serialized repeat game',
        'Legacy serialized repeat description',
        'Legacy serialized freeplay game',
        'Legacy serialized freeplay description',
      ),
    );
    const serializedMusicJson = JSON.parse(serializedMusic) as {
      gameRepeatSection: Record<string, unknown>;
      gameFreeplaySection: Record<string, unknown>;
    };

    expect(serializedMusicJson.gameRepeatSection).toMatchObject({
      gameTitle: 'Legacy serialized repeat game',
      gameDescription: 'Legacy serialized repeat description',
    });
    expect(serializedMusicJson.gameRepeatSection).not.toHaveProperty('gameStageTitle');
    expect(serializedMusicJson.gameRepeatSection).not.toHaveProperty('gameStageDescription');
    expect(serializedMusicJson.gameFreeplaySection).toMatchObject({
      gameTitle: 'Legacy serialized freeplay game',
      gameDescription: 'Legacy serialized freeplay description',
    });
    expect(serializedMusicJson.gameFreeplaySection).not.toHaveProperty('gameStageTitle');
    expect(serializedMusicJson.gameFreeplaySection).not.toHaveProperty('gameStageDescription');
  });

  legacyShellNormalizationCases.forEach(
    ({ componentId, content, label, shellKey, serializedLegacyTitle }) => {
      it(`serializes legacy ${label} stageTitle fields as normalized gameTitle fields`, () => {
        const serialized = serializeKangurLessonTemplateComponentContent(
          componentId,
          withLegacyLessonShellTitle(content, shellKey, serializedLegacyTitle) as never,
        );
        const serializedJson = JSON.parse(serialized) as Record<string, Record<string, unknown>>;

        expect(serializedJson[shellKey]).toMatchObject({
          gameTitle: serializedLegacyTitle,
        });
        expect(serializedJson[shellKey]).not.toHaveProperty('stageTitle');
      });
    },
  );
});
