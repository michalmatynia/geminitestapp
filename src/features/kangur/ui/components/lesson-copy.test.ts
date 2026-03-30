import { describe, expect, it, vi } from 'vitest';

import { KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY } from '@/shared/contracts/kangur-lesson-templates.shared';
import type { LessonTranslate } from './lesson-copy';
import { getLessonShellTitleKeys, translateLessonShellTitle } from './lesson-copy';

type LessonTranslateWithHas = LessonTranslate & { has: (key: string) => boolean };

const createTranslate = (messages: Record<string, string>): LessonTranslateWithHas => {
  const translate = ((key: string) => messages[key] ?? key) as LessonTranslateWithHas;
  translate.has = (key: string) => key in messages;
  return translate;
};

describe('translateLessonShellTitle', () => {
  it('prefers the forward gameTitle key', () => {
    const keys = getLessonShellTitleKeys('game');
    const translate = createTranslate({
      [keys.forward]: 'Forward title',
      [keys.legacy]: 'Legacy title',
    });

    expect(translateLessonShellTitle(translate, 'game', 'Fallback title')).toBe('Forward title');
  });

  it(`falls back to the legacy ${KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY} key`, () => {
    const keys = getLessonShellTitleKeys('draw');
    const translate = createTranslate({
      [keys.legacy]: 'Legacy draw title',
    });

    expect(translateLessonShellTitle(translate, 'draw', 'Fallback title')).toBe(
      'Legacy draw title',
    );
  });

  it('returns the provided fallback when neither key resolves', () => {
    const translate = createTranslate({});

    expect(translateLessonShellTitle(translate, 'synthesis', 'Fallback title')).toBe(
      'Fallback title',
    );
  });

  it('does not probe the forward key when has() reports that only the legacy key exists', () => {
    const keys = getLessonShellTitleKeys('draw');
    const translate = vi.fn(
      ((key: string) =>
        ({
          [keys.legacy]: 'Legacy draw title',
        })[key] ?? key) as LessonTranslate,
    ) as LessonTranslateWithHas & ReturnType<typeof vi.fn>;

    translate.has = (key: string) => key === keys.legacy;

    expect(translateLessonShellTitle(translate, 'draw', 'Fallback title')).toBe(
      'Legacy draw title',
    );
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith(keys.legacy);
  });

  it('still falls back to the legacy key when the translator does not expose has()', () => {
    const keys = getLessonShellTitleKeys('synthesis');
    const translate = vi.fn(
      ((key: string) =>
        ({
          [keys.legacy]: 'Legacy synthesis title',
        })[key] ?? key) as LessonTranslate,
    );

    expect(translateLessonShellTitle(translate, 'synthesis', 'Fallback title')).toBe(
      'Legacy synthesis title',
    );
    expect(translate).toHaveBeenNthCalledWith(1, keys.forward);
    expect(translate).toHaveBeenNthCalledWith(2, keys.legacy);
  });
});
