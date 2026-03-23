import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, useEffect } from 'react';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonSectionLabel,
  getLocalizedKangurLessonSectionTypeLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import { KangurLessonGroupAccordion } from '@/features/kangur/ui/components/KangurLessonGroupAccordion';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import {
  getKangurSixYearOldLessonGroupIcon,
  getKangurSixYearOldSubjectVisual,
  KANGUR_SIX_YEAR_OLD_SUBSECTION_ICON,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurLesson,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import {
  LESSONS_CARD_TRANSITION,
  LESSONS_CARD_STAGGER_DELAY,
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from './Lessons.constants';
import { getLessonMasteryPresentation } from './Lessons.utils';
import { useLessons } from './LessonsContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

type LessonSubsection = {
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
};

type LessonGroup = {
  id: string;
  label: string;
  typeLabel?: string;
  lessons: KangurLesson[];
  subsections?: LessonSubsection[];
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

export function LessonsCatalog() {
  const locale = useLocale();
  const translations = useTranslations('KangurLessonsPage');
  const masteryTranslations = useTranslations('KangurLessonsWidgets.mastery');
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

  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const { entry: lessonListEmptyStateContent } = useKangurPageContentEntry('lessons-list-empty-state');

  const ageGroupLabel = getLocalizedKangurAgeGroupLabel(ageGroup, locale);
  const isSixYearOld = ageGroup === 'six_year_old';
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);

  const sections = lessonSections;
  const [expandedLessonGroupId, setExpandedLessonGroupId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedLessonGroupId(null);
  }, [subject]);

  const displayLessonGroups: LessonGroup[] = useMemo(() => {
    if (sections.length === 0) return [];
    const lessonByComponent = new Map(orderedLessons.map((lesson) => [lesson.componentId, lesson]));
    return sections
      .map((section: KangurLessonSection): LessonGroup => {
        const groupLessons = section.componentIds
          .map((id) => lessonByComponent.get(id))
          .filter((lesson): lesson is KangurLesson => Boolean(lesson));
        const subsections = section.subsections
          .filter((sub) => sub.enabled)
          .map((sub) => ({
            id: sub.id,
            label: getLocalizedKangurLessonSectionLabel(sub.id, locale, sub.label),
            typeLabel: sub.typeLabel
              ? getLocalizedKangurLessonSectionTypeLabel(locale, sub.typeLabel)
              : undefined,
            lessons: sub.componentIds
              .map((componentId) => lessonByComponent.get(componentId))
              .filter((lesson): lesson is KangurLesson => Boolean(lesson)),
          }))
          .filter((sub) => sub.lessons.length > 0);

        return {
          id: section.id,
          label: getLocalizedKangurLessonSectionLabel(section.id, locale, section.label),
          typeLabel: section.typeLabel
            ? getLocalizedKangurLessonSectionTypeLabel(locale, section.typeLabel)
            : undefined,
          lessons: groupLessons,
          subsections: subsections.length > 0 ? subsections : undefined,
        };
      })
      .filter((group) =>
        group.subsections ? group.subsections.length > 0 : group.lessons.length > 0
      );
  }, [locale, sections, orderedLessons]);

  type LessonEntry =
    | { kind: 'group'; group: (typeof displayLessonGroups)[number] }
    | { kind: 'lesson'; lesson: KangurLesson };

  const lessonEntries: LessonEntry[] = [];
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

  const usedGroupIds = new Set<string>();
  orderedLessons.forEach((lesson) => {
    const groupId = lessonGroupIdByComponent.get(lesson.componentId);
    if (groupId) {
      if (!usedGroupIds.has(groupId)) {
        const group = lessonGroupById.get(groupId);
        if (group) {
          lessonEntries.push({ kind: 'group', group });
        }
        usedGroupIds.add(groupId);
      }
      return;
    }
    lessonEntries.push({ kind: 'lesson', lesson });
  });

  const lessonListIntroDescriptionLabel =
    lessonListIntroContent?.summary ?? translations('introDescription');
  const lessonListIntroDescription = isSixYearOld ? (
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
      label={lessonListIntroDescriptionLabel}
    />
  ) : (
    lessonListIntroDescriptionLabel
  );
  const loadingStatusLabel = isLessonSectionsLoading
    ? translations('loadingSectionsStatus')
    : translations('loadingLessonsStatus');
  const loadingStatusDescription = isLessonSectionsLoading
    ? translations('loadingSectionsDetails')
    : translations('loadingLessonsDetails');
  const shouldShowIntroLoadingState =
    shouldShowLessonsCatalogSkeleton || isLessonsCatalogLoading || isLessonSectionsLoading;

  const renderLessonEntries = () => {
    let lessonIndex = 0;
    const renderLessonCard = (lesson: KangurLesson, index: number) => (
      <motion.div
        className='w-full'
        key={lesson.id}
        data-testid={`lesson-library-motion-${lesson.id}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...LESSONS_CARD_TRANSITION, delay: index * LESSONS_CARD_STAGGER_DELAY }}
      >
        <KangurLessonLibraryCard
          lesson={lesson}
          dataDocId='lessons_library_entry'
          iconTestId={`lesson-library-icon-${lesson.id}`}
          onSelect={() => handleSelectLesson(lesson.id)}
          masteryPresentation={getLessonMasteryPresentation(lesson, progress, masteryTranslations)}
          lessonAssignment={lessonAssignmentsByComponent.get(lesson.componentId) ?? null}
          completedLessonAssignment={completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null}
          hasDocumentContent={hasKangurLessonDocumentContent(lessonDocuments[lesson.id])}
          ariaCurrent={activeLessonId === lesson.id ? 'page' : undefined}
        />
      </motion.div>
    );

    return lessonEntries.map((entry) => {
      if (entry.kind === 'group') {
        const isExpanded = expandedLessonGroupId === entry.group.id;
        const groupHasSubsections = Boolean(entry.group.subsections?.length);
        let groupLessonIndex = 0;
        return (
          <KangurLessonGroupAccordion
            accordionId={entry.group.id}
            fallbackTypeLabel={
              isSixYearOld ? (
                <KangurVisualCueContent
                  icon={getKangurSixYearOldLessonGroupIcon(groupHasSubsections)}
                  iconClassName='text-base'
                  iconTestId={`lessons-page-group-type-icon-${entry.group.id}`}
                  label={translations('groupTypeLabel')}
                />
              ) : (
                translations('groupTypeLabel')
              )
            }
            isExpanded={isExpanded}
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
                    {getKangurSixYearOldLessonGroupIcon(groupHasSubsections)}
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
            {groupHasSubsections ? (
              entry.group.subsections?.map((subsection) => (
                <div
                  key={subsection.id}
                  className={LESSONS_LIBRARY_LIST_CLASSNAME}
                >
                  <div className='min-w-0'>
                    {isSixYearOld ? (
                      <>
                        <div data-testid={`lessons-page-subsection-type-${subsection.id}`}>
                          <KangurVisualCueContent
                            detail={subjectVisual.detail}
                            detailClassName='text-sm'
                            detailTestId={`lessons-page-subsection-type-detail-${subsection.id}`}
                            icon={KANGUR_SIX_YEAR_OLD_SUBSECTION_ICON}
                            iconClassName='text-base'
                            iconTestId={`lessons-page-subsection-type-icon-${subsection.id}`}
                            label={subsection.typeLabel ?? translations('subsectionTypeLabel')}
                          />
                        </div>
                        <div
                          className='mt-1 inline-flex items-center gap-2 text-base font-semibold text-slate-900'
                          data-testid={`lessons-page-subsection-label-${subsection.id}`}
                        >
                          <span
                            aria-hidden='true'
                            className='text-lg leading-none'
                            data-testid={`lessons-page-subsection-icon-${subsection.id}`}
                          >
                            {subjectVisual.icon}
                          </span>
                          <span>{subsection.label}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
                          {subsection.typeLabel ?? translations('subsectionTypeLabel')}
                        </div>
                        <div className='mt-1 text-base font-semibold text-slate-900'>
                          {subsection.label}
                        </div>
                      </>
                    )}
                  </div>
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
    });
  };

  return (
    <div className={LESSONS_LIBRARY_LAYOUT_CLASSNAME} data-testid='lessons-shell-transition'>
      <div id='kangur-lessons-intro' className='w-full'>
        <KangurPageIntroCard
          description={lessonListIntroDescription}
          headingAs='h1'
          headingTestId='kangur-lessons-list-heading'
          showBackButton={false}
          testId='lessons-list-intro-card'
          title={lessonListIntroContent?.title ?? translations('pageTitle')}
          visualTitle={
            <KangurLessonsWordmark
              className='mx-auto'
              data-testid='kangur-lessons-heading-art'
              label={lessonListIntroContent?.title ?? translations('pageTitle')}
              locale={locale}
            />
          }
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
      </div>
      <div
        aria-busy={shouldShowLessonsCatalogSkeleton}
        className={LESSONS_LIBRARY_LIST_CLASSNAME}
        data-testid='lessons-list-transition'
      >
        {shouldShowLessonsCatalogSkeleton ? (
          <LessonsCatalogSkeleton />
        ) : orderedLessons.length === 0 ? (
          <KangurEmptyState
            accent='indigo'
            description={
              lessonListEmptyStateContent?.summary ??
              translations('emptyDescription', { ageGroup: ageGroupLabel })
            }
            title={lessonListEmptyStateContent?.title ?? translations('emptyTitle')}
          />
        ) : (
          <div className={LESSONS_LIBRARY_LIST_CLASSNAME}>
            {renderLessonEntries()}
          </div>
        )}
      </div>
    </div>
  );
}
