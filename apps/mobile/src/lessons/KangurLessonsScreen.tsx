import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import { useKangurMobileLessonCheckpoints } from './useKangurMobileLessonCheckpoints';
import { useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';
import { useKangurMobileLessonsLessonMastery } from './useKangurMobileLessonsLessonMastery';
import { useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';
import { useKangurMobileLessonsAssignments } from './useKangurMobileLessonsAssignments';
import { useKangurMobileLessonsDuels } from './useKangurMobileLessonsDuels';
import { LessonsSecondarySections } from './lessons-screen-secondary-sections';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { LessonsHeader } from './components/LessonsHeader';
import { LessonCard } from './components/LessonCard';
import { useLessonsScreenState } from './useLessonsScreenState';
import { createKangurResultsHref } from '../scores/resultsHref';

export function KangurLessonsScreen(): React.JSX.Element {
  const { copy, router, focusToken, actionError, lessons, saveLessonCheckpoint, selectedLesson, isPreparing, selectedLessonBody } = useLessonsScreenState();
  
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonBadges = useKangurMobileLessonsBadges();
  const lessonMastery = useKangurMobileLessonsLessonMastery();
  const lessonRecentResults = useKangurMobileLessonsRecentResults();
  const lessonsAssignments = useKangurMobileLessonsAssignments();
  const lessonDuels = useKangurMobileLessonsDuels();
  
  const [dismissedFocusToken, setDismissedFocusToken] = useState<string | null>(null);
  const [savedCheckpoint, setSavedCheckpoint] = useState<any | null>(null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  useEffect(() => { setActiveSectionIdx(0); }, [selectedLesson?.lesson.id]);

  const effectiveFocusToken = useMemo(() => {
    if (focusToken === null || focusToken === dismissedFocusToken) return null;
    return focusToken;
  }, [focusToken, dismissedFocusToken]);

  const tutorContext = useMemo(() => ({
    contentId: selectedLesson?.lesson.id ?? 'lesson:list',
    focusKind: selectedLessonBody !== null ? 'document' as const : (selectedLesson !== null ? 'lesson_header' as const : 'library' as const),
    focusLabel: selectedLesson?.lesson.title,
    surface: 'lesson' as const,
    title: selectedLesson?.lesson.title ?? copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' }),
  }), [selectedLesson, selectedLessonBody, copy]);

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
      <View style={{ gap: 14 }}>
        <LessonsHeader 
            copy={copy} 
            lessonMastery={lessonMastery} 
            planHref="/plan" 
            resultsHref={createKangurResultsHref()} 
        />
        <KangurMobileAiTutorCard context={tutorContext} />
        <LessonCard
            copy={copy}
            isPreparing={isPreparing}
            selectedLesson={selectedLesson}
            focusToken={focusToken}
            selectedLessonBody={selectedLessonBody}
            actionError={actionError}
            savedCheckpoint={savedCheckpoint}
            activeSectionIdx={activeSectionIdx}
            effectiveFocusToken={effectiveFocusToken}
            saveLessonCheckpoint={saveLessonCheckpoint}
            setSavedCheckpoint={setSavedCheckpoint}
            setDismissedFocusToken={setDismissedFocusToken}
            setActiveSectionIdx={setActiveSectionIdx}
            router={router}
        />
        <LessonsSecondarySections
          copy={copy} 
          duelSectionDescription='' 
          isPreparingLessonsView={isPreparing} 
          lessonBadges={lessonBadges} 
          lessonCheckpoints={lessonCheckpoints} 
          lessonDuels={lessonDuels} 
          lessonFocusSummary={null} 
          lessonMastery={lessonMastery} 
          lessonRecentResults={lessonRecentResults} 
          lessons={lessons} 
          lessonsAssignments={lessonsAssignments} 
          locale={locale}
          onOpenCatalogLesson={() => setDismissedFocusToken(null)} 
          openDuelSession={(id: string) => router.replace(createKangurDuelsHref({ sessionId: id }))} 
          profileHref='/profile' 
          resultsHref={createKangurResultsHref()}
        />
      </View>
    </KangurMobileScrollScreen>
  );
}
