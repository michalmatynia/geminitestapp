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
    stageTitle: legacyTitle,
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
          gameStageTitle: legacyTitle,
          gameStageDescription: legacyDescription,
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
    gameStageTitle: repeatTitle,
    gameStageDescription: repeatDescription,
  },
  gameFreeplaySection: {
    ...MUSIC_DIATONIC_SCALE_LESSON_COMPONENT_CONTENT.gameFreeplaySection,
    gameTitle: undefined,
    gameDescription: undefined,
    gameStageTitle: freePlayTitle,
    gameStageDescription: freePlayDescription,
  },
});
