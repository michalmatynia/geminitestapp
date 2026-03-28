import { getKangurPortableLessonBody } from '@kangur/core/lesson-content';
import { getLocalizedKangurMetadataBadgeName } from '@kangur/core/progress-i18n';
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

const PROFILE_ROUTE = '/profile' as const;
const PLAN_ROUTE = '/plan' as const;
const RESULTS_ROUTE = createKangurResultsHref();

function LessonsLoadingDetailCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionen werden geladen',
          en: 'Loading lessons',
          pl: 'Ładowanie lekcji',
        })}
      </Text>
      <SkeletonBlock height={28} width='68%' radius={16} />
      <SkeletonBlock height={18} width='100%' />
      <SkeletonBlock height={18} width='92%' />
      <View style={{ flexDirection: 'column', gap: 8 }}>
        <SkeletonBlock height={34} width={132} radius={999} />
        <SkeletonBlock height={34} width={144} radius={999} />
      </View>
      <InsetPanel gap={10}>
        <SkeletonBlock height={18} width='40%' />
        <SkeletonBlock height={22} width='62%' />
        <SkeletonBlock height={16} width='100%' />
        <SkeletonBlock height={16} width='88%' />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock height={34} width={104} radius={999} />
          <SkeletonBlock height={34} width={96} radius={999} />
          <SkeletonBlock height={34} width={114} radius={999} />
        </View>
      </InsetPanel>
      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
        {copy({
          de: 'Die Lektion und ihre Abschnitte werden vorbereitet.',
          en: 'Preparing the lesson and its reading sections.',
          pl: 'Przygotowujemy lekcję i sekcje do czytania.',
        })}
      </Text>
    </Card>
  );
}

function LessonsLoadingCatalogCard(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();

  return (
    <Card>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
        {copy({
          de: 'Lektionskatalog',
          en: 'Lesson catalog',
          pl: 'Katalog lekcji',
        })}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Die Themenliste und der Beherrschungsstand werden geladen.',
          en: 'Loading the topic list and mastery state.',
          pl: 'Wczytujemy listę tematów i stan opanowania.',
        })}
      </Text>

      <View style={{ gap: 12 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`lessons-skeleton-row-${index}`}
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              backgroundColor: '#f8fafc',
              padding: 16,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBlock height={22} width='64%' radius={14} />
                <SkeletonBlock height={16} width='100%' />
                <SkeletonBlock height={16} width='84%' />
              </View>
              <SkeletonBlock height={32} width={110} radius={999} />
            </View>

            <SkeletonBlock height={14} width='58%' />
          </View>
        ))}
      </View>
    </Card>
  );
}

function renderLessonPracticeLink({
  href,
  label,
  fullWidth = false,
}: {
  href: Href | null;
  label: string;
  fullWidth?: boolean;
}): React.JSX.Element | null {
  if (!href) {
    return null;
  }

  return (
    <LinkButton
      href={href}
      label={label}
      stretch={fullWidth}
      style={fullWidth ? undefined : { paddingHorizontal: 12 }}
      tone='secondary'
      verticalPadding={fullWidth ? 10 : 9}
    />
  );
}

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  return (
    <InsetPanel gap={10}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {item.emoji} {item.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
              en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
              pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
            })}
          </Text>
        </View>
        <Pill
          label={`${item.bestScorePercent}%`}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: 'Zuletzt gespeichert',
          en: 'Last saved',
          pl: 'Ostatni zapis',
        })}{' '}
        {new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.lastCompletedAt))}
      </Text>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton
          href={item.lessonHref}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
          stretch
          tone='primary'
        />
        {renderLessonPracticeLink({
          href: item.practiceHref,
          label: `${copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          })}: ${item.title}`,
          fullWidth: true,
        })}
      </View>
    </InsetPanel>
  );
}

function LessonsAssignmentRow({
  item,
}: {
  item: KangurMobileLessonsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone =
    item.assignment.priority === 'high'
      ? {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#b91c1c',
        }
      : item.assignment.priority === 'medium'
        ? {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }
        : {
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          };
  const actionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  let assignmentAction = (
    <MutedActionChip
      label={`${actionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  if (item.href) {
    assignmentAction = (
      <LinkButton href={item.href} label={actionLabel} stretch tone='primary' />
    );
  }

  return (
    <InsetPanel gap={8}>
      <Pill
        label={copy({
          de:
            item.assignment.priority === 'high'
              ? 'Hohe Priorität'
              : item.assignment.priority === 'medium'
                ? 'Mittlere Priorität'
                : 'Niedrige Priorität',
          en:
            item.assignment.priority === 'high'
              ? 'High priority'
              : item.assignment.priority === 'medium'
                ? 'Medium priority'
                : 'Low priority',
          pl:
            item.assignment.priority === 'high'
              ? 'Priorytet wysoki'
              : item.assignment.priority === 'medium'
                ? 'Priorytet średni'
                : 'Priorytet niski',
        })}
        tone={priorityTone}
      />
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}

const getMasteryTone = (badgeAccent: string): Tone => {
  if (badgeAccent === 'emerald') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (badgeAccent === 'amber') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  if (badgeAccent === 'rose') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }

  return {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    textColor: '#64748b',
  };
};

const getLessonMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }

  if (masteryPercent >= 70) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }

  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileLessonsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastAttemptLabel = insight.lastCompletedAt
    ? new Intl.DateTimeFormat(getKangurMobileLocaleTag(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(insight.lastCompletedAt))
    : copy({
        de: 'kein Datum',
        en: 'no date',
        pl: 'brak daty',
      });

  return (
    <InsetPanel gap={10}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {insight.emoji} {insight.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
              pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'column', gap: 8 }}>
        <LinkButton
          href={insight.lessonHref}
          label={copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}
          stretch
          tone='primary'
        />
        {renderLessonPracticeLink({
          href: insight.practiceHref,
          label: copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          }),
          fullWidth: true,
        })}
      </View>
    </InsetPanel>
  );
}

function LessonBadgeChip({
  item,
}: {
  item: KangurMobileLessonsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      }}
    />
  );
}

function LessonRecentResultRow({
  item,
}: {
  item: KangurMobileLessonsRecentResultItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(item.result);
  let lessonAction = null;

  if (item.lessonHref) {
    lessonAction = (
      <LinkButton
        href={item.lessonHref}
        label={copy({
          de: 'Lektion öffnen',
          en: 'Open lesson',
          pl: 'Otwórz lekcję',
        })}
        tone='secondary'
      />
    );
  }

  return (
    <InsetPanel gap={8}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {formatKangurMobileScoreOperation(item.result.operation, locale)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(item.result.created_date, locale)}
          </Text>
        </View>
        <Pill
          label={`${item.result.correct_answers}/${item.result.total_questions}`}
          tone={{
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            textColor: '#047857',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${accuracyPercent}%`,
            en: `Accuracy ${accuracyPercent}%`,
            pl: `Skuteczność ${accuracyPercent}%`,
          })}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={item.practiceHref}
          label={copy({
            de: 'Erneut trainieren',
            en: 'Train again',
            pl: 'Trenuj ponownie',
          })}
          tone='primary'
        />

        {lessonAction}

        <LinkButton
          href={item.historyHref}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
          tone='secondary'
        />
      </View>
    </InsetPanel>
  );
}

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

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Nach den Lektionen',
                  en: 'After lessons',
                  pl: 'Po lekcjach',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Ergebniszentrale',
                  en: 'Results hub',
                  pl: 'Centrum wyników',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
                  en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
                  pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
                })}
              </Text>

              <LinkButton
                href={RESULTS_ROUTE}
                label={copy({
                  de: 'Vollständigen Verlauf öffnen',
                  en: 'Open full history',
                  pl: 'Otwórz pełną historię',
                })}
                tone='secondary'
              />

              {lessonRecentResults.isLoading || lessonRecentResults.isRestoringAuth ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Die letzten Ergebnisse werden geladen.',
                    en: 'Loading recent results.',
                    pl: 'Ładujemy ostatnie wyniki.',
                  })}
                </Text>
              ) : !lessonRecentResults.isEnabled ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Melde dich an, um hier Ergebnisse zu sehen.',
                    en: 'Sign in to see results here.',
                    pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
                  })}
                </Text>
              ) : lessonRecentResults.error ? (
                <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                  {lessonRecentResults.error}
                </Text>
              ) : lessonRecentResults.recentResultItems.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt hier noch keine Ergebnisse. Beende einen Lauf, um diesen Bereich zu füllen.',
                    en: 'There are no results here yet. Finish a run to fill this section.',
                    pl: 'Nie ma tu jeszcze wyników. Ukończ serię, aby wypełnić tę sekcję.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {lessonRecentResults.recentResultItems.map((item) => (
                    <LessonRecentResultRow key={item.result.id} item={item} />
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Abzeichen',
                  en: 'Badges',
                  pl: 'Odznaki',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Abzeichen-Zentrale',
                  en: 'Badge hub',
                  pl: 'Centrum odznak',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                  en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
                  pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
                })}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={copy({
                    de: `Freigeschaltet ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
                    en: `Unlocked ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
                    pl: `Odblokowane ${lessonBadges.unlockedBadges}/${lessonBadges.totalBadges}`,
                  })}
                  tone={{
                    backgroundColor: '#eef2ff',
                    borderColor: '#c7d2fe',
                    textColor: '#4338ca',
                  }}
                />
                <Pill
                  label={copy({
                    de: `Offen ${lessonBadges.remainingBadges}`,
                    en: `Remaining ${lessonBadges.remainingBadges}`,
                    pl: `Do zdobycia ${lessonBadges.remainingBadges}`,
                  })}
                  tone={{
                    backgroundColor: '#fffbeb',
                    borderColor: '#fde68a',
                    textColor: '#b45309',
                  }}
                />
              </View>

              {lessonBadges.recentBadges.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                    en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                    pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {copy({
                      de: 'Zuletzt freigeschaltet',
                      en: 'Recently unlocked',
                      pl: 'Ostatnio odblokowane',
                    })}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {lessonBadges.recentBadges.map((item) => (
                      <LessonBadgeChip key={item.id} item={item} />
                    ))}
                  </View>
                </View>
              )}

              <LinkButton
                href={PROFILE_ROUTE}
                label={copy({
                  de: 'Profil und Abzeichen öffnen',
                  en: 'Open profile and badges',
                  pl: 'Otwórz profil i odznaki',
                })}
                tone='secondary'
              />
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Lektionsbeherrschung',
                  en: 'Lesson mastery',
                  pl: 'Opanowanie lekcji',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Lektionsplan nach dem Lesen',
                  en: 'Post-reading lesson plan',
                  pl: 'Plan lekcji po czytaniu',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Verbinde den Katalog und die letzten Checkpoints direkt mit lokal gespeichertem Beherrschungsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
                  en: 'Connect the catalog and recent checkpoints directly with saved mastery and decide right away what needs review and what only needs maintaining.',
                  pl: 'Na ekranie lekcji możesz od razu połączyć katalog i ostatnie checkpointy z lokalnie zapisanym poziomem opanowania, aby szybciej wybrać powtórkę.',
                })}
              </Text>

              <View style={{ flexDirection: 'column', gap: 8 }}>
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

              {lessonMastery.trackedLessons === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                    en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                    pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {lessonFocusSummary ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {lessonFocusSummary}
                    </Text>
                  ) : null}

                  <View style={{ alignSelf: 'stretch', gap: 10 }}>
                    {weakestLesson ? (
                      <LinkButton
                        href={weakestLesson.lessonHref}
                        label={copy({
                          de: `Fokus: ${weakestLesson.title}`,
                          en: `Focus: ${weakestLesson.title}`,
                          pl: `Skup się: ${weakestLesson.title}`,
                        })}
                        stretch
                        tone='primary'
                      />
                    ) : null}
                    {strongestLesson ? (
                      <LinkButton
                        href={strongestLesson.lessonHref}
                        label={copy({
                          de: `Stärke halten: ${strongestLesson.title}`,
                          en: `Maintain strength: ${strongestLesson.title}`,
                          pl: `Podtrzymaj: ${strongestLesson.title}`,
                        })}
                        stretch
                        tone='secondary'
                      />
                    ) : null}
                  </View>

                  {lessonMastery.weakest[0] ? (
                    <LessonMasteryRow
                      insight={lessonMastery.weakest[0]}
                      title={copy({
                        de: 'Zum Wiederholen',
                        en: 'Needs review',
                        pl: 'Do powtórki',
                      })}
                    />
                  ) : null}
                  {lessonMastery.strongest[0] ? (
                    <LessonMasteryRow
                      insight={lessonMastery.strongest[0]}
                      title={copy({
                        de: 'Stärkste Lektion',
                        en: 'Strongest lesson',
                        pl: 'Najmocniejsza lekcja',
                      })}
                    />
                  ) : null}
                </View>
              )}
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Letzte Lektions-Checkpoints',
                  en: 'Recent lesson checkpoints',
                  pl: 'Ostatnie checkpointy lekcji',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Weiter mit Lektionen',
                  en: 'Continue with lessons',
                  pl: 'Kontynuuj lekcje',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die zuletzt lokal gespeicherten Lektionen bleiben hier griffbereit, damit du direkt in das naechste Lesen oder passende Training wechseln kannst.',
                  en: 'The most recently saved lessons stay visible here so you can jump straight into the next reading block or matching practice.',
                  pl: 'Ostatnio zapisane lekcje są tutaj pod ręką, aby można było od razu przejść do kolejnego czytania albo pasującego treningu.',
                })}
              </Text>

              {lessonCheckpoints.recentCheckpoints.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt noch keine gespeicherten Checkpoints. Oeffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
                    en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
                    pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {lessonCheckpoints.recentCheckpoints.map((item) => (
                    <LessonCheckpointRow key={item.componentId} item={item} />
                  ))}
                  <LinkButton
                    href='/lessons'
                    label={copy({
                      de: 'Lektionen öffnen',
                      en: 'Open lessons',
                      pl: 'Otwórz lekcje',
                    })}
                    stretch
                    tone='secondary'
                  />
                </View>
              )}
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Nach den Lektionen',
                  en: 'After lessons',
                  pl: 'Po lekcjach',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Plan nach den Lektionen',
                  en: 'Post-lesson plan',
                  pl: 'Plan po lekcjach',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Wandle das Lesen der Lektionen direkt in die nächsten Schritte um, ohne den Lernfluss zu verlieren.',
                  en: 'Turn lesson reading directly into the next steps without losing the study flow.',
                  pl: 'Zamień czytanie lekcji od razu w kolejne kroki, bez gubienia rytmu nauki.',
                })}
              </Text>

              {lessonsAssignments.assignmentItems.length === 0 ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Es gibt noch keine nächsten Schritte. Öffne weitere Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                    en: 'There are no next steps yet. Open more lessons or complete more practice to build the next plan.',
                    pl: 'Nie ma jeszcze kolejnych kroków. Otwórz kolejne lekcje albo wykonaj więcej treningów, aby zbudować następny plan.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {lessonsAssignments.assignmentItems.map((item) => (
                    <LessonsAssignmentRow key={item.assignment.id} item={item} />
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Nach der Lektion',
                  en: 'After the lesson',
                  pl: 'Po lekcji',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Schneller Rückweg zu Rivalen',
                  en: 'Quick return to rivals',
                  pl: 'Szybki powrót do rywali',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {duelSectionDescription}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={copy({
                    de: `Rivalen ${lessonDuels.opponents.length}`,
                    en: `Rivals ${lessonDuels.opponents.length}`,
                    pl: `Rywale ${lessonDuels.opponents.length}`,
                  })}
                  tone={{
                    backgroundColor: '#eef2ff',
                    borderColor: '#c7d2fe',
                    textColor: '#4338ca',
                  }}
                />
                <Pill
                  label={
                    lessonDuels.currentRank
                      ? copy({
                          de: `Deine Position #${lessonDuels.currentRank}`,
                          en: `Your rank #${lessonDuels.currentRank}`,
                          pl: `Twoja pozycja #${lessonDuels.currentRank}`,
                        })
                      : copy({
                          de: 'Wartet auf Sichtbarkeit',
                          en: 'Waiting for visibility',
                          pl: 'Czeka na widoczność',
                        })
                  }
                  tone={{
                    backgroundColor: '#ecfdf5',
                    borderColor: '#a7f3d0',
                    textColor: '#047857',
                  }}
                />
              </View>

              {lessonDuels.isRestoringAuth || lessonDuels.isLoading ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Der Duellstand nach der Lektion wird geladen.',
                    en: 'Loading the post-lesson duel standing.',
                    pl: 'Pobieramy stan pojedynków po lekcji.',
                  })}
                </Text>
              ) : lessonDuels.error ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {lessonDuels.error}
                  </Text>
                  <ActionButton
                    label={copy({
                      de: 'Duelle aktualisieren',
                      en: 'Refresh duels',
                      pl: 'Odśwież pojedynki',
                    })}
                    onPress={() => lessonDuels.refresh()}
                    stretch
                    tone='primary'
                  />
                </View>
              ) : !lessonDuels.isAuthenticated ? (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.',
                    en: 'Sign in to see duel standing, recent rivals, and quick rematches here.',
                    pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
                  })}
                </Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {lessonDuels.currentEntry ? (
                    <InsetPanel
                      gap={8}
                      style={{
                        borderColor: '#bfdbfe',
                        backgroundColor: '#eff6ff',
                      }}
                    >
                      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                        {copy({
                          de: 'DEIN DUELLSTAND',
                          en: 'YOUR DUEL SNAPSHOT',
                          pl: 'TWÓJ WYNIK W POJEDYNKACH',
                        })}
                      </Text>
                      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                        #{lessonDuels.currentRank} {lessonDuels.currentEntry.displayName}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {copy({
                          de: `Siege ${lessonDuels.currentEntry.wins} • Niederlagen ${lessonDuels.currentEntry.losses} • Unentschieden ${lessonDuels.currentEntry.ties}`,
                          en: `Wins ${lessonDuels.currentEntry.wins} • Losses ${lessonDuels.currentEntry.losses} • Ties ${lessonDuels.currentEntry.ties}`,
                          pl: `Wygrane ${lessonDuels.currentEntry.wins} • Porażki ${lessonDuels.currentEntry.losses} • Remisy ${lessonDuels.currentEntry.ties}`,
                        })}
                      </Text>
                    </InsetPanel>
                  ) : (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                        en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                        pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                      })}
                    </Text>
                  )}

                  {lessonDuels.actionError ? (
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {lessonDuels.actionError}
                    </Text>
                  ) : null}

                  {lessonDuels.opponents.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.',
                        en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                        pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
                      })}
                    </Text>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {lessonDuels.opponents.map((opponent) => (
                        <InsetPanel
                          key={opponent.learnerId}
                          gap={8}
                        >
                          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                            {opponent.displayName}
                          </Text>
                          <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                            {copy({
                              de: `Letztes Duell ${new Intl.DateTimeFormat(locale, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(opponent.lastPlayedAt))}`,
                              en: `Last duel ${new Intl.DateTimeFormat(locale, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(opponent.lastPlayedAt))}`,
                              pl: `Ostatni pojedynek ${new Intl.DateTimeFormat(locale, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(opponent.lastPlayedAt))}`,
                            })}
                          </Text>
                          <KangurMobilePendingActionButton
                            horizontalPadding={14}
                            label={copy({
                              de: 'Schneller Rückkampf',
                              en: 'Quick rematch',
                              pl: 'Szybki rewanż',
                            })}
                            stretch
                            onPress={() => {
                              void lessonDuels.createRematch(opponent.learnerId).then((sessionId) => {
                                if (sessionId) {
                                  openDuelSession(sessionId);
                                }
                              });
                            }}
                            pending={lessonDuels.pendingOpponentLearnerId === opponent.learnerId}
                            pendingLabel={copy({
                              de: 'Rückkampf wird gesendet...',
                              en: 'Sending rematch...',
                              pl: 'Wysyłanie rewanżu...',
                            })}
                          />
                        </InsetPanel>
                      ))}
                    </View>
                  )}

                  <View style={{ alignSelf: 'stretch', gap: 10 }}>
                    <ActionButton
                      label={copy({
                        de: 'Duelle aktualisieren',
                        en: 'Refresh duels',
                        pl: 'Odśwież pojedynki',
                      })}
                      onPress={() => lessonDuels.refresh()}
                      stretch
                      tone='secondary'
                    />

                    <LinkButton
                      href={createKangurDuelsHref()}
                      label={copy({
                        de: 'Duelle öffnen',
                        en: 'Open duels',
                        pl: 'Otwórz pojedynki',
                      })}
                      stretch
                      tone='secondary'
                    />
                  </View>
                </View>
              )}
            </Card>
          ) : null}

          {!isPreparingLessonsView ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Lektionskatalog',
                  en: 'Lesson catalog',
                  pl: 'Katalog lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Beginne mit neuen Themen oder kehre zu Bereichen zurück, die Wiederholung brauchen.',
                  en: 'Start with new topics or return to the areas that need review.',
                  pl: 'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
                })}
              </Text>

              <View style={{ gap: 12 }}>
                {lessons.map((item) => {
                  const masteryTone = getMasteryTone(item.mastery.badgeAccent);
                  const href: Href = {
                    pathname: '/lessons',
                    params: {
                      focus: item.lesson.componentId,
                    },
                  };

                  return (
                    <InsetPanel
                      key={item.lesson.id}
                      gap={10}
                      padding={16}
                      style={{
                        borderRadius: 22,
                        borderColor: item.isFocused ? '#1d4ed8' : '#e2e8f0',
                        backgroundColor: item.isFocused ? '#eff6ff' : '#f8fafc',
                      }}
                    >
                      <Link href={href} asChild>
                        <Pressable
                          accessibilityRole='button'
                          onPress={() => {
                            setDismissedFocusToken(null);
                          }}
                          style={{
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 12,
                            }}
                          >
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                                {item.lesson.emoji} {item.lesson.title}
                              </Text>
                              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                                {item.lesson.description}
                              </Text>
                            </View>
                            <Pill label={item.mastery.statusLabel} tone={masteryTone} />
                          </View>

                          <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                            {item.mastery.summaryLabel}
                          </Text>

                          {item.checkpointSummary ? (
                            <InsetPanel
                              gap={6}
                              padding={12}
                              style={{
                                borderRadius: 18,
                                borderColor: '#bfdbfe',
                                backgroundColor: '#eff6ff',
                              }}
                            >
                              <Text
                                style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '700' }}
                              >
                                {copy({
                                  de: 'Letzter Checkpoint',
                                  en: 'Latest checkpoint',
                                  pl: 'Ostatni checkpoint',
                                })}
                              </Text>
                              <Text style={{ color: '#0f172a', fontSize: 13, lineHeight: 18 }}>
                                {copy({
                                  de: `Zuletzt gespeichert ${new Intl.DateTimeFormat(
                                    getKangurMobileLocaleTag(locale),
                                    {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    },
                                  ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                  en: `Last saved ${new Intl.DateTimeFormat(
                                    getKangurMobileLocaleTag(locale),
                                    {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    },
                                  ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                  pl: `Ostatni zapis ${new Intl.DateTimeFormat(
                                    getKangurMobileLocaleTag(locale),
                                    {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    },
                                  ).format(new Date(item.checkpointSummary.lastCompletedAt))}`,
                                })}
                              </Text>
                              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                                {copy({
                                  de: `Ergebnis ${item.checkpointSummary.lastScorePercent}% • bestes ${item.checkpointSummary.bestScorePercent}%`,
                                  en: `Score ${item.checkpointSummary.lastScorePercent}% • best ${item.checkpointSummary.bestScorePercent}%`,
                                  pl: `Wynik ${item.checkpointSummary.lastScorePercent}% • najlepszy ${item.checkpointSummary.bestScorePercent}%`,
                                })}
                              </Text>
                            </InsetPanel>
                          ) : null}
                        </Pressable>
                      </Link>

                      <View style={{ flexDirection: 'column', gap: 8 }}>
                        <LinkButton
                          href={href}
                          label={`${copy({
                            de: 'Lektion öffnen',
                            en: 'Open lesson',
                            pl: 'Otwórz lekcję',
                          })}: ${item.lesson.title}`}
                          onPress={() => {
                            setDismissedFocusToken(null);
                          }}
                          stretch
                          textStyle={{ textAlign: 'left' }}
                          tone='primary'
                        />
                        {renderLessonPracticeLink({
                          href: item.practiceHref,
                          label: `${copy({
                            de: 'Training starten',
                            en: 'Start practice',
                            pl: 'Uruchom trening',
                          })}: ${item.lesson.title}`,
                          fullWidth: true,
                        })}
                      </View>
                    </InsetPanel>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </View>
    </KangurMobileScrollScreen>
  );
}
