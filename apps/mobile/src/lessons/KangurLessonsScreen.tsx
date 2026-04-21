import { getKangurPortableLessonBody } from '@kangur/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useEffect, useState, useMemo } from 'react';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileLessonCheckpoints } from './useKangurMobileLessonCheckpoints';
import { useKangurMobileLessonsAssignments } from './useKangurMobileLessonsAssignments';
import { useKangurMobileLessonsBadges } from './useKangurMobileLessonsBadges';
import { useKangurMobileLessonsLessonMastery } from './useKangurMobileLessonsLessonMastery';
import { useKangurMobileLessonsRecentResults } from './useKangurMobileLessonsRecentResults';
import { useKangurMobileLessonsDuels } from './useKangurMobileLessonsDuels';
import { useKangurMobileLessons } from './useKangurMobileLessons';
import { useLessonsScreenBootState } from './useLessonsScreenBootState';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip as FilterChip,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';

import {
  LessonsLoadingCatalogCard,
} from './lessons-screen-primitives';
import { LessonsSecondarySections } from './lessons-screen-secondary-sections';

const PROFILE_ROUTE = '/profile' as const;
const PLAN_ROUTE = '/plan' as const;
const RESULTS_ROUTE = createKangurResultsHref();

interface LessonMastery {
  trackedLessons: number;
  masteredLessons: number;
  lessonsNeedingPractice: number;
  weakest: Array<{ title: string }>;
  strongest: Array<{ title: string }>;
}

const LessonsHeader = ({ copy, lessonMastery, locale }: {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  lessonMastery: LessonMastery;
  locale: KangurMobileLocale;
}): JSX.Element => (
  <Card>
    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{copy({ de: 'Lernen und Wiederholen', en: 'Learn and review', pl: 'Nauka i powtórki' })}</Text>
    <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>{copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' })}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label={`${copy({ de: 'Verfolgt', en: 'Tracked', pl: 'Śledzone' })} ${lessonMastery.trackedLessons}`} tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }} />
      <Pill label={`${copy({ de: 'Beherrscht', en: 'Mastered', pl: 'Opanowane' })} ${lessonMastery.masteredLessons}`} tone={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' }} />
      <Pill label={`${copy({ de: 'Do powtórki', en: 'Needs review', pl: 'Do powtórki' })} ${lessonMastery.lessonsNeedingPractice}`} tone={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' }} />
    </View>
    <View style={{ gap: 10 }}>
      <LinkButton href={RESULTS_ROUTE} label={copy({ de: 'Vollständigen Verlauf öffnen', en: 'Open full history', pl: 'Otwórz pełną historię' })} stretch style={{ borderRadius: 16 }} tone='secondary' verticalPadding={12} />
      <LinkButton href={PLAN_ROUTE} label={translateKangurMobileActionLabel('Open daily plan', locale)} stretch style={{ borderRadius: 16 }} tone='secondary' verticalPadding={12} />
    </View>
  </Card>
);

interface LessonSection {
  id: string;
  title: string;
  description: string;
}

interface LessonBody {
  introduction: string;
  sections: LessonSection[];
}

const LessonBodyView = ({ copy, lessonBody, activeSectionIndex, setActiveSectionIndex, onSave }: {
  copy: (dict: { de: string; en: string; pl: string }) => string;
  lessonBody: LessonBody;
  activeSectionIndex: number;
  setActiveSectionIndex: (index: number) => void;
  onSave: () => void;
}): JSX.Element => {
  const activeSection = lessonBody.sections[activeSectionIndex] ?? null;
  const totalSections = lessonBody.sections.length;
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: '#475569', fontSize: 14 }}>{lessonBody.introduction}</Text>
      <View style={{ flexDirection: 'column', gap: 8 }}>
        {lessonBody.sections.map((s, idx) => (
          <FilterChip key={s.id} label={`${idx + 1}. ${s.title}`} onPress={() => setActiveSectionIndex(idx)} selected={idx === activeSectionIndex} />
        ))}
      </View>
      {activeSection !== null && (
        <InsetPanel gap={10}>
          <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>{activeSection.title}</Text>
          <Text style={{ color: '#475569', fontSize: 14 }}>{activeSection.description}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ActionButton centered disabled={activeSectionIndex === 0} label={copy({ de: 'Zurück', en: 'Previous', pl: 'Poprzednia' })} onPress={() => setActiveSectionIndex(Math.max(0, activeSectionIndex - 1))} tone='secondary' />
            <ActionButton centered disabled={activeSectionIndex >= totalSections - 1} label={copy({ de: 'Weiter', en: 'Next', pl: 'Następna' })} onPress={() => setActiveSectionIndex(Math.min(totalSections - 1, activeSectionIndex + 1))} tone='primary' />
          </View>
        </InsetPanel>
      )}
      <ActionButton centered label={copy({ de: 'Zapisz postęp', en: 'Save progress', pl: 'Zapisz postęp' })} onPress={onSave} stretch tone='primary' />
    </View>
  );
};

export function KangurLessonsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonBadges = useKangurMobileLessonsBadges();
  const lessonMastery = useKangurMobileLessonsLessonMastery() as LessonMastery;
  const lessonRecentResults = useKangurMobileLessonsRecentResults();
  const lessonsAssignments = useKangurMobileLessonsAssignments();
  const rawFocusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const focusToken = (typeof rawFocusParam === 'string' && rawFocusParam.trim() !== '') ? rawFocusParam.trim().toLowerCase() : null;
  const [dismissedFocusToken, setDismissedFocusToken] = useState<string | null>(null);
  
  const effectiveFocusToken = useMemo(() => {
    if (focusToken === null) return null;
    if (focusToken === dismissedFocusToken) return null;
    return focusToken;
  }, [focusToken, dismissedFocusToken]);

  const { lessons, saveLessonCheckpoint, selectedLesson } = useKangurMobileLessons(effectiveFocusToken);
  const isPreparing = useLessonsScreenBootState(effectiveFocusToken ?? 'catalog');
  const selectedLessonBody = (!isPreparing && selectedLesson !== null) ? getKangurPortableLessonBody(selectedLesson.lesson.componentId, locale) as LessonBody : null;
  const lessonDuels = useKangurMobileLessonsDuels();
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  useEffect(() => { setActiveSectionIdx(0); }, [selectedLesson?.lesson.id]);

  const tutorContext: KangurAiTutorConversationContext = useMemo(() => {
    if (selectedLesson !== null) {
      return {
        contentId: selectedLesson.lesson.id,
        description: selectedLesson.lesson.description,
        focusKind: selectedLessonBody !== null ? 'document' : 'lesson_header',
        focusLabel: selectedLesson.lesson.title,
        surface: 'lesson',
        title: selectedLesson.lesson.title,
      };
    }
    return {
      contentId: 'lesson:list',
      focusKind: 'library',
      surface: 'lesson',
      title: copy({ de: 'Lektionen', en: 'Lessons', pl: 'Lekcje' }),
    };
  }, [selectedLesson, selectedLessonBody, copy]);

  const renderLessonCard = (): JSX.Element | null => {
    if (isPreparing) {
      return <LessonsLoadingCatalogCard />;
    }
    if (selectedLesson === null) {
      return null;
    }
    return (
      <Card>
        <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>{selectedLesson.lesson.emoji} {selectedLesson.lesson.title}</Text>
        {selectedLessonBody !== null ? (
          <LessonBodyView activeSectionIndex={activeSectionIdx} copy={copy} lessonBody={selectedLessonBody} onSave={() => saveLessonCheckpoint({ countsAsLessonCompletion: activeSectionIdx >= selectedLessonBody.sections.length - 1, lessonComponentId: selectedLesson.lesson.componentId, scorePercent: 100 })} setActiveSectionIndex={setActiveSectionIdx} />
        ) : (
          <Text>{copy({ de: 'Kurzbrief verfügbar.', en: 'Brief available.', pl: 'Skrót dostępny.' })}</Text>
        )}
        <ActionButton
          label={copy({ de: 'Zurück zur Liste', en: 'Back to list', pl: 'Wróć do listy' })}
          onPress={() => {
            if (focusToken !== null) setDismissedFocusToken(focusToken);
            router.replace('/lessons');
          }}
          stretch
          tone='primary'
        />
      </Card>
    );
  };

  return (
    <KangurMobileScrollScreen contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingVertical: 24 }}>
      <View style={{ gap: 14 }}>
        <LinkButton href='/' label={copy({ de: 'Zurück', en: 'Back', pl: 'Wróć' })} stretch />
        <LessonsHeader copy={copy} lessonMastery={lessonMastery} locale={locale} />
        <KangurMobileAiTutorCard context={tutorContext} />
        {renderLessonCard()}
        <LessonsSecondarySections
          copy={copy} duelSectionDescription='' isPreparingLessonsView={isPreparing} lessonBadges={lessonBadges} lessonCheckpoints={lessonCheckpoints} lessonDuels={lessonDuels} lessonFocusSummary={null} lessonMastery={lessonMastery} lessonRecentResults={lessonRecentResults} lessons={lessons} lessonsAssignments={lessonsAssignments} locale={locale}
          onOpenCatalogLesson={() => setDismissedFocusToken(null)} openDuelSession={(id) => router.replace(createKangurDuelsHref({ sessionId: id }))} profileHref={PROFILE_ROUTE} resultsHref={RESULTS_ROUTE}
        />
      </View>
    </KangurMobileScrollScreen>
  );
}
