import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY,
  KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY,
  KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY,
  createLegacyCompatibleLessonShellSchema,
  normalizeLegacyCompatibleLessonSectionGameCopy,
  normalizeLegacyCompatibleLessonShellTitle,
} from '@/shared/contracts/kangur-lesson-templates.shared';

describe('kangur lesson template shared legacy copy helpers', () => {
  it('normalizes legacy section game copy fields and strips the legacy keys', () => {
    const normalized = normalizeLegacyCompatibleLessonSectionGameCopy({
      [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: 'Legacy title',
      [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: 'Legacy description',
      id: 'game_words',
    });

    expect(normalized).toEqual({
      gameTitle: 'Legacy title',
      gameDescription: 'Legacy description',
      id: 'game_words',
    });
    expect(normalized).not.toHaveProperty(KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY);
    expect(normalized).not.toHaveProperty(KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY);
  });

  it('prefers forward section game copy fields over legacy ones during normalization', () => {
    const normalized = normalizeLegacyCompatibleLessonSectionGameCopy({
      gameTitle: 'Forward title',
      gameDescription: 'Forward description',
      [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: 'Legacy title',
      [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: 'Legacy description',
      id: 'game_words',
    });

    expect(normalized).toEqual({
      gameTitle: 'Forward title',
      gameDescription: 'Forward description',
      id: 'game_words',
    });
  });

  it('normalizes legacy shell title fields and strips the legacy key', () => {
    const normalized = normalizeLegacyCompatibleLessonShellTitle({
      [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: 'Legacy shell title',
      accent: 'rose',
    });

    expect(normalized).toEqual({
      gameTitle: 'Legacy shell title',
      accent: 'rose',
    });
    expect(normalized).not.toHaveProperty(KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY);
  });

  it('prefers the forward shell title over the legacy shell title during normalization', () => {
    const normalized = normalizeLegacyCompatibleLessonShellTitle({
      gameTitle: 'Forward shell title',
      [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: 'Legacy shell title',
      accent: 'rose',
    });

    expect(normalized).toEqual({
      gameTitle: 'Forward shell title',
      accent: 'rose',
    });
  });

  it('accepts either a forward or legacy shell title in the shared shell schema builder', () => {
    const schema = createLegacyCompatibleLessonShellSchema(
      { accent: z.string().trim().min(1) },
      'Lesson shell title is required.',
    );

    expect(
      schema.safeParse({
        gameTitle: 'Forward shell title',
        accent: 'rose',
      }).success,
    ).toBe(true);

    expect(
      schema.safeParse({
        [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: 'Legacy shell title',
        accent: 'rose',
      }).success,
    ).toBe(true);
  });

  it('rejects shell schema payloads that provide neither a forward nor legacy title', () => {
    const schema = createLegacyCompatibleLessonShellSchema(
      { accent: z.string().trim().min(1) },
      'Lesson shell title is required.',
    );

    const parsed = schema.safeParse({ accent: 'rose' });

    expect(parsed.success).toBe(false);
    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Lesson shell title is required.' }),
      ]),
    );
  });
});
