import { useTranslations } from 'next-intl';
import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { translateRecommendationWithFallback } from '@/features/kangur/ui/services/recommendation-i18n';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getNextLockedBadge,
  getProgressAverageXpPerSession,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressTranslate } from '@/features/kangur/ui/services/progress-i18n';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import type { KangurLessonSubject } from '@/shared/contracts/kangur';

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

const getSetupFocus = (
  mode: 'training' | 'kangur',
  progress: KangurProgressState,
  subject: KangurLessonSubject,
  translate?: (key: string, values?: Record<string, string | number>) => string,
  progressTranslate?: KangurProgressTranslate
): KangurGameSetupFocus | null => {
  const quest = getCurrentKangurDailyQuest(progress, { subject, translate: progressTranslate });
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
            'Misja dnia czeka na odbiór'
          )
        : mode === 'training'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.quest.titleTraining',
              'Ta sesja przybliża misję dnia'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.quest.titleKangur',
              'Ta runda może domknąć misję dnia'
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
        'Misja dnia'
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
              `Ta runda domyka polecany kierunek. Do odznaki ${guidedMomentum.nextBadgeName} brakuje: ${guidedMomentum.summary}.`,
              {
                nextBadgeName: guidedMomentum.nextBadgeName,
                summary: guidedMomentum.summary,
              }
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.descriptionTraining',
              `Ta sesja pcha polecany kierunek do odznaki ${guidedMomentum.nextBadgeName}. ${guidedMomentum.summary}.`,
              {
                badge: guidedMomentum.nextBadgeName,
                summary: guidedMomentum.summary,
              }
            ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.guided.label',
        'Polecony kierunek'
      ),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.titleKangur',
              'Zagraj zgodnie z rytmem'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.guided.titleTraining',
              'Dopnij polecany kierunek'
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
              `Mocny wynik w tej rundzie przybliża odznakę ${nextBadge.name}. ${nextBadge.summary}.`,
              {
                badge: nextBadge.name,
                summary: nextBadge.summary,
              }
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.descriptionTraining',
              `Ta sesja pcha odznakę ${nextBadge.name}. ${nextBadge.summary}.`,
              {
                badge: nextBadge.name,
                summary: nextBadge.summary,
              }
            ),
      label: translateRecommendationWithFallback(
        translate,
        'setupMomentum.nextBadge.label',
        'Następna odznaka'
      ),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.titleKangur',
              'Zagraj o kolejny próg'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.nextBadge.titleTraining',
              'Rozpędź kolejną nagrodę'
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
              'Jedna dobra sesja dzisiaj uruchomi nową serię i podbije tempo nauki.'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.descriptionContinue',
              `Masz serię ${streak}. Jeszcze jedna mocna runda utrwali rytm dnia.`,
              {
                streak,
              }
            ),
      label: translateRecommendationWithFallback(translate, 'setupMomentum.streak.label', 'Seria'),
      title:
        streak <= 0
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.titleStart',
              'Zbuduj rytm od nowa'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.streak.titleContinue',
              'Domknij kolejny krok serii'
            ),
    };
  }

  if (averageXpPerSession > 0) {
    return {
      accent: 'amber',
      description: translateRecommendationWithFallback(
        translate,
        'setupMomentum.pace.description',
        `Twoje aktualne tempo to ${averageXpPerSession} XP na grę. Ta sesja pomoże utrzymać dobrą passę.`,
        {
          averageXpPerSession,
        }
      ),
      label: translateRecommendationWithFallback(translate, 'setupMomentum.pace.label', 'Tempo'),
      title:
        mode === 'kangur'
          ? translateRecommendationWithFallback(
              translate,
              'setupMomentum.pace.titleKangur',
              'Wejdź z dobrym tempem'
            )
          : translateRecommendationWithFallback(
              translate,
              'setupMomentum.pace.titleTraining',
              'Utrzymaj mocne tempo'
            ),
    };
  }

  return null;
};

export default function KangurGameSetupMomentumCard({
  mode,
  progress,
}: KangurGameSetupMomentumCardProps): React.JSX.Element | null {
  const translations = useTranslations('KangurGameRecommendations');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { subject } = useKangurSubjectFocus();
  const modeKey = mode;
  const focus = getSetupFocus(mode, progress, subject, translations, runtimeTranslations);
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
                'Seria: {streak}',
                { streak }
              )}
            </KangurStatusChip>
          ) : null}
          {averageXpPerSession > 0 ? (
            <KangurStatusChip accent='amber' size='sm'>
              {translateRecommendationWithFallback(
                translations,
                'setupMomentum.chips.pace',
                'Tempo: {averageXpPerSession} XP / grę',
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
