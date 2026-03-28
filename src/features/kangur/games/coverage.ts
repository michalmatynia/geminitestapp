import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import { AGENTIC_CODING_LESSON_COMPONENT_ORDER } from '@/features/kangur/lessons/subjects/agentic-coding/catalog';

import type { KangurGameCatalogEntry } from './catalog';
import { getKangurGameCatalogEntriesForLessonComponent } from './catalog';

export type KangurGameLibraryLessonCoverageStatus =
  | 'launchable'
  | 'library_backed'
  | 'lesson_only';

export type KangurGameLibraryCoverageGroupId =
  | 'library_backed'
  | 'launchable';

export type KangurGameLibraryCoverageGroup = {
  ageGroups: KangurLessonAgeGroup[];
  componentIds: KangurLessonComponentId[];
  coveredComponentIds: KangurLessonComponentId[];
  entries: KangurGameCatalogEntry[];
  id: KangurGameLibraryCoverageGroupId;
  subjects: KangurLessonSubject[];
  uncoveredComponentIds: KangurLessonComponentId[];
};

export type KangurGameLibraryCoverageStatusMap = Partial<
  Record<KangurLessonComponentId, KangurGameLibraryLessonCoverageStatus>
>;

export type KangurGameLibraryCoverage = {
  groups: KangurGameLibraryCoverageGroup[];
  statusMap: KangurGameLibraryCoverageStatusMap;
};

const getUniqueLessonComponentIds = (
  ...groups: ReadonlyArray<readonly KangurLessonComponentId[]>
): KangurLessonComponentId[] => Array.from(new Set(groups.flat()));

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const sortGameEntries = (left: KangurGameCatalogEntry, right: KangurGameCatalogEntry): number =>
  left.game.sortOrder - right.game.sortOrder || left.game.title.localeCompare(right.game.title);

const getAgeGroupSortOrder = (ageGroup: KangurLessonAgeGroup): number =>
  KANGUR_AGE_GROUPS.findIndex((entry) => entry.id === ageGroup);

const getSubjectSortOrder = (subject: KangurLessonSubject): number =>
  KANGUR_SUBJECTS.findIndex((entry) => entry.id === subject);

export const KANGUR_SIX_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS = [
  'alphabet_basics',
  'alphabet_copy',
  'alphabet_words',
  'alphabet_matching',
  'alphabet_sequence',
  'art_colors_harmony',
  'art_shapes_basic',
  'geometry_shape_recognition',
  'music_diatonic_scale',
] as const satisfies readonly KangurLessonComponentId[];

export const KANGUR_TEN_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS = [
  'clock',
  'calendar',
  'adding',
  'subtracting',
  'multiplication',
  'division',
  'geometry_basics',
  'geometry_shapes',
  'geometry_symmetry',
  'geometry_perimeter',
  'logical_patterns',
  'logical_classification',
  'logical_analogies',
  'english_sentence_structure',
  'english_parts_of_speech',
] as const satisfies readonly KangurLessonComponentId[];

export const KANGUR_GROWN_UP_GAME_LIBRARY_LESSON_COMPONENT_IDS =
  AGENTIC_CODING_LESSON_COMPONENT_ORDER;

export const KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS = getUniqueLessonComponentIds(
  KANGUR_SIX_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_TEN_YEAR_OLD_GAME_LIBRARY_LESSON_COMPONENT_IDS,
  KANGUR_GROWN_UP_GAME_LIBRARY_LESSON_COMPONENT_IDS
);

export const KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS = [
  'adding',
  'agentic_coding_codex_5_4_approvals',
  'agentic_coding_codex_5_4_models',
  'agentic_coding_codex_5_4_prompting',
  'agentic_coding_codex_5_4_surfaces',
  'alphabet_matching',
  'alphabet_sequence',
  'alphabet_words',
  'art_colors_harmony',
  'art_shapes_basic',
  'calendar',
  'clock',
  'division',
  'english_adjectives',
  'english_adverbs',
  'english_adverbs_frequency',
  'english_articles',
  'english_parts_of_speech',
  'english_prepositions_time_place',
  'english_sentence_structure',
  'english_subject_verb_agreement',
  'geometry_basics',
  'geometry_perimeter',
  'geometry_shape_recognition',
  'geometry_shapes',
  'geometry_symmetry',
  'logical_analogies',
  'logical_classification',
  'logical_patterns',
  'multiplication',
  'music_diatonic_scale',
  'subtracting',
] as const satisfies readonly KangurLessonComponentId[];

const GAME_LIBRARY_COMPONENT_ID_SET = new Set<KangurLessonComponentId>(
  KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS
);

const LAUNCHABLE_GAME_LIBRARY_COMPONENT_ID_SET = new Set<KangurLessonComponentId>(
  KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS
);

export const isKangurGameLibraryLessonComponent = (
  componentId: string | null | undefined
): componentId is KangurLessonComponentId =>
  Boolean(
    componentId && GAME_LIBRARY_COMPONENT_ID_SET.has(componentId as KangurLessonComponentId)
  );

export const isKangurLaunchableGameLibraryLessonComponent = (
  componentId: string | null | undefined
): componentId is KangurLessonComponentId =>
  Boolean(
    componentId &&
      LAUNCHABLE_GAME_LIBRARY_COMPONENT_ID_SET.has(componentId as KangurLessonComponentId)
  );

export const hasKangurGameLibraryCoverageForLessonComponent = (
  componentId: KangurLessonComponentId
): boolean => getKangurGameCatalogEntriesForLessonComponent(componentId).length > 0;

export const hasKangurLaunchableGameCoverageForLessonComponent = (
  componentId: KangurLessonComponentId
): boolean =>
  getKangurGameCatalogEntriesForLessonComponent(componentId).some((entry) =>
    Boolean(entry.launchableScreen)
  );

export const resolveKangurGameLibraryLessonCoverageStatus = (
  componentId: KangurLessonComponentId
): KangurGameLibraryLessonCoverageStatus => {
  if (hasKangurLaunchableGameCoverageForLessonComponent(componentId)) {
    return 'launchable';
  }

  if (
    hasKangurGameLibraryCoverageForLessonComponent(componentId) ||
    isKangurGameLibraryLessonComponent(componentId)
  ) {
    return 'library_backed';
  }

  return 'lesson_only';
};

const createKangurGameLibraryCoverageGroup = (
  id: KangurGameLibraryCoverageGroupId,
  componentIds: readonly KangurLessonComponentId[],
  catalogEntries: KangurGameCatalogEntry[]
): KangurGameLibraryCoverageGroup => {
  const componentIdSet = new Set<KangurLessonComponentId>(componentIds);
  const entries = catalogEntries
    .filter((entry) =>
      entry.game.lessonComponentIds.some((componentId) => componentIdSet.has(componentId))
    )
    .slice()
    .sort(sortGameEntries);
  const coveredComponentIdSet = new Set(
    entries.flatMap((entry) =>
      entry.game.lessonComponentIds.filter((componentId) => componentIdSet.has(componentId))
    )
  );
  const coveredComponentIds = componentIds.filter((componentId) =>
    coveredComponentIdSet.has(componentId)
  );

  return {
    id,
    componentIds: [...componentIds],
    coveredComponentIds,
    uncoveredComponentIds: componentIds.filter(
      (componentId) => !coveredComponentIdSet.has(componentId)
    ),
    entries,
    ageGroups: unique(
      entries
        .map((entry) => entry.game.ageGroup)
        .filter((ageGroup): ageGroup is KangurLessonAgeGroup => Boolean(ageGroup))
    ).sort((left, right) => getAgeGroupSortOrder(left) - getAgeGroupSortOrder(right)),
    subjects: unique(entries.map((entry) => entry.game.subject)).sort(
      (left, right) => getSubjectSortOrder(left) - getSubjectSortOrder(right)
    ),
  };
};

export const createKangurGameLibraryCoverageGroups = (
  catalogEntries: KangurGameCatalogEntry[]
): KangurGameLibraryCoverageGroup[] =>
  [
    createKangurGameLibraryCoverageGroup(
      'library_backed',
      KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS,
      catalogEntries
    ),
    createKangurGameLibraryCoverageGroup(
      'launchable',
      KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS,
      catalogEntries
    ),
  ].filter((group) => group.componentIds.length > 0);

export const createKangurGameLibraryCoverageStatusMap = (
  groups: readonly KangurGameLibraryCoverageGroup[]
): KangurGameLibraryCoverageStatusMap => {
  const componentIds = Array.from(
    new Set(groups.flatMap((group) => group.componentIds))
  );

  return Object.fromEntries(
    componentIds.map((componentId) => [
      componentId,
      resolveKangurGameLibraryLessonCoverageStatus(componentId),
    ])
  ) as KangurGameLibraryCoverageStatusMap;
};

export const getKangurGameLibraryLessonCoverageStatusFromMap = (
  componentId: KangurLessonComponentId,
  statusMap: KangurGameLibraryCoverageStatusMap
): KangurGameLibraryLessonCoverageStatus => statusMap[componentId] ?? 'lesson_only';

export const createKangurGameLibraryCoverage = (
  catalogEntries: KangurGameCatalogEntry[]
): KangurGameLibraryCoverage => {
  const groups = createKangurGameLibraryCoverageGroups(catalogEntries);

  return {
    groups,
    statusMap: createKangurGameLibraryCoverageStatusMap(groups),
  };
};
