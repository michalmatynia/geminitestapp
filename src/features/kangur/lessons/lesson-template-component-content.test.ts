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
    const resolved = resolveKangurLessonTemplateComponentContent('alphabet_words', {
      kind: 'alphabet_unified',
      sections: [
        {
          id: 'slowa',
          emoji: '📖',
          title: 'Legacy intro',
          description: 'Legacy intro description',
          slides: [],
        },
        {
          id: 'game_words',
          emoji: '🎮',
          title: 'Legacy game',
          description: 'Legacy game description',
          isGame: true,
          slides: [],
          gameStageTitle: 'Legacy game title',
          gameStageDescription: 'Legacy game description',
        },
        {
          id: 'summary',
          emoji: '📋',
          title: 'Legacy summary',
          description: 'Legacy summary description',
          slides: [],
        },
      ],
    });

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
      JSON.stringify({
        ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
        gameRepeatSection: {
          ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameRepeatSection,
          gameTitle: undefined,
          gameDescription: undefined,
          gameStageTitle: 'Legacy repeat game',
          gameStageDescription: 'Legacy repeat description',
        },
        gameFreeplaySection: {
          ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameFreeplaySection,
          gameTitle: undefined,
          gameDescription: undefined,
          gameStageTitle: 'Legacy freeplay game',
          gameStageDescription: 'Legacy freeplay description',
        },
      }),
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

  it('normalizes legacy art shapes stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('art_shapes_basic', {
      ...ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
      game: {
        ...ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT.game,
        gameTitle: undefined,
        stageTitle: 'Legacy art shapes game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'art_shapes_basic',
      game: {
        gameTitle: 'Legacy art shapes game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy geometry stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('geometry_basics', {
      ...GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy geometry game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'geometry_basics',
      game: {
        gameTitle: 'Legacy geometry game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy geometry shapes stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('geometry_shapes', {
      ...GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy geometry shapes game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'geometry_shapes',
      game: {
        gameTitle: 'Legacy geometry shapes game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy geometry shape recognition draw stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent(
      'geometry_shape_recognition',
      {
        ...GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
        draw: {
          ...GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT.draw,
          gameTitle: undefined,
          stageTitle: 'Legacy geometry draw game title',
        },
      },
    );

    expect(resolved).toMatchObject({
      kind: 'geometry_shape_recognition',
      draw: {
        gameTitle: 'Legacy geometry draw game title',
      },
    });
    expect(resolved?.draw).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy geometry symmetry stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('geometry_symmetry', {
      ...GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy geometry symmetry game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'geometry_symmetry',
      game: {
        gameTitle: 'Legacy geometry symmetry game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy logical classification stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('logical_classification', {
      ...LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy logical classification game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'logical_classification',
      game: {
        gameTitle: 'Legacy logical classification game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy logical patterns stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('logical_patterns', {
      ...LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy logical patterns game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'logical_patterns',
      game: {
        gameTitle: 'Legacy logical patterns game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy logical analogies stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('logical_analogies', {
      ...LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy logical analogies game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'logical_analogies',
      game: {
        gameTitle: 'Legacy logical analogies game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy adding stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('adding', {
      ...ADDING_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy adding game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'adding',
      game: {
        gameTitle: 'Legacy adding game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy adding synthesis stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('adding', {
      ...ADDING_LESSON_COMPONENT_CONTENT,
      synthesis: {
        gameTitle: undefined,
        stageTitle: 'Legacy adding synthesis title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'adding',
      synthesis: {
        gameTitle: 'Legacy adding synthesis title',
      },
    });
    expect(resolved?.synthesis).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy multiplication stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('multiplication', {
      ...MULTIPLICATION_LESSON_COMPONENT_CONTENT,
      game: {
        ...MULTIPLICATION_LESSON_COMPONENT_CONTENT.game,
        gameTitle: undefined,
        stageTitle: 'Legacy multiplication game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'multiplication',
      game: {
        gameTitle: 'Legacy multiplication game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy subtracting stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('subtracting', {
      ...SUBTRACTING_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy subtracting game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'subtracting',
      game: {
        gameTitle: 'Legacy subtracting game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('normalizes legacy division stageTitle fields when resolving template content', () => {
    const resolved = resolveKangurLessonTemplateComponentContent('division', {
      ...DIVISION_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy division game title',
      },
    });

    expect(resolved).toMatchObject({
      kind: 'division',
      game: {
        gameTitle: 'Legacy division game title',
      },
    });
    expect(resolved?.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy gameStage fields as normalized gameTitle fields', () => {
    const serializedAlphabet = serializeKangurLessonTemplateComponentContent('alphabet_words', {
      kind: 'alphabet_unified',
      sections: [
        {
          id: 'slowa',
          emoji: '📖',
          title: 'Legacy intro',
          description: 'Legacy intro description',
          slides: [],
        },
        {
          id: 'game_words',
          emoji: '🎮',
          title: 'Legacy game',
          description: 'Legacy game description',
          isGame: true,
          slides: [],
          gameStageTitle: 'Legacy serialized game title',
          gameStageDescription: 'Legacy serialized game description',
        },
        {
          id: 'summary',
          emoji: '📋',
          title: 'Legacy summary',
          description: 'Legacy summary description',
          slides: [],
        },
      ],
    });
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
      {
        ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
        gameRepeatSection: {
          ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameRepeatSection,
          gameTitle: undefined,
          gameDescription: undefined,
          gameStageTitle: 'Legacy serialized repeat game',
          gameStageDescription: 'Legacy serialized repeat description',
        },
        gameFreeplaySection: {
          ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameFreeplaySection,
          gameTitle: undefined,
          gameDescription: undefined,
          gameStageTitle: 'Legacy serialized freeplay game',
          gameStageDescription: 'Legacy serialized freeplay description',
        },
      },
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

  it('serializes legacy art shapes stageTitle fields as normalized gameTitle fields', () => {
    const serializedArtShapes = serializeKangurLessonTemplateComponentContent(
      'art_shapes_basic',
      {
        ...ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT,
        game: {
          ...ART_SHAPES_BASIC_LESSON_COMPONENT_CONTENT.game,
          gameTitle: undefined,
          stageTitle: 'Legacy serialized art shapes title',
        },
      },
    );
    const serializedArtShapesJson = JSON.parse(serializedArtShapes) as {
      game: Record<string, unknown>;
    };

    expect(serializedArtShapesJson.game).toMatchObject({
      gameTitle: 'Legacy serialized art shapes title',
    });
    expect(serializedArtShapesJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy geometry stageTitle fields as normalized gameTitle fields', () => {
    const serializedGeometry = serializeKangurLessonTemplateComponentContent('geometry_basics', {
      ...GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy serialized geometry title',
        progress: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.progress,
        missingTileLabel: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.missingTileLabel,
        tileLabel: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.tileLabel,
        chooseOption: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.chooseOption,
        glyphs: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.glyphs,
        tempos: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.tempos,
        optionFeedback: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.optionFeedback,
        finished: GEOMETRY_BASICS_LESSON_COMPONENT_CONTENT.game.finished,
      },
    });
    const serializedGeometryJson = JSON.parse(serializedGeometry) as {
      game: Record<string, unknown>;
    };

    expect(serializedGeometryJson.game).toMatchObject({
      gameTitle: 'Legacy serialized geometry title',
    });
    expect(serializedGeometryJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy geometry shapes stageTitle fields as normalized gameTitle fields', () => {
    const serializedGeometryShapes = serializeKangurLessonTemplateComponentContent(
      'geometry_shapes',
      {
        ...GEOMETRY_SHAPES_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized geometry shapes title',
        },
      },
    );
    const serializedGeometryShapesJson = JSON.parse(serializedGeometryShapes) as {
      game: Record<string, unknown>;
    };

    expect(serializedGeometryShapesJson.game).toMatchObject({
      gameTitle: 'Legacy serialized geometry shapes title',
    });
    expect(serializedGeometryShapesJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy geometry shape recognition draw stageTitle fields as normalized gameTitle fields', () => {
    const serializedGeometryShapeRecognition =
      serializeKangurLessonTemplateComponentContent('geometry_shape_recognition', {
        ...GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT,
        draw: {
          ...GEOMETRY_SHAPE_RECOGNITION_LESSON_COMPONENT_CONTENT.draw,
          gameTitle: undefined,
          stageTitle: 'Legacy serialized geometry draw title',
        },
      });
    const serializedGeometryShapeRecognitionJson = JSON.parse(
      serializedGeometryShapeRecognition,
    ) as {
      draw: Record<string, unknown>;
    };

    expect(serializedGeometryShapeRecognitionJson.draw).toMatchObject({
      gameTitle: 'Legacy serialized geometry draw title',
    });
    expect(serializedGeometryShapeRecognitionJson.draw).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy geometry symmetry stageTitle fields as normalized gameTitle fields', () => {
    const serializedGeometrySymmetry = serializeKangurLessonTemplateComponentContent(
      'geometry_symmetry',
      {
        ...GEOMETRY_SYMMETRY_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized geometry symmetry title',
        },
      },
    );
    const serializedGeometrySymmetryJson = JSON.parse(serializedGeometrySymmetry) as {
      game: Record<string, unknown>;
    };

    expect(serializedGeometrySymmetryJson.game).toMatchObject({
      gameTitle: 'Legacy serialized geometry symmetry title',
    });
    expect(serializedGeometrySymmetryJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy logical classification stageTitle fields as normalized gameTitle fields', () => {
    const serializedLogicalClassification = serializeKangurLessonTemplateComponentContent(
      'logical_classification',
      {
        ...LOGICAL_CLASSIFICATION_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized logical classification title',
        },
      },
    );
    const serializedLogicalClassificationJson = JSON.parse(
      serializedLogicalClassification,
    ) as {
      game: Record<string, unknown>;
    };

    expect(serializedLogicalClassificationJson.game).toMatchObject({
      gameTitle: 'Legacy serialized logical classification title',
    });
    expect(serializedLogicalClassificationJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy logical patterns stageTitle fields as normalized gameTitle fields', () => {
    const serializedLogicalPatterns = serializeKangurLessonTemplateComponentContent(
      'logical_patterns',
      {
        ...LOGICAL_PATTERNS_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized logical patterns title',
        },
      },
    );
    const serializedLogicalPatternsJson = JSON.parse(serializedLogicalPatterns) as {
      game: Record<string, unknown>;
    };

    expect(serializedLogicalPatternsJson.game).toMatchObject({
      gameTitle: 'Legacy serialized logical patterns title',
    });
    expect(serializedLogicalPatternsJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy logical analogies stageTitle fields as normalized gameTitle fields', () => {
    const serializedLogicalAnalogies = serializeKangurLessonTemplateComponentContent(
      'logical_analogies',
      {
        ...LOGICAL_ANALOGIES_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized logical analogies title',
        },
      },
    );
    const serializedLogicalAnalogiesJson = JSON.parse(serializedLogicalAnalogies) as {
      game: Record<string, unknown>;
    };

    expect(serializedLogicalAnalogiesJson.game).toMatchObject({
      gameTitle: 'Legacy serialized logical analogies title',
    });
    expect(serializedLogicalAnalogiesJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy adding stageTitle fields as normalized gameTitle fields', () => {
    const serializedAdding = serializeKangurLessonTemplateComponentContent('adding', {
      ...ADDING_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy serialized adding title',
      },
    });
    const serializedAddingJson = JSON.parse(serializedAdding) as {
      game: Record<string, unknown>;
    };

    expect(serializedAddingJson.game).toMatchObject({
      gameTitle: 'Legacy serialized adding title',
    });
    expect(serializedAddingJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy adding synthesis stageTitle fields as normalized gameTitle fields', () => {
    const serializedAdding = serializeKangurLessonTemplateComponentContent('adding', {
      ...ADDING_LESSON_COMPONENT_CONTENT,
      synthesis: {
        gameTitle: undefined,
        stageTitle: 'Legacy serialized adding synthesis title',
      },
    });
    const serializedAddingJson = JSON.parse(serializedAdding) as {
      synthesis: Record<string, unknown>;
    };

    expect(serializedAddingJson.synthesis).toMatchObject({
      gameTitle: 'Legacy serialized adding synthesis title',
    });
    expect(serializedAddingJson.synthesis).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy multiplication stageTitle fields as normalized gameTitle fields', () => {
    const serializedMultiplication = serializeKangurLessonTemplateComponentContent(
      'multiplication',
      {
        ...MULTIPLICATION_LESSON_COMPONENT_CONTENT,
        game: {
          ...MULTIPLICATION_LESSON_COMPONENT_CONTENT.game,
          gameTitle: undefined,
          stageTitle: 'Legacy serialized multiplication title',
        },
      },
    );
    const serializedMultiplicationJson = JSON.parse(serializedMultiplication) as {
      game: Record<string, unknown>;
    };

    expect(serializedMultiplicationJson.game).toMatchObject({
      gameTitle: 'Legacy serialized multiplication title',
    });
    expect(serializedMultiplicationJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy subtracting stageTitle fields as normalized gameTitle fields', () => {
    const serializedSubtracting = serializeKangurLessonTemplateComponentContent(
      'subtracting',
      {
        ...SUBTRACTING_LESSON_COMPONENT_CONTENT,
        game: {
          gameTitle: undefined,
          stageTitle: 'Legacy serialized subtracting title',
        },
      },
    );
    const serializedSubtractingJson = JSON.parse(serializedSubtracting) as {
      game: Record<string, unknown>;
    };

    expect(serializedSubtractingJson.game).toMatchObject({
      gameTitle: 'Legacy serialized subtracting title',
    });
    expect(serializedSubtractingJson.game).not.toHaveProperty('stageTitle');
  });

  it('serializes legacy division stageTitle fields as normalized gameTitle fields', () => {
    const serializedDivision = serializeKangurLessonTemplateComponentContent('division', {
      ...DIVISION_LESSON_COMPONENT_CONTENT,
      game: {
        gameTitle: undefined,
        stageTitle: 'Legacy serialized division title',
      },
    });
    const serializedDivisionJson = JSON.parse(serializedDivision) as {
      game: Record<string, unknown>;
    };

    expect(serializedDivisionJson.game).toMatchObject({
      gameTitle: 'Legacy serialized division title',
    });
    expect(serializedDivisionJson.game).not.toHaveProperty('stageTitle');
  });
});
