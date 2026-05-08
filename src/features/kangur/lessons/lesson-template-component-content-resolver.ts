import {
  kangurLessonTemplateComponentContentSchema,
  type KangurLessonTemplateComponentContent,
  type LegacyCompatibleLessonShellTitle,
  normalizeLegacyCompatibleLessonSectionGameCopy,
  normalizeLegacyCompatibleLessonShellTitle,
} from '@/shared/contracts/kangur-lesson-templates';

export const cloneKangurLessonTemplateComponentContent = <
  T extends KangurLessonTemplateComponentContent | null,
>(
  value: T,
): T => (value ? structuredClone(value) : value);

const normalizeGameShellLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    game: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    game: normalizeLegacyCompatibleLessonShellTitle(content.game),
  }) as T;

const normalizeDrawShellLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    draw: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    draw: normalizeLegacyCompatibleLessonShellTitle(content.draw),
  }) as T;

const normalizeAddingLessonTemplateContent = <
  T extends KangurLessonTemplateComponentContent & {
    game: LegacyCompatibleLessonShellTitle;
    synthesis: LegacyCompatibleLessonShellTitle;
  },
>(
  content: T,
): T =>
  ({
    ...content,
    game: normalizeLegacyCompatibleLessonShellTitle(content.game),
    synthesis: normalizeLegacyCompatibleLessonShellTitle(content.synthesis),
  }) as T;

export const normalizeKangurLessonTemplateComponentContent = <
  T extends KangurLessonTemplateComponentContent,
>(
  content: T,
): T => {
  switch (content.kind) {
    case 'alphabet_unified':
      return {
        ...content,
        sections: content.sections.map(normalizeLegacyCompatibleLessonSectionGameCopy),
      } as T;
    case 'music_diatonic_scale':
      return {
        ...content,
        gameFreeplaySection: normalizeLegacyCompatibleLessonSectionGameCopy(
          content.gameFreeplaySection
        ),
        gameRepeatSection: normalizeLegacyCompatibleLessonSectionGameCopy(
          content.gameRepeatSection
        ),
      } as T;
    case 'geometry_shape_recognition':
      return normalizeDrawShellLessonTemplateContent(content) as T;
    case 'adding':
      return normalizeAddingLessonTemplateContent(content) as T;
    case 'art_shapes_basic':
    case 'geometry_basics':
    case 'geometry_shapes':
    case 'geometry_symmetry':
    case 'logical_classification':
    case 'logical_patterns':
    case 'logical_analogies':
    case 'multiplication':
    case 'subtracting':
    case 'division':
      return normalizeGameShellLessonTemplateContent(content) as T;
    default:
      return content;
  }
};

export const resolveKangurLessonTemplateComponentContentValue = (
  componentContent: unknown,
): KangurLessonTemplateComponentContent | null => {
  const parsed = kangurLessonTemplateComponentContentSchema.safeParse(componentContent);
  if (!parsed.success) {
    return null;
  }

  return cloneKangurLessonTemplateComponentContent(
    normalizeKangurLessonTemplateComponentContent(parsed.data),
  );
};
