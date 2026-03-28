'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useDeferredValue } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  getKangurBuiltInGameInstanceId,
  getKangurLaunchableGameRuntimeSpecForGame,
} from '@/features/kangur/games';
import { mergeKangurGameContentSetsForGame } from '@/features/kangur/games/content-sets';
import {
  buildKangurGameInstanceLaunchHref,
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import {
  useKangurGameContentSets,
  useReplaceKangurGameContentSets,
} from '@/features/kangur/ui/hooks/useKangurGameContentSets';
import {
  useKangurGameInstances,
  useReplaceKangurGameInstances,
} from '@/features/kangur/ui/hooks/useKangurGameInstances';
import {
  useKangurLessonGameSections,
  useReplaceKangurLessonGameSections,
} from '@/features/kangur/ui/hooks/useKangurLessonGameSections';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type {
  KangurGameContentSet,
  KangurGameContentSetId,
  KangurGameContentSetKind,
  KangurGameInstance,
} from '@/shared/contracts/kangur-game-instances';
import type {
  KangurGameRuntimeRendererProps,
  KangurGeometryDrawingShapeId,
} from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type {
  ClockGameMode,
  ClockTrainingSectionId,
} from '@/features/kangur/ui/components/clock-training/types';
import {
  DEFAULT_CLOCK_PREVIEW_SETTINGS,
  DEFAULT_CALENDAR_CONTENT_SET_SECTION,
  DEFAULT_LOGICAL_PATTERN_SET_ID,
  DEFAULT_GEOMETRY_CONTENT_SET_SHAPE_IDS,
  CLOCK_TRAINING_INSTANCE_ID_BY_SECTION,
  buildEditorStateFromSection,
  buildContentSetDraftState,
  buildContentSetDraftStateFromContentSet,
  areContentSetDraftStatesEqual,
  buildClockInstanceEngineSettingsFromPreview,
  normalizeGeometryContentSetShapeIds,
  buildInstanceEditorStateFromInstance,
  resolveClockInstanceEngineSettingsFromInstance,
  areInstanceEditorStatesEqual,
  areEditorStatesEqual,
  areClockPreviewSettingsEqual,
  resolvePreviewSettingsFromPersistedSection,
  normalizeInstanceSortOrder,
  normalizeSectionSortOrder,
  createDraftId,
  buildCampaignIdFromName,
  buildClockEngineSettingsSummary,
  resolveContentSetRendererProps,
  getContentKindLabel,
  buildContentSetFeedSummary,
} from './GamesLibraryGameModal.utils';
import type {
  GamesLibraryGameModalProps,
  ClockPreviewSettings,
  ClockInstanceEngineSettings,
  HubSectionEditorState,
  GameInstanceEditorState,
  ContentSetDraftState,
  ContentSetsSourceFilter,
  ContentSetsUsageFilter,
  SavedSectionsStatusFilter,
  SavedInstancesContentSetFilter,
  PendingInstanceEditorRestoreState,
} from './GamesLibraryGameModal.types';
import { api } from '@/shared/lib/api-client';

export function useGamesLibraryGameModalState({
  open,
  onOpenChange,
  game,
  basePath,
}: GamesLibraryGameModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const settingsStore = useSettingsStore();

  const gameContentSetsQuery = useKangurGameContentSets({
    enabled: open && Boolean(game),
    gameId: game?.id,
  });
  const replaceGameContentSets = useReplaceKangurGameContentSets();
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
  const [contentSetsQuery, setContentSetsQuery] = useState('');
  const [contentSetsSourceFilter, setContentSetsSourceFilter] =
    useState<ContentSetsSourceFilter>('all');
  const [contentSetsUsageFilter, setContentSetsUsageFilter] =
    useState<ContentSetsUsageFilter>('all');
  const [instanceContentSourceInstanceId, setInstanceContentSourceInstanceId] =
    useState<string | null>(null);
  const [instanceEngineSourceInstanceId, setInstanceEngineSourceInstanceId] =
    useState<string | null>(null);
  const [instanceEditorBaseline, setInstanceEditorBaseline] =
    useState<GameInstanceEditorState | null>(null);
  const [optimisticInstances, setOptimisticInstances] = useState<KangurGameInstance[] | null>(null);
  const [instanceSyncError, setInstanceSyncError] = useState<string | null>(null);
  const [contentSetDraft, setContentSetDraft] = useState<ContentSetDraftState>(
    buildContentSetDraftState()
  );
  const [contentSetDraftBaseline, setContentSetDraftBaseline] =
    useState<ContentSetDraftState | null>(buildContentSetDraftState());
  const [editingContentSetId, setEditingContentSetId] =
    useState<KangurGameContentSetId | null>(null);
  const [contentSetSyncError, setContentSetSyncError] = useState<string | null>(null);
  const [optimisticCustomContentSets, setOptimisticCustomContentSets] =
    useState<KangurGameContentSet[] | null>(null);
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
  const persistedCustomContentSets = gameContentSetsQuery.data ?? [];
  const activeCustomContentSets = useMemo(
    () =>
      [...(optimisticCustomContentSets ?? persistedCustomContentSets)].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
      ),
    [optimisticCustomContentSets, persistedCustomContentSets]
  );
  const customContentSetIdSet = useMemo(
    () => new Set(activeCustomContentSets.map((contentSet) => contentSet.id)),
    [activeCustomContentSets]
  );
  const contentSets = useMemo(
    () => (game ? mergeKangurGameContentSetsForGame(game, activeCustomContentSets) : []),
    [activeCustomContentSets, game]
  );
  const persistedInstances = gameInstancesQuery.data ?? [];
  const activeInstances = useMemo(
    () =>
      [...(optimisticInstances ?? persistedInstances)].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
      ),
    [optimisticInstances, persistedInstances]
  );
  const contentSetUsageCountById = useMemo(
    () =>
      activeInstances.reduce<Record<string, number>>((counts, instance) => {
        counts[instance.contentSetId] = (counts[instance.contentSetId] ?? 0) + 1;
        return counts;
      }, {}),
    [activeInstances]
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
  const selectedCustomContentSet =
    selectedContentSetId === null
      ? null
      : activeCustomContentSets.find((contentSet) => contentSet.id === selectedContentSetId) ??
        null;

  const filteredContentSets = useMemo(() => {
    const normalizedQuery = contentSetsQuery.trim().toLowerCase();

    return contentSets.filter((contentSet) => {
      const isCustom = customContentSetIdSet.has(contentSet.id);
      const usageCount = contentSetUsageCountById[contentSet.id] ?? 0;
      if (contentSetsSourceFilter === 'built_in' && isCustom) {
        return false;
      }
      if (contentSetsSourceFilter === 'custom' && !isCustom) {
        return false;
      }
      if (contentSetsUsageFilter === 'in_use' && usageCount === 0) {
        return false;
      }
      if (contentSetsUsageFilter === 'unused' && usageCount > 0) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        contentSet.label,
        contentSet.description,
        getContentKindLabel(contentSet.contentKind, translations),
        buildContentSetFeedSummary(contentSet, translations),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [
    contentSetUsageCountById,
    contentSets,
    contentSetsQuery,
    contentSetsSourceFilter,
    contentSetsUsageFilter,
    customContentSetIdSet,
    translations,
  ]);

  const selectableContentSets = useMemo(() => {
    if (!selectedContentSet) {
      return filteredContentSets;
    }

    if (filteredContentSets.some((contentSet) => contentSet.id === selectedContentSet.id)) {
      return filteredContentSets;
    }

    return [selectedContentSet, ...filteredContentSets];
  }, [filteredContentSets, selectedContentSet]);

  const hasContentSetFilters =
    contentSetsQuery.trim().length > 0 ||
    contentSetsSourceFilter !== 'all' ||
    contentSetsUsageFilter !== 'all';

  const selectedContentSetOutsideFilters =
    Boolean(selectedContentSet) &&
    hasContentSetFilters &&
    !filteredContentSets.some((contentSet) => contentSet.id === selectedContentSet?.id);

  const editingCustomContentSet =
    editingContentSetId === null
      ? null
      : activeCustomContentSets.find((contentSet) => contentSet.id === editingContentSetId) ??
        null;

  const selectedContentSetRendererProps = resolveContentSetRendererProps(selectedContentSet);
  const selectedContentSetFeedSummary = selectedContentSet
    ? buildContentSetFeedSummary(selectedContentSet, translations)
    : null;

  const supportsPreviewSettings = game?.id === 'clock_training';
  const supportsInstanceEngineSettings =
    launchableRuntime?.rendererId === 'clock_training_game';
  const supportsCustomClockContentSets =
    launchableRuntime?.rendererId === 'clock_training_game';
  const supportsCustomCalendarContentSets =
    launchableRuntime?.rendererId === 'calendar_training_game';
  const supportsCustomGeometryContentSets =
    launchableRuntime?.rendererId === 'geometry_drawing_game';
  const supportsCustomLogicalPatternContentSets =
    launchableRuntime?.rendererId === 'logical_patterns_workshop_game';
  const supportsCustomContentSets =
    supportsCustomCalendarContentSets ||
    supportsCustomClockContentSets ||
    supportsCustomGeometryContentSets ||
    supportsCustomLogicalPatternContentSets;

  const shouldShowContentSetBrowser =
    contentSets.length > 1 || activeCustomContentSets.length > 0;

  const selectedCustomContentSetUsageCount = selectedCustomContentSet
    ? activeInstances.filter((instance) => instance.contentSetId === selectedCustomContentSet.id)
        .length
    : 0;

  const canSaveCustomContentSet =
    supportsCustomContentSets &&
    contentSetDraft.label.trim().length > 0 &&
    contentSetDraft.description.trim().length > 0 &&
    (!supportsCustomGeometryContentSets || contentSetDraft.shapeIds.length > 0);

  const isContentSetDraftDirty =
    contentSetDraftBaseline !== null &&
    !areContentSetDraftStatesEqual(contentSetDraft, contentSetDraftBaseline);

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

  const isInstanceEditorDirty =
    instanceEditorBaseline !== null &&
    !areInstanceEditorStatesEqual(currentInstanceEditorState, instanceEditorBaseline);
  const isEditorDirty =
    editorBaseline !== null && !areEditorStatesEqual(currentEditorState, editorBaseline);

  const syncEditorFromSection = useCallback((
    section: KangurLessonGameSection | null,
    nextGame: KangurGameDefinition
  ): void => {
    setSyncError(null);
    const nextEditorState = buildEditorStateFromSection(section, nextGame);
    setPreferNewDraft(section === null);
    setSelectedSectionId(section?.id ?? null);
    setAttachedLessonId(nextEditorState.attachedLessonId);
    setDraftEnabled(nextEditorState.draftEnabled);
    setDraftTitle(nextEditorState.draftTitle);
    setDraftSubtext(nextEditorState.draftSubtext);
    setDraftIcon(nextEditorState.draftIcon);
    setClockSettings({ ...nextEditorState.clockSettings });
    setEditorBaseline(nextEditorState);
  }, []);

  const syncEditorFromInstance = useCallback((
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
    setInstanceClockSettings({ ...nextEditorState.engineSettings });
    setSelectedContentSetId(nextEditorState.contentSetId);
    setInstanceDescription(nextEditorState.instanceDescription);
    setInstanceEmoji(nextEditorState.instanceEmoji);
    setInstanceEnabled(nextEditorState.instanceEnabled);
    setInstanceTitle(nextEditorState.instanceTitle);
    setInstanceEditorBaseline(nextEditorState);
  }, [clockSettings, contentSets]);

  const handleSaveInstance = async (): Promise<void> => {
    if (!game || !launchableRuntime || !selectedContentSet) return;

    const instanceId = selectedInstanceId ?? createDraftId();
    const nextInstance: KangurGameInstance = {
      id: instanceId,
      gameId: game.id,
      launchableRuntimeId: launchableRuntime.screen,
      contentSetId: selectedContentSet.id,
      title: instanceTitle.trim(),
      description: instanceDescription.trim(),
      emoji: instanceEmoji.trim() || '🎮',
      enabled: instanceEnabled,
      sortOrder: selectedInstance?.sortOrder ?? Math.max(0, ...activeInstances.map((i) => i.sortOrder)) + 1,
      engineOverrides: currentEngineOverrides,
    };

    const nextInstances = normalizeInstanceSortOrder(
      selectedInstanceId === null
        ? [...activeInstances, nextInstance]
        : activeInstances.map((i) => (i.id === selectedInstanceId ? nextInstance : i))
    );

    try {
      setInstanceSyncError(null);
      setOptimisticInstances(nextInstances);
      await replaceGameInstances.mutateAsync({
        gameId: game.id,
        instances: nextInstances,
      });
      setSelectedInstanceId(instanceId);
      setPreferNewInstanceDraft(false);
    } catch {
      setOptimisticInstances(null);
      setInstanceSyncError(translations('modal.instances.syncError'));
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!game || !attachedLessonId) return;

    const sectionId = selectedSectionId ?? createDraftId();
    const nextSection: KangurLessonGameSection = {
      id: sectionId,
      description: draftSubtext.trim(),
      emoji: draftIcon.trim() || '🎮',
      enabled: draftEnabled,
      gameId: game.id,
      ...(game.id === 'clock_training'
        ? { instanceId: CLOCK_TRAINING_INSTANCE_ID_BY_SECTION[clockSettings.clockSection] }
        : {}),
      lessonComponentId: attachedLessonId,
      settings: supportsPreviewSettings ? { clock: { ...clockSettings } } : {},
      sortOrder: selectedSection?.sortOrder ?? Math.max(0, ...activeSections.map((s) => s.sortOrder)) + 1,
      title: draftTitle.trim(),
    };

    const nextSections = normalizeSectionSortOrder(
      selectedSectionId === null
        ? [...activeSections, nextSection]
        : activeSections.map((s) => (s.id === selectedSectionId ? nextSection : s))
    );

    try {
      setSyncError(null);
      setOptimisticSections(nextSections);
      await replaceLessonGameSections.mutateAsync({
        gameId: game.id,
        sections: nextSections,
      });
      setSelectedSectionId(sectionId);
      setPreferNewDraft(false);
    } catch {
      setOptimisticSections(null);
      setSyncError(translations('modal.syncError'));
    }
  };

  return {
    translations,
    locale,
    gameContentSetsQuery,
    gameInstancesQuery,
    lessonGameSectionsQuery,
    selectedInstanceId,
    setSelectedInstanceId,
    instanceTitle,
    setInstanceTitle,
    instanceDescription,
    setInstanceDescription,
    instanceEmoji,
    setInstanceEmoji,
    instanceEnabled,
    setInstanceEnabled,
    selectedContentSetId,
    setSelectedContentSetId,
    contentSetsQuery,
    setContentSetsQuery,
    contentSetsSourceFilter,
    setContentSetsSourceFilter,
    contentSetsUsageFilter,
    setContentSetsUsageFilter,
    instanceSyncError,
    contentSetDraft,
    setContentSetDraft,
    editingContentSetId,
    contentSetSyncError,
    selectedSectionId,
    setSelectedSectionId,
    attachedLessonId,
    setAttachedLessonId,
    draftEnabled,
    setDraftEnabled,
    draftTitle,
    setDraftTitle,
    draftSubtext,
    setDraftSubtext,
    draftIcon,
    setDraftIcon,
    savedSectionsQuery,
    setSavedSectionsQuery,
    savedSectionsStatusFilter,
    setSavedSectionsStatusFilter,
    savedInstancesQuery,
    setSavedInstancesQuery,
    savedInstancesStatusFilter,
    setSavedInstancesStatusFilter,
    savedInstancesContentSetFilter,
    setSavedInstancesContentSetFilter,
    syncError,
    settingsOpen,
    setSettingsOpen,
    clockSettings,
    setClockSettings,
    instanceClockSettings,
    setInstanceClockSettings,
    activeCustomContentSets,
    contentSets,
    activeInstances,
    selectedInstance,
    selectedContentSet,
    filteredContentSets,
    selectableContentSets,
    hasContentSetFilters,
    selectedContentSetOutsideFilters,
    editingCustomContentSet,
    selectedContentSetRendererProps,
    selectedContentSetFeedSummary,
    supportsPreviewSettings,
    supportsInstanceEngineSettings,
    supportsCustomContentSets,
    shouldShowContentSetBrowser,
    selectedCustomContentSetUsageCount,
    canSaveCustomContentSet,
    isContentSetDraftDirty,
    instancePreviewClockSection,
    mutationsBlocked,
    activeSections,
    selectedSection,
    isInstanceEditorDirty,
    isEditorDirty,
    currentEngineOverrides,
    launchableRuntime,
    handleSaveInstance,
    handleSaveDraft,
    syncEditorFromInstance,
    syncEditorFromSection,
  };
}
