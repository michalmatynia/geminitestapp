'use client';

import { Award, BarChart2, Compass, Flame, Sparkles, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { KANGUR_AVATAR_OPTIONS, getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { useKangurAuthActions } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurGlassPanel,
  KangurMetricCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_RELAXED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_INLINE_CENTER_ROW_CLASSNAME,
  KANGUR_RELAXED_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import { getNextLockedBadge } from '@/features/kangur/ui/services/progress';
import { withKangurClientError } from '@/features/kangur/observability/client';

const kangurPlatform = getKangurPlatform();
type KangurOverviewTranslations = ReturnType<typeof useTranslations<'KangurLearnerProfileWidgets.overview'>>;
type KangurOverviewRuntime = ReturnType<typeof useKangurLearnerProfileRuntime>;
type KangurOverviewDailyQuest = KangurDailyQuestState | null | undefined;
type KangurOverviewLearner = { avatarId?: string | null; id: string } | null;

const resolveKangurOverviewIntroCopy = ({
  overviewContent,
  translations,
}: {
  overviewContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
  translations: KangurOverviewTranslations;
}): { description: string; title: string } => ({
  description: overviewContent?.summary ?? translations('summary'),
  title: overviewContent?.title ?? translations('title'),
});

const resolveKangurOverviewDailyQuestAccent = (
  dailyQuest: KangurOverviewDailyQuest
): 'emerald' | 'amber' | 'indigo' | 'slate' => {
  if (dailyQuest?.reward.status === 'claimed') {
    return 'emerald';
  }

  if (dailyQuest?.progress.status === 'completed') {
    return 'amber';
  }

  if (dailyQuest?.progress.status === 'in_progress') {
    return 'indigo';
  }

  return 'slate';
};

const resolveKangurOverviewAvatarButtonClassName = ({
  isCoarsePointer,
  isDisabled,
  isSelected,
}: {
  isCoarsePointer: boolean;
  isDisabled: boolean;
  isSelected: boolean;
}): string =>
  `relative overflow-hidden rounded-full border transition touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white ${
    isCoarsePointer ? 'h-12 w-12 sm:h-14 sm:w-14' : 'h-11 w-11 sm:h-12 sm:w-12'
  } ${
    isSelected
      ? 'border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]'
      : 'border-white/80 hover:border-amber-200'
  } ${isDisabled ? 'opacity-60' : 'cursor-pointer'}`;

const resolveKangurOverviewMetricLabel = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}): React.JSX.Element => (
  <span className={KANGUR_INLINE_CENTER_ROW_CLASSNAME}>
    {icon} {label}
  </span>
);

const resolveKangurOverviewDailyQuestDescription = ({
  dailyQuest,
  translations,
}: {
  dailyQuest: KangurOverviewDailyQuest;
  translations: KangurOverviewTranslations;
}): string => {
  if (dailyQuest) {
    return `${dailyQuest.progress.summary} · ${dailyQuest.reward.label}`;
  }

  if (dailyQuest === null) {
    return translations('dailyQuestMissing');
  }

  return translations('dailyQuestLoading');
};

const resolveKangurOverviewDailyQuestValue = (
  dailyQuest: KangurOverviewDailyQuest
): string => {
  if (dailyQuest) {
    return `${dailyQuest.progress.percent}%`;
  }

  if (dailyQuest === null) {
    return '—';
  }

  return '...';
};

const resolveKangurOverviewGuidedRoundsDescription = ({
  snapshot,
  translations,
}: {
  snapshot: KangurOverviewRuntime['snapshot'];
  translations: KangurOverviewTranslations;
}): string =>
  snapshot.recommendedSessionNextBadgeName
    ? translations('guidedRoundsDescription', {
        badge: snapshot.recommendedSessionNextBadgeName,
        summary: snapshot.recommendedSessionSummary,
      })
    : translations('guidedRoundsUnlocked');

const resolveKangurOverviewBadgesDescription = ({
  nextBadge,
  translations,
}: {
  nextBadge: ReturnType<typeof getNextLockedBadge>;
  translations: KangurOverviewTranslations;
}): string =>
  nextBadge
    ? translations('badgesDescription', {
        badge: nextBadge.name,
        summary: nextBadge.summary,
      })
    : translations('badgesUnlocked');

const canUpdateKangurOverviewAvatar = ({
  activeLearner,
  avatarId,
  isSavingAvatar,
}: {
  activeLearner: KangurOverviewLearner;
  avatarId: string;
  isSavingAvatar: boolean;
}): boolean =>
  Boolean(activeLearner) && !isSavingAvatar && activeLearner?.avatarId !== avatarId;

function useKangurLearnerProfileOverviewAvatarState({
  activeLearner,
  checkAppState,
  translations,
}: {
  activeLearner: KangurOverviewLearner;
  checkAppState: ReturnType<typeof useKangurAuthActions>['checkAppState'];
  translations: KangurOverviewTranslations;
}): {
  avatarError: string | null;
  handleAvatarSelect: (avatarId: string) => Promise<void>;
  isSavingAvatar: boolean;
} {
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarSelect = async (avatarId: string): Promise<void> => {
    if (!canUpdateKangurOverviewAvatar({ activeLearner, avatarId, isSavingAvatar })) {
      return;
    }

    setIsSavingAvatar(true);
    setAvatarError(null);
    await withKangurClientError(
      {
        source: 'kangur-learner-profile',
        action: 'update-avatar',
        description: 'Update learner avatar selection.',
        context: {
          learnerId: activeLearner.id,
          avatarId,
        },
      },
      async () => {
        await kangurPlatform.learners.update(activeLearner.id, { avatarId });
        await checkAppState();
      },
      {
        fallback: undefined,
        onError: () => {
          setAvatarError(translations('avatarSaveError'));
        },
      }
    );
    setIsSavingAvatar(false);
  };

  return {
    avatarError,
    handleAvatarSelect,
    isSavingAvatar,
  };
}

function KangurLearnerProfileOverviewAvatarPreview({
  selectedAvatar,
  translations,
}: {
  selectedAvatar: ReturnType<typeof getKangurAvatarById>;
  translations: KangurOverviewTranslations;
}): React.JSX.Element {
  return (
    <div className={KANGUR_CENTER_ROW_RELAXED_CLASSNAME}>
      <div className='h-16 w-16 overflow-hidden rounded-full border border-white/80 bg-white/80 shadow-sm'>
        {selectedAvatar ? (
          <img
            src={selectedAvatar.src}
            alt={selectedAvatar.label}
            className='h-full w-full object-cover'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-xl font-black text-slate-400'>
            ?
          </div>
        )}
      </div>
      <div>
        <h3 className='text-base font-bold text-slate-800'>{translations('avatarTitle')}</h3>
        <KangurMetaText className='mt-1'>{translations('avatarDescription')}</KangurMetaText>
      </div>
    </div>
  );
}

function KangurLearnerProfileOverviewAvatarPicker({
  activeLearner,
  avatarError,
  handleAvatarSelect,
  isCoarsePointer,
  isSavingAvatar,
  selectedAvatar,
  translations,
}: {
  activeLearner: KangurOverviewLearner;
  avatarError: string | null;
  handleAvatarSelect: (avatarId: string) => Promise<void>;
  isCoarsePointer: boolean;
  isSavingAvatar: boolean;
  selectedAvatar: ReturnType<typeof getKangurAvatarById>;
  translations: KangurOverviewTranslations;
}): React.JSX.Element {
  return (
    <KangurGlassPanel className='flex w-full flex-col gap-4' padding='lg' surface='mist'>
      <div className={`${KANGUR_RELAXED_ROW_CLASSNAME} sm:items-center sm:justify-between`}>
        <KangurLearnerProfileOverviewAvatarPreview
          selectedAvatar={selectedAvatar}
          translations={translations}
        />
        {avatarError ? <KangurMetaText className='text-rose-600'>{avatarError}</KangurMetaText> : null}
      </div>
      <div
        className='grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 min-[420px]:grid-cols-4 sm:grid-cols-5'
        role='radiogroup'
        aria-label={translations('avatarGroupLabel')}
      >
        {KANGUR_AVATAR_OPTIONS.map((option) => {
          const isSelected = activeLearner?.avatarId === option.id;
          const isDisabled = !activeLearner || isSavingAvatar;
          return (
            <button
              key={option.id}
              type='button'
              role='radio'
              aria-checked={isSelected}
              aria-label={option.label}
              disabled={isDisabled}
              onClick={() => {
                void handleAvatarSelect(option.id);
              }}
              className={resolveKangurOverviewAvatarButtonClassName({
                isCoarsePointer,
                isDisabled,
                isSelected,
              })}
            >
              <img src={option.src} alt={option.label} className='h-full w-full object-cover' />
            </button>
          );
        })}
      </div>
    </KangurGlassPanel>
  );
}

function KangurLearnerProfileOverviewGuidedRoundsMetric({
  snapshot,
  translations,
}: {
  snapshot: KangurOverviewRuntime['snapshot'];
  translations: KangurOverviewTranslations;
}): React.JSX.Element | null {
  if (snapshot.recommendedSessionsCompleted <= 0) {
    return null;
  }

  return (
    <KangurMetricCard
      accent='sky'
      data-testid='learner-profile-overview-guided-rounds'
      description={resolveKangurOverviewGuidedRoundsDescription({ snapshot, translations })}
      label={resolveKangurOverviewMetricLabel({
        icon: <Compass aria-hidden='true' className='h-4 w-4' />,
        label: translations('guidedRoundsLabel'),
      })}
      value={snapshot.recommendedSessionsCompleted}
      valueClassName='text-2xl sm:text-3xl'
    >
      <div className='space-y-2 pt-1'>
        <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
          {snapshot.recommendedSessionSummary}
        </p>
        <KangurProgressBar
          accent='sky'
          data-testid='learner-profile-overview-guided-rounds-bar'
          size='sm'
          value={snapshot.recommendedSessionProgressPercent}
        />
      </div>
    </KangurMetricCard>
  );
}

function KangurLearnerProfileOverviewDailyQuestMetric({
  dailyQuest,
  dailyQuestAccent,
  translations,
}: {
  dailyQuest: KangurOverviewDailyQuest;
  dailyQuestAccent: 'emerald' | 'amber' | 'indigo' | 'slate';
  translations: KangurOverviewTranslations;
}): React.JSX.Element {
  return (
    <KangurMetricCard
      accent={dailyQuestAccent}
      data-testid='learner-profile-overview-daily-quest'
      description={resolveKangurOverviewDailyQuestDescription({ dailyQuest, translations })}
      label={resolveKangurOverviewMetricLabel({
        icon: <Target aria-hidden='true' className='h-4 w-4' />,
        label: translations('dailyQuestLabel'),
      })}
      value={resolveKangurOverviewDailyQuestValue(dailyQuest)}
      valueClassName='text-2xl sm:text-3xl'
    >
      {dailyQuest ? (
        <div className='space-y-2 pt-1'>
          <p className='text-xs font-semibold [color:var(--kangur-page-text)]'>
            {dailyQuest.assignment.title}
          </p>
          <KangurProgressBar
            accent={dailyQuest.reward.status === 'claimed' ? 'emerald' : dailyQuestAccent}
            data-testid='learner-profile-overview-daily-quest-bar'
            size='sm'
            value={dailyQuest.progress.percent}
          />
        </div>
      ) : null}
    </KangurMetricCard>
  );
}

function KangurLearnerProfileOverviewMetrics({
  dailyQuest,
  dailyQuestAccent,
  nextBadge,
  snapshot,
  translations,
}: {
  dailyQuest: KangurOverviewDailyQuest;
  dailyQuestAccent: 'emerald' | 'amber' | 'indigo' | 'slate';
  nextBadge: ReturnType<typeof getNextLockedBadge>;
  snapshot: KangurOverviewRuntime['snapshot'];
  translations: KangurOverviewTranslations;
}): React.JSX.Element {
  return (
    <div
      className={`grid grid-cols-1 ${KANGUR_PANEL_GAP_CLASSNAME} min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6`}
    >
      <KangurMetricCard
        accent='indigo'
        data-testid='learner-profile-overview-average-accuracy'
        description={translations('averageAccuracyDescription', { value: snapshot.bestAccuracy })}
        label={resolveKangurOverviewMetricLabel({
          icon: <BarChart2 aria-hidden='true' className='h-4 w-4' />,
          label: translations('averageAccuracyLabel'),
        })}
        value={`${snapshot.averageAccuracy}%`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-streak'
        description={translations('streakDescription', { value: snapshot.longestStreakDays })}
        label={resolveKangurOverviewMetricLabel({
          icon: <Flame aria-hidden='true' className='h-4 w-4' />,
          label: translations('streakLabel'),
        })}
        value={snapshot.currentStreakDays}
      />

      <KangurMetricCard
        accent='violet'
        data-testid='learner-profile-overview-xp-today'
        description={translations('xpTodayDescription', {
          weeklyXp: snapshot.weeklyXpEarned,
          averageXp: snapshot.averageXpPerSession,
        })}
        label={resolveKangurOverviewMetricLabel({
          icon: <Sparkles aria-hidden='true' className='h-4 w-4' />,
          label: translations('xpTodayLabel'),
        })}
        value={`+${snapshot.todayXpEarned}`}
      />

      <KangurLearnerProfileOverviewGuidedRoundsMetric
        snapshot={snapshot}
        translations={translations}
      />

      <KangurLearnerProfileOverviewDailyQuestMetric
        dailyQuest={dailyQuest}
        dailyQuestAccent={dailyQuestAccent}
        translations={translations}
      />

      <KangurMetricCard
        accent='teal'
        data-testid='learner-profile-overview-daily-goal'
        description={translations('dailyGoalDescription', { value: snapshot.dailyGoalPercent })}
        label={resolveKangurOverviewMetricLabel({
          icon: <Target aria-hidden='true' className='h-4 w-4' />,
          label: translations('dailyGoalLabel'),
        })}
        value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
      />

      <KangurMetricCard
        accent='amber'
        data-testid='learner-profile-overview-badges'
        description={resolveKangurOverviewBadgesDescription({ nextBadge, translations })}
        label={resolveKangurOverviewMetricLabel({
          icon: <Award aria-hidden='true' className='h-4 w-4' />,
          label: translations('badgesLabel'),
        })}
        value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
      />
    </div>
  );
}

export function KangurLearnerProfileOverviewWidget(): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.overview');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const { progress, snapshot, user } = useKangurLearnerProfileRuntime();
  const { checkAppState } = useKangurAuthActions();
  const { subject, subjectKey } = useKangurSubjectFocus();
  const { entry: overviewContent } = useKangurPageContentEntry('learner-profile-overview');
  const nextBadge = getNextLockedBadge(progress, { translate: runtimeTranslations });
  const isCoarsePointer = useKangurCoarsePointer();
  const activeLearner = user?.activeLearner ?? null;
  const selectedAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const { description, title } = resolveKangurOverviewIntroCopy({
    overviewContent,
    translations,
  });
  const dailyQuest = useMemo<KangurDailyQuestState | null | undefined>(
    () =>
      getCurrentKangurDailyQuest(progress, {
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [progress, runtimeTranslations, subject, subjectKey]
  );
  const dailyQuestAccent = resolveKangurOverviewDailyQuestAccent(dailyQuest);
  const { avatarError, handleAvatarSelect, isSavingAvatar } =
    useKangurLearnerProfileOverviewAvatarState({
      activeLearner,
      checkAppState,
      translations,
    });

  return (
    <section className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurPanelIntro
        data-testid='learner-profile-overview-intro'
        description={description}
        eyebrow={title}
      />
      <KangurLearnerProfileOverviewAvatarPicker
        activeLearner={activeLearner}
        avatarError={avatarError}
        handleAvatarSelect={handleAvatarSelect}
        isCoarsePointer={isCoarsePointer}
        isSavingAvatar={isSavingAvatar}
        selectedAvatar={selectedAvatar}
        translations={translations}
      />
      <KangurLearnerProfileOverviewMetrics
        dailyQuest={dailyQuest}
        dailyQuestAccent={dailyQuestAccent}
        nextBadge={nextBadge}
        snapshot={snapshot}
        translations={translations}
      />
    </section>
  );
}
