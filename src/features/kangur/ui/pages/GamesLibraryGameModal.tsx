import React from 'react';

import {
  KANGUR_LESSON_LIBRARY,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';

import { useGamesLibraryGameModalState } from './GamesLibraryGameModal.hooks';
import {
  GamesLibraryGameModalProvider,
  useGamesLibraryGameModalContext,
} from './GamesLibraryGameModal.context';
import {
  GameHeader,
  GameModalEmptyState,
  GameModalSection,
  GamesLibraryGameDialog,
  GameStats,
} from './GamesLibraryGameModal.components';
import type { GamesLibraryGameModalProps } from './GamesLibraryGameModal.types';
import {
  GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME,
  resolveModalStatusAccent,
  resolvePreviewSettingsFromPersistedSection,
} from './GamesLibraryGameModal.utils';

const sortBySortOrder = <T extends { sortOrder: number }>(items: readonly T[]): T[] =>
  [...items].sort((left, right) => left.sortOrder - right.sortOrder);

const resolveVariantRuntimeDetails = (
  variant: {
    id: string;
    title: string;
    description: string;
    status: string;
    surface: string;
    sortOrder: number;
    launchableRuntimeId?: string | null;
    lessonActivityRuntimeId?: string | null;
    legacyActivityId?: string | null;
    legacyScreenId?: string | null;
  },
  labels: {
    launchableRuntime: string;
    lessonRuntime: string;
    legacyActivity: string;
    legacyScreen: string;
  }
): Array<{ label: string; value: string }> => {
  const details: Array<{ label: string; value: string }> = [];

  if (variant.launchableRuntimeId) {
    details.push({ label: labels.launchableRuntime, value: variant.launchableRuntimeId });
  }

  if (variant.lessonActivityRuntimeId) {
    details.push({ label: labels.lessonRuntime, value: variant.lessonActivityRuntimeId });
  }

  if (variant.legacyActivityId) {
    details.push({ label: labels.legacyActivity, value: variant.legacyActivityId });
  }

  if (variant.legacyScreenId) {
    details.push({ label: labels.legacyScreen, value: variant.legacyScreenId });
  }

  return details;
};

function ModalDetailField(props: {
  label: React.ReactNode;
  value: React.ReactNode;
}): React.JSX.Element {
  const { label, value } = props;

  return (
    <div className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} px-4 py-3`}>
      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='mt-2 text-sm font-semibold [color:var(--kangur-page-text)]'>{value}</div>
    </div>
  );
}

function ModalBooleanField(props: {
  checked: boolean;
  disabledLabel: string;
  enabledLabel: string;
  label: string;
}): React.JSX.Element {
  const { checked, disabledLabel, enabledLabel, label } = props;

  return (
    <div
      className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} flex items-center justify-between gap-3 px-4 py-3`}
    >
      <span className='text-sm font-semibold [color:var(--kangur-page-text)]'>{label}</span>
      <KangurStatusChip accent={checked ? 'emerald' : 'slate'} size='sm'>
        {checked ? enabledLabel : disabledLabel}
      </KangurStatusChip>
    </div>
  );
}

export function GamesLibraryGameModal(props: GamesLibraryGameModalProps): React.JSX.Element | null {
  const { game } = props;
  const state = useGamesLibraryGameModalState(props);

  if (!game) {
    return null;
  }

  return (
    <GamesLibraryGameModalProvider state={state} basePath={props.basePath}>
      <GamesLibraryGameDialog>
        <GamesLibraryGameModalContent />
      </GamesLibraryGameDialog>
    </GamesLibraryGameModalProvider>
  );
}

function GamesLibraryGameModalContent(): React.JSX.Element {
  const {
    game,
    translations,
    locale,
    settingsOpen,
    supportsPreviewSettings,
    lessonGameSectionsQuery,
    gameInstancesQuery,
  } = useGamesLibraryGameModalContext();

  if (!game) return <></>;

  const savedInstances = sortBySortOrder(gameInstancesQuery.data ?? []);
  const savedSections = sortBySortOrder(lessonGameSectionsQuery.data ?? []);
  const previewSettings = supportsPreviewSettings
    ? savedSections[0]
      ? resolvePreviewSettingsFromPersistedSection(savedSections[0])
      : null
    : null;
  const instanceById = new Map(savedInstances.map((instance) => [instance.id, instance]));
  const runtimeLabel = translations('labels.runtime');
  const contentSetLabel = translations('labels.contentSet');
  const variantDetailLabels = {
    launchableRuntime: translations('labels.launchableRuntime'),
    lessonRuntime: translations('labels.lessonRuntime'),
    legacyActivity: translations('labels.legacyActivity'),
    legacyScreen: translations('labels.legacyScreen'),
  };
  const variants = sortBySortOrder(game.variants);
  const linkedLessons = game.lessonComponentIds.map((componentId) => {
    const lesson = KANGUR_LESSON_LIBRARY[componentId];
    const title = getLocalizedKangurLessonTitle(
      componentId,
      locale,
      lesson?.title ?? componentId
    );
    const description = getLocalizedKangurLessonDescription(
      componentId,
      locale,
      lesson?.description ?? ''
    );
    const savedSectionCount = savedSections.filter(
      (section) => section.lessonComponentId === componentId
    ).length;

    return {
      id: componentId,
      title,
      description,
      savedSectionCount,
    };
  });

  return (
    <>
      <GameHeader />

      <div className='min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6 sm:pb-6'>
        <div className='space-y-5'>
          <GameStats />

          <div className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} px-4 py-3`}>
            <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
              {translations('filters.surface.label')}
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
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

          <div className='grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.92fr)]'>
            <div className='space-y-5'>
              <GameModalSection
                dataTestId='games-library-modal-variants'
                title={translations('labels.variants')}
                action={
                  <KangurStatusChip accent='slate' size='sm'>
                    {translations('labels.variantCount', { count: variants.length })}
                  </KangurStatusChip>
                }
              >
                <div className='grid gap-3'>
                  {variants.map((variant) => {
                    const runtimeDetails = resolveVariantRuntimeDetails(variant, variantDetailLabels);

                    return (
                      <article
                        key={variant.id}
                        className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} p-4`}
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0 flex-1'>
                            <h4 className='text-sm font-black tracking-[-0.02em] [color:var(--kangur-page-text)]'>
                              {variant.title}
                            </h4>
                            <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                              {variant.description}
                            </p>
                          </div>

                          <div className='flex flex-wrap gap-2'>
                            <KangurStatusChip accent='sky' size='sm'>
                              {translations(`variantSurfaces.${variant.surface}`)}
                            </KangurStatusChip>
                            <KangurStatusChip
                              accent={resolveModalStatusAccent(variant.status)}
                              size='sm'
                            >
                              {translations(`statuses.${variant.status}`)}
                            </KangurStatusChip>
                          </div>
                        </div>

                        {runtimeDetails.length > 0 ? (
                          <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                            {runtimeDetails.map((detail) => (
                              <ModalDetailField
                                key={`${variant.id}:${detail.label}:${detail.value}`}
                                label={detail.label}
                                value={
                                  <code className='block break-all text-[0.75rem] font-semibold leading-5'>
                                    {detail.value}
                                  </code>
                                }
                              />
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </GameModalSection>

              <GameModalSection
                dataTestId='games-library-modal-instances'
                title={translations('modal.instancesTitle')}
                action={
                  <KangurStatusChip accent='slate' size='sm'>
                    {savedInstances.length}
                  </KangurStatusChip>
                }
              >
                {gameInstancesQuery.isPending ? (
                  <GameModalEmptyState>{translations('modal.instancesLoading')}</GameModalEmptyState>
                ) : savedInstances.length === 0 ? (
                  <GameModalEmptyState>{translations('modal.instancesEmpty')}</GameModalEmptyState>
                ) : (
                  <div className='grid gap-3'>
                    {savedInstances.map((instance) => (
                      <article
                        key={instance.id}
                        className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} p-4`}
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='flex min-w-0 items-start gap-3'>
                            <div className='text-2xl' aria-hidden='true'>
                              {instance.emoji}
                            </div>
                            <div className='min-w-0'>
                              <h4 className='text-sm font-black tracking-[-0.02em] [color:var(--kangur-page-text)]'>
                                {instance.title}
                              </h4>
                              <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                                {instance.description || translations('labels.none')}
                              </p>
                            </div>
                          </div>

                          <KangurStatusChip
                            accent={instance.enabled ? 'emerald' : 'slate'}
                            size='sm'
                          >
                            {instance.enabled
                              ? translations('modal.enabledBadge')
                              : translations('modal.disabledBadge')}
                          </KangurStatusChip>
                        </div>

                        <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                          <ModalDetailField
                            label={runtimeLabel}
                            value={
                              <code className='block break-all text-[0.75rem] font-semibold leading-5'>
                                {instance.launchableRuntimeId}
                              </code>
                            }
                          />
                          <ModalDetailField
                            label={contentSetLabel}
                            value={
                              <code className='block break-all text-[0.75rem] font-semibold leading-5'>
                                {instance.contentSetId}
                              </code>
                            }
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </GameModalSection>
            </div>

            <div className='space-y-5'>
              {supportsPreviewSettings ? (
                <GameModalSection
                  dataTestId='games-library-modal-settings'
                  hidden={!settingsOpen}
                  id='games-library-modal-settings'
                  title={translations('modal.settingsTitle')}
                >
                  {previewSettings ? (
                    <>
                      <div className='grid gap-2 sm:grid-cols-2'>
                        <ModalDetailField
                          label={translations('modal.settings.clockSectionLabel')}
                          value={translations(
                            `modal.settings.clockSection${previewSettings.clockSection.charAt(0).toUpperCase()}${previewSettings.clockSection.slice(1)}`
                          )}
                        />
                        <ModalDetailField
                          label={translations('modal.settings.initialModeLabel')}
                          value={translations(
                            `modal.settings.initialMode${previewSettings.initialMode.charAt(0).toUpperCase()}${previewSettings.initialMode.slice(1)}`
                          )}
                        />
                      </div>

                      <div className='mt-3 grid gap-2'>
                        <ModalBooleanField
                          checked={previewSettings.showHourHand}
                          disabledLabel={translations('modal.disabledBadge')}
                          enabledLabel={translations('modal.enabledBadge')}
                          label={translations('modal.settings.showHourHandLabel')}
                        />
                        <ModalBooleanField
                          checked={previewSettings.showMinuteHand}
                          disabledLabel={translations('modal.disabledBadge')}
                          enabledLabel={translations('modal.enabledBadge')}
                          label={translations('modal.settings.showMinuteHandLabel')}
                        />
                        <ModalBooleanField
                          checked={previewSettings.showModeSwitch}
                          disabledLabel={translations('modal.disabledBadge')}
                          enabledLabel={translations('modal.enabledBadge')}
                          label={translations('modal.settings.showModeSwitchLabel')}
                        />
                        <ModalBooleanField
                          checked={previewSettings.showTaskTitle}
                          disabledLabel={translations('modal.disabledBadge')}
                          enabledLabel={translations('modal.enabledBadge')}
                          label={translations('modal.settings.showTaskTitleLabel')}
                        />
                        <ModalBooleanField
                          checked={previewSettings.showTimeDisplay}
                          disabledLabel={translations('modal.disabledBadge')}
                          enabledLabel={translations('modal.enabledBadge')}
                          label={translations('modal.settings.showTimeDisplayLabel')}
                        />
                      </div>
                    </>
                  ) : (
                    <GameModalEmptyState>{translations('modal.settingsEmpty')}</GameModalEmptyState>
                  )}
                </GameModalSection>
              ) : null}

              <GameModalSection
                dataTestId='games-library-modal-lessons'
                title={translations('labels.lessonLinks')}
                action={
                  <KangurStatusChip accent='slate' size='sm'>
                    {linkedLessons.length}
                  </KangurStatusChip>
                }
              >
                {linkedLessons.length === 0 ? (
                  <GameModalEmptyState>{translations('modal.linkedLessonsEmpty')}</GameModalEmptyState>
                ) : (
                  <div className='grid gap-3'>
                    {linkedLessons.map((lesson) => (
                      <article
                        key={lesson.id}
                        className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} p-4`}
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0 flex-1'>
                            <h4 className='text-sm font-black tracking-[-0.02em] [color:var(--kangur-page-text)]'>
                              {lesson.title}
                            </h4>
                            <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                              {lesson.description || lesson.id}
                            </p>
                          </div>

                          <div className='flex max-w-full flex-wrap gap-2'>
                            <KangurStatusChip
                              accent='slate'
                              className='max-w-full justify-start text-left'
                              size='sm'
                            >
                              {lesson.id}
                            </KangurStatusChip>
                            {lesson.savedSectionCount > 0 ? (
                              <KangurStatusChip accent='emerald' size='sm'>
                                {lesson.savedSectionCount}
                              </KangurStatusChip>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </GameModalSection>

              <GameModalSection
                dataTestId='games-library-modal-sections'
                title={translations('modal.draftListTitle')}
                action={
                  <KangurStatusChip accent='slate' size='sm'>
                    {savedSections.length}
                  </KangurStatusChip>
                }
              >
                {lessonGameSectionsQuery.isPending ? (
                  <GameModalEmptyState>{translations('modal.sectionsLoading')}</GameModalEmptyState>
                ) : savedSections.length === 0 ? (
                  <GameModalEmptyState>{translations('modal.draftListEmpty')}</GameModalEmptyState>
                ) : (
                  <div className='grid gap-3'>
                    {savedSections.map((section) => {
                      const attachedInstance = section.instanceId
                        ? instanceById.get(section.instanceId)
                        : null;

                      return (
                        <article
                          key={section.id}
                          className={`${GAMES_LIBRARY_MODAL_FIELD_SURFACE_CLASSNAME} p-4`}
                        >
                          <div className='flex flex-wrap items-start justify-between gap-3'>
                            <div className='flex min-w-0 items-start gap-3'>
                              <div className='text-2xl' aria-hidden='true'>
                                {section.emoji}
                              </div>
                              <div className='min-w-0'>
                                <h4 className='text-sm font-black tracking-[-0.02em] [color:var(--kangur-page-text)]'>
                                  {section.title}
                                </h4>
                                <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                                  {section.description || translations('labels.none')}
                                </p>
                              </div>
                            </div>

                            <KangurStatusChip
                              accent={section.enabled ? 'emerald' : 'slate'}
                              size='sm'
                            >
                              {section.enabled
                                ? translations('modal.enabledBadge')
                                : translations('modal.disabledBadge')}
                            </KangurStatusChip>
                          </div>

                          <div className='mt-3 flex max-w-full flex-wrap gap-2'>
                            <KangurStatusChip
                              accent='slate'
                              className='max-w-full justify-start text-left'
                              size='sm'
                            >
                              {getLocalizedKangurLessonTitle(
                                section.lessonComponentId,
                                locale,
                                KANGUR_LESSON_LIBRARY[section.lessonComponentId]?.title ??
                                  section.lessonComponentId
                              )}
                            </KangurStatusChip>
                            {attachedInstance ? (
                              <KangurStatusChip
                                accent='sky'
                                className='max-w-full justify-start text-left'
                                size='sm'
                              >
                                {attachedInstance.title}
                              </KangurStatusChip>
                            ) : section.instanceId ? (
                              <KangurStatusChip
                                accent='sky'
                                className='max-w-full justify-start text-left'
                                size='sm'
                              >
                                {section.instanceId}
                              </KangurStatusChip>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </GameModalSection>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
