import {
  KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY,
  KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY,
  KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY,
} from '@/shared/contracts/kangur-lesson-templates.shared';
import {
  ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
} from './lesson-template-component-content';

type LegacyShellContent = Record<string, unknown> & Record<string, Record<string, unknown> | unknown>;

export const withLegacyLessonShellTitle = (
  content: LegacyShellContent,
  shellKey: string,
  legacyTitle: string,
) => ({
  ...content,
  [shellKey]: {
    ...(content[shellKey] as Record<string, unknown> | undefined),
    gameTitle: undefined,
    [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: legacyTitle,
  },
});

export const withLegacyAlphabetWordsGameCopy = (
  legacyTitle: string,
  legacyDescription: string,
) => ({
  ...ALPHABET_WORDS_LESSON_COMPONENT_CONTENT,
  sections: ALPHABET_WORDS_LESSON_COMPONENT_CONTENT.sections.map((section) =>
    section.id === 'game_words'
      ? {
          ...section,
          gameTitle: undefined,
          gameDescription: undefined,
          [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: legacyTitle,
          [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: legacyDescription,
        }
      : section,
  ),
});

export const withLegacyMusicDiatonicScaleGameCopy = (
  repeatTitle: string,
  repeatDescription: string,
  freePlayTitle: string,
  freePlayDescription: string,
) => ({
  ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT,
  gameRepeatSection: {
    ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameRepeatSection,
    gameTitle: undefined,
    gameDescription: undefined,
    [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: repeatTitle,
    [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: repeatDescription,
  },
  gameFreeplaySection: {
    ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameFreeplaySection,
    gameTitle: undefined,
    gameDescription: undefined,
    [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: freePlayTitle,
    [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: freePlayDescription,
  },
});
