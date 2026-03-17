import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
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
import {
  LESSONS_CARD_TRANSITION,
  LESSONS_CARD_STAGGER_DELAY,
} from './Lessons.constants';
import { getLessonMasteryPresentation } from './Lessons.utils';
import { useLessons } from './LessonsContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { WEB_DEVELOPMENT_LESSON_GROUPS } from '@/features/kangur/lessons/subjects/web-development/catalog';

export function LessonsCatalog() {
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

  const lessonGroupDefinitions =
    subject === 'web_development'
      ? WEB_DEVELOPMENT_LESSON_GROUPS
      : [];
  const [expandedLessonGroupId, setExpandedLessonGroupId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedLessonGroupId(null);
  }, [subject]);

  const lessonGroups = lessonGroupDefinitions.length > 0 ? lessonGroupDefinitions
    .map((group) => {
      const lessonByComponent = new Map(orderedLessons.map((l) => [l.componentId, l]));
      return {
        ...group,
        lessons: group.componentIds
          .map((id) => lessonByComponent.get(id))
          .filter((l): l is KangurLesson => Boolean(l)),
      };
    })
    .filter((group) => group.lessons.length > 0) : [];

  const lessonListIntroDescription = isDeferredContentReady
    ? (lessonListIntroContent?.summary ?? 'Wybierz temat i przejdź od razu do praktyki lub powtórki.')
    : 'Lekcje zaraz będą gotowe.';

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
          title={lessonListIntroContent?.title ?? 'Lekcje'}
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
              description={lessonListEmptyStateContent?.summary ?? `Brak aktywnych lekcji dla grupy ${ageGroupLabel}.`}
              title={lessonListEmptyStateContent?.title ?? 'Brak aktywnych lekcji'}
            />
          ) : lessonGroups.length > 0 ? (
            <div className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
              {lessonGroups.map((group) => {
                const isExpanded = expandedLessonGroupId === group.id;
                return (
                  <KangurGlassPanel key={group.id} className='w-full' padding='lg' surface='playField'>
                    <button type='button' onClick={() => setExpandedLessonGroupId(isExpanded ? null : group.id)} className='flex w-full items-center justify-between gap-3 text-left'>
                      <div className='min-w-0'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>{group.typeLabel ?? 'Grupa'}</div>
                        <div className='mt-1 text-lg font-semibold text-slate-900'>{group.label}</div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className={`mt-4 flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
                        {group.lessons.map((lesson, index) => (
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
                              masteryPresentation={getLessonMasteryPresentation(lesson, progress)}
                              lessonAssignment={lessonAssignmentsByComponent.get(lesson.componentId) ?? null}
                              completedLessonAssignment={completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null}
                              hasDocumentContent={hasKangurLessonDocumentContent(lessonDocuments[lesson.id])}
                              ariaCurrent={activeLessonId === lesson.id ? 'page' : undefined}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </KangurGlassPanel>
                );
              })}
            </div>
          ) : (
            <div className={`flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`}>
              {orderedLessons.map((lesson, index) => (
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
                    masteryPresentation={getLessonMasteryPresentation(lesson, progress)}
                    lessonAssignment={lessonAssignmentsByComponent.get(lesson.componentId) ?? null}
                    completedLessonAssignment={completedLessonAssignmentsByComponent.get(lesson.componentId) ?? null}
                    hasDocumentContent={hasKangurLessonDocumentContent(lessonDocuments[lesson.id])}
                    ariaCurrent={activeLessonId === lesson.id ? 'page' : undefined}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
