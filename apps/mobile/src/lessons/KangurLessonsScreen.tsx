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

type TutorContext = {
  contentId: string;
  focusKind: 'document' | 'lesson_header' | 'library';
  focusLabel: string | undefined;
  surface: 'lesson';
  title: string;
};

function useLessonsTutorState({
  copy,
  focusToken,
  dismissedFocusToken,
  selectedLesson,
  selectedLessonBody,
}: {
  copy: ReturnType<typeof useLessonsScreenState>['copy'];
  focusToken: string | null;
  dismissedFocusToken: string | null;
  selectedLesson: ReturnType<typeof useLessonsScreenState>['selectedLesson'];
  selectedLessonBody: ReturnType<typeof useLessonsScreenState>['selectedLessonBody'];
}): {
  effectiveFocusToken: string | null;
  tutorContext: TutorContext;
} {
  const effectiveFocusToken = useMemo(() => {
    if (focusToken === null || focusToken === dismissedFocusToken) return null;
    return focusToken;
  }, [focusToken, dismissedFocusToken]);

  const tutorContext = useMemo(() => {
    let focusKind: 'document' | 'lesson_header' | 'library' = 'library';
    if (selectedLessonBody !== null) {
      focusKind = 'document';
    } else if (selectedLesson !== null) {
      focusKind = 'lesson_header';
    }

    return {
      contentId: selectedLesson?.lesson.id ?? 'lesson:list',
      focusKind,
      focusLabel: selectedLesson?.lesson.title,
      surface: 'lesson' as const,
      title: selectedLesson?.lesson.title ?? copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' }),
    };
  }, [selectedLesson, selectedLessonBody, copy]);

  return { effectiveFocusToken, tutorContext };
}

function useLessonsScreenData(): ReturnType<typeof useLessonsScreenState> & {
  lessonCheckpoints: ReturnType<typeof useKangurMobileLessonCheckpoints>;
  lessonBadges: ReturnType<typeof useKangurMobileLessonsBadges>;
  lessonMastery: ReturnType<typeof useKangurMobileLessonsLessonMastery>;
  lessonRecentResults: ReturnType<typeof useKangurMobileLessonsRecentResults>;
  lessonsAssignments: ReturnType<typeof useKangurMobileLessonsAssignments>;
  lessonDuels: ReturnType<typeof useKangurMobileLessonsDuels>;
  dismissedFocusToken: string | null;
  setDismissedFocusToken: React.Dispatch<React.SetStateAction<string | null>>;
  savedCheckpoint: ReturnType<ReturnType<typeof useLessonsScreenState>['saveLessonCheckpoint']>;
  setSavedCheckpoint: React.Dispatch<React.SetStateAction<ReturnType<ReturnType<typeof useLessonsScreenState>['saveLessonCheckpoint']>>>;
  activeSectionIdx: number;
  setActiveSectionIdx: React.Dispatch<React.SetStateAction<number>>;
  effectiveFocusToken: string | null;
  tutorContext: TutorContext;
} {
  const state = useLessonsScreenState();
  const { copy, focusToken, selectedLesson, selectedLessonBody } = state;
  
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonBadges = useKangurMobileLessonsBadges();
  const lessonMastery = useKangurMobileLessonsLessonMastery();
  const lessonRecentResults = useKangurMobileLessonsRecentResults();
  const lessonsAssignments = useKangurMobileLessonsAssignments();
  const lessonDuels = useKangurMobileLessonsDuels();
  
  const [dismissedFocusToken, setDismissedFocusToken] = useState<string | null>(null);
  const [savedCheckpoint, setSavedCheckpoint] = useState<ReturnType<typeof state.saveLessonCheckpoint>>(null);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  useEffect(() => { setActiveSectionIdx(0); }, [selectedLesson?.lesson.id]);

  const { effectiveFocusToken, tutorContext } = useLessonsTutorState({
    copy,
    focusToken,
    dismissedFocusToken,
    selectedLesson,
    selectedLessonBody,
  });

  return {
    ...state,
    lessonCheckpoints,
    lessonBadges,
    lessonMastery,
    lessonRecentResults,
    lessonsAssignments,
    lessonDuels,
    dismissedFocusToken,
    setDismissedFocusToken,
    savedCheckpoint,
    setSavedCheckpoint,
    activeSectionIdx,
    setActiveSectionIdx,
    effectiveFocusToken,
    tutorContext,
  };
}

function LessonsCatalogSections({ data }: { data: ReturnType<typeof useLessonsScreenData> }): React.JSX.Element {
  const { copy, locale, router, isPreparing, lessons, lessonCheckpoints, lessonBadges, lessonMastery, lessonRecentResults, lessonsAssignments, lessonDuels, setDismissedFocusToken } = data;
  return (
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
  );
}

function LessonsMainView({ data }: { data: ReturnType<typeof useLessonsScreenData> }): React.JSX.Element {
  const {
    copy, router, focusToken, actionError, saveLessonCheckpoint, selectedLesson, isPreparing, selectedLessonBody,
    lessonMastery, savedCheckpoint, setSavedCheckpoint, activeSectionIdx, setActiveSectionIdx, effectiveFocusToken, setDismissedFocusToken, tutorContext,
  } = data;

  return (
    <View style={{ gap: 14 }}>
      <LessonsHeader copy={copy} lessonMastery={lessonMastery} planHref='/plan' resultsHref={createKangurResultsHref()} />
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
      <LessonsCatalogSections data={data} />
    </View>
  );
}

export function KangurLessonsScreen(): React.JSX.Element {
  const data = useLessonsScreenData();

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
      <LessonsMainView data={data} />
    </KangurMobileScrollScreen>
  );
}
