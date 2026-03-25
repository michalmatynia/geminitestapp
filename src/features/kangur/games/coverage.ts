import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { AGENTIC_CODING_LESSON_COMPONENT_ORDER } from '@/features/kangur/lessons/subjects/agentic-coding/catalog';

import { getKangurGameCatalogEntriesForLessonComponent } from './catalog';

const getUniqueLessonComponentIds = (
  ...groups: ReadonlyArray<readonly KangurLessonComponentId[]>
): KangurLessonComponentId[] => Array.from(new Set(groups.flat()));

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
