import { getKangurPortableLessonBody } from '@kangur/core';
import { getLocalizedKangurMetadataBadgeName } from '@kangur/core';
import { Link, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from './useKangurMobileLessonCheckpoints';
import {
  useKangurMobileLessonsAssignments,
  type KangurMobileLessonsAssignmentItem,
} from './useKangurMobileLessonsAssignments';
import {
  useKangurMobileLessonsBadges,
  type KangurMobileLessonsBadgeItem,
} from './useKangurMobileLessonsBadges';
import {
  useKangurMobileLessonsLessonMastery,
  type KangurMobileLessonsLessonMasteryItem,
} from './useKangurMobileLessonsLessonMastery';
import {
  useKangurMobileLessonsRecentResults,
  type KangurMobileLessonsRecentResultItem,
} from './useKangurMobileLessonsRecentResults';
import { useKangurMobileLessonsDuels } from './useKangurMobileLessonsDuels';
import { useKangurMobileLessons } from './useKangurMobileLessons';
import { useLessonsScreenBootState } from './useLessonsScreenBootState';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip as FilterChip,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
  KangurMobileSkeletonBlock as SkeletonBlock,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';

import {
  LessonsLoadingCatalogCard,
  LessonsLoadingDetailCard,
  getMasteryTone,
} from './lessons-screen-primitives';
import { LessonsSecondarySections } from './lessons-screen-secondary-sections';

const PROFILE_ROUTE = '/profile' as const;
const PLAN_ROUTE = '/plan' as const;
const RESULTS_ROUTE = createKangurResultsHref();

export function KangurLessonsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonBadges = useKangurMobileLessonsBadges();
  const lessonMastery = useKangurMobileLessonsLessonMastery();
  const lessonRecentResults = useKangurMobileLessonsRecentResults();
  const lessonsAssignments = useKangurMobileLessonsAssignments();
  const rawFocusParam = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const normalizedRouteFocusToken =
    typeof rawFocusParam === 'string' ? rawFocusParam.trim().toLowerCase() || null : null;
  const [dismissedFocusToken, setDismissedFocusToken] = useState<string | null>(null);
  const effectiveFocusToken =
    normalizedRouteFocusToken && normalizedRouteFocusToken === dismissedFocusToken
      ? null
      : normalizedRouteFocusToken;
  const {
    actionError: lessonActionError,
    focusToken,
    lessons,
    saveLessonCheckpoint,
    selectedLesson,
  } = useKangurMobileLessons(
    effectiveFocusToken,
  );
  const lessonsViewKey = focusToken ?? 'catalog';
  const isPreparingLessonsView = useLessonsScreenBootState(lessonsViewKey);
  const selectedLessonBody =
    !isPreparingLessonsView && selectedLesson
      ? getKangurPortableLessonBody(selectedLesson.lesson.componentId, locale)
      : null;
  const lessonDuels = useKangurMobileLessonsDuels();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [savedLessonCheckpoint, setSavedLessonCheckpoint] = useState<{
    countsAsLessonCompletion: boolean;
    newBadges: string[];
    scorePercent: number;
  } | null>(null);
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const duelSectionDescription = selectedLesson
    ? copy({
        de: `Von "${selectedLesson.lesson.title}" aus kannst du den Duellstand prüfen, zu den letzten Rivalen zurückkehren und direkt in einen Rückkampf springen.`,
        en: `From "${selectedLesson.lesson.title}", you can check duel standing, return to recent rivals, and jump straight into a rematch.`,
        pl: `Z poziomu "${selectedLesson.lesson.title}" możesz sprawdzić stan pojedynków, wrócić do ostatnich rywali i od razu wejść w rewanż.`,
      })
    : copy({
        de: 'Von hier aus kannst du direkt den Duellstand prüfen, zu den letzten Rivalen zurückkehren oder die Lobby öffnen.',
        en: 'From here, you can immediately check duels, return to recent rivals, or open the lobby.',
        pl: 'Stąd możesz od razu sprawdzić pojedynki, wrócić do ostatnich rywali albo otworzyć lobby.',
      });
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach dem Lesen: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du weitergehst.`,
        en: `Post-reading focus: ${weakestLesson.title} still needs a short review before you move on.`,
        pl: `Fokus po czytaniu: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim przejdziesz dalej.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für eine kurze Auffrischung nach dem Lesen.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short post-reading refresh.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie podtrzymanie po czytaniu.`,
        })
      : null;
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

  const openLessonCatalog = (): void => {
    if (normalizedRouteFocusToken) {
      setDismissedFocusToken(normalizedRouteFocusToken);
    }
    router.replace('/lessons');
  };

  useEffect(() => {
    setActiveSectionIndex(0);
  }, [selectedLesson?.lesson.id]);

  useEffect(() => {
    setSavedLessonCheckpoint(null);
  }, [activeSectionIndex, selectedLesson?.lesson.id]);

  useEffect(() => {
    if (!normalizedRouteFocusToken) {
      setDismissedFocusToken(null);
      return;
    }

    if (dismissedFocusToken && normalizedRouteFocusToken !== dismissedFocusToken) {
      setDismissedFocusToken(null);
    }
  }, [dismissedFocusToken, normalizedRouteFocusToken]);

  const activeSection =
    selectedLessonBody?.sections[Math.min(activeSectionIndex, selectedLessonBody.sections.length - 1)] ??
    null;
  const selectedPracticeHref: Href | null =
    !isPreparingLessonsView && selectedLesson ? selectedLesson.practiceHref : null;
  const selectedLessonPracticeAction =
    selectedPracticeHref && selectedLesson ? (
      <LinkButton
        href={selectedPracticeHref}
        label={copy({
          de: `Training starten: ${selectedLesson.lesson.title}`,
          en: `Start practice: ${selectedLesson.lesson.title}`,
          pl: `Uruchom trening: ${selectedLesson.lesson.title}`,
        })}
        stretch
        style={{ borderRadius: 16 }}
        tone='primary'
        verticalPadding={12}
      />
    ) : null;
  const selectedLessonCheckpoint =
    !isPreparingLessonsView && selectedLesson && selectedLessonBody
      ? (() => {
          const totalSections = Math.max(1, selectedLessonBody.sections.length);
          const completedSections = Math.min(activeSectionIndex + 1, totalSections);

          return {
            completedSections,
            countsAsLessonCompletion:
              completedSections >= selectedLessonBody.sections.length,
            scorePercent: Math.round((completedSections / totalSections) * 100),
            totalSections,
          };
        })()
      : null;
  const lessonsTutorContext: KangurAiTutorConversationContext = selectedLesson
    ? {
        contentId: selectedLesson.lesson.id,
        description: selectedLesson.lesson.description,
        focusId: selectedLessonBody ? 'kangur-lesson-document' : 'kangur-lesson-header',
        focusKind: selectedLessonBody ? 'document' : 'lesson_header',
        focusLabel: activeSection?.title ?? selectedLesson.lesson.title,
        masterySummary: selectedLesson.mastery.summaryLabel,
        surface: 'lesson',
        title: selectedLesson.lesson.title,
      }
    : {
        contentId: 'lesson:list',
        focusId: 'kangur-lessons-library',
        focusKind: 'library',
        focusLabel: focusToken ?? undefined,
        surface: 'lesson',
        title: copy({
          de: 'Lektionen',
          en: 'Lessons',
          pl: 'Lekcje',
        }),
      };

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ gap: 14 }}>
          <LinkButton
            href='/'
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
            stretch
          />

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Lernen und Wiederholen',
                en: 'Learn and review',
                pl: 'Nauka i powtórki',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Lektionen',
                en: 'Lessons',
                pl: 'Lekcje',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {copy({
                de: 'Hier verbindest du den Themenkatalog mit gespeicherten Checkpoints, passendem Training und schnellen Wegen zurück zu Verlauf sowie Tagesplan.',
                en: 'Here you connect the topic catalog with saved checkpoints, matching practice, and quick routes back to history and the daily plan.',
                pl: 'Tutaj połączysz katalog tematów z zapisanymi checkpointami, pasującym treningiem oraz szybkim powrotem do historii i planu dnia.',
              })}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Verfolgt ${lessonMastery.trackedLessons}`,
                  en: `Tracked ${lessonMastery.trackedLessons}`,
                  pl: `Śledzone ${lessonMastery.trackedLessons}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Beherrscht ${lessonMastery.masteredLessons}`,
                  en: `Mastered ${lessonMastery.masteredLessons}`,
                  pl: `Opanowane ${lessonMastery.masteredLessons}`,
                })}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={copy({
                  de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                  en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                  pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
                })}
                tone={{
                  backgroundColor: '#fffbeb',
                  borderColor: '#fde68a',
                  textColor: '#b45309',
                }}
              />
            </View>

            {!isPreparingLessonsView && selectedLesson ? (
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {copy({
                  de: `Aktuell geöffnet: ${selectedLesson.lesson.title}. Du kannst direkt weiterlesen oder in das passende Training springen.`,
                  en: `Currently open: ${selectedLesson.lesson.title}. You can continue reading right away or jump into matching practice.`,
                  pl: `Aktualnie otwarte: ${selectedLesson.lesson.title}. Możesz od razu czytać dalej albo przejść do pasującego treningu.`,
                })}
              </Text>
            ) : !isPreparingLessonsView && focusToken ? (
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {copy({
                  de: `Der Shortcut wollte "${focusToken}" öffnen. Wenn es hier keinen Treffer gibt, kannst du unten direkt in den vollständigen Katalog oder zurück zum Tagesplan gehen.`,
                  en: `The shortcut tried to open "${focusToken}". If there is no match here, you can jump straight into the full catalog below or return to the daily plan.`,
                  pl: `Skrót próbował otworzyć "${focusToken}". Jeśli nie ma tu dopasowania, niżej możesz od razu przejść do pełnego katalogu albo wrócić do planu dnia.`,
                })}
              </Text>
            ) : (
              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {copy({
                  de: 'Öffne ein Thema aus dem Katalog oder kehre über den Tagesplan zu den letzten Wiederholungen zurück.',
                  en: 'Open a topic from the catalog or use the daily plan to return to your latest reviews.',
                  pl: 'Otwórz temat z katalogu albo wróć do ostatnich powtórek przez plan dnia.',
                })}
              </Text>
            )}

            <View style={{ gap: 10 }}>
              {selectedLessonPracticeAction}

              <LinkButton
                href={RESULTS_ROUTE}
                label={copy({
                  de: 'Vollständigen Verlauf öffnen',
                  en: 'Open full history',
                  pl: 'Otwórz pełną historię',
                })}
                stretch
                style={{ borderRadius: 16 }}
                tone='secondary'
                verticalPadding={12}
              />

              <LinkButton
                href={PLAN_ROUTE}
                label={translateKangurMobileActionLabel('Open daily plan', locale)}
                stretch
                style={{ borderRadius: 16 }}
                tone='secondary'
                verticalPadding={12}
              />
            </View>
          </Card>

          <KangurMobileAiTutorCard context={lessonsTutorContext} />

          {isPreparingLessonsView ? (
            <>
              {selectedLesson || focusToken ? <LessonsLoadingDetailCard /> : null}
              <LessonsLoadingCatalogCard />
            </>
          ) : selectedLesson ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Ausgewählte Lektion',
                  en: 'Selected lesson',
                  pl: 'Wybrana lekcja',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
                {selectedLesson.lesson.emoji} {selectedLesson.lesson.title}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {selectedLesson.lesson.description}
              </Text>
          <View style={{ flexDirection: 'column', gap: 8 }}>
                <Pill
                  label={selectedLesson.mastery.statusLabel}
                  tone={getMasteryTone(selectedLesson.mastery.badgeAccent)}
                />
                <Pill
                  label={copy({
                    de: 'Über Shortcut geöffnet',
                    en: 'Opened from shortcut',
                    pl: 'Otwarte ze skrótu',
                  })}
                  tone={{
                    backgroundColor: '#eef2ff',
                    borderColor: '#c7d2fe',
                    textColor: '#4338ca',
                  }}
                />
              </View>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                {selectedLesson.mastery.summaryLabel}
              </Text>
              {selectedLessonBody ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {selectedLessonBody.introduction}
                  </Text>

                    <View style={{ gap: 8 }}>
                      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                        {copy({
                          de: 'Lektionsabschnitte',
                          en: 'Lesson sections',
                          pl: 'Sekcje lekcji',
                        })}
                      </Text>
                    <View style={{ flexDirection: 'column', gap: 8 }}>
                      {selectedLessonBody.sections.map((section, index) => (
                        <FilterChip
                          key={section.id}
                          horizontalPadding={12}
                          idleTextColor='#475569'
                          label={`${index + 1}. ${section.title}`}
                          onPress={() => {
                            setActiveSectionIndex(index);
                          }}
                          selected={index === activeSectionIndex}
                          selectedBackgroundColor='#eff6ff'
                          selectedBorderColor='#1d4ed8'
                          selectedTextColor='#1d4ed8'
                          style={
                            index === activeSectionIndex
                              ? undefined
                              : {
                                  backgroundColor: '#f8fafc',
                                  borderColor: '#e2e8f0',
                                }
                          }
                          textStyle={{ fontSize: 12 }}
                          verticalPadding={8}
                        />
                      ))}
                    </View>
                  </View>

                  {activeSection ? (
                    <InsetPanel gap={10}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                          {copy({
                            de: `Schritt ${activeSectionIndex + 1} von ${selectedLessonBody.sections.length}`,
                            en: `Step ${activeSectionIndex + 1} of ${selectedLessonBody.sections.length}`,
                            pl: `Krok ${activeSectionIndex + 1} z ${selectedLessonBody.sections.length}`,
                          })}
                        </Text>
                        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                          {activeSection.title}
                        </Text>
                      </View>

                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {activeSection.description}
                      </Text>

                      {activeSection.example ? (
                        <InsetPanel
                          gap={6}
                          padding={12}
                          style={{
                            borderRadius: 18,
                            backgroundColor: '#fff7ed',
                            borderColor: '#fdba74',
                          }}
                        >
                          <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '700' }}>
                            {activeSection.example.label}
                          </Text>
                          <Text style={{ color: '#9a3412', fontSize: 20, fontWeight: '800' }}>
                            {activeSection.example.equation}
                          </Text>
                          <Text style={{ color: '#7c2d12', fontSize: 13, lineHeight: 18 }}>
                            {activeSection.example.explanation}
                          </Text>
                        </InsetPanel>
                      ) : null}

                      {activeSection.reminders && activeSection.reminders.length > 0 ? (
                        <View style={{ gap: 6 }}>
                          {activeSection.reminders.map((reminder) => (
                            <Text
                              key={reminder}
                              style={{ color: '#334155', fontSize: 13, lineHeight: 18 }}
                            >
                              - {reminder}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <ActionButton
                          centered
                          disabled={activeSectionIndex === 0}
                          disabledOpacity={1}
                          label={copy({
                            de: 'Zurück',
                            en: 'Previous',
                            pl: 'Poprzednia',
                          })}
                          onPress={() => {
                            setActiveSectionIndex((current) => Math.max(0, current - 1));
                          }}
                          style={{
                            flex: 1,
                            backgroundColor:
                              activeSectionIndex === 0 ? '#e2e8f0' : '#ffffff',
                            borderColor: '#cbd5e1',
                          }}
                          textStyle={{
                            color: activeSectionIndex === 0 ? '#94a3b8' : '#0f172a',
                          }}
                          tone='secondary'
                        />

                        <ActionButton
                          centered
                          disabled={activeSectionIndex >= selectedLessonBody.sections.length - 1}
                          disabledOpacity={1}
                          label={copy({
                            de: 'Weiter',
                            en: 'Next',
                            pl: 'Następna',
                          })}
                          onPress={() => {
                            setActiveSectionIndex((current) =>
                              Math.min(selectedLessonBody.sections.length - 1, current + 1),
                            );
                          }}
                          style={{
                            flex: 1,
                            backgroundColor:
                              activeSectionIndex >= selectedLessonBody.sections.length - 1
                                ? '#e2e8f0'
                                : '#0f172a',
                            borderWidth:
                              activeSectionIndex >= selectedLessonBody.sections.length - 1 ? 1 : 0,
                            borderColor:
                              activeSectionIndex >= selectedLessonBody.sections.length - 1
                                ? '#cbd5e1'
                                : 'transparent',
                          }}
                          textStyle={{
                            color:
                              activeSectionIndex >= selectedLessonBody.sections.length - 1
                                ? '#94a3b8'
                                : '#ffffff',
                          }}
                          tone='primary'
                        />
                      </View>
                    </InsetPanel>
                  ) : null}

                  <InsetPanel
                    gap={6}
                    padding={14}
                    style={{
                      borderRadius: 18,
                      backgroundColor: '#eef2ff',
                      borderColor: '#c7d2fe',
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: 'Wie weiter',
                        en: 'What next',
                        pl: 'Co dalej',
                      })}
                    </Text>
                    <Text style={{ color: '#3730a3', fontSize: 14, lineHeight: 20 }}>
                      {selectedLessonBody.practiceNote}
                    </Text>
                  </InsetPanel>

                  {selectedLessonCheckpoint ? (
                    <InsetPanel
                      gap={10}
                      padding={14}
                      style={{
                        borderRadius: 18,
                        backgroundColor: '#ecfeff',
                        borderColor: '#a5f3fc',
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Text style={{ color: '#155e75', fontSize: 12, fontWeight: '700' }}>
                          {copy({
                            de: 'Lektionsfortschritt',
                            en: 'Lesson progress',
                            pl: 'Postęp lekcji',
                          })}
                        </Text>
                        <Pill
                          label={`${selectedLessonCheckpoint.scorePercent}%`}
                          tone={{
                            backgroundColor: '#ffffff',
                            borderColor: '#67e8f9',
                            textColor: '#155e75',
                          }}
                        />
                      </View>

                      <Text style={{ color: '#0f172a', fontSize: 14, lineHeight: 20 }}>
                        {selectedLessonCheckpoint.countsAsLessonCompletion
                          ? copy({
                              de: `Alle ${selectedLessonCheckpoint.totalSections} Abschnitte sind gelesen. Speichere den Abschluss, damit Profil und Tagesplan diese Lektion sofort sehen.`,
                              en: `All ${selectedLessonCheckpoint.totalSections} sections are read. Save the completion so the profile and daily plan see this lesson immediately.`,
                              pl: `Przeczytano wszystkie ${selectedLessonCheckpoint.totalSections} sekcje. Zapisz ukończenie, aby profil i plan dnia od razu widziały tę lekcję.`,
                            })
                          : copy({
                              de: `${selectedLessonCheckpoint.completedSections} von ${selectedLessonCheckpoint.totalSections} Abschnitten sind gelesen. Speichere einen Checkpoint, damit Profil und Tagesplan diese Wiederholung sofort sehen.`,
                              en: `${selectedLessonCheckpoint.completedSections} of ${selectedLessonCheckpoint.totalSections} sections are read. Save a checkpoint so the profile and daily plan refresh this review.`,
                              pl: `Przeczytano ${selectedLessonCheckpoint.completedSections} z ${selectedLessonCheckpoint.totalSections} sekcji. Zapisz checkpoint, aby profil i plan dnia odświeżyły tę powtórkę.`,
                            })}
                      </Text>

                      {lessonActionError ? (
                        <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                          {lessonActionError}
                        </Text>
                      ) : null}

                      {savedLessonCheckpoint ? (
                        <View style={{ gap: 8 }}>
                          <Text style={{ color: '#0f766e', fontSize: 14, lineHeight: 20 }}>
                            {savedLessonCheckpoint.countsAsLessonCompletion
                              ? copy({
                                  de: `Der Lektionsabschluss wurde mit ${savedLessonCheckpoint.scorePercent}% lokal gespeichert.`,
                                  en: `The lesson completion was saved locally with ${savedLessonCheckpoint.scorePercent}%.`,
                                  pl: `Ukończenie lekcji zapisano lokalnie z wynikiem ${savedLessonCheckpoint.scorePercent}%.`,
                                })
                              : copy({
                                  de: `Der Lektions-Checkpoint wurde mit ${savedLessonCheckpoint.scorePercent}% lokal gespeichert.`,
                                  en: `The lesson checkpoint was saved locally with ${savedLessonCheckpoint.scorePercent}%.`,
                                  pl: `Checkpoint lekcji zapisano lokalnie z wynikiem ${savedLessonCheckpoint.scorePercent}%.`,
                                })}
                          </Text>
                          {savedLessonCheckpoint.newBadges.length > 0 ? (
                            <View style={{ flexDirection: 'column', gap: 8 }}>
                              {savedLessonCheckpoint.newBadges.map((badgeId) => (
                                <Pill
                                  key={badgeId}
                                  label={`${copy({
                                    de: 'Neues Abzeichen',
                                    en: 'New badge',
                                    pl: 'Nowa odznaka',
                                  })}: ${getLocalizedKangurMetadataBadgeName(
                                    badgeId,
                                    locale,
                                    badgeId,
                                  )}`}
                                  tone={{
                                    borderColor: '#c7d2fe',
                                    backgroundColor: '#eef2ff',
                                    textColor: '#4338ca',
                                  }}
                                />
                              ))}
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      <ActionButton
                        centered
                        label={
                          selectedLessonCheckpoint.countsAsLessonCompletion
                            ? copy({
                                de: 'Lektion abschliessen',
                                en: 'Complete lesson',
                                pl: 'Ukończ lekcję',
                              })
                            : copy({
                                de: 'Checkpoint speichern',
                                en: 'Save checkpoint',
                                pl: 'Zapisz checkpoint',
                              })
                        }
                        onPress={() => {
                          if (!selectedLesson) {
                            return;
                          }

                          const savedCheckpoint = saveLessonCheckpoint({
                            countsAsLessonCompletion:
                              selectedLessonCheckpoint.countsAsLessonCompletion,
                            lessonComponentId: selectedLesson.lesson.componentId,
                            scorePercent: selectedLessonCheckpoint.scorePercent,
                          });
                          setSavedLessonCheckpoint(savedCheckpoint);
                        }}
                        stretch
                        style={{ backgroundColor: '#0f766e' }}
                        tone='primary'
                      />
                    </InsetPanel>
                  ) : null}
                </View>
              ) : (
                <InsetPanel gap={10} padding={14} style={{ borderRadius: 18 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({
                      de: 'Lektionsbrief',
                      en: 'Lesson brief',
                      pl: 'Skrót lekcji',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Diese Lektion ist hier vorerst als Kurzbrief verfügbar. Du siehst bereits den Beherrschungsstand, den letzten gespeicherten Stand und den schnellsten Weg zurück ins passende Training.',
                      en: 'This lesson is available here as a short brief for now. You can already see the mastery state, the latest saved checkpoint, and the fastest route back to matching practice.',
                      pl: 'Ta lekcja jest tu na razie dostępna jako krótki skrót. Widzisz już stan opanowania, ostatni zapis oraz najszybszy powrót do pasującego treningu.',
                    })}
                  </Text>

                  {selectedLesson.checkpointSummary ? (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Pill
                          label={copy({
                            de: `Versuche ${selectedLesson.checkpointSummary.attempts}`,
                            en: `Attempts ${selectedLesson.checkpointSummary.attempts}`,
                            pl: `Próby ${selectedLesson.checkpointSummary.attempts}`,
                          })}
                          tone={{
                            backgroundColor: '#f1f5f9',
                            borderColor: '#cbd5e1',
                            textColor: '#475569',
                          }}
                        />
                        <Pill
                          label={copy({
                            de: `Bestes Ergebnis ${selectedLesson.checkpointSummary.bestScorePercent}%`,
                            en: `Best score ${selectedLesson.checkpointSummary.bestScorePercent}%`,
                            pl: `Najlepszy wynik ${selectedLesson.checkpointSummary.bestScorePercent}%`,
                          })}
                          tone={{
                            backgroundColor: '#eef2ff',
                            borderColor: '#c7d2fe',
                            textColor: '#4338ca',
                          }}
                        />
                        <Pill
                          label={copy({
                            de: `Letztes Ergebnis ${selectedLesson.checkpointSummary.lastScorePercent}%`,
                            en: `Last score ${selectedLesson.checkpointSummary.lastScorePercent}%`,
                            pl: `Ostatni wynik ${selectedLesson.checkpointSummary.lastScorePercent}%`,
                          })}
                          tone={{
                            backgroundColor: '#ecfdf5',
                            borderColor: '#a7f3d0',
                            textColor: '#047857',
                          }}
                        />
                      </View>
                      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                        {copy({
                          de: `Zuletzt gespeichert ${formatKangurMobileScoreDateTime(
                            selectedLesson.checkpointSummary.lastCompletedAt,
                            locale,
                          )}`,
                          en: `Last saved ${formatKangurMobileScoreDateTime(
                            selectedLesson.checkpointSummary.lastCompletedAt,
                            locale,
                          )}`,
                          pl: `Ostatni zapis ${formatKangurMobileScoreDateTime(
                            selectedLesson.checkpointSummary.lastCompletedAt,
                            locale,
                          )}`,
                        })}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Es gibt noch keinen gespeicherten Checkpoint für diese Lektion. Nutze das passende Training oder kehre später aus dem Katalog zurück.',
                        en: 'There is no saved checkpoint for this lesson yet. Use the matching practice or return later from the catalog.',
                        pl: 'Nie ma jeszcze zapisanego checkpointu tej lekcji. Skorzystaj z pasującego treningu albo wróć tutaj później z katalogu.',
                      })}
                    </Text>
                  )}
                </InsetPanel>
              )}
              <ActionButton
                label={copy({
                  de: 'Zurück zur Lektionsliste',
                  en: 'Back to lesson list',
                  pl: 'Wróć do listy lekcji',
                })}
                onPress={openLessonCatalog}
                stretch
                tone='primary'
              />
              {selectedPracticeHref ? (
                <LinkButton
                  href={selectedPracticeHref}
                  label={copy({
                    de: 'Training starten',
                    en: 'Start practice',
                    pl: 'Uruchom trening',
                  })}
                  stretch
                  tone='brand'
                />
              ) : null}
            </Card>
          ) : focusToken ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Lektions-Shortcut',
                  en: 'Lesson shortcut',
                  pl: 'Skrót do lekcji',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: `Dieser Shortcut öffnet "${focusToken}" nicht mehr`,
                  en: `This shortcut no longer opens "${focusToken}"`,
                  pl: `Ten skrót nie otwiera już lekcji "${focusToken}"`,
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Der vollständige Themenkatalog bleibt sichtbar, damit du sofort die nächste passende Lektion wählen oder über den Tagesplan weiterlernen kannst.',
                  en: 'The full topic catalog stays visible so you can immediately choose the closest lesson match or continue from the daily plan.',
                  pl: 'Pełny katalog tematów pozostaje widoczny, więc możesz od razu wybrać najbliższą lekcję albo wrócić do nauki przez plan dnia.',
                })}
              </Text>
              <ActionButton
                label={copy({
                  de: 'Vollen Katalog öffnen',
                  en: 'Open full catalog',
                  pl: 'Otwórz pełny katalog',
                })}
                onPress={openLessonCatalog}
                stretch
                tone='primary'
              />
            </Card>
          ) : null}
          <LessonsSecondarySections
            copy={copy}
            duelSectionDescription={duelSectionDescription}
            isPreparingLessonsView={isPreparingLessonsView}
            lessonBadges={lessonBadges}
            lessonCheckpoints={lessonCheckpoints}
            lessonDuels={lessonDuels}
            lessonFocusSummary={lessonFocusSummary}
            lessonMastery={lessonMastery}
            lessonRecentResults={lessonRecentResults}
            lessons={lessons}
            lessonsAssignments={lessonsAssignments}
            locale={locale}
            onOpenCatalogLesson={() => {
              setDismissedFocusToken(null);
            }}
            openDuelSession={openDuelSession}
            profileHref={PROFILE_ROUTE}
            resultsHref={RESULTS_ROUTE}
          />
        </View>
    </KangurMobileScrollScreen>
  );
}
