'use client';

import { useLocale, useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/assignments/KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurGlassPanel,
  KangurPanelStack,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_ROW_LG_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurAssignmentPlan } from '@/features/kangur/shared/contracts/kangur-quests';
import { getCurrentKangurDailyQuest } from '@/features/kangur/ui/services/daily-quests';
import {
  getProgressAverageXpPerSession,
  getProgressBadgeTrackSummaries,
  getRecommendedSessionMomentum,
  translateKangurProgressWithFallback,
} from '@/features/kangur/ui/services/progress';
import { GAME_HOME_QUEST_SHELL_CLASSNAME } from '@/features/kangur/ui/pages/GameHome.constants';
import type { KangurHomeScreenVisibilityProps } from '@/features/kangur/ui/types';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
type KangurGameHomeQuestWidgetProps = KangurHomeScreenVisibilityProps;
type KangurGameHomeQuestResolvedProps = Required<KangurGameHomeQuestWidgetProps>;
type KangurGameHomeQuestTranslateWithFallback = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) => string;
type KangurGameHomeQuestStatusLabels = {
  completed: string;
  in_progress: string;
  not_started: string;
};
type KangurGameHomeQuestLeadingTrack =
  | ReturnType<typeof getProgressBadgeTrackSummaries>[number]
  | null;

type KangurGameHomeQuestContextValue = {
  averageXpPerSession: number;
  currentWinStreak: number;
  fallbackCopy: KangurHomeQuestFallbackCopy;
  guidedMomentum: ReturnType<typeof getRecommendedSessionMomentum>;
  quest: NonNullable<ReturnType<typeof getCurrentKangurDailyQuest>>;
  questStatusLabels: KangurGameHomeQuestStatusLabels;
  runtimeTranslations: ReturnType<typeof useTranslations<'KangurProgressRuntime'>>;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
  visibleLeadingTrack: KangurGameHomeQuestLeadingTrack;
};

const KangurGameHomeQuestContext = React.createContext<KangurGameHomeQuestContextValue | null>(null);

function useKangurGameHomeQuest(): KangurGameHomeQuestContextValue {
  const context = React.useContext(KangurGameHomeQuestContext);
  if (!context) {
    throw new Error('useKangurGameHomeQuest must be used within KangurGameHomeQuestProvider');
  }
  return context;
}

const buildAssignmentHref = (
  basePath: string,
  action: KangurAssignmentPlan['action']
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const QUEST_STATUS_ACCENTS = {
  completed: 'emerald',
  in_progress: 'indigo',
  not_started: 'slate',
} as const;

const HOME_QUEST_ROUTE_ACKNOWLEDGE_MS = 0;

type KangurHomeQuestFallbackCopy = {
  defaultLabel: string;
  status: {
    completed: string;
    inProgress: string;
    notStarted: string;
  };
  targetPrefix: string;
  streakPrefix: string;
  pacePrefix: string;
  trackPrefix: string;
  directionPrefix: string;
  paceValue: (xp: number) => string;
};

const getHomeQuestFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): KangurHomeQuestFallbackCopy => {
  if (locale === 'uk') {
    return {
      defaultLabel: 'Місія дня',
      status: {
        completed: 'Місію завершено',
        inProgress: 'Місія триває',
        notStarted: 'Місія чекає',
      },
      targetPrefix: 'Ціль:',
      streakPrefix: 'Серія:',
      pacePrefix: 'Темп:',
      trackPrefix: 'У русі:',
      directionPrefix: 'Напрям:',
      paceValue: (xp) => `${xp} XP / гру`,
    };
  }

  if (locale === 'de') {
    return {
      defaultLabel: 'Mission des Tages',
      status: {
        completed: 'Mission abgeschlossen',
        inProgress: 'Mission lauft',
        notStarted: 'Mission wartet',
      },
      targetPrefix: 'Ziel:',
      streakPrefix: 'Serie:',
      pacePrefix: 'Tempo:',
      trackPrefix: 'Im Fluss:',
      directionPrefix: 'Richtung:',
      paceValue: (xp) => `${xp} XP / Spiel`,
    };
  }

  if (locale === 'en') {
    return {
      defaultLabel: 'Mission of the day',
      status: {
        completed: 'Mission completed',
        inProgress: 'Mission in progress',
        notStarted: 'Mission waiting',
      },
      targetPrefix: 'Target:',
      streakPrefix: 'Streak:',
      pacePrefix: 'Pace:',
      trackPrefix: 'Momentum:',
      directionPrefix: 'Direction:',
      paceValue: (xp) => `${xp} XP / game`,
    };
  }

  return {
    defaultLabel: 'Misja dnia',
    status: {
      completed: 'Misja ukończona',
      inProgress: 'Misja w toku',
      notStarted: 'Misja czeka',
    },
    targetPrefix: 'Cel:',
    streakPrefix: 'Seria:',
    pacePrefix: 'Tempo:',
    trackPrefix: 'Na fali:',
    directionPrefix: 'Kierunek:',
    paceValue: (xp) => `${xp} XP / grę`,
  };
};

const resolveKangurGameHomeQuestWidgetProps = (
  props: KangurGameHomeQuestWidgetProps | undefined
): KangurGameHomeQuestResolvedProps => ({
  hideWhenScreenMismatch: props?.hideWhenScreenMismatch ?? true,
});

const createKangurGameHomeQuestTranslateWithFallback = (
  translations: ReturnType<typeof useTranslations<'KangurGameWidgets'>>
): KangurGameHomeQuestTranslateWithFallback => {
  return (key, fallback, values) => {
    const translated = translations(key, values);
    return translated === key ? fallback : translated;
  };
};

const resolveVisibleLeadingTrack = (
  leadingTrack: KangurGameHomeQuestLeadingTrack
): KangurGameHomeQuestLeadingTrack =>
  leadingTrack &&
  (leadingTrack.unlockedCount > 0 || leadingTrack.progressPercent >= 40)
    ? leadingTrack
    : null;

const shouldRenderKangurGameHomeQuestWidget = ({
  hideWhenScreenMismatch,
  quest,
  screen,
}: {
  hideWhenScreenMismatch: boolean;
  quest: ReturnType<typeof getCurrentKangurDailyQuest>;
  screen: string | null | undefined;
}): boolean => Boolean(quest) && !(hideWhenScreenMismatch && screen !== 'home');

const resolveKangurGameHomeQuestStatusLabels = ({
  fallbackCopy,
  translateWithFallback,
}: {
  fallbackCopy: KangurHomeQuestFallbackCopy;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
}): KangurGameHomeQuestStatusLabels => ({
  completed: translateWithFallback('homeQuest.status.completed', fallbackCopy.status.completed),
  in_progress: translateWithFallback(
    'homeQuest.status.inProgress',
    fallbackCopy.status.inProgress
  ),
  not_started: translateWithFallback(
    'homeQuest.status.notStarted',
    fallbackCopy.status.notStarted
  ),
});

const resolveKangurGameHomeQuestRewardAccent = (
  rewardStatus: NonNullable<ReturnType<typeof getCurrentKangurDailyQuest>>['reward']['status']
): 'amber' | 'emerald' | 'indigo' =>
  rewardStatus === 'claimed' ? 'emerald' : rewardStatus === 'ready' ? 'amber' : 'indigo';

const resolveKangurGameHomeQuestProgressAccent = (
  status: NonNullable<ReturnType<typeof getCurrentKangurDailyQuest>>['progress']['status']
): 'emerald' | 'violet' => (status === 'completed' ? 'emerald' : 'violet');

const hasKangurGameHomeQuestMomentum = ({
  averageXpPerSession,
  currentWinStreak,
  guidedMomentum,
  visibleLeadingTrack,
}: {
  averageXpPerSession: number;
  currentWinStreak: number;
  guidedMomentum: ReturnType<typeof getRecommendedSessionMomentum>;
  visibleLeadingTrack: KangurGameHomeQuestLeadingTrack;
}): boolean =>
  currentWinStreak > 0 ||
  averageXpPerSession > 0 ||
  Boolean(visibleLeadingTrack) ||
  guidedMomentum.completedSessions > 0;

const renderKangurGameHomeQuestRewardChip = (
  quest: NonNullable<ReturnType<typeof getCurrentKangurDailyQuest>>
): React.JSX.Element | null =>
  quest.reward.xp > 0 ? (
    <KangurStatusChip
      accent={resolveKangurGameHomeQuestRewardAccent(quest.reward.status)}
      data-testid='kangur-home-quest-reward'
      labelStyle='caps'
    >
      {quest.reward.label}
    </KangurStatusChip>
  ) : null;

const renderKangurGameHomeQuestStreakChip = ({
  currentWinStreak,
  fallbackCopy,
  translateWithFallback,
}: {
  currentWinStreak: number;
  fallbackCopy: KangurHomeQuestFallbackCopy;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
}): React.JSX.Element | null =>
  currentWinStreak > 0 ? (
    <KangurStatusChip
      accent='rose'
      data-testid='kangur-home-quest-streak'
      labelStyle='compact'
      size='sm'
    >
      {translateWithFallback('homeQuest.streakPrefix', fallbackCopy.streakPrefix)} {currentWinStreak}
    </KangurStatusChip>
  ) : null;

const renderKangurGameHomeQuestPaceChip = ({
  averageXpPerSession,
  fallbackCopy,
  runtimeTranslations,
  translateWithFallback,
}: {
  averageXpPerSession: number;
  fallbackCopy: KangurHomeQuestFallbackCopy;
  runtimeTranslations: ReturnType<typeof useTranslations<'KangurProgressRuntime'>>;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
}): React.JSX.Element | null =>
  averageXpPerSession > 0 ? (
    <KangurStatusChip
      accent='violet'
      data-testid='kangur-home-quest-xp-rate'
      labelStyle='compact'
      size='sm'
    >
      {translateWithFallback('homeQuest.pacePrefix', fallbackCopy.pacePrefix)}{' '}
      {translateKangurProgressWithFallback(
        runtimeTranslations,
        'questMomentum.paceValue',
        fallbackCopy.paceValue(averageXpPerSession),
        { xp: averageXpPerSession }
      )}
    </KangurStatusChip>
  ) : null;

const renderKangurGameHomeQuestTrackChip = ({
  fallbackCopy,
  translateWithFallback,
  visibleLeadingTrack,
}: {
  fallbackCopy: KangurHomeQuestFallbackCopy;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
  visibleLeadingTrack: KangurGameHomeQuestLeadingTrack;
}): React.JSX.Element | null =>
  visibleLeadingTrack ? (
    <KangurStatusChip
      accent='indigo'
      data-testid='kangur-home-quest-track'
      labelStyle='compact'
      size='sm'
    >
      {translateWithFallback('homeQuest.trackPrefix', fallbackCopy.trackPrefix)}{' '}
      {visibleLeadingTrack.label}
    </KangurStatusChip>
  ) : null;

const renderKangurGameHomeQuestGuidedChip = ({
  fallbackCopy,
  guidedMomentum,
  translateWithFallback,
}: {
  fallbackCopy: KangurHomeQuestFallbackCopy;
  guidedMomentum: ReturnType<typeof getRecommendedSessionMomentum>;
  translateWithFallback: KangurGameHomeQuestTranslateWithFallback;
}): React.JSX.Element | null =>
  guidedMomentum.completedSessions > 0 ? (
    <KangurStatusChip
      accent='sky'
      data-testid='kangur-home-quest-guided'
      labelStyle='compact'
      size='sm'
    >
      {translateWithFallback('homeQuest.directionPrefix', fallbackCopy.directionPrefix)}{' '}
      {guidedMomentum.summary}
    </KangurStatusChip>
  ) : null;

const KangurGameHomeQuestMomentumSection = (): React.JSX.Element | null => {
  const {
    averageXpPerSession,
    currentWinStreak,
    fallbackCopy,
    guidedMomentum,
    runtimeTranslations,
    translateWithFallback,
    visibleLeadingTrack,
  } = useKangurGameHomeQuest();

  if (
    !hasKangurGameHomeQuestMomentum({
      averageXpPerSession,
      currentWinStreak,
      guidedMomentum,
      visibleLeadingTrack,
    })
  ) {
    return null;
  }

  return (
    <div className={`mt-4 ${KANGUR_WRAP_ROW_CLASSNAME}`} data-testid='kangur-home-quest-momentum'>
      {renderKangurGameHomeQuestStreakChip({
        currentWinStreak,
        fallbackCopy,
        translateWithFallback,
      })}
      {renderKangurGameHomeQuestPaceChip({
        averageXpPerSession,
        fallbackCopy,
        runtimeTranslations,
        translateWithFallback,
      })}
      {renderKangurGameHomeQuestTrackChip({
        fallbackCopy,
        translateWithFallback,
        visibleLeadingTrack,
      })}
      {renderKangurGameHomeQuestGuidedChip({
        fallbackCopy,
        guidedMomentum,
        translateWithFallback,
      })}
    </div>
  );
};

const KangurGameHomeQuestPanel = ({
  actionHref,
}: {
  actionHref: string;
}): React.JSX.Element => {
  const { quest, questStatusLabels, translateWithFallback, fallbackCopy } =
    useKangurGameHomeQuest();
  const assignment = quest.assignment;

  return (
    <KangurGlassPanel
      className={GAME_HOME_QUEST_SHELL_CLASSNAME}
      data-testid='kangur-home-quest-widget'
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <KangurPanelStack
        className={`${KANGUR_STACK_ROW_LG_CLASSNAME} lg:items-start lg:justify-between`}
      >
        <div className='min-w-0 flex-1'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip
              accent='violet'
              data-testid='kangur-home-quest-label'
              labelStyle='caps'
            >
              {assignment.questLabel ??
                translateWithFallback('homeQuest.defaultLabel', fallbackCopy.defaultLabel)}
            </KangurStatusChip>
            <KangurAssignmentPriorityChip
              data-testid='kangur-home-quest-priority'
              labelStyle='caps'
              priority={assignment.priority}
            />
            <KangurStatusChip
              accent={QUEST_STATUS_ACCENTS[quest.progress.status]}
              data-testid='kangur-home-quest-status'
              labelStyle='caps'
            >
              {questStatusLabels[quest.progress.status]}
            </KangurStatusChip>
            {renderKangurGameHomeQuestRewardChip(quest)}
            <KangurStatusChip
              accent='slate'
              data-testid='kangur-home-quest-expiry'
              labelStyle='caps'
            >
              {quest.expiresLabel}
            </KangurStatusChip>
          </div>

          <KangurCardTitle className='mt-4' data-testid='kangur-home-quest-title' size='xl'>
            {assignment.title}
          </KangurCardTitle>
          <KangurCardDescription
            as='p'
            className='mt-3 max-w-2xl leading-7'
            data-testid='kangur-home-quest-description'
            size='sm'
          >
            {assignment.description}
          </KangurCardDescription>

          <div className={`mt-4 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
            <KangurStatusChip
              accent='amber'
              data-testid='kangur-home-quest-target'
              labelStyle='compact'
              size='sm'
            >
              {translateWithFallback('homeQuest.targetPrefix', fallbackCopy.targetPrefix)}{' '}
              {assignment.target}
            </KangurStatusChip>
            <KangurStatusChip
              accent='slate'
              data-testid='kangur-home-quest-progress'
              labelStyle='compact'
              size='sm'
            >
              {quest.progress.summary}
            </KangurStatusChip>
          </div>

          <KangurGameHomeQuestMomentumSection />

          <KangurProgressBar
            accent={resolveKangurGameHomeQuestProgressAccent(quest.progress.status)}
            className='mt-4 max-w-full sm:max-w-sm'
            data-testid='kangur-home-quest-progress-bar'
            size='sm'
            value={quest.progress.percent}
          />
        </div>

        <div className='w-full lg:w-auto lg:shrink-0'>
          <KangurButton
            asChild
            className='w-full lg:w-auto touch-manipulation select-none min-h-11 active:scale-[0.98]'
            variant='primary'
          >
            <Link
              href={actionHref}
              targetPageKey={assignment.action.page}
              transitionAcknowledgeMs={HOME_QUEST_ROUTE_ACKNOWLEDGE_MS}
              transitionSourceId={`game-home-quest:${assignment.id}`}
            >
              {assignment.action.label}
            </Link>
          </KangurButton>
        </div>
      </KangurPanelStack>
    </KangurGlassPanel>
  );
};

export function KangurGameHomeQuestWidget({
  hideWhenScreenMismatch = true,
}: KangurGameHomeQuestWidgetProps = {}): React.JSX.Element | null {
  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const translations = useTranslations('KangurGameWidgets');
  const runtimeTranslations = useTranslations('KangurProgressRuntime');
  const runtime = useKangurGameRuntime();
  const { basePath, progress, screen } = runtime;
  const { subject, subjectKey } = useKangurSubjectFocus();
  const progressLocalizer = { translate: runtimeTranslations };
  const translateWithFallback = createKangurGameHomeQuestTranslateWithFallback(translations);
  const fallbackCopy = useMemo(
    () => getHomeQuestFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const quest = useMemo(
    () =>
      getCurrentKangurDailyQuest(progress, {
        locale: normalizedLocale,
        ownerKey: subjectKey,
        subject,
        translate: runtimeTranslations,
      }),
    [normalizedLocale, progress, runtimeTranslations, subject, subjectKey]
  );
  const averageXpPerSession = useMemo(() => getProgressAverageXpPerSession(progress), [progress]);
  const guidedMomentum = useMemo(
    () => getRecommendedSessionMomentum(progress, progressLocalizer),
    [progress, runtimeTranslations]
  );
  const leadingTrack = useMemo(
    () => getProgressBadgeTrackSummaries(progress, { maxTracks: 1 }, progressLocalizer)[0] ?? null,
    [progress, runtimeTranslations]
  );
  const visibleLeadingTrack = resolveVisibleLeadingTrack(leadingTrack);
  const currentWinStreak = progress.currentWinStreak ?? 0;
  const resolvedProps = resolveKangurGameHomeQuestWidgetProps({
    hideWhenScreenMismatch,
  });

  if (
    !shouldRenderKangurGameHomeQuestWidget({
      hideWhenScreenMismatch: resolvedProps.hideWhenScreenMismatch,
      quest,
      screen,
    })
  ) {
    return null;
  }

  const visibleQuest = quest;
  if (!visibleQuest) {
    return null;
  }

  return (
    <KangurGameHomeQuestContext.Provider
      value={{
        averageXpPerSession,
        currentWinStreak,
        fallbackCopy,
        guidedMomentum,
        quest: visibleQuest,
        questStatusLabels: resolveKangurGameHomeQuestStatusLabels({
          fallbackCopy,
          translateWithFallback,
        }),
        runtimeTranslations,
        translateWithFallback,
        visibleLeadingTrack,
      }}
    >
      <KangurGameHomeQuestPanel
        actionHref={buildAssignmentHref(basePath, visibleQuest.assignment.action)}
      />
    </KangurGameHomeQuestContext.Provider>
  );
}

export default KangurGameHomeQuestWidget;
