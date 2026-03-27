'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  getKangurLaunchableGameRuntimeSpecForGame,
} from '@/features/kangur/games';
import { getKangurGameContentSetsForGame } from '@/features/kangur/games/content-sets';
import ClockTrainingGame from '@/features/kangur/ui/components/ClockTrainingGame';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurInfoCard,
  KangurSelectField,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  buildKangurGameInstanceLaunchHref,
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import {
  useKangurGameInstances,
  useReplaceKangurGameInstances,
} from '@/features/kangur/ui/hooks/useKangurGameInstances';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  useKangurLessonGameSections,
  useReplaceKangurLessonGameSections,
} from '@/features/kangur/ui/hooks/useKangurLessonGameSections';
import type {
  ClockGameMode,
  ClockTrainingSectionId,
} from '@/features/kangur/ui/components/clock-training/types';
import type {
  KangurGameContentSet,
  KangurGameContentSetId,
  KangurGameContentSetKind,
  KangurGameInstance,
} from '@/shared/contracts/kangur-game-instances';
import type { KangurGameRuntimeRendererProps } from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import { cn } from '@/features/kangur/shared/utils';
import { useLocale, useTranslations } from 'next-intl';

type GamesLibraryGameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: KangurGameDefinition | null;
  basePath: string;
};

type ClockPreviewSettings = {
  clockSection: ClockTrainingSectionId;
  initialMode: ClockGameMode;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showModeSwitch: boolean;
  showTaskTitle: boolean;
  showTimeDisplay: boolean;
};

type ClockInstanceEngineSettings = Omit<ClockPreviewSettings, 'clockSection'>;

type ClockTrainingGamePreviewProps = {
  hideModeSwitch?: boolean;
  initialMode?: ClockGameMode;
  onFinish: () => void;
  section?: ClockTrainingSectionId;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

type HubSectionEditorState = {
  attachedLessonId: KangurLessonComponentId | null;
  clockSettings: ClockPreviewSettings;
  draftEnabled: boolean;
  draftIcon: string;
  draftSubtext: string;
  draftTitle: string;
};

type GameInstanceEditorState = {
  engineSettings: ClockInstanceEngineSettings;
  contentSetId: KangurGameContentSetId | null;
  instanceDescription: string;
  instanceEmoji: string;
  instanceEnabled: boolean;
  instanceTitle: string;
};

type SavedSectionsStatusFilter = 'all' | 'enabled' | 'disabled';
type SavedInstancesContentSetFilter = KangurGameContentSetId | 'all';
type SavedSectionsStatusFilterOption = {
  label: string;
  value: SavedSectionsStatusFilter;
};

type PendingInstanceEditorRestoreState = {
  contentSourceInstanceId: string | null;
  editorBaseline: GameInstanceEditorState | null;
  editorState: GameInstanceEditorState;
  engineSourceInstanceId: string | null;
  preferNewInstanceDraft: boolean;
  selectedInstanceId: string | null;
};

const ClockTrainingGamePreview = ClockTrainingGame as React.ComponentType<ClockTrainingGamePreviewProps>;

function SavedSectionsStatusControl({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onChange: (value: SavedSectionsStatusFilter) => void;
  options: SavedSectionsStatusFilterOption[];
  value: SavedSectionsStatusFilter;
}): React.JSX.Element {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-center gap-2 rounded-[1.25rem] border border-[color:var(--kangur-page-border)] p-1',
        className
      )}
      role='radiogroup'
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            aria-checked={isActive}
            className={cn(
              'min-w-0 flex-1 rounded-[0.95rem] px-3 py-2 text-xs font-semibold transition',
              isActive
                ? 'bg-[color:var(--kangur-page-text)] text-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.8)]'
                : '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)] text-[color:var(--kangur-page-muted-text)] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,white)]'
            )}
            onClick={() => onChange(option.value)}
            role='radio'
            type='button'
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const HUB_SECTION_ICON_OPTIONS = ['🕒', '⏰', '🎯', '🎮', '🧩', '⭐', '🚀', '📘'] as const;

const DEFAULT_CLOCK_PREVIEW_SETTINGS: ClockPreviewSettings = {
  clockSection: 'combined',
  initialMode: 'practice',
  showHourHand: true,
  showMinuteHand: true,
  showModeSwitch: true,
  showTaskTitle: true,
  showTimeDisplay: true,
};

const GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME =
  'rounded-[1.5rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,var(--kangur-page-background))] shadow-[0_18px_48px_-42px_rgba(15,23,42,0.42)]';

const GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME =
  'rounded-2xl border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]';

const GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME =
  'rounded-[1.5rem] border border-dashed border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] px-4 py-8 text-center text-sm [color:var(--kangur-page-muted-text)]';

const GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)] px-3 py-3';

const createDraftId = (): string =>
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSectionSortOrder = (
  sections: readonly KangurLessonGameSection[]
): KangurLessonGameSection[] =>
  sections.map((section, index) => ({
    ...section,
    sortOrder: index + 1,
  }));

const normalizeInstanceSortOrder = (
  instances: readonly KangurGameInstance[]
): KangurGameInstance[] =>
  instances.map((instance, index) => ({
    ...instance,
    sortOrder: index + 1,
  }));

const resolvePreviewSettingsFromPersistedSection = (
  section: KangurLessonGameSection | null | undefined
): ClockPreviewSettings => ({
  clockSection:
    section?.settings.clock?.clockSection ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.clockSection,
  initialMode: section?.settings.clock?.initialMode ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.initialMode,
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
});

const buildEditorStateFromSection = (
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

const resolveClockInstanceEngineSettingsFromInstance = (
  instance: KangurGameInstance | null
): ClockInstanceEngineSettings => ({
  initialMode:
    instance?.engineOverrides.clockInitialMode ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.initialMode,
  showHourHand:
    instance?.engineOverrides.showClockHourHand ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showHourHand,
  showMinuteHand:
    instance?.engineOverrides.showClockMinuteHand ??
    DEFAULT_CLOCK_PREVIEW_SETTINGS.showMinuteHand,
  showModeSwitch:
    instance?.engineOverrides.showClockModeSwitch ??
    DEFAULT_CLOCK_PREVIEW_SETTINGS.showModeSwitch,
  showTaskTitle:
    instance?.engineOverrides.showClockTaskTitle ?? DEFAULT_CLOCK_PREVIEW_SETTINGS.showTaskTitle,
  showTimeDisplay:
    instance?.engineOverrides.showClockTimeDisplay ??
    DEFAULT_CLOCK_PREVIEW_SETTINGS.showTimeDisplay,
});

const buildInstanceEditorStateFromInstance = (
  instance: KangurGameInstance | null,
  input: {
    defaultEngineSettings: ClockInstanceEngineSettings;
    contentSets: readonly KangurGameContentSet[];
    game: KangurGameDefinition;
  }
): GameInstanceEditorState => ({
  engineSettings:
    input.game.id === 'clock_training'
      ? instance
        ? resolveClockInstanceEngineSettingsFromInstance(instance)
        : input.defaultEngineSettings
      : input.defaultEngineSettings,
  contentSetId: instance?.contentSetId ?? input.contentSets[0]?.id ?? null,
  instanceDescription: instance?.description ?? input.game.description,
  instanceEmoji: instance?.emoji ?? input.game.emoji ?? '🎮',
  instanceEnabled: instance?.enabled ?? true,
  instanceTitle: instance?.title ?? input.game.title,
});

const buildClockInstanceEngineSettingsFromPreview = (
  previewSettings: ClockPreviewSettings
): ClockInstanceEngineSettings => ({
  initialMode: previewSettings.initialMode,
  showHourHand: previewSettings.showHourHand,
  showMinuteHand: previewSettings.showMinuteHand,
  showModeSwitch: previewSettings.showModeSwitch,
  showTaskTitle: previewSettings.showTaskTitle,
  showTimeDisplay: previewSettings.showTimeDisplay,
});

const resolveContentSetRendererProps = (
  contentSet: KangurGameContentSet | null | undefined
): KangurGameRuntimeRendererProps => contentSet?.rendererProps ?? {};

const buildClockEngineSettingsSummary = (
  input: ClockInstanceEngineSettings,
  translations: (key: string) => string
): string[] => {
  const summary = [
    input.initialMode === 'challenge'
      ? translations('modal.settings.initialModeChallenge')
      : translations('modal.settings.initialModePractice'),
  ];

  if (!input.showHourHand) {
    summary.push(translations('modal.settingsSummary.hourHandHidden'));
  }
  if (!input.showMinuteHand) {
    summary.push(translations('modal.settingsSummary.minuteHandHidden'));
  }
  if (!input.showModeSwitch) {
    summary.push(translations('modal.settingsSummary.modeSwitchHidden'));
  }
  if (!input.showTaskTitle) {
    summary.push(translations('modal.settingsSummary.taskTitleHidden'));
  }
  if (!input.showTimeDisplay) {
    summary.push(translations('modal.settingsSummary.timeDisplayHidden'));
  }

  return summary;
};

const getContentKindLabel = (
  contentKind: KangurGameContentSetKind,
  translations: (key: string, values?: Record<string, string | number>) => string
): string => translations(`modal.instances.contentKind.${contentKind}`);

const buildContentSetFeedSummary = (
  contentSet: KangurGameContentSet,
  translations: (key: string, values?: Record<string, string | number>) => string
): string | null => {
  const rendererProps = resolveContentSetRendererProps(contentSet);

  if (rendererProps.clockSection) {
    switch (rendererProps.clockSection) {
      case 'hours':
        return translations('modal.settings.clockSectionHours');
      case 'minutes':
        return translations('modal.settings.clockSectionMinutes');
      case 'combined':
      default:
        return translations('modal.settings.clockSectionCombined');
    }
  }

  if (rendererProps.patternSetId) {
    switch (rendererProps.patternSetId) {
      case 'alphabet_letter_order':
        return translations('modal.instances.feedSummary.alphabetOrder');
      case 'logical_patterns_workshop':
      default:
        return translations('modal.instances.feedSummary.logicalPatternsWorkshop');
    }
  }

  if (rendererProps.shapeIds?.length) {
    return translations('modal.instances.feedSummary.geometryShapeCount', {
      count: rendererProps.shapeIds.length,
    });
  }

  if (contentSet.contentKind === 'default_content') {
    return translations('modal.instances.feedSummary.defaultContent');
  }

  return null;
};

const areClockPreviewSettingsEqual = (
  left: ClockPreviewSettings,
  right: ClockPreviewSettings
): boolean =>
  left.clockSection === right.clockSection &&
  left.initialMode === right.initialMode &&
  left.showHourHand === right.showHourHand &&
  left.showMinuteHand === right.showMinuteHand &&
  left.showModeSwitch === right.showModeSwitch &&
  left.showTaskTitle === right.showTaskTitle &&
  left.showTimeDisplay === right.showTimeDisplay;

const areEditorStatesEqual = (
  left: HubSectionEditorState,
  right: HubSectionEditorState
): boolean =>
  left.attachedLessonId === right.attachedLessonId &&
  areClockPreviewSettingsEqual(left.clockSettings, right.clockSettings) &&
  left.draftEnabled === right.draftEnabled &&
  left.draftIcon === right.draftIcon &&
  left.draftSubtext === right.draftSubtext &&
  left.draftTitle === right.draftTitle;

const areClockInstanceEngineSettingsEqual = (
  left: ClockInstanceEngineSettings,
  right: ClockInstanceEngineSettings
): boolean =>
  left.initialMode === right.initialMode &&
  left.showHourHand === right.showHourHand &&
  left.showMinuteHand === right.showMinuteHand &&
  left.showModeSwitch === right.showModeSwitch &&
  left.showTaskTitle === right.showTaskTitle &&
  left.showTimeDisplay === right.showTimeDisplay;

const areInstanceEditorStatesEqual = (
  left: GameInstanceEditorState,
  right: GameInstanceEditorState
): boolean =>
  areClockInstanceEngineSettingsEqual(left.engineSettings, right.engineSettings) &&
  left.contentSetId === right.contentSetId &&
  left.instanceDescription === right.instanceDescription &&
  left.instanceEmoji === right.instanceEmoji &&
  left.instanceEnabled === right.instanceEnabled &&
  left.instanceTitle === right.instanceTitle;

const resolveModalStatusAccent = (
  status: KangurGameDefinition['status']
): 'amber' | 'emerald' | 'slate' => {
  switch (status) {
    case 'draft':
      return 'amber';
    case 'legacy':
      return 'slate';
    case 'active':
    default:
      return 'emerald';
  }
};

const resolveModalAgeGroupAccent = (
  ageGroup: KangurGameDefinition['ageGroup']
): 'amber' | 'sky' | 'slate' => {
  switch (ageGroup) {
    case 'six_year_old':
      return 'amber';
    case 'grown_ups':
      return 'slate';
    case 'ten_year_old':
    default:
      return 'sky';
  }
};

type SettingsToggleProps = {
  ariaLabel?: string;
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function SettingsToggle({
  ariaLabel,
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: SettingsToggleProps): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 rounded-3xl border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)] px-4 py-3',
        disabled && 'cursor-not-allowed opacity-70'
      )}
    >
      <span className='min-w-0'>
        <span className='block text-sm font-semibold [color:var(--kangur-page-text)]'>
          {label}
        </span>
        <span className='mt-1 block text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
          {description}
        </span>
      </span>
      <input
        aria-label={ariaLabel ?? label}
        checked={checked}
        className='mt-1 h-4 w-4 accent-indigo-600'
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type='checkbox'
      />
    </label>
  );
}

function renderGamesLibraryGameDialog({
  children,
  onOpenChange,
  open,
}: {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}): React.JSX.Element {
  return (
    <KangurDialog
      open={open}
      onOpenChange={onOpenChange}
      overlayVariant='standard'
      contentProps={{
        'data-testid': 'games-library-game-modal',
        className:
          'w-[min(calc(100vw-2rem),74rem)] rounded-[2.25rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,var(--kangur-page-background))] p-5 shadow-[0_48px_132px_-56px_rgba(15,23,42,0.56)] sm:p-6',
      }}
    >
      {children}
    </KangurDialog>
  );
}

export function GamesLibraryGameModal({
  open,
  onOpenChange,
  game,
  basePath,
}: GamesLibraryGameModalProps): React.JSX.Element {
  const router = useRouter();
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const gameInstancesQuery = useKangurGameInstances({
    enabled: open && Boolean(game),
    gameId: game?.id,
  });
  const replaceGameInstances = useReplaceKangurGameInstances();
  const lessonGameSectionsQuery = useKangurLessonGameSections({
    enabled: open && Boolean(game),
    gameId: game?.id,
  });
  const replaceLessonGameSections = useReplaceKangurLessonGameSections();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [preferNewInstanceDraft, setPreferNewInstanceDraft] = useState(false);
  const [instanceTitle, setInstanceTitle] = useState('');
  const [instanceDescription, setInstanceDescription] = useState('');
  const [instanceEmoji, setInstanceEmoji] = useState<string>('🎮');
  const [instanceEnabled, setInstanceEnabled] = useState(true);
  const [selectedContentSetId, setSelectedContentSetId] =
    useState<KangurGameContentSetId | null>(null);
  const [instanceContentSourceInstanceId, setInstanceContentSourceInstanceId] =
    useState<string | null>(null);
  const [instanceEngineSourceInstanceId, setInstanceEngineSourceInstanceId] =
    useState<string | null>(null);
  const [instanceEditorBaseline, setInstanceEditorBaseline] =
    useState<GameInstanceEditorState | null>(null);
  const [optimisticInstances, setOptimisticInstances] = useState<KangurGameInstance[] | null>(null);
  const [instanceSyncError, setInstanceSyncError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [preferNewDraft, setPreferNewDraft] = useState(false);
  const [attachedLessonId, setAttachedLessonId] = useState<KangurLessonComponentId | null>(null);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtext, setDraftSubtext] = useState('');
  const [draftIcon, setDraftIcon] = useState<string>('🎮');
  const [editorBaseline, setEditorBaseline] = useState<HubSectionEditorState | null>(null);
  const [savedSectionsQuery, setSavedSectionsQuery] = useState('');
  const [savedSectionsStatusFilter, setSavedSectionsStatusFilter] =
    useState<SavedSectionsStatusFilter>('all');
  const [savedInstancesQuery, setSavedInstancesQuery] = useState('');
  const [savedInstancesStatusFilter, setSavedInstancesStatusFilter] =
    useState<SavedSectionsStatusFilter>('all');
  const [savedInstancesContentSetFilter, setSavedInstancesContentSetFilter] =
    useState<SavedInstancesContentSetFilter>('all');
  const [optimisticSections, setOptimisticSections] = useState<KangurLessonGameSection[] | null>(
    null
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clockSettings, setClockSettings] = useState<ClockPreviewSettings>(
    DEFAULT_CLOCK_PREVIEW_SETTINGS
  );
  const [instanceClockSettings, setInstanceClockSettings] =
    useState<ClockInstanceEngineSettings>(
      buildClockInstanceEngineSettingsFromPreview(DEFAULT_CLOCK_PREVIEW_SETTINGS)
    );
  const launchableRuntime = game ? getKangurLaunchableGameRuntimeSpecForGame(game) : null;
  const contentSets = useMemo(
    () => (game ? getKangurGameContentSetsForGame(game) : []),
    [game]
  );
  const persistedInstances = gameInstancesQuery.data ?? [];
  const activeInstances = useMemo(
    () =>
      [...(optimisticInstances ?? persistedInstances)].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
      ),
    [optimisticInstances, persistedInstances]
  );
  const selectedInstance =
    selectedInstanceId === null
      ? null
      : activeInstances.find((instance) => instance.id === selectedInstanceId) ?? null;
  const selectedContentSet =
    selectedContentSetId === null
      ? contentSets[0] ?? null
      : contentSets.find((contentSet) => contentSet.id === selectedContentSetId) ??
        contentSets[0] ??
        null;
  const instanceContentSource =
    instanceContentSourceInstanceId === null
      ? null
      : activeInstances.find((instance) => instance.id === instanceContentSourceInstanceId) ?? null;
  const instanceEngineSource =
    instanceEngineSourceInstanceId === null
      ? null
      : activeInstances.find((instance) => instance.id === instanceEngineSourceInstanceId) ?? null;
  const selectedContentSetRendererProps = resolveContentSetRendererProps(selectedContentSet);
  const selectedContentSetFeedSummary = selectedContentSet
    ? buildContentSetFeedSummary(selectedContentSet, translations)
    : null;
  const supportsPreviewSettings = game?.id === 'clock_training';
  const supportsInstanceEngineSettings =
    Boolean(launchableRuntime) && game?.id === 'clock_training';
  const instancePreviewClockSection =
    selectedContentSetRendererProps.clockSection ?? clockSettings.clockSection;
  const pendingInstanceEditorRestoreRef = useRef<PendingInstanceEditorRestoreState | null>(null);
  const pendingEditorRestoreRef = useRef<HubSectionEditorState | null>(null);
  const previousGameIdRef = useRef<string | null>(null);
  const persistedSections = lessonGameSectionsQuery.data ?? [];
  const isInitialSectionsLoading =
    lessonGameSectionsQuery.isPending &&
    optimisticSections === null &&
    persistedSections.length === 0;
  const mutationsBlocked = replaceLessonGameSections.isPending || isInitialSectionsLoading;
  const activeSections = useMemo(
    () =>
      [...(optimisticSections ?? persistedSections)].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
      ),
    [optimisticSections, persistedSections]
  );
  const selectedSection =
    selectedSectionId === null
      ? null
      : activeSections.find((section) => section.id === selectedSectionId) ?? null;

  const syncEditorFromSection = (
    section: KangurLessonGameSection | null,
    nextGame: KangurGameDefinition
  ): void => {
    setSyncError(null);
    const nextEditorState = buildEditorStateFromSection(section, nextGame);
    setPreferNewDraft(section === null);
    setSelectedSectionId(section?.id ?? null);
    applyEditorState(nextEditorState);
    setEditorBaseline(nextEditorState);
  };

  const applyInstanceEditorState = (editorState: GameInstanceEditorState): void => {
    setInstanceClockSettings({ ...editorState.engineSettings });
    setSelectedContentSetId(editorState.contentSetId);
    setInstanceDescription(editorState.instanceDescription);
    setInstanceEmoji(editorState.instanceEmoji);
    setInstanceEnabled(editorState.instanceEnabled);
    setInstanceTitle(editorState.instanceTitle);
  };

  const applyInstanceSourceState = (input: {
    contentSourceInstanceId: string | null;
    engineSourceInstanceId: string | null;
  }): void => {
    setInstanceContentSourceInstanceId(input.contentSourceInstanceId);
    setInstanceEngineSourceInstanceId(input.engineSourceInstanceId);
  };

  const capturePendingInstanceEditorRestoreState = (input: {
    contentSourceInstanceId?: string | null;
    editorBaseline: GameInstanceEditorState | null;
    editorState: GameInstanceEditorState;
    engineSourceInstanceId?: string | null;
    preferNewInstanceDraft: boolean;
    selectedInstanceId: string | null;
  }): PendingInstanceEditorRestoreState => ({
    contentSourceInstanceId: input.contentSourceInstanceId ?? instanceContentSourceInstanceId,
    editorBaseline: input.editorBaseline,
    editorState: input.editorState,
    engineSourceInstanceId: input.engineSourceInstanceId ?? instanceEngineSourceInstanceId,
    preferNewInstanceDraft: input.preferNewInstanceDraft,
    selectedInstanceId: input.selectedInstanceId,
  });

  const syncEditorFromInstance = (
    instance: KangurGameInstance | null,
    nextGame: KangurGameDefinition
  ): void => {
    setInstanceSyncError(null);
    const nextEditorState = buildInstanceEditorStateFromInstance(instance, {
      defaultEngineSettings: buildClockInstanceEngineSettingsFromPreview(clockSettings),
      contentSets,
      game: nextGame,
    });
    setPreferNewInstanceDraft(instance === null);
    setSelectedInstanceId(instance?.id ?? null);
    applyInstanceEditorState(nextEditorState);
    applyInstanceSourceState({
      contentSourceInstanceId: instance?.id ?? null,
      engineSourceInstanceId: instance?.id ?? null,
    });
    setInstanceEditorBaseline(nextEditorState);
  };

  const applyEditorState = (editorState: HubSectionEditorState): void => {
    setAttachedLessonId(editorState.attachedLessonId);
    setDraftEnabled(editorState.draftEnabled);
    setDraftTitle(editorState.draftTitle);
    setDraftSubtext(editorState.draftSubtext);
    setDraftIcon(editorState.draftIcon);
    setClockSettings({ ...editorState.clockSettings });
  };

  const captureEditorState = (): HubSectionEditorState => ({
    attachedLessonId,
    clockSettings,
    draftEnabled,
    draftIcon,
    draftSubtext,
    draftTitle,
  });

  const resetTransientState = (): void => {
    pendingInstanceEditorRestoreRef.current = null;
    pendingEditorRestoreRef.current = null;
    setSelectedInstanceId(null);
    setPreferNewInstanceDraft(false);
    setSelectedContentSetId(null);
    setInstanceContentSourceInstanceId(null);
    setInstanceEngineSourceInstanceId(null);
    setInstanceTitle('');
    setInstanceDescription('');
    setInstanceEmoji('🎮');
    setInstanceEnabled(true);
    setInstanceEditorBaseline(null);
    setOptimisticInstances(null);
    setInstanceSyncError(null);
    setSavedInstancesQuery('');
    setSavedInstancesStatusFilter('all');
    setSavedInstancesContentSetFilter('all');
    setSelectedSectionId(null);
    setPreferNewDraft(false);
    setAttachedLessonId(null);
    setDraftEnabled(true);
    setDraftTitle('');
    setDraftSubtext('');
    setDraftIcon('🎮');
    setEditorBaseline(null);
    setSavedSectionsQuery('');
    setSavedSectionsStatusFilter('all');
    setOptimisticSections(null);
    setSyncError(null);
    setSettingsOpen(false);
    setClockSettings(DEFAULT_CLOCK_PREVIEW_SETTINGS);
    setInstanceClockSettings(
      buildClockInstanceEngineSettingsFromPreview(DEFAULT_CLOCK_PREVIEW_SETTINGS)
    );
  };

  useEffect(() => {
    const nextGameId = game?.id ?? null;
    const previousGameId = previousGameIdRef.current;
    const gameChanged =
      previousGameId !== null && nextGameId !== null && previousGameId !== nextGameId;

    previousGameIdRef.current = nextGameId;

    if (!open || !game || gameChanged) {
      resetTransientState();
    }
  }, [game?.id, open]);

  useEffect(() => {
    setOptimisticInstances(null);
  }, [game?.id, persistedInstances]);

  useEffect(() => {
    setOptimisticSections(null);
  }, [game?.id, persistedSections]);

  useEffect(() => {
    if (!game || !launchableRuntime) {
      return;
    }

    const pendingInstanceEditorRestore = pendingInstanceEditorRestoreRef.current;
    if (pendingInstanceEditorRestore) {
      pendingInstanceEditorRestoreRef.current = null;
      setPreferNewInstanceDraft(pendingInstanceEditorRestore.preferNewInstanceDraft);
      setSelectedInstanceId(pendingInstanceEditorRestore.selectedInstanceId);
      applyInstanceEditorState(pendingInstanceEditorRestore.editorState);
      applyInstanceSourceState({
        contentSourceInstanceId: pendingInstanceEditorRestore.contentSourceInstanceId,
        engineSourceInstanceId: pendingInstanceEditorRestore.engineSourceInstanceId,
      });
      setInstanceEditorBaseline(pendingInstanceEditorRestore.editorBaseline);
      return;
    }

    if (preferNewInstanceDraft) {
      return;
    }

    if (selectedInstanceId) {
      const matchingInstance = activeInstances.find((instance) => instance.id === selectedInstanceId);
      if (matchingInstance) {
        return;
      }
    }

    syncEditorFromInstance(activeInstances[0] ?? null, game);
  }, [
    activeInstances,
    contentSets,
    game,
    launchableRuntime,
    preferNewInstanceDraft,
    selectedInstanceId,
  ]);

  useEffect(() => {
    if (!game) {
      return;
    }

    const pendingEditorRestore = pendingEditorRestoreRef.current;
    if (pendingEditorRestore) {
      pendingEditorRestoreRef.current = null;
      applyEditorState(pendingEditorRestore);
      return;
    }

    if (preferNewDraft) {
      return;
    }

    if (selectedSectionId) {
      const matchingSection = activeSections.find((section) => section.id === selectedSectionId);
      if (matchingSection) {
        return;
      }
    }

    syncEditorFromSection(activeSections[0] ?? null, game);
  }, [activeSections, game, preferNewDraft, selectedSectionId]);

  useLayoutEffect(() => {
    if (!open || !game) {
      setSettingsOpen(false);
      return;
    }

    setSettingsOpen(game.id === 'clock_training');
  }, [game?.id, open]);

  const lessonOptions = useMemo(
    () =>
      Object.entries(KANGUR_LESSON_LIBRARY)
        .map(([componentId, lesson]) => ({
          label: getLocalizedKangurLessonTitle(
            componentId as KangurLessonComponentId,
            locale,
            lesson.title
          ),
          value: componentId,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, locale)),
    [locale]
  );

  const lessonLabelMap = useMemo(
    () =>
      Object.fromEntries(
        lessonOptions.map((option) => [option.value, option.label] as const)
      ) as Record<string, string>,
    [lessonOptions]
  );

  const gameHref = game ? buildKangurGameLaunchHref(basePath, game) : null;
  const lessonHref = game ? buildKangurGameLessonHref(basePath, game) : null;
  const selectedInstanceHref = selectedInstance
    ? buildKangurGameInstanceLaunchHref(basePath, selectedInstance)
    : null;

  const attachedLessonLabel = attachedLessonId
    ? lessonLabelMap[attachedLessonId] ?? attachedLessonId
    : translations('modal.lessonUnassigned');
  const hasUnassignedAttachedLesson = attachedLessonId === null;
  const buildClockSettingsSummary = (section: KangurLessonGameSection): string[] => {
    const resolvedSettings = resolvePreviewSettingsFromPersistedSection(section);
    const summary = [
      resolvedSettings.clockSection === 'hours'
        ? translations('modal.settings.clockSectionHours')
        : resolvedSettings.clockSection === 'minutes'
          ? translations('modal.settings.clockSectionMinutes')
          : translations('modal.settings.clockSectionCombined'),
      resolvedSettings.initialMode === 'challenge'
        ? translations('modal.settings.initialModeChallenge')
        : translations('modal.settings.initialModePractice'),
    ];

    if (!resolvedSettings.showHourHand) {
      summary.push(translations('modal.settingsSummary.hourHandHidden'));
    }
    if (!resolvedSettings.showMinuteHand) {
      summary.push(translations('modal.settingsSummary.minuteHandHidden'));
    }
    if (!resolvedSettings.showModeSwitch) {
      summary.push(translations('modal.settingsSummary.modeSwitchHidden'));
    }
    if (!resolvedSettings.showTaskTitle) {
      summary.push(translations('modal.settingsSummary.taskTitleHidden'));
    }
    if (!resolvedSettings.showTimeDisplay) {
      summary.push(translations('modal.settingsSummary.timeDisplayHidden'));
    }

    return summary;
  };
  const filteredActiveSections = useMemo(() => {
    const normalizedQuery = savedSectionsQuery.trim().toLowerCase();
    return activeSections.filter((section) => {
      if (savedSectionsStatusFilter === 'enabled' && !section.enabled) {
        return false;
      }
      if (savedSectionsStatusFilter === 'disabled' && section.enabled) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        section.title,
        section.description,
        section.emoji,
        lessonLabelMap[section.lessonComponentId] ?? section.lessonComponentId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeSections, lessonLabelMap, savedSectionsQuery, savedSectionsStatusFilter]);
  const hasSavedSectionsFilters =
    savedSectionsQuery.trim().length > 0 || savedSectionsStatusFilter !== 'all';
  const filteredActiveInstances = useMemo(() => {
    const normalizedQuery = savedInstancesQuery.trim().toLowerCase();

    return activeInstances.filter((instance) => {
      if (savedInstancesStatusFilter === 'enabled' && !instance.enabled) {
        return false;
      }
      if (savedInstancesStatusFilter === 'disabled' && instance.enabled) {
        return false;
      }
      if (
        savedInstancesContentSetFilter !== 'all' &&
        instance.contentSetId !== savedInstancesContentSetFilter
      ) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const contentSet = contentSets.find((entry) => entry.id === instance.contentSetId);
      const contentSetFeedSummary = contentSet
        ? buildContentSetFeedSummary(contentSet, translations)
        : null;

      return [
        instance.title,
        instance.description,
        instance.emoji,
        contentSet?.label ?? instance.contentSetId,
        contentSetFeedSummary,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    activeInstances,
    contentSets,
    savedInstancesContentSetFilter,
    savedInstancesQuery,
    savedInstancesStatusFilter,
    translations,
  ]);
  const hasSavedInstancesFilters =
    savedInstancesQuery.trim().length > 0 ||
    savedInstancesStatusFilter !== 'all' ||
    savedInstancesContentSetFilter !== 'all';

  const linkedLessonIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(game?.lessonComponentIds ?? []),
          ...(attachedLessonId ? [attachedLessonId] : []),
          ...activeSections.map((section) => section.lessonComponentId),
        ])
      ),
    [activeSections, attachedLessonId, game?.lessonComponentIds]
  );
  const currentInstanceEditorState = useMemo<GameInstanceEditorState>(
    () => ({
      engineSettings: instanceClockSettings,
      contentSetId: selectedContentSetId,
      instanceDescription,
      instanceEmoji,
      instanceEnabled,
      instanceTitle,
    }),
    [
      instanceClockSettings,
      instanceDescription,
      instanceEmoji,
      instanceEnabled,
      instanceTitle,
      selectedContentSetId,
    ]
  );
  const currentEditorState = useMemo<HubSectionEditorState>(
    () => ({
      attachedLessonId,
      clockSettings,
      draftEnabled,
      draftIcon,
      draftSubtext,
      draftTitle,
    }),
    [attachedLessonId, clockSettings, draftEnabled, draftIcon, draftSubtext, draftTitle]
  );
  const currentEngineOverrides = useMemo<KangurGameRuntimeRendererProps>(
    () =>
      supportsPreviewSettings
        ? {
            clockInitialMode: instanceClockSettings.initialMode,
            showClockHourHand: instanceClockSettings.showHourHand,
            showClockMinuteHand: instanceClockSettings.showMinuteHand,
            showClockModeSwitch: instanceClockSettings.showModeSwitch,
            showClockTaskTitle: instanceClockSettings.showTaskTitle,
            showClockTimeDisplay: instanceClockSettings.showTimeDisplay,
          }
        : {},
    [instanceClockSettings, supportsPreviewSettings]
  );
  const currentEngineSettingsSummary = useMemo(() => {
    if (!supportsPreviewSettings) {
      return [translations('modal.instances.currentEngineSettingsDefault')];
    }

    return buildClockEngineSettingsSummary(
      {
        initialMode: instanceClockSettings.initialMode,
        showHourHand: instanceClockSettings.showHourHand,
        showMinuteHand: instanceClockSettings.showMinuteHand,
        showModeSwitch: instanceClockSettings.showModeSwitch,
        showTaskTitle: instanceClockSettings.showTaskTitle,
        showTimeDisplay: instanceClockSettings.showTimeDisplay,
      },
      translations
    );
  }, [instanceClockSettings, supportsPreviewSettings, translations]);
  const instanceDraftMode = useMemo<
    'editing_saved' | 'draft_from_saved' | 'mixed_draft' | 'custom_draft'
  >(() => {
    if (
      selectedInstanceId !== null &&
      instanceContentSourceInstanceId === selectedInstanceId &&
      instanceEngineSourceInstanceId === selectedInstanceId
    ) {
      return 'editing_saved';
    }
    if (instanceContentSourceInstanceId !== instanceEngineSourceInstanceId) {
      return 'mixed_draft';
    }
    if (instanceContentSourceInstanceId !== null) {
      return 'draft_from_saved';
    }
    return 'custom_draft';
  }, [
    instanceContentSourceInstanceId,
    instanceEngineSourceInstanceId,
    selectedInstanceId,
  ]);
  const instanceDraftModeAccent = {
    custom_draft: 'slate',
    draft_from_saved: 'violet',
    editing_saved: 'emerald',
    mixed_draft: 'amber',
  }[instanceDraftMode] as 'slate' | 'violet' | 'emerald' | 'amber';
  const hasVisibleClockHand = clockSettings.showHourHand || clockSettings.showMinuteHand;
  const instanceValidationMessages = useMemo(() => {
    const messages: string[] = [];

    if (!selectedContentSet) {
      messages.push(translations('modal.instances.validation.contentSetRequired'));
    }
    if (instanceTitle.trim().length === 0) {
      messages.push(translations('modal.instances.validation.titleRequired'));
    }
    if (instanceEmoji.trim().length === 0) {
      messages.push(translations('modal.instances.validation.emojiRequired'));
    }

    return messages;
  }, [instanceEmoji, instanceTitle, selectedContentSet, translations]);
  const draftValidationMessages = useMemo(() => {
    const messages: string[] = [];

    if (attachedLessonId === null) {
      messages.push(translations('modal.validation.attachedLessonRequired'));
    }
    if (draftTitle.trim().length === 0) {
      messages.push(translations('modal.validation.sectionNameRequired'));
    }
    if (draftIcon.trim().length === 0) {
      messages.push(translations('modal.validation.gameIconRequired'));
    }
    if (supportsPreviewSettings && !hasVisibleClockHand) {
      messages.push(translations('modal.validation.visibleClockHandRequired'));
    }

    return messages;
  }, [
    attachedLessonId,
    draftIcon,
    draftTitle,
    hasVisibleClockHand,
    supportsPreviewSettings,
    translations,
  ]);
  const isInstanceEditorDirty =
    instanceEditorBaseline !== null &&
    !areInstanceEditorStatesEqual(currentInstanceEditorState, instanceEditorBaseline);
  const isEditorDirty =
    editorBaseline !== null && !areEditorStatesEqual(currentEditorState, editorBaseline);
  const canResetClockSettings =
    supportsPreviewSettings &&
    !areClockPreviewSettingsEqual(clockSettings, DEFAULT_CLOCK_PREVIEW_SETTINGS);
  const canSyncInstanceEngineSettingsFromPreview =
    supportsInstanceEngineSettings &&
    !areClockInstanceEngineSettingsEqual(
      instanceClockSettings,
      buildClockInstanceEngineSettingsFromPreview(clockSettings)
    );

  const canAddDraft = draftValidationMessages.length === 0;
  const canSaveInstance = Boolean(launchableRuntime) && instanceValidationMessages.length === 0;

  const handleResetInstanceEditor = (): void => {
    if (!game) {
      return;
    }

    setInstanceSyncError(null);
    syncEditorFromInstance(null, game);
  };

  const handleEditInstance = (instance: KangurGameInstance): void => {
    if (!game) {
      return;
    }

    setInstanceSyncError(null);
    syncEditorFromInstance(instance, game);
  };

  const forkInstanceEditorToDraft = (
    nextEditorState: GameInstanceEditorState,
    input: {
      contentSourceInstanceId: string | null;
      engineSourceInstanceId: string | null;
    }
  ): void => {
    setPreferNewInstanceDraft(true);
    setSelectedInstanceId(null);
    applyInstanceEditorState(nextEditorState);
    applyInstanceSourceState(input);
    setInstanceEditorBaseline(nextEditorState);
  };

  const handleDuplicateInstance = (instance: KangurGameInstance): void => {
    if (!game) {
      return;
    }

    setInstanceSyncError(null);
    const duplicatedEditorState: GameInstanceEditorState = {
      ...buildInstanceEditorStateFromInstance(instance, {
        defaultEngineSettings: buildClockInstanceEngineSettingsFromPreview(clockSettings),
        contentSets,
        game,
      }),
      instanceTitle: `${instance.title} ${translations('modal.instances.duplicateSuffix')}`.trim(),
    };
    forkInstanceEditorToDraft(duplicatedEditorState, {
      contentSourceInstanceId: instance.id,
      engineSourceInstanceId: instance.id,
    });
  };

  const handleForkCurrentInstanceEditorToDraft = (): void => {
    setInstanceSyncError(null);
    forkInstanceEditorToDraft(currentInstanceEditorState, {
      contentSourceInstanceId: instanceContentSourceInstanceId,
      engineSourceInstanceId: instanceEngineSourceInstanceId,
    });
  };

  const handleUseInstanceContentSet = (instance: KangurGameInstance): void => {
    setInstanceSyncError(null);
    if (selectedInstanceId && selectedInstanceId !== instance.id) {
      forkInstanceEditorToDraft({
        ...currentInstanceEditorState,
        contentSetId: instance.contentSetId,
      }, {
        contentSourceInstanceId: instance.id,
        engineSourceInstanceId: instanceEngineSourceInstanceId,
      });
      return;
    }

    setSelectedContentSetId(instance.contentSetId);
    setInstanceContentSourceInstanceId(instance.id);
  };

  const handleUseInstanceEngineSettings = (instance: KangurGameInstance): void => {
    if (!supportsInstanceEngineSettings) {
      return;
    }

    setInstanceSyncError(null);
    const nextEngineSettings = resolveClockInstanceEngineSettingsFromInstance(instance);
    if (selectedInstanceId && selectedInstanceId !== instance.id) {
      forkInstanceEditorToDraft({
        ...currentInstanceEditorState,
        engineSettings: nextEngineSettings,
      }, {
        contentSourceInstanceId: instanceContentSourceInstanceId,
        engineSourceInstanceId: instance.id,
      });
      return;
    }

    setInstanceClockSettings(nextEngineSettings);
    setInstanceEngineSourceInstanceId(instance.id);
  };

  const handleDetachInstanceContentSource = (): void => {
    setInstanceSyncError(null);
    setInstanceContentSourceInstanceId(null);
  };

  const handleDetachInstanceEngineSource = (): void => {
    setInstanceSyncError(null);
    setInstanceEngineSourceInstanceId(null);
  };

  const persistCurrentInstance = async (): Promise<KangurGameInstance | null> => {
    if (!game || !launchableRuntime || !selectedContentSet) {
      return null;
    }

    const instanceId = selectedInstanceId ?? createDraftId();
    const previousPreferNewInstanceDraft = preferNewInstanceDraft;
    const previousSelectedInstanceId = selectedInstanceId;
    const previousEditorState = currentInstanceEditorState;
    const previousEditorBaseline = instanceEditorBaseline;
    const previousContentSourceInstanceId = instanceContentSourceInstanceId;
    const previousEngineSourceInstanceId = instanceEngineSourceInstanceId;
    const nextInstance: KangurGameInstance = {
      id: instanceId,
      gameId: game.id,
      launchableRuntimeId: launchableRuntime.screen,
      contentSetId: selectedContentSet.id,
      title: instanceTitle.trim(),
      description: instanceDescription.trim(),
      emoji: instanceEmoji.trim() || '🎮',
      enabled: instanceEnabled,
      sortOrder:
        selectedInstance?.sortOrder ??
        Math.max(0, ...activeInstances.map((instance) => instance.sortOrder)) + 1,
      engineOverrides: currentEngineOverrides,
    };

    const nextInstances = normalizeInstanceSortOrder(
      selectedInstanceId === null
        ? [...activeInstances, nextInstance]
        : activeInstances.map((instance) =>
            instance.id === selectedInstanceId ? nextInstance : instance
          )
    );

    setInstanceSyncError(null);
    setOptimisticInstances(nextInstances);
    setPreferNewInstanceDraft(false);
    setSelectedInstanceId(instanceId);
    applyInstanceSourceState({
      contentSourceInstanceId: instanceId,
      engineSourceInstanceId: instanceId,
    });
    setInstanceEditorBaseline(
      buildInstanceEditorStateFromInstance(nextInstance, {
        defaultEngineSettings: buildClockInstanceEngineSettingsFromPreview(clockSettings),
        contentSets,
        game,
      })
    );

    try {
      await replaceGameInstances.mutateAsync({
        gameId: game.id,
        instances: nextInstances,
      });
      return nextInstance;
    } catch {
      setOptimisticInstances(null);
      setPreferNewInstanceDraft(previousPreferNewInstanceDraft);
      setSelectedInstanceId(previousSelectedInstanceId);
      applyInstanceEditorState(previousEditorState);
      applyInstanceSourceState({
        contentSourceInstanceId: previousContentSourceInstanceId,
        engineSourceInstanceId: previousEngineSourceInstanceId,
      });
      setInstanceEditorBaseline(previousEditorBaseline);
      setInstanceSyncError(translations('modal.instances.syncError'));
      return null;
    }
  };

  const handleSaveInstance = async (): Promise<void> => {
    await persistCurrentInstance();
  };

  const handleSaveAndOpenInstance = async (): Promise<void> => {
    const savedInstance = await persistCurrentInstance();
    if (!savedInstance) {
      return;
    }

    router.push(buildKangurGameInstanceLaunchHref(basePath, savedInstance));
  };

  const handleRemoveInstance = (instance: KangurGameInstance): void => {
    if (!game) {
      return;
    }

    const removingSelectedInstance = instance.id === selectedInstanceId;
    const previousInstanceEditorState: GameInstanceEditorState = currentInstanceEditorState;
    const previousPreferNewInstanceDraft = preferNewInstanceDraft;
    const previousSelectedInstanceId = selectedInstanceId;
    const previousContentSourceInstanceId = instanceContentSourceInstanceId;
    const previousEngineSourceInstanceId = instanceEngineSourceInstanceId;
    const nextInstances = normalizeInstanceSortOrder(
      activeInstances.filter((entry) => entry.id !== instance.id)
    );

    setInstanceSyncError(null);
    setOptimisticInstances(nextInstances);
    if (!removingSelectedInstance) {
      pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
        contentSourceInstanceId: previousContentSourceInstanceId,
        editorBaseline: instanceEditorBaseline,
        editorState: previousInstanceEditorState,
        engineSourceInstanceId: previousEngineSourceInstanceId,
        preferNewInstanceDraft: previousPreferNewInstanceDraft,
        selectedInstanceId: previousSelectedInstanceId,
      });
    }
    if (removingSelectedInstance) {
      const fallbackInstance = nextInstances[0] ?? null;
      if (fallbackInstance) {
        syncEditorFromInstance(fallbackInstance, game);
      } else {
        handleResetInstanceEditor();
      }
    }

    void replaceGameInstances
      .mutateAsync({
        gameId: game.id,
        instances: nextInstances,
      })
      .catch(() => {
        if (!removingSelectedInstance) {
          pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
            contentSourceInstanceId: previousContentSourceInstanceId,
            editorBaseline: instanceEditorBaseline,
            editorState: previousInstanceEditorState,
            engineSourceInstanceId: previousEngineSourceInstanceId,
            preferNewInstanceDraft: previousPreferNewInstanceDraft,
            selectedInstanceId: previousSelectedInstanceId,
          });
        }
        setOptimisticInstances(null);
        if (removingSelectedInstance) {
          syncEditorFromInstance(instance, game);
        }
        setInstanceSyncError(translations('modal.instances.syncError'));
      });
  };

  const handleToggleInstanceEnabled = (instance: KangurGameInstance): void => {
    if (!game) {
      return;
    }

    const previousEditorState = currentInstanceEditorState;
    const previousEditorBaseline = instanceEditorBaseline;
    const previousPreferNewInstanceDraft = preferNewInstanceDraft;
    const previousSelectedInstanceId = selectedInstanceId;
    const previousContentSourceInstanceId = instanceContentSourceInstanceId;
    const previousEngineSourceInstanceId = instanceEngineSourceInstanceId;
    const nextEnabled = !instance.enabled;
    const nextInstances = activeInstances.map((entry) =>
      entry.id === instance.id ? { ...entry, enabled: nextEnabled } : entry
    );

    setInstanceSyncError(null);
    setOptimisticInstances(nextInstances);
    if (instance.id === selectedInstanceId) {
      setInstanceEnabled(nextEnabled);
      if (previousEditorBaseline) {
        setInstanceEditorBaseline({
          ...previousEditorBaseline,
          instanceEnabled: nextEnabled,
        });
      }
    } else {
      pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
        contentSourceInstanceId: previousContentSourceInstanceId,
        editorBaseline: previousEditorBaseline,
        editorState: previousEditorState,
        engineSourceInstanceId: previousEngineSourceInstanceId,
        preferNewInstanceDraft: previousPreferNewInstanceDraft,
        selectedInstanceId: previousSelectedInstanceId,
      });
    }

    void replaceGameInstances
      .mutateAsync({
        gameId: game.id,
        instances: nextInstances,
      })
      .catch(() => {
        if (instance.id !== selectedInstanceId) {
          pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
            contentSourceInstanceId: previousContentSourceInstanceId,
            editorBaseline: previousEditorBaseline,
            editorState: previousEditorState,
            engineSourceInstanceId: previousEngineSourceInstanceId,
            preferNewInstanceDraft: previousPreferNewInstanceDraft,
            selectedInstanceId: previousSelectedInstanceId,
          });
        }
        setOptimisticInstances(null);
        if (instance.id === selectedInstanceId) {
          applyInstanceEditorState(previousEditorState);
          applyInstanceSourceState({
            contentSourceInstanceId: previousContentSourceInstanceId,
            engineSourceInstanceId: previousEngineSourceInstanceId,
          });
          setInstanceEditorBaseline(previousEditorBaseline);
        }
        setInstanceSyncError(translations('modal.instances.syncError'));
      });
  };

  const handleMoveInstance = (instanceId: string, direction: 'up' | 'down'): void => {
    if (!game) {
      return;
    }

    const previousEditorState = currentInstanceEditorState;
    const previousEditorBaseline = instanceEditorBaseline;
    const previousPreferNewInstanceDraft = preferNewInstanceDraft;
    const previousSelectedInstanceId = selectedInstanceId;
    const previousContentSourceInstanceId = instanceContentSourceInstanceId;
    const previousEngineSourceInstanceId = instanceEngineSourceInstanceId;
    const currentIndex = activeInstances.findIndex((instance) => instance.id === instanceId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeInstances.length) {
      return;
    }

    const reordered = [...activeInstances];
    const [movedInstance] = reordered.splice(currentIndex, 1);
    if (!movedInstance) {
      return;
    }

    reordered.splice(targetIndex, 0, movedInstance);
    const nextInstances = normalizeInstanceSortOrder(reordered);

    setInstanceSyncError(null);
    setOptimisticInstances(nextInstances);
    pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
      contentSourceInstanceId: previousContentSourceInstanceId,
      editorBaseline: previousEditorBaseline,
      editorState: previousEditorState,
      engineSourceInstanceId: previousEngineSourceInstanceId,
      preferNewInstanceDraft: previousPreferNewInstanceDraft,
      selectedInstanceId: previousSelectedInstanceId,
    });
    void replaceGameInstances
      .mutateAsync({
        gameId: game.id,
        instances: nextInstances,
      })
      .catch(() => {
        pendingInstanceEditorRestoreRef.current = capturePendingInstanceEditorRestoreState({
          contentSourceInstanceId: previousContentSourceInstanceId,
          editorBaseline: previousEditorBaseline,
          editorState: previousEditorState,
          engineSourceInstanceId: previousEngineSourceInstanceId,
          preferNewInstanceDraft: previousPreferNewInstanceDraft,
          selectedInstanceId: previousSelectedInstanceId,
        });
        setOptimisticInstances(null);
        setInstanceSyncError(translations('modal.instances.syncError'));
      });
  };

  const handleResetEditor = (): void => {
    if (!game) {
      return;
    }

    setSyncError(null);
    syncEditorFromSection(null, game);
  };

  const handleDuplicateSection = (section: KangurLessonGameSection): void => {
    if (!game) {
      return;
    }

    setSyncError(null);
    const duplicatedEditorState: HubSectionEditorState = {
      ...buildEditorStateFromSection(section, game),
      draftTitle: `${section.title} ${translations('modal.duplicateDraftSuffix')}`.trim(),
    };
    setPreferNewDraft(true);
    setSelectedSectionId(null);
    applyEditorState(duplicatedEditorState);
    setEditorBaseline(duplicatedEditorState);
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!game || !attachedLessonId) {
      return;
    }

    const sectionId = selectedSectionId ?? createDraftId();
    const previousPreferNewDraft = preferNewDraft;
    const previousSelectedSectionId = selectedSectionId;
    const previousEditorState = captureEditorState();
    const previousEditorBaseline = editorBaseline;
    const nextSection: KangurLessonGameSection = {
      id: sectionId,
      description: draftSubtext.trim(),
      emoji: draftIcon.trim() || '🎮',
      enabled: draftEnabled,
      gameId: game.id,
      lessonComponentId: attachedLessonId,
      settings:
        supportsPreviewSettings
          ? {
              clock: {
                clockSection: clockSettings.clockSection,
                initialMode: clockSettings.initialMode,
                showHourHand: clockSettings.showHourHand,
                showMinuteHand: clockSettings.showMinuteHand,
                showModeSwitch: clockSettings.showModeSwitch,
                showTaskTitle: clockSettings.showTaskTitle,
                showTimeDisplay: clockSettings.showTimeDisplay,
              },
            }
          : {},
      sortOrder:
        selectedSection?.sortOrder ??
        Math.max(0, ...activeSections.map((section) => section.sortOrder)) + 1,
      title: draftTitle.trim(),
    };

    const nextSections = normalizeSectionSortOrder(
      selectedSectionId === null
        ? [...activeSections, nextSection]
        : activeSections.map((section) =>
            section.id === selectedSectionId ? nextSection : section
          )
    );

    setSyncError(null);
    setOptimisticSections(nextSections);
    setPreferNewDraft(false);
    setSelectedSectionId(sectionId);
    setEditorBaseline({
      attachedLessonId: nextSection.lessonComponentId,
      clockSettings:
        supportsPreviewSettings
          ? resolvePreviewSettingsFromPersistedSection(nextSection)
          : DEFAULT_CLOCK_PREVIEW_SETTINGS,
      draftEnabled: nextSection.enabled,
      draftIcon: nextSection.emoji,
      draftSubtext: nextSection.description,
      draftTitle: nextSection.title,
    });

    try {
      await replaceLessonGameSections.mutateAsync({
        gameId: game.id,
        sections: nextSections,
      });
    } catch {
      pendingEditorRestoreRef.current = previousEditorState;
      setOptimisticSections(null);
      setPreferNewDraft(previousPreferNewDraft);
      setSelectedSectionId(previousSelectedSectionId);
      setEditorBaseline(previousEditorBaseline);
      setSyncError(translations('modal.syncError'));
      return;
    }
  };

  const updateClockSettings = <TKey extends keyof ClockPreviewSettings>(
    key: TKey,
    value: ClockPreviewSettings[TKey]
  ): void => {
    setSyncError(null);
    setClockSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateInstanceClockSettings = <TKey extends keyof ClockInstanceEngineSettings>(
    key: TKey,
    value: ClockInstanceEngineSettings[TKey]
  ): void => {
    setInstanceSyncError(null);
    setInstanceEngineSourceInstanceId(null);
    setInstanceClockSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSyncInstanceEngineSettingsFromPreview = (): void => {
    setInstanceSyncError(null);
    setInstanceEngineSourceInstanceId(null);
    setInstanceClockSettings(buildClockInstanceEngineSettingsFromPreview(clockSettings));
  };

  const handleResetClockSettings = (): void => {
    setSyncError(null);
    setClockSettings(DEFAULT_CLOCK_PREVIEW_SETTINGS);
  };

  const handleCloseModal = (): void => {
    onOpenChange(false);
  };

  const handleEditDraft = (draft: KangurLessonGameSection): void => {
    if (!game) {
      return;
    }
    setSyncError(null);
    syncEditorFromSection(draft, game);
  };

  const handleRemoveDraft = (draft: KangurLessonGameSection): void => {
    if (!game) {
      return;
    }

    const nextSections = normalizeSectionSortOrder(
      activeSections.filter((entry) => entry.id !== draft.id)
    );
    const removingSelectedSection = draft.id === selectedSectionId;
    const previousEditorState = !removingSelectedSection ? captureEditorState() : null;

    if (previousEditorState) {
      pendingEditorRestoreRef.current = previousEditorState;
    }
    setSyncError(null);
    setOptimisticSections(nextSections);
    if (removingSelectedSection) {
      const fallbackSection = nextSections[0] ?? null;
      if (fallbackSection) {
        syncEditorFromSection(fallbackSection, game);
      } else {
        handleResetEditor();
      }
    }
    void replaceLessonGameSections
      .mutateAsync({
        gameId: game.id,
        sections: nextSections,
      })
      .catch(() => {
        if (previousEditorState) {
          pendingEditorRestoreRef.current = previousEditorState;
        }
        setOptimisticSections(null);
        if (removingSelectedSection) {
          syncEditorFromSection(draft, game);
        }
        setSyncError(translations('modal.syncError'));
      });
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down'): void => {
    if (!game) {
      return;
    }

    const currentIndex = activeSections.findIndex((section) => section.id === sectionId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeSections.length) {
      return;
    }

    const reordered = [...activeSections];
    const [movedSection] = reordered.splice(currentIndex, 1);
    if (!movedSection) {
      return;
    }

    reordered.splice(targetIndex, 0, movedSection);
    const nextSections = normalizeSectionSortOrder(reordered);
    const previousEditorState = captureEditorState();

    pendingEditorRestoreRef.current = previousEditorState;
    setSyncError(null);
    setOptimisticSections(nextSections);
    void replaceLessonGameSections
      .mutateAsync({
        gameId: game.id,
        sections: nextSections,
      })
      .catch(() => {
        pendingEditorRestoreRef.current = previousEditorState;
        setOptimisticSections(null);
        setSyncError(translations('modal.syncError'));
      });
  };

  const handleToggleSectionEnabled = (sectionId: string): void => {
    if (!game) {
      return;
    }

    const previousEditorState = captureEditorState();
    const previousEditorBaseline = editorBaseline;
    let nextDraftEnabled = draftEnabled;
    const nextSections = activeSections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      const toggledSection = { ...section, enabled: !section.enabled };
      if (sectionId === selectedSectionId) {
        nextDraftEnabled = toggledSection.enabled;
      }

      return toggledSection;
    });
    const optimisticEditorState: HubSectionEditorState =
      sectionId === selectedSectionId
        ? {
            ...previousEditorState,
            draftEnabled: nextDraftEnabled,
          }
        : previousEditorState;

    pendingEditorRestoreRef.current = optimisticEditorState;
    setSyncError(null);
    if (sectionId === selectedSectionId && previousEditorBaseline) {
      setEditorBaseline({
        ...previousEditorBaseline,
        draftEnabled: nextDraftEnabled,
      });
    }
    if (sectionId === selectedSectionId) {
      setDraftEnabled(nextDraftEnabled);
    }
    setOptimisticSections(nextSections);
    void replaceLessonGameSections
      .mutateAsync({
        gameId: game.id,
        sections: nextSections,
      })
      .catch(() => {
        pendingEditorRestoreRef.current = previousEditorState;
        setOptimisticSections(null);
        setEditorBaseline(previousEditorBaseline);
        if (sectionId === selectedSectionId) {
          setDraftEnabled(previousEditorState.draftEnabled);
        }
        setSyncError(translations('modal.syncError'));
      });
  };

  if (!game) {
    return <></>;
  }

  const linkedLessonChipKeyPrefix = game.id;
  const gameChipLabel = game.title;
  const gameTransitionSourceId = `kangur-games-library:${game.id}:modal-game`;
  const lessonTransitionSourceId = `kangur-games-library:${game.id}:modal-lessons`;
  const resolvedAgeGroupLabel = game.ageGroup
    ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale)
    : translations('labels.allAgeGroups');
  const linkedLessonCount = game.lessonComponentIds.length;
  const handleDialogOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && (replaceLessonGameSections.isPending || replaceGameInstances.isPending)) {
      return;
    }

    onOpenChange(nextOpen);
  };

  return renderGamesLibraryGameDialog({
    onOpenChange: handleDialogOpenChange,
    open,
    children: (
      <div className='space-y-5'>
        <div className='relative overflow-hidden rounded-[1.9rem] border border-[color:var(--kangur-soft-card-border)] [background:linear-gradient(145deg,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,var(--kangur-page-background))_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,var(--kangur-accent-sky-start,#38bdf8))_100%)] px-5 py-5 shadow-[0_32px_90px_-54px_rgba(15,23,42,0.55)] sm:px-6'>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full [background:radial-gradient(circle,color-mix(in_srgb,var(--kangur-accent-sky-start,#38bdf8)_30%,transparent)_0%,transparent_72%)]'
          />
          <div className='relative space-y-5'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='min-w-0 flex-1 space-y-3 pr-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.eyebrow')}
                  </div>
                  <KangurStatusChip accent='amber' size='sm'>
                    {translations('modal.scaffoldBadge')}
                  </KangurStatusChip>
                  <KangurStatusChip accent='sky' size='sm'>
                    {game.engineId}
                  </KangurStatusChip>
                </div>
                <div className='flex flex-wrap items-center gap-3'>
                  <div
                    aria-hidden='true'
                    className='flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_94%,white)] text-3xl shadow-[0_20px_52px_-34px_rgba(15,23,42,0.65)]'
                  >
                    {game.emoji}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h2 className='text-2xl font-black tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-[2rem]'>
                      {game.title}
                    </h2>
                    <p className='mt-1 max-w-3xl text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.description')}
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                {supportsPreviewSettings ? (
                  <KangurButton
                    disabled={replaceLessonGameSections.isPending}
                    onClick={() => setSettingsOpen((current) => !current)}
                    size='sm'
                    type='button'
                    variant='surface'
                  >
                    {settingsOpen
                      ? translations('modal.hideSettingsButton')
                      : translations('modal.settingsButton')}
                  </KangurButton>
                ) : null}
                <KangurButton
                  disabled={
                    replaceLessonGameSections.isPending || replaceGameInstances.isPending
                  }
                  onClick={handleCloseModal}
                  size='sm'
                  type='button'
                  variant='surface'
                >
                  {translations('modal.closeButton')}
                </KangurButton>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('labels.ageGroup')}
                </div>
                <div className='mt-2'>
                  <KangurStatusChip
                    accent={resolveModalAgeGroupAccent(game.ageGroup)}
                    size='sm'
                  >
                    {resolvedAgeGroupLabel}
                  </KangurStatusChip>
                </div>
              </div>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('labels.mechanic')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {translations(`mechanics.${game.mechanic}`)}
                </div>
              </div>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('labels.variants')}
                </div>
                <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                  {translations('labels.variantCount', { count: game.variants.length })}
                </div>
              </div>
              <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('labels.lessonLinks')}
                </div>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <KangurStatusChip
                    accent={linkedLessonCount > 0 ? 'emerald' : 'slate'}
                    size='sm'
                  >
                    {linkedLessonCount > 0
                      ? translations('labels.variantCount', { count: linkedLessonCount })
                      : translations('labels.none')}
                  </KangurStatusChip>
                  <KangurStatusChip
                    accent={resolveModalStatusAccent(game.status)}
                    size='sm'
                  >
                    {translations(`statuses.${game.status}`)}
                  </KangurStatusChip>
                </div>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              {game.surfaces.map((surface) => (
                <KangurStatusChip
                  key={`${game.id}:${surface}`}
                  accent='sky'
                  size='sm'
                >
                  {translations(`surfaces.${surface}`)}
                </KangurStatusChip>
              ))}
            </div>
          </div>
        </div>

        <KangurInfoCard accent='violet' padding='lg' className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('modal.instances.eyebrow')}
            </div>
            <div className='text-lg font-black [color:var(--kangur-page-text)]'>
              {translations('modal.instances.title')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('modal.instances.description')}
            </div>
          </div>

          {!launchableRuntime ? (
            <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
              {translations('modal.instances.unavailable')}
            </div>
          ) : (
            <div className='grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]'>
              <div className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'space-y-4 p-4')}>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.engineLabel')}
                    </div>
                    <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {launchableRuntime.engineId ?? game.engineId}
                    </div>
                  </div>
                  <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.runtimeLabel')}
                    </div>
                    <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {launchableRuntime.screen}
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <label
                    className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                    htmlFor='games-library-instance-content-set'
                  >
                    {translations('modal.instances.contentSetLabel')}
                  </label>
                  <KangurSelectField
                    aria-label={translations('modal.instances.contentSetLabel')}
                    className='w-full'
                    disabled={replaceGameInstances.isPending}
                    id='games-library-instance-content-set'
                    onChange={(event) => {
                      setInstanceSyncError(null);
                      setInstanceContentSourceInstanceId(null);
                      setSelectedContentSetId(event.target.value || null);
                    }}
                    size='sm'
                    value={selectedContentSetId ?? ''}
                  >
                    <option value=''>{translations('modal.instances.contentSetPlaceholder')}</option>
                    {contentSets.map((contentSet) => (
                      <option key={contentSet.id} value={contentSet.id}>
                        {contentSet.label}
                      </option>
                    ))}
                  </KangurSelectField>
                  <p className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                    {selectedContentSet?.description ??
                      translations('modal.instances.contentSetHint')}
                  </p>
                </div>

                <div className='grid gap-3 md:grid-cols-2'>
                  <KangurTextField
                    aria-label={translations('modal.instances.titleLabel')}
                    className='w-full'
                    disabled={replaceGameInstances.isPending}
                    onChange={(event) => {
                      setInstanceSyncError(null);
                      setInstanceTitle(event.target.value);
                    }}
                    placeholder={translations('modal.instances.titlePlaceholder')}
                    value={instanceTitle}
                  />
                  <KangurTextField
                    aria-label={translations('modal.instances.emojiLabel')}
                    className='w-full'
                    disabled={replaceGameInstances.isPending}
                    onChange={(event) => {
                      setInstanceSyncError(null);
                      setInstanceEmoji(event.target.value);
                    }}
                    placeholder={translations('modal.instances.emojiPlaceholder')}
                    value={instanceEmoji}
                  />
                </div>

                <KangurTextField
                  aria-label={translations('modal.instances.descriptionLabel')}
                  className='w-full'
                  disabled={replaceGameInstances.isPending}
                  onChange={(event) => {
                    setInstanceSyncError(null);
                    setInstanceDescription(event.target.value);
                  }}
                  placeholder={translations('modal.instances.descriptionPlaceholder')}
                  value={instanceDescription}
                />

                <SettingsToggle
                  checked={instanceEnabled}
                  description={translations('modal.instances.enabledDescription')}
                  disabled={replaceGameInstances.isPending}
                  label={translations('modal.instances.enabledLabel')}
                  onChange={(checked) => {
                    setInstanceSyncError(null);
                    setInstanceEnabled(checked);
                  }}
                />

                <div className={cn(GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME, 'space-y-3 p-4')}>
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {translations('modal.instances.currentEngineSettingsTitle')}
                      </div>
                      {supportsInstanceEngineSettings ? (
                        <KangurButton
                          disabled={
                            replaceGameInstances.isPending ||
                            !canSyncInstanceEngineSettingsFromPreview
                          }
                          onClick={handleSyncInstanceEngineSettingsFromPreview}
                          size='sm'
                          type='button'
                          variant='surface'
                        >
                          {translations('modal.instances.usePreviewSettingsButton')}
                        </KangurButton>
                      ) : null}
                    </div>
                    <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.currentEngineSettingsDescription')}
                    </div>
                  </div>
                  {supportsInstanceEngineSettings ? (
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        <label
                          className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                          htmlFor='games-library-instance-clock-mode'
                        >
                          {translations('modal.instances.initialModeAriaLabel')}
                        </label>
                        <KangurSelectField
                          aria-label={translations('modal.instances.initialModeAriaLabel')}
                          className='w-full'
                          disabled={replaceGameInstances.isPending}
                          id='games-library-instance-clock-mode'
                          onChange={(event) =>
                            updateInstanceClockSettings(
                              'initialMode',
                              event.target.value as ClockPreviewSettings['initialMode']
                            )
                          }
                          size='sm'
                          value={instanceClockSettings.initialMode}
                        >
                          <option value='practice'>
                            {translations('modal.settings.initialModePractice')}
                          </option>
                          <option value='challenge'>
                            {translations('modal.settings.initialModeChallenge')}
                          </option>
                        </KangurSelectField>
                      </div>

                      <div className='space-y-3'>
                        <SettingsToggle
                          ariaLabel={translations('modal.instances.showModeSwitchAriaLabel')}
                          checked={instanceClockSettings.showModeSwitch}
                          description={translations('modal.settings.showModeSwitchDescription')}
                          disabled={replaceGameInstances.isPending}
                          label={translations('modal.settings.showModeSwitchLabel')}
                          onChange={(checked) =>
                            updateInstanceClockSettings('showModeSwitch', checked)
                          }
                        />
                        <SettingsToggle
                          ariaLabel={translations('modal.instances.showTaskTitleAriaLabel')}
                          checked={instanceClockSettings.showTaskTitle}
                          description={translations('modal.settings.showTaskTitleDescription')}
                          disabled={replaceGameInstances.isPending}
                          label={translations('modal.settings.showTaskTitleLabel')}
                          onChange={(checked) =>
                            updateInstanceClockSettings('showTaskTitle', checked)
                          }
                        />
                        <SettingsToggle
                          ariaLabel={translations('modal.instances.showTimeDisplayAriaLabel')}
                          checked={instanceClockSettings.showTimeDisplay}
                          description={translations('modal.settings.showTimeDisplayDescription')}
                          disabled={replaceGameInstances.isPending}
                          label={translations('modal.settings.showTimeDisplayLabel')}
                          onChange={(checked) =>
                            updateInstanceClockSettings('showTimeDisplay', checked)
                          }
                        />
                        <SettingsToggle
                          ariaLabel={translations('modal.instances.showHourHandAriaLabel')}
                          checked={instanceClockSettings.showHourHand}
                          description={translations('modal.settings.showHourHandDescription')}
                          disabled={replaceGameInstances.isPending}
                          label={translations('modal.settings.showHourHandLabel')}
                          onChange={(checked) =>
                            updateInstanceClockSettings('showHourHand', checked)
                          }
                        />
                        <SettingsToggle
                          ariaLabel={translations('modal.instances.showMinuteHandAriaLabel')}
                          checked={instanceClockSettings.showMinuteHand}
                          description={translations('modal.settings.showMinuteHandDescription')}
                          disabled={replaceGameInstances.isPending}
                          label={translations('modal.settings.showMinuteHandLabel')}
                          onChange={(checked) =>
                            updateInstanceClockSettings('showMinuteHand', checked)
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {currentEngineSettingsSummary.map((label) => (
                        <KangurStatusChip
                          key={`${game.id}:${selectedContentSet?.id ?? 'default'}:${label}`}
                          accent='sky'
                          size='sm'
                        >
                          {label}
                        </KangurStatusChip>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className={cn(GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME, 'space-y-3 p-4')}
                  data-testid='games-library-instance-preview'
                >
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {translations('modal.instances.previewTitle')}
                      </div>
                      <KangurStatusChip
                        accent={instanceDraftModeAccent}
                        data-testid='games-library-instance-mode-chip'
                        size='sm'
                      >
                        {translations(`modal.instances.mode.${instanceDraftMode}`)}
                      </KangurStatusChip>
                    </div>
                    <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.previewDescription')}
                    </div>
                  </div>

                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('modal.instances.contentSetLabel')}
                      </div>
                      <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {selectedContentSet?.label ??
                          translations('modal.instances.contentSetFallback')}
                      </div>
                      <div className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                        {selectedContentSet?.description ??
                          translations('modal.instances.contentSetHint')}
                      </div>
                      <div className='mt-2 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                        {translations('modal.instances.contentSourceLabel')}: {' '}
                        {instanceContentSource?.title ??
                          translations('modal.instances.sourceCustomDraft')}
                      </div>
                      {instanceContentSource ? (
                        <div className='mt-2'>
                          <KangurButton
                            disabled={replaceGameInstances.isPending}
                            onClick={handleDetachInstanceContentSource}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.instances.detachContentSourceButton')}
                          </KangurButton>
                        </div>
                      ) : null}
                      {selectedContentSet ? (
                        <div className='mt-3 flex flex-wrap gap-2'>
                          <KangurStatusChip accent='violet' size='sm'>
                            {getContentKindLabel(selectedContentSet.contentKind, translations)}
                          </KangurStatusChip>
                          {selectedContentSetFeedSummary ? (
                            <KangurStatusChip accent='sky' size='sm'>
                              {selectedContentSetFeedSummary}
                            </KangurStatusChip>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className={GAMES_LIBRARY_MODAL_STAT_CARD_CLASSNAME}>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('modal.instances.titleLabel')}
                      </div>
                      <div className='mt-2 flex items-center gap-2 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        <span>{(instanceEmoji.trim() || '🎮').slice(0, 12)}</span>
                        <span>{instanceTitle.trim() || translations('modal.instances.titlePlaceholder')}</span>
                      </div>
                      <div className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                        {instanceDescription.trim() ||
                          translations('modal.instances.descriptionPlaceholder')}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.engineLabel')}
                    </div>
                    <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                      {translations('modal.instances.engineSourceLabel')}: {' '}
                      {instanceEngineSource?.title ??
                        translations('modal.instances.sourceCustomDraft')}
                    </div>
                    {instanceEngineSource ? (
                      <div>
                        <KangurButton
                          disabled={replaceGameInstances.isPending}
                          onClick={handleDetachInstanceEngineSource}
                          size='sm'
                          type='button'
                          variant='surface'
                        >
                          {translations('modal.instances.detachEngineSourceButton')}
                        </KangurButton>
                      </div>
                    ) : null}
                    <div className='flex flex-wrap gap-2'>
                      {currentEngineSettingsSummary.map((label) => (
                        <KangurStatusChip
                          key={`preview:${game.id}:${selectedContentSet?.id ?? 'default'}:${label}`}
                          accent='sky'
                          size='sm'
                        >
                          {label}
                        </KangurStatusChip>
                      ))}
                    </div>
                  </div>

                  {supportsInstanceEngineSettings ? (
                    <div className='space-y-2'>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('modal.previewTitle')}
                      </div>
                      <div
                        className='rounded-[1.25rem] border border-[color:var(--kangur-soft-card-border)] bg-white/80 p-3'
                        data-testid='games-library-instance-clock-preview'
                      >
                        <ClockTrainingGamePreview
                          hideModeSwitch={!instanceClockSettings.showModeSwitch}
                          initialMode={instanceClockSettings.initialMode}
                          onFinish={() => undefined}
                          section={instancePreviewClockSection}
                          showHourHand={instanceClockSettings.showHourHand}
                          showMinuteHand={instanceClockSettings.showMinuteHand}
                          showTaskTitle={instanceClockSettings.showTaskTitle}
                          showTimeDisplay={instanceClockSettings.showTimeDisplay}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {instanceValidationMessages.length > 0 ? (
                  <div className='space-y-1 text-xs [color:var(--kangur-page-muted-text)]'>
                    {instanceValidationMessages.map((message) => (
                      <div key={message}>{message}</div>
                    ))}
                  </div>
                ) : null}

                {instanceSyncError ? (
                  <div
                    className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
                    data-testid='games-library-instance-sync-error'
                  >
                    {instanceSyncError}
                  </div>
                ) : null}

                <div
                  className='flex flex-wrap gap-2 border-t border-[color:var(--kangur-soft-card-border)] pt-3'
                  data-testid='games-library-instance-actions'
                >
                  {isInstanceEditorDirty ? (
                    <KangurButton
                      disabled={replaceGameInstances.isPending || instanceEditorBaseline === null}
                      onClick={() => {
                        if (!instanceEditorBaseline) {
                          return;
                        }

                        setInstanceSyncError(null);
                        applyInstanceEditorState(instanceEditorBaseline);
                      }}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {translations('modal.instances.discardChangesButton')}
                    </KangurButton>
                  ) : null}
                  <KangurButton
                    disabled={replaceGameInstances.isPending}
                    onClick={handleResetInstanceEditor}
                    size='sm'
                    type='button'
                    variant='surface'
                  >
                    {translations('modal.instances.newButton')}
                  </KangurButton>
                  {selectedInstanceId !== null ? (
                    <KangurButton
                      disabled={replaceGameInstances.isPending}
                      onClick={handleForkCurrentInstanceEditorToDraft}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {translations('modal.instances.forkDraftButton')}
                    </KangurButton>
                  ) : null}
                  <KangurButton
                    disabled={!canSaveInstance || replaceGameInstances.isPending}
                    onClick={() => {
                      void handleSaveInstance();
                    }}
                    size='sm'
                    type='button'
                    variant='primary'
                  >
                    {selectedInstanceId === null
                      ? translations('modal.instances.createButton')
                      : translations('modal.instances.saveButton')}
                  </KangurButton>
                  {canSaveInstance && (selectedInstanceId === null || isInstanceEditorDirty) ? (
                    <KangurButton
                      disabled={replaceGameInstances.isPending}
                      onClick={() => {
                        void handleSaveAndOpenInstance();
                      }}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {selectedInstanceId === null
                        ? translations('modal.instances.createAndOpenButton')
                        : translations('modal.instances.saveAndOpenButton')}
                    </KangurButton>
                  ) : null}
                  {selectedInstanceHref && !isInstanceEditorDirty ? (
                    <KangurButton asChild disabled={replaceGameInstances.isPending} size='sm' variant='surface'>
                      <Link
                        href={selectedInstanceHref}
                        targetPageKey='Game'
                        transitionSourceId={`kangur-games-library:${game.id}:instance:${selectedInstance?.id ?? 'selected'}`}
                      >
                        {translations('modal.instances.openButton')}
                      </Link>
                    </KangurButton>
                  ) : null}
                  {isInstanceEditorDirty ? (
                    <KangurStatusChip accent='amber' size='sm'>
                      {translations('modal.instances.dirtyBadge')}
                    </KangurStatusChip>
                  ) : null}
                </div>
              </div>

              <div className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'space-y-3 p-4')}>
                <div className='space-y-1'>
                  <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                    {translations('modal.instances.listTitle')}
                  </div>
                  <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.instances.listDescription')}
                  </div>
                </div>

                {activeInstances.length > 0 ? (
                  <div className='space-y-3 rounded-[1.25rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)] p-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='min-w-[16rem] flex-1'>
                        <KangurTextField
                          aria-label={translations('modal.instances.listSearchLabel')}
                          className='[background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]'
                          disabled={replaceGameInstances.isPending}
                          onChange={(event) => setSavedInstancesQuery(event.target.value)}
                          placeholder={translations('modal.instances.listSearchPlaceholder')}
                          size='sm'
                          type='search'
                          value={savedInstancesQuery}
                        />
                      </div>
                      <KangurButton
                        disabled={!hasSavedInstancesFilters || replaceGameInstances.isPending}
                        onClick={() => {
                          setSavedInstancesQuery('');
                          setSavedInstancesStatusFilter('all');
                          setSavedInstancesContentSetFilter('all');
                        }}
                        size='sm'
                        type='button'
                        variant='surface'
                      >
                        {translations('modal.instances.listClearFiltersButton')}
                      </KangurButton>
                    </div>
                    <SavedSectionsStatusControl
                      ariaLabel={translations('modal.instances.listStatusFilterLabel')}
                      className='w-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]'
                      onChange={setSavedInstancesStatusFilter}
                      options={[
                        {
                          label: translations('modal.instances.listStatusFilterAll'),
                          value: 'all',
                        },
                        {
                          label: translations('modal.instances.listStatusFilterEnabled'),
                          value: 'enabled',
                        },
                        {
                          label: translations('modal.instances.listStatusFilterDisabled'),
                          value: 'disabled',
                        },
                      ]}
                      value={savedInstancesStatusFilter}
                    />
                    {contentSets.length > 1 ? (
                      <div className='space-y-2'>
                        <label
                          className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                          htmlFor='games-library-instance-list-content-set-filter'
                        >
                          {translations('modal.instances.listContentSetFilterLabel')}
                        </label>
                        <KangurSelectField
                          aria-label={translations('modal.instances.listContentSetFilterLabel')}
                          className='w-full'
                          disabled={replaceGameInstances.isPending}
                          id='games-library-instance-list-content-set-filter'
                          onChange={(event) => {
                            setSavedInstancesContentSetFilter(event.target.value || 'all');
                          }}
                          size='sm'
                          value={savedInstancesContentSetFilter}
                        >
                          <option value='all'>
                            {translations('modal.instances.listContentSetFilterAll')}
                          </option>
                          {contentSets.map((contentSet) => (
                            <option key={contentSet.id} value={contentSet.id}>
                              {contentSet.label}
                            </option>
                          ))}
                        </KangurSelectField>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeInstances.length === 0 ? (
                  <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
                    {translations('modal.instances.listEmpty')}
                  </div>
                ) : filteredActiveInstances.length === 0 ? (
                  <div
                    className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}
                    data-testid='games-library-instance-search-empty'
                  >
                    {translations('modal.instances.listSearchEmpty')}
                  </div>
                ) : (
                  <div data-testid='games-library-instance-list' className='space-y-3'>
                    {filteredActiveInstances.map((instance) => {
                      const instanceIndex = activeInstances.findIndex(
                        (entry) => entry.id === instance.id
                      );
                      const isUsingInstanceContentSource =
                        instanceContentSourceInstanceId === instance.id;
                      const isUsingInstanceEngineSource =
                        instanceEngineSourceInstanceId === instance.id;
                      const contentSet = contentSets.find(
                        (entry) => entry.id === instance.contentSetId
                      );
                      const contentSetFeedSummary = contentSet
                        ? buildContentSetFeedSummary(contentSet, translations)
                        : null;
                      const instanceEngineSettingsSummary = supportsPreviewSettings
                        ? buildClockEngineSettingsSummary(
                            {
                              initialMode:
                                instance.engineOverrides.clockInitialMode ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.initialMode,
                              showHourHand:
                                instance.engineOverrides.showClockHourHand ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.showHourHand,
                              showMinuteHand:
                                instance.engineOverrides.showClockMinuteHand ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.showMinuteHand,
                              showModeSwitch:
                                instance.engineOverrides.showClockModeSwitch ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.showModeSwitch,
                              showTaskTitle:
                                instance.engineOverrides.showClockTaskTitle ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.showTaskTitle,
                              showTimeDisplay:
                                instance.engineOverrides.showClockTimeDisplay ??
                                DEFAULT_CLOCK_PREVIEW_SETTINGS.showTimeDisplay,
                            },
                            translations
                          )
                        : [translations('modal.instances.currentEngineSettingsDefault')];

                      return (
                        <div
                          key={instance.id}
                          className={cn(
                            'space-y-3 rounded-[1.25rem] border p-3',
                            instance.id === selectedInstanceId
                              ? 'border-[color:var(--kangur-accent-sky-start,#38bdf8)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)] shadow-[0_18px_46px_-36px_rgba(56,189,248,0.45)]'
                              : 'border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]'
                          )}
                          data-testid={`games-library-instance-${instance.id}`}
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0 flex-1'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <span className='text-lg'>{instance.emoji}</span>
                                <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                                  {instance.title}
                                </div>
                                <KangurStatusChip
                                  accent={instance.enabled ? 'emerald' : 'slate'}
                                  size='sm'
                                >
                                  {instance.enabled
                                    ? translations('modal.instances.enabledBadge')
                                    : translations('modal.instances.disabledBadge')}
                                </KangurStatusChip>
                                {isUsingInstanceContentSource ? (
                                  <KangurStatusChip accent='violet' size='sm'>
                                    {translations('modal.instances.contentSourceBadge')}
                                  </KangurStatusChip>
                                ) : null}
                                {isUsingInstanceEngineSource ? (
                                  <KangurStatusChip accent='sky' size='sm'>
                                    {translations('modal.instances.engineSourceBadge')}
                                  </KangurStatusChip>
                                ) : null}
                              </div>
                              <div className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                                {contentSet?.label ??
                                  translations('modal.instances.contentSetFallback')}
                              </div>
                              {instance.description ? (
                                <div className='mt-1 text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
                                  {instance.description}
                                </div>
                              ) : null}
                              {contentSet ? (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                  <KangurStatusChip accent='violet' size='sm'>
                                    {getContentKindLabel(contentSet.contentKind, translations)}
                                  </KangurStatusChip>
                                  {contentSetFeedSummary ? (
                                    <KangurStatusChip accent='sky' size='sm'>
                                      {contentSetFeedSummary}
                                    </KangurStatusChip>
                                  ) : null}
                                </div>
                              ) : null}
                              <div className='mt-3 flex flex-wrap gap-2'>
                                {instanceEngineSettingsSummary.map((label) => (
                                  <KangurStatusChip
                                    key={`${instance.id}:${label}`}
                                    accent='sky'
                                    size='sm'
                                  >
                                    {label}
                                  </KangurStatusChip>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className='flex flex-wrap gap-2'>
                            <KangurButton
                              disabled={
                                replaceGameInstances.isPending || isUsingInstanceContentSource
                              }
                              onClick={() => handleUseInstanceContentSet(instance)}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {isUsingInstanceContentSource
                                ? translations('modal.instances.usingContentSetButton')
                                : translations('modal.instances.useContentSetButton')}
                            </KangurButton>
                            {supportsInstanceEngineSettings ? (
                              <KangurButton
                                disabled={
                                  replaceGameInstances.isPending || isUsingInstanceEngineSource
                                }
                                onClick={() => handleUseInstanceEngineSettings(instance)}
                                size='sm'
                                type='button'
                                variant='surface'
                              >
                                {isUsingInstanceEngineSource
                                  ? translations('modal.instances.usingEngineSettingsButton')
                                  : translations('modal.instances.useEngineSettingsButton')}
                              </KangurButton>
                            ) : null}
                            <KangurButton
                              onClick={() => handleEditInstance(instance)}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {translations('modal.instances.editButton')}
                            </KangurButton>
                            <KangurButton
                              disabled={replaceGameInstances.isPending}
                              onClick={() => handleDuplicateInstance(instance)}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {translations('modal.instances.duplicateButton')}
                            </KangurButton>
                            <KangurButton
                              disabled={replaceGameInstances.isPending}
                              onClick={() => handleToggleInstanceEnabled(instance)}
                              size='sm'
                              type='button'
                              variant='surface'
                              >
                              {instance.enabled
                                ? translations('modal.instances.disableButton')
                                : translations('modal.instances.enableButton')}
                            </KangurButton>
                            <KangurButton
                              aria-label={`${translations('modal.instances.moveUpButton')}: ${instance.title}`}
                              disabled={replaceGameInstances.isPending || instanceIndex === 0}
                              onClick={() => handleMoveInstance(instance.id, 'up')}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {translations('modal.instances.moveUpButton')}
                            </KangurButton>
                            <KangurButton
                              aria-label={`${translations('modal.instances.moveDownButton')}: ${instance.title}`}
                              disabled={
                                replaceGameInstances.isPending ||
                                instanceIndex === activeInstances.length - 1
                              }
                              onClick={() => handleMoveInstance(instance.id, 'down')}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {translations('modal.instances.moveDownButton')}
                            </KangurButton>
                            <KangurButton asChild size='sm' variant='surface'>
                              <Link
                                href={buildKangurGameInstanceLaunchHref(basePath, instance)}
                                targetPageKey='Game'
                                transitionSourceId={`kangur-games-library:${game.id}:instance:${instance.id}`}
                              >
                                {translations('modal.instances.openButton')}
                              </Link>
                            </KangurButton>
                            <KangurButton
                              disabled={replaceGameInstances.isPending}
                              onClick={() => handleRemoveInstance(instance)}
                              size='sm'
                              type='button'
                              variant='surface'
                            >
                              {translations('modal.instances.removeButton')}
                            </KangurButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </KangurInfoCard>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(20rem,0.92fr)]'>
          <div className='space-y-4'>
            <KangurInfoCard accent='amber' padding='lg' className='space-y-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.previewEyebrow')}
                  </div>
                  <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                    {translations('modal.previewTitle')}
                  </div>
                </div>
                <KangurStatusChip accent='amber' size='sm'>
                  {attachedLessonLabel}
                </KangurStatusChip>
              </div>

              {game.id === 'clock_training' ? (
                <div
                  className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'p-4')}
                  data-testid='games-library-hub-clock-preview'
                >
                  <ClockTrainingGamePreview
                    hideModeSwitch={!clockSettings.showModeSwitch}
                    initialMode={clockSettings.initialMode}
                    onFinish={() => undefined}
                    section={clockSettings.clockSection}
                    showHourHand={clockSettings.showHourHand}
                    showMinuteHand={clockSettings.showMinuteHand}
                    showTaskTitle={clockSettings.showTaskTitle}
                    showTimeDisplay={clockSettings.showTimeDisplay}
                  />
                </div>
              ) : (
                <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
                  {translations('modal.previewFallback')}
                </div>
              )}

              <div className={cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'space-y-3 p-4')}>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.lessonEyebrow')}
                  </div>
                  <div className='text-base font-black [color:var(--kangur-page-text)]'>
                    {translations('modal.lessonTitle')}
                  </div>
                  <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.scaffoldHint', { lesson: attachedLessonLabel })}
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                    {translations('labels.lessonLinks')}
                  </div>
                  <div data-testid='games-library-linked-lessons' className='flex flex-wrap gap-2'>
                    {hasUnassignedAttachedLesson ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        {translations('modal.lessonUnassigned')}
                      </KangurStatusChip>
                    ) : null}
                    {linkedLessonIds.length > 0 ? (
                      linkedLessonIds.map((componentId) => (
                        <KangurStatusChip
                          key={`${linkedLessonChipKeyPrefix}:${componentId}`}
                          accent={componentId === attachedLessonId ? 'emerald' : 'sky'}
                          size='sm'
                        >
                          {lessonLabelMap[componentId] ?? componentId}
                        </KangurStatusChip>
                      ))
                    ) : !hasUnassignedAttachedLesson ? (
                      <KangurStatusChip accent='slate' size='sm'>
                        {translations('modal.lessonUnassigned')}
                      </KangurStatusChip>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className='flex flex-wrap gap-2 border-t border-[color:var(--kangur-soft-card-border)] pt-3'>
                {gameHref ? (
                  <KangurButton
                    asChild
                    disabled={replaceLessonGameSections.isPending}
                    size='sm'
                    variant='primary'
                  >
                    <Link
                      href={gameHref}
                      targetPageKey='Game'
                      transitionSourceId={gameTransitionSourceId}
                    >
                      {translations('actions.openGame')}
                    </Link>
                  </KangurButton>
                ) : null}
                {lessonHref ? (
                  <KangurButton
                    asChild
                    disabled={replaceLessonGameSections.isPending}
                    size='sm'
                    variant='surface'
                  >
                    <Link
                      href={lessonHref}
                      targetPageKey='Lessons'
                      transitionSourceId={lessonTransitionSourceId}
                    >
                      {translations('actions.openLessons')}
                    </Link>
                  </KangurButton>
                ) : null}
              </div>
            </KangurInfoCard>

            <KangurInfoCard accent='sky' padding='lg' className='space-y-4'>
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.lessonEyebrow')}
                </div>
                <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                  {translations('modal.lessonTitle')}
                </div>
              </div>

              <div className='space-y-2'>
                <label
                  className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                  htmlFor='games-library-attached-lesson'
                >
                  {translations('modal.lessonSelectLabel')}
                </label>
                <KangurSelectField
                  aria-label={translations('modal.lessonSelectLabel')}
                  className='w-full'
                  disabled={mutationsBlocked}
                  id='games-library-attached-lesson'
                  onChange={(event) => {
                    setSyncError(null);
                    setAttachedLessonId(
                      event.target.value
                        ? (event.target.value as KangurLessonComponentId)
                        : null
                    );
                  }}
                  size='sm'
                  value={attachedLessonId ?? ''}
                >
                  <option value=''>{translations('modal.lessonPlaceholder')}</option>
                  {lessonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </KangurSelectField>
              </div>
            </KangurInfoCard>
          </div>

          <div className='space-y-4'>
            {isInitialSectionsLoading ? (
              <div
                data-testid='games-library-sections-loading'
                className='rounded-[1.5rem] border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900'
              >
                {translations('modal.sectionsLoading')}
              </div>
            ) : null}
            {replaceLessonGameSections.isPending ? (
              <div
                data-testid='games-library-sync-pending'
                className='rounded-[1.5rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900'
              >
                {translations('modal.syncPending')}
              </div>
            ) : null}
            {!replaceLessonGameSections.isPending && syncError ? (
              <div
                data-testid='games-library-sync-error'
                className='rounded-[1.5rem] border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900'
              >
                {syncError}
              </div>
            ) : null}
            <KangurInfoCard accent='emerald' padding='lg' className='space-y-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.draftEyebrow')}
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                      {selectedSectionId
                        ? translations('modal.editDraftTitle')
                        : translations('modal.draftTitle')}
                    </div>
                    <KangurStatusChip
                      accent={draftEnabled ? 'emerald' : 'slate'}
                      size='sm'
                      data-testid='games-library-draft-status'
                    >
                      {draftEnabled
                        ? translations('modal.enabledBadge')
                        : translations('modal.disabledBadge')}
                    </KangurStatusChip>
                    {isEditorDirty ? (
                      <KangurStatusChip accent='amber' size='sm'>
                        {translations('modal.dirtyBadge')}
                      </KangurStatusChip>
                    ) : null}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {isEditorDirty ? (
                    <KangurButton
                      disabled={mutationsBlocked || editorBaseline === null}
                      onClick={() => {
                        if (!editorBaseline) {
                          return;
                        }

                        setSyncError(null);
                        applyEditorState(editorBaseline);
                      }}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {translations('modal.discardChangesButton')}
                    </KangurButton>
                  ) : null}
                  {selectedSectionId ? (
                    <KangurButton
                      disabled={mutationsBlocked}
                      onClick={handleResetEditor}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {translations('modal.newDraftButton')}
                    </KangurButton>
                  ) : null}
                </div>
              </div>

              <div className='space-y-2'>
                <label
                  className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                  htmlFor='games-library-draft-title'
                >
                  {translations('modal.draftNameLabel')}
                </label>
                <input
                  aria-label={translations('modal.draftNameLabel')}
                  id='games-library-draft-title'
                  className={cn(
                    GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
                    'min-h-11 w-full px-4 py-2.5 text-sm [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
                  )}
                  disabled={mutationsBlocked}
                  onChange={(event) => {
                    setSyncError(null);
                    setDraftTitle(event.target.value);
                  }}
                  placeholder={translations('modal.draftNamePlaceholder')}
                  value={draftTitle}
                />
              </div>

              <div className='space-y-2'>
                <label
                  className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                  htmlFor='games-library-draft-subtext'
                >
                  {translations('modal.draftSubtextLabel')}
                </label>
                <textarea
                  aria-label={translations('modal.draftSubtextLabel')}
                  id='games-library-draft-subtext'
                  className={cn(
                    GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
                    'min-h-28 w-full px-4 py-3 text-sm leading-6 [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
                  )}
                  disabled={mutationsBlocked}
                  onChange={(event) => {
                    setSyncError(null);
                    setDraftSubtext(event.target.value);
                  }}
                  placeholder={translations('modal.draftSubtextPlaceholder')}
                  value={draftSubtext}
                />
              </div>

              <div className='space-y-2'>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.draftIconLabel')}
                </div>
                <div className='grid grid-cols-4 gap-2'>
                  {HUB_SECTION_ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      aria-label={translations('modal.draftIconAria', { icon })}
                      className={cn(
                        cn(
                          GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
                          'flex min-h-11 items-center justify-center text-xl transition'
                        ),
                        mutationsBlocked && 'cursor-not-allowed opacity-70',
                        draftIcon === icon
                          ? 'border-indigo-500 [background:color-mix(in_srgb,var(--kangur-soft-card-background)_84%,var(--kangur-accent-indigo-start,#a855f7))]'
                          : 'hover:border-indigo-300'
                      )}
                      disabled={mutationsBlocked}
                      onClick={() => {
                        setSyncError(null);
                        setDraftIcon(icon);
                      }}
                      type='button'
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className='flex items-center gap-3'>
                  <input
                    aria-label={translations('modal.customIconInputLabel')}
                    className={cn(
                      GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
                      'min-h-11 flex-1 px-4 py-2.5 text-sm [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
                    )}
                    disabled={mutationsBlocked}
                    maxLength={12}
                    onChange={(event) => {
                      setSyncError(null);
                      setDraftIcon(event.target.value);
                    }}
                    placeholder={translations('modal.customIconInputPlaceholder')}
                    value={draftIcon}
                  />
                  <div
                    aria-label={translations('modal.customIconPreviewLabel')}
                    className={cn(
                      GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
                      'flex min-h-11 min-w-11 items-center justify-center px-3 text-xl'
                    )}
                    data-testid='games-library-draft-icon-preview'
                  >
                    {(draftIcon.trim() || '🎮').slice(0, 12)}
                  </div>
                </div>
              </div>

              <SettingsToggle
                checked={draftEnabled}
                description={translations('modal.draftEnabledDescription')}
                disabled={mutationsBlocked}
                label={translations('modal.draftEnabledLabel')}
                onChange={(checked) => {
                  setSyncError(null);
                  setDraftEnabled(checked);
                }}
              />

              <KangurButton
                disabled={!canAddDraft || mutationsBlocked}
                onClick={() => {
                  void handleSaveDraft();
                }}
                size='sm'
                type='button'
                variant='primary'
              >
                {selectedSectionId
                  ? translations('modal.saveDraftButton')
                  : translations('modal.addDraftButton')}
              </KangurButton>
              {draftValidationMessages.length > 0 ? (
                <div
                  data-testid='games-library-draft-validation'
                  className='rounded-[1.25rem] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900'
                  role='status'
                >
                  <div className='space-y-1'>
                    {draftValidationMessages.map((message) => (
                      <div key={message}>{message}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </KangurInfoCard>

            {supportsPreviewSettings && settingsOpen ? (
              <KangurInfoCard
                accent='slate'
                className='space-y-4'
                data-testid='games-library-clock-settings-panel'
                padding='lg'
              >
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.settingsEyebrow')}
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                      {translations('modal.settingsTitle')}
                    </div>
                    <KangurButton
                      disabled={!canResetClockSettings || mutationsBlocked}
                      onClick={handleResetClockSettings}
                      size='sm'
                      type='button'
                      variant='surface'
                    >
                      {translations('modal.resetPreviewSettingsButton')}
                    </KangurButton>
                  </div>
                  <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.settingsDescription')}
                  </div>
                </div>

                <div className='space-y-3'>
                  <SettingsToggle
                    checked={clockSettings.showModeSwitch}
                    description={translations('modal.settings.showModeSwitchDescription')}
                    disabled={mutationsBlocked}
                    label={translations('modal.settings.showModeSwitchLabel')}
                    onChange={(checked) => updateClockSettings('showModeSwitch', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showTaskTitle}
                    description={translations('modal.settings.showTaskTitleDescription')}
                    disabled={mutationsBlocked}
                    label={translations('modal.settings.showTaskTitleLabel')}
                    onChange={(checked) => updateClockSettings('showTaskTitle', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showTimeDisplay}
                    description={translations('modal.settings.showTimeDisplayDescription')}
                    disabled={mutationsBlocked}
                    label={translations('modal.settings.showTimeDisplayLabel')}
                    onChange={(checked) => updateClockSettings('showTimeDisplay', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showHourHand}
                    description={translations('modal.settings.showHourHandDescription')}
                    disabled={mutationsBlocked}
                    label={translations('modal.settings.showHourHandLabel')}
                    onChange={(checked) => updateClockSettings('showHourHand', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showMinuteHand}
                    description={translations('modal.settings.showMinuteHandDescription')}
                    disabled={mutationsBlocked}
                    label={translations('modal.settings.showMinuteHandLabel')}
                    onChange={(checked) => updateClockSettings('showMinuteHand', checked)}
                  />
                </div>

                <div className='space-y-2'>
                  <label
                    className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                    htmlFor='games-library-clock-section'
                  >
                    {translations('modal.settings.clockSectionLabel')}
                  </label>
                  <KangurSelectField
                    aria-label={translations('modal.settings.clockSectionLabel')}
                    disabled={mutationsBlocked}
                    id='games-library-clock-section'
                    onChange={(event) =>
                      updateClockSettings(
                        'clockSection',
                        event.target.value as ClockPreviewSettings['clockSection']
                      )
                    }
                    size='sm'
                    value={clockSettings.clockSection}
                  >
                    <option value='hours'>
                      {translations('modal.settings.clockSectionHours')}
                    </option>
                    <option value='minutes'>
                      {translations('modal.settings.clockSectionMinutes')}
                    </option>
                    <option value='combined'>
                      {translations('modal.settings.clockSectionCombined')}
                    </option>
                  </KangurSelectField>
                </div>

                <div className='space-y-2'>
                  <label
                    className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'
                    htmlFor='games-library-clock-mode'
                  >
                    {translations('modal.settings.initialModeLabel')}
                  </label>
                  <KangurSelectField
                    aria-label={translations('modal.settings.initialModeLabel')}
                    disabled={mutationsBlocked}
                    id='games-library-clock-mode'
                    onChange={(event) =>
                      updateClockSettings(
                        'initialMode',
                        event.target.value as ClockPreviewSettings['initialMode']
                      )
                    }
                    size='sm'
                    value={clockSettings.initialMode}
                  >
                    <option value='practice'>
                      {translations('modal.settings.initialModePractice')}
                    </option>
                    <option value='challenge'>
                      {translations('modal.settings.initialModeChallenge')}
                    </option>
                  </KangurSelectField>
                </div>
              </KangurInfoCard>
            ) : null}

            <KangurInfoCard accent='slate' padding='lg' className='space-y-4'>
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.draftListEyebrow')}
                </div>
              <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                {translations('modal.draftListTitle')}
              </div>
            </div>
            {!isInitialSectionsLoading && activeSections.length > 0 ? (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='min-w-0 flex-1'>
                    <KangurTextField
                      aria-label={translations('modal.draftListSearchLabel')}
                      className='[background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]'
                      disabled={mutationsBlocked}
                      onChange={(event) => setSavedSectionsQuery(event.target.value)}
                      placeholder={translations('modal.draftListSearchPlaceholder')}
                      size='sm'
                      type='search'
                      value={savedSectionsQuery}
                    />
                  </div>
                  <KangurButton
                    disabled={!hasSavedSectionsFilters || mutationsBlocked}
                    onClick={() => {
                      setSavedSectionsQuery('');
                      setSavedSectionsStatusFilter('all');
                    }}
                    size='sm'
                    type='button'
                    variant='surface'
                  >
                    {translations('modal.draftListClearFiltersButton')}
                  </KangurButton>
                </div>
                <SavedSectionsStatusControl
                  ariaLabel={translations('modal.draftListStatusFilterLabel')}
                  className='w-full [background:color-mix(in_srgb,var(--kangur-soft-card-background)_97%,white)]'
                  onChange={setSavedSectionsStatusFilter}
                  options={[
                    {
                      label: translations('modal.draftListStatusFilterAll'),
                      value: 'all',
                    },
                    {
                      label: translations('modal.draftListStatusFilterEnabled'),
                      value: 'enabled',
                    },
                    {
                      label: translations('modal.draftListStatusFilterDisabled'),
                      value: 'disabled',
                    },
                  ]}
                  value={savedSectionsStatusFilter}
                />
              </div>
            ) : null}

              {isInitialSectionsLoading ? (
                <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
                  {translations('modal.sectionsLoading')}
                </div>
              ) : activeSections.length > 0 ? (
                filteredActiveSections.length > 0 ? (
                <div className='space-y-3'>
                  {filteredActiveSections.map((draft) => (
                    <div
                      key={draft.id}
                      data-testid={`games-library-saved-section-${draft.id}`}
                      className={cn(
                        cn(GAMES_LIBRARY_MODAL_SECTION_SURFACE_CLASSNAME, 'p-4 transition'),
                        !draft.enabled && 'opacity-70 saturate-[0.8]',
                        draft.id === selectedSectionId
                          ? 'border-indigo-500 shadow-[0_18px_48px_-32px_rgba(79,70,229,0.7)]'
                          : null
                      )}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <span className='text-xl' aria-hidden='true'>
                              {draft.emoji}
                            </span>
                            <div className='text-sm font-bold [color:var(--kangur-page-text)]'>
                              {draft.title}
                            </div>
                            {draft.id === selectedSectionId ? (
                              <KangurStatusChip accent='indigo' size='sm'>
                                {translations('modal.editingBadge')}
                              </KangurStatusChip>
                            ) : null}
                            <KangurStatusChip
                              accent={draft.enabled ? 'emerald' : 'slate'}
                              size='sm'
                            >
                              {draft.enabled
                                ? translations('modal.enabledBadge')
                                : translations('modal.disabledBadge')}
                            </KangurStatusChip>
                          </div>
                          {draft.description ? (
                            <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                              {draft.description}
                            </p>
                          ) : null}
                          <div className='mt-3 flex flex-wrap gap-2'>
                            <KangurStatusChip accent='sky' size='sm'>
                              {lessonLabelMap[draft.lessonComponentId] ?? draft.lessonComponentId}
                            </KangurStatusChip>
                            <KangurStatusChip accent='amber' size='sm'>
                              {gameChipLabel}
                            </KangurStatusChip>
                          </div>
                          {supportsPreviewSettings ? (
                            <div
                              data-testid={`games-library-saved-section-settings-${draft.id}`}
                              className='mt-2 flex flex-wrap gap-2'
                            >
                              {buildClockSettingsSummary(draft).map((label) => (
                                <KangurStatusChip
                                  key={`${draft.id}:${label}`}
                                  accent='slate'
                                  size='sm'
                                >
                                  {label}
                                </KangurStatusChip>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <KangurButton
                            aria-label={`${draft.enabled ? translations('modal.disableDraftButton') : translations('modal.enableDraftButton')}: ${draft.title}`}
                            disabled={mutationsBlocked}
                            onClick={() => {
                              handleToggleSectionEnabled(draft.id);
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {draft.enabled
                              ? translations('modal.disableDraftButton')
                              : translations('modal.enableDraftButton')}
                          </KangurButton>
                          <KangurButton
                            aria-label={`${translations('modal.moveDraftUpButton')}: ${draft.title}`}
                            disabled={
                              activeSections.findIndex((section) => section.id === draft.id) === 0 ||
                              mutationsBlocked
                            }
                            onClick={() => {
                              handleMoveSection(draft.id, 'up');
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.moveDraftUpButton')}
                          </KangurButton>
                          <KangurButton
                            aria-label={`${translations('modal.moveDraftDownButton')}: ${draft.title}`}
                            disabled={
                              activeSections.findIndex((section) => section.id === draft.id) ===
                                activeSections.length - 1 || mutationsBlocked
                            }
                            onClick={() => {
                              handleMoveSection(draft.id, 'down');
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.moveDraftDownButton')}
                          </KangurButton>
                          <KangurButton
                            aria-label={`${translations('modal.duplicateDraftButton')}: ${draft.title}`}
                            disabled={mutationsBlocked}
                            onClick={() => {
                              handleDuplicateSection(draft);
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.duplicateDraftButton')}
                          </KangurButton>
                          <KangurButton
                            aria-label={`${translations('modal.editDraftButton')}: ${draft.title}`}
                            disabled={mutationsBlocked}
                            onClick={() => {
                              handleEditDraft(draft);
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.editDraftButton')}
                          </KangurButton>
                          <KangurButton
                            aria-label={`${translations('modal.removeDraftButton')}: ${draft.title}`}
                            disabled={mutationsBlocked}
                            onClick={() => {
                              handleRemoveDraft(draft);
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.removeDraftButton')}
                          </KangurButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div
                    data-testid='games-library-saved-section-search-empty'
                    className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}
                  >
                    {translations('modal.draftListSearchEmpty')}
                  </div>
                )
              ) : (
                <div className={GAMES_LIBRARY_MODAL_EMPTY_STATE_CLASSNAME}>
                  {translations('modal.draftListEmpty')}
                </div>
              )}
            </KangurInfoCard>
          </div>
        </div>
      </div>
    ),
  });
}
