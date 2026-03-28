import { z } from 'zod';

// ---------------------------------------------------------------------------
// Lesson template — the catalog definition for a lesson type
// ---------------------------------------------------------------------------

export const kangurLessonTemplateSlideContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  lead: z.string().trim().min(1).max(240),
  caption: z.string().trim().min(1).max(240).optional(),
});

const kangurOptionalLessonTitleSchema = z.string().trim().min(1).max(120).optional();
const kangurOptionalLessonDescriptionSchema = z.string().trim().min(1).max(240).optional();

export const KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY = 'stageTitle' as const;
export const KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY = 'gameStageTitle' as const;
export const KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY = 'gameStageDescription' as const;
export const KANGUR_LEGACY_LESSON_SECTION_GAME_COPY_KEYS = [
  KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY,
  KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY,
] as const;
export const KANGUR_LEGACY_LESSON_TITLE_KEYS = [
  KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY,
  ...KANGUR_LEGACY_LESSON_SECTION_GAME_COPY_KEYS,
] as const;

type KangurLegacyLessonSectionGameCopyKey =
  (typeof KANGUR_LEGACY_LESSON_SECTION_GAME_COPY_KEYS)[number];

export const kangurLegacyCompatibleLessonSectionGameCopyShape = {
  gameTitle: kangurOptionalLessonTitleSchema,
  gameDescription: kangurOptionalLessonDescriptionSchema,
  [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: kangurOptionalLessonTitleSchema,
  [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: kangurOptionalLessonDescriptionSchema,
} satisfies z.ZodRawShape;

export type LegacyCompatibleLessonSectionGameCopy = {
  gameTitle?: string;
  gameDescription?: string;
} & Partial<Record<KangurLegacyLessonSectionGameCopyKey, string>>;

export const kangurLessonTemplateSectionContentSchema = z.object({
  id: z.string().trim().min(1).max(64),
  emoji: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  isGame: z.boolean().optional(),
  slides: z.array(kangurLessonTemplateSlideContentSchema).default([]),
  ...kangurLegacyCompatibleLessonSectionGameCopyShape,
});

export const hasForwardOrLegacyGameTitle = (
  value: {
    gameTitle?: unknown;
    [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]?: unknown;
  }
): boolean => {
  const gameTitle = typeof value.gameTitle === 'string' ? value.gameTitle : undefined;
  const legacyTitle =
    typeof value[KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY] === 'string'
      ? value[KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]
      : undefined;

  return Boolean(gameTitle ?? legacyTitle);
};

export const kangurLegacyCompatibleLessonShellTitleShape = {
  gameTitle: kangurOptionalLessonTitleSchema,
  [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: kangurOptionalLessonTitleSchema,
} satisfies z.ZodRawShape;

export type LegacyCompatibleLessonShellTitle = {
  gameTitle?: string;
} & Partial<Record<typeof KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY, string>>;

export const createLegacyCompatibleLessonShellSchema = <T extends z.ZodRawShape>(
  shape: T,
  message: string,
) =>
  z
    .object({
      ...kangurLegacyCompatibleLessonShellTitleShape,
      ...shape,
    })
    .refine(hasForwardOrLegacyGameTitle, { message });

export const normalizeLegacyCompatibleLessonSectionGameCopy = <
  T extends LegacyCompatibleLessonSectionGameCopy,
>(
  value: T,
): Omit<T, KangurLegacyLessonSectionGameCopyKey> & {
  gameTitle?: string;
  gameDescription?: string;
} => {
  const {
    [KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY]: _legacyGameStageDescription,
    [KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY]: _legacyGameStageTitle,
    ...normalizedValue
  } = value;

  return {
    ...normalizedValue,
    gameDescription:
      value.gameDescription ?? value[KANGUR_LEGACY_LESSON_SECTION_GAME_DESCRIPTION_KEY],
    gameTitle: value.gameTitle ?? value[KANGUR_LEGACY_LESSON_SECTION_GAME_TITLE_KEY],
  };
};

export const normalizeLegacyCompatibleLessonShellTitle = <
  T extends LegacyCompatibleLessonShellTitle,
>(
  value: T,
): Omit<T, typeof KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY> & {
  gameTitle?: string;
} => {
  const { [KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY]: _legacyStageTitle, ...normalizedValue } = value;

  return {
    ...normalizedValue,
    gameTitle: value.gameTitle ?? value[KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY],
  };
};

export const kangurAlphabetUnifiedLessonTemplateContentSchema = z.object({
  kind: z.literal('alphabet_unified'),
  sections: z.array(kangurLessonTemplateSectionContentSchema).min(1),
});
