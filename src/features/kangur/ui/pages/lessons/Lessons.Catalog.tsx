'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonSectionLabel,
  getLocalizedKangurLessonSectionTypeLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import {
  getResolvedKangurLessonDescription,
  getResolvedKangurLessonTitle,
} from '@/features/kangur/lessons/lesson-template-copy';
import {
  KangurResolvedLessonLibraryCard,
  type KangurLessonLibraryCardCopy,
} from '@/features/kangur/ui/components/lesson-library/KangurResolvedLessonLibraryCard';
import { KangurResolvedLessonGroupAccordion } from '@/features/kangur/ui/components/lesson-library/KangurResolvedLessonGroupAccordion';
import { LazyKangurLessonsWordmark } from '@/features/kangur/ui/components/wordmarks/LazyKangurLessonsWordmark';
import { KangurResolvedPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurResolvedPageIntroCard';
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
import { prefetchActiveLessonView } from './LazyActiveLessonView';
import { useLessons } from './LessonsContext';
import { getLessonMasteryPresentation } from './Lessons.utils';

type LessonSubsection = {
  componentIds: KangurLesson['componentId'][];
  expectedLessonCount: number;
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
};

type LessonGroup = {
  componentIds: KangurLesson['componentId'][];
  expectedLessonCount: number;
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

interface LessonsCatalogContextValue extends LessonsViewState {
  isCardStatusReady: boolean;
  isSixYearOld: boolean;
  locale: string;
  masteryTranslations: LessonsTranslation;
  libraryCardTranslations: LessonsTranslation;
  subjectVisual: ReturnType<typeof getKangurSixYearOldSubjectVisual>;
  translations: LessonsTranslation;
}

const LessonsCatalogContext = React.createContext<LessonsCatalogContextValue | null>(null);

function useLessonsCatalogContext(): LessonsCatalogContextValue {
  const context = React.useContext(LessonsCatalogContext);
  if (!context) {
    throw new Error('useLessonsCatalogContext must be used within LessonsCatalog');
  }
  return context;
}

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

function LessonsCatalogDeferredLoadingCard({
  testId,
}: {
  testId: string;
}): React.JSX.Element {
  return (
    <div
      className='w-full rounded-[24px] border border-slate-200/60 bg-slate-50/90 p-4'
      data-testid={testId}
    >
      <div className='flex items-start gap-4'>
        <LessonsCatalogSkeletonBlock className='h-12 w-12 shrink-0 rounded-2xl bg-slate-200/80' />
        <div className='flex min-w-0 flex-1 flex-col gap-2'>
          <LessonsCatalogSkeletonBlock className='h-5 w-40 rounded-full bg-slate-200/80' />
          <LessonsCatalogSkeletonBlock className='h-4 w-full rounded-full bg-slate-200/70' />
          <LessonsCatalogSkeletonBlock className='h-4 w-3/4 rounded-full bg-slate-200/70' />
        </div>
      </div>
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
  showWordmark,
}: {
  children?: ReactNode;
  showWordmark: boolean;
  isSixYearOld?: boolean;
  locale?: string;
  subject?: string;
  translations?: LessonsTranslation;
}): React.JSX.Element {
  const { isSixYearOld, locale, subject, translations } = useLessonsCatalogContext();
  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const title = lessonListIntroContent?.title ?? translations('pageTitle');
  const descriptionLabel =
    lessonListIntroContent?.summary ?? translations('introDescription');

  return (
    <KangurResolvedPageIntroCard
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
      visualTitle={
        showWordmark ? (
          <LazyKangurLessonsWordmark
            className='mx-auto'
            data-testid='kangur-lessons-heading-art'
            label={title}
            locale={locale}
          />
        ) : undefined
      }
    >
      {children}
    </KangurResolvedPageIntroCard>
  );
}

function LessonsCatalogEmptyStateWithPageContent(): React.JSX.Element {
  const { ageGroup, translations } = useLessonsCatalogContext();
  const locale = useLocale();
  const ageGroupLabel = getLocalizedKangurAgeGroupLabel(ageGroup, locale);
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

function LessonsCatalogResolvedContent() {
  const {
    activeLessonId,
    completedLessonAssignmentsByComponent,
    ensureLessonsCatalogLoaded,
    handleSelectLesson,
    isCardStatusReady,
    isSixYearOld,
    isLessonsCatalogLoading,
    lessonAssignmentsByComponent,
    lessonDocuments,
    lessonTemplateMap,
    libraryCardTranslations,
    lessonSections,
    locale,
    masteryTranslations,
    orderedLessons,
    progress,
    subject,
    subjectVisual,
    translations,
  } = useLessonsCatalogContext();

  const [expandedLessonGroupId, setExpandedLessonGroupId] = useState<string | null>(null);
  const [expandedLessonSubsectionIdsByGroup, setExpandedLessonSubsectionIdsByGroup] = useState<
    Record<string, string[]>
  >({});
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
    setExpandedLessonSubsectionIdsByGroup({});
  }, [subject]);

  const isCoarsePointer = useKangurCoarsePointer();

  const displayLessonGroups: LessonGroup[] = useMemo(() => {
    if (lessonSections.length === 0) {
      return [];
    }

    const lessonByComponent = new Map(orderedLessons.map((lesson) => [lesson.componentId, lesson]));

    return lessonSections
      .map((section: KangurLessonSection): LessonGroup => {
        const enabledSubsections = section.subsections.filter((subsection) => subsection.enabled);
        const groupLessons = section.componentIds
          .map((id) => lessonByComponent.get(id))
          .filter((lesson): lesson is KangurLesson => Boolean(lesson));

        const subsections = enabledSubsections
          .map((subsection) => ({
            componentIds: [...subsection.componentIds],
            expectedLessonCount: subsection.componentIds.length,
            id: subsection.id,
            label: getLocalizedKangurLessonSectionLabel(subsection.id, locale, subsection.label),
            typeLabel: subsection.typeLabel
              ? getLocalizedKangurLessonSectionTypeLabel(locale, subsection.typeLabel)
              : undefined,
            lessons: subsection.componentIds
              .map((componentId) => lessonByComponent.get(componentId))
              .filter((lesson): lesson is KangurLesson => Boolean(lesson)),
          }));

        const hasSubsections = enabledSubsections.length > 0;
        const expectedLessonCount = [
          ...section.componentIds,
          ...enabledSubsections.flatMap((subsection) => subsection.componentIds),
        ].length;

        return {
          componentIds: [...section.componentIds],
          expectedLessonCount,
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
      .filter((group) => group.expectedLessonCount > 0);
  }, [lessonSections, locale, orderedLessons]);

  const lessonCardStateById = useMemo(
    () =>
      new Map(
        orderedLessons.map((lesson) => {
          const lessonAssignment = lessonAssignmentsByComponent.get(lesson.componentId) ?? null;
          const completedLessonAssignment = !lessonAssignment
            ? (completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null)
            : null;
          const localizedTitle = getResolvedKangurLessonTitle(lesson, locale, lessonTemplateMap);
          return [
            lesson.id,
            {
              completedLessonAssignment,
              hasDocumentContent: hasKangurLessonDocumentContent(lessonDocuments[lesson.id]),
              lessonAssignment,
              localizedDescription: getResolvedKangurLessonDescription(
                lesson,
                locale,
                lessonTemplateMap
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
              onSelect: () => handleSelectLesson(lesson.id),
            },
          ] as const;
        })
      ),
    [
      completedLessonAssignmentsByComponent,
      lessonAssignmentsByComponent,
      lessonDocuments,
      lessonTemplateMap,
      emptyMasteryPresentation,
      isCardStatusReady,
      libraryCardCopyTemplate,
      libraryCardTranslations,
      masteryTranslations,
      orderedLessons,
      progress,
      handleSelectLesson,
    ]
  );

  type LessonEntry =
    | { kind: 'group'; group: (typeof displayLessonGroups)[number] }
    | { kind: 'lesson'; lesson: KangurLesson };

  const lessonEntries: LessonEntry[] = useMemo(() => {
    const groupedComponentIds = new Set<string>();
    displayLessonGroups.forEach((group) => {
      group.componentIds.forEach((componentId) => {
        groupedComponentIds.add(componentId);
      });
      group.subsections?.forEach((subsection) => {
        subsection.componentIds.forEach((componentId) => {
          groupedComponentIds.add(componentId);
        });
      });
    });

    return [
      ...displayLessonGroups.map((group) => ({ kind: 'group', group }) as const),
      ...orderedLessons
        .filter((lesson) => !groupedComponentIds.has(lesson.componentId))
        .map((lesson) => ({ kind: 'lesson', lesson }) as const),
    ];
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
        <KangurResolvedLessonLibraryCard
          lesson={lesson}
          dataDocId='lessons_library_entry'
          iconTestId={`lesson-library-icon-${lesson.id}`}
          isCoarsePointer={isCoarsePointer}
          isSixYearOld={isSixYearOld}
          locale={locale}
          localizedDescription={lessonCardState.localizedDescription}
          localizedTitle={lessonCardState.localizedTitle}
          onSelect={lessonCardState.onSelect}
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
          const expandedLessonSubsectionIds =
            expandedLessonSubsectionIdsByGroup[entry.group.id] ?? [];
          const shouldShowDeferredGroupLoading =
            isExpanded &&
            entry.group.componentIds.length > 0 &&
            (entry.group.lessons.length === 0 ||
              (entry.group.lessons.length < entry.group.componentIds.length &&
                isLessonsCatalogLoading));
          let groupLessonIndex = 0;

          return (
            <KangurResolvedLessonGroupAccordion
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
              onToggle={() => {
                if (isExpanded) {
                  setExpandedLessonSubsectionIdsByGroup((current) => ({
                    ...current,
                    [entry.group.id]: [],
                  }));
                } else if (entry.group.componentIds.length > 0) {
                  prefetchActiveLessonView();
                  const ids = entry.group.componentIds;
                  requestAnimationFrame(() => {
                    ensureLessonsCatalogLoaded(ids);
                  });
                }
                setExpandedLessonGroupId(isExpanded ? null : entry.group.id);
              }}
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
              <>
                {shouldShowDeferredGroupLoading ? (
                  <LessonsCatalogDeferredLoadingCard
                    testId={`lessons-group-loading-${entry.group.id}`}
                  />
                ) : null}
                {entry.group.lessons.map((lesson) => {
                  const index = groupLessonIndex;
                  groupLessonIndex += 1;
                  return renderLessonCard(lesson, index);
                })}
                {entry.group.hasSubsections
                  ? entry.group.subsections?.map((subsection) => {
                      const isSubsectionExpanded =
                        expandedLessonSubsectionIds.includes(subsection.id);
                      const shouldShowDeferredSubsectionLoading =
                        isSubsectionExpanded &&
                        (subsection.lessons.length === 0 ||
                          (subsection.lessons.length < subsection.expectedLessonCount &&
                            isLessonsCatalogLoading));

                      return (
                        <KangurResolvedLessonGroupAccordion
                          accordionId={`${entry.group.id}-${subsection.id}`}
                          fallbackTypeLabel={null}
                          isExpanded={isSubsectionExpanded}
                          isCoarsePointer={isCoarsePointer}
                          key={subsection.id}
                          label={
                            <span
                              className='inline-flex items-center gap-2'
                              data-testid={`lessons-page-subsection-label-${subsection.id}`}
                            >
                              <span>{subsection.label}</span>
                            </span>
                          }
                          onToggle={() => {
                            if (!isSubsectionExpanded && subsection.componentIds.length > 0) {
                              prefetchActiveLessonView();
                              const ids = subsection.componentIds;
                              requestAnimationFrame(() => {
                                ensureLessonsCatalogLoaded(ids);
                              });
                            }
                            setExpandedLessonSubsectionIdsByGroup((current) => {
                              const currentExpandedIds = current[entry.group.id] ?? [];
                              return {
                                ...current,
                                [entry.group.id]: isSubsectionExpanded
                                  ? currentExpandedIds.filter((id) => id !== subsection.id)
                                  : [...currentExpandedIds, subsection.id],
                              };
                            });
                          }}
                        >
                          {shouldShowDeferredSubsectionLoading ? (
                            <LessonsCatalogDeferredLoadingCard
                              testId={`lessons-subsection-loading-${subsection.id}`}
                            />
                          ) : null}
                          {subsection.lessons.map((lesson) => {
                            const index = groupLessonIndex;
                            groupLessonIndex += 1;
                            return renderLessonCard(lesson, index);
                          })}
                        </KangurResolvedLessonGroupAccordion>
                      );
                    })
                  : null}
              </>
            </KangurResolvedLessonGroupAccordion>
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
  const lessonsState = useLessons();
  const {
    subject,
    ageGroup,
    lessonSections,
    orderedLessons,
    isLessonSectionsLoading,
    shouldShowLessonsCatalogSkeleton,
  } = lessonsState;
  const [isPageContentReady, setIsPageContentReady] = useState(true);

  useEffect(() => {
    // Keep effect for potential side effects but don't gate rendering
    if (typeof window === 'undefined') return;

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
    shouldShowLessonsCatalogSkeleton || isLessonSectionsLoading;
  const shouldShowEmptyState = lessonSections.length === 0 && orderedLessons.length === 0;

  const contextValue: LessonsCatalogContextValue = {
    ...lessonsState,
    isCardStatusReady: isPageContentReady,
    isSixYearOld,
    locale,
    masteryTranslations,
    libraryCardTranslations,
    subjectVisual,
    translations,
  };

  return (
    <LessonsCatalogContext.Provider value={contextValue}>
      <div className={LESSONS_LIBRARY_LAYOUT_CLASSNAME} data-testid='lessons-shell-transition'>
        <div id='kangur-lessons-intro' className='w-full'>
          {isPageContentReady ? (
            <LessonsCatalogIntroCardWithPageContent
              showWordmark={true}
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
            <KangurResolvedPageIntroCard
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
                <LazyKangurLessonsWordmark
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
            </KangurResolvedPageIntroCard>
          )}
        </div>
        <div
          aria-busy={shouldShowLessonsCatalogSkeleton}
          className={LESSONS_LIBRARY_LIST_CLASSNAME}
          data-testid='lessons-list-transition'
        >
          {shouldShowLessonsCatalogSkeleton ? (
            <LessonsCatalogSkeleton />
          ) : shouldShowEmptyState ? (
            isPageContentReady ? (
              <LessonsCatalogEmptyStateWithPageContent />
            ) : (
              <KangurEmptyState
                accent='indigo'
                description={translations('emptyDescription', { ageGroup: ageGroupLabel })}
                title={translations('emptyTitle')}
              />
            )
          ) : (
            <LessonsCatalogResolvedContent />
          )}
        </div>
      </div>
    </LessonsCatalogContext.Provider>
  );
}
