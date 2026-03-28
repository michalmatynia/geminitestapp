import {
  getKangurBuiltInGameInstanceId,
} from '@/features/kangur/games';
import type {
  ClockPreviewSettings,
  HubSectionEditorState,
} from './GamesLibraryGameModal.types';
import type {
  KangurGameInstance,
  KangurGameContentSetId,
} from '@/shared/contracts/kangur-game-instances';
import type {
  KangurCalendarInteractiveSection,
  KangurGeometryDrawingShapeId,
  KangurLogicalPatternSetId,
} from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import type {
  ClockTrainingSectionId,
} from '@/features/kangur/ui/components/clock-training/types';

export const HUB_SECTION_ICON_OPTIONS = ['🕒', '⏰', '🎯', '🎮', '🧩', '⭐', '🚀', '📘'] as const;

export const DEFAULT_CLOCK_PREVIEW_SETTINGS: ClockPreviewSettings = {
  clockSection: 'combined',
  initialMode: 'practice',
  showHourHand: true,
  showMinuteHand: true,
  showModeSwitch: true,
  showTaskTitle: true,
  showTimeDisplay: true,
};

export const GEOMETRY_CONTENT_SET_SHAPE_OPTIONS = [
  'circle',
  'oval',
  'triangle',
  'diamond',
  'square',
  'rectangle',
  'pentagon',
  'hexagon',
] as const satisfies readonly KangurGeometryDrawingShapeId[];

export const DEFAULT_GEOMETRY_CONTENT_SET_SHAPE_IDS: KangurGeometryDrawingShapeId[] = [
  'circle',
  'triangle',
  'square',
];

export const DEFAULT_CALENDAR_CONTENT_SET_SECTION: KangurCalendarInteractiveSection = 'data';
export const DEFAULT_LOGICAL_PATTERN_SET_ID: KangurLogicalPatternSetId = 'logical_patterns_workshop';

export const GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME =
  'rounded-[1.5rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,var(--kangur-page-background))] shadow-[0_18px_48px_-42px_rgba(15,23,42,0.42)]';

export const GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME =
  'rounded-2xl border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]';

export const GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME =
  'rounded-[1.5rem] border border-dashed border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] px-4 py-8 text-center text-sm [color:var(--kangur-page-muted-text)]';

export const GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)] px-3 py-3';

export const getGamesLibraryContentSetCardTestId = (contentSetId: KangurGameContentSetId): string =>
  `games-library-content-set-${contentSetId.replaceAll(':', '_')}`;

export const createDraftId = (): string =>
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeSectionSortOrder = (
  sections: readonly KangurLessonGameSection[]
): KangurLessonGameSection[] =>
  sections.map((section, index) => ({
    ...section,
    sortOrder: index + 1,
  }));

export const normalizeInstanceSortOrder = (
  instances: readonly KangurGameInstance[]
): KangurGameInstance[] =>
  instances.map((instance, index) => ({
    ...instance,
    sortOrder: index + 1,
  }));

export const CLOCK_TRAINING_INSTANCE_ID_BY_SECTION: Record<ClockTrainingSectionId, string> = {
  hours: getKangurBuiltInGameInstanceId('clock_training', 'clock_training:clock-hours'),
  minutes: getKangurBuiltInGameInstanceId('clock_training', 'clock_training:clock-minutes'),
  combined: getKangurBuiltInGameInstanceId('clock_training'),
};

export const resolvePreviewSettingsFromPersistedSection = (
  section: KangurLessonGameSection | null | undefined
): ClockPreviewSettings => {
  const resolvedClockSection =
    section?.instanceId === CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.hours
      ? 'hours'
      : section?.instanceId === CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.minutes
        ? 'minutes'
        : section?.instanceId === CLOCK_TRAINING_INSTANCE_ID_BY_SECTION.combined
          ? 'combined'
          : section?.settings.clock?.clockSection ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.clockSection;

  return {
    clockSection: resolvedClockSection,
    initialMode:
      section?.settings.clock?.initialMode ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.initialMode,
    showHourHand:
      section?.settings.clock?.showHourHand ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showHourHand,
    showMinuteHand:
      section?.settings.clock?.showMinuteHand ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showMinuteHand,
    showModeSwitch:
      section?.settings.clock?.showModeSwitch ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showModeSwitch,
    showTaskTitle:
      section?.settings.clock?.showTaskTitle ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showTaskTitle,
    showTimeDisplay:
      section?.settings.clock?.showTimeDisplay ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showTimeDisplay,
  };
};

export const buildEditorStateFromSection = (
  section: KangurLessonGameSection | null,
  nextGame: KangurGameDefinition
): HubSectionEditorState => ({
  attachedLessonId: (section?.lessonComponentId ?? nextGame.lessonComponentIds[0]) ?? null,
  clockSettings: resolvePreviewSettingsFromPersistedSection(section),
  draftEnabled: section?.enabled ?? true,
  draftIcon: section?.emoji ?? nextGame.emoji ?? '🎮',
  draftSubtext: section?.description ?? nextGame.description,
  draftTitle: section?.title ?? nextGame.title,
});
