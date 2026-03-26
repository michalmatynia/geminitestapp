'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/lessons/lesson-catalog';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
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
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import {
  useKangurLessonGameSections,
  useReplaceKangurLessonGameSections,
} from '@/features/kangur/ui/hooks/useKangurLessonGameSections';
import type {
  ClockGameMode,
  ClockTrainingSectionId,
} from '@/features/kangur/ui/components/clock-training/types';
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

type SavedSectionsStatusFilter = 'all' | 'enabled' | 'disabled';
type SavedSectionsStatusFilterOption = {
  label: string;
  value: SavedSectionsStatusFilter;
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
                : 'text-[color:var(--kangur-page-muted-text)] hover:bg-white/70'
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

const createDraftId = (): string =>
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSectionSortOrder = (
  sections: readonly KangurLessonGameSection[]
): KangurLessonGameSection[] =>
  sections.map((section, index) => ({
    ...section,
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

type SettingsToggleProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function SettingsToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: SettingsToggleProps): React.JSX.Element {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 rounded-3xl border border-[color:var(--kangur-page-border)] bg-white/70 px-4 py-3',
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
        aria-label={label}
        checked={checked}
        className='mt-1 h-4 w-4 accent-indigo-600'
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type='checkbox'
      />
    </label>
  );
}

export function GamesLibraryGameModal({
  open,
  onOpenChange,
  game,
  basePath,
}: GamesLibraryGameModalProps): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const lessonGameSectionsQuery = useKangurLessonGameSections({
    enabled: open && Boolean(game),
    gameId: game?.id,
  });
  const replaceLessonGameSections = useReplaceKangurLessonGameSections();
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
  const [optimisticSections, setOptimisticSections] = useState<KangurLessonGameSection[] | null>(
    null
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clockSettings, setClockSettings] = useState<ClockPreviewSettings>(
    DEFAULT_CLOCK_PREVIEW_SETTINGS
  );
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
  const supportsPreviewSettings = game?.id === 'clock_training';

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
    pendingEditorRestoreRef.current = null;
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
    setOptimisticSections(null);
  }, [game?.id, persistedSections]);

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
  const hasVisibleClockHand = clockSettings.showHourHand || clockSettings.showMinuteHand;
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
  const isEditorDirty =
    editorBaseline !== null && !areEditorStatesEqual(currentEditorState, editorBaseline);
  const canResetClockSettings =
    supportsPreviewSettings &&
    !areClockPreviewSettingsEqual(clockSettings, DEFAULT_CLOCK_PREVIEW_SETTINGS);

  const canAddDraft = draftValidationMessages.length === 0;

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

  const handleResetClockSettings = (): void => {
    setSyncError(null);
    setClockSettings(DEFAULT_CLOCK_PREVIEW_SETTINGS);
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

  return (
    <KangurDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && replaceLessonGameSections.isPending) {
          return;
        }

        onOpenChange(nextOpen);
      }}
      overlayVariant='standard'
      contentProps={{
        'data-testid': 'games-library-game-modal',
        className:
          'w-[min(calc(100vw-2rem),74rem)] rounded-[2rem] border border-[color:var(--kangur-page-border)] bg-[color:var(--kangur-page-background)] p-5 shadow-[0_40px_120px_-52px_rgba(15,23,42,0.5)] sm:p-6',
      }}
    >
      <div className='space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 flex-1 space-y-2 pr-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                {translations('modal.eyebrow')}
              </div>
              <KangurStatusChip accent='amber' size='sm'>
                {translations('modal.scaffoldBadge')}
              </KangurStatusChip>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='text-3xl' aria-hidden='true'>
                {game.emoji}
              </div>
              <div>
                <h2 className='text-2xl font-black [color:var(--kangur-page-text)]'>
                  {game.title}
                </h2>
                <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
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
              disabled={replaceLessonGameSections.isPending}
              onClick={() => onOpenChange(false)}
              size='sm'
              type='button'
              variant='surface'
            >
              {translations('modal.closeButton')}
            </KangurButton>
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.9fr)]'>
          <div className='space-y-4'>
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
                        key={`${game.id}:${componentId}`}
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

              <div className='rounded-3xl border border-dashed border-[color:var(--kangur-page-border)] px-4 py-3 text-sm [color:var(--kangur-page-muted-text)]'>
                {translations('modal.scaffoldHint', { lesson: attachedLessonLabel })}
              </div>
            </KangurInfoCard>

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
                <div className='rounded-[1.75rem] border border-[color:var(--kangur-page-border)] bg-white/80 p-4'>
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
                <div className='rounded-[1.75rem] border border-dashed border-[color:var(--kangur-page-border)] px-4 py-10 text-center text-sm [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.previewFallback')}
                </div>
              )}

              <div className='flex flex-wrap gap-2'>
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
                      transitionSourceId={`kangur-games-library:${game.id}:modal-game`}
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
                      transitionSourceId={`kangur-games-library:${game.id}:modal-lessons`}
                    >
                      {translations('actions.openLessons')}
                    </Link>
                  </KangurButton>
                ) : null}
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
                  id='games-library-draft-title'
                  className='min-h-11 w-full rounded-2xl border border-[color:var(--kangur-page-border)] bg-white/80 px-4 py-2.5 text-sm [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
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
                  id='games-library-draft-subtext'
                  className='min-h-28 w-full rounded-2xl border border-[color:var(--kangur-page-border)] bg-white/80 px-4 py-3 text-sm leading-6 [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
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
                        'flex min-h-11 items-center justify-center rounded-2xl border text-xl transition',
                        mutationsBlocked && 'cursor-not-allowed opacity-70',
                        draftIcon === icon
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-[color:var(--kangur-page-border)] bg-white/80 hover:border-indigo-300'
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
                    className='min-h-11 flex-1 rounded-2xl border border-[color:var(--kangur-page-border)] bg-white/80 px-4 py-2.5 text-sm [color:var(--kangur-page-text)] outline-none transition focus:border-[color:var(--kangur-page-accent)]'
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
                    className='flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-[color:var(--kangur-page-border)] bg-white/80 px-3 text-xl'
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
              <KangurInfoCard accent='slate' padding='lg' className='space-y-4'>
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
                      className='bg-white/80'
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
                  className='w-full bg-white/80'
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
                <div className='rounded-[1.5rem] border border-dashed border-[color:var(--kangur-page-border)] px-4 py-8 text-center text-sm [color:var(--kangur-page-muted-text)]'>
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
                        'rounded-[1.5rem] border bg-white/80 p-4 transition',
                        !draft.enabled && 'opacity-70 saturate-[0.8]',
                        draft.id === selectedSectionId
                          ? 'border-indigo-500 shadow-[0_18px_48px_-32px_rgba(79,70,229,0.7)]'
                          : 'border-[color:var(--kangur-page-border)]'
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
                              {game.title}
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
                              setSyncError(null);
                              syncEditorFromSection(draft, game);
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
                              const nextSections = normalizeSectionSortOrder(
                                activeSections.filter((entry) => entry.id !== draft.id)
                              );
                              const removingSelectedSection = draft.id === selectedSectionId;
                              const previousEditorState =
                                !removingSelectedSection ? captureEditorState() : null;

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
                    className='rounded-[1.5rem] border border-dashed border-[color:var(--kangur-page-border)] px-4 py-8 text-center text-sm [color:var(--kangur-page-muted-text)]'
                  >
                    {translations('modal.draftListSearchEmpty')}
                  </div>
                )
              ) : (
                <div className='rounded-[1.5rem] border border-dashed border-[color:var(--kangur-page-border)] px-4 py-8 text-center text-sm [color:var(--kangur-page-muted-text)]'>
                  {translations('modal.draftListEmpty')}
                </div>
              )}
            </KangurInfoCard>
          </div>
        </div>
      </div>
    </KangurDialog>
  );
}
