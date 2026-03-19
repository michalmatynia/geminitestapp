import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useEffect } from 'react';
import { getKangurAgeGroupLabel } from '@/features/kangur/lessons/lesson-catalog';
import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import {
  KangurEmptyState,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurLesson,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonSection } from '@/shared/contracts/kangur-lesson-sections';
import { useKangurLessonSections } from '@/features/kangur/ui/hooks/useKangurLessonSections';
import {
  LESSONS_CARD_TRANSITION,
  LESSONS_CARD_STAGGER_DELAY,
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

export function LessonsCatalog() {
  const translations = useTranslations('KangurLessonsPage');
  const masteryTranslations = useTranslations('KangurLessonsWidgets.mastery');
  const {
    subject,
    ageGroup,
    orderedLessons,
    handleSelectLesson,
    isDeferredContentReady,
    handleGoBack,
    progress,
    lessonAssignmentsByComponent,
    completedLessonAssignmentsByComponent,
    lessonDocuments,
    activeLessonId,
  } = useLessons();

  const { entry: lessonListIntroContent } = useKangurPageContentEntry('lessons-list-intro');
  const { entry: lessonListEmptyStateContent } = useKangurPageContentEntry('lessons-list-empty-state');

  const ageGroupLabel = getKangurAgeGroupLabel(ageGroup);

  const { data: sections = [] } = useKangurLessonSections({ subject, ageGroup, enabledOnly: true });
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
            label: sub.label,
            typeLabel: sub.typeLabel,
            lessons: sub.componentIds
              .map((componentId) => lessonByComponent.get(componentId))
              .filter((lesson): lesson is KangurLesson => Boolean(lesson)),
          }))
          .filter((sub) => sub.lessons.length > 0);

        return {
          id: section.id,
          label: section.label,
          typeLabel: section.typeLabel,
          lessons: groupLessons,
          subsections: subsections.length > 0 ? subsections : undefined,
        };
      })
      .filter((group) =>
        group.subsections ? group.subsections.length > 0 : group.lessons.length > 0
      );
  }, [sections, orderedLessons]);

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

  const lessonListIntroDescription = isDeferredContentReady
    ? (lessonListIntroContent?.summary ?? translations('introDescription'))
    : translations('loadingDescription');

  const renderLessonEntries = () => {
    let lessonIndex = 0;
    const renderLessonCard = (lesson: KangurLesson, index: number) => (
      <motion.div
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
          <KangurGlassPanel
            key={entry.group.id}
            className='w-full kangur-panel-hover-zoom'
            padding='lg'
            surface='playField'
          >
            <button
              type='button'
              onClick={() => setExpandedLessonGroupId(isExpanded ? null : entry.group.id)}
              className='flex w-full cursor-pointer items-center justify-between gap-3 text-left'
            >
              <div className='min-w-0'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
                  {entry.group.typeLabel ?? translations('groupTypeLabel')}
                </div>
                <div className='mt-1 text-lg font-semibold text-slate-900'>{entry.group.label}</div>
              </div>
              <ChevronDown
                aria-hidden='true'
                className={`h-5 w-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isExpanded && (
              <div className={`mt-4 flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
                {groupHasSubsections ? (
                  entry.group.subsections?.map((subsection) => (
                    <div key={subsection.id} className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
                      <div className='min-w-0'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
                          {subsection.typeLabel ?? translations('subsectionTypeLabel')}
                        </div>
                        <div className='mt-1 text-base font-semibold text-slate-900'>
                          {subsection.label}
                        </div>
                      </div>
                      <div className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
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
              </div>
            )}
          </KangurGlassPanel>
        );
      }

      const index = lessonIndex;
      lessonIndex += 1;

      return renderLessonCard(entry.lesson, index);
    });
  };

  return (
    <div
      className={`flex w-full max-w-lg flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-testid='lessons-shell-transition'
    >
      <div id='kangur-lessons-intro' className='w-full'>
        <KangurPageIntroCard
          description={lessonListIntroDescription}
          headingAs='h1'
          headingTestId='kangur-lessons-list-heading'
          onBack={handleGoBack}
          testId='lessons-list-intro-card'
          title={lessonListIntroContent?.title ?? translations('pageTitle')}
          visualTitle={<KangurLessonsWordmark className='mx-auto' data-testid='kangur-lessons-heading-art' />}
        />
      </div>
      {isDeferredContentReady && (
        <div
          className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}
          data-testid='lessons-list-transition'
        >
          {orderedLessons.length === 0 ? (
            <KangurEmptyState
              accent='indigo'
              description={
                lessonListEmptyStateContent?.summary ??
                translations('emptyDescription', { ageGroup: ageGroupLabel })
              }
              title={lessonListEmptyStateContent?.title ?? translations('emptyTitle')}
            />
          ) : (
            <div className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
              {renderLessonEntries()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
