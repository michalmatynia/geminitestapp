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
  LessonsLoadingDetailCard,
} from './lessons-loading-primitives';
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
    <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
      {copy({
        de: 'Hier verbindest du den Themenkatalog mit gespeicherten Checkpoints, passendem Training und schnellen Wegen zurück zu Verlauf sowie Tagesplan.',
        en: 'Here you connect the topic catalog with saved checkpoints, matching practice, and quick routes back to history and the daily plan.',
        pl: 'Tutaj połączysz katalog tematów z zapisanymi checkpointami, pasującym treningiem oraz szybkim powrotem do historii i planu dnia.',
      })}
    </Text>
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
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
          {copy({ de: 'Lektionsabschnitte', en: 'Lesson sections', pl: 'Sekcje lekcji' })}
        </Text>
        <View style={{ flexDirection: 'column', gap: 8 }}>
          {lessonBody.sections.map((s, idx) => (
            <FilterChip key={s.id} label={`${idx + 1}. ${s.title}`} onPress={() => setActiveSectionIndex(idx)} selected={idx === activeSectionIndex} />
          ))}
        </View>
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
      {lessonBody.practiceNote && (
        <Text style={{ color: '#475569', fontSize: 13, fontStyle: 'italic', lineHeight: 18 }}>
          {lessonBody.practiceNote}
        </Text>
      )}
      <ActionButton centered label={copy({ de: 'Zapisz checkpoint', en: 'Save checkpoint', pl: 'Zapisz checkpoint' })} onPress={onSave} stretch tone='primary' />
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
  const [savedCheckpoint, setSavedCheckpoint] = useState<{
    countsAsLessonCompletion: boolean;
    newBadges: string[];
    scorePercent: number;
  } | null>(null);
  
  const effectiveFocusToken = useMemo(() => {
    if (focusToken === null) return null;
    if (focusToken === dismissedFocusToken) return null;
    return focusToken;
  }, [focusToken, dismissedFocusToken]);

  const { actionError, lessons, saveLessonCheckpoint, selectedLesson } = useKangurMobileLessons(effectiveFocusToken);
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
      if (selectedLesson !== null || effectiveFocusToken !== null) {
        return (
          <>
            <LessonsLoadingDetailCard />
            <LessonsLoadingCatalogCard />
          </>
        );
      }
      return <LessonsLoadingCatalogCard />;
    }

    if (selectedLesson === null) {
      if (focusToken !== null) {
        return (
          <Card>
            <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>{copy({ de: 'Lektions-Shortcut', en: 'Lesson shortcut', pl: 'Skrót do lekcji' })}</Text>
            <InsetPanel gap={10}>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: `Der Shortcut wollte "${focusToken}" öffnen. Dieser Shortcut öffnet "${focusToken}" nicht mehr.`,
                  en: `The shortcut tried to open "${focusToken}". This shortcut no longer opens "${focusToken}".`,
                  pl: `Skrót próbował otworzyć "${focusToken}". Ten skrót już nie otwiera "${focusToken}".`,
                })}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
                {copy({
                  de: 'Öffne den vollständigen Katalog oder kehre zum Tagesplan zurück.',
                  en: 'Open the full catalog or return to the daily plan.',
                  pl: 'Otwórz pełny katalog albo wróć do planu dnia.',
                })}
              </Text>
            </InsetPanel>
            <View style={{ gap: 10 }}>
              <LinkButton
                href='/lessons'
                label={copy({ de: 'Otwórz pełny katalog' })}
                stretch
                tone='primary'
              />
              <ActionButton
                label={copy({ de: 'Zurück zur Liste', en: 'Back to list', pl: 'Wróć do listy' })}
                onPress={() => {
                  setDismissedFocusToken(focusToken);
                  router.replace('/lessons');
                }}
                stretch
                tone='secondary'
              />
            </View>
          </Card>
        );
      }
      return null;
    }

    return (
      <Card>
        <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>{selectedLesson.lesson.emoji} {selectedLesson.lesson.title}</Text>
        
        {actionError && (
          <Text style={{ color: '#b91c1c', fontSize: 14 }}>{actionError}</Text>
        )}

        {savedCheckpoint && (
          <InsetPanel gap={8} style={{ backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }}>
            <Text style={{ color: '#0f766e', fontSize: 14, lineHeight: 20 }}>
              {savedCheckpoint.countsAsLessonCompletion
                ? copy({
                    de: `Lektion mit ${savedCheckpoint.scorePercent}% abgeschlossen!`,
                    en: `Lesson completed with ${savedCheckpoint.scorePercent}%!`,
                    pl: `Lekcja ukończona z wynikiem ${savedCheckpoint.scorePercent}%!`,
                  })
                : copy({
                    de: `Checkpoint mit ${savedCheckpoint.scorePercent}% gespeichert.`,
                    en: `Checkpoint saved with ${savedCheckpoint.scorePercent}%!`,
                    pl: `Checkpoint lekcji zapisano lokalnie z wynikiem ${savedCheckpoint.scorePercent}%.`,
                  })}
            </Text>
            {savedCheckpoint.newBadges.length > 0 && (
              <Text style={{ color: '#0d9488', fontSize: 13, fontWeight: '700' }}>
                {copy({ de: 'Neue Abzeichen', en: 'New badges', pl: 'Nowa odznaka' })}: {savedCheckpoint.newBadges.join(', ')}
              </Text>
            )}
          </InsetPanel>
        )}

        {selectedLessonBody !== null ? (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Ausgewählte Lektion', en: 'Selected lesson', pl: 'Wybrana lekcja' })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {copy({
                  de: `Aktuell geöffnet: ${selectedLesson.lesson.title}. Du kannst direkt weiterlesen oder in das passende Training springen.`,
                  en: `Currently open: ${selectedLesson.lesson.title}. You can continue reading right away or jump into matching practice.`,
                  pl: `Aktualnie otwarte: ${selectedLesson.lesson.title}. Możesz od razu czytać dalej albo przejść do pasującego treningu.`,
                })}
              </Text>
            </View>
            <LessonBodyView
              activeSectionIndex={activeSectionIdx}
              copy={copy}
              lessonBody={selectedLessonBody}
              onSave={() => {
                const res = saveLessonCheckpoint({
                  countsAsLessonCompletion: activeSectionIdx >= selectedLessonBody.sections.length - 1,
                  lessonComponentId: selectedLesson.lesson.componentId,
                  scorePercent: Math.round(((activeSectionIdx + 1) / selectedLessonBody.sections.length) * 100),
                });
                setSavedCheckpoint(res);
              }}
              setActiveSectionIndex={setActiveSectionIdx}
            />
            
            <InsetPanel gap={8} style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ color: '#0369a1', fontSize: 12, fontWeight: '700' }}>
                  {copy({ de: 'Lektionsfortschritt', en: 'Lesson progress', pl: 'Postęp lekcji' })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {effectiveFocusToken !== null && (
                    <Pill
                      label={copy({ de: 'Über Shortcut geöffnet', en: 'Opened from shortcut', pl: 'Otwarte ze skrótu' })}
                      tone={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', textColor: '#4338ca' }}
                    />
                  )}
                  <Pill
                    label={`${Math.round(((activeSectionIdx + 1) / selectedLessonBody.sections.length) * 100)}%`}
                    tone={{ backgroundColor: '#ffffff', borderColor: '#7dd3fc', textColor: '#0369a1' }}
                  />
                </View>
              </View>
            </InsetPanel>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <InsetPanel gap={10}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({ de: 'Lektionsbrief', en: 'Lesson brief', pl: 'Skrót lekcji' })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Diese Lektion ist hier vorerst als Kurzbrief verfügbar. Du siehst bereits den Beherrschungsstand, den letzten gespeicherten Stand und den schnellsten Weg zurück ins passende Training.',
                  en: 'This lesson is currently available here as a brief summary. You can already see the mastery state, last saved progress, and the fastest way back to the matching training.',
                  pl: 'Ta lekcja jest tu na razie dostępna jako krótki skrót. Widzisz już stan opanowania, ostatni zapis oraz najszybszy powrót do pasującego treningu.',
                })}
              </Text>
            </InsetPanel>

            <View style={{ gap: 8 }}>
              <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Versuche', en: 'Attempts', pl: 'Próby' })} {selectedLesson.checkpointSummary?.attempts ?? 0}</Text>
              <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Bestes Ergebnis', en: 'Best score', pl: 'Najlepszy wynik' })} {selectedLesson.checkpointSummary?.bestScorePercent ?? 0}%</Text>
              <Text style={{ color: '#475569', fontSize: 14 }}>{copy({ de: 'Letztes Ergebnis', en: 'Last score', pl: 'Ostatni wynik' })} {selectedLesson.checkpointSummary?.lastScorePercent ?? 0}%</Text>
              {selectedLesson.checkpointSummary?.lastCompletedAt && (
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  {copy({ de: 'Letzte Speicherung', en: 'Last saved', pl: 'Ostatni zapis' })}: {new Date(selectedLesson.checkpointSummary.lastCompletedAt).toLocaleDateString(locale)}
                </Text>
              )}
            </View>
            
            <ActionButton
              label={copy({ de: 'Zapisz checkpoint', en: 'Save checkpoint', pl: 'Zapisz checkpoint' })}
              onPress={() => {
                const res = saveLessonCheckpoint({
                  countsAsLessonCompletion: false,
                  lessonComponentId: selectedLesson.lesson.componentId,
                  scorePercent: 50,
                });
                setSavedCheckpoint(res);
              }}
              stretch
              tone='primary'
            />
          </View>
        )}

        <ActionButton
          label={copy({ de: 'Zurück zur Liste', en: 'Back to list', pl: 'Wróć do listy' })}
          onPress={() => {
            if (focusToken !== null) setDismissedFocusToken(focusToken);
            router.replace('/lessons');
          }}
          stretch
          tone='secondary'
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
