import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getNextLockedBadge,
  getProgressAverageXpPerSession,
  getRecommendedSessionMomentum,
} from '@/features/kangur/ui/services/progress';
import type { KangurProgressState } from '@/features/kangur/ui/types';

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
  progress: KangurProgressState
): KangurGameSetupFocus | null => {
  const quest = getCurrentKangurDailyQuest(progress);
  const nextBadge = getNextLockedBadge(progress);
  const guidedMomentum = getRecommendedSessionMomentum(progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const streak = progress.currentWinStreak ?? 0;
  const gamesPlayed = progress.gamesPlayed ?? 0;

  if (
    quest &&
    quest.reward.status !== 'claimed' &&
    quest.assignment.questMetric?.kind === 'games_played'
  ) {
    const title =
      quest.progress.status === 'completed'
        ? 'Misja dnia czeka na odbior'
        : mode === 'training'
          ? 'Ta sesja przybliza misje dnia'
          : 'Ta runda może domknąć misje dnia';

    return {
      accent: 'emerald',
      description: `${quest.assignment.title}. ${quest.progress.summary}. ${quest.reward.label}.`,
      label: 'Misja dnia',
      title,
    };
  }

  if (guidedMomentum.completedSessions > 0 && guidedMomentum.nextBadgeName) {
    return {
      accent: 'sky',
      description:
        mode === 'kangur'
          ? `Ta runda domyka polecany kierunek. Do odznaki ${guidedMomentum.nextBadgeName} brakuje: ${guidedMomentum.summary}.`
          : `Ta sesja pcha polecany kierunek do odznaki ${guidedMomentum.nextBadgeName}. ${guidedMomentum.summary}.`,
      label: 'Polecony kierunek',
      title: mode === 'kangur' ? 'Zagraj zgodnie z rytmem' : 'Dopnij polecany kierunek',
    };
  }

  if (nextBadge) {
    return {
      accent: mode === 'kangur' ? 'amber' : 'indigo',
      description:
        mode === 'kangur'
          ? `Mocny wynik w tej rundzie przybliza odznake ${nextBadge.name}. ${nextBadge.summary}.`
          : `Ta sesja pcha odznake ${nextBadge.name}. ${nextBadge.summary}.`,
      label: 'Następna odznaka',
      title: mode === 'kangur' ? 'Zagraj o kolejny prog' : 'Rozpedz kolejna nagrode',
    };
  }

  if (gamesPlayed > 0 && streak < 2) {
    return {
      accent: 'violet',
      description:
        streak <= 0
          ? 'Jedna dobra sesja dzisiaj uruchomi nowa serie i podbije tempo nauki.'
          : `Masz serie ${streak}. Jeszcze jedna mocna runda utrwali rytm dnia.`,
      label: 'Seria',
      title: streak <= 0 ? 'Zbuduj rytm od nowa' : 'Domknij kolejny krok serii',
    };
  }

  if (averageXpPerSession > 0) {
    return {
      accent: 'amber',
      description: `Twoje aktualne tempo to ${averageXpPerSession} XP na gre. Ta sesja pomoze utrzymac dobra passe.`,
      label: 'Tempo',
      title: mode === 'kangur' ? 'Wejdz z dobrym tempem' : 'Utrzymaj mocne tempo',
    };
  }

  return null;
};

export default function KangurGameSetupMomentumCard({
  mode,
  progress,
}: KangurGameSetupMomentumCardProps): React.JSX.Element | null {
  const modeKey = mode;
  const focus = getSetupFocus(mode, progress);
  const averageXpPerSession = getProgressAverageXpPerSession(progress);
  const streak = progress.currentWinStreak ?? 0;

  if (!focus) {
    return null;
  }

  return (
    <KangurRecommendationCard
      accent={focus.accent}
      className='w-full max-w-3xl rounded-[28px]'
      contentClassName='gap-3'
      dataTestId={`kangur-game-setup-momentum-${modeKey}`}
      description={focus.description}
      descriptionClassName='mt-1'
      descriptionSize='sm'
      descriptionTestId={`kangur-game-setup-momentum-description-${mode}`}
      headerExtras={
        <>
          {streak > 0 ? (
            <KangurStatusChip accent='violet' size='sm'>
              Seria: {streak}
            </KangurStatusChip>
          ) : null}
          {averageXpPerSession > 0 ? (
            <KangurStatusChip accent='amber' size='sm'>
              Tempo: {averageXpPerSession} XP / gre
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
