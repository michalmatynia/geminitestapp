import { useLocale, useTranslations } from 'next-intl';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  translateRecommendationWithFallback,
  type RecommendationTranslate,
} from '@/features/kangur/ui/services/recommendation-i18n';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getNextLockedBadge,
  getProgressAverageXpPerSession,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurLessonSubject } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurGameSetupMomentumCardProps = {
  mode: 'training' | 'kangur';
  progress: KangurProgressState;
};

type KangurGameSetupFocus = {
  accent: KangurAccent;
  description: string;
  label: string;
  title: string;
};

type KangurSetupMomentumFallbackCopy = {
  quest: {
    label: string;
    titleCompleted: string;
    titleKangur: string;
    titleTraining: string;
  };
  guided: {
    descriptionKangur: (badge: string, summary: string) => string;
    descriptionTraining: (badge: string, summary: string) => string;
    label: string;
    titleKangur: string;
    titleTraining: string;
  };
  nextBadge: {
    descriptionKangur: (badge: string, summary: string) => string;
    descriptionTraining: (badge: string, summary: string) => string;
    label: string;
    titleKangur: string;
    titleTraining: string;
  };
  streak: {
    descriptionContinue: (streak: number) => string;
    descriptionStart: string;
    label: string;
    titleContinue: string;
    titleStart: string;
  };
  pace: {
    description: (averageXpPerSession: number) => string;
    label: string;
    titleKangur: string;
    titleTraining: string;
  };
  chips: {
    pace: (averageXpPerSession: number) => string;
    streak: (streak: number) => string;
  };
};

const getSetupMomentumFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurSetupMomentumFallbackCopy => {
  if (locale === 'uk') {
    return {
      quest: {
        label: 'Місія дня',
        titleCompleted: 'Місію дня можна забрати',
        titleKangur: 'Цей раунд може завершити місію дня',
        titleTraining: 'Ця сесія просуває місію дня',
      },
      guided: {
        descriptionKangur: (badge, summary) =>
          `Цей раунд просуває рекомендований шлях до значка ${badge}. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `Ця сесія просуває рекомендований шлях до значка ${badge}. ${summary}.`,
        label: 'Рекомендований шлях',
        titleKangur: 'Грай у рекомендованому ритмі',
        titleTraining: 'Заверши рекомендований шлях',
      },
      nextBadge: {
        descriptionKangur: (badge, summary) =>
          `Сильний результат у цьому раунді наблизить значок ${badge}. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `Ця сесія просуває значок ${badge}. ${summary}.`,
        label: 'Наступний значок',
        titleKangur: 'Грай заради наступного етапу',
        titleTraining: 'Набери темп до наступної нагороди',
      },
      streak: {
        descriptionContinue: (streak) =>
          `Твоя серія ${streak}. Ще один сильний раунд закріпить ритм дня.`,
        descriptionStart:
          'Одна хороша сесія сьогодні запустить нову серію й підніме темп навчання.',
        label: 'Серія',
        titleContinue: 'Закрий наступний крок серії',
        titleStart: 'Віднови ритм',
      },
      pace: {
        description: (averageXpPerSession) =>
          `Твій поточний темп становить ${averageXpPerSession} XP за гру. Ця сесія допоможе зберегти хороший хід.`,
        label: 'Темп',
        titleKangur: 'Увійди з хорошим темпом',
        titleTraining: 'Тримай сильний темп',
      },
      chips: {
        pace: (averageXpPerSession) => `Темп: ${averageXpPerSession} XP / гру`,
        streak: (streak) => `Серія: ${streak}`,
      },
    };
  }

  if (locale === 'de') {
    return {
      quest: {
        label: 'Mission des Tages',
        titleCompleted: 'Die Tagesmission wartet auf die Belohnung',
        titleKangur: 'Diese Runde kann die Tagesmission abschliessen',
        titleTraining: 'Diese Sitzung bringt die Tagesmission voran',
      },
      guided: {
        descriptionKangur: (badge, summary) =>
          `Diese Runde schiebt den empfohlenen Pfad in Richtung des Abzeichens ${badge}. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `Diese Sitzung schiebt den empfohlenen Pfad in Richtung des Abzeichens ${badge}. ${summary}.`,
        label: 'Empfohlener Pfad',
        titleKangur: 'Spiele im empfohlenen Rhythmus',
        titleTraining: 'Schliesse den empfohlenen Pfad ab',
      },
      nextBadge: {
        descriptionKangur: (badge, summary) =>
          `Ein starkes Ergebnis in dieser Runde bringt das Abzeichen ${badge} naher. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `Diese Sitzung schiebt das Abzeichen ${badge} voran. ${summary}.`,
        label: 'Nachstes Abzeichen',
        titleKangur: 'Spiele fur den nachsten Meilenstein',
        titleTraining: 'Baue Schwung fur die nachste Belohnung auf',
      },
      streak: {
        descriptionContinue: (streak) =>
          `Deine Serie steht bei ${streak}. Noch eine starke Runde festigt den Rhythmus des Tages.`,
        descriptionStart:
          'Eine gute Sitzung heute startet eine neue Serie und hebt das Lerntempo.',
        label: 'Serie',
        titleContinue: 'Schliesse den nachsten Serienschritt ab',
        titleStart: 'Baue den Rhythmus neu auf',
      },
      pace: {
        description: (averageXpPerSession) =>
          `Dein aktuelles Tempo liegt bei ${averageXpPerSession} XP pro Spiel. Diese Sitzung hilft, den Schwung zu halten.`,
        label: 'Tempo',
        titleKangur: 'Starte mit gutem Tempo',
        titleTraining: 'Halte das starke Tempo',
      },
      chips: {
        pace: (averageXpPerSession) => `Tempo: ${averageXpPerSession} XP / Spiel`,
        streak: (streak) => `Serie: ${streak}`,
      },
    };
  }

  if (locale === 'en') {
    return {
      quest: {
        label: 'Mission of the day',
        titleCompleted: 'Today\'s mission is ready to claim',
        titleKangur: 'This round can finish today\'s mission',
        titleTraining: 'This session advances today\'s mission',
      },
      guided: {
        descriptionKangur: (badge, summary) =>
          `This round pushes the recommended path toward the ${badge} badge. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `This session pushes the recommended path toward the ${badge} badge. ${summary}.`,
        label: 'Recommended path',
        titleKangur: 'Play in the recommended rhythm',
        titleTraining: 'Finish the recommended path',
      },
      nextBadge: {
        descriptionKangur: (badge, summary) =>
          `A strong result in this round moves the ${badge} badge closer. ${summary}.`,
        descriptionTraining: (badge, summary) =>
          `This session pushes the ${badge} badge forward. ${summary}.`,
        label: 'Next badge',
        titleKangur: 'Play for the next milestone',
        titleTraining: 'Build momentum toward the next reward',
      },
      streak: {
        descriptionContinue: (streak) =>
          `Your streak is ${streak}. One more strong round will lock in today's rhythm.`,
        descriptionStart:
          'One good session today will start a new streak and lift the learning pace.',
        label: 'Streak',
        titleContinue: 'Close the next streak step',
        titleStart: 'Rebuild the rhythm',
      },
      pace: {
        description: (averageXpPerSession) =>
          `Your current pace is ${averageXpPerSession} XP per game. This session will help keep that momentum.`,
        label: 'Pace',
        titleKangur: 'Enter with good pace',
        titleTraining: 'Keep the strong pace',
      },
      chips: {
        pace: (averageXpPerSession) => `Pace: ${averageXpPerSession} XP / game`,
        streak: (streak) => `Streak: ${streak}`,
      },
    };
  }

  return {
    quest: {
      label: 'Misja dnia',
      titleCompleted: 'Misja dnia czeka na odbiór',
      titleKangur: 'Ta runda może domknąć misję dnia',
      titleTraining: 'Ta sesja przybliża misję dnia',
    },
    guided: {
      descriptionKangur: (badge, summary) =>
        `Ta runda domyka polecany kierunek. Do odznaki ${badge} brakuje: ${summary}.`,
      descriptionTraining: (badge, summary) =>
        `Ta sesja pcha polecany kierunek do odznaki ${badge}. ${summary}.`,
      label: 'Polecony kierunek',
      titleKangur: 'Zagraj zgodnie z rytmem',
      titleTraining: 'Dopnij polecany kierunek',
    },
    nextBadge: {
      descriptionKangur: (badge, summary) =>
        `Mocny wynik w tej rundzie przybliża odznakę ${badge}. ${summary}.`,
      descriptionTraining: (badge, summary) =>
        `Ta sesja pcha odznakę ${badge}. ${summary}.`,
      label: 'Następna odznaka',
      titleKangur: 'Zagraj o kolejny próg',
      titleTraining: 'Rozpędź kolejną nagrodę',
    },
    streak: {
      descriptionContinue: (streak) =>
        `Masz serię ${streak}. Jeszcze jedna mocna runda utrwali rytm dnia.`,
      descriptionStart:
        'Jedna dobra sesja dzisiaj uruchomi nową serię i podbije tempo nauki.',
      label: 'Seria',
      titleContinue: 'Domknij kolejny krok serii',
      titleStart: 'Zbuduj rytm od nowa',
    },
    pace: {
      description: (averageXpPerSession) =>
        `Twoje aktualne tempo to ${averageXpPerSession} XP na grę. Ta sesja pomoże utrzymać dobrą passę.`,
      label: 'Tempo',
      titleKangur: 'Wejdź z dobrym tempem',
      titleTraining: 'Utrzymaj mocne tempo',
    },
    chips: {
      pace: (averageXpPerSession) => `Tempo: ${averageXpPerSession} XP / grę`,
      streak: (streak) => `Seria: ${streak}`,
    },
  };
};

const getSetupFocus = (
  mode: 'training' | 'kangur',
  progress: KangurProgressState,
  locale: string,
  subject: KangurLessonSubject,
  ownerKey: string | null,
  fallbackCopy: KangurSetupMomentumFallbackCopy,
  translate?: RecommendationTranslate,
  progressTranslate?: KangurProgressTranslate
): KangurGameSetupFocus | null => {
  const quest = getCurrentKangurDailyQuest(progress, {
    locale,
    ownerKey,
    subject,
    translate: progressTranslate,
  });
  const nextBadge = getNextLockedBadge(progress, { translate: progressTranslate });
  const guidedMomentum = getRecommendedSessionMomentum(progress, { translate: progressTranslate });
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const streak = progress.currentWinStreak ?? 0;
  const gamesPlayed = progress.gamesPlayed ?? 0;

  if (
    quest &&
    quest.reward?.status !== 'claimed' &&
    quest.assignment.questMetric?.kind === 'games_played'
  ) {
    const rewardLabel = quest.reward?.label;
    const title =
      quest.progress.status === 'completed'
        ? translateRecommendationWithFallback(
            translate,
            'setupMomentum.quest.titleCompleted',
            fallbackCopy.quest.titleCompleted
          )
        : mode === 'training'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.quest.titleTraining',
              fallbackCopy.quest.titleTraining
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.quest.titleKangur',
              fallbackCopy.quest.titleKangur
            );

    return {
      accent: 'emerald',
      description: [
        quest.assignment.title,
        quest.progress.summary,
        rewardLabel ? `${rewardLabel}` : null,
      ]
        .filter(Boolean)
        .join('. ') + '.',
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.quest.label',
        fallbackCopy.quest.label
      ),
      title,
    };
  }

  if (guidedMomentum.completedSessions > 0 && guidedMomentum.nextBadgeName) {
    return {
      accent: 'sky',
      description:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.descriptionKangur',
              fallbackCopy.guided.descriptionKangur(
                guidedMomentum.nextBadgeName,
                guidedMomentum.summary
              ),
              {
                nextBadgeName: guidedMomentum.nextBadgeName,
                summary: guidedMomentum.summary,
              }
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.descriptionTraining',
              fallbackCopy.guided.descriptionTraining(
                guidedMomentum.nextBadgeName,
                guidedMomentum.summary
              ),
              {
                badge: guidedMomentum.nextBadgeName,
                summary: guidedMomentum.summary,
              }
            ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.guided.label',
        fallbackCopy.guided.label
      ),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.titleKangur',
              fallbackCopy.guided.titleKangur
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.titleTraining',
              fallbackCopy.guided.titleTraining
            ),
    };
  }

  if (nextBadge) {
    return {
      accent: mode === 'kangur' ? 'amber' : 'indigo',
      description:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.descriptionKangur',
              fallbackCopy.nextBadge.descriptionKangur(nextBadge.name, nextBadge.summary),
              {
                badge: nextBadge.name,
                summary: nextBadge.summary,
              }
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.descriptionTraining',
              fallbackCopy.nextBadge.descriptionTraining(nextBadge.name, nextBadge.summary),
              {
                badge: nextBadge.name,
                summary: nextBadge.summary,
              }
            ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.nextBadge.label',
        fallbackCopy.nextBadge.label
      ),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.titleKangur',
              fallbackCopy.nextBadge.titleKangur
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.titleTraining',
              fallbackCopy.nextBadge.titleTraining
            ),
    };
  }

  if (gamesPlayed > 0 && streak < 2) {
    return {
      accent: 'violet',
      description:
        streak <= 0
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.descriptionStart',
              fallbackCopy.streak.descriptionStart
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.descriptionContinue',
              fallbackCopy.streak.descriptionContinue(streak),
              {
                streak,
              }
            ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.streak.label',
        fallbackCopy.streak.label
      ),
      title:
        streak <= 0
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.titleStart',
              fallbackCopy.streak.titleStart
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.titleContinue',
              fallbackCopy.streak.titleContinue
            ),
    };
  }

  if (averageXpPerSession > 0) {
    return {
      accent: 'amber',
      description: translateRecommendationWithFallback(
        translate,
        'setupMomentum.pace.description',
        fallbackCopy.pace.description(averageXpPerSession),
        {
          averageXpPerSession,
        }
      ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.pace.label',
        fallbackCopy.pace.label
      ),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.pace.titleKangur',
              fallbackCopy.pace.titleKangur
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.pace.titleTraining',
              fallbackCopy.pace.titleTraining
            ),
    };
  }

  return null;
};

export default function KangurGameSetupMomentumCard({
  mode,
  progress,
}: KangurGameSetupMomentumCardProps): React.JSX.Element | null {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const translations = useTranslations('KangurGameRecommendations');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { subject, subjectKey } = useKangurSubjectFocus();
  const modeKey = mode;
  const fallbackCopy = getSetupMomentumFallbackCopy(normalizedLocale);
  const focus = getSetupFocus(
    mode,
    progress,
    normalizedLocale,
    subject,
    subjectKey,
    fallbackCopy,
    translations,
    runtimeTranslations
  );
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const streak = progress.currentWinStreak ?? 0;

  if (!focus) {
    return null;
  }

  return (
    <KangurRecommendationCard
      accent={focus.accent}
      className='w-full max-w-3xl rounded-[28px]'
      contentClassName='kangur-panel-gap'
      dataTestId={`kangur-game-setup-momentum-${modeKey}`}
      description={focus.description}
      descriptionClassName='mt-1'
      descriptionSize='sm'
      descriptionTestId={`kangur-game-setup-momentum-description-${modeKey}`}
      headerExtras={
        <>
          {streak > 0 ? (
            <KangurStatusChip accent='violet' size='sm'>
              {translateRecommendationWithFallback(
                translations,
                'setupMomentum.chips.streak',
                fallbackCopy.chips.streak(streak),
                { streak }
              )}
            </KangurStatusChip>
          ) : null}
          {averageXpPerSession > 0 ? (
            <KangurStatusChip accent='amber' size='sm'>
              {translateRecommendationWithFallback(
                translations,
                'setupMomentum.chips.pace',
                fallbackCopy.chips.pace(averageXpPerSession),
                { averageXpPerSession }
              )}
            </KangurStatusChip>
          ) : null}
        </>
      }
      label={focus.label}
      labelSize='sm'
      labelStyle='caps'
      labelTestId={`kangur-game-setup-momentum-label-${modeKey}`}
      title={focus.title}
      titleSize='md'
      titleTestId={`kangur-game-setup-momentum-title-${modeKey}`}
    />
  );
}
