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
  | 'selector_fallback'
  | 'lesson_only';

export type KangurGameLibraryCoverageGroupId =
  | 'library_backed'
  | 'launchable'
  | 'selector_fallback';

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
  'clock',
  'calendar',
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

export const KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS = [
  'art_colors_harmony',
  'art_shapes_basic',
  'music_diatonic_scale',
] as const satisfies readonly KangurLessonComponentId[];

const GAME_LIBRARY_COMPONENT_ID_SET = new Set<KangurLessonComponentId>(
  KANGUR_GAME_LIBRARY_LESSON_COMPONENT_IDS
);

const LAUNCHABLE_GAME_LIBRARY_COMPONENT_ID_SET = new Set<KangurLessonComponentId>(
  KANGUR_LAUNCHABLE_GAME_LIBRARY_LESSON_COMPONENT_IDS
);

const OPERATION_SELECTOR_FALLBACK_COMPONENT_ID_SET = new Set<KangurLessonComponentId>(
  KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS
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

export const shouldRouteKangurLessonComponentToOperationSelector = (
  componentId: string | null | undefined
): componentId is KangurLessonComponentId =>
  Boolean(
    componentId &&
      OPERATION_SELECTOR_FALLBACK_COMPONENT_ID_SET.has(componentId as KangurLessonComponentId)
  );

export const resolveKangurGameLibraryLessonCoverageStatus = (
  componentId: KangurLessonComponentId
): KangurGameLibraryLessonCoverageStatus => {
  if (hasKangurLaunchableGameCoverageForLessonComponent(componentId)) {
    return 'launchable';
  }

  if (shouldRouteKangurLessonComponentToOperationSelector(componentId)) {
    return 'selector_fallback';
  }

  if (
    hasKangurGameLibraryCoverageForLessonComponent(componentId) ||
    isKangurGameLibraryLessonComponent(componentId)
  ) {
    return 'library_backed';
  }

  return 'lesson_only';
};

const getKangurGameLibraryCoverageStatusPriority = (
  status: KangurGameLibraryLessonCoverageStatus
): number => {
  switch (status) {
    case 'launchable':
      return 3;
    case 'selector_fallback':
      return 2;
    case 'library_backed':
      return 1;
    case 'lesson_only':
    default:
      return 0;
  }
};

const getKangurGameLibraryCoverageStatusForGroup = (
  groupId: KangurGameLibraryCoverageGroupId
): Exclude<KangurGameLibraryLessonCoverageStatus, 'lesson_only'> => {
  switch (groupId) {
    case 'launchable':
      return 'launchable';
    case 'selector_fallback':
      return 'selector_fallback';
    case 'library_backed':
    default:
      return 'library_backed';
  }
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
): KangurGameLibraryCoverageGroup[] => [
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
  createKangurGameLibraryCoverageGroup(
    'selector_fallback',
    KANGUR_OPERATION_SELECTOR_FALLBACK_LESSON_COMPONENT_IDS,
    catalogEntries
  ),
];

export const createKangurGameLibraryCoverageStatusMap = (
  groups: readonly KangurGameLibraryCoverageGroup[]
): KangurGameLibraryCoverageStatusMap => {
  const statusMap = new Map<KangurLessonComponentId, KangurGameLibraryLessonCoverageStatus>();

  groups.forEach((group) => {
    const status = getKangurGameLibraryCoverageStatusForGroup(group.id);

    group.coveredComponentIds.forEach((componentId) => {
      const currentStatus = statusMap.get(componentId);

      if (
        !currentStatus ||
        getKangurGameLibraryCoverageStatusPriority(status) >
          getKangurGameLibraryCoverageStatusPriority(currentStatus)
      ) {
        statusMap.set(componentId, status);
      }
    });
  });

  return Object.fromEntries(statusMap) as KangurGameLibraryCoverageStatusMap;
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
