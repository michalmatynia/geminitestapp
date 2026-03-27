import type {
  KangurGameDefinition,
  KangurGameVariant,
} from '@/shared/contracts/kangur-games';

export type SeedLessonVariantSurface = Extract<
  KangurGameVariant['surface'],
  'lesson_inline' | 'lesson_stage'
>;

export type SeedGameInput = Pick<
  KangurGameDefinition,
  | 'id'
  | 'engineId'
  | 'subject'
  | 'ageGroup'
  | 'lessonComponentIds'
  | 'label'
  | 'title'
  | 'emoji'
  | 'mechanic'
  | 'interactionMode'
  | 'tags'
  | 'sortOrder'
> & {
  activityIds?: KangurGameDefinition['activityIds'];
  description?: string;
  legacyScreenIds?: KangurGameDefinition['legacyScreenIds'];
  lessonStageRuntimeId?: KangurGameVariant['lessonStageRuntimeId'];
  launchableRuntimeId?: KangurGameVariant['launchableRuntimeId'];
  lessonVariantSurface?: SeedLessonVariantSurface;
  status?: KangurGameDefinition['status'];
  surfaces?: KangurGameDefinition['surfaces'];
};

export const createVariant = (
  input: Omit<KangurGameVariant, 'sortOrder' | 'status'> &
    Partial<Pick<KangurGameVariant, 'sortOrder' | 'status'>>
): KangurGameVariant => ({
  sortOrder: 0,
  status: 'active',
  ...input,
});

export const createSharedLibraryGame = ({
  activityIds = [],
  legacyScreenIds = [],
  lessonStageRuntimeId,
  launchableRuntimeId,
  surfaces = launchableRuntimeId ? ['lesson', 'library', 'game'] : ['lesson', 'library'],
  lessonVariantSurface = 'lesson_inline',
  status = 'active',
  description,
  ...input
}: SeedGameInput): KangurGameDefinition => {
  const isLessonStage = lessonVariantSurface === 'lesson_stage';
  const lessonVariantId = `${input.id}.${isLessonStage ? 'lesson-stage' : 'lesson-inline'}`;
  const lessonVariantLabel = isLessonStage ? 'Lesson stage' : 'Lesson inline';

  return {
    ...input,
    activityIds,
    legacyScreenIds,
    description:
      description ??
      `${input.title} is cataloged as a shared game so its engine can evolve independently from the lesson flow that currently uses it.`,
    surfaces,
    variants: [
      createVariant({
        id: lessonVariantId,
        label: lessonVariantLabel,
        title: isLessonStage ? `${input.title} as a lesson stage` : `${input.title} in lessons`,
        description: isLessonStage
          ? `Stage variant for ${input.title}, shared between lesson flows and the games library.`
          : `Inline lesson variant for ${input.title}, exposed through the shared games library.`,
        surface: lessonVariantSurface,
        ...(isLessonStage && lessonStageRuntimeId ? { lessonStageRuntimeId } : {}),
      }),
      createVariant({
        id: `${input.id}.library-preview`,
        label: 'Library preview',
        title: `${input.title} preview`,
        description: `Catalog preview for ${input.title} in the shared games library.`,
        surface: 'library_preview',
        sortOrder: 100,
      }),
      ...(launchableRuntimeId
        ? [
            createVariant({
              id: `${input.id}.game-screen`,
              label: 'Game screen',
              title: `${input.title} fullscreen`,
              description: `Launches ${input.title} through the shared standalone game runtime.`,
              surface: 'game_screen',
              launchableRuntimeId,
              sortOrder: 200,
            }),
          ]
        : []),
    ],
    status,
  };
};

export const createSixYearOldInlineGame = (
  input: Omit<SeedGameInput, 'ageGroup' | 'lessonVariantSurface'>
): KangurGameDefinition =>
  createSharedLibraryGame({
    ...input,
    ageGroup: 'six_year_old',
    lessonVariantSurface: 'lesson_inline',
  });

export const createSixYearOldStageGame = (
  input: Omit<SeedGameInput, 'ageGroup' | 'lessonVariantSurface'>
): KangurGameDefinition =>
  createSharedLibraryGame({
    ...input,
    ageGroup: 'six_year_old',
    lessonVariantSurface: 'lesson_stage',
  });

export const withAgenticTags = (...tags: string[]): string[] => ['agentic-coding', ...tags];

export const createAgenticInlineGame = (
  input: Omit<SeedGameInput, 'subject' | 'ageGroup' | 'lessonVariantSurface'>
): KangurGameDefinition =>
  createSharedLibraryGame({
    ...input,
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    lessonVariantSurface: 'lesson_inline',
  });

export const createAgenticStageGame = (
  input: Omit<SeedGameInput, 'subject' | 'ageGroup' | 'lessonVariantSurface'>
): KangurGameDefinition =>
  createSharedLibraryGame({
    ...input,
    subject: 'agentic_coding',
    ageGroup: 'grown_ups',
    lessonVariantSurface: 'lesson_stage',
  });

export const cloneKangurGameDefinition = (
  game: KangurGameDefinition
): KangurGameDefinition => ({
  ...game,
  lessonComponentIds: [...game.lessonComponentIds],
  activityIds: [...game.activityIds],
  legacyScreenIds: [...game.legacyScreenIds],
  surfaces: [...game.surfaces],
  tags: [...game.tags],
  variants: game.variants.map((variant) => ({ ...variant })),
});
