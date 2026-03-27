import { describe, expect, it } from 'vitest';

import {
  ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  getDefaultKangurLessonTemplateComponentContent,
  parseKangurLessonTemplateComponentContentJson,
  serializeKangurLessonTemplateComponentContent,
  supportsKangurLessonTemplateComponentContent,
} from './lesson-template-component-content';

describe('lesson-template-component-content', () => {
  it('returns default component content for supported alphabet lessons', () => {
    expect(supportsKangurLessonTemplateComponentContent('alphabet_words')).toBe(true);
    expect(getDefaultKangurLessonTemplateComponentContent('alphabet_words')).toEqual(
      ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
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
