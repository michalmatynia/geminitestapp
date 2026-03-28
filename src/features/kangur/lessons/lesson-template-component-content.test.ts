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
});
