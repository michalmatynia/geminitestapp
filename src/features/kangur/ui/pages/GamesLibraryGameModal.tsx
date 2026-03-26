'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
import type { ClockGameMode } from '@/features/kangur/ui/components/clock-training/types';
import type { KangurLessonGameSection } from '@/shared/contracts/kangur-lesson-game-sections';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { cn } from '@/features/kangur/shared/utils';
import { useLocale, useTranslations } from 'next-intl';

type GamesLibraryGameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: KangurGameDefinition | null;
  basePath: string;
};

type ClockPreviewSettings = {
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
  showHourHand?: boolean;
  showMinuteHand?: boolean;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

const ClockTrainingGamePreview = ClockTrainingGame as React.ComponentType<ClockTrainingGamePreviewProps>;

const HUB_SECTION_ICON_OPTIONS = ['🕒', '⏰', '🎯', '🎮', '🧩', '⭐', '🚀', '📘'] as const;

const DEFAULT_CLOCK_PREVIEW_SETTINGS: ClockPreviewSettings = {
  initialMode: 'practice',
  showHourHand: true,
  showMinuteHand: true,
  showModeSwitch: true,
  showTaskTitle: true,
  showTimeDisplay: true,
};

const createDraftId = (): string =>
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveClockSectionFromPreviewSettings = (
  settings: ClockPreviewSettings
): 'hours' | 'minutes' | 'combined' => {
  if (!settings.showHourHand && settings.showMinuteHand) {
    return 'minutes';
  }
  if (settings.showHourHand && !settings.showMinuteHand) {
    return 'hours';
  }
  return 'combined';
};

const resolvePreviewSettingsFromPersistedSection = (
  section: KangurLessonGameSection | null | undefined
): ClockPreviewSettings => ({
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

type SettingsToggleProps = {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
};

function SettingsToggle({
  checked,
  description,
  label,
  onChange,
}: SettingsToggleProps): React.JSX.Element {
  return (
    <label className='flex items-start justify-between gap-4 rounded-3xl border border-[color:var(--kangur-page-border)] bg-white/70 px-4 py-3'>
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
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSubtext, setDraftSubtext] = useState('');
  const [draftIcon, setDraftIcon] = useState<string>('🎮');
  const [optimisticSections, setOptimisticSections] = useState<KangurLessonGameSection[] | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clockSettings, setClockSettings] = useState<ClockPreviewSettings>(
    DEFAULT_CLOCK_PREVIEW_SETTINGS
  );
  const persistedSections = lessonGameSectionsQuery.data ?? [];
  const activeSections = optimisticSections ?? persistedSections;
  const selectedSection =
    selectedSectionId === null
      ? null
      : activeSections.find((section) => section.id === selectedSectionId) ?? null;
  const supportsPreviewSettings = game?.id === 'clock_training';

  const syncEditorFromSection = (
    section: KangurLessonGameSection | null,
    nextGame: KangurGameDefinition
  ): void => {
    const resolvedEmoji = section?.emoji ?? nextGame.emoji ?? '🎮';
    setPreferNewDraft(section === null);
    setSelectedSectionId(section?.id ?? null);
    setAttachedLessonId((section?.lessonComponentId ?? nextGame.lessonComponentIds[0]) ?? null);
    setDraftTitle(section?.title ?? nextGame.title);
    setDraftSubtext(section?.description ?? nextGame.description);
    setDraftIcon(resolvedEmoji);
    setClockSettings(resolvePreviewSettingsFromPersistedSection(section));
  };

  useEffect(() => {
    setOptimisticSections(null);
  }, [game?.id, persistedSections]);

  useEffect(() => {
    if (!game) {
      return;
    }

    let selectedPersistedSection: KangurLessonGameSection | null = null;
    if (preferNewDraft) {
      selectedPersistedSection = null;
    } else if (selectedSectionId) {
      selectedPersistedSection =
        persistedSections.find((section) => section.id === selectedSectionId) ??
        persistedSections[0] ??
        null;
    } else {
      selectedPersistedSection = persistedSections[0] ?? null;
    }
    syncEditorFromSection(selectedPersistedSection, game);
    setSettingsOpen(game.id === 'clock_training');
  }, [game, persistedSections, preferNewDraft, selectedSectionId]);

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

  const linkedLessonIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(game?.lessonComponentIds ?? []),
          ...activeSections.map((section) => section.lessonComponentId),
        ])
      ),
    [activeSections, game?.lessonComponentIds]
  );

  const canAddDraft =
    attachedLessonId !== null &&
    draftTitle.trim().length > 0 &&
    draftIcon.trim().length > 0 &&
    (!supportsPreviewSettings ||
      clockSettings.showHourHand ||
      clockSettings.showMinuteHand);

  const handleResetEditor = (): void => {
    if (!game) {
      return;
    }

    syncEditorFromSection(null, game);
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!game || !attachedLessonId) {
      return;
    }

    const sectionId = selectedSectionId ?? createDraftId();
    const previousPreferNewDraft = preferNewDraft;
    const previousSelectedSectionId = selectedSectionId;
    const nextSection: KangurLessonGameSection = {
      id: sectionId,
      description: draftSubtext.trim(),
      emoji: draftIcon.trim() || '🎮',
      enabled: true,
      gameId: game.id,
      lessonComponentId: attachedLessonId,
      settings:
        supportsPreviewSettings
          ? {
              clock: {
                clockSection: resolveClockSectionFromPreviewSettings(clockSettings),
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

    const nextSections =
      selectedSectionId === null
        ? [...activeSections, nextSection]
        : activeSections.map((section) =>
            section.id === selectedSectionId ? nextSection : section
          );

    setOptimisticSections(nextSections);
    setPreferNewDraft(false);
    setSelectedSectionId(sectionId);

    try {
      await replaceLessonGameSections.mutateAsync({
        gameId: game.id,
        sections: nextSections,
      });
    } catch {
      setOptimisticSections(null);
      setPreferNewDraft(previousPreferNewDraft);
      setSelectedSectionId(previousSelectedSectionId);
      return;
    }
  };

  const updateClockSettings = <TKey extends keyof ClockPreviewSettings>(
    key: TKey,
    value: ClockPreviewSettings[TKey]
  ): void => {
    setClockSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  if (!game) {
    return <></>;
  }

  return (
    <KangurDialog
      open={open}
      onOpenChange={onOpenChange}
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
            <KangurButton onClick={() => onOpenChange(false)} size='sm' type='button' variant='surface'>
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

              <SearchableSelect
                className='w-full'
                emptyMessage={translations('modal.lessonEmpty')}
                label={translations('modal.lessonSelectLabel')}
                onChange={(value) => setAttachedLessonId(value as KangurLessonComponentId | null)}
                options={lessonOptions}
                placeholder={translations('modal.lessonPlaceholder')}
                searchPlaceholder={translations('modal.lessonSearchPlaceholder')}
                value={attachedLessonId}
              />

              <div className='space-y-2'>
                <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                  {translations('labels.lessonLinks')}
                </div>
                <div className='flex flex-wrap gap-2'>
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
                  ) : (
                    <KangurStatusChip accent='slate' size='sm'>
                      {translations('modal.lessonUnassigned')}
                    </KangurStatusChip>
                  )}
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
                  <KangurButton asChild size='sm' variant='primary'>
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
                  <KangurButton asChild size='sm' variant='surface'>
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
            <KangurInfoCard accent='emerald' padding='lg' className='space-y-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.draftEyebrow')}
                  </div>
                  <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                    {selectedSectionId
                      ? translations('modal.editDraftTitle')
                      : translations('modal.draftTitle')}
                  </div>
                </div>
                {selectedSectionId ? (
                  <KangurButton
                    onClick={handleResetEditor}
                    size='sm'
                    type='button'
                    variant='surface'
                  >
                    {translations('modal.newDraftButton')}
                  </KangurButton>
                ) : null}
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
                  onChange={(event) => setDraftTitle(event.target.value)}
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
                  onChange={(event) => setDraftSubtext(event.target.value)}
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
                        draftIcon === icon
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-[color:var(--kangur-page-border)] bg-white/80 hover:border-indigo-300'
                      )}
                      onClick={() => setDraftIcon(icon)}
                      type='button'
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <KangurButton
                disabled={!canAddDraft || replaceLessonGameSections.isPending}
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
            </KangurInfoCard>

            {supportsPreviewSettings && settingsOpen ? (
              <KangurInfoCard accent='slate' padding='lg' className='space-y-4'>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.settingsEyebrow')}
                  </div>
                  <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                    {translations('modal.settingsTitle')}
                  </div>
                  <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('modal.settingsDescription')}
                  </div>
                </div>

                <div className='space-y-3'>
                  <SettingsToggle
                    checked={clockSettings.showModeSwitch}
                    description={translations('modal.settings.showModeSwitchDescription')}
                    label={translations('modal.settings.showModeSwitchLabel')}
                    onChange={(checked) => updateClockSettings('showModeSwitch', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showTaskTitle}
                    description={translations('modal.settings.showTaskTitleDescription')}
                    label={translations('modal.settings.showTaskTitleLabel')}
                    onChange={(checked) => updateClockSettings('showTaskTitle', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showTimeDisplay}
                    description={translations('modal.settings.showTimeDisplayDescription')}
                    label={translations('modal.settings.showTimeDisplayLabel')}
                    onChange={(checked) => updateClockSettings('showTimeDisplay', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showHourHand}
                    description={translations('modal.settings.showHourHandDescription')}
                    label={translations('modal.settings.showHourHandLabel')}
                    onChange={(checked) => updateClockSettings('showHourHand', checked)}
                  />
                  <SettingsToggle
                    checked={clockSettings.showMinuteHand}
                    description={translations('modal.settings.showMinuteHandDescription')}
                    label={translations('modal.settings.showMinuteHandLabel')}
                    onChange={(checked) => updateClockSettings('showMinuteHand', checked)}
                  />
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

              {activeSections.length > 0 ? (
                <div className='space-y-3'>
                  {activeSections.map((draft) => (
                    <div
                      key={draft.id}
                      className={cn(
                        'rounded-[1.5rem] border bg-white/80 p-4 transition',
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
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <KangurButton
                            onClick={() => {
                              syncEditorFromSection(draft, game);
                            }}
                            size='sm'
                            type='button'
                            variant='surface'
                          >
                            {translations('modal.editDraftButton')}
                          </KangurButton>
                          <KangurButton
                            disabled={replaceLessonGameSections.isPending}
                            onClick={() => {
                              const nextSections = activeSections.filter(
                                (entry) => entry.id !== draft.id
                              );
                              const removingSelectedSection = draft.id === selectedSectionId;
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
                                  setOptimisticSections(null);
                                  if (removingSelectedSection) {
                                    syncEditorFromSection(draft, game);
                                  }
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
