import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonSectionLabel,
  getLocalizedKangurLessonSectionTypeLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import type { KangurLessonLibraryCardCopy } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import { KangurLessonGroupAccordion } from '@/features/kangur/ui/components/KangurLessonGroupAccordion';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import {
  getKangurSixYearOldLessonGroupIcon,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { LESSONS_LIBRARY_LAYOUT_CLASSNAME, LESSONS_LIBRARY_LIST_CLASSNAME } from './Lessons.constants';
import { useLessons } from './LessonsContext';
import { getLessonMasteryPresentation } from './Lessons.utils';

type LessonSubsection = {
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
};

type LessonGroup = {
  groupIcon: string;
  hasSubsections: boolean;
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
  subsections?: LessonSubsection[];
};

type LessonsViewState = ReturnType<typeof useLessons>;
type LessonsTranslation = ReturnType<typeof useTranslations>;
type LessonsCatalogResolvedContentProps = Pick<
  LessonsViewState,
  | 'activeLessonId'
  | 'completedLessonAssignmentsByComponent'
  | 'handleSelectLesson'
  | 'lessonAssignmentsByComponent'
  | 'lessonDocuments'
  | 'lessonSections'
  | 'orderedLessons'
  | 'progress'
  | 'subject'
> & {
  isCardStatusReady: boolean;
  isSixYearOld: boolean;
  locale: string;
  masteryTranslations: LessonsTranslation;
  libraryCardTranslations: LessonsTranslation;
  subjectVisual: ReturnType<typeof getKangurSixYearOldSubjectVisual>;
  translations: LessonsTranslation;
};

const LESSONS_SKELETON_SECTION_COUNT = 3;
const LESSONS_SKELETON_CARD_COUNT = 2;

function LessonsCatalogSkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden='true' className={className} />;
}

function LessonsCatalogSkeleton() {
  return (
    <div
      aria-hidden='true'
      className={LESSONS_LIBRARY_LIST_CLASSNAME}
      data-testid='lessons-catalog-skeleton'
    >
      {Array.from({ length: LESSONS_SKELETON_SECTION_COUNT }, (_, sectionIndex) => (
        <div
          key={`lessons-skeleton-section-${sectionIndex}`}
          className='w-full rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.4)]'
        >
          <div className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
            <div className='flex items-start justify-between gap-4'>
              <div className={`min-w-0 flex-1 ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
                <LessonsCatalogSkeletonBlock className='h-3 w-24 rounded-full bg-slate-200/80' />
                <LessonsCatalogSkeletonBlock className='h-7 w-2/3 rounded-full bg-slate-200/80' />
              </div>
              <LessonsCatalogSkeletonBlock className='h-10 w-10 rounded-2xl bg-slate-200/80' />
            </div>
            {Array.from({ length: LESSONS_SKELETON_CARD_COUNT }, (_, cardIndex) => (
              <div
                key={`lessons-skeleton-card-${sectionIndex}-${cardIndex}`}
                className='w-full rounded-[24px] border border-slate-200/60 bg-slate-50/90 p-4'
              >
                <div className='flex items-start gap-4'>
                  <LessonsCatalogSkeletonBlock className='h-12 w-12 shrink-0 rounded-2xl bg-slate-200/80' />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <LessonsCatalogSkeletonBlock className='h-5 w-1/2 rounded-full bg-slate-200/80' />
                    <LessonsCatalogSkeletonBlock className='h-4 w-full rounded-full bg-slate-200/70' />
                    <LessonsCatalogSkeletonBlock className='h-4 w-5/6 rounded-full bg-slate-200/70' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderLessonsCatalogIntroDescription({
  isSixYearOld,
  label,
  subject,
}: {
  isSixYearOld: boolean;
  label: string;
  subject: LessonsViewState['subject'];
}): ReactNode {
  if (!isSixYearOld) {
    return label;
  }

  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);

  return (
    <KangurVisualCueContent
      className='text-lg'
      detail={
        <span className='inline-flex items-center gap-1.5 text-lg'>
          {subjectVisual.introSteps.map((stepIcon, index) => (
            <span key={`lessons-intro-step-${subject}-${index}`}>{stepIcon}</span>
          ))}
        </span>
      }
      detailTestId='lessons-intro-description-detail'
      icon={subjectVisual.icon}
      iconClassName='text-xl'
      iconTestId='lessons-intro-description-icon'
      label={label}
    />
  );
}

function LessonsCatalogIntroCardWithPageContent({
  children,
  isSixYearOld,
  locale,
  showWordmark,
  subject,
  translations,
}: {
  children?: ReactNode;
  isSixYearOld: boolean;
  locale: string;
  showWordmark: boolean;
  subject: LessonsViewState['subject'];
  translations: LessonsTranslation;
}): React.JSX.Element {
  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const title = lessonListIntroContent?.title ?? translations('pageTitle');
  const descriptionLabel =
    lessonListIntroContent?.summary ?? translations('introDescription');

  return (
    <KangurPageIntroCard
      description={renderLessonsCatalogIntroDescription({
        isSixYearOld,
        label: descriptionLabel,
        subject,
      })}
      headingAs='h1'
      headingTestId='kangur-lessons-list-heading'
      showBackButton={false}
      testId='lessons-list-intro-card'
      title={title}
      visualTitle={showWordmark ? (
        <KangurLessonsWordmark
          className='mx-auto'
          data-testid='kangur-lessons-heading-art'
          label={title}
          locale={locale}
        />
      ) : undefined}
    >
      {children}
    </KangurPageIntroCard>
  );
}

function LessonsCatalogEmptyStateWithPageContent({
  ageGroupLabel,
  translations,
}: {
  ageGroupLabel: string;
  translations: LessonsTranslation;
}): React.JSX.Element {
  const { entry: lessonListEmptyStateContent } = useKangurPageContentEntry(
    'lessons-list-empty-state'
  );

  return (
    <KangurEmptyState
      accent='indigo'
      description={
        lessonListEmptyStateContent?.summary ??
        translations('emptyDescription', { ageGroup: ageGroupLabel })
      }
      title={lessonListEmptyStateContent?.title ?? translations('emptyTitle')}
    />
  );
}

function LessonsCatalogResolvedContent({
  activeLessonId,
  completedLessonAssignmentsByComponent,
  handleSelectLesson,
  isCardStatusReady,
  isSixYearOld,
  lessonAssignmentsByComponent,
  lessonDocuments,
  libraryCardTranslations,
  lessonSections,
  locale,
  masteryTranslations,
  orderedLessons,
  progress,
  subject,
  subjectVisual,
  translations,
}: LessonsCatalogResolvedContentProps) {
  const [expandedLessonGroupId, setExpandedLessonGroupId] = useState<string | null>(null);
  const emptyMasteryPresentation = useMemo(
    () => ({
      badgeAccent: 'slate' as const,
      statusLabel: masteryTranslations('new'),
      summaryLabel: masteryTranslations('noSavedPractice'),
    }),
    [masteryTranslations]
  );
  const libraryCardCopyTemplate = useMemo(
    () => ({
      closedAssignment: libraryCardTranslations('closedAssignment'),
      completedForParent: libraryCardTranslations('completedForParent'),
      customContent: libraryCardTranslations('customContent'),
      parentPriority: libraryCardTranslations('parentPriority'),
    }),
    [libraryCardTranslations]
  );

  useEffect(() => {
    setExpandedLessonGroupId(null);
  }, [subject]);

  const isCoarsePointer = useKangurCoarsePointer();

  const displayLessonGroups: LessonGroup[] = useMemo(() => {
    if (lessonSections.length === 0) {
      return [];
    }

    const lessonByComponent = new Map(orderedLessons.map((lesson) => [lesson.componentId, lesson]));

    return lessonSections
      .map((section: KangurLessonSection): LessonGroup => {
        const groupLessons = section.componentIds
          .map((id) => lessonByComponent.get(id))
          .filter((lesson): lesson is KangurLesson => Boolean(lesson));

        const subsections = section.subsections
          .filter((subsection) => subsection.enabled)
          .map((subsection) => ({
            id: subsection.id,
            label: getLocalizedKangurLessonSectionLabel(subsection.id, locale, subsection.label),
            typeLabel: subsection.typeLabel
              ? getLocalizedKangurLessonSectionTypeLabel(locale, subsection.typeLabel)
              : undefined,
            lessons: subsection.componentIds
              .map((componentId) => lessonByComponent.get(componentId))
              .filter((lesson): lesson is KangurLesson => Boolean(lesson)),
          }))
          .filter((subsection) => subsection.lessons.length > 0);

        const hasSubsections = subsections.length > 0;

        return {
          groupIcon: getKangurSixYearOldLessonGroupIcon(hasSubsections),
          hasSubsections,
          id: section.id,
          label: getLocalizedKangurLessonSectionLabel(section.id, locale, section.label),
          typeLabel: section.typeLabel
            ? getLocalizedKangurLessonSectionTypeLabel(locale, section.typeLabel)
            : undefined,
          lessons: groupLessons,
          subsections: hasSubsections ? subsections : undefined,
        };
      })
      .filter((group) => (group.subsections ? group.subsections.length > 0 : group.lessons.length > 0));
  }, [lessonSections, locale, orderedLessons]);

  const lessonCardStateById = useMemo(
    () =>
      new Map(
        orderedLessons.map((lesson) => {
          const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
          const completedLessonAssignment = !lessonAssignment
            ? (completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null)
            : null;
          const localizedTitle = getLocalizedKangurLessonTitle(
            lesson.componentId,
            locale,
            lesson.title
          );
          return [
            lesson.id,
            {
              completedLessonAssignment,
              hasDocumentContent: hasKangurLessonDocumentContent(lessonDocuments[lesson.id]),
              lessonAssignment,
              localizedDescription: getLocalizedKangurLessonDescription(
                lesson.componentId,
                locale,
                lesson.description
              ),
              localizedTitle,
              resolvedCopy: {
                ...libraryCardCopyTemplate,
                ariaLabel: libraryCardTranslations('ariaLabel', { title: localizedTitle }),
                completedAssignmentSummary: libraryCardTranslations(
                  'completedAssignmentSummary',
                  {
                    summary: completedLessonAssignment?.progress.summary ?? '',
                  }
                ),
              } satisfies KangurLessonLibraryCardCopy,
              masteryPresentation: isCardStatusReady
                ? getLessonMasteryPresentation(lesson, progress, masteryTranslations)
                : emptyMasteryPresentation,
            },
          ] as const;
        })
      ),
    [
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      lessonDocuments,
      emptyMasteryPresentation,
      isCardStatusReady,
      libraryCardCopyTemplate,
      libraryCardTranslations,
      masteryTranslations,
      orderedLessons,
      progress,
    ]
  );

  type LessonEntry =
    | { kind: 'group'; group: (typeof displayLessonGroups)[number] }
    | { kind: 'lesson'; lesson: KangurLesson };

  const lessonEntries: LessonEntry[] = useMemo(() => {
    type LessonGroupId = (typeof displayLessonGroups)[number]['id'];
    const lessonGroupById = new Map<LessonGroupId, (typeof displayLessonGroups)[number]>(
      displayLessonGroups.map((group) => [group.id, group])
    );
    const lessonGroupIdByComponent = new Map<string, LessonGroupId>();

    displayLessonGroups.forEach((group) => {
      const groupedLessons = group.subsections
        ? group.subsections.flatMap((subsection) => subsection.lessons)
        : group.lessons;

      groupedLessons.forEach((lesson) => {
        lessonGroupIdByComponent.set(lesson.componentId, group.id);
      });
    });

    const resolvedEntries: LessonEntry[] = [];
    const usedGroupIds = new Set<string>();
    orderedLessons.forEach((lesson) => {
      const groupId = lessonGroupIdByComponent.get(lesson.componentId);
      if (groupId) {
        if (!usedGroupIds.has(groupId)) {
          const group = lessonGroupById.get(groupId);
          if (group) {
            resolvedEntries.push({ kind: 'group', group });
          }
          usedGroupIds.add(groupId);
        }
        return;
      }

      resolvedEntries.push({ kind: 'lesson', lesson });
    });

    return resolvedEntries;
  }, [displayLessonGroups, orderedLessons]);

  const renderLessonCard = (lesson: KangurLesson, _index: number) => {
    const lessonCardState = lessonCardStateById.get(lesson.id);
    if (!lessonCardState) {
      return null;
    }

    return (
      <div
        className='w-full'
        key={lesson.id}
        data-testid={`lesson-library-motion-${lesson.id}`}
      >
      <KangurLessonLibraryCard
        lesson={lesson}
        dataDocId='lessons_library_entry'
        iconTestId={`lesson-library-icon-${lesson.id}`}
        isCoarsePointer={isCoarsePointer}
        isSixYearOld={isSixYearOld}
        locale={locale}
        localizedDescription={lessonCardState.localizedDescription}
        localizedTitle={lessonCardState.localizedTitle}
        onSelect={() => handleSelectLesson(lesson.id)}
        masteryPresentation={lessonCardState.masteryPresentation}
        resolvedCopy={lessonCardState.resolvedCopy}
        lessonAssignment={lessonCardState.lessonAssignment}
        completedLessonAssignment={lessonCardState.completedLessonAssignment}
        hasDocumentContent={lessonCardState.hasDocumentContent}
        ariaCurrent={activeLessonId === lesson.id ? 'page' : undefined}
        translations={libraryCardTranslations}
      />
      </div>
    );
  };

  let lessonIndex = 0;

  return (
    <div className={LESSONS_LIBRARY_LIST_CLASSNAME}>
      {lessonEntries.map((entry) => {
        if (entry.kind === 'group') {
          const isExpanded = expandedLessonGroupId === entry.group.id;
          let groupLessonIndex = 0;

          return (
            <KangurLessonGroupAccordion
              accordionId={entry.group.id}
              fallbackTypeLabel={
                isSixYearOld ? (
                  <KangurVisualCueContent
                    icon={entry.group.groupIcon}
                    iconClassName='text-base'
                    iconTestId={`lessons-page-group-type-icon-${entry.group.id}`}
                    label={translations('groupTypeLabel')}
                  />
                ) : (
                  translations('groupTypeLabel')
                )
              }
              isExpanded={isExpanded}
              isCoarsePointer={isCoarsePointer}
              key={entry.group.id}
              label={
                isSixYearOld ? (
                  <span
                    className='inline-flex items-center gap-2'
                    data-testid={`lessons-page-group-label-${entry.group.id}`}
                  >
                    <span
                      aria-hidden='true'
                      className='text-lg leading-none'
                      data-testid={`lessons-page-group-icon-${entry.group.id}`}
                    >
                      {entry.group.groupIcon}
                    </span>
                    <span>{entry.group.label}</span>
                  </span>
                ) : (
                  entry.group.label
                )
              }
              onToggle={() => setExpandedLessonGroupId(isExpanded ? null : entry.group.id)}
              typeLabel={
                entry.group.typeLabel
                  ? isSixYearOld
                    ? (
                        <KangurVisualCueContent
                          detail={subjectVisual.detail}
                          detailClassName='text-sm'
                          detailTestId={`lessons-page-group-type-detail-${entry.group.id}`}
                          icon={subjectVisual.icon}
                          iconClassName='text-base'
                          iconTestId={`lessons-page-group-type-icon-${entry.group.id}`}
                          label={entry.group.typeLabel}
                        />
                      )
                    : entry.group.typeLabel
                  : undefined
              }
            >
              {entry.group.hasSubsections ? (
                entry.group.subsections?.map((subsection) => (
                  <div
                    key={subsection.id}
                    className={LESSONS_LIBRARY_LIST_CLASSNAME}
                  >
                    <div className={LESSONS_LIBRARY_LIST_CLASSNAME}>
                      {subsection.lessons.map((lesson) => {
                        const index = groupLessonIndex;
                        groupLessonIndex += 1;
                        return renderLessonCard(lesson, index);
                      })}
                    </div>
                  </div>
                ))
              ) : (
                entry.group.lessons.map((lesson) => {
                  const index = groupLessonIndex;
                  groupLessonIndex += 1;
                  return renderLessonCard(lesson, index);
                })
              )}
            </KangurLessonGroupAccordion>
          );
        }

        const index = lessonIndex;
        lessonIndex += 1;
        return renderLessonCard(entry.lesson, index);
      })}
    </div>
  );
}

export function LessonsCatalog() {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsPage');
  const masteryTranslations = useTranslations('KangurLessonsWidgets.mastery');
  const libraryCardTranslations = useTranslations('KangurLessonsWidgets.libraryCard');
  const {
    subject,
    ageGroup,
    lessonSections,
    orderedLessons,
    handleSelectLesson,
    progress,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    lessonDocuments,
    activeLessonId,
    isLessonsCatalogLoading,
    isLessonSectionsLoading,
    shouldShowLessonsCatalogSkeleton,
  } = useLessons();
  const [isPageContentReady, setIsPageContentReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsPageContentReady(true);
      return;
    }

    let timeoutId: number | null = null;
    const frameId =
      typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            setIsPageContentReady(true);
          })
        : window.setTimeout(() => {
            timeoutId = null;
            setIsPageContentReady(true);
          }, 0);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        return;
      }

      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frameId);
      } else {
        window.clearTimeout(frameId);
      }
    };
  }, []);

  const ageGroupLabel = getLocalizedKangurAgeGroupLabel(ageGroup, locale);
  const isSixYearOld = ageGroup === 'six_year_old';
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);
  const loadingStatusLabel = isLessonSectionsLoading
    ? translations('loadingSectionsStatus')
    : translations('loadingLessonsStatus');
  const loadingStatusDescription = isLessonSectionsLoading
    ? translations('loadingSectionsDetails')
    : translations('loadingLessonsDetails');
  const shouldShowIntroLoadingState =
    shouldShowLessonsCatalogSkeleton ||
    isLessonsCatalogLoading ||
    isLessonSectionsLoading;

  return (
    <div className={LESSONS_LIBRARY_LAYOUT_CLASSNAME} data-testid='lessons-shell-transition'>
      <div id='kangur-lessons-intro' className='w-full'>
        {isPageContentReady ? (
          <LessonsCatalogIntroCardWithPageContent
            isSixYearOld={isSixYearOld}
            locale={locale}
            showWordmark={true}
            subject={subject}
            translations={translations}
          >
            {shouldShowIntroLoadingState ? (
              <div className='w-full' data-testid='lessons-intro-loading-state'>
                <KangurInfoCard
                  accent='indigo'
                  aria-live='polite'
                  className='mx-auto w-full max-w-2xl text-left'
                  data-testid='lessons-intro-loading-card'
                  padding='md'
                  role='status'
                  tone='accent'
                >
                  <div className='flex items-start gap-3 sm:items-center'>
                    <div
                      aria-hidden='true'
                      className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-indigo-500 sm:mt-0'
                    >
                      <span className='size-3 rounded-full bg-current animate-pulse' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <KangurStatusChip accent='indigo' labelStyle='caps' size='sm'>
                        {isSixYearOld ? (
                          <KangurVisualCueContent
                            icon='⏳'
                            iconClassName='text-base'
                            iconTestId='lessons-intro-loading-icon'
                            label={loadingStatusLabel}
                          />
                        ) : (
                          loadingStatusLabel
                        )}
                      </KangurStatusChip>
                      <p className='mt-2 text-sm leading-6 text-current/90'>
                        {loadingStatusDescription}
                      </p>
                    </div>
                  </div>
                </KangurInfoCard>
              </div>
            ) : null}
          </LessonsCatalogIntroCardWithPageContent>
        ) : (
          <KangurPageIntroCard
            description={renderLessonsCatalogIntroDescription({
              isSixYearOld,
              label: translations('introDescription'),
              subject,
            })}
            headingAs='h1'
            headingTestId='kangur-lessons-list-heading'
            showBackButton={false}
            testId='lessons-list-intro-card'
            title={translations('pageTitle')}
            visualTitle={isPageContentReady ? (
              <KangurLessonsWordmark
                className='mx-auto'
                data-testid='kangur-lessons-heading-art'
                label={translations('pageTitle')}
                locale={locale}
              />
            ) : undefined}
          >
            {shouldShowIntroLoadingState ? (
              <div className='w-full' data-testid='lessons-intro-loading-state'>
                <KangurInfoCard
                  accent='indigo'
                  aria-live='polite'
                  className='mx-auto w-full max-w-2xl text-left'
                  data-testid='lessons-intro-loading-card'
                  padding='md'
                  role='status'
                  tone='accent'
                >
                  <div className='flex items-start gap-3 sm:items-center'>
                    <div
                      aria-hidden='true'
                      className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-indigo-500 sm:mt-0'
                    >
                      <span className='size-3 rounded-full bg-current animate-pulse' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <KangurStatusChip accent='indigo' labelStyle='caps' size='sm'>
                        {isSixYearOld ? (
                          <KangurVisualCueContent
                            icon='⏳'
                            iconClassName='text-base'
                            iconTestId='lessons-intro-loading-icon'
                            label={loadingStatusLabel}
                          />
                        ) : (
                          loadingStatusLabel
                        )}
                      </KangurStatusChip>
                      <p className='mt-2 text-sm leading-6 text-current/90'>
                        {loadingStatusDescription}
                      </p>
                    </div>
                  </div>
                </KangurInfoCard>
              </div>
            ) : null}
          </KangurPageIntroCard>
        )}
      </div>
      <div
        aria-busy={shouldShowLessonsCatalogSkeleton}
        className={LESSONS_LIBRARY_LIST_CLASSNAME}
        data-testid='lessons-list-transition'
      >
        {shouldShowLessonsCatalogSkeleton ? (
          <LessonsCatalogSkeleton />
        ) : orderedLessons.length === 0 ? (
          isPageContentReady ? (
            <LessonsCatalogEmptyStateWithPageContent
              ageGroupLabel={ageGroupLabel}
              translations={translations}
            />
          ) : (
            <KangurEmptyState
              accent='indigo'
              description={translations('emptyDescription', { ageGroup: ageGroupLabel })}
              title={translations('emptyTitle')}
            />
          )
        ) : (
          <LessonsCatalogResolvedContent
            activeLessonId={activeLessonId}
            completedLessonAssignmentsByComponent={completedLessonAssignmentsByComponent}
            handleSelectLesson={handleSelectLesson}
            isCardStatusReady={isPageContentReady}
            isSixYearOld={isSixYearOld}
            lessonAssignmentsByComponent={lessonAssignmentsByComponent}
            lessonDocuments={lessonDocuments}
            libraryCardTranslations={libraryCardTranslations}
            lessonSections={lessonSections}
            locale={locale}
            masteryTranslations={masteryTranslations}
            orderedLessons={orderedLessons}
            progress={progress}
            subject={subject}
            subjectVisual={subjectVisual}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
}
